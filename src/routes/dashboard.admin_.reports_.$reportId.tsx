import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/AdminShell";
import { VerifiedBadges } from "@/components/ChatSafety";
import { SuspendDialog } from "@/components/SuspendDialog";
import { useAdminGuard, formatDateTime, formatDate, statusClass, REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/admin";
import {
  suspendAccount, liftSuspension, logModerationAction, notifyMember,
  suspensionActive, remainingTime, durationLabel,
} from "@/lib/moderation";

export const Route = createFileRoute("/dashboard/admin_/reports_/$reportId")({
  head: () => ({
    meta: [
      { title: "Report investigation — MatchO Admin" },
      { name: "description", content: "Investigate a MatchO safety report with full member, conversation and moderation history." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Report investigation — MatchO Admin" },
      { property: "og:description", content: "Investigate a MatchO safety report with full member, conversation and moderation history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportInvestigation,
});

type Member = {
  id: string; name: string; email: string | null; avatar: string | null;
  role: string; created_at: string; suspended: boolean; suspended_until: string | null;
  suspension_reason: string | null;
  verification?: { verified_tailor: boolean; identity_verified: boolean; portfolio_verified: boolean } | null;
  verification_status?: string | null;
};

type Msg = { id: string; author: string; body: string; at: string };

function ReportInvestigation() {
  const { reportId } = useParams({ from: "/dashboard/admin_/reports_/$reportId" });
  const { admin } = useAdminGuard();
  const [report, setReport] = useState<any>(null);
  const [reporter, setReporter] = useState<Member | null>(null);
  const [reported, setReported] = useState<Member | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [prevReports, setPrevReports] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [suspensions, setSuspensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);

  const loadMember = async (id: string): Promise<Member | null> => {
    const [{ data: p }, { data: roles }, { data: tp }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.from("tailor_profiles").select("*").eq("tailor_id", id).maybeSingle(),
    ]);
    if (!p) return null;
    const pa: any = p;
    const tpa: any = tp;
    const roleList = (roles || []).map((r: any) => r.role as string);
    return {
      id,
      name: pa.display_name || pa.email || id.slice(0, 8),
      email: pa.email,
      avatar: tpa?.profile_photo || pa.avatar_url || null,
      role: roleList.includes("tailor") ? "Tailor" : roleList.includes("admin") ? "Admin" : "User",
      created_at: pa.created_at,
      suspended: !!pa.suspended,
      suspended_until: pa.suspended_until ?? null,
      suspension_reason: pa.suspension_reason ?? null,
      verification: tpa
        ? {
            verified_tailor: !!tpa.verified_tailor,
            identity_verified: !!tpa.identity_verified,
            portfolio_verified: !!tpa.portfolio_verified,
          }
        : null,
      verification_status: tpa?.verification_status ?? null,
    };
  };

  const load = async () => {
    const { data: r } = await supabase.from("reports").select("*").eq("id", reportId).maybeSingle();
    if (!r) { setLoading(false); return; }
    setReport(r);
    const ra: any = r;
    const [rep, rpt] = await Promise.all([loadMember(ra.reporter_id), loadMember(ra.reported_user_id)]);
    setReporter(rep);
    setReported(rpt);

    if (ra.suggestion_id) {
      const [{ data: sug }, { data: reps }] = await Promise.all([
        supabase.from("suggestions").select("*").eq("id", ra.suggestion_id).maybeSingle(),
        supabase.from("suggestion_replies").select("*").eq("suggestion_id", ra.suggestion_id).order("created_at", { ascending: true }),
      ]);
      const list: Msg[] = [];
      const sa: any = sug;
      if (sa) {
        const parts = [sa.silhouette, sa.sleeve_ideas, sa.color_suggestions, sa.stitching_notes, sa.best_fit]
          .filter(Boolean).join(" · ");
        list.push({ id: sa.id, author: sa.tailor_id, body: parts || "Redesign suggestion sent.", at: sa.created_at });
      }
      for (const x of (reps || []) as any[]) {
        list.push({ id: x.id, author: x.user_id, body: x.message, at: x.created_at });
      }
      setMessages(list);
    }

    const [{ data: pr }, { data: acts }, { data: susp }] = await Promise.all([
      supabase.from("reports").select("*").eq("reported_user_id", ra.reported_user_id).order("created_at", { ascending: false }),
      supabase.from("moderation_actions").select("*").eq("target_user_id", ra.reported_user_id).order("created_at", { ascending: false }),
      supabase.from("suspensions").select("*").eq("user_id", ra.reported_user_id).order("created_at", { ascending: false }),
    ]);
    setPrevReports(((pr || []) as any[]).filter((x) => x.id !== reportId));
    setActions((acts || []) as any[]);
    setSuspensions((susp || []) as any[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase.channel("admin_report_" + reportId)
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestion_replies" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const warnings = useMemo(() => actions.filter((a) => a.action === "warning"), [actions]);

  const setStatus = async (status: ReportStatus | "escalated", action: string) => {
    if (!admin || !report) return;
    const { error } = await supabase
      .from("reports")
      .update({
        status: status === "escalated" ? "under_review" : status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        admin_notes: note.trim() || report.admin_notes || null,
      } as never)
      .eq("id", report.id);
    if (error) { toast.error(error.message); return; }
    await logModerationAction({
      reportId: report.id, targetUserId: report.reported_user_id, adminId: admin.id,
      action, notes: note.trim() || null,
    });
    setNote("");
    toast.success("Report updated");
    void load();
  };

  const issueWarning = async () => {
    if (!admin || !report || !reported) return;
    await logModerationAction({
      reportId: report.id, targetUserId: reported.id, adminId: admin.id,
      action: "warning", notes: note.trim() || null,
    });
    await notifyMember(
      reported.id,
      "Warning from MatchO moderation",
      note.trim() || "Your recent activity was reported and reviewed. Please follow our community guidelines.",
    );
    setNote("");
    toast.success("Warning issued");
    void load();
  };

  const escalate = async () => {
    if (!admin || !report) return;
    await setStatus("escalated", "escalated");
  };

  const doSuspend = async (opts: { duration: any; reason: string; details: string }) => {
    if (!admin || !reported) return;
    const err = await suspendAccount({
      userId: reported.id, adminId: admin.id, reason: opts.reason,
      details: opts.details, duration: opts.duration,
    });
    if (err) { toast.error(err.message); return; }
    await logModerationAction({
      reportId: report?.id ?? null, targetUserId: reported.id, adminId: admin.id,
      action: "suspension", notes: `${opts.reason} · ${durationLabel(opts.duration)}`,
    });
    toast.success("Account suspended");
    void load();
  };

  const doLift = async () => {
    if (!admin || !reported) return;
    const err = await liftSuspension(reported.id, admin.id);
    if (err) { toast.error(err.message); return; }
    await logModerationAction({
      reportId: report?.id ?? null, targetUserId: reported.id, adminId: admin.id, action: "suspension_lifted",
    });
    toast.success("Suspension lifted");
    void load();
  };

  const nameOf = (uid: string) =>
    uid === reporter?.id ? reporter?.name : uid === reported?.id ? reported?.name : uid.slice(0, 8);

  return (
    <AdminShell title="Report investigation" subtitle="Full context before any moderation decision">
      <Link to="/dashboard/admin/reports" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to reports
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : !report ? (
        <AdminCard><p className="text-sm text-muted-foreground">This report no longer exists.</p></AdminCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <MemberCard title="Reporter information" m={reporter} showStatus={false} />
          <MemberCard title="Reported member" m={reported} showStatus />

          <AdminCard>
            <h2 className="font-display text-lg">Report information</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Report ID" v={<span className="font-mono text-xs">{report.id}</span>} />
              <Row k="Reason" v={report.reason} />
              <Row k="Additional comments" v={report.details || "—"} />
              <Row k="Date submitted" v={formatDateTime(report.created_at)} />
              <Row k="Current status" v={
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${statusClass(report.status)}`}>
                  {REPORT_STATUS_LABEL[report.status as ReportStatus] || report.status}
                </span>
              } />
              {report.admin_notes && <Row k="Admin notes" v={report.admin_notes} />}
            </dl>
          </AdminCard>

          <AdminCard>
            <h2 className="font-display text-lg">History</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Previous reports" v={String(prevReports.length)} />
              <Row k="Previous warnings" v={String(warnings.length)} />
              <Row k="Previous suspensions" v={String(suspensions.length)} />
            </dl>
            <div className="mt-4 space-y-2">
              {prevReports.slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-2xl bg-accent/50 px-3 py-2 text-xs">
                  <span className="font-medium">{p.reason}</span> · {formatDate(p.created_at)} ·{" "}
                  {REPORT_STATUS_LABEL[p.status as ReportStatus] || p.status}
                </div>
              ))}
              {suspensions.slice(0, 4).map((s) => (
                <div key={s.id} className="rounded-2xl bg-accent/50 px-3 py-2 text-xs">
                  Suspension · {s.reason} · {durationLabel(s.duration)} · {formatDate(s.created_at)}
                  {s.lifted_at ? " · lifted" : ""}
                </div>
              ))}
              {warnings.slice(0, 4).map((w) => (
                <div key={w.id} className="rounded-2xl bg-accent/50 px-3 py-2 text-xs">
                  Warning · {formatDate(w.created_at)}{w.notes ? ` · ${w.notes}` : ""}
                </div>
              ))}
              {!prevReports.length && !suspensions.length && !warnings.length && (
                <p className="text-xs text-muted-foreground">No prior moderation history for this member.</p>
              )}
            </div>
          </AdminCard>

          <AdminCard className="lg:col-span-2">
            <h2 className="font-display text-lg">Conversation</h2>
            <p className="text-xs text-muted-foreground">Read-only transcript — admins cannot send messages.</p>
            {!report.suggestion_id ? (
              <p className="mt-4 text-sm text-muted-foreground">This report is not linked to a conversation.</p>
            ) : messages.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No messages in this conversation yet.</p>
            ) : (
              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto rounded-2xl bg-accent/30 p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.author === reported?.id ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.author === reported?.id ? "bg-card border border-border" : "bg-foreground text-background"
                    }`}>
                      <p className="mb-0.5 text-[10px] opacity-70">{nameOf(m.author)} · {formatDateTime(m.at)}</p>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          <AdminCard className="lg:col-span-2">
            <h2 className="font-display text-lg">Admin actions</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={800}
              placeholder="Decision notes (stored with the moderation history)"
              className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
              rows={3}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void setStatus("under_review", "marked_under_review")} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Mark Under Review</button>
              <button onClick={() => void issueWarning()} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Issue Warning</button>
              {reported && suspensionActive(reported)
                ? <button onClick={() => void doLift()} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Lift Suspension</button>
                : <button onClick={() => setSuspendOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive hover:bg-destructive/20"><ShieldAlert className="h-4 w-4" /> Suspend Account</button>}
              <button onClick={() => void escalate()} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Escalate</button>
              <button onClick={() => void setStatus("dismissed", "dismissed")} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Dismiss Report</button>
              <button onClick={() => void setStatus("resolved", "resolved")} className="rounded-full bg-foreground px-4 py-2 text-sm text-background">Resolve Report</button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Reports are never deleted — every action is stored in the moderation history.</p>
          </AdminCard>
        </div>
      )}

      <SuspendDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        memberName={reported?.name || "this member"}
        onConfirm={doSuspend}
      />
    </AdminShell>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function MemberCard({ title, m, showStatus }: { title: string; m: Member | null; showStatus: boolean }) {
  return (
    <AdminCard>
      <h2 className="font-display text-lg">{title}</h2>
      {!m ? (
        <p className="mt-3 text-sm text-muted-foreground">Member record unavailable.</p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent font-display">
              {m.avatar ? <img src={m.avatar} alt={`${m.name} profile photo`} className="h-full w-full object-cover" /> : m.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.email || "No email"}</p>
              <VerifiedBadges v={m.verification} className="mt-1" />
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row k="Role" v={m.role} />
            <Row k="Registered" v={formatDate(m.created_at)} />
            {showStatus && (
              <>
                <Row k="Verification" v={m.verification_status ? m.verification_status.replace("_", " ") : "Not applicable"} />
                <Row k="Account status" v={
                  suspensionActive(m)
                    ? <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] text-destructive">
                        Suspended · {remainingTime(m.suspended_until)}
                      </span>
                    : <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary">Active</span>
                } />
                {m.suspension_reason && <Row k="Suspension reason" v={m.suspension_reason} />}
              </>
            )}
          </dl>
        </>
      )}
    </AdminCard>
  );
}
