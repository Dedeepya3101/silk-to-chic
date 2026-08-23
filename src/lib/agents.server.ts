/**
 * MatchO Agentic Commerce layer (server-only).
 *
 *   User -> AI Commerce Assistant -> specialised agents (Saree Style / Tailor Matching)
 *        -> MatchO tools (real Supabase data, RLS-scoped to the caller)
 *        -> recommendations / confirmed actions
 *
 * Rules enforced here:
 *  - every tool runs through the caller's RLS-scoped Supabase client
 *  - no admin/moderation/role/verification/rating mutation is exposed
 *  - consequential actions are only PROPOSED by the model; they execute after
 *    explicit user confirmation (see `executeAction`)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { rankTailors, type TailorCandidate, type ScoredTailor } from "./matching";
import { callAiJson, type AiToolDef } from "./ai-gateway.server";

export type Db = SupabaseClient<Database>;

export type StyleCard = {
  style_name: string;
  outfit_type: string;
  why_it_fits: string;
  occasion: string;
  design_direction: string;
  blouse_suggestion: string;
  silhouette: string;
  complexity: "Low" | "Medium" | "High" | string;
  tailoring_considerations: string;
  estimated_budget?: string | null;
  confidence: string;
};

export type PendingAction =
  | { kind: "send_message"; tailor_id: string; saree_upload_id: string | null; content: string; label: string }
  | { kind: "save_tailor"; tailor_id: string; label: string }
  | { kind: "select_style"; saree_upload_id: string; style: StyleCard; label: string };

export type AgentTurn = {
  reply: string;
  styles: StyleCard[];
  tailors: ScoredTailor[];
  pending: PendingAction | null;
};

export const SUPPORTED_TRANSFORMATIONS = [
  "Lehenga",
  "Gown",
  "Kurta",
  "Crop-top set",
  "Anarkali",
  "Indo-western outfit",
  "Custom design",
] as const;

/* ------------------------------------------------------------------ events */

export async function logEvent(db: Db, userId: string, event: string, props: Record<string, unknown> = {}) {
  try {
    await db.from("ai_events").insert({ user_id: userId, event, props: props as never } as never);
  } catch {
    /* analytics must never break the conversation */
  }
}

