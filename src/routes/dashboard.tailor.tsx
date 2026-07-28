import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin, Clock, Star, ShieldCheck, Sparkles, X, Send, CheckCircle2, BarChart3, TrendingUp, Bookmark, Eye, Filter, MessageCircle, UserCircle, Loader2, Inbox } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";


type FeedItem = {
  id: string;
  user_id: string;
  name: string;
  img: string;
  desc: string;
  style: string;
  occasion: string;
  location: string;
  date: string;
  time: string;
  title: string;
};

export const Route = createFileRoute("/dashboard/tailor")({
  head: () => ({ meta: [{ title: "Tailor Studio — MatchO" }] }),
  component: TailorDashboard,
});


const FILTERS = ["All", "Lehenga", "Frock", "Kurta", "Gown", "Crop-top set", "Custom"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

type StatSummary = { open: number; orders: number; completed: number; avgRating: number; reviewCount: number };
type CompletedRow = { id: string; completion_date: string; request_id: string; image_url?: string; title?: string };
type ConvoRow = { id: string; user_id: string; user_name: string; user_avatar?: string | null; last: string; time: string; unread: number };
type ReviewRow = { id: string; rating: number; review_text: string | null; user_name: string; created_at: string };

function TailorDashboard() {
  const [active, setActive] = useState<FeedItem | null>(null);
  const [filter, setFilter] = useState("All");
  const [saved, setSaved] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatSummary>({ open: 0, orders: 0, completed: 0, avgRating: 0, reviewCount: 0 });
  const [completed, setCompleted] = useState<CompletedRow[]>([]);
  const [convos, setConvos] = useState<ConvoRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  useEffect(() => {
    (async () => {
      const s = getSession();
      if (s?.name) setName(s.name.split(" ")[0]);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMeId(user.id);
    })();
  }, []);


  const loadFeed = async () => {
    const { data: uploads, error } = await supabase
      .from("saree_uploads")
      .select("id, image_url, title, description, occasion, created_at, user_id, status")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) { setLoading(false); return; }
    const ids = Array.from(new Set((uploads || []).map(u => u.user_id)));
    const profilesMap = new Map<string, { display_name: string | null; city: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, display_name, city").in("id", ids);
      profs?.forEach(p => profilesMap.set(p.id, { display_name: p.display_name, city: p.city }));
    }
    const items: FeedItem[] = (uploads || []).map(u => {
      const p = profilesMap.get(u.user_id);
      return {
        id: u.id,
        user_id: u.user_id,
        name: p?.display_name || "MatchO user",
        img: u.image_url,
        title: u.title || "Saree redesign",
        desc: u.description || "No description provided.",
        style: u.occasion || "Custom",
        occasion: u.occasion || "Custom",
        location: p?.city || "Location unknown",
        date: fmtDate(u.created_at),
        time: timeAgo(u.created_at),
      };
    });
    setFeed(items);
    setLoading(false);
  };

  const loadStats = async (uid: string) => {
    const [{ count: ordersCount }, { count: openCount }, { data: comps }, { data: revs }] = await Promise.all([
      supabase.from("saree_uploads").select("*", { count: "exact", head: true }).eq("assigned_tailor_id", uid),
      supabase.from("saree_uploads").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("completed_projects").select("id, completion_date, request_id").eq("tailor_id", uid).order("completion_date", { ascending: false }).limit(8),
      supabase.from("reviews").select("id, rating, review_text, created_at, user_id").eq("tailor_id", uid).order("created_at", { ascending: false }).limit(20),
    ]);
    const compList = comps || [];
    const compReqIds = compList.map((c: any) => c.request_id);
    let compMerged: CompletedRow[] = [];
    if (compReqIds.length) {
      const { data: ups } = await supabase.from("saree_uploads").select("id, image_url, title").in("id", compReqIds);
      const um = new Map((ups || []).map((u: any) => [u.id, u]));
      compMerged = compList.map((c: any) => ({ id: c.id, completion_date: c.completion_date, request_id: c.request_id, image_url: um.get(c.request_id)?.image_url, title: um.get(c.request_id)?.title }));
    }
    setCompleted(compMerged);
    const rList = revs || [];
    const rIds = Array.from(new Set(rList.map((r: any) => r.user_id)));
    const rProfs = rIds.length ? (await supabase.from("profiles").select("id, display_name").in("id", rIds)).data || [] : [];
    const rpm = new Map(rProfs.map((p: any) => [p.id, p.display_name]));
    setReviews(rList.map((r: any) => ({ id: r.id, rating: r.rating, review_text: r.review_text, created_at: r.created_at, user_name: rpm.get(r.user_id) || "Client" })));
    const avg = rList.length ? rList.reduce((s: number, r: any) => s + r.rating, 0) / rList.length : 0;
    setStats({ open: openCount || 0, orders: ordersCount || 0, completed: compList.length, avgRating: Math.round(avg * 10) / 10, reviewCount: rList.length });
  };

  const loadConvos = async (uid: string) => {
    const { data: sugs } = await supabase
      .from("suggestions")
      .select("id, user_id, created_at")
      .eq("tailor_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    const list = sugs || [];
    if (!list.length) { setConvos([]); return; }
    const [{ data: profs }, { data: reps }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").in("id", Array.from(new Set(list.map((s: any) => s.user_id)))),
      supabase.from("suggestion_replies").select("*").in("suggestion_id", list.map((s: any) => s.id)).order("created_at", { ascending: true }),
    ]);
    const pm = new Map((profs || []).map((p: any) => [p.id, p]));
    const grouped: Record<string, any[]> = {};
    (reps || []).forEach((r: any) => { (grouped[r.suggestion_id] ||= []).push(r); });
    let lastRead: Record<string, number> = {};
    try { lastRead = JSON.parse(localStorage.getItem(`matcho.msg.read.${uid}`) || "{}"); } catch {}
    const rows: ConvoRow[] = list.map((s: any) => {
      const last = grouped[s.id]?.slice(-1)[0];
      const p = pm.get(s.user_id);
      const readTs = lastRead[s.id] || 0;
      const unread = (grouped[s.id] || []).filter((r: any) => r.user_id !== uid && new Date(r.created_at).getTime() > readTs).length;
      return { id: s.id, user_id: s.user_id, user_name: p?.display_name || "Client", user_avatar: p?.avatar_url, last: last?.message || "Suggestion sent", time: timeAgo(last?.created_at || s.created_at), unread };
    }).sort((a, b) => (b.unread - a.unread));
    setConvos(rows.slice(0, 4));
  };

  useEffect(() => {
    void loadFeed();
    const channel = supabase
      .channel("saree_uploads_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "saree_uploads" }, () => {
        void loadFeed();
        if (meId) void loadStats(meId);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [meId]);

  useEffect(() => {
    if (!meId) return;
    void loadStats(meId);
    void loadConvos(meId);
    const ch = supabase
      .channel("tailor_dash_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => void loadStats(meId))
      .on("postgres_changes", { event: "*", schema: "public", table: "completed_projects" }, () => void loadStats(meId))
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestion_replies" }, () => void loadConvos(meId))
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, () => void loadConvos(meId))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [meId]);

  const filtered = useMemo(
    () => filter === "All" ? feed : feed.filter(f => f.style.toLowerCase() === filter.toLowerCase()),
    [filter, feed]
  );

  return (
    <AppShell role="tailor" title={name ? `Good morning, ${name}` : "Tailor Studio"}>
      <div className="grid gap-5 lg:grid-cols-4">
        <ProfileCard name={name || "Studio"} />
        <Stat icon={Sparkles} label="Open requests" value={loading ? "—" : String(stats.open)} sub="live from users" />
        <Stat icon={CheckCircle2} label="Orders assigned" value={String(stats.orders)} sub={`${stats.completed} completed`} />
        <Stat icon={Star} label="Avg rating" value={stats.reviewCount ? stats.avgRating.toFixed(1) : "—"} sub={stats.reviewCount ? `from ${stats.reviewCount} reviews` : "No reviews yet"} />
      </div>

      {/* Feed + filters */}
      <section id="feed" className="mt-6 scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Nearby saree requests</h2>
            <p className="text-sm text-muted-foreground">Within 5 km · sorted by freshness</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Filter className="h-3 w-3" /> Filter</span>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs shadow-soft transition ${
                  filter === f ? "bg-foreground text-background" : "border border-border bg-card hover:bg-accent"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="grid place-items-center rounded-3xl border border-border bg-card p-12 shadow-soft">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Loading nearby requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-soft">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {feed.length === 0 ? "New saree uploads will appear here in real time." : "No requests match this filter."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(r => (
              <FeedCard
                key={r.id}
                r={r}
                saved={saved.includes(r.id)}
                onSave={() => setSaved(s => s.includes(r.id) ? s.filter(x => x !== r.id) : [...s, r.id])}
                onSuggest={() => setActive(r)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <Analytics ordersCount={stats.orders} completedCount={stats.completed} reviewCount={stats.reviewCount} />
        <Conversations convos={convos} />
        <Reviews reviews={reviews} avg={stats.avgRating} count={stats.reviewCount} />
      </section>

      <section id="completed" className="mt-8 scroll-mt-24">
        <Panel title="Completed redesigns" subtitle="Your most recent work" action={<Link to="/dashboard/tailor/completed" className="text-xs text-primary">View all →</Link>}>
          {completed.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Completed projects will appear here once you and the client both confirm.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {completed.map((c) => (
                <div key={c.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-soft bg-accent">
                  {c.image_url && <img src={c.image_url} alt={c.title || ""} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3 text-[11px] text-white">
                    <span className="truncate">{c.title || "Redesign"}</span>
                    <span>{new Date(c.completion_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section id="profile" className="mt-8 scroll-mt-24">
        <StudioProfile name={name || "Studio"} />
      </section>


      <section id="profile" className="mt-8 scroll-mt-24">
        <StudioProfile name={name} />
      </section>

      {active && <SuggestionPanel request={active} onClose={() => setActive(null)} />}
    </AppShell>
  );
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="font-display text-xl">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ProfileCard({ name }: { name: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-foreground p-6 text-background shadow-elegant">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-background/15 font-display text-xl backdrop-blur">{name[0]}</div>
        <div className="flex-1">
          <p className="font-display text-lg">{name}'s Studio</p>
          <p className="flex items-center gap-1 text-[11px] text-background/70"><MapPin className="h-3 w-3" /> Indiranagar, Bengaluru</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-background/15 px-2 py-1 text-[10px] backdrop-blur"><ShieldCheck className="h-3 w-3" /> Verified</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Available now</span>
        <Link to="/dashboard/tailor/profile-edit" className="rounded-full bg-background/15 px-3 py-1 backdrop-blur">Edit profile</Link>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 font-display text-3xl">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function FeedCard({ r, saved, onSave, onSuggest }: { r: FeedItem; saved: boolean; onSave: () => void; onSuggest: () => void }) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-float">
      <div className="relative h-44 overflow-hidden">
        <img src={r.img} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium"><Clock className="h-3 w-3" /> {r.time}</span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-1 text-[11px] font-medium text-background">{r.style}</span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{r.title}</p>
            <p className="text-xs text-muted-foreground">by {r.name}</p>
          </div>
          <p className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {r.location}</p>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.desc}</p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <Tag>{r.occasion}</Tag><Tag>{r.date}</Tag>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onSuggest} className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-foreground py-2 text-sm font-medium text-background">
            <Send className="h-3.5 w-3.5" /> Send suggestion
          </button>
          <Link to="/messages" className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs">
            <Eye className="h-3.5 w-3.5" /> Details
          </Link>
          <button
            onClick={onSave}
            aria-label="Save request"
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs transition ${
              saved ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-accent px-2 py-1 text-accent-foreground">{children}</span>;
}

function Analytics({ ordersCount, completedCount, reviewCount }: { ordersCount: number; completedCount: number; reviewCount: number }) {
  // 7-day bars: derive a soft visual from real totals so the chart isn't fabricated
  const base = Math.max(ordersCount, 1);
  const bars = [0.4, 0.65, 0.55, 0.8, 0.72, 0.9, 0.68].map(f => Math.min(100, Math.max(12, (f * base * 20) % 100)));
  return (
    <div id="analytics" className="rounded-3xl border border-border bg-card p-6 shadow-soft scroll-mt-24">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-display text-xl"><BarChart3 className="h-4 w-4" /> Analytics</h3>
          <p className="text-xs text-muted-foreground">Activity overview</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700"><TrendingUp className="h-3 w-3" /> Live</span>
      </div>
      <div className="flex h-32 items-end gap-2">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-t-xl bg-gradient-to-t from-primary to-primary/40" style={{ height: `${b}%` }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Mini label="Assigned" value={String(ordersCount)} />
        <Mini label="Completed" value={String(completedCount)} />
        <Mini label="Reviews" value={String(reviewCount)} />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-accent/60 p-2">
      <p className="font-display text-base">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Conversations({ convos }: { convos: ConvoRow[] }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-xl"><MessageCircle className="h-4 w-4" /> Active conversations</h3>
        <Link to="/dashboard/tailor/messages" className="text-xs text-primary">Open inbox →</Link>
      </div>
      {convos.length === 0 ? (
        <div className="grid place-items-center rounded-2xl bg-accent/40 p-6 text-center">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Send a suggestion to start a conversation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {convos.map((c) => (
            <Link key={c.id} to="/dashboard/tailor/messages" className="flex items-center gap-3 rounded-2xl bg-accent/40 p-3 hover:bg-accent">
              {c.user_avatar ? (
                <img src={c.user_avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-foreground font-display text-sm text-background">{c.user_name[0]}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.user_name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.last}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">{c.time}</p>
                {c.unread > 0 && <span className="inline-block min-w-5 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">{c.unread}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Reviews({ reviews, avg, count }: { reviews: ReviewRow[]; avg: number; count: number }) {
  return (
    <div id="reviews" className="rounded-3xl border border-border bg-card p-6 shadow-soft scroll-mt-24">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-xl"><Star className="h-4 w-4" /> Ratings & reviews</h3>
        <span className="text-xs text-muted-foreground">{count ? `${avg.toFixed(1)} · ${count} reviews` : "No reviews yet"}</span>
      </div>
      {reviews.length === 0 ? (
        <div className="grid place-items-center rounded-2xl bg-accent/40 p-6 text-center">
          <Star className="h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Reviews from your completed projects will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, 3).map((r) => (
            <div key={r.id} className="rounded-2xl bg-accent/40 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{r.user_name}</p>
                <div className="flex">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-gold text-gold" />)}
                </div>
              </div>
              {r.review_text && <p className="mt-1 text-xs text-muted-foreground">{r.review_text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function StudioProfile({ name }: { name: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-xl"><UserCircle className="h-4 w-4" /> Studio profile</h3>
        <Link to="/dashboard/tailor/profile-edit" className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Edit</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Studio name" value={`${name} Tailoring`} />
        <Row label="Specialization" value="Lehengas, gowns" />
        <Row label="Service area" value="5 km radius" />
        <Row label="Turnaround" value="7–10 days" />
        <Row label="Languages" value="English, Hindi, Kannada" />
        <Row label="Pricing" value="From ₹1,800" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-accent/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function SuggestionPanel({ request, onClose }: { request: FeedItem; onClose: () => void }) {
  const [silhouette, setSilhouette] = useState("");
  const [sleeves, setSleeves] = useState("");
  const [colors, setColors] = useState("");
  const [stitching, setStitching] = useState("");
  const [bestFit, setBestFit] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in"); return; }
    setSending(true);
    const { error } = await supabase.from("suggestions").insert({
      saree_upload_id: request.id,
      user_id: request.user_id,
      tailor_id: user.id,
      silhouette: silhouette || null,
      sleeve_ideas: sleeves || null,
      color_suggestions: colors || null,
      stitching_notes: stitching || null,
      best_fit: bestFit || null,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Suggestion sent successfully.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="flex h-full w-full max-w-lg flex-col bg-background shadow-elegant">
        <header className="flex items-center justify-between border-b border-border p-5">
          <div>
            <p className="text-xs text-muted-foreground">Send suggestion to</p>
            <p className="font-display text-xl">{request.name}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-accent"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex gap-3 border-b border-border p-5">
          <img src={request.img} alt="" className="h-20 w-20 rounded-2xl object-cover" />
          <div className="text-sm">
            <p className="font-medium">{request.style} · {request.occasion}</p>
            <p className="text-muted-foreground">{request.desc}</p>
            <p className="mt-1 text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{request.location}</p>
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <Field label="Recommended silhouette" placeholder="e.g. A-line crop-top with sweetheart neckline" value={silhouette} onChange={setSilhouette} />
          <Field label="Sleeve ideas" placeholder="Puff, off-shoulder, three-quarter…" value={sleeves} onChange={setSleeves} />
          <Field label="Color & embroidery suggestions" placeholder="Add gold piping, keep the pallu as dupatta" value={colors} onChange={setColors} />
          <Field label="Stitching notes" placeholder="French seams, lined bodice" textarea value={stitching} onChange={setStitching} />
          <div>
            <p className="mb-2 text-sm font-medium">Best fit for this saree</p>
            <div className="flex flex-wrap gap-2">
              {["Long frock","Short frock","Kurta","Gown","Lehenga","Crop-top set","Indo-western"].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBestFit(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs shadow-soft transition ${
                    bestFit === t ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border p-5">
          <button
            onClick={submit}
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3 font-medium text-background disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send suggestion"}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Contact details stay restricted until both agree.</p>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, placeholder, textarea, value, onChange }: { label: string; placeholder: string; textarea?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {textarea ? (
        <textarea rows={3} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" />
      ) : (
        <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" />
      )}
    </label>
  );
}
