import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/AdminShell";
import { useAdminGuard, formatDateTime } from "@/lib/admin";
import { liftSuspension, logModerationAction, notifyMember, APPEAL_LABEL, type AppealStatus } from "@/lib/moderation";

export const Route = createFileRoute("/dashboard/admin_/appeals")({
  head: () => ({
    meta: [
      { title: "Suspension appeals — MatchO Admin" },
      { name: "description", content: "Review appeals from suspended MatchO members and reinstate accounts." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Suspension appeals — MatchO Admin" },
      { property: "og:description", content: "Review appeals from suspended MatchO members and reinstate accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAppeals,
});

type Row = {
  id: string; user_id: string; message: string; explanation: string | null;
  status: string; created_at: string; admin_notes: string | null;
  name: string; email: string | null; reason: string | null;
};

function AdminAppeals() {
  const { admin } = useAdminGuard();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | AppealStatus>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from("appeals").select("*").order("created_at", { ascending: false });
    const list = (data || []) as any[];
    const ids = Array.from(new Set(list.map((a) => a.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, display_name, email, suspension_reason").in("id", ids)
      : { data: [] as any[] };
    const pm = new Map((profs || []).map((p: any) => [p.id, p]));
    setRows(list.map((a) => {
      const p: any = pm.get(a.user_id);
      return {
        id: a.id, user_id: a.user_id, message: a.message, explanation: a.explanation,
        status: a.status, created_at: a.created_at, admin_notes: a.admin_notes,
        name: p?.display_name || p?.email || a.user_id.slice(0, 8),
        email: p?.email ?? null,
        reason: p?.suspension_reason ?? null,
      };
    }));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase.channel("admin_appeals")
      .on("postgres_changes", { event: "*", schema: "public", table: "appeals" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const decide = async (row: Row, status: AppealStatus) => {
    if (!admin) return;
    const adminNote = (notes[row.id] || "").trim();
    const { error } = await supabase
      .from("appeals")
      .update({ status, admin_notes: adminNote || null, reviewed_by: admin.id, reviewed_at: new Date().toISOString() } as never)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }

    if (status === "approved") {
      const err = await liftSuspension(row.user_id, admin.id);
      if (err) { toast.error(err.message); return; }
      await notifyMember(row.user_id, "Appeal approved", adminNote || "Your appeal was approved and your account has been reactivated.");
    } else if (status === "rejected") {
      await notifyMember(row.user_id, "Appeal rejected", adminNote || "Your appeal was reviewed and the suspension remains active.", "/suspended");
    } else {
      await notifyMember(row.user_id, "More information required", adminNote || "Our moderation team needs more details about your appeal.", "/suspended");
    }

    await logModerationAction({
      targetUserId: row.user_id, adminId: admin.id, action: `appeal_${status}`, notes: adminNote || null,
    });
    toast.success(`Appeal ${APPEAL_LABEL[status].toLowerCase()}`);
    setNotes((n) => ({ ...n, [row.id]: "" }));
    void load();
  };

  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <AdminShell title="Suspension appeals" subtitle="Every appeal decision is stored — accounts are never deleted">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected", "more_info"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as never)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              filter === f ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:bg-accent"
            }`}>
            {f === "all" ? "All" : APPEAL_LABEL[f as AppealStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading appeals…</p>
      ) : shown.length === 0 ? (
        <AdminCard><p className="text-sm text-muted-foreground">No appeals in this view.</p></AdminCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((r) => (
            <AdminCard key={r.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.email || "No email"}</p>
                </div>
                <span className="rounded-full border border-border bg-accent/60 px-2.5 py-0.5 text-[11px]">
                  {APPEAL_LABEL[r.status as AppealStatus] || r.status}
                </span>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Suspension reason</dt><dd>{r.reason || "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Appeal date</dt><dd>{formatDateTime(r.created_at)}</dd></div>
              </dl>
              <p className="mt-3 rounded-2xl bg-accent/60 p-3 text-sm">{r.message}</p>
              {r.explanation && <p className="mt-2 rounded-2xl bg-accent/40 p-3 text-xs">{r.explanation}</p>}
              {r.admin_notes && <p className="mt-2 text-xs text-muted-foreground">Admin note: {r.admin_notes}</p>}
              <textarea
                value={notes[r.id] || ""}
                onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                rows={2}
                maxLength={500}
                placeholder="Decision note sent to the member (optional)"
                className="mt-3 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button onClick={() => void decide(r, "more_info")} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Request More Information</button>
                <button onClick={() => void decide(r, "rejected")} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Reject Appeal</button>
                <button onClick={() => void decide(r, "approved")} className="rounded-full bg-foreground px-4 py-2 text-sm text-background">Approve Appeal</button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
