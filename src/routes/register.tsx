import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Scissors, ArrowRight } from "lucide-react";
import { AuthShell, TextField } from "@/components/AuthShell";
import { setSession, type Role } from "@/lib/session";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Join MatchO" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  return (
    <AuthShell
      title={role ? `Create your ${role} account` : "Join MatchO"}
      subtitle={role ? "A few details and you're in." : "Choose how you'd like to start."}
      footer={<>Already a member? <Link to="/login" className="font-medium text-primary">Sign in</Link></>}
    >
      {!role ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <RoleCard
            icon={<Heart className="h-5 w-5" />}
            title="I'm a User"
            text="Upload sarees and get redesign ideas from local tailors."
            onClick={() => setRole("user")}
          />
          <RoleCard
            icon={<Scissors className="h-5 w-5" />}
            title="I'm a Tailor"
            text="Discover nearby saree requests and grow your studio."
            onClick={() => setRole("tailor")}
            highlighted
          />
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSession({ name: name.trim() || "Guest", email, role });
            navigate({ to: role === "tailor" ? "/dashboard/tailor" : "/dashboard/user" });
          }}
        >
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Sharma" required />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          <TextField label="City" placeholder="Bengaluru" required />
          <TextField label="Password" type="password" placeholder="••••••••" required />
          {role === "tailor" && (
            <TextField label="Studio / Specialization" placeholder="Indo-western, lehengas" />
          )}
          <button className="w-full rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-soft">
            Create account
          </button>
          <button type="button" onClick={() => setRole(null)} className="w-full text-center text-xs text-muted-foreground">
            ← Change role
          </button>
        </form>
      )}
    </AuthShell>
  );
}

function RoleCard({ icon, title, text, onClick, highlighted }: {
  icon: React.ReactNode; title: string; text: string; onClick: () => void; highlighted?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant
        ${highlighted ? "border-primary/40 bg-gradient-primary text-primary-foreground" : "border-border bg-card"}`}>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${highlighted ? "bg-white/20" : "bg-gradient-primary text-primary-foreground"}`}>
        {icon}
      </div>
      <p className="mt-4 font-display text-xl">{title}</p>
      <p className={`mt-1 text-sm ${highlighted ? "text-primary-foreground/85" : "text-muted-foreground"}`}>{text}</p>
      <ArrowRight className="absolute right-4 top-4 h-4 w-4 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}
