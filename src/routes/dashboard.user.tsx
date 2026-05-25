import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Upload, Sparkles, MessageCircle, Heart, Bell, CheckCircle2, MapPin, Star, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/session";
import saree1 from "@/assets/saree-1.jpg";
import saree2 from "@/assets/saree-2.jpg";
import saree3 from "@/assets/saree-3.jpg";
import transformAfter from "@/assets/transform-after.jpg";

export const Route = createFileRoute("/dashboard/user")({
  head: () => ({ meta: [{ title: "User Dashboard — MatchO" }] }),
  component: UserDashboard,
});

function UserDashboard() {
  const [name, setName] = useState("there");
  useEffect(() => {
    const s = getSession();
    if (s?.name) setName(s.name.split(" ")[0]);
  }, []);

  return (
    <AppShell role="user" title={`Hi ${name}, ready to reimagine?`}>
      <div className="grid gap-5 lg:grid-cols-3">
        <UploadCard />
        <StatTile icon={Sparkles} label="Active requests" value="3" tone="primary" />
        <StatTile icon={CheckCircle2} label="Completed transformations" value="7" tone="secondary" />
      </div>

      <section className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Panel title="Tailor suggestions" action={<Link to="/messages" className="text-sm text-primary">Open chat →</Link>}>
            <div className="space-y-4">
              {SUGGESTIONS.map((s) => <SuggestionRow key={s.id} {...s} />)}
            </div>
          </Panel>

          <Panel title="Active requests" id="requests">
            <div className="grid gap-4 sm:grid-cols-2">
              {REQUESTS.map((r) => <RequestCard key={r.id} {...r} />)}
            </div>
          </Panel>

          <Panel title="Completed transformations">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[transformAfter, saree2, saree3, saree1, transformAfter, saree2].map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-2xl shadow-soft">
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Saved tailors" id="saved">
            <div className="space-y-3">
              {SAVED.map((t) => <SavedTailor key={t.name} {...t} />)}
            </div>
          </Panel>
          <Panel title="Notifications" id="notifications">
            <ul className="space-y-3 text-sm">
              <Notif icon={MessageCircle} text="Rohini sent a new sleeve idea." time="2m" />
              <Notif icon={Heart} text="You saved Anjali Couture." time="1h" />
              <Notif icon={Bell} text="Your pink saree got 3 new suggestions." time="3h" />
            </ul>
          </Panel>
          <Panel title="Profile settings" id="settings">
            <div className="space-y-3 text-sm">
              <Row label="Name" value={name === "there" ? "Guest" : name} />
              <Row label="City" value="Bengaluru" />
              <Row label="Style preference" value="Indo-western, modern" />
              <button className="w-full rounded-full bg-gradient-primary py-2.5 font-medium text-primary-foreground shadow-soft">Edit profile</button>
            </div>
          </Panel>
        </div>
      </section>
    </AppShell>
  );
}

function UploadCard() {
  return (
    <div id="upload" className="relative overflow-hidden rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-elegant">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <Upload className="h-6 w-6" />
      <h3 className="mt-4 font-display text-xl">Upload a saree</h3>
      <p className="mt-1 text-sm text-primary-foreground/80">Share a photo and details to invite nearby tailors.</p>
      <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/30">
        New upload <ArrowRight className="h-4 w-4" />
      </button>
      <div className="mt-5 grid grid-cols-4 gap-2 text-[10px]">
        {["Style", "Occasion", "Fabric", "Color"].map((t) => (
          <span key={t} className="rounded-full bg-white/15 px-2 py-1 text-center">{t}</span>
        ))}
      </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card px-3 py-2.5 shadow-soft">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

const SUGGESTIONS = [
  { id: 1, tailor: "Rohini Tailoring", style: "Crop-top set with dupatta", img: saree2, distance: "1.2 km", rating: 4.9 },
  { id: 2, tailor: "Anjali Couture", style: "A-line long frock, puff sleeves", img: saree1, distance: "2.8 km", rating: 4.7 },
  { id: 3, tailor: "Vikram & Sons", style: "Indo-western gown, asymmetric hem", img: saree3, distance: "3.4 km", rating: 4.8 },
];

function SuggestionRow({ tailor, style, img, distance, rating }: typeof SUGGESTIONS[number]) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card p-3 shadow-soft transition hover:-translate-y-0.5">
      <img src={img} alt="" className="h-14 w-14 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{tailor}</p>
        <p className="truncate text-sm text-muted-foreground">{style}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {distance} · <Star className="h-3 w-3 fill-gold text-gold" /> {rating}</p>
      </div>
      <Link to="/messages" className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft">Chat</Link>
    </div>
  );
}

const REQUESTS = [
  { id: 1, title: "Mom's pink Kanjivaram", style: "Crop-top set", img: saree2, replies: 4 },
  { id: 2, title: "Lavender silk", style: "Long frock", img: saree1, replies: 2 },
];

function RequestCard({ title, style, img, replies }: typeof REQUESTS[number]) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-soft transition hover:-translate-y-0.5">
      <img src={img} alt="" className="h-32 w-full object-cover" />
      <div className="p-4">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{style}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="rounded-full bg-secondary px-2 py-1 text-secondary-foreground">{replies} replies</span>
          <span className="text-muted-foreground">Open</span>
        </div>
      </div>
    </div>
  );
}

const SAVED = [
  { name: "Rohini Tailoring", spec: "Lehengas, gowns", rating: 4.9 },
  { name: "Anjali Couture", spec: "Frocks, kurtas", rating: 4.7 },
];

function SavedTailor({ name, spec, rating }: typeof SAVED[number]) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary font-display text-primary-foreground">{name[0]}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{spec}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-gold"><Star className="h-3 w-3 fill-current" />{rating}</div>
    </div>
  );
}

function Notif({ icon: Icon, text, time }: { icon: any; text: string; time: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></span>
      <span className="flex-1">{text}</span>
      <span className="text-xs text-muted-foreground">{time}</span>
    </li>
  );
}
