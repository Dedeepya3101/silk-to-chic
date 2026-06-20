import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, KeyRound, LogOut, Mail } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession, signOut } from "@/lib/session";

export const Route = createFileRoute("/dashboard/tailor_/settings")({
  head: () => ({ meta: [{ title: "Account Settings — MatchO" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await refreshSession();
      if (!alive) return;
      if (!s) { navigate({ to: "/login", replace: true }); return; }
      if (s.role !== "tailor") { navigate({ to: "/dashboard/user", replace: true }); return; }
      setEmail(s.email || "");
      setReady(true);
    })();
    return () => { alive = false; };
  }, [navigate]);

  const updatePassword = async () => {
    if (pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated");
      setPw("");
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally { setSaving(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  if (!ready) {
    return (
      <AppShell role="tailor" title="Account Settings">
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell role="tailor" title="Account Settings">
      <div className="space-y-6 max-w-2xl">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg mb-1 flex items-center gap-2"><Mail className="h-4 w-4" /> Email</h2>
          <p className="text-sm text-muted-foreground">{email || "—"}</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg mb-3 flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change password</h2>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={updatePassword}
            disabled={saving}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm text-secondary-foreground disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg mb-3">Profile</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/dashboard/tailor/profile" className="rounded-xl bg-accent px-3 py-2">Edit tailor profile</Link>
            <Link to="/dashboard/tailor/profile-edit" className="rounded-xl bg-accent px-3 py-2">Edit studio profile</Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg mb-3">Session</h2>
          <button onClick={handleSignOut} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm text-destructive-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>
      </div>
    </AppShell>
  );
}
