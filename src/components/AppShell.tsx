import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, LayoutDashboard, Upload, MessageCircle, Heart, Bell, Settings, Inbox, Scissors, Star, LogOut } from "lucide-react";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const userNav: Item[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard", label: "Upload saree", icon: Upload },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/dashboard", label: "Saved tailors", icon: Heart },
  { to: "/dashboard", label: "Notifications", icon: Bell },
  { to: "/dashboard", label: "Settings", icon: Settings },
];

const tailorNav: Item[] = [
  { to: "/tailor", label: "Request feed", icon: Inbox },
  { to: "/tailor", label: "Active chats", icon: MessageCircle },
  { to: "/tailor", label: "My profile", icon: Scissors },
  { to: "/tailor", label: "Reviews", icon: Star },
  { to: "/tailor", label: "Notifications", icon: Bell },
  { to: "/tailor", label: "Settings", icon: Settings },
];

export function AppShell({ role, children, title }: { role: "user" | "tailor"; children: React.ReactNode; title: string }) {
  const items = role === "user" ? userNav : tailorNav;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 lg:px-8">
        {/* Sidebar - desktop */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 lg:block">
          <div className="flex h-full flex-col rounded-3xl glass p-4 shadow-soft">
            <Link to="/" className="mb-6 flex items-center gap-2 px-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
              <span className="font-display text-lg">MatchO</span>
            </Link>
            <span className="px-3 text-[10px] uppercase tracking-widest text-muted-foreground">{role === "user" ? "User" : "Tailor"}</span>
            <nav className="mt-2 flex-1 space-y-0.5">
              {items.map((it, i) => {
                const active = i === 0 && pathname.startsWith(it.to);
                return (
                  <Link key={it.label + i} to={it.to}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition
                      ${active ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-foreground/80 hover:bg-accent"}`}>
                    <it.icon className="h-4 w-4" /> {it.label}
                  </Link>
                );
              })}
            </nav>
            <Link to="/" className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent">
              <LogOut className="h-4 w-4" /> Sign out
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="glass mb-6 flex items-center justify-between rounded-2xl px-5 py-3 shadow-soft">
            <div>
              <p className="text-xs text-muted-foreground">{role === "user" ? "User dashboard" : "Tailor studio"}</p>
              <h1 className="font-display text-2xl">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-soft"><Bell className="h-4 w-4" /></button>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary font-display text-primary-foreground">
                {role === "user" ? "A" : "R"}
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="glass flex items-center justify-around rounded-full px-2 py-2 shadow-float">
          {items.slice(0, 5).map((it, i) => (
            <Link key={i} to={it.to} className="grid place-items-center rounded-full p-2.5 text-foreground/70 hover:text-primary">
              <it.icon className="h-5 w-5" />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
