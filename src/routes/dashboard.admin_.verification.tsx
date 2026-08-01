import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/AdminShell";
import { VerifiedBadges } from "@/components/ChatSafety";

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
  city: string | null;
  experience: number | null;
  avatar: string | null;
  rating: number | null;
  portfolio: string[];
  profileRowId: string | null;
  verified_tailor: boolean;
  identity_verified: boolean;
  portfolio_verified: boolean;
};

type Flag = "verified_tailor" | "identity_verified" | "portfolio_verified";

function AdminVerification() {
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").filter("role", "eq", "tailor");
    const ids = (roles || []).map((r) => r.user_id);
    if (!ids.length) { setTailors([]); setLoading(false); return; }

    const [{ data: profiles }, { data: tprofiles }, { data: portfolio }, { data: reviews }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, email, city, experience_years, avatar_url").in("id", ids),
      supabase.from("tailor_profiles").select("*").in("tailor_id", ids),
      supabase.from("portfolio_items").select("tailor_id, after_image").in("tailor_id", ids),
      supabase.from("reviews").select("tailor_id, rating").in("tailor_id", ids),
    ]);

    const list: Tailor[] = ids.map((id) => {
      const p = (profiles || []).find((x) => x.id === id);
      const tp: any = (tprofiles || []).find((x: any) => x.tailor_id === id);
      const items = (portfolio || []).filter((x) => x.tailor_id === id).map((x) => x.after_image).filter(Boolean) as string[];
      const rs = (reviews || []).filter((x) => x.tailor_id === id).map((x) => x.rating);
      return {
        tailorId: id,
        name: p?.display_name || p?.email || id.slice(0, 8),
        city: tp?.location || p?.city || null,
        experience: tp?.experience_years ?? p?.experience_years ?? null,
        avatar: tp?.profile_photo || p?.avatar_url || null,
        rating: rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10 : null,
        portfolio: items.slice(0, 4),
        profileRowId: tp?.id ?? null,
        verified_tailor: !!tp?.verified_tailor,
        identity_verified: !!tp?.identity_verified,
        portfolio_verified: !!tp?.portfolio_verified,
      };
    });
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

  const toggle = async (t: Tailor, flag: Flag) => {
    const next = !t[flag];
    let error;
    if (t.profileRowId) {
      ({ error } = await supabase.from("tailor_profiles").update({ [flag]: next } as never).eq("id", t.profileRowId));
    } else {
      ({ error } = await supabase.from("tailor_profiles").insert({ tailor_id: t.tailorId, [flag]: next } as never));
    }
    if (error) { toast.error(error.message); return; }
    toast.success(`${next ? "Granted" : "Revoked"} for ${t.name}`);
    void load();
  };

  const flags: { key: Flag; label: string }[] = [
    { key: "verified_tailor", label: "Verified Tailor" },
    { key: "identity_verified", label: "Identity Verified" },
    { key: "portfolio_verified", label: "Portfolio Verified" },
  ];

  return (
    <AdminShell title="Tailor verification" subtitle="Badges apply instantly across profiles, suggestions and chat">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tailors…</p>
      ) : tailors.length === 0 ? (
        <AdminCard><p className="text-sm text-muted-foreground">No tailors registered yet.</p></AdminCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tailors.map((t) => (
            <AdminCard key={t.tailorId}>
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent font-display text-lg">
                  {t.avatar ? <img src={t.avatar} alt={`${t.name} profile photo`} className="h-full w-full object-cover" /> : t.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{t.name}</p>
                    <VerifiedBadges v={t} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.city || "City not set"} · {t.experience ?? 0} yrs experience · {t.rating ? `${t.rating}★` : "No ratings"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {t.portfolio.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No portfolio items uploaded.</p>
                ) : t.portfolio.map((src, i) => (
                  <img key={i} src={src} alt={`${t.name} portfolio ${i + 1}`} loading="lazy" className="h-16 w-16 rounded-xl object-cover" />
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {flags.map((f) => (
                  <div key={f.key} className="flex items-center justify-between rounded-2xl bg-accent/50 px-3 py-2">
                    <span className="text-sm">{f.label}</span>
                    <button
                      onClick={() => toggle(t, f.key)}
                      aria-pressed={t[f.key]}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        t[f.key] ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {t[f.key] ? "Verified" : "Grant"}
                    </button>
                  </div>
                ))}
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
