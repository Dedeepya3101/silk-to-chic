import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminTable, EmptyRow } from "@/components/AdminShell";
import { formatDate } from "@/lib/admin";

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
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").filter("role", "eq", "user");
    const ids = (roles || []).map((r) => r.user_id);
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const [{ data: profiles }, { data: uploads }, { data: completions }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", ids),
      supabase.from("saree_uploads").select("user_id, status").in("user_id", ids),
      supabase.from("completed_projects").select("user_id").in("user_id", ids),
    ]);
    const list: Row[] = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.display_name || p.email || p.id.slice(0, 8),
      email: p.email,
      created_at: p.created_at,
      city: p.city,
      avatar: p.avatar_url,
      suspended: !!p.suspended,
      requests: (uploads || []).filter((u) => u.user_id === p.id).length,
      completed: (completions || []).filter((c) => c.user_id === p.id).length,
    }));
    list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const setSuspended = async (row: Row, suspended: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ suspended, suspended_at: suspended ? new Date().toISOString() : null } as never)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(suspended ? `${row.name} suspended` : `${row.name} reactivated`);
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, suspended } : x)));
    setOpen((o) => (o && o.id === row.id ? { ...o, suspended } : o));
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
                    ? <button onClick={() => setSuspended(r, false)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">Reactivate</button>
                    : <button onClick={() => setSuspended(r, true)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">Suspend</button>}
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
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd>{open.suspended ? "Suspended" : "Active"}</dd></div>
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(null)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Close</button>
              <button onClick={() => setSuspended(open, !open.suspended)} className="rounded-full bg-foreground px-4 py-2 text-sm text-background">
                {open.suspended ? "Reactivate" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
