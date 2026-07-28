import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Star, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/user_/completed")({
  head: () => ({ meta: [{ title: "My Completed Transformations — MatchO" }] }),
  component: UserCompleted,
});

type Row = { id: string; completion_date: string; tailor_id: string; request_id: string; image_url?: string; title?: string; tailor_name?: string; existing_review?: { id: string; rating: number; review_text: string | null } | null };

function UserCompleted() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await refreshSession();
      if (!alive) return;
      if (!s) { navigate({ to: "/login", replace: true }); return; }
      if (s.role !== "user") { navigate({ to: "/dashboard/tailor", replace: true }); return; }
      setReady(true);
      await load();
    })();
    return () => { alive = false; };
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;
    const ch = supabase
      .channel("user_completed_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "completed_projects" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "saree_uploads" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [ready]);


  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: comps } = await supabase.from("completed_projects").select("*").eq("user_id", user.id).order("completion_date", { ascending: false });
    const list = comps || [];
    const reqIds = list.map((c: any) => c.request_id);
    const tIds = Array.from(new Set(list.map((c: any) => c.tailor_id)));
    const [{ data: ups }, { data: profs }, { data: revs }] = await Promise.all([
      reqIds.length ? supabase.from("saree_uploads").select("id, image_url, title").in("id", reqIds) : Promise.resolve({ data: [] as any[] }),
      tIds.length ? supabase.from("profiles").select("id, display_name").in("id", tIds) : Promise.resolve({ data: [] as any[] }),
      reqIds.length ? supabase.from("reviews").select("id, request_id, rating, review_text").in("request_id", reqIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const um = new Map((ups || []).map((u: any) => [u.id, u]));
    const pm = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
    const rm = new Map((revs || []).map((r: any) => [r.request_id, r]));
    setRows(list.map((c: any) => ({
      ...c,
      image_url: um.get(c.request_id)?.image_url,
      title: um.get(c.request_id)?.title,
      tailor_name: pm.get(c.tailor_id) || "Tailor",
      existing_review: rm.get(c.request_id) || null,
    })));
    setLoading(false);
  };

  const submitReview = async (row: Row) => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("reviews").insert({
        user_id: user.id, tailor_id: row.tailor_id, request_id: row.request_id, rating, review_text: text || null,
      });
      if (error) throw error;
      toast.success("Review posted");
      setReviewing(null); setText(""); setRating(5);
      await load();
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <AppShell role="user" title="My completed transformations">
      {loading ? (
        <div className="grid place-items-center rounded-3xl glass p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-3xl glass p-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No completed transformations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Once your tailor and you both confirm, the project will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(r => (
            <div key={r.id} className="overflow-hidden rounded-3xl glass shadow-soft">
              {r.image_url && <img src={r.image_url} alt="" className="h-44 w-full object-cover" />}
              <div className="p-5">
                <p className="font-medium">{r.title || "Saree redesign"}</p>
                <p className="text-xs text-muted-foreground">by {r.tailor_name} · completed {new Date(r.completion_date).toLocaleDateString()}</p>

                {r.existing_review ? (
                  <div className="mt-3 rounded-2xl bg-accent/50 p-3">
                    <div className="flex items-center gap-1">{Array.from({ length: r.existing_review.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-gold text-gold" />)}</div>
                    <p className="mt-1 text-sm">{r.existing_review.review_text || "—"}</p>
                  </div>
                ) : reviewing === r.id ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => setRating(n)}>
                          <Star className={`h-5 w-5 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                        </button>
                      ))}
                    </div>
                    <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Share your experience…"
                      className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => submitReview(r)} disabled={submitting} className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit
                      </button>
                      <button onClick={() => setReviewing(null)} className="rounded-full border border-border bg-background px-4 py-2 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setReviewing(r.id); setRating(5); setText(""); }} className="mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    <Star className="h-4 w-4" /> Rate Tailor
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
