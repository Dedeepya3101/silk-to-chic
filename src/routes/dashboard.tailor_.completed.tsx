import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/tailor_/completed")({
  head: () => ({ meta: [{ title: "Completed Projects — MatchO" }] }),
  component: TailorCompleted,
});

type Row = { id: string; completion_date: string; user_id: string; request_id: string; image_url?: string; title?: string; user_name?: string };

function TailorCompleted() {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: comps } = await supabase.from("completed_projects").select("*").eq("tailor_id", user.id).order("completion_date", { ascending: false });
      const list = comps || [];
      const reqIds = list.map(c => c.request_id);
      const userIds = Array.from(new Set(list.map(c => c.user_id)));
      const [{ data: ups }, { data: profs }] = await Promise.all([
        reqIds.length ? supabase.from("saree_uploads").select("id, image_url, title").in("id", reqIds) : Promise.resolve({ data: [] as any[] }),
        userIds.length ? supabase.from("profiles").select("id, display_name").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const um = new Map((ups || []).map((u: any) => [u.id, u]));
      const pm = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
      setRows(list.map((c: any) => ({ ...c, image_url: um.get(c.request_id)?.image_url, title: um.get(c.request_id)?.title, user_name: pm.get(c.user_id) })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [navigate]);

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <AppShell role="tailor" title="Completed projects">
      {loading ? (
        <div className="grid place-items-center rounded-3xl border border-border bg-card p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No completed projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Once both you and the user confirm, the project will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(r => (
            <div key={r.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              {r.image_url && <img src={r.image_url} alt="" className="h-40 w-full object-cover" />}
              <div className="p-4">
                <p className="font-medium">{r.title || "Saree redesign"}</p>
                <p className="text-xs text-muted-foreground">for {r.user_name || "MatchO user"}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Completed {new Date(r.completion_date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
