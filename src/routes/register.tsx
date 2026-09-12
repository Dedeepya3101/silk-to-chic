import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Scissors, ArrowRight, Loader2 } from "lucide-react";
import { AuthShell, TextField } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession, type Role } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Join MatchO" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    setDuplicate(false);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name.trim(), role, city, specialization },
      },
    });
    if (error) {
      // Supabase may surface an explicit duplicate error when obfuscation is off.
      if (/already regist|already been regist|user already exists/i.test(error.message)) {
        setDuplicate(true);
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }
    // Obfuscated duplicate signup: Supabase returns a user with no identities
    // and never creates a second account or sends a new verification email.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setDuplicate(true);
      setLoading(false);
      return;
    }
    if (!data.session) {
      // Email confirmation required — the user is NOT signed in yet.
      setCheckEmail(true);
      setLoading(false);
      return;
    }
    await refreshSession();
    toast.success("Welcome to MatchO!");
    navigate({ to: role === "tailor" ? "/dashboard/tailor" : "/dashboard/user" });
  };

  if (checkEmail) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="We sent a verification link to confirm your account."
        footer={<>Already verified? <Link to="/login" className="font-medium text-primary">Sign in</Link></>}
      >
        <p className="text-sm text-muted-foreground">
          Open the email we just sent to <span className="font-medium text-foreground">{email}</span> and click
          “Verify Email”. You only need to do this once — after that you can sign in with your email and password.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={role ? `Create your ${role} account` : "Join MatchO"}
      subtitle={role ? "A few details and you're in." : "Choose how you'd like to start."}
      footer={<>Already a member? <Link to="/login" className="font-medium text-primary">Sign in</Link></>}
    >
      {!role ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <RoleCard icon={<Heart className="h-5 w-5" />} title="I'm a User"
            text="Upload sarees and get redesign ideas from local tailors." onClick={() => setRole("user")} />
          <RoleCard icon={<Scissors className="h-5 w-5" />} title="I'm a Tailor"
            text="Discover nearby saree requests and grow your studio." onClick={() => setRole("tailor")} highlighted />
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Sharma" required />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
          {role === "tailor" && (
            <TextField label="Studio / Specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Indo-western, lehengas" />
          )}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-soft disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
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
