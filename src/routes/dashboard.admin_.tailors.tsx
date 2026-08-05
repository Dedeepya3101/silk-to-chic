import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminTable, EmptyRow } from "@/components/AdminShell";
import { VerifiedBadges } from "@/components/ChatSafety";
import { SuspendDialog } from "@/components/SuspendDialog";
import { useAdminGuard, formatDateTime } from "@/lib/admin";
import {
  suspendAccount, liftSuspension, logModerationAction, suspensionActive,
  remainingTime, durationLabel, type DurationKey,
} from "@/lib/moderation";

export const Route = createFileRoute("/dashboard/admin_/tailors")({
  head: () => ({
    meta: [
      { title: "Tailor management — MatchO Admin" },
      { name: "description", content: "Monitor tailor studios, portfolios, ratings and account status on MatchO." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Tailor management — MatchO Admin" },
      { property: "og:description", content: "Monitor tailor studios, portfolios, ratings and account status on MatchO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminTailors,
});

type Row = {
  id: string; name: string; city: string | null; avatar: string | null;
  portfolioCount: number; portfolio: string[]; suggestions: number; completed: number;
  rating: number | null; suspended: boolean; suspended_until: string | null; suspension_reason: string | null;
  verified_tailor: boolean; identity_verified: boolean; portfolio_verified: boolean;
};

function AdminTailors() {
  const { admin } = useAdminGuard();
  const [rows, setRows] = useState<Row[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [suspendTarget, setSuspendTarget] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").filter("role", "eq", "tailor");
    const ids = (roles || []).map((r) => r.user_id);
    if (!ids.length) { setRows([]); setLoading(false); return; }
    const [{ data: profiles }, { data: tprofiles }, { data: portfolio }, { data: suggestions }, { data: completions }, { data: reviews }] =
      await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        supabase.from("tailor_profiles").select("*").in("tailor_id", ids),
        supabase.from("portfolio_items").select("tailor_id, after_image").in("tailor_id", ids),
        supabase.from("suggestions").select("tailor_id").in("tailor_id", ids),
        supabase.from("completed_projects").select("tailor_id").in("tailor_id", ids),
        supabase.from("reviews").select("tailor_id, rating").in("tailor_id", ids),
      ]);
    const { data: susp } = await supabase.from("suspensions").select("*").in("user_id", ids).order("created_at", { ascending: false });
    setHistory((susp || []) as any[]);

    const list: Row[] = ids.map((id) => {
      const p: any = (profiles || []).find((x: any) => x.id === id);
      const tp: any = (tprofiles || []).find((x: any) => x.tailor_id === id);
      const items = (portfolio || []).filter((x) => x.tailor_id === id).map((x) => x.after_image).filter(Boolean) as string[];
      const rs = (reviews || []).filter((x) => x.tailor_id === id).map((x) => x.rating);
      return {
        id,
        name: p?.display_name || p?.email || id.slice(0, 8),
        city: tp?.location || p?.city || null,
        avatar: tp?.profile_photo || p?.avatar_url || null,
        portfolioCount: items.length,
        portfolio: items.slice(0, 6),
        suggestions: (suggestions || []).filter((s) => s.tailor_id === id).length,
        completed: (completions || []).filter((c) => c.tailor_id === id).length,
        rating: rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10 : null,
        suspended: suspensionActive(p || {}),
        suspended_until: p?.suspended_until ?? null,
        suspension_reason: p?.suspension_reason ?? null,
        verified_tailor: !!tp?.verified_tailor,
        identity_verified: !!tp?.identity_verified,
        portfolio_verified: !!tp?.portfolio_verified,
      };
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
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

  return (
    <AdminShell title="Tailor management" subtitle="Studios, portfolios and performance across the marketplace">
      <AdminTable head={["Tailor", "City", "Portfolio", "Suggestions", "Completed", "Rating", "Verification", "Actions"]}>
        {loading ? <EmptyRow colSpan={8} label="Loading tailors…" />
          : rows.length === 0 ? <EmptyRow colSpan={8} label="No tailors registered yet." />
          : rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xs">
                    {r.avatar ? <img src={r.avatar} alt="" className="h-full w-full object-cover" /> : r.name[0]?.toUpperCase()}
                  </span>
                  <span>{r.name}</span>
                  {r.suspended && <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">Suspended</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.city || "—"}</td>
              <td className="px-4 py-3">{r.portfolioCount}</td>
              <td className="px-4 py-3">{r.suggestions}</td>
              <td className="px-4 py-3">{r.completed}</td>
              <td className="px-4 py-3">{r.rating ? `${r.rating}★` : "—"}</td>
              <td className="px-4 py-3"><VerifiedBadges v={r} /></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setOpen(r)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">View</button>
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
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-float" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-accent font-display">
                {open.avatar ? <img src={open.avatar} alt={`${open.name} avatar`} className="h-full w-full object-cover" /> : open.name[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="font-display text-xl">{open.name}</h2>
                <p className="text-xs text-muted-foreground">{open.city || "City not set"} · {open.rating ? `${open.rating}★` : "No ratings"}</p>
                <VerifiedBadges v={open} className="mt-1" />
              </div>
            </div>
            <h3 className="mt-5 text-sm font-medium">Portfolio ({open.portfolioCount})</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {open.portfolio.length === 0
                ? <p className="text-xs text-muted-foreground">No portfolio items uploaded.</p>
                : open.portfolio.map((src, i) => (
                  <img key={i} src={src} alt={`${open.name} portfolio ${i + 1}`} loading="lazy" className="h-20 w-20 rounded-xl object-cover" />
                ))}
            </div>
            <h3 className="mt-5 text-sm font-medium">Suspension history</h3>
            <div className="mt-2 space-y-2">
              {open.suspended && (
                <p className="text-xs text-destructive">Currently suspended · {open.suspension_reason || "Policy violation"} · {remainingTime(open.suspended_until)}</p>
              )}
              {history.filter((h) => h.user_id === open.id).length === 0
                ? <p className="text-xs text-muted-foreground">No suspensions on record.</p>
                : history.filter((h) => h.user_id === open.id).map((h) => (
                  <div key={h.id} className="rounded-2xl bg-accent/50 px-3 py-2 text-xs">
                    {h.reason} · {durationLabel(h.duration)} · {formatDateTime(h.created_at)}{h.lifted_at ? " · lifted" : ""}
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
        memberName={suspendTarget?.name || "this tailor"}
        onConfirm={async (opts) => { if (suspendTarget) await doSuspend(suspendTarget, opts); }}
      />
    </AdminShell>
  );
}