async function logTool(db: Db, userId: string, agent: string, tool: string, args: unknown, ok: boolean, error?: string) {
  try {
    await db.from("ai_tool_runs").insert({
      user_id: userId,
      agent,
      tool,
      args: (args ?? {}) as never,
      ok,
      error: error ?? null,
    } as never);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------- data access */

async function loadCandidates(db: Db): Promise<TailorCandidate[]> {
  const { data: tps } = await db
    .from("tailor_profiles")
    .select(
      "tailor_id, studio_name, specialization, location, experience_years, verified_tailor, identity_verified, portfolio_verified, verification_status",
    );
  const rows = (tps || []).filter((t) => t.verification_status !== "rejected");
  if (!rows.length) return [];

  const ids = rows.map((t) => t.tailor_id);
  const [{ data: profs }, { data: reviews }, { data: portfolio }, { data: completed }] = await Promise.all([
    db.from("profiles").select("id, display_name, city, suspended").in("id", ids),
    db.from("reviews").select("tailor_id, rating").in("tailor_id", ids),
    db.from("portfolio_items").select("tailor_id, title, after_image").in("tailor_id", ids),
    db.from("completed_projects").select("tailor_id").in("tailor_id", ids),
  ]);

  const pm = new Map((profs || []).map((p) => [p.id, p]));
  return rows
    .filter((t) => !pm.get(t.tailor_id)?.suspended)
    .map((t) => {
      const p = pm.get(t.tailor_id);
      const rs = (reviews || []).filter((r) => r.tailor_id === t.tailor_id);
      const pf = (portfolio || []).filter((r) => r.tailor_id === t.tailor_id);
      return {
        tailor_id: t.tailor_id,
        name: p?.display_name || "Tailor",
        studio: t.studio_name,
        city: t.location || p?.city || null,
        specialization: t.specialization,
        experience_years: t.experience_years,
        verified: !!t.verified_tailor,
        identity_verified: !!t.identity_verified,
        portfolio_verified: !!t.portfolio_verified,
        avg_rating: rs.length ? Number((rs.reduce((a, r) => a + (r.rating || 0), 0) / rs.length).toFixed(2)) : null,
        review_count: rs.length,
        completed_projects: (completed || []).filter((r) => r.tailor_id === t.tailor_id).length,
        portfolio_items: pf.length,
        portfolio_titles: pf.map((r) => r.title).filter(Boolean).slice(0, 5) as string[],
        portfolio_images: pf.map((r) => r.after_image).filter(Boolean).slice(0, 3) as string[],
      } satisfies TailorCandidate;
    });
}

/* ------------------------------------------- Agent A: Saree Style Agent */

export async function runStyleAgent(
  db: Db,
  userId: string,
  input: { saree_upload_id?: string | null; description?: string | null; occasion?: string | null; budget?: string | null; preferences?: string | null },
): Promise<StyleCard[]> {
  type SareeBrief = { id: string; image_url: string; title: string | null; description: string | null; occasion: string | null };
  let upload: SareeBrief | null = null;
  if (input.saree_upload_id) {
    const { data } = await db
      .from("saree_uploads")
      .select("id, image_url, title, description, occasion")
      .eq("id", input.saree_upload_id)
      .eq("user_id", userId)
      .maybeSingle<SareeBrief>();
    upload = data ?? null;
  }


  const { data: profile } = await db.from("profiles").select("city").eq("id", userId).maybeSingle();

  const brief = [
    `Saree title: ${upload?.title || "not provided"}`,
    `Saree notes: ${input.description || upload?.description || "not provided"}`,
    `Preferred outfit / occasion: ${input.occasion || upload?.occasion || "not provided"}`,
    `Budget: ${input.budget || "not provided"}`,
    `Member city: ${profile?.city || "not provided"}`,
    `Extra preferences: ${input.preferences || "none"}`,
    `Photo available: ${upload?.image_url ? "yes" : "no"}`,
  ].join("\n");

  const system =
    "You are the MatchO Saree Style Agent. You advise on turning an existing saree into a modern outfit a local tailor can stitch. " +
    `Allowed outfit types: ${SUPPORTED_TRANSFORMATIONS.join(", ")}. ` +
    "Use ONLY the supplied information and, when a photo is attached, what you can actually observe in it. " +
    "If no photo is attached, base the advice on the written details and say so in `confidence` — never pretend to have seen the fabric. " +
    "Never invent prices, tailors, or facts about the member. Only give an estimated_budget when the member supplied a budget or clear fabric details; otherwise use null. " +
    'Respond ONLY with JSON: {"ideas":[{"style_name","outfit_type","why_it_fits","occasion","design_direction","blouse_suggestion","silhouette","complexity","tailoring_considerations","estimated_budget","confidence"}]} with 3 or 4 distinct ideas, each field under 220 characters.';

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: `Suggest modern transformations for this saree.\n\n${brief}` },
  ];
  if (upload?.image_url) content.push({ type: "image_url", image_url: { url: upload.image_url } });

  try {
    const result = await callAiJson<{ ideas: StyleCard[] }>([
      { role: "system", content: system },
      { role: "user", content },
    ]);
    const ideas = (result?.ideas || []).slice(0, 4);
    if (upload && ideas.length) {
      await db.from("ai_style_ideas").insert({
        saree_upload_id: upload.id,
        user_id: userId,
        ideas: ideas as never,
      } as never);
    }
    await logTool(db, userId, "style_agent", "generate_style_ideas", input, true);
    await logEvent(db, userId, "style_recommendation_generated", { count: ideas.length, saree_upload_id: upload?.id ?? null });
    return ideas;
  } catch (e) {
    await logTool(db, userId, "style_agent", "generate_style_ideas", input, false, (e as Error)?.message);
    throw e;
  }
}

/* --------------------------------------- Agent B: Tailor Matching Agent */

export async function runMatchingAgent(
  db: Db,
  userId: string,
  input: { outfit_type?: string | null; keywords?: string[]; city?: string | null; saree_upload_id?: string | null; limit?: number },
): Promise<ScoredTailor[]> {
  const { data: me } = await db.from("profiles").select("city").eq("id", userId).maybeSingle();
  let outfit = input.outfit_type ?? null;
  if (!outfit && input.saree_upload_id) {
    const { data: up } = await db
      .from("saree_uploads")
      .select("occasion, ai_style_note")
      .eq("id", input.saree_upload_id)
      .eq("user_id", userId)
      .maybeSingle();
    outfit = up?.occasion || null;
  }

  const candidates = await loadCandidates(db);
  const ranked = rankTailors(candidates, {
    userCity: input.city || me?.city || null,
    outfitType: outfit,
    keywords: input.keywords || [],
  }, input.limit || 5);

  if (input.saree_upload_id && ranked.length) {
    await db.from("ai_tailor_matches").insert({
      saree_upload_id: input.saree_upload_id,
      user_id: userId,
      matches: ranked.map((r) => ({ tailor_id: r.tailor_id, score: r.score, reasons: r.reasons })) as never,
    } as never);
  }
  await logTool(db, userId, "matching_agent", "rank_tailors", input, true);
  await logEvent(db, userId, "tailor_recommendation_generated", { count: ranked.length });
  return ranked;
}

