import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Send, ShieldAlert, Search, Paperclip, Smile, MapPin, Star, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import saree1 from "@/assets/saree-1.jpg";
import saree2 from "@/assets/saree-2.jpg";
import saree3 from "@/assets/saree-3.jpg";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — MatchO" }] }),
  component: Messages,
});

const THREADS = [
  { id: 1, name: "Rohini Tailoring", spec: "Lehengas · 1.2 km", img: saree2, last: "Sleeves could be puff or sweetheart…", time: "2m", unread: 2 },
  { id: 2, name: "Anjali Couture", spec: "Frocks · 2.8 km", img: saree1, last: "What budget are you thinking?", time: "1h" },
  { id: 3, name: "Vikram & Sons", spec: "Indo-western · 3.4 km", img: saree3, last: "I'd suggest an asymmetric hem.", time: "Yest" },
];

type Msg = { id: number; from: "me" | "them"; text: string; time: string; flagged?: boolean };

const SEED: Msg[] = [
  { id: 1, from: "them", text: "Hi Aanya! Your pink Kanjivaram is gorgeous. I have a beautiful idea.", time: "10:21" },
  { id: 2, from: "me", text: "Thank you! I was thinking a crop-top set — something for a cocktail evening.", time: "10:23" },
  { id: 3, from: "them", text: "Perfect. We can keep the pallu as a dupatta and use the border on the bodice. Sleeves: puff or sweetheart strap?", time: "10:25" },
  { id: 4, from: "me", text: "Sweetheart, definitely. How long will it take?", time: "10:27" },
];

const BLOCK_PATTERNS = [
  { re: /\b\d{10}\b/, why: "phone number" },
  { re: /\+?\d[\d\s-]{8,}/, why: "phone number" },
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/, why: "email address" },
  { re: /\bwhats\s?app\b/i, why: "WhatsApp" },
  { re: /\bhttps?:\/\/\S+/i, why: "external link" },
  { re: /\bwww\.\S+/i, why: "external link" },
];

function isUnsafe(text: string) {
  for (const p of BLOCK_PATTERNS) if (p.re.test(text)) return p.why;
  return null;
}

function Messages() {
  const [activeId, setActiveId] = useState(1);
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const active = useMemo(() => THREADS.find(t => t.id === activeId)!, [activeId]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const flagged = isUnsafe(draft);
    if (flagged) {
      setWarning(`We hid the ${flagged}. For safety, direct contact sharing is restricted until both parties agree.`);
      setMessages(m => [...m, { id: Date.now(), from: "me", text: "•••••• (hidden)", time: "now", flagged: true }]);
    } else {
      setWarning(null);
      setMessages(m => [...m, { id: Date.now(), from: "me", text: draft, time: "now" }]);
    }
    setDraft("");
    setTimeout(() => {
      setMessages(m => [...m, { id: Date.now()+1, from: "them", text: "Got it — typing a quick reply…", time: "now" }]);
    }, 800);
  };

  return (
    <AppShell role="user" title="Messages">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="glass rounded-3xl p-3 shadow-soft">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input placeholder="Search conversations" className="w-full rounded-2xl border border-border bg-card py-2 pl-9 pr-3 text-sm shadow-soft outline-none" />
          </div>
          <ul className="mt-3 space-y-1">
            {THREADS.map(t => (
              <li key={t.id}>
                <button onClick={() => setActiveId(t.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition ${activeId === t.id ? "bg-gradient-primary text-primary-foreground shadow-soft" : "hover:bg-accent"}`}>
                  <img src={t.img} alt="" className="h-10 w-10 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className={`truncate text-xs ${activeId===t.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{t.last}</p>
                  </div>
                  <span className={`text-[10px] ${activeId===t.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{t.time}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass flex h-[70vh] flex-col rounded-3xl shadow-soft">
          <header className="flex items-center gap-3 border-b border-border p-4">
            <img src={active.img} alt="" className="h-11 w-11 rounded-full object-cover" />
            <div className="flex-1">
              <p className="font-medium">{active.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3 w-3" /> {active.spec} · <Star className="h-3 w-3 fill-gold text-gold" /> 4.9
              </p>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-soft"><MoreHorizontal className="h-4 w-4" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            <div className="mx-auto max-w-md rounded-2xl bg-accent p-3 text-center text-xs text-accent-foreground">
              <ShieldAlert className="mx-auto mb-1 h-4 w-4" />
              For your safety, phone numbers, emails and external links are blocked in chat until you both agree to meet.
            </div>
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-soft ${
                  m.from === "me"
                    ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-foreground rounded-bl-sm"
                } ${m.flagged ? "italic opacity-70" : ""}`}>
                  <p>{m.text}</p>
                  <p className={`mt-1 text-[10px] ${m.from === "me" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</p>
                </div>
              </div>
            ))}
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl bg-card px-4 py-2 shadow-soft">
                <Dot /><Dot delay="120ms" /><Dot delay="240ms" />
              </div>
            </div>
          </div>

          {warning && (
            <div className="mx-5 mb-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {warning}
            </div>
          )}

          <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-card shadow-soft"><Paperclip className="h-4 w-4" /></button>
            <input value={draft} onChange={(e)=>setDraft(e.target.value)}
              placeholder="Write a message…"
              className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" />
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-card shadow-soft"><Smile className="h-4 w-4" /></button>
            <button type="submit" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: delay }} />;
}
