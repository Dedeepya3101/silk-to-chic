import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PendingAction, StyleCard, AgentTurn } from "./agents.server";
import type { ScoredTailor } from "./matching";

export type { PendingAction, StyleCard, AgentTurn };

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; created_at: string };

export type AssistantTurnResult = {
  reply: string;
  styles: StyleCard[];
  tailors: (ScoredTailor & { avatar_url?: string | null })[];
  pending: PendingAction | null;
};

const SYSTEM = [
  "You are the MatchO AI Style Assistant — an agentic commerce assistant inside the MatchO platform,",
  "which connects saree owners with local tailors who redesign sarees into modern outfits.",
  "Always ground your answers in real MatchO data obtained through the tools; never invent tailors, prices, ratings or sarees.",
  "Use get_my_sarees before assuming what the member owns. Use generate_style_ideas for styling advice and rank_tailors for tailor recommendations.",
  "You may PROPOSE actions (propose_send_message, propose_save_tailor, propose_select_style) but you can never execute them — the member confirms in the UI.",
  "Be warm, concise and practical. Keep replies under 120 words; the UI already renders style and tailor cards, so summarise rather than repeat them.",
].join(" ");

/** Load the caller's assistant conversation history. */
export const loadAssistantHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(60);
    return { messages: (data || []) as ChatMessage[] };
  });

/** Clear the caller's assistant conversation. */
export const clearAssistantHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("ai_chat_messages").delete().eq("user_id", userId);
    return { ok: true };
  });

/** One agentic assistant turn: tools are read-only or propose-only. */
export const assistantTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string; sareeUploadId?: string | null }) => {
    const message = (input?.message || "").trim();
    if (!message) throw new Error("Please type a message.");
    return { message: message.slice(0, 2000), sareeUploadId: input.sareeUploadId || null };
  })
  .handler(async ({ data, context }): Promise<AssistantTurnResult> => {
    const { supabase, userId } = context;
    const agents = await import("./agents.server");
    const { callAiWithTools, type AiMessage } = await import("./ai-gateway.server");

    // history
    const { data: hist } = await supabase
      .from("ai_chat_messages")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(16);
    const history = ((hist || []) as { role: string; content: string }[]).reverse();

    let sareeContext = "";
    if (data.sareeUploadId) {
      const { data: up } = await supabase
        .from("saree_uploads")
        .select("id, title, description, occasion, status")
        .eq("id", data.sareeUploadId)
        .eq("user_id", userId)
        .maybeSingle<{ id: string; title: string | null; description: string | null; occasion: string | null; status: string | null }>();
      if (up) {
        sareeContext =
          `\n\nThe member is currently working with their uploaded saree (saree_upload_id: ${up.id}` +
          `, title: ${up.title || "untitled"}, notes: ${up.description || "none"}, preferred outfit: ${up.occasion || "unspecified"}` +
          `, status: ${up.status || "open"}). Use this id for tools unless told otherwise.`;
      }
    }

    const messages = [
      { role: "system", content: SYSTEM + sareeContext },
      ...history.map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })),
      { role: "user", content: data.message },
    ] as (typeof AiMessage extends never ? never : AiMessage)[];

    const state: { styles: StyleCard[]; tailors: ScoredTailor[]; pending: PendingAction | null } = {
      styles: [],
      tailors: [],
      pending: null,
    };

    await supabase.from("ai_chat_messages").insert({ user_id: userId, role: "user", content: data.message });
    await agents.logEvent(supabase, userId, "assistant_message_sent", { saree_upload_id: data.sareeUploadId });

    let reply = "";
    for (let step = 0; step < 4; step++) {
      const res = await callAiWithTools(messages, agents.TOOL_DEFS);
      if (!res.tool_calls?.length) {
        reply = res.content || "";
        break;
      }
      messages.push({ role: "assistant", content: res.content || null, tool_calls: res.tool_calls });
      for (const call of res.tool_calls) {
        let args: Record<string, never> = {} as Record<string, never>;
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          /* ignore malformed args */
        }
        let out: unknown;
        try {
          out = await agents.runTool(supabase, userId, call.function.name, args, state);
        } catch (e) {
          out = { error: (e as Error)?.message || "Tool failed." };
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out).slice(0, 8000) });
      }
      if (step === 3) {
        const final = await callAiWithTools(messages, []);
        reply = final.content || "";
      }
    }

    if (!reply) reply = "Here's what I found for you.";

    await supabase.from("ai_chat_messages").insert({ user_id: userId, role: "assistant", content: reply });

    // attach avatars for tailor cards (public profile field already used elsewhere)
    let tailors: (ScoredTailor & { avatar_url?: string | null })[] = state.tailors;
    if (state.tailors.length) {
      const { data: avs } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", state.tailors.map((t) => t.tailor_id));
      const map = new Map(((avs || []) as { id: string; avatar_url: string | null }[]).map((a) => [a.id, a.avatar_url]));
      tailors = state.tailors.map((t) => ({ ...t, avatar_url: map.get(t.tailor_id) ?? null }));
    }

    if (state.pending) {
      await agents.logEvent(supabase, userId, "action_proposed", { kind: state.pending.kind });
    }

    return { reply, styles: state.styles, tailors, pending: state.pending };
  });

/** Execute a previously proposed action, only after explicit user confirmation. */
export const confirmAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { action: PendingAction }) => {
    const a = input?.action;
    if (!a || !["send_message", "save_tailor", "select_style"].includes(a.kind)) {
      throw new Error("Unsupported action.");
    }
    return { action: a };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const agents = await import("./agents.server");
    const result = await agents.executeAction(supabase, userId, data.action);
    await agents.logEvent(supabase, userId, "action_confirmed", { kind: data.action.kind });
    await supabase.from("ai_chat_messages").insert({ user_id: userId, role: "assistant", content: result });
    return { message: result };
  });
