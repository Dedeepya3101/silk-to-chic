import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Scissors, Flag, MessageCircle, CheckCircle2, Sparkles, BadgeCheck, Ban, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/AdminShell";

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({
    meta: [
      { title: "Admin overview — MatchO" },
      { name: "description", content: "Live marketplace statistics for MatchO administrators." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin overview — MatchO" },
      { property: "og:description", content: "Live marketplace statistics for MatchO administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminOverview,
});

type Stats = {
  users: number; tailors: number; pendingReports: number; conversations: number;
  completed: number; suggestions: number; pendingVerifications: number;
  blockedUsers: number; blockedTailors: number;
};

const empty: Stats = {
  users: 0, tailors: 0, pendingReports: 0, conversations: 0, completed: 0,
  suggestions: 0, pendingVerifications: 0, blockedUsers: 0, blockedTailors: 0,
};

function AdminOverview() {
  const [s, setS] = useState<Stats>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const count = (q: any) => q.then((r: any) => r.count || 0);
      const [users, tailors, pendingReports, completed, suggestions] = await Promise.all([
        count(supabase.from("user_roles").select("id", { count: "exact", head: true }).filter("role", "eq", "user")),
        count(supabase.from("user_roles").select("id", { count: "exact", head: true }).filter("role", "eq", "tailor")),
        count(supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending")),
        count(supabase.from("completed_projects").select("id", { count: "exact", head: true })),
        count(supabase.from("suggestions").select("id", { count: "exact", head: true })),
      ]);

      const { data: replyRows } = await supabase.from("suggestion_replies").select("suggestion_id");
      const conversations = new Set((replyRows || []).map((r) => r.suggestion_id)).size;

      const { count: pendingVerifications } = await supabase
        .from("tailor_profiles").select("id", { count: "exact", head: true }).eq("verified_tailor", false);

      const { data: blocks } = await supabase.from("blocks").select("blocked_id, unblocked_at");
      const activeBlocked = Array.from(new Set((blocks || []).filter((b: any) => !b.unblocked_at).map((b) => b.blocked_id)));
      let blockedUsers = 0, blockedTailors = 0;
      if (activeBlocked.length) {
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", activeBlocked);
        for (const r of roles || []) {
          if ((r.role as string) === "tailor") blockedTailors++;
          else if ((r.role as string) === "user") blockedUsers++;
        }
      }

      if (!active) return;
      setS({
        users, tailors, pendingReports, conversations, completed, suggestions,
        pendingVerifications: pendingVerifications || 0, blockedUsers, blockedTailors,
      });
      setLoading(false);
    };
    void load();
    const ch = supabase
      .channel("admin_overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "blocks" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "completed_projects" }, () => void load())
      .subscribe();
    return () => { active = false; void supabase.removeChannel(ch); };
  }, []);

  const cards = [
    { label: "Total Users", value: s.users, icon: Users, to: "/dashboard/admin/users" },
    { label: "Total Tailors", value: s.tailors, icon: Scissors, to: "/dashboard/admin/tailors" },
    { label: "Pending Reports", value: s.pendingReports, icon: Flag, to: "/dashboard/admin/reports" },
    { label: "Active Conversations", value: s.conversations, icon: MessageCircle, to: "/dashboard/admin/analytics" },
    { label: "Completed Transformations", value: s.completed, icon: CheckCircle2, to: "/dashboard/admin/analytics" },
    { label: "Total Suggestions", value: s.suggestions, icon: Sparkles, to: "/dashboard/admin/analytics" },
    { label: "Pending Tailor Verifications", value: s.pendingVerifications, icon: BadgeCheck, to: "/dashboard/admin/verification" },
    { label: "Blocked Users", value: s.blockedUsers, icon: Ban, to: "/dashboard/admin/blocks" },
    { label: "Blocked Tailors", value: s.blockedTailors, icon: UserX, to: "/dashboard/admin/blocks" },
  ] as const;

  return (
    <AdminShell title="Platform overview" subtitle="Live marketplace health across MatchO">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="transition hover:-translate-y-0.5">
            <AdminCard className="h-full">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-foreground">
                  <c.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-4xl">{loading ? "—" : c.value}</p>
            </AdminCard>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
