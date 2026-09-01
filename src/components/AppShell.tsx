import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, LayoutDashboard, Upload, MessageCircle, Heart, Bell, Settings, Inbox, Scissors, Star, LogOut, BarChart3, CheckCircle2, UserCircle, Image as ImageIcon, ClipboardList, User as UserIcon, Store } from "lucide-react";
import { getSession, refreshSession, signOut, type Role } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { suspensionActive } from "@/lib/moderation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Item = { to: string; hash?: string; label: string; icon: React.ComponentType<{ className?: string }> };

const userNav: Item[] = [
  { to: "/dashboard/user", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/user", hash: "upload", label: "Upload saree", icon: Upload },
  { to: "/dashboard/user", hash: "requests", label: "Active requests", icon: Sparkles },
  { to: "/dashboard/user/assistant", label: "AI Assistant", icon: Bot },

  { to: "/dashboard/user/messages", label: "Messages", icon: MessageCircle },
  { to: "/dashboard/user/saved", label: "Saved tailors", icon: Heart },
  { to: "/dashboard/user/completed", label: "Completed", icon: CheckCircle2 },
  { to: "/dashboard/user/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/user/profile", label: "Profile settings", icon: Settings },
];

const tailorNav: Item[] = [
  { to: "/dashboard/tailor", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/tailor", hash: "feed", label: "Request feed", icon: Inbox },
  { to: "/dashboard/tailor/assigned", label: "Assigned", icon: ClipboardList },
  { to: "/dashboard/tailor/messages", label: "Conversations", icon: MessageCircle },
  { to: "/dashboard/tailor", hash: "analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/tailor/completed", label: "Completed", icon: CheckCircle2 },
  { to: "/dashboard/tailor/reviews", label: "Reviews", icon: Star },
  { to: "/dashboard/tailor/portfolio", label: "Portfolio", icon: ImageIcon },
  { to: "/dashboard/tailor/profile-edit", label: "Studio profile", icon: UserCircle },
];

export function AppShell({ role, children, title }: { role: Role; children: React.ReactNode; title: string }) {
  const items = role === "user" ? userNav : tailorNav;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [name, setName] = useState(() => getSession()?.name || "Guest");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    let notifCh: ReturnType<typeof supabase.channel> | null = null;
    let profCh: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data: sp } = await supabase
        .from("profiles").select("suspended, suspended_until").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (suspensionActive((sp || {}) as any)) {
        navigate({ to: "/suspended", replace: true });
        return;
      }

      const s = await refreshSession();
      if (active && s?.name) setName(s.name);

      const loadAvatar = async () => {
        const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
        if (active) setAvatarUrl((data as any)?.avatar_url || null);
      };
      void loadAvatar();
      profCh = supabase
        .channel("appshell_prof_" + user.id)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => void loadAvatar())
        .subscribe();

      if (role === "user") {
        const refreshUnread = async () => {
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false);
          if (active) setUnread(count || 0);
        };
        void refreshUnread();
        notifCh = supabase
          .channel("appshell_notif_" + user.id)
          .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => void refreshUnread())
          .subscribe();
      }
    })();
    return () => {
      active = false;
      if (notifCh) void supabase.removeChannel(notifCh);
      if (profCh) void supabase.removeChannel(profCh);
    };
  }, [navigate, role]);


  const initial = (name || "G").trim()[0]?.toUpperCase() || "G";
  const themeAccent = role === "tailor" ? "bg-secondary text-secondary-foreground" : "bg-gradient-primary text-primary-foreground";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className={`min-h-screen ${role === "tailor" ? "bg-background" : "bg-gradient-soft"}`}>
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 lg:px-8">
        {/* Sidebar - desktop */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 lg:block">
          <div className={`flex h-full flex-col rounded-3xl p-4 shadow-soft ${role === "tailor" ? "bg-card border border-border" : "glass"}`}>
            <Link to="/" className="mb-6 flex items-center gap-2 px-2">
              <span className={`grid h-8 w-8 place-items-center rounded-full ${themeAccent}`}><Sparkles className="h-4 w-4" /></span>
              <span className="font-display text-lg">MatchO</span>
              <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent-foreground">
                {role === "user" ? "User" : "Tailor"}
              </span>
            </Link>
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-accent/60 px-3 py-2">
              <div className={`grid h-8 w-8 place-items-center overflow-hidden rounded-full font-display text-sm ${themeAccent}`}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="text-[10px] text-muted-foreground">Signed in</p>
              </div>
            </div>
            <nav className="mt-2 flex-1 space-y-0.5">
              {items.map((it, i) => {
                const active = i === 0 && (pathname === it.to);
                return (
                  <Link key={it.label + i} to={it.to} hash={it.hash}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition
                      ${active ? `${themeAccent} shadow-soft` : "text-foreground/80 hover:bg-accent"}`}>
                    <it.icon className="h-4 w-4" /> {it.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleSignOut}
              className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className={`mb-6 flex items-center justify-between rounded-2xl px-5 py-3 shadow-soft ${role === "tailor" ? "bg-card border border-border" : "glass"}`}>
            <div>
              <p className="text-xs text-muted-foreground">{role === "user" ? "User dashboard" : "Tailor studio"}</p>
              <h1 className="font-display text-2xl">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              {role === "user" ? (
                <Link to="/dashboard/user/notifications" className="relative grid h-9 w-9 place-items-center rounded-full bg-card shadow-soft" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              ) : (
                <button className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-soft"><Bell className="h-4 w-4" /></button>
              )}
              {role === "tailor" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="Open profile menu"
                      className={`grid h-9 w-9 place-items-center overflow-hidden rounded-full font-display ${themeAccent} focus:outline-none focus:ring-2 focus:ring-ring`}
                    >
                      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard/tailor/profile" })}>
                      <UserIcon className="h-4 w-4" /> My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard/tailor/studio-profile" })}>
                      <Store className="h-4 w-4" /> Studio Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard/tailor/settings" })}>
                      <Settings className="h-4 w-4" /> Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleSignOut}>
                      <LogOut className="h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  to="/dashboard/user/profile"
                  aria-label="Open profile"
                  className={`grid h-9 w-9 place-items-center overflow-hidden rounded-full font-display ${themeAccent}`}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
                </Link>
              )}
            </div>
          </header>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="glass flex items-center justify-around rounded-full px-2 py-2 shadow-float">
          {items.slice(0, 5).map((it, i) => (
            <Link key={i} to={it.to} hash={it.hash} className="grid place-items-center rounded-full p-2.5 text-foreground/70 hover:text-primary">
              <it.icon className="h-5 w-5" />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

void Scissors;
