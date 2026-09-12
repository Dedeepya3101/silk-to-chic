import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell, TextField } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — MatchO" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);

  const resend = async () => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) toast.error(error.message);
    else toast.success("Verification email sent again.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUnverified(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Only a genuinely unconfirmed email should show the verification notice;
      // wrong passwords keep the normal credential error.
      if ((error as { code?: string }).code === "email_not_confirmed" || /email not confirmed/i.test(error.message)) {
        setUnverified(true);
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }
    const session = await refreshSession();
    toast.success(`Welcome back, ${session?.name || ""}`);
    navigate({ to: session?.role === "tailor" ? "/dashboard/tailor" : "/dashboard/user" });
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your saree's next chapter."
      footer={<>New to MatchO? <Link to="/register" className="font-medium text-primary">Create an account</Link></>}
    >
      <form className="space-y-4" onSubmit={submit}>
        {unverified && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-medium">Please verify your email before logging in.</p>
            <p className="mt-1 text-muted-foreground">Open the verification link we emailed you — you only need to do this once.</p>
            <button type="button" onClick={resend} className="mt-3 inline-flex rounded-full border border-border bg-card px-4 py-2 text-xs font-medium shadow-soft">
              Resend verification email
            </button>
          </div>
        )}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="rounded border-border" defaultChecked /> Stay signed in
          </label>
          <a className="text-primary">Forgot password?</a>
        </div>
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-soft disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
        <p className="text-center text-xs text-muted-foreground">
          You'll be redirected to your dashboard based on your role.
        </p>
      </form>
    </AuthShell>
  );
}
