import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StyleIdea = {
  outfit_type: string;
  silhouette: string;
  neckline_sleeves: string;
  occasion: string;
  styling_tips: string;
  why_it_suits: string;
  tailoring_considerations: string;
};

export type TailorMatch = {
  tailor_id: string;
  rank: number;
  reason: string;
};

function fail(e: unknown): never {
  const err = e as { status?: number; message?: string };
  throw new Error(err?.message || "MatchO AI is unavailable right now. Please try again.");
}

/** Generate outfit ideas for one of the caller's own saree uploads. */
export const generateStyleIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { uploadId: string; preferences?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: upload, error } = await supabase
      .from("saree_uploads")
      .select("id, image_url, title, description, occasion, user_id")
      .eq("id", data.uploadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !upload) throw new Error("Saree not found.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("city, display_name")
      .eq("id", userId)
      .maybeSingle();

    const { callAiJson } = await import("./ai-gateway.server");

    const brief = [
      `Saree title: ${upload.title || "not provided"}`,
      `Owner notes: ${upload.description || "not provided"}`,
      `Preferred outfit category: ${upload.occasion || "not provided"}`,
      `Owner city: ${profile?.city || "not provided"}`,
      `Extra preferences from the owner: ${data.preferences?.trim() || "none"}`,
    ].join("\n");

    try {
      const result = await callAiJson<{ ideas: StyleIdea[] }>([
        {
          role: "system",
          content:
            "You are the MatchO Saree Style Agent. You advise Indian women on transforming an existing saree into a modern outfit that a local tailor can stitch. " +
            "Use only the information given plus what you can actually observe in the photo. Never invent facts about the owner, prices, or tailors. " +
            'Respond ONLY with JSON of the shape {"ideas":[{"outfit_type","silhouette","neckline_sleeves","occasion","styling_tips","why_it_suits","tailoring_considerations"}]} with 3 or 4 distinct ideas. Keep each field under 220 characters.',
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Suggest modern outfit transformations for this saree.\n\n${brief}` },
            ...(upload.image_url ? [{ type: "image_url", image_url: { url: upload.image_url } }] : []),
          ],
        },
      ]);

      const ideas = (result?.ideas || []).slice(0, 4);
      if (!ideas.length) throw new Error("MatchO AI could not generate ideas for this saree.");

      await supabase.from("ai_style_ideas").insert({
        saree_upload_id: upload.id,
        user_id: userId,
        ideas: ideas as never,
      } as never);

      return { ideas };
    } catch (e) {
      fail(e);
    }
  });

/** Persist the idea the user picked so it becomes part of the tailor brief. */
export const selectStyleIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { uploadId: string; idea: StyleIdea }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const note = `AI style brief — ${data.idea.outfit_type}: ${data.idea.silhouette}. ${data.idea.neckline_sleeves}. ${data.idea.tailoring_considerations}`;

    const { data: latest } = await supabase
      .from("ai_style_ideas")
      .select("id")
      .eq("saree_upload_id", data.uploadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.id) {
      await supabase
        .from("ai_style_ideas")
        .update({ selected_idea: data.idea as never } as never)
        .eq("id", latest.id);
    }

    const { error } = await supabase
      .from("saree_uploads")
      .update({ ai_style_note: note } as never)
      .eq("id", data.uploadId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { note };
  });

type TailorCandidate = {
  tailor_id: string;
  name: string;
  studio: string | null;
  city: string | null;
  specialization: string | null;
  experience_years: number | null;
  verified: boolean;
  avg_rating: number | null;
  review_count: number;
  completed_projects: number;
  portfolio_items: number;
  portfolio_titles: string[];
};

/** Rank real tailors for one of the caller's requests, with explanations. */
export const matchTailors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { uploadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: upload } = await supabase
      .from("saree_uploads")
      .select("id, title, description, occasion, ai_style_note")
      .eq("id", data.uploadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!upload) throw new Error("Saree request not found.");

    const { data: me } = await supabase.from("profiles").select("city").eq("id", userId).maybeSingle();

    const { data: tailorProfiles } = await supabase
      .from("tailor_profiles")
      .select(
        "tailor_id, studio_name, specialization, location, experience_years, verified_tailor, verification_status",
      );
    const rows = (tailorProfiles || []).filter((t) => t.verification_status !== "rejected");
    if (!rows.length) return { candidates: [] as TailorCandidate[], matches: [] as TailorMatch[] };

    const ids = rows.map((t) => t.tailor_id);
    const [{ data: profs }, { data: reviews }, { data: portfolio }, { data: completed }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, city, suspended").in("id", ids),
      supabase.from("reviews").select("tailor_id, rating").in("tailor_id", ids),
      supabase.from("portfolio_items").select("tailor_id, title").in("tailor_id", ids),
      supabase.from("completed_projects").select("tailor_id").in("tailor_id", ids),
    ]);

    const profMap = new Map((profs || []).map((p) => [p.id, p]));
    const candidates: TailorCandidate[] = rows
      .filter((t) => !profMap.get(t.tailor_id)?.suspended)
      .map((t) => {
        const p = profMap.get(t.tailor_id);
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
          avg_rating: rs.length ? Number((rs.reduce((a, r) => a + (r.rating || 0), 0) / rs.length).toFixed(2)) : null,
          review_count: rs.length,
          completed_projects: (completed || []).filter((r) => r.tailor_id === t.tailor_id).length,
          portfolio_items: pf.length,
          portfolio_titles: pf.map((r) => r.title).filter(Boolean).slice(0, 5) as string[],
        };
      });

    if (!candidates.length) return { candidates, matches: [] as TailorMatch[] };

    const { callAiJson } = await import("./ai-gateway.server");
    try {
      const result = await callAiJson<{ matches: TailorMatch[] }>([
        {
          role: "system",
          content:
            "You are the MatchO Tailor Matching Agent. Rank the given tailors for a saree transformation request. " +
            "Use ONLY the supplied tailor data — never invent ratings, skills, portfolio items, locations or availability. " +
            "Prefer matching specialization, same/nearby city, verification, ratings, review volume and completed work. " +
            'Respond ONLY with JSON: {"matches":[{"tailor_id","rank","reason"}]} ranked best first, at most 5 entries, reason under 220 characters and grounded in the data.',
        },
        {
          role: "user",
          content: JSON.stringify({
            request: {
              title: upload.title,
              description: upload.description,
              preferred_outfit: upload.occasion,
              ai_style_brief: upload.ai_style_note,
              user_city: me?.city || null,
            },
            tailors: candidates,
          }),
        },
      ]);

      const valid = new Set(candidates.map((c) => c.tailor_id));
      const matches = (result?.matches || [])
        .filter((m) => valid.has(m.tailor_id))
        .slice(0, 5)
        .map((m, i) => ({ ...m, rank: i + 1 }));

      await supabase.from("ai_tailor_matches").insert({
        saree_upload_id: upload.id,
        user_id: userId,
        matches: matches as never,
      } as never);

      return { candidates, matches };
    } catch (e) {
      fail(e);
    }
  });

/** Context-aware commerce assistant grounded in the caller's own MatchO data. */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const message = data.message.trim().slice(0, 2000);
    if (!message) throw new Error("Please type a question.");

    const [{ data: profile }, { data: uploads }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("display_name, city").eq("id", userId).maybeSingle(),
      supabase
        .from("saree_uploads")
        .select("id, title, description, occasion, status, ai_style_note, assigned_tailor_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("ai_chat_messages")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

    const uploadIds = (uploads || []).map((u) => u.id);
    const { data: suggestions } = uploadIds.length
      ? await supabase
          .from("suggestions")
          .select("id, saree_upload_id, tailor_id, silhouette, sleeve_ideas, color_suggestions, stitching_notes, best_fit")
          .in("saree_upload_id", uploadIds)
      : { data: [] as never[] };

    const tailorIds = Array.from(new Set((suggestions || []).map((s) => s.tailor_id)));
    const [{ data: tprofs }, { data: tprofiles }, { data: reviews }] = await Promise.all([
      tailorIds.length
        ? supabase.from("profiles").select("id, display_name, city").in("id", tailorIds)
        : Promise.resolve({ data: [] as never[] }),
      tailorIds.length
        ? supabase
            .from("tailor_profiles")
            .select("tailor_id, studio_name, specialization, experience_years, verified_tailor, location")
            .in("tailor_id", tailorIds)
        : Promise.resolve({ data: [] as never[] }),
      tailorIds.length
        ? supabase.from("reviews").select("tailor_id, rating").in("tailor_id", tailorIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const ctx = {
      member: { name: profile?.display_name, city: profile?.city },
      sarees: uploads || [],
      tailor_suggestions: (suggestions || []).map((s) => {
        const p = (tprofs || []).find((x) => x.id === s.tailor_id);
        const tp = (tprofiles || []).find((x) => x.tailor_id === s.tailor_id);
        const rs = (reviews || []).filter((r) => r.tailor_id === s.tailor_id);
        return {
          ...s,
          tailor_name: p?.display_name,
          tailor_city: tp?.location || p?.city,
          studio: tp?.studio_name,
          specialization: tp?.specialization,
          experience_years: tp?.experience_years,
          verified: tp?.verified_tailor,
          avg_rating: rs.length ? Number((rs.reduce((a, r) => a + (r.rating || 0), 0) / rs.length).toFixed(2)) : null,
          review_count: rs.length,
        };
      }),
    };

    const { callAi } = await import("./ai-gateway.server");
    try {
      const reply = await callAi([
        {
          role: "system",
          content:
            "You are the MatchO Commerce Assistant, helping a member turn an unused saree into a modern outfit through a local tailor. " +
            "MatchO has no online payments — tailoring is arranged offline through in-app chat. " +
            "Answer using ONLY the member context provided; if something is not in the data, say you do not have that information. " +
            "Be concise (under 180 words), practical, and always suggest the next concrete step in the MatchO journey. " +
            "Use markdown-free plain text with short lines.\n\nMEMBER CONTEXT:\n" +
            JSON.stringify(ctx).slice(0, 12000),
        },
        ...(history || []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message },
      ]);

      await supabase.from("ai_chat_messages").insert([
        { user_id: userId, role: "user", content: message },
        { user_id: userId, role: "assistant", content: reply },
      ] as never);

      return { reply };
    } catch (e) {
      fail(e);
    }
  });

/** Load the caller's assistant history. */
export const getAssistantHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("ai_chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(50);
    return { messages: data || [] };
  });
