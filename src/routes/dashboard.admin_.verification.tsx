import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/AdminShell";
import { VerifiedBadges } from "@/components/ChatSafety";
import { useAdminGuard, formatDate } from "@/lib/admin";
import { VERIFICATION_LABEL, logModerationAction, notifyMember, type VerificationStatus } from "@/lib/moderation";

export const Route = createFileRoute("/dashboard/admin_/verification")({
  head: () => ({
    meta: [
      { title: "Tailor verification — MatchO Admin" },
      { name: "description", content: "Approve tailor, identity and portfolio verification badges on MatchO." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Tailor verification — MatchO Admin" },
      { property: "og:description", content: "Approve tailor, identity and portfolio verification badges on MatchO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminVerification,
});

type Tailor = {
  tailorId: string;
  name: string;
  email: string | null;
  city: string | null;
  bio: string | null;
  experience: number | null;
  avatar: string | null;
  rating: number | null;
  registered: string;
  portfolio: string[];
  documents: string[];
  profileRowId: string | null;
  status: VerificationStatus;
  rejection_reason: string | null;
  verification_notes: string | null;
  verified_tailor: boolean;
  identity_verified: boolean;
  portfolio_verified: boolean;
};

function AdminVerification() {
  const { admin } = useAdminGuard();
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | VerificationStatus>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").filter("role", "eq", "tailor");
    const ids = (roles || []).map((r) => r.user_id);
    if (!ids.length) { setTailors([]); setLoading(false); return; }

    const [{ data: profiles }, { data: tprofiles }, { data: portfolio }, { data: reviews }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", ids),
      supabase.from("tailor_profiles").select("*").in("tailor_id", ids),
      supabase.from("portfolio_items").select("tailor_id, after_image").in("tailor_id", ids),
      supabase.from("reviews").select("tailor_id, rating").in("tailor_id", ids),
    ]);

    const list: Tailor[] = ids.map((id) => {
      const p: any = (profiles || []).find((x: any) => x.id === id);
      const tp: any = (tprofiles || []).find((x: any) => x.tailor_id === id);
      const items = (portfolio || []).filter((x) => x.tailor_id === id).map((x) => x.after_image).filter(Boolean) as string[];
      const rs = (reviews || []).filter((x) => x.tailor_id === id).map((x) => x.rating);
      return {
        tailorId: id,
        name: p?.display_name || p?.email || id.slice(0, 8),
        email: p?.email ?? null,
        city: tp?.location || p?.city || null,
        bio: tp?.bio || p?.bio || null,
        experience: tp?.experience_years ?? p?.experience_years ?? null,
        avatar: tp?.profile_photo || p?.avatar_url || null,
        rating: rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10 : null,
        registered: p?.created_at,
        portfolio: items.slice(0, 6),
        documents: (tp?.verification_documents as string[] | null) || [],
        profileRowId: tp?.id ?? null,
        status: (tp?.verification_status as VerificationStatus) || "pending",
        rejection_reason: tp?.rejection_reason ?? null,
        verification_notes: tp?.verification_notes ?? null,
        verified_tailor: !!tp?.verified_tailor,
        identity_verified: !!tp?.identity_verified,
        portfolio_verified: !!tp?.portfolio_verified,
      };
    });
    list.sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
    setTailors(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase.channel("admin_verification")
      .on("postgres_changes", { event: "*", schema: "public", table: "tailor_profiles" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const saveVerification = async (t: Tailor, patch: Record<string, unknown>) => {
    if (t.profileRowId) {
      return (await supabase.from("tailor_profiles").update(patch as never).eq("id", t.profileRowId)).error;
    }
    return (await supabase.from("tailor_profiles").insert({ tailor_id: t.tailorId, ...patch } as never)).error;
  };

  const decide = async (t: Tailor, status: VerificationStatus) => {
    if (!admin) return;
    const note = (notes[t.tailorId] || "").trim();
    if (status === "rejected" && !note) {
      toast.error("Enter a rejection reason before rejecting.");
      return;
    }
    const approved = status === "approved";
    const error = await saveVerification(t, {
      verification_status: status,
      verified_tailor: approved,
      identity_verified: approved,
      portfolio_verified: approved,
      rejection_reason: status === "rejected" ? note : null,
      verification_notes: status === "more_info" ? note || null : note || t.verification_notes,
      verified_at: approved ? new Date().toISOString() : null,
      verified_by: admin.id,
    });
    if (error) { toast.error(error.message); return; }

    await logModerationAction({
      targetUserId: t.tailorId, adminId: admin.id, action: `verification_${status}`, notes: note || null,
    });
    await notifyMember(
      t.tailorId,
      approved ? "Verification approved" : status === "rejected" ? "Verification rejected" : "More information required",
      approved
        ? "Your studio is now verified. Verified badges are visible across MatchO."
        : note || (status === "rejected"
          ? "Your verification request was rejected. Your account remains active."
          : "Our team needs more information to verify your studio."),
      "/dashboard/tailor/profile-edit",
    );
    toast.success(`Verification ${VERIFICATION_LABEL[status].toLowerCase()} for ${t.name}`);
    setNotes((n) => ({ ...n, [t.tailorId]: "" }));
    void load();
  };

  const shown = filter === "all" ? tailors : tailors.filter((t) => t.status === filter);

  return (
    <AdminShell title="Tailor verification" subtitle="Badges stay hidden until a studio is approved">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "more_info", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as never)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              filter === f ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:bg-accent"
            }`}>
            {f === "all" ? "All" : VERIFICATION_LABEL[f as VerificationStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading verification queue…</p>
      ) : shown.length === 0 ? (
        <AdminCard><p className="text-sm text-muted-foreground">No tailors in this view.</p></AdminCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((t) => (
            <AdminCard key={t.tailorId}>
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent font-display text-lg">
                  {t.avatar ? <img src={t.avatar} alt={`${t.name} profile photo`} className="h-full w-full object-cover" /> : t.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{t.name}</p>
                    <span className="rounded-full border border-border bg-accent/60 px-2.5 py-0.5 text-[10px]">
                      {VERIFICATION_LABEL[t.status] || t.status}
                    </span>
                    <VerifiedBadges v={t} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.city || "City not set"} · {t.experience ?? 0} yrs experience · {t.rating ? `${t.rating}★` : "No ratings"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.email || "No email"} · registered {formatDate(t.registered)}
                  </p>
                  {t.bio && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{t.bio}</p>}
                </div>
              </div>

              <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Portfolio</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {t.portfolio.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No portfolio items uploaded.</p>
                ) : t.portfolio.map((src, i) => (
                  <img key={i} src={src} alt={`${t.name} portfolio ${i + 1}`} loading="lazy" className="h-16 w-16 rounded-xl object-cover" />
                ))}
              </div>

              <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Verification documents</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {t.documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No documents uploaded.</p>
                ) : t.documents.map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">
                    Document {i + 1}
                  </a>
                ))}
              </div>

              {t.rejection_reason && (
                <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">Rejected: {t.rejection_reason}</p>
              )}
              {t.status === "more_info" && t.verification_notes && (
                <p className="mt-3 rounded-2xl bg-accent/60 p-3 text-xs">Requested: {t.verification_notes}</p>
              )}

              <textarea
                value={notes[t.tailorId] || ""}
                onChange={(e) => setNotes((n) => ({ ...n, [t.tailorId]: e.target.value }))}
                rows={2}
                maxLength={500}
                placeholder="Rejection reason / information requested"
                className="mt-3 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
              />

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button onClick={() => void decide(t, "more_info")} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Request More Information</button>
                <button onClick={() => void decide(t, "rejected")} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Reject Verification</button>
                <button onClick={() => void decide(t, "approved")} className="rounded-full bg-foreground px-4 py-2 text-sm text-background">Approve Verification</button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
