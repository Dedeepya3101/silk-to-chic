import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/tailor_/reviews")({
  head: () => ({ meta: [{ title: "Reviews — MatchO" }] }),
  component: TailorReviews,
});

type R = { id: string; rating: number; review_text: string | null; created_at: string; user_id: string; user_name?: string };

function TailorReviews() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<R[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await refreshSession();
      if (!alive) return;
      if (!s) { navigate({ to: "/login", replace: true }); return; }
      if (s.role !== "tailor") { navigate({ to: "/dashboard/user", replace: true }); return; }
      setReady(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("reviews").select("*").eq("tailor_id", user.id).order("created_at", { ascending: false });
      const list = data || [];
      const uids = Array.from(new Set(list.map((r: any) => r.user_id)));
      const { data: profs } = uids.length ? await supabase.from("profiles").select("id, display_name").in("id", uids) : { data: [] as any[] };
      const pm = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
      setRows(list.map((r: any) => ({ ...r, user_name: pm.get(r.user_id) || "MatchO user" })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [navigate]);

  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "—";

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <AppShell role="tailor" title="Reviews">
      <div className="mb-5 flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div>
          <p className="font-display text-3xl">{avg}</p>
          <p className="text-xs text-muted-foreground">Average rating</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="font-display text-3xl">{rows.length}</p>
          <p className="text-xs text-muted-foreground">Total reviews</p>
        </div>
      </div>
      {loading ? (
        <div className="grid place-items-center rounded-3xl border border-border bg-card p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <Star className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No reviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Reviews from completed projects will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="font-medium">{r.user_name}</p>
                <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-gold text-gold" />)}</div>
              </div>
              {r.review_text && <p className="mt-2 text-sm text-muted-foreground">{r.review_text}</p>}
              <p className="mt-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
