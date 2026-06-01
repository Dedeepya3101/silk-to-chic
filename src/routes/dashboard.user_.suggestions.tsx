import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Inbox, Send, Sparkles, Scissors, Calendar } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/user_/suggestions")({
  head: () => ({ meta: [{ title: "Tailor Suggestions — MatchO" }] }),
  component: UserSuggestions,
});

type Suggestion = {
  id: string;
  created_at: string;
  silhouette: string | null;
  sleeve_ideas: string | null;
  color_suggestions: string | null;
  stitching_notes: string | null;
  best_fit: string | null;
  tailor_id: string;
  saree_upload_id: string;
  tailor_name?: string;
  image_url?: string;
};

type Reply = { id: string; suggestion_id: string; user_id: string; message: string; created_at: string };

function UserSuggestions() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

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
    const { data: sugs } = await supabase
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    const list = sugs || [];
    const tailorIds = Array.from(new Set(list.map(s => s.tailor_id)));
    const uploadIds = Array.from(new Set(list.map(s => s.saree_upload_id)));
    const [{ data: profs }, { data: uploads }, { data: reps }] = await Promise.all([
      tailorIds.length ? supabase.from("profiles").select("id, display_name").in("id", tailorIds) : Promise.resolve({ data: [] as any[] }),
      uploadIds.length ? supabase.from("saree_uploads").select("id, image_url").in("id", uploadIds) : Promise.resolve({ data: [] as any[] }),
      list.length ? supabase.from("suggestion_replies").select("*").in("suggestion_id", list.map(s => s.id)).order("created_at", { ascending: true }) : Promise.resolve({ data: [] as any[] }),
    ]);
    const pm = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
    const um = new Map((uploads || []).map((u: any) => [u.id, u.image_url]));
    setItems(list.map(s => ({ ...s, tailor_name: pm.get(s.tailor_id) || "Tailor", image_url: um.get(s.saree_upload_id) })));
    const grouped: Record<string, Reply[]> = {};
    (reps || []).forEach((r: any) => { (grouped[r.suggestion_id] ||= []).push(r); });
    setReplies(grouped);
    setLoading(false);
  };

  useEffect(() => {
    if (!ready) return;
    void load();
    const ch = supabase
      .channel("user_suggestions_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestion_replies" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [ready]);

  const sendReply = async (suggestionId: string) => {
    const message = (draft[suggestionId] || "").trim();
    if (!message) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSendingId(suggestionId);
    const { error } = await supabase.from("suggestion_replies").insert({
      suggestion_id: suggestionId, user_id: user.id, message,
    });
    setSendingId(null);
    if (error) { toast.error(error.message); return; }
    setDraft(d => ({ ...d, [suggestionId]: "" }));
    toast.success("Reply sent");
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <AppShell role="user" title="Tailor suggestions">
      {loading ? (
        <div className="grid place-items-center rounded-3xl glass p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center rounded-3xl glass p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No suggestions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tailors will send redesign ideas here in real time.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map(s => (
            <article key={s.id} className="overflow-hidden rounded-3xl glass shadow-soft">
              <div className="grid gap-5 p-5 md:grid-cols-[160px_1fr]">
                {s.image_url ? (
                  <img src={s.image_url} alt="" className="h-40 w-full rounded-2xl object-cover md:h-full" />
                ) : (
                  <div className="grid h-40 place-items-center rounded-2xl bg-accent text-muted-foreground"><Sparkles className="h-6 w-6" /></div>
                )}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Scissors className="h-3 w-3" /> {s.tailor_name}</p>
                      <h3 className="font-display text-xl">{s.silhouette || "Redesign idea"}</h3>
                    </div>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> {new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Detail label="Sleeve ideas" value={s.sleeve_ideas} />
                    <Detail label="Colors & embroidery" value={s.color_suggestions} />
                    <Detail label="Stitching notes" value={s.stitching_notes} />
                    <Detail label="Best fit" value={s.best_fit} />
                  </div>
                </div>
              </div>
              <div className="border-t border-border/60 bg-accent/30 p-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Conversation</p>
                <div className="space-y-2">
                  {(replies[s.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No replies yet. Start the conversation.</p>
                  ) : (
                    (replies[s.id] || []).map(r => (
                      <div key={r.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${r.user_id === s.tailor_id ? "bg-card border border-border" : "ml-auto bg-foreground text-background"}`}>
                        {r.message}
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={draft[s.id] || ""}
                    onChange={e => setDraft(d => ({ ...d, [s.id]: e.target.value }))}
                    placeholder="Reply to the tailor…"
                    className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm shadow-soft outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => sendReply(s.id)}
                    disabled={sendingId === s.id}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
                  >
                    {sendingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-accent/50 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
