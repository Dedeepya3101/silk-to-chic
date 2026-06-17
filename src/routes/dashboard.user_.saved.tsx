import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Heart, Scissors } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/user_/saved")({
  head: () => ({ meta: [{ title: "Saved Tailors — MatchO" }] }),
  component: SavedTailors,
});

type Row = { id: string; tailor_id: string; studio_name?: string | null; profile_photo?: string | null; specialization?: string | null; location?: string | null };

function SavedTailors() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

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

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: saves } = await supabase.from("saved_tailors").select("id, tailor_id").eq("user_id", user.id);
    const list = saves || [];
    const ids = list.map((r: any) => r.tailor_id);
    const [{ data: profs }, { data: bases }] = await Promise.all([
      ids.length ? supabase.from("tailor_profiles").select("tailor_id, studio_name, profile_photo, specialization, location").in("tailor_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from("profiles").select("id, display_name, city").in("id", ids) : Promise.resolve({ data: [] as any[] }),
    ]);
    const pm = new Map((profs || []).map((p: any) => [p.tailor_id, p]));
    const bm = new Map((bases || []).map((b: any) => [b.id, b]));
    setRows(list.map((r: any) => {
      const p = pm.get(r.tailor_id); const b = bm.get(r.tailor_id);
      return {
        id: r.id, tailor_id: r.tailor_id,
        studio_name: p?.studio_name || b?.display_name || "Tailor",
        profile_photo: p?.profile_photo, specialization: p?.specialization,
        location: p?.location || b?.city,
      };
    }));
    setLoading(false);
  };

  const unsave = async (id: string) => {
    const { error } = await supabase.from("saved_tailors").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows(rows.filter(r => r.id !== id));
    toast.success("Removed");
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <AppShell role="user" title="Saved tailors">
      {loading ? (
        <div className="grid place-items-center rounded-3xl glass p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-3xl glass p-12 text-center">
          <Heart className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No saved tailors yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap the heart on a tailor's profile to save them for later.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(r => (
            <div key={r.id} className="rounded-3xl glass p-4 shadow-soft">
              <div className="flex items-center gap-3">
                {r.profile_photo ? <img src={r.profile_photo} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-muted-foreground"><Scissors className="h-5 w-5" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.studio_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.specialization || r.location || "Tailor"}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to="/dashboard/user/tailors/$tailorId" params={{ tailorId: r.tailor_id }} className="flex-1 rounded-full bg-gradient-primary py-2 text-center text-sm font-medium text-primary-foreground">View profile</Link>
                <button onClick={() => unsave(r.id)} className="rounded-full border border-border bg-background px-3 text-xs"><Heart className="h-3.5 w-3.5 fill-current text-primary" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
