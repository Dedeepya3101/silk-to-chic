import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminTable, EmptyRow } from "@/components/AdminShell";
import { SuspendDialog } from "@/components/SuspendDialog";
import { formatDate, formatDateTime, useAdminGuard } from "@/lib/admin";
import {
  suspendAccount, liftSuspension, logModerationAction, suspensionActive,
  remainingTime, durationLabel, type DurationKey,
} from "@/lib/moderation";

export const Route = createFileRoute("/dashboard/admin_/users")({
  head: () => ({
    meta: [
      { title: "User management — MatchO Admin" },
      { name: "description", content: "Review member accounts, activity and account status on MatchO." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "User management — MatchO Admin" },
      { property: "og:description", content: "Review member accounts, activity and account status on MatchO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsers,
});

type Row = {
  id: string; name: string; email: string | null; created_at: string;
  requests: number; completed: number; suspended: boolean; avatar: string | null; city: string | null;
  suspended_until: string | null; suspension_reason: string | null;
};

type SuspensionRow = {
  id: string; user_id: string; reason: string; details: string | null;
  duration: string; created_at: string; ends_at: string | null; lifted_at: string | null;
};

function AdminUsers() {
  const { admin } = useAdminGuard();
  const [rows, setRows] = useState<Row[]>([]);
  const [history, setHistory] = useState<SuspensionRow[]>([]);
  const [suspendTarget, setSuspendTarget] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").filter("role", "eq", "user");
    const ids = (roles || []).map((r) => r.user_id);
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const [{ data: profiles }, { data: uploads }, { data: completions }, { data: susp }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", ids),
      supabase.from("saree_uploads").select("user_id, status").in("user_id", ids),
      supabase.from("completed_projects").select("user_id").in("user_id", ids),
      supabase.from("suspensions").select("*").in("user_id", ids).order("created_at", { ascending: false }),
    ]);
    setHistory((susp || []) as unknown as SuspensionRow[]);
    const list: Row[] = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.display_name || p.email || p.id.slice(0, 8),
      email: p.email,
      created_at: p.created_at,
      city: p.city,
      avatar: p.avatar_url,
      suspended: suspensionActive(p),
      suspended_until: p.suspended_until ?? null,
      suspension_reason: p.suspension_reason ?? null,
      requests: (uploads || []).filter((u) => u.user_id === p.id).length,
      completed: (completions || []).filter((c) => c.user_id === p.id).length,
    }));
    list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const doSuspend = async (row: Row, opts: { duration: DurationKey; reason: string; details: string }) => {
    if (!admin) return;
    const err = await suspendAccount({
      userId: row.id, adminId: admin.id, reason: opts.reason, details: opts.details, duration: opts.duration,
    });
    if (err) { toast.error(err.message); return; }
    await logModerationAction({
      targetUserId: row.id, adminId: admin.id, action: "suspension",
      notes: `${opts.reason} · ${durationLabel(opts.duration)}`,
    });
    toast.success(`${row.name} suspended`);
    void load();
  };

  const reactivate = async (row: Row) => {
    if (!admin) return;
    const err = await liftSuspension(row.id, admin.id);
    if (err) { toast.error(err.message); return; }
    await logModerationAction({ targetUserId: row.id, adminId: admin.id, action: "suspension_lifted" });
    toast.success(`${row.name} reactivated`);
    void load();
  };

  const shown = rows.filter((r) =>
    !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.email || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminShell title="User management" subtitle="Accounts are never deleted — only suspended or reactivated">
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email"
        className="mb-4 w-full max-w-sm rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
      />
      <AdminTable head={["Name", "Email", "Joined", "Requests", "Completed", "Status", "Actions"]}>
        {loading ? <EmptyRow colSpan={7} label="Loading users…" />
          : shown.length === 0 ? <EmptyRow colSpan={7} label="No users found." />
          : shown.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3">{r.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.email || "—"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
              <td className="px-4 py-3">{r.requests}</td>
              <td className="px-4 py-3">{r.completed}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                  r.suspended ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-primary"
                }`}>{r.suspended ? "Suspended" : "Active"}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setOpen(r)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">View profile</button>
                  {r.suspended
                    ? <button onClick={() => void reactivate(r)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">Lift suspension</button>
                    : <button onClick={() => setSuspendTarget(r)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">Suspend</button>}
                </div>
              </td>
            </tr>
          ))}
      </AdminTable>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-float" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-accent font-display">
                {open.avatar ? <img src={open.avatar} alt={`${open.name} avatar`} className="h-full w-full object-cover" /> : open.name[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="font-display text-xl">{open.name}</h2>
                <p className="text-xs text-muted-foreground">{open.email || "No email"}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">City</dt><dd>{open.city || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Joined</dt><dd>{formatDate(open.created_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Requests submitted</dt><dd>{open.requests}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Completed requests</dt><dd>{open.completed}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd>{open.suspended ? `Suspended · ${remainingTime(open.suspended_until)}` : "Active"}</dd></div>
              {open.suspension_reason && <div className="flex justify-between"><dt className="text-muted-foreground">Reason</dt><dd>{open.suspension_reason}</dd></div>}
            </dl>
            <h3 className="mt-5 text-sm font-medium">Suspension history</h3>
            <div className="mt-2 space-y-2">
              {history.filter((h) => h.user_id === open.id).length === 0
                ? <p className="text-xs text-muted-foreground">No suspensions on record.</p>
                : history.filter((h) => h.user_id === open.id).map((h) => (
                  <div key={h.id} className="rounded-2xl bg-accent/50 px-3 py-2 text-xs">
                    {h.reason} · {durationLabel(h.duration)} · {formatDateTime(h.created_at)}
                    {h.lifted_at ? " · lifted" : ""}
                    {h.details ? ` · ${h.details}` : ""}
                  </div>
                ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(null)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Close</button>
              <button
                onClick={() => (open.suspended ? void reactivate(open) : setSuspendTarget(open))}
                className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
              >
                {open.suspended ? "Reactivate" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
      <SuspendDialog
        open={!!suspendTarget}
        onOpenChange={(v) => { if (!v) setSuspendTarget(null); }}
        memberName={suspendTarget?.name || "this member"}
        onConfirm={async (opts) => { if (suspendTarget) await doSuspend(suspendTarget, opts); }}
      />
    </AdminShell>
  );
}
