import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminTable, EmptyRow } from "@/components/AdminShell";
import { REPORT_STATUSES, REPORT_STATUS_LABEL, statusClass, formatDateTime, type ReportStatus } from "@/lib/admin";

export const Route = createFileRoute("/dashboard/admin_/reports")({
  head: () => ({
    meta: [
      { title: "Report management — MatchO Admin" },
      { name: "description", content: "Review, resolve and dismiss user safety reports on MatchO." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Report management — MatchO Admin" },
      { property: "og:description", content: "Review, resolve and dismiss user safety reports on MatchO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminReports,
});

type Row = {
  id: string; reporter_id: string; reported_user_id: string; suggestion_id: string | null;
  reason: string; details: string | null; created_at: string; status: string;
};

function AdminReports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);

  const load = async () => {
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    const list = (data || []) as unknown as Row[];
    setRows(list);
    const ids = Array.from(new Set(list.flatMap((r) => [r.reporter_id, r.reported_user_id])));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
      const map: Record<string, string> = {};
      for (const p of profs || []) map[p.id] = p.display_name || p.email || p.id.slice(0, 8);
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase.channel("admin_reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const setStatus = async (id: string, status: ReportStatus) => {
    const { error } = await supabase
      .from("reports")
      .update({ status, reviewed_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Report marked ${REPORT_STATUS_LABEL[status]}`);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    setOpen((o) => (o && o.id === id ? { ...o, status } : o));
  };

  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <AdminShell title="Report management" subtitle="Moderate safety reports submitted by the community">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...REPORT_STATUSES] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as never)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              filter === f ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:bg-accent"
            }`}>
            {f === "all" ? "All" : REPORT_STATUS_LABEL[f as ReportStatus]}
          </button>
        ))}
      </div>

      <AdminTable head={["Report", "Reporter", "Reported", "Reason", "Conversation", "Submitted", "Status", "Actions"]}>
        {loading ? <EmptyRow colSpan={8} label="Loading reports…" />
          : shown.length === 0 ? <EmptyRow colSpan={8} label="No reports in this view." />
          : shown.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</td>
              <td className="px-4 py-3">{names[r.reporter_id] || "—"}</td>
              <td className="px-4 py-3">{names[r.reported_user_id] || "—"}</td>
              <td className="px-4 py-3">{r.reason}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {r.suggestion_id ? `Thread ${r.suggestion_id.slice(0, 8)}` : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${statusClass(r.status)}`}>
                  {REPORT_STATUS_LABEL[(r.status as ReportStatus)] || r.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Link to="/dashboard/admin/reports/$reportId" params={{ reportId: r.id }}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">View</Link>
                  <Link to="/dashboard/admin/reports/$reportId" params={{ reportId: r.id }}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">Review</Link>
                  <button onClick={() => setStatus(r.id, "resolved")} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">Resolve</button>
                  <button onClick={() => setStatus(r.id, "dismissed")} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">Dismiss</button>
                </div>
              </td>
            </tr>
          ))}
      </AdminTable>
    </AdminShell>
  );
}

