import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Bell, Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/user_/notifications")({
  head: () => ({ meta: [{ title: "Notifications — MatchO" }] }),
  component: UserNotifications,
});

type Notif = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
};

function UserNotifications() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await refreshSession();
      if (!alive) return;
      if (!s) { navigate({ to: "/login", replace: true }); return; }
      if (s.role !== "user") { navigate({ to: "/dashboard/tailor", replace: true }); return; }
      setReady(true);
    })();
    return () => { alive = false; };
  }, [navigate]);

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setItems((data as Notif[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!ready) return;
    void load();
    const ch = supabase
      .channel("user_notifications_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [ready]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems(it => it.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setItems(it => it.map(n => ({ ...n, is_read: true })));
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  const unread = items.filter(n => !n.is_read).length;

  return (
    <AppShell role="user" title="Notifications">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
        {unread > 0 && (
          <button onClick={markAll} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs text-background">
            <Check className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>
      {loading ? (
        <div className="grid place-items-center rounded-3xl glass p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center rounded-3xl glass p-12 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No notifications yet</p>
          <p className="mt-1 text-sm text-muted-foreground">You'll see real-time alerts here when tailors send suggestions.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(n => (
            <li key={n.id} className={`flex items-center gap-3 rounded-2xl p-4 shadow-soft transition ${n.is_read ? "bg-card border border-border" : "glass"}`}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{n.title}</p>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <p className="truncate text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {n.link ? (
                <Link
                  to={n.link}
                  onClick={() => void markRead(n.id)}
                  className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs text-background"
                >
                  View suggestion
                </Link>
              ) : (
                <button onClick={() => void markRead(n.id)} className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
