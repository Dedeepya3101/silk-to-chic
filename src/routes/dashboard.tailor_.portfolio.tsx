import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Upload, ImageIcon, Pencil, X, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/tailor_/portfolio")({
  head: () => ({ meta: [{ title: "Portfolio — MatchO" }] }),
  component: TailorPortfolio,
});

type Item = { id: string; before_image: string | null; after_image: string; title: string | null; description: string | null; created_at: string };

function TailorPortfolio() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

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
    const { data } = await supabase.from("portfolio_items").select("*").eq("tailor_id", user.id).order("created_at", { ascending: false });
    setItems((data as Item[]) || []);
    setLoading(false);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `portfolio/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("sarees").upload(path, file);
    if (error) throw error;
    return supabase.storage.from("sarees").getPublicUrl(path).data.publicUrl;
  };

  const handleUpload = async (which: "before" | "after", e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadImage(f);
      if (which === "before") setBefore(url); else setAfter(url);
      toast.success(`${which === "before" ? "Before" : "After"} image uploaded`);
    } catch (err: any) {
      console.error(err);
      toast.error("Couldn't upload image. Please try again.");
    }
  };

  const add = async () => {
    if (!after) { toast.error("After image is required"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("portfolio_items").insert({
        tailor_id: user.id, before_image: before || null, after_image: after, title: title || null, description: desc || null,
      });
      if (error) throw error;
      toast.success("Added to portfolio");
      setBefore(""); setAfter(""); setTitle(""); setDesc("");
      if (beforeRef.current) beforeRef.current.value = "";
      if (afterRef.current) afterRef.current.value = "";
      await load();
    } catch (err: any) { console.error(err); toast.error("Couldn't save portfolio item. Please try again."); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) { console.error(error); toast.error("Couldn't remove item."); return; }
    toast.success("Removed");
    setItems(items.filter(i => i.id !== id));
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; description: string }>({ title: "", description: "" });

  const startEdit = (it: Item) => {
    setEditingId(it.id);
    setEditDraft({ title: it.title || "", description: it.description || "" });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("portfolio_items").update({ title: editDraft.title || null, description: editDraft.description || null }).eq("id", id);
    if (error) { console.error(error); toast.error("Couldn't update item."); return; }
    toast.success("Updated");
    setItems(items.map(i => i.id === id ? { ...i, title: editDraft.title, description: editDraft.description } : i));
    setEditingId(null);
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <AppShell role="tailor" title="Portfolio">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-lg">Add a transformation</h3>
        <p className="text-xs text-muted-foreground">Show users the before-and-after of your craft.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ImgPicker label="Before" url={before} inputRef={beforeRef} onChange={e => handleUpload("before", e)} />
          <ImgPicker label="After" url={after} inputRef={afterRef} onChange={e => handleUpload("after", e)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. Mom's saree → Indo-western gown)"
            className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description"
            className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <button onClick={add} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add to portfolio
        </button>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 font-display text-xl">Your portfolio</h3>
        {loading ? (
          <div className="grid place-items-center rounded-3xl border border-border bg-card p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No portfolio entries yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add your first transformation above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(it => (
              <div key={it.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                <div className="grid grid-cols-2">
                  {it.before_image ? <img src={it.before_image} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-accent" />}
                  <img src={it.after_image} alt="" className="aspect-square w-full object-cover" />
                </div>
                <div className="p-4">
                  {editingId === it.id ? (
                    <div className="space-y-2">
                      <input value={editDraft.title} onChange={e => setEditDraft({ ...editDraft, title: e.target.value })} placeholder="Title" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                      <textarea value={editDraft.description} onChange={e => setEditDraft({ ...editDraft, description: e.target.value })} placeholder="Description" rows={2} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(it.id)} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs text-background"><Save className="h-3 w-3" /> Save</button>
                        <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs"><X className="h-3 w-3" /> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium">{it.title || "Transformation"}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{it.description}</p>
                      <div className="mt-3 flex gap-3">
                        <button onClick={() => startEdit(it)} className="inline-flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => remove(it.id)} className="inline-flex items-center gap-1 text-xs text-destructive">
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ImgPicker({ label, url, inputRef, onChange }: { label: string; url: string; inputRef: React.RefObject<HTMLInputElement | null>; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        {url ? <img src={url} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-2xl bg-accent text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
        <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs">
          <Upload className="h-3 w-3" /> Choose
        </button>
      </div>
    </div>
  );
}