/* ----------------------------------------------------- tool definitions */

export const TOOL_DEFS: AiToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Get the signed-in member's own MatchO profile (name, city, bio).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_sarees",
      description: "List the member's own saree uploads with status, notes and any saved AI style brief.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_style_ideas",
      description: "Call the Saree Style Agent to produce structured transformation ideas for a saree.",
      parameters: {
        type: "object",
        properties: {
          saree_upload_id: { type: "string", description: "Id of one of the member's uploads, if they have one." },
          description: { type: "string", description: "Saree description supplied in conversation (colour, fabric)." },
          occasion: { type: "string" },
          budget: { type: "string" },
          preferences: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rank_tailors",
      description: "Call the Tailor Matching Agent. Returns real MatchO tailors with a transparent match score and reasons.",
      parameters: {
        type: "object",
        properties: {
          outfit_type: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          city: { type: "string" },
          saree_upload_id: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tailor_details",
      description: "Get one tailor's public profile, portfolio items and reviews from MatchO.",
      parameters: {
        type: "object",
        properties: { tailor_id: { type: "string" } },
        required: ["tailor_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_request_status",
      description: "Get the lifecycle status and status history of one of the member's saree requests.",
      parameters: {
        type: "object",
        properties: { saree_upload_id: { type: "string" } },
        required: ["saree_upload_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_send_message",
      description:
        "Propose sending a first message to a tailor about a saree. This does NOT send anything; the member must confirm in the UI.",
      parameters: {
        type: "object",
        properties: {
          tailor_id: { type: "string" },
          saree_upload_id: { type: "string" },
          content: { type: "string", description: "The message draft, written in the member's voice." },
        },
        required: ["tailor_id", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_save_tailor",
      description: "Propose saving a tailor to the member's saved list. Requires confirmation in the UI.",
      parameters: {
        type: "object",
        properties: { tailor_id: { type: "string" } },
        required: ["tailor_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_select_style",
      description:
        "Propose attaching a chosen style idea to one of the member's saree requests as the AI style brief. Requires confirmation.",
      parameters: {
        type: "object",
        properties: {
          saree_upload_id: { type: "string" },
          style_name: { type: "string", description: "style_name of one idea returned by generate_style_ideas." },
        },
        required: ["saree_upload_id", "style_name"],
        additionalProperties: false,
      },
    },
  },
];

/* ------------------------------------------------------ tool dispatcher */

export type ToolState = { styles: StyleCard[]; tailors: ScoredTailor[]; pending: PendingAction | null };

export async function runTool(
  db: Db,
  userId: string,
  name: string,
  args: Record<string, never>,
  state: ToolState,
): Promise<unknown> {
  switch (name) {
    case "get_user_profile": {
      const { data } = await db.from("profiles").select("display_name, city, bio").eq("id", userId).maybeSingle();
      return data || { note: "No profile found." };
    }
    case "get_my_sarees": {
      const { data } = await db
        .from("saree_uploads")
        .select("id, title, description, occasion, status, ai_style_note, assigned_tailor_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    }
    case "generate_style_ideas": {
      const styles = await runStyleAgent(db, userId, args as never);
      state.styles = styles;
      return { ideas: styles, note: "Style cards are already rendered in the UI; summarise them briefly." };
    }
    case "rank_tailors": {
      const tailors = await runMatchingAgent(db, userId, args as never);
      state.tailors = tailors;
      if (!tailors.length) return { tailors: [], note: "No tailors are available on MatchO yet — tell the member honestly." };
      return {
        tailors: tailors.map((t) => ({
          tailor_id: t.tailor_id,
          name: t.name,
          studio: t.studio,
          city: t.city,
          specialization: t.specialization,
          verified: t.verified,
          avg_rating: t.avg_rating,
          review_count: t.review_count,
          completed_projects: t.completed_projects,
          match_score: t.score,
          reasons: t.reasons,
        })),
        note: "Tailor cards are already rendered in the UI; summarise the top options briefly.",
      };
    }
    case "get_tailor_details": {
      const id = String(args["tailor_id"]);
      const [{ data: p }, { data: tp }, { data: pf }, { data: rv }] = await Promise.all([
        db.from("profiles").select("display_name, city").eq("id", id).maybeSingle(),
        db
          .from("tailor_profiles")
          .select("studio_name, specialization, location, experience_years, verified_tailor, bio")
          .eq("tailor_id", id)
          .maybeSingle(),
        db.from("portfolio_items").select("title, description").eq("tailor_id", id).limit(6),
        db.from("reviews").select("rating, review_text").eq("tailor_id", id).limit(10),
      ]);
      if (!p && !tp) return { error: "Tailor not found on MatchO." };
      return { profile: p, tailor_profile: tp, portfolio: pf || [], reviews: rv || [] };
    }
    case "get_request_status": {
      const id = String(args["saree_upload_id"]);
      const { data: up } = await db
        .from("saree_uploads")
        .select("id, title, status, tailor_marked_completed, user_confirmed_completion, assigned_tailor_id")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!up) return { error: "Request not found for this member." };
      const { data: hist } = await db
        .from("request_status_history")
        .select("from_status, to_status, created_at")
        .eq("saree_upload_id", id)
        .order("created_at", { ascending: true });
      return { request: up, history: hist || [] };
    }
    case "propose_send_message": {
      const tailorId = String(args["tailor_id"]);
      const { data: p } = await db.from("profiles").select("display_name").eq("id", tailorId).maybeSingle();
      if (!p) return { error: "That tailor does not exist on MatchO." };
      state.pending = {
        kind: "send_message",
        tailor_id: tailorId,
        saree_upload_id: (args["saree_upload_id"] as string) || null,
        content: String(args["content"]).slice(0, 1500),
        label: `Send this message to ${p.display_name}?`,
      };
      return { status: "awaiting_user_confirmation", note: "Nothing has been sent yet. Ask the member to confirm." };
    }
    case "propose_save_tailor": {
      const tailorId = String(args["tailor_id"]);
      const { data: p } = await db.from("profiles").select("display_name").eq("id", tailorId).maybeSingle();
      if (!p) return { error: "That tailor does not exist on MatchO." };
      state.pending = { kind: "save_tailor", tailor_id: tailorId, label: `Save ${p.display_name} to your saved tailors?` };
      return { status: "awaiting_user_confirmation" };
    }
    case "propose_select_style": {
      const uploadId = String(args["saree_upload_id"]);
      const styleName = String(args["style_name"]).toLowerCase();
      const style = state.styles.find((s) => (s.style_name || "").toLowerCase() === styleName) || state.styles[0];
      if (!style) return { error: "Generate style ideas first." };
      const { data: up } = await db
        .from("saree_uploads")
        .select("id, title")
        .eq("id", uploadId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!up) return { error: "That saree request does not belong to this member." };
      state.pending = {
        kind: "select_style",
        saree_upload_id: uploadId,
        style,
        label: `Attach the "${style.style_name}" brief to ${up.title || "your saree request"}?`,
      };
      return { status: "awaiting_user_confirmation" };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/* -------------------------------------------------- confirmed execution */

export async function executeAction(db: Db, userId: string, action: PendingAction): Promise<string> {
  if (action.kind === "send_message") {
    const { error } = await db.from("messages").insert({
      sender_id: userId,
      recipient_id: action.tailor_id,
      saree_upload_id: action.saree_upload_id,
      content: action.content,
    } as never);
    if (error) throw new Error(error.message);
    await logEvent(db, userId, "message_started", { tailor_id: action.tailor_id });
    return "Message sent — you'll find the conversation under Messages.";
  }
  if (action.kind === "save_tailor") {
    const { error } = await db.from("saved_tailors").insert({ user_id: userId, tailor_id: action.tailor_id } as never);
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    await logEvent(db, userId, "tailor_selected", { tailor_id: action.tailor_id });
    return "Tailor saved to your list.";
  }
  const note = `AI style brief — ${action.style.style_name} (${action.style.outfit_type}): ${action.style.design_direction}. Blouse: ${action.style.blouse_suggestion}. ${action.style.tailoring_considerations}`;
  const { error } = await db
    .from("saree_uploads")
    .update({ ai_style_note: note } as never)
    .eq("id", action.saree_upload_id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await logEvent(db, userId, "style_selected", { saree_upload_id: action.saree_upload_id, style: action.style.style_name });
  return "Style brief attached to your request — tailors will see it with your saree.";
}
