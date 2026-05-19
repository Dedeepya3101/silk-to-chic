import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell, TextField } from "@/components/AuthShell";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — MatchO" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your saree's next chapter."
      footer={<>New to MatchO? <Link to="/register" className="font-medium text-primary">Create an account</Link></>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/dashboard" }); }}>
        <TextField label="Email" type="email" placeholder="you@email.com" required />
        <TextField label="Password" type="password" placeholder="••••••••" required />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="rounded border-border" /> Remember me
          </label>
          <a className="text-primary">Forgot password?</a>
        </div>
        <button className="w-full rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-soft transition-transform hover:scale-[1.01]">
          Sign in
        </button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or continue with <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="rounded-full border border-border bg-card py-2.5 text-sm shadow-soft">Google</button>
          <button type="button" className="rounded-full border border-border bg-card py-2.5 text-sm shadow-soft">Apple</button>
        </div>
      </form>
    </AuthShell>
  );
}
