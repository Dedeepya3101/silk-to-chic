import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminTable, EmptyRow } from "@/components/AdminShell";
import { formatDateTime } from "@/lib/admin";

export const Route = createFileRoute("/dashboard/admin_/blocks")({
  head: () => ({
    meta: [
      { title: "Block management — MatchO Admin" },
      { name: "description", content: "Full block history and force-unblock controls for the MatchO marketplace." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Block management — MatchO Admin" },
      { property: "og:description", content: "Full block history and force-unblock controls for the MatchO marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminBlocks,
});

type Row = { id: string; blocker_id: string; blocked_id: string; created_at: string; unblocked_at: string | null };

function AdminBlocks() {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("blocks").select("*").order("created_at", { ascending: false });
    const list = (data || []) as unknown as Row[];
    setRows(list);
    const ids = Array.from(new Set(list.flatMap((r) => [r.blocker_id, r.blocked_id])));
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
    const ch = supabase.channel("admin_blocks")
      .on("postgres_changes", { event: "*", schema: "public", table: "blocks" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const forceUnblock = async (row: Row) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("blocks")
      .update({ unblocked_at: new Date().toISOString(), unblocked_by: user?.id } as never)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Block lifted — history preserved");
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, unblocked_at: new Date().toISOString() } : x)));
  };

  return (
    <AdminShell title="Block management" subtitle="Complete block history — records are never deleted">
      <AdminTable head={["Blocker", "Blocked", "Blocked on", "Status", "Lifted on", "Actions"]}>
        {loading ? <EmptyRow colSpan={6} label="Loading block history…" />
          : rows.length === 0 ? <EmptyRow colSpan={6} label="No blocks recorded yet." />
          : rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3">{names[r.blocker_id] || "—"}</td>
              <td className="px-4 py-3">{names[r.blocked_id] || "—"}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                  r.unblocked_at ? "border-border bg-muted text-muted-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}>
                  {r.unblocked_at ? "Lifted" : "Active"}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(r.unblocked_at)}</td>
              <td className="px-4 py-3">
                {r.unblocked_at ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <button onClick={() => forceUnblock(r)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">
                    Force unblock
                  </button>
                )}
              </td>
            </tr>
          ))}
      </AdminTable>
    </AdminShell>
  );
}
