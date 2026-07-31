import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Star, Heart, Phone, Scissors, ImageIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { refreshSession } from "@/lib/session";
import { VerifiedBadges } from "@/components/ChatSafety";


export const Route = createFileRoute("/dashboard/user_/tailors/$tailorId")({
  head: () => ({ meta: [{ title: "Tailor Profile — MatchO" }] }),
  component: TailorProfileView,
});

type Profile = { profile_photo: string | null; studio_name: string | null; owner_name: string | null; experience_years: number | null; specialization: string | null; location: string | null; phone: string | null; phone_visibility: boolean; bio: string | null; verified_tailor?: boolean | null; identity_verified?: boolean | null; portfolio_verified?: boolean | null };
type Portfolio = { id: string; before_image: string | null; after_image: string; title: string | null };
type Review = { id: string; rating: number; review_text: string | null; created_at: string; user_id: string; user_name?: string };

function TailorProfileView() {
  const navigate = useNavigate();
  const { tailorId } = useParams({ from: "/dashboard/user_/tailors/$tailorId" });
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fallbackName, setFallbackName] = useState<string>("Tailor");
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await refreshSession();
      if (!alive) return;
      if (!s) { navigate({ to: "/login", replace: true }); return; }
      if (s.role !== "user") { navigate({ to: "/dashboard/tailor", replace: true }); return; }
      setReady(true);

      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: prof }, { data: baseProf }, { data: port }, { data: revs }, { data: savedRow }] = await Promise.all([
        supabase.from("tailor_profiles").select("*").eq("tailor_id", tailorId).maybeSingle(),
        supabase.from("profiles").select("display_name, city").eq("id", tailorId).maybeSingle(),
        supabase.from("portfolio_items").select("id, before_image, after_image, title").eq("tailor_id", tailorId).order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("tailor_id", tailorId).order("created_at", { ascending: false }).limit(20),
        user ? supabase.from("saved_tailors").select("id").eq("user_id", user.id).eq("tailor_id", tailorId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setProfile(prof as Profile | null);
      if (baseProf) setFallbackName(baseProf.display_name || "Tailor");
      setPortfolio((port as Portfolio[]) || []);

      const list = (revs as Review[]) || [];
      const uids = Array.from(new Set(list.map(r => r.user_id)));
      const { data: profs } = uids.length ? await supabase.from("profiles").select("id, display_name").in("id", uids) : { data: [] as any[] };
      const pm = new Map((profs || []).map((p: any) => [p.id, p.display_name]));
      setReviews(list.map(r => ({ ...r, user_name: pm.get(r.user_id) || "MatchO user" })));

      setSaved(!!savedRow);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [navigate, tailorId]);

  const toggleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (saved) {
      const { error } = await supabase.from("saved_tailors").delete().eq("user_id", user.id).eq("tailor_id", tailorId);
      if (error) { toast.error(error.message); return; }
      setSaved(false);
      toast.success("Removed from saved");
    } else {
      const { error } = await supabase.from("saved_tailors").insert({ user_id: user.id, tailor_id: tailorId });
      if (error) { toast.error(error.message); return; }
      setSaved(true);
      toast.success("Saved tailor");
    }
  };

  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const name = profile?.studio_name || fallbackName;

  return (
    <AppShell role="user" title={name}>
      {loading ? (
        <div className="grid place-items-center rounded-3xl glass p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl glass shadow-soft">
            <div className="grid gap-5 p-6 md:grid-cols-[140px_1fr_auto]">
              {profile?.profile_photo ? (
                <img src={profile.profile_photo} alt="" className="h-32 w-32 rounded-2xl object-cover" />
              ) : (
                <div className="grid h-32 w-32 place-items-center rounded-2xl bg-accent text-muted-foreground"><Scissors className="h-10 w-10" /></div>
              )}
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Studio</p>
                <h2 className="font-display text-2xl">{name}</h2>
                <VerifiedBadges v={profile} className="mt-1" />

                {profile?.owner_name && <p className="text-sm text-muted-foreground">by {profile.owner_name}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {profile?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.location}</span>}
                  {profile?.experience_years ? <span>{profile.experience_years} yrs experience</span> : null}
                  {profile?.specialization && <span>· {profile.specialization}</span>}
                  {avg && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" /> {avg} ({reviews.length})</span>}
                </div>
                {profile?.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
                {profile?.phone_visibility && profile?.phone && (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm"><Phone className="h-3 w-3" /> {profile.phone}</p>
                )}
              </div>
              <button onClick={toggleSave} className={`inline-flex h-10 items-center gap-1 rounded-full px-4 text-sm font-medium ${saved ? "bg-primary text-primary-foreground" : "border border-border bg-background"}`}>
                <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} /> {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          <section>
            <h3 className="mb-3 font-display text-xl">Portfolio</h3>
            {portfolio.length === 0 ? (
              <div className="grid place-items-center rounded-3xl glass p-10 text-center">
                <ImageIcon className="h-7 w-7 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No portfolio entries yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {portfolio.map(p => (
                  <div key={p.id} className="overflow-hidden rounded-3xl glass shadow-soft">
                    <div className="grid grid-cols-2">
                      {p.before_image ? <img src={p.before_image} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-accent" />}
                      <img src={p.after_image} alt="" className="aspect-square w-full object-cover" />
                    </div>
                    {p.title && <div className="p-3 text-sm">{p.title}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 font-display text-xl">Reviews</h3>
            {reviews.length === 0 ? (
              <div className="grid place-items-center rounded-3xl glass p-10 text-center">
                <Star className="h-7 w-7 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="rounded-2xl glass p-4 shadow-soft">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{r.user_name}</p>
                      <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-gold text-gold" />)}</div>
                    </div>
                    {r.review_text && <p className="mt-1 text-sm text-muted-foreground">{r.review_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
