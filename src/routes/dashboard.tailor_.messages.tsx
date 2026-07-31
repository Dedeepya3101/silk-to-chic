import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Inbox, Send, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";
import { hasSensitiveContent } from "@/lib/safety";
import {
  SafetyReminder, SafetyWarningBanner, ConversationSafetyMenu, BlockedComposerNotice,
} from "@/components/ChatSafety";


export const Route = createFileRoute("/dashboard/tailor_/messages")({
  head: () => ({ meta: [{ title: "Conversations — MatchO Tailor" }] }),
  component: TailorMessages,
});

type Thread = {
  id: string;
  user_id: string;
  silhouette: string | null;
  created_at: string;
  user_name?: string;
  avatar_url?: string | null;
  image_url?: string;
  saree_upload_id: string;
};

type Reply = { id: string; suggestion_id: string; user_id: string; message: string; created_at: string };

function fmtTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 3600000);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

function TailorMessages() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<Record<string, number>>({});
  const [blockedByMe, setBlockedByMe] = useState<string[]>([]);
  const [blockedMe, setBlockedMe] = useState<string[]>([]);


  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await refreshSession();
      if (!alive) return;
      if (!s) { navigate({ to: "/login", replace: true }); return; }
      if (s.role !== "tailor") { navigate({ to: "/dashboard/user/messages", replace: true }); return; }
      setMe(s.id);
      try { setLastRead(JSON.parse(localStorage.getItem(`matcho.msg.read.${s.id}`) || "{}")); } catch {}
      setReady(true);
    })();
    return () => { alive = false; };
  }, [navigate]);

  const load = async (uid: string) => {
    const { data: sugs } = await supabase
      .from("suggestions")
      .select("id, user_id, silhouette, created_at, saree_upload_id")
      .eq("tailor_id", uid)
      .order("created_at", { ascending: false });
    const list = (sugs || []) as Thread[];
    const uids = Array.from(new Set(list.map(s => s.user_id)));
    const upids = Array.from(new Set(list.map(s => s.saree_upload_id)));
    const [{ data: profs }, { data: ups }, { data: reps }, { data: blks }] = await Promise.all([
      uids.length ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", uids) : Promise.resolve({ data: [] as any[] }),
      upids.length ? supabase.from("saree_uploads").select("id, image_url").in("id", upids) : Promise.resolve({ data: [] as any[] }),
      list.length ? supabase.from("suggestion_replies").select("*").in("suggestion_id", list.map(s => s.id)).order("created_at", { ascending: true }) : Promise.resolve({ data: [] as any[] }),
      supabase.from("blocks").select("blocker_id, blocked_id"),
    ]);
    setBlockedByMe((blks || []).filter((b: any) => b.blocker_id === uid).map((b: any) => b.blocked_id));
    setBlockedMe((blks || []).filter((b: any) => b.blocked_id === uid).map((b: any) => b.blocker_id));

    const pm = new Map((profs || []).map((p: any) => [p.id, p]));
    const um = new Map((ups || []).map((u: any) => [u.id, u.image_url]));
    const grouped: Record<string, Reply[]> = {};
    (reps || []).forEach((r: any) => { (grouped[r.suggestion_id] ||= []).push(r); });
    const merged = list.map(t => {
      const p = pm.get(t.user_id);
      return { ...t, user_name: p?.display_name || "MatchO user", avatar_url: p?.avatar_url, image_url: um.get(t.saree_upload_id) };
    });
    merged.sort((a, b) => {
      const la = grouped[a.id]?.slice(-1)[0]?.created_at || a.created_at;
      const lb = grouped[b.id]?.slice(-1)[0]?.created_at || b.created_at;
      return new Date(lb).getTime() - new Date(la).getTime();
    });
    setThreads(merged);
    setReplies(grouped);
    if (!activeId && merged.length) setActiveId(merged[0].id);
    setLoading(false);
  };

  useEffect(() => {
    if (!ready || !me) return;
    void load(me);
    const ch = supabase
      .channel("tailor_convos_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestion_replies" }, () => void load(me))
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, () => void load(me))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [ready, me]);

  useEffect(() => {
    if (!activeId || !me) return;
    const last = replies[activeId]?.slice(-1)[0];
    const ts = last ? new Date(last.created_at).getTime() : Date.now();
    setLastRead(prev => {
      const next = { ...prev, [activeId]: ts };
      try { localStorage.setItem(`matcho.msg.read.${me}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [activeId, replies, me]);


  const sendReply = async () => {
    if (!activeId || !me) return;
    const other = threads.find(t => t.id === activeId)?.user_id;
    if (other && (blockedByMe.includes(other) || blockedMe.includes(other))) return;
    const message = draft.trim();
    if (!message) return;
    setSending(true);
    const { error } = await supabase.from("suggestion_replies").insert({
      suggestion_id: activeId, user_id: me, message,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setDraft("");
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  const active = threads.find(t => t.id === activeId);
  const activeReplies = activeId ? (replies[activeId] || []) : [];
  const iBlocked = !!active && blockedByMe.includes(active.user_id);
  const isBlocked = !!active && (iBlocked || blockedMe.includes(active.user_id));
  const showWarning = hasSensitiveContent(draft);


  return (
    <AppShell role="tailor" title="Conversations">
      {loading ? (
        <div className="grid place-items-center rounded-3xl border border-border bg-card p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Send a suggestion to a saree request to start a conversation.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-border bg-card p-3 shadow-soft">
            <p className="px-2 py-2 text-xs uppercase tracking-widest text-muted-foreground">Threads</p>
            <ul className="space-y-1">
              {threads.map(t => {
                const last = (replies[t.id] || []).slice(-1)[0];
                const lastTs = last ? new Date(last.created_at).getTime() : new Date(t.created_at).getTime();
                const readTs = lastRead[t.id] || 0;
                const unread = (replies[t.id] || []).filter(r => r.user_id !== me && new Date(r.created_at).getTime() > readTs).length;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setActiveId(t.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${activeId === t.id ? "bg-accent" : "hover:bg-accent/60"}`}
                    >
                      {t.avatar_url ? (
                        <img src={t.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background text-sm">{t.user_name?.[0]}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.user_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{last?.message || t.silhouette || "Suggestion sent"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground">{fmtTime(new Date(lastTs).toISOString())}</span>
                        {unread > 0 && activeId !== t.id && (
                          <span className="inline-block min-w-5 rounded-full bg-primary px-1.5 text-center text-[10px] font-medium text-primary-foreground">{unread}</span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

          </aside>
          <section className="flex min-h-[60vh] flex-col rounded-3xl border border-border bg-card shadow-soft">
            {active ? (
              <>
                <header className="flex items-center gap-3 border-b border-border p-4">
                  {active.avatar_url ? <img src={active.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background text-sm">{active.user_name?.[0]}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{active.user_name}</p>
                    <p className="text-xs text-muted-foreground">{active.silhouette || "Suggestion"}</p>
                  </div>
                  {me && (
                    <ConversationSafetyMenu
                      meId={me}
                      otherUserId={active.user_id}
                      suggestionId={active.id}
                      blockedByMe={iBlocked}
                      onBlockChange={(b) => setBlockedByMe(prev => b ? [...prev, active.user_id] : prev.filter(id => id !== active.user_id))}
                    />
                  )}
                </header>
                <SafetyReminder />
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {activeReplies.length === 0 ? (
                    <div className="grid h-full place-items-center text-center">
                      <div>
                        <MessageCircle className="mx-auto h-6 w-6 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">No replies yet. Wait for the user's response.</p>
                      </div>
                    </div>
                  ) : activeReplies.map(r => (
                    <div key={r.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${r.user_id === me ? "ml-auto bg-foreground text-background" : "bg-accent"}`}>
                      {r.message}
                    </div>
                  ))}
                </div>
                {showWarning && !isBlocked && <SafetyWarningBanner />}
                {isBlocked ? (
                  <BlockedComposerNotice />
                ) : (
                <div className="flex gap-2 border-t border-border p-4">
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") void sendReply(); }}
                    placeholder="Write a reply…"
                    className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => void sendReply()}
                    disabled={sending}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
                )}

              </>
            ) : null}
          </section>
        </div>
      )}
    </AppShell>
  );
}
