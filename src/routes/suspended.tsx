import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/session";
import { formatDateTime } from "@/lib/admin";
import { suspensionActive, remainingTime, durationLabel, APPEAL_LABEL, type AppealStatus } from "@/lib/moderation";

export const Route = createFileRoute("/suspended")({
  head: () => ({
    meta: [
      { title: "Account suspended — MatchO" },
      { name: "description", content: "Your MatchO account is currently suspended. Review the reason and submit an appeal." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Account suspended — MatchO" },
      { property: "og:description", content: "Your MatchO account is currently suspended. Review the reason and submit an appeal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuspendedPage,
});

function SuspendedPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [suspension, setSuspension] = useState<any>(null);
  const [appeal, setAppeal] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate({ to: "/login", replace: true }); return; }
    const [{ data: p }, { data: s }, { data: a }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("suspensions").select("*").eq("user_id", user.id).is("lifted_at", null).order("created_at", { ascending: false }).limit(1),
      supabase.from("appeals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    ]);
    if (!suspensionActive(p as any)) { navigate({ to: "/dashboard", replace: true }); return; }
    setProfile(p);
    setSuspension((s || [])[0] || null);
    setAppeal((a || [])[0] || null);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const submitAppeal = async () => {
    if (!message.trim() || !profile) return;
    setBusy(true);
    const { error } = await supabase.from("appeals").insert({
      user_id: profile.id,
      suspension_id: suspension?.id ?? null,
      message: message.trim(),
      explanation: explanation.trim() || null,
    } as never);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Appeal submitted. Our moderation team will review it.");
    setMessage(""); setExplanation(""); setShowForm(false);
    void load();
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Checking your account…</div>;
  }

  const canAppeal = !appeal || appeal.status === "more_info" || appeal.status === "rejected";

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 shadow-float">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl">Your account has been suspended.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Marketplace actions are paused. Your data and conversations are preserved.
        </p>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Reason</dt><dd>{profile?.suspension_reason || suspension?.reason || "Policy violation"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Duration</dt><dd>{durationLabel(suspension?.duration)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Remaining</dt><dd>{remainingTime(profile?.suspended_until)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Started</dt><dd>{formatDateTime(profile?.suspended_at)}</dd></div>
        </dl>

        {appeal && (
          <div className="mt-5 rounded-2xl bg-accent/60 p-4 text-sm">
            <p className="font-medium">Appeal status: {APPEAL_LABEL[appeal.status as AppealStatus] || appeal.status}</p>
            <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDateTime(appeal.created_at)}</p>
            {appeal.admin_notes && <p className="mt-2 text-xs">Moderator: {appeal.admin_notes}</p>}
          </div>
        )}

        {showForm ? (
          <div className="mt-5 space-y-3">
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1000}
              placeholder="Appeal message (required)"
              className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            <textarea
              value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} maxLength={1000}
              placeholder="Additional explanation (optional)"
              className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button onClick={() => void submitAppeal()} disabled={busy || !message.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit appeal
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            {canAppeal && (
              <button onClick={() => setShowForm(true)} className="rounded-full bg-foreground px-5 py-2.5 text-sm text-background">Appeal</button>
            )}
            <Link to="/" className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-accent">Back to homepage</Link>
            <button onClick={() => { void signOut().then(() => navigate({ to: "/login", replace: true })); }}
              className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-accent">Sign out</button>
          </div>
        )}
      </div>
    </main>
  );
}
