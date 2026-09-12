import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Upload, Sparkles, MessageCircle, Heart, Bell, CheckCircle2, MapPin, Star, Loader2, Inbox, Scissors } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import saree1 from "@/assets/saree-1.jpg";
import saree2 from "@/assets/saree-2.jpg";
import saree3 from "@/assets/saree-3.jpg";
import transformAfter from "@/assets/transform-after.jpg";
import { useRef } from "react";

export const Route = createFileRoute("/dashboard/user")({
  head: () => ({ meta: [{ title: "User Dashboard — MatchO" }] }),
  component: UserDashboard,
});

type SareeRow = { id: string; image_url: string; title: string | null; description: string | null; created_at: string; status?: string; tailor_marked_completed?: boolean; user_confirmed_completion?: boolean };
type SuggestionRow = { id: string; silhouette: string | null; best_fit: string | null; created_at: string; tailor_id: string; saree_upload_id: string; tailor_name: string; tailor_avatar?: string | null; tailor_city?: string | null; image_url?: string };
type SavedRow = { id: string; tailor_id: string; studio_name: string; profile_photo?: string | null; specialization?: string | null };
type NotifRow = { id: string; title: string; message: string; created_at: string; is_read: boolean; link: string | null };

function UserDashboard() {
  const [name, setName] = useState("there");
  const [profile, setProfile] = useState<{ city: string | null; bio: string | null } | null>(null);
  const [uploads, setUploads] = useState<SareeRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  // Inspiration gallery: only the authenticated user's own saree images.
  const galleryImages = uploads
    .filter((u) => !!u.image_url)
    .slice(0, 6)
    .map((u) => ({ src: u.image_url, alt: u.title || "Your saree" }));

  useEffect(() => {
    const s = getSession();
    if (s?.name) setName(s.name.split(" ")[0]);
    void loadAll();
  }, []);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: ups }, { data: sugs }, { data: sav }, { data: nts }, { count: cc }, { data: prof }] = await Promise.all([
      supabase.from("saree_uploads").select("id, image_url, title, description, created_at, status, tailor_marked_completed, user_confirmed_completion").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("suggestions").select("id, silhouette, best_fit, created_at, tailor_id, saree_upload_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
      supabase.from("saved_tailors").select("id, tailor_id").eq("user_id", user.id).limit(5),
      supabase.from("notifications").select("id, title, message, created_at, is_read, link").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
      supabase.from("completed_projects").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("profiles").select("city, bio").eq("id", user.id).maybeSingle(),
    ]);
    setUploads((ups as SareeRow[]) || []);
    setCompletedCount(cc || 0);
    setProfile(prof as any);

    const sugList = sugs || [];
    const tIds = Array.from(new Set(sugList.map((x: any) => x.tailor_id)));
    const upIds = Array.from(new Set(sugList.map((x: any) => x.saree_upload_id)));
    const [{ data: tProfs }, { data: sUps }] = await Promise.all([
      tIds.length ? supabase.from("profiles").select("id, display_name, avatar_url, city").in("id", tIds) : Promise.resolve({ data: [] as any[] }),
      upIds.length ? supabase.from("saree_uploads").select("id, image_url").in("id", upIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const pm = new Map((tProfs || []).map((p: any) => [p.id, p]));
    const um = new Map((sUps || []).map((u: any) => [u.id, u.image_url]));
    setSuggestions(sugList.map((s: any) => {
      const p = pm.get(s.tailor_id);
      return { ...s, tailor_name: p?.display_name || "Tailor", tailor_avatar: p?.avatar_url, tailor_city: p?.city, image_url: um.get(s.saree_upload_id) };
    }));

    const savList = sav || [];
    const savIds = savList.map((r: any) => r.tailor_id);
    if (savIds.length) {
      const [{ data: tp }, { data: bp }] = await Promise.all([
        supabase.from("tailor_profiles").select("tailor_id, studio_name, profile_photo, specialization").in("tailor_id", savIds),
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", savIds),
      ]);
      const tpm = new Map((tp || []).map((r: any) => [r.tailor_id, r]));
      const bpm = new Map((bp || []).map((r: any) => [r.id, r]));
      setSaved(savList.map((r: any) => {
        const t = tpm.get(r.tailor_id); const b = bpm.get(r.tailor_id);
        return { id: r.id, tailor_id: r.tailor_id, studio_name: t?.studio_name || b?.display_name || "Tailor", profile_photo: t?.profile_photo || b?.avatar_url, specialization: t?.specialization };
      }));
    } else {
      setSaved([]);
    }

    setNotifs((nts as NotifRow[]) || []);
  };

  return (
    <AppShell role="user" title={`Hi ${name}, ready to reimagine?`}>
      <div className="grid gap-5 lg:grid-cols-3">
        <UploadCard onUploaded={loadAll} />
        <StatTile icon={Sparkles} label="Active requests" value={String(uploads.filter(u => u.status !== "completed").length)} tone="primary" />
        <StatTile icon={CheckCircle2} label="Completed transformations" value={String(completedCount)} tone="secondary" />
      </div>

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Panel title="Your saree uploads" id="requests">
            {uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploads yet — share your first saree above.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {uploads.map((u) => (
                  <div key={u.id} className="overflow-hidden rounded-2xl bg-card shadow-soft">
                    <img src={u.image_url} alt={u.title || ""} className="h-40 w-full object-cover" />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{u.title || "Untitled saree"}</p>
                        <StatusBadge status={u.status || "open"} />
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{u.description}</p>
                      <Link
                        to="/dashboard/user/assistant"
                        search={{ saree: u.id }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground hover:bg-accent/70"
                      >
                        <Sparkles className="h-3 w-3" /> Ask AI about this saree
                      </Link>

                      {u.status === "in_progress" && u.tailor_marked_completed && !u.user_confirmed_completion && (
                        <p className="mt-2 text-xs text-primary">Tailor marked complete — confirm in Suggestions.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Tailor suggestions" action={<Link to="/dashboard/user/suggestions" className="text-sm text-primary">Open all →</Link>}>
            {suggestions.length === 0 ? (
              <EmptyMini icon={Inbox} text="Tailor redesign ideas will appear here." />
            ) : (
              <div className="space-y-4">
                {suggestions.map(s => <SuggestionRow key={s.id} s={s} />)}
              </div>
            )}
          </Panel>

          <Panel title="Inspiration gallery">
            {galleryImages.length === 0 ? (
              <EmptyMini icon={Sparkles} text="Your uploaded sarees will appear here." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => {
                  const img = galleryImages[i];
                  return img ? (
                    <div key={i} className="aspect-square overflow-hidden rounded-2xl shadow-soft">
                      <img src={img.src} alt={img.alt} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                    </div>
                  ) : (
                    <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-muted/40 shadow-soft" />
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <div className="glass rounded-3xl p-5 shadow-soft">
            <h2 className="font-display text-lg">MatchO AI Assistant</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Get style ideas for your saree and real tailor matches — you confirm before anything happens.
            </p>
            <Link
              to="/dashboard/user/assistant"
              search={{ saree: uploads[0]?.id }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft"
            >
              <Sparkles className="h-4 w-4" /> Open AI Assistant
            </Link>
          </div>
          <Panel title="Saved tailors" id="saved" action={<Link to="/dashboard/user/saved" className="text-sm text-primary">View all →</Link>}>

            {saved.length === 0 ? (
              <EmptyMini icon={Heart} text="Save tailors from their profile to see them here." />
            ) : (
              <div className="space-y-3">
                {saved.map((t) => <SavedTailor key={t.id} t={t} />)}
              </div>
            )}
          </Panel>
          <Panel title="Notifications" id="notifications" action={<Link to="/dashboard/user/notifications" className="text-sm text-primary">All →</Link>}>
            {notifs.length === 0 ? (
              <EmptyMini icon={Bell} text="You're all caught up." />
            ) : (
              <ul className="space-y-3 text-sm">
                {notifs.map(n => <Notif key={n.id} n={n} />)}
              </ul>
            )}
          </Panel>
          <Panel title="Profile settings" id="settings">
            <div className="space-y-3 text-sm">
              <Row label="Name" value={name === "there" ? "Guest" : name} />
              <Row label="City" value={profile?.city || "Not set"} />
              <Row label="Bio" value={profile?.bio || "Not set"} />
              <Link to="/dashboard/user/profile" className="block w-full rounded-full bg-gradient-primary py-2.5 text-center font-medium text-primary-foreground shadow-soft">Edit profile</Link>
            </div>
          </Panel>
        </div>
      </section>
    </AppShell>
  );
}

const CATEGORIES = ["Lehenga", "Frock", "Kurta", "Gown", "Crop-top set", "Custom"];

function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Custom");
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in"); return; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("sarees").upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("sarees").getPublicUrl(path);
      const { error: insErr } = await supabase.from("saree_uploads").insert({
        user_id: user.id, image_url: pub.publicUrl, title: title || file.name, description, occasion: category,
      });
      if (insErr) throw insErr;
      toast.success("Saree uploaded — tailors will see it instantly");
      setTitle(""); setDescription(""); setCategory("Custom");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="upload" className="relative overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-elegant">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <Upload className="h-6 w-6" />
      <h3 className="mt-4 font-display text-xl">Upload a saree</h3>
      <p className="mt-1 text-sm text-primary-foreground/80">Share a photo and details to invite nearby tailors.</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Mom's pink Kanjivaram)"
        className="mt-3 w-full rounded-xl bg-white/15 px-3 py-2 text-sm placeholder:text-primary-foreground/60 outline-none" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What would you like it redesigned into?"
        className="mt-2 w-full rounded-xl bg-white/15 px-3 py-2 text-sm placeholder:text-primary-foreground/60 outline-none" />
      <select value={category} onChange={(e) => setCategory(e.target.value)}
        className="mt-2 w-full rounded-xl bg-white/15 px-3 py-2 text-sm outline-none [&>option]:text-foreground">
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button disabled={busy} onClick={() => fileRef.current?.click()}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/30 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? "Uploading…" : "Choose image & upload"}
      </button>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary" | "secondary" }) {
  return (
    <div className="glass rounded-3xl p-6 shadow-soft">
      <div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone === "primary" ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 font-display text-3xl">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({ title, action, children, id }: { title: string; action?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="glass rounded-3xl p-6 shadow-soft scroll-mt-24">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyMini({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="grid place-items-center rounded-2xl bg-accent/40 p-6 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-3 py-2.5 shadow-soft">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-accent text-accent-foreground",
    in_progress: "bg-primary text-primary-foreground",
    completed: "bg-emerald-500/15 text-emerald-700",
  };
  const label = status === "in_progress" ? "In progress" : status[0].toUpperCase() + status.slice(1);
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${map[status] || "bg-accent"}`}>{label}</span>;
}

function SuggestionRow({ s }: { s: SuggestionRow }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card p-3 shadow-soft transition hover:-translate-y-0.5">
      {s.image_url ? (
        <img src={s.image_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
      ) : (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-muted-foreground"><Sparkles className="h-5 w-5" /></div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{s.tailor_name}</p>
        <p className="truncate text-sm text-muted-foreground">{s.silhouette || s.best_fit || "Redesign idea"}</p>
        {s.tailor_city && <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {s.tailor_city}</p>}
      </div>
      <Link to="/dashboard/user/messages" className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft">Chat</Link>
    </div>
  );
}

function SavedTailor({ t }: { t: SavedRow }) {
  return (
    <Link to="/dashboard/user/tailors/$tailorId" params={{ tailorId: t.tailor_id }} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
      {t.profile_photo ? (
        <img src={t.profile_photo} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary font-display text-primary-foreground">{t.studio_name[0]}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{t.studio_name}</p>
        <p className="truncate text-xs text-muted-foreground">{t.specialization || "Tailor"}</p>
      </div>
      <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function Notif({ n }: { n: NotifRow }) {
  const Icon = /reply/i.test(n.title) ? MessageCircle : /save/i.test(n.title) ? Heart : Bell;
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></span>
      <span className="flex-1">
        <span className="block font-medium">{n.title}</span>
        <span className="block text-xs text-muted-foreground">{n.message}</span>
      </span>
      <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
    </li>
  );
}
