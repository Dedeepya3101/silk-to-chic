import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Clock, Inbox } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/tailor_/assigned")({
  head: () => ({ meta: [{ title: "Assigned Requests — MatchO" }] }),
  component: TailorAssigned,
});

type Row = { id: string; image_url: string; title: string | null; description: string | null; status: string; tailor_marked_completed: boolean; user_confirmed_completion: boolean; user_id: string; user_name?: string };

function TailorAssigned() {
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
      if (s.role !== "tailor") { navigate({ to: "/dashboard/user", replace: true }); return; }
      setReady(true);
      await load();
    })();
    return () => { alive = false; };
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("saree_uploads")
      .select("id, image_url, title, description, status, tailor_marked_completed, user_confirmed_completion, user_id")
      .eq("assigned_tailor_id", user.id)
      .order("updated_at", { ascending: false });
    const list = data || [];
    const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] as any[] };
    const pm = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
    setRows(list.map((r: any) => ({ ...r, user_name: pm.get(r.user_id) || "MatchO user" })));
    setLoading(false);
  };

  const markComplete = async (id: string) => {
    const { error } = await supabase.from("saree_uploads").update({ tailor_marked_completed: true }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as completed — waiting for user confirmation");
    await load();
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <AppShell role="tailor" title="Assigned requests">
      {loading ? (
        <div className="grid place-items-center rounded-3xl border border-border bg-card p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No assigned requests</p>
          <p className="mt-1 text-sm text-muted-foreground">When a user selects you from your suggestion, it appears here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(r => (
            <div key={r.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <img src={r.image_url} alt="" className="h-40 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{r.title || "Saree redesign"}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-muted-foreground">for {r.user_name}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                {r.status === "completed" ? (
                  <p className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Completed & confirmed</p>
                ) : r.tailor_marked_completed ? (
                  <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Waiting for user confirmation</p>
                ) : (
                  <button onClick={() => markComplete(r.id)} className="mt-3 inline-flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-xs text-background">
                    <CheckCircle2 className="h-3 w-3" /> Mark as completed
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-accent text-accent-foreground",
    in_progress: "bg-primary text-primary-foreground",
    completed: "bg-emerald-500/15 text-emerald-700",
  };
  const label = status === "in_progress" ? "In progress" : status[0].toUpperCase() + status.slice(1);
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${map[status] || "bg-accent"}`}>{label}</span>;
}
