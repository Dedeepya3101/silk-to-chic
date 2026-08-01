import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Flag, BadgeCheck, AlertTriangle, UserPlus, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/AdminShell";
import { formatDateTime } from "@/lib/admin";

export const Route = createFileRoute("/dashboard/admin_/notifications")({
  head: () => ({
    meta: [
      { title: "Admin alerts — MatchO Admin" },
      { name: "description", content: "Operational alerts for reports, verifications and suspicious activity on MatchO." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin alerts — MatchO Admin" },
      { property: "og:description", content: "Operational alerts for reports, verifications and suspicious activity on MatchO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAlerts,
});

type Alert = {
  id: string; kind: "report" | "verification" | "suspicious" | "surge" | "tailor" | "block";
  title: string; body: string; at: string;
};

const ICON = { report: Flag, verification: BadgeCheck, suspicious: AlertTriangle, surge: AlertTriangle, tailor: UserPlus, block: Ban };

function AdminAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: reports }, { data: tprofiles }, { data: roles }, { data: blocks }] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("tailor_profiles").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("user_roles").select("user_id, role, created_at").order("created_at", { ascending: false }).limit(30),
      supabase.from("blocks").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    const ids = Array.from(new Set([
      ...(reports || []).flatMap((r: any) => [r.reporter_id, r.reported_user_id]),
      ...(tprofiles || []).map((t: any) => t.tailor_id),
      ...(roles || []).map((r) => r.user_id),
      ...(blocks || []).flatMap((b: any) => [b.blocker_id, b.blocked_id]),
    ]));
    const names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
      for (const p of profs || []) names[p.id] = p.display_name || p.email || p.id.slice(0, 8);
    }

    const out: Alert[] = [];

    for (const r of (reports || []) as any[]) {
      out.push({
        id: `report-${r.id}`, kind: "report",
        title: `New report — ${r.reason}`,
        body: `${names[r.reporter_id] || "A member"} reported ${names[r.reported_user_id] || "a member"}. Status: ${r.status}.`,
        at: r.created_at,
      });
    }

    // surge detection: more than 3 reports against the same account
    const byTarget: Record<string, any[]> = {};
    for (const r of (reports || []) as any[]) (byTarget[r.reported_user_id] ||= []).push(r);
    for (const [target, list] of Object.entries(byTarget)) {
      if (list.length >= 3) {
        out.push({
          id: `surge-${target}`, kind: "surge",
          title: "Large number of reports",
          body: `${names[target] || "An account"} has ${list.length} reports and needs urgent review.`,
          at: list[0].created_at,
        });
      }
    }

    for (const t of (tprofiles || []) as any[]) {
      if (!t.verified_tailor) {
        out.push({
          id: `verify-${t.id}`, kind: "verification",
          title: "Tailor awaiting verification",
          body: `${names[t.tailor_id] || t.studio_name || "A tailor"} has a studio profile pending verification.`,
          at: t.created_at,
        });
      }
    }

    for (const r of (roles || []) as any[]) {
      if ((r.role as string) === "tailor") {
        out.push({
          id: `newtailor-${r.user_id}`, kind: "tailor",
          title: "New tailor joined",
          body: `${names[r.user_id] || "A tailor"} registered on MatchO.`,
          at: r.created_at,
        });
      }
    }

    for (const b of (blocks || []) as any[]) {
      if (!b.unblocked_at) {
        out.push({
          id: `block-${b.id}`, kind: "suspicious",
          title: "Member blocked another member",
          body: `${names[b.blocker_id] || "A member"} blocked ${names[b.blocked_id] || "a member"}.`,
          at: b.created_at,
        });
      }
    }

    out.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    setAlerts(out.slice(0, 60));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase.channel("admin_alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "blocks" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tailor_profiles" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  return (
    <AdminShell title="Notification centre" subtitle="Operational alerts generated from live platform activity">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading alerts…</p>
      ) : alerts.length === 0 ? (
        <AdminCard><p className="text-sm text-muted-foreground">No alerts right now — the marketplace is quiet.</p></AdminCard>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const Icon = ICON[a.kind];
            return (
              <AdminCard key={a.id} className="flex items-start gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                  a.kind === "surge" || a.kind === "suspicious" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(a.at)}</p>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
