import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/AdminShell";

export const Route = createFileRoute("/dashboard/admin_/settings")({
  head: () => ({
    meta: [
      { title: "Admin settings — MatchO Admin" },
      { name: "description", content: "Configure platform name, contact email, safety notice and verification rules for MatchO." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin settings — MatchO Admin" },
      { property: "og:description", content: "Configure platform name, contact email, safety notice and verification rules for MatchO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSettings,
});

type Settings = {
  id: string;
  platform_name: string;
  contact_email: string;
  safety_notice: string;
  report_categories: string[];
  require_identity_verification: boolean;
  require_portfolio_verification: boolean;
  auto_verify_tailors: boolean;
};

function AdminSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("admin_settings").select("*").limit(1).maybeSingle();
      if (active && data) setS(data as unknown as Settings);
    })();
    return () => { active = false; };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    const { error } = await supabase
      .from("admin_settings")
      .update({
        platform_name: s.platform_name,
        contact_email: s.contact_email,
        safety_notice: s.safety_notice,
        report_categories: s.report_categories,
        require_identity_verification: s.require_identity_verification,
        require_portfolio_verification: s.require_portfolio_verification,
        auto_verify_tailors: s.auto_verify_tailors,
      } as never)
      .eq("id", s.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Platform settings saved");
  };

  if (!s) {
    return <AdminShell title="Admin settings"><p className="text-sm text-muted-foreground">Loading settings…</p></AdminShell>;
  }

  const field = "mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-soft outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40";

  const toggles: { key: keyof Settings; label: string; hint: string }[] = [
    { key: "require_identity_verification", label: "Require identity verification", hint: "Tailors must pass identity checks before badges are granted." },
    { key: "require_portfolio_verification", label: "Require portfolio verification", hint: "Portfolios are reviewed before a tailor is marked verified." },
    { key: "auto_verify_tailors", label: "Auto-verify new tailors", hint: "New studios receive the verified badge on registration." },
  ];

  return (
    <AdminShell title="Admin settings" subtitle="Platform-wide configuration stored in the backend">
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h2 className="font-display text-xl">Platform</h2>
          <label className="mt-4 block">
            <span className="text-sm font-medium">Platform name</span>
            <input className={field} value={s.platform_name} onChange={(e) => setS({ ...s, platform_name: e.target.value })} required />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium">Contact email</span>
            <input type="email" className={field} value={s.contact_email} onChange={(e) => setS({ ...s, contact_email: e.target.value })} required />
          </label>
        </AdminCard>

        <AdminCard>
          <h2 className="font-display text-xl">Safety notice</h2>
          <textarea
            rows={5}
            className={field}
            value={s.safety_notice}
            onChange={(e) => setS({ ...s, safety_notice: e.target.value })}
          />
          <p className="mt-2 text-xs text-muted-foreground">Shown to members alongside the in-chat safety reminder.</p>
        </AdminCard>

        <AdminCard>
          <h2 className="font-display text-xl">Report categories</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.report_categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full border border-border bg-accent/60 px-3 py-1 text-xs">
                {c}
                <button type="button" aria-label={`Remove ${c}`}
                  onClick={() => setS({ ...s, report_categories: s.report_categories.filter((x) => x !== c) })}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input className={field} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Add a category" />
            <button type="button"
              onClick={() => {
                const v = newCat.trim();
                if (!v || s.report_categories.includes(v)) return;
                setS({ ...s, report_categories: [...s.report_categories, v] });
                setNewCat("");
              }}
              className="mt-1.5 shrink-0 rounded-2xl border border-border px-4 text-sm hover:bg-accent">Add</button>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="font-display text-xl">Verification</h2>
          <div className="mt-3 space-y-2">
            {toggles.map((t) => (
              <div key={t.key as string} className="flex items-start justify-between gap-3 rounded-2xl bg-accent/50 px-3 py-2">
                <div>
                  <p className="text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </div>
                <button type="button"
                  aria-pressed={!!s[t.key]}
                  onClick={() => setS({ ...s, [t.key]: !s[t.key] })}
                  className={`mt-0.5 shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    s[t.key] ? "bg-foreground text-background" : "border border-border bg-card text-muted-foreground"
                  }`}>
                  {s[t.key] ? "On" : "Off"}
                </button>
              </div>
            ))}
          </div>
        </AdminCard>

        <div className="lg:col-span-2">
          <button disabled={saving} className="flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
