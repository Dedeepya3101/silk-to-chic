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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
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
