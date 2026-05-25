import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell, TextField } from "@/components/AuthShell";
import { Heart, Scissors } from "lucide-react";
import { setSession, nameFromEmail, type Role } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — MatchO" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your saree's next chapter."
      footer={<>New to MatchO? <Link to="/register" className="font-medium text-primary">Create an account</Link></>}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const finalName = name.trim() || nameFromEmail(email);
          setSession({ name: finalName, email, role });
          navigate({ to: role === "tailor" ? "/dashboard/tailor" : "/dashboard/user" });
        }}
      >
        <div>
          <span className="text-sm font-medium">Sign in as</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <RoleToggle active={role === "user"} onClick={() => setRole("user")} icon={<Heart className="h-4 w-4" />} label="User" />
            <RoleToggle active={role === "tailor"} onClick={() => setRole("tailor")} icon={<Scissors className="h-4 w-4" />} label="Tailor" />
          </div>
        </div>
        <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Sharma" required />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
        <TextField label="Password" type="password" placeholder="••••••••" required />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="rounded border-border" /> Remember me
          </label>
          <a className="text-primary">Forgot password?</a>
        </div>
        <button className="w-full rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-soft transition-transform hover:scale-[1.01]">
          Sign in as {role === "tailor" ? "Tailor" : "User"}
        </button>
      </form>
    </AuthShell>
  );
}

function RoleToggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm shadow-soft transition ${
        active ? "border-primary/40 bg-gradient-primary text-primary-foreground" : "border-border bg-card text-foreground/80"
      }`}
    >
      {icon} {label}
    </button>
  );
}
