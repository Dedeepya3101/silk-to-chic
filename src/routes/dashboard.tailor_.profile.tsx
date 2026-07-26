import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/tailor_/profile")({
  head: () => ({ meta: [{ title: "Tailor Profile — MatchO" }] }),
  component: TailorProfile,
});

const CATEGORIES = ["blouse", "lehenga", "kurta", "gown", "crop-top set", "custom"];

function TailorProfile() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    avatar_url: "",
    display_name: "",
    email: "",
    phone: "",
    city: "",
    tailor_category: "",
    bio: "",
    experience_years: 0,
    languages: "",
  });

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
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setForm({
          avatar_url: (data as any).avatar_url || "",
          display_name: data.display_name || "",
          email: data.email || user.email || "",
          phone: (data as any).phone || "",
          city: data.city || "",
          tailor_category: (data as any).tailor_category || data.specialization || "",
          bio: (data as any).bio || "",
          experience_years: (data as any).experience_years || 0,
          languages: (data as any).languages || "",
        });
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [navigate]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("sarees").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("sarees").getPublicUrl(path);
      setForm(f => ({ ...f, avatar_url: pub.publicUrl }));
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({
        avatar_url: form.avatar_url,
        display_name: form.display_name,
        phone: form.phone,
        city: form.city,
        tailor_category: form.tailor_category,
        bio: form.bio,
        experience_years: Number(form.experience_years) || 0,
        languages: form.languages,
      } as any).eq("id", user.id);
      if (error) throw error;
      await refreshSession();
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally { setSaving(false); }
  };

  if (!ready || loading) {
    return (
      <AppShell role="tailor" title="Tailor Profile">
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  const initial = (form.display_name || "G").trim()[0]?.toUpperCase() || "G";

  return (
    <AppShell role="tailor" title="Tailor Profile">
      <div className="max-w-2xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-secondary text-secondary-foreground grid place-items-center font-display text-2xl">
              {form.avatar_url ? <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" /> : initial}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {form.avatar_url ? "Replace photo" : "Upload photo"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className={input} />
          </Field>
          <Field label="Email">
            <input value={form.email} disabled className={input + " opacity-70"} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} />
          </Field>
          <Field label="Tailor category">
            <select value={form.tailor_category} onChange={(e) => setForm({ ...form, tailor_category: e.target.value })} className={input}>
              <option value="">Select…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Years of experience">
            <input type="number" min={0} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })} className={input} />
          </Field>
          <Field label="Languages spoken" className="sm:col-span-2">
            <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="e.g. English, Hindi, Tamil" className={input} />
          </Field>
          <Field label="Bio" className="sm:col-span-2">
            <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={input} />
          </Field>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>
    </AppShell>
  );
}

const input = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"flex flex-col gap-1.5 " + (className || "")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
