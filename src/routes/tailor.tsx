import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Clock, Star, ShieldCheck, Scissors, Sparkles, X, Send, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import saree1 from "@/assets/saree-1.jpg";
import saree2 from "@/assets/saree-2.jpg";
import saree3 from "@/assets/saree-3.jpg";

export const Route = createFileRoute("/tailor")({
  head: () => ({ meta: [{ title: "Tailor Studio — MatchO" }] }),
  component: TailorDashboard,
});

const FEED = [
  { id: 1, name: "Aanya S.", img: saree2, desc: "Mom's pink Kanjivaram, want something I can wear to a cocktail.", style: "Crop-top set", occasion: "Cocktail", fabric: "Silk · light gold border", location: "Indiranagar, 1.2 km", time: "3m" },
  { id: 2, name: "Diya R.", img: saree1, desc: "Lavender silk from college, looking for a long frock vibe.", style: "Long frock", occasion: "Family function", fabric: "Soft silk", location: "Koramangala, 3.4 km", time: "12m" },
  { id: 3, name: "Meera P.", img: saree3, desc: "Cream saree with floral embroidery — would love an indo-western gown.", style: "Indo-western gown", occasion: "Engagement", fabric: "Cream silk", location: "HSR Layout, 4.6 km", time: "32m" },
  { id: 4, name: "Kavya N.", img: saree2, desc: "Pink saree from my wedding, want a kurta set for daily wear.", style: "Kurta set", occasion: "Daily", fabric: "Silk blend", location: "JP Nagar, 5.1 km", time: "1h" },
];

function TailorDashboard() {
  const [active, setActive] = useState<typeof FEED[number] | null>(null);

  return (
    <AppShell role="tailor" title="Good morning, Rohini">
      <div className="grid gap-5 lg:grid-cols-3">
        <ProfileCard />
        <Stat icon={Sparkles} label="New requests today" value="14" tone="primary" />
        <Stat icon={CheckCircle2} label="Orders this month" value="32" tone="secondary" />
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Nearby saree requests</h2>
            <p className="text-sm text-muted-foreground">Within 5 km of Indiranagar · sorted by freshness</p>
          </div>
          <div className="flex gap-2">
            {["All", "Lehenga", "Frock", "Kurta", "Gown"].map(f => (
              <button key={f} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-soft hover:bg-accent">{f}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {FEED.map(r => <FeedCard key={r.id} r={r} onSuggest={() => setActive(r)} />)}
        </div>
      </section>

      {active && <SuggestionPanel request={active} onClose={() => setActive(null)} />}
    </AppShell>
  );
}

function ProfileCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-elegant">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/25 font-display text-2xl backdrop-blur">R</div>
        <div className="flex-1">
          <p className="font-display text-xl">Rohini Tailoring</p>
          <p className="text-xs text-primary-foreground/80 flex items-center gap-1"><MapPin className="h-3 w-3" /> Indiranagar, Bengaluru</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[11px] backdrop-blur"><ShieldCheck className="h-3 w-3" /> Verified</span>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs">
        <Pill label="Spec." value="Lehengas" />
        <Pill label="Orders" value="248" />
        <Pill label="Rating" value="4.9★" />
        <Pill label="Replies" value="< 1h" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Available now</span>
        <button className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">Edit profile</button>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-2 backdrop-blur">
      <p className="font-display text-sm">{value}</p>
      <p className="text-[10px] text-primary-foreground/80">{label}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary" | "secondary" }) {
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

function FeedCard({ r, onSuggest }: { r: typeof FEED[number]; onSuggest: () => void }) {
  return (
    <div className="group glass overflow-hidden rounded-3xl shadow-soft transition-all hover:-translate-y-1 hover:shadow-float">
      <div className="relative h-44 overflow-hidden">
        <img src={r.img} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full glass px-2 py-1 text-[11px] font-medium"><Clock className="h-3 w-3" /> {r.time}</span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-soft">{r.style}</span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.location}</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <Tag>{r.occasion}</Tag><Tag>{r.fabric}</Tag>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onSuggest} className="flex-1 rounded-full bg-gradient-primary py-2 text-sm font-medium text-primary-foreground shadow-soft">Send suggestion</button>
          <button className="rounded-full border border-border bg-card px-3 text-xs">Interested</button>
          <Link to="/messages" className="rounded-full border border-border bg-card px-3 py-2 text-xs">View</Link>
        </div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-accent px-2 py-1 text-accent-foreground">{children}</span>;
}

function SuggestionPanel({ request, onClose }: { request: typeof FEED[number]; onClose: () => void }) {
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
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <Field label="Recommended silhouette" placeholder="e.g. A-line crop-top with sweetheart neckline" />
          <Field label="Sleeve ideas" placeholder="Puff, off-shoulder, three-quarter…" />
          <Field label="Color & embroidery suggestions" placeholder="Add gold piping, keep the pallu as dupatta" />
          <Field label="Stitching notes" placeholder="French seams, lined bodice" textarea />
          <div>
            <p className="mb-2 text-sm font-medium">Best fit for this saree</p>
            <div className="flex flex-wrap gap-2">
              {["Long frock","Short frock","Kurta","Gown","Lehenga","Crop-top set","Indo-western"].map(t => (
                <button key={t} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-soft hover:bg-accent">{t}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border p-5">
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-soft">
            <Send className="h-4 w-4" /> Send suggestion
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Be specific, fashion-oriented, and kind. Contact details stay restricted until both agree.</p>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, placeholder, textarea }: { label: string; placeholder: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {textarea ? (
        <textarea rows={3} placeholder={placeholder}
          className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" />
      ) : (
        <input placeholder={placeholder}
          className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" />
      )}
    </label>
  );
}

void Scissors; void Star;
