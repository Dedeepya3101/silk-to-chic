import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/AdminShell";

export const Route = createFileRoute("/dashboard/admin_/analytics")({
  head: () => ({
    meta: [
      { title: "Platform analytics — MatchO Admin" },
      { name: "description", content: "Live registration, engagement and quality metrics for the MatchO marketplace." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Platform analytics — MatchO Admin" },
      { property: "og:description", content: "Live registration, engagement and quality metrics for the MatchO marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAnalytics,
});

type Metrics = {
  daily: number; monthly: number; suggestions: number; activeUsers: number;
  activeTailors: number; completed: number; reports: number; avgRating: number | null;
  trend: { label: string; count: number }[];
};

function AdminAnalytics() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [{ data: profiles }, { data: roles }, { data: suggestions }, { data: uploads }, { data: reviews }] =
        await Promise.all([
          supabase.from("profiles").select("id, created_at"),
          supabase.from("user_roles").select("user_id, role"),
          supabase.from("suggestions").select("id, tailor_id, user_id, created_at"),
          supabase.from("saree_uploads").select("id, user_id, created_at"),
          supabase.from("reviews").select("rating"),
        ]);

      const [{ count: completed }, { count: reports }] = await Promise.all([
        supabase.from("completed_projects").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
      ]);

      const roleOf = new Map((roles || []).map((r) => [r.user_id, r.role as string]));
      const since30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

      const activeUserIds = new Set(
        [...(uploads || []).filter((u) => new Date(u.created_at) >= since30).map((u) => u.user_id),
         ...(suggestions || []).filter((s) => new Date(s.created_at) >= since30).map((s) => s.user_id)]
          .filter((id) => roleOf.get(id) === "user"));
      const activeTailorIds = new Set(
        (suggestions || []).filter((s) => new Date(s.created_at) >= since30).map((s) => s.tailor_id));

      const trend: { label: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
        const key = d.toDateString();
        trend.push({
          label: d.toLocaleDateString(undefined, { weekday: "short" }),
          count: (profiles || []).filter((p) => new Date(p.created_at).toDateString() === key).length,
        });
      }

      const ratings = (reviews || []).map((r) => r.rating);
      if (!active) return;
      setM({
        daily: (profiles || []).filter((p) => p.created_at >= dayAgo).length,
        monthly: (profiles || []).filter((p) => p.created_at >= monthStart).length,
        suggestions: (suggestions || []).length,
        activeUsers: activeUserIds.size,
        activeTailors: activeTailorIds.size,
        completed: completed || 0,
        reports: reports || 0,
        avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
        trend,
      });
    })();
    return () => { active = false; };
  }, []);

  const stats = [
    { label: "Daily registrations", value: m?.daily },
    { label: "Monthly registrations", value: m?.monthly },
    { label: "Suggestions sent", value: m?.suggestions },
    { label: "Active users (30d)", value: m?.activeUsers },
    { label: "Active tailors (30d)", value: m?.activeTailors },
    { label: "Completed transformations", value: m?.completed },
    { label: "Reports submitted", value: m?.reports },
    { label: "Average rating", value: m?.avgRating ?? "—" },
  ];

  const max = Math.max(1, ...(m?.trend.map((t) => t.count) || [1]));

  return (
    <AdminShell title="Platform analytics" subtitle="Live marketplace performance — no sampled or cached data">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <AdminCard key={s.label}>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-3xl">{m ? (s.value ?? 0) : "—"}</p>
          </AdminCard>
        ))}
      </div>

      <AdminCard className="mt-4">
        <h2 className="font-display text-xl">Registrations — last 7 days</h2>
        <div className="mt-6 flex h-40 items-end gap-3">
          {(m?.trend || []).map((t) => (
            <div key={t.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground">{t.count}</span>
              <div className="w-full rounded-t-xl bg-gradient-primary" style={{ height: `${(t.count / max) * 100}%`, minHeight: 4 }} />
              <span className="text-xs text-muted-foreground">{t.label}</span>
            </div>
          ))}
          {!m && <p className="text-sm text-muted-foreground">Loading analytics…</p>}
        </div>
      </AdminCard>
    </AdminShell>
  );
}
