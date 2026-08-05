import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ShieldCheck, LayoutDashboard, Flag, Ban, BadgeCheck, Users, Scissors,
  BarChart3, Bell, Settings, LogOut, Gavel,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearSession } from "@/lib/session";
import { useAdminGuard } from "@/lib/admin";

const nav = [
  { to: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/admin/reports", label: "Reports", icon: Flag },
  { to: "/dashboard/admin/blocks", label: "Blocks", icon: Ban },
  { to: "/dashboard/admin/verification", label: "Verification", icon: BadgeCheck },
  { to: "/dashboard/admin/appeals", label: "Appeals", icon: Gavel },
  { to: "/dashboard/admin/users", label: "Users", icon: Users },
  { to: "/dashboard/admin/tailors", label: "Tailors", icon: Scissors },
  { to: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/admin/notifications", label: "Alerts", icon: Bell },
  { to: "/dashboard/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  const { admin, checking } = useAdminGuard();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    clearSession();
    navigate({ to: "/admin/login", replace: true });
  };

  if (checking || !admin) {
    return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Verifying admin access…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 py-6 lg:px-8">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 lg:block">
          <div className="flex h-full flex-col rounded-3xl border border-border bg-card p-4 shadow-soft">
            <Link to="/" className="mb-6 flex items-center gap-2 px-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="font-display text-lg">MatchO</span>
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent-foreground">Admin</span>
            </Link>
            <div className="mb-3 rounded-2xl bg-accent/60 px-3 py-2">
              <p className="truncate text-sm font-medium">{admin.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{admin.email}</p>
            </div>
            <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto">
              {nav.map((it) => {
                const active = pathname === it.to;
                return (
                  <Link key={it.to} to={it.to}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                      active ? "bg-foreground text-background shadow-soft" : "text-foreground/80 hover:bg-accent"
                    }`}>
                    <it.icon className="h-4 w-4" /> {it.label}
                  </Link>
                );
              })}
            </nav>
            <button onClick={signOut} className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-soft">
            <div>
              <p className="text-xs text-muted-foreground">Administration</p>
              <h1 className="font-display text-2xl">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/60 px-3 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin session
            </span>
          </header>
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="flex items-center justify-around rounded-full border border-border bg-card px-2 py-2 shadow-float">
          {nav.slice(0, 5).map((it) => (
            <Link key={it.to} to={it.to} aria-label={it.label} className="grid place-items-center rounded-full p-2.5 text-foreground/70 hover:text-primary">
              <it.icon className="h-5 w-5" />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function AdminCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-border bg-card p-5 shadow-soft ${className}`}>{children}</div>;
}

export function AdminTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-soft">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            {head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">{label}</td></tr>
  );
}
