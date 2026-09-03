import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, RefreshCw, AlertCircle, Star, MapPin, BadgeCheck, Check, X, Scissors, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { assistantTurn, confirmAction, loadAssistantHistory, clearAssistantHistory } from "@/lib/assistant.functions";
import type { PendingAction, StyleCard } from "@/lib/agents.server";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/user_/assistant")({
  head: () => ({
    meta: [
      { title: "MatchO AI Style Assistant — Saree Styling & Tailor Matching" },
      { name: "description", content: "Chat with the MatchO AI assistant for personalised saree transformation ideas and real tailor matches." },
      { property: "og:title", content: "MatchO AI Style Assistant" },
      { property: "og:description", content: "Personalised saree styling ideas and real tailor matches, powered by MatchO AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ saree: typeof s['saree'] === "string" ? (s['saree'] as string) : undefined }),
  component: AssistantPage,
});

type Saree = { id: string; title: string | null; image_url: string; description: string | null; occasion: string | null; status: string | null };
type TailorCard = {
  tailor_id: string; name: string; studio: string | null; city: string | null; specialization: string | null;
  score: number; reasons: string[]; avg_rating: number | null; review_count: number; verified: boolean; avatar_url?: string | null;
};
type Bubble = { id: string; role: "user" | "assistant"; content: string; styles?: StyleCard[]; tailors?: TailorCard[] };

const QUICK = [
  "What can I make from my saree?",
  "Suggest a festive outfit idea",
  "Find me a suitable tailor",
];

// Session-scoped cache so the assistant (including generated style/tailor cards)
// survives navigating to a tailor profile and pressing Back.
const CACHE_KEY = "matcho:assistant:cache";
type CacheShape = { bubbles: Bubble[]; selected: string | null; scrollTop: number };

function readCache(): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    return Array.isArray(parsed?.bubbles) ? parsed : null;
  } catch { return null; }
}

function writeCache(next: Partial<CacheShape>) {
  if (typeof window === "undefined") return;
  try {
    const cur = readCache() ?? { bubbles: [], selected: null, scrollTop: 0 };
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...cur, ...next }));
  } catch { /* storage unavailable — cards simply won't persist */ }
}

function clearCache() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

// Re-attach cached style/tailor cards to the persisted server history by
// matching role + content in order (server rows have different ids).
function mergeHistory(history: Bubble[], cached: Bubble[]): Bubble[] {
  if (!cached.length) return history;
  let i = 0;
  return history.map((h) => {
    while (i < cached.length && !(cached[i]!.role === h.role && cached[i]!.content === h.content)) i++;
    const match = cached[i];
    if (match) { i++; return { ...h, styles: match.styles, tailors: match.tailors }; }
    return h;
  });
}


