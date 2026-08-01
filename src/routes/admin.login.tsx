import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TextField } from "@/components/AuthShell";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — MatchO" },
      { name: "description", content: "Secure administration sign in for the MatchO marketplace team." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin sign in — MatchO" },
      { property: "og:description", content: "Secure administration sign in for the MatchO marketplace team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      toast.error(error?.message || "Sign in failed");
      setLoading(false);
      return;
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .filter("role", "eq", "admin")
      .maybeSingle();
    if (!roleRow) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account does not have administrator access.");
      navigate({ to: "/" });
      return;
    }
    toast.success("Welcome back, administrator");
    navigate({ to: "/dashboard/admin" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="font-display text-xl">MatchO</span>
        </Link>
        <div className="rounded-3xl border border-border bg-card p-7 shadow-soft">
          <h1 className="font-display text-3xl">Admin Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Restricted access. Administrator credentials only.
          </p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <TextField label="Admin email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@matcho.app" required />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 font-medium text-background shadow-soft disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in to admin
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Non-admin accounts are signed out and redirected to the homepage.
          </p>
        </div>
      </div>
    </div>
  );
}
