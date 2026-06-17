import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Save, ImageIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/tailor_/profile-edit")({
  head: () => ({ meta: [{ title: "Edit Studio Profile — MatchO" }] }),
  component: TailorProfileEdit,
});

function TailorProfileEdit() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    profile_photo: "" as string,
    studio_name: "",
    owner_name: "",
    experience_years: 0,
    specialization: "",
    location: "",
    phone: "",
    phone_visibility: false,
    bio: "",
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
      const { data } = await supabase.from("tailor_profiles").select("*").eq("tailor_id", user.id).maybeSingle();
      if (data) {
        setForm({
          profile_photo: data.profile_photo || "",
          studio_name: data.studio_name || "",
          owner_name: data.owner_name || s.name,
          experience_years: data.experience_years || 0,
          specialization: data.specialization || "",
          location: data.location || "",
          phone: data.phone || "",
          phone_visibility: !!data.phone_visibility,
          bio: data.bio || "",
        });
      } else {
        setForm(f => ({ ...f, owner_name: s.name }));
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
      const path = `profiles/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("sarees").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("sarees").getPublicUrl(path);
      setForm(f => ({ ...f, profile_photo: pub.publicUrl }));
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
      const payload = { ...form, tailor_id: user.id };
      const { error } = await supabase.from("tailor_profiles").upsert(payload, { onConflict: "tailor_id" });
      if (error) throw error;
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <AppShell role="tailor" title="Edit studio profile">
      {loading ? (
        <div className="grid place-items-center rounded-3xl border border-border bg-card p-12 shadow-soft">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-5">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Studio photo</p>
            <div className="mt-3 flex items-center gap-4">
              {form.profile_photo ? (
                <img src={form.profile_photo} alt="" className="h-24 w-24 rounded-2xl object-cover" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-2xl bg-accent text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Studio name" value={form.studio_name} onChange={v => setForm(f => ({ ...f, studio_name: v }))} />
              <Field label="Owner name" value={form.owner_name} onChange={v => setForm(f => ({ ...f, owner_name: v }))} />
              <Field label="Years of experience" type="number" value={String(form.experience_years)} onChange={v => setForm(f => ({ ...f, experience_years: Number(v) || 0 }))} />
              <Field label="Specialization" placeholder="Lehengas, gowns…" value={form.specialization} onChange={v => setForm(f => ({ ...f, specialization: v }))} />
              <Field label="Location" placeholder="City, area" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} />
              <Field label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.phone_visibility} onChange={e => setForm(f => ({ ...f, phone_visibility: e.target.checked }))} />
              Show phone publicly on my profile
            </label>
            <div className="mt-4">
              <label className="block text-sm font-medium">Bio</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm shadow-soft outline-none focus:border-primary"
                placeholder="Tell users about your craft, signature styles, and turnaround time."
              />
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm shadow-soft outline-none focus:border-primary"
      />
    </label>
  );
}