function AssistantPage() {
  const { saree } = Route.useSearch();
  const turn = useServerFn(assistantTurn);
  const confirm = useServerFn(confirmAction);
  const loadHistory = useServerFn(loadAssistantHistory);
  const clearHistory = useServerFn(clearAssistantHistory);

  const [sarees, setSarees] = useState<Saree[]>([]);
  const [selected, setSelected] = useState<string | null>(() => saree ?? readCache()?.selected ?? null);
  const [bubbles, setBubbles] = useState<Bubble[]>(() => readCache()?.bubbles ?? []);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sareeMissing, setSareeMissing] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [savingStyle, setSavingStyle] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data, error: loadErr } = await supabase
        .from("saree_uploads")
        .select("id, title, image_url, description, occasion, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (loadErr) {
        console.error("[assistant] failed to load sarees", loadErr);
        toast.error("We couldn't load your sarees right now.");
      }
      const list = (data || []) as Saree[];
      setSarees(list);
      // Only ever select a saree that belongs to this member (RLS already scopes
      // the query, so an unknown/deleted id simply isn't in the list).
      if (saree && !list.some((s) => s.id === saree)) {
        setSareeMissing(true);
        setSelected(list[0]?.id || null);
      } else {
        setSelected((cur) => cur || list[0]?.id || null);
      }
      try {
        const res = await loadHistory({});
        if (active) {
          setBubbles(res.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
        }
      } catch (e) {
        console.error("[assistant] history unavailable", e);
      }
      if (active) setBooting(false);
    })();
    return () => { active = false; };
  }, [loadHistory, saree]);


  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [bubbles, busy, pending]);
  useEffect(() => { if (!busy) taRef.current?.focus(); }, [busy]);

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setLastMessage(message);
    setPending(null);
    setInput("");
    setBubbles((b) => [...b, { id: `u-${Date.now()}`, role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await turn({ data: { message, sareeUploadId: selected } });
      setBubbles((b) => [...b, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        styles: res.styles,
        tailors: res.tailors as unknown as TailorCard[],
      }]);
      setPending(res.pending);
    } catch (e) {
      setError((e as Error)?.message || "The assistant could not respond. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, selected, turn]);

  const runPending = async () => {
    if (!pending) return;
    setConfirming(true);
    try {
      const res = await confirm({ data: { action: pending } });
      toast.success(res.message);
      setBubbles((b) => [...b, { id: `c-${Date.now()}`, role: "assistant", content: res.message }]);
      if (pending.kind === "select_style") setSelectedStyle(pending.style.style_name);
      setPending(null);
    } catch (e) {
      toast.error((e as Error)?.message || "Could not complete that action.");
    } finally {
      setConfirming(false);
    }
  };

  // Load any design already selected for this saree so it stays selected after refresh.
  useEffect(() => {
    let live = true;
    if (!selected) { setSelectedStyle(null); return; }
    (async () => {
      const { data, error: selErr } = await supabase
        .from("ai_style_ideas")
        .select("selected_idea, created_at")
        .eq("saree_upload_id", selected)
        .not("selected_idea", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!live) return;
      if (selErr) { console.error("[assistant] could not load selected design", selErr); return; }
      const idea = (data?.selected_idea ?? null) as { style_name?: string } | null;
      setSelectedStyle(idea?.style_name ?? null);
    })();
    return () => { live = false; };
  }, [selected]);

  const pickStyle = useCallback(async (style: StyleCard) => {
    if (!selected) { toast.error("Pick a saree first so we can save this design to it."); return; }
    if (savingStyle) return;
    setSavingStyle(style.style_name);
    try {
      const res = await confirm({
        data: {
          action: {
            kind: "select_style" as const,
            saree_upload_id: selected,
            style,
            label: `Select "${style.style_name}" for this saree`,
          },
        },
      });
      setSelectedStyle(style.style_name);
      toast.success(res.message);
    } catch (e) {
      console.error("[assistant] failed to save selected design", e);
      toast.error("We couldn't save that design. Please try again.");
    } finally {
      setSavingStyle(null);
    }
  }, [confirm, savingStyle, selected]);

  const active = sarees.find((s) => s.id === selected) || null;


  return (
    <AppShell role="user" title="MatchO AI Style Assistant">
      <p className="-mt-3 mb-5 text-sm text-muted-foreground">
        Your personal saree styling and tailor-matching assistant.
      </p>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Chat */}
        <div className="glass flex min-h-[60vh] flex-col rounded-3xl p-4 shadow-soft sm:p-6">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {booting ? (
              <div className="grid h-40 place-items-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : bubbles.length === 0 ? (
              <div className="grid place-items-center rounded-3xl bg-accent/40 p-8 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
                  <Sparkles className="h-6 w-6" />
                </span>
                <h2 className="mt-3 font-display text-xl">Let's reimagine your saree</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {active
                    ? `I can see "${active.title || "your saree"}". Ask me what it could become, or to find a tailor near you.`
                    : "Upload a saree first, or just describe the one you have and I'll suggest ideas."}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => void send(q)} disabled={busy}
                      className="rounded-full bg-card px-3 py-1.5 text-xs shadow-soft hover:bg-accent disabled:opacity-60">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              bubbles.map((b) => <BubbleView key={b.id} b={b} />)
            )}

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> MatchO AI is thinking…
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <div className="flex-1">
                  <p>{error}</p>
                  {lastMessage && (
                    <button onClick={() => void send(lastMessage)} disabled={busy}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs shadow-soft">
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {pending && (
              <div className="rounded-2xl border border-primary/30 bg-card p-4 shadow-soft">
                <p className="text-sm font-medium">{pending.label}</p>
                {pending.kind === "send_message" && (
                  <p className="mt-2 rounded-xl bg-accent/50 p-3 text-sm text-muted-foreground">{pending.content}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Nothing happens until you confirm.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => void runPending()} disabled={confirming}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft disabled:opacity-60">
                    {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm
                  </button>
                  <button onClick={() => setPending(null)} disabled={confirming}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm shadow-soft">
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="mt-4 flex items-end gap-2 rounded-2xl bg-card p-2 shadow-soft"
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              rows={1}
              disabled={busy}
              placeholder="Ask about styles, tailors or your request…"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none disabled:opacity-60"
            />
            <button type="submit" disabled={busy || !input.trim()}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {/* Saree context */}
        <aside className="space-y-4">
          <div className="glass rounded-3xl p-5 shadow-soft">
            <h2 className="font-display text-lg">Your saree</h2>
            {sareeMissing && (
              <p className="mt-3 rounded-2xl border border-primary/30 bg-accent/40 p-3 text-xs text-muted-foreground">
                That saree isn't available — showing your latest upload instead
              </p>
            )}
            {sarees.length === 0 ? (
              <div className="mt-3 rounded-2xl bg-accent/40 p-4 text-center text-sm text-muted-foreground">
                No sarees uploaded yet.
                <Link to="/dashboard/user" hash="upload" className="mt-3 block rounded-full bg-gradient-primary py-2 text-sm font-medium text-primary-foreground">
                  Upload a saree
                </Link>
              </div>
            ) : (
              <>
                {active && (
                  <div className="mt-3 overflow-hidden rounded-2xl bg-card shadow-soft">
                    <img src={active.image_url} alt={active.title || "Uploaded saree"} className="h-40 w-full object-cover" />
                    <div className="p-3">
                      <p className="font-medium">{active.title || "Untitled saree"}</p>
                      {active.description && <p className="line-clamp-2 text-xs text-muted-foreground">{active.description}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{active.occasion || "Custom"} · {active.status || "open"}</p>
                    </div>
                  </div>
                )}
                {sarees.length > 1 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-muted-foreground">Switch saree</p>
                    <div className="flex flex-wrap gap-2">
                      {sarees.map((s) => (
                        <button key={s.id} onClick={() => setSelected(s.id)}
                          className={`h-12 w-12 overflow-hidden rounded-xl ring-2 transition ${s.id === selected ? "ring-primary" : "ring-transparent"}`}>
                          <img src={s.image_url} alt={s.title || ""} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="glass rounded-3xl p-5 text-sm shadow-soft">
            <h2 className="font-display text-lg">How this works</h2>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              <li>· Style ideas are generated from your real uploads.</li>
              <li>· Tailor matches use live MatchO profiles and reviews.</li>
              <li>· Any message, save or selection needs your confirmation.</li>
            </ul>
            {bubbles.length > 0 && (
              <button
                onClick={async () => { await clearHistory({}); setBubbles([]); setPending(null); }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs shadow-soft">
                <Trash2 className="h-3 w-3" /> Clear conversation
              </button>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function BubbleView({ b }: { b: Bubble }) {
  if (b.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-soft">{b.content}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{b.content}</p>
      </div>
      {!!b.styles?.length && (
        <div className="grid gap-3 pl-11 sm:grid-cols-2">
          {b.styles.map((s, i) => <StyleCardView key={i} s={s} />)}
        </div>
      )}
      {!!b.tailors?.length && (
        <div className="space-y-3 pl-11">
          {b.tailors.map((t) => <TailorCardView key={t.tailor_id} t={t} />)}
        </div>
      )}
    </div>
  );
}

function StyleCardView({ s }: { s: StyleCard }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{s.style_name}</p>
        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">{s.outfit_type}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{s.why_it_fits}</p>
      <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
        {s.silhouette && <div><span className="font-medium text-foreground">Silhouette:</span> {s.silhouette}</div>}
        {s.blouse_suggestion && <div><span className="font-medium text-foreground">Blouse:</span> {s.blouse_suggestion}</div>}
        {s.occasion && <div><span className="font-medium text-foreground">Occasion:</span> {s.occasion}</div>}
        {s.tailoring_considerations && <div><span className="font-medium text-foreground">Tailoring:</span> {s.tailoring_considerations}</div>}
        {s.estimated_budget && <div><span className="font-medium text-foreground">Budget:</span> {s.estimated_budget}</div>}
      </dl>
    </div>
  );
}

function TailorCardView({ t }: { t: TailorCard }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        {t.avatar_url ? (
          <img src={t.avatar_url} alt={t.name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary font-display text-primary-foreground">
            {(t.name || "T")[0]}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium">{t.studio || t.name}</p>
            {t.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {t.specialization || "Tailor"}{t.city ? ` · ${t.city}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {t.avg_rating !== null && (
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {t.avg_rating} ({t.review_count})</span>
            )}
            {t.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.city}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-2xl text-primary">{t.score}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">match</p>
        </div>
      </div>
      {!!t.reasons?.length && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {t.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="flex gap-2"><Scissors className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {r}</li>
          ))}
        </ul>
      )}
      <Link to="/dashboard/user/tailors/$tailorId" params={{ tailorId: t.tailor_id }}
        className="mt-3 inline-block rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground">
        View profile →
      </Link>
    </div>
  );
}
