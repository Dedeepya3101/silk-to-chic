import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Upload, Users, MessageCircle, Handshake, Sparkles, Leaf, Heart, Star, ShieldCheck, MapPin, Scissors } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import heroSaree from "@/assets/hero-saree.jpg";
import transformAfter from "@/assets/transform-after.jpg";
import saree1 from "@/assets/saree-1.jpg";
import saree2 from "@/assets/saree-2.jpg";
import saree3 from "@/assets/saree-3.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MatchO — Redesign your saree, locally" },
      { name: "description", content: "Upload your saree, get redesign ideas from trusted nearby tailors, meet offline, and wear your story again." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      <Hero />
      <Logos />
      <Problem />
      <HowItWorks />
      <Sustainability />
      <TailorEmpowerment />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium text-foreground/80 shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Reimagine the sarees in your closet
          </span>
          <h1 className="mt-5 text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
            Your old saree.<br />
            <span className="text-gradient">A brand-new outfit.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            MatchO connects you with trusted local tailors who reimagine your unused sarees into modern lehengas, gowns, kurtas and crop-top sets. Upload, discuss, meet offline — wear your story again.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-medium text-primary-foreground shadow-elegant transition-transform hover:scale-[1.03]">
              Upload your first saree
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-medium shadow-soft hover:bg-accent">
              Join as a tailor
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[saree1, saree2, saree3].map((s) => (
                <img key={s} src={s} alt="" className="h-8 w-8 rounded-full border-2 border-background object-cover" />
              ))}
            </div>
            <span><b className="text-foreground">2,400+</b> sarees reimagined this season</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-6 -top-6 h-40 w-40 rounded-full bg-secondary/40 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative grid grid-cols-5 grid-rows-5 gap-3">
            <img src={heroSaree} alt="Vintage saree on marble" width={1536} height={1280}
              className="col-span-3 row-span-3 h-full w-full rounded-3xl object-cover shadow-float" />
            <img src={transformAfter} alt="Modern outfit redesigned from saree" width={1024} height={1280} loading="lazy"
              className="col-span-2 row-span-5 h-full w-full rounded-3xl object-cover shadow-float animate-float" />
            <div className="col-span-3 row-span-2 glass rounded-3xl p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <img src={saree2} alt="" className="h-12 w-12 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-medium">Meera, Bengaluru</p>
                  <p className="text-xs text-muted-foreground">Turned a 1998 silk into a crop-top set</p>
                </div>
                <div className="ml-auto flex items-center gap-0.5 text-gold">
                  {[...Array(5)].map((_,i)=><Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground/80">
                "Three tailors responded in an hour. I picked the one closest to me."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Logos() {
  return (
    <div className="mx-auto max-w-6xl border-y border-border/60 px-6 py-6">
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span>Featured in</span>
        <span className="font-display text-base normal-case">Vogue India</span>
        <span className="font-display text-base normal-case">YourStory</span>
        <span className="font-display text-base normal-case">The Hindu</span>
        <span className="font-display text-base normal-case">Elle</span>
        <span className="font-display text-base normal-case">LBB</span>
      </div>
    </div>
  );
}

function Problem() {
  const items = [
    { icon: Heart, title: "Sarees gathering dust", text: "The average Indian closet holds 12+ sarees unworn for over 3 years." },
    { icon: Sparkles, title: "Redesign ideas are scattered", text: "Pinterest boards don't tell you what's actually possible with your fabric." },
    { icon: Scissors, title: "Local tailors stay invisible", text: "Brilliant artisans next door, lost in word-of-mouth chains." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">The problem</p>
        <h2 className="mt-2 text-4xl sm:text-5xl">A closet full of stories, waiting to be retold.</h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass rounded-3xl p-7 shadow-soft transition-transform hover:-translate-y-1">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-xl">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Upload, title: "Upload your saree", text: "Snap a photo, describe the fabric and the vibe you want." },
    { icon: Users, title: "Nearby tailors respond", text: "Verified local artisans send styling ideas tailored to your saree." },
    { icon: MessageCircle, title: "Discuss the redesign", text: "Chat safely in-app — sketches, sleeve ideas, color pairings." },
    { icon: Handshake, title: "Meet offline", text: "Pick a tailor, set a time, take fabric in for measurements." },
    { icon: Sparkles, title: "Wear it again", text: "Pick up your transformed outfit and share the story." },
  ];
  return (
    <section id="how" className="relative overflow-hidden py-20">
      <div className="absolute inset-0 bg-gradient-hero opacity-60" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-medium text-primary">How MatchO works</p>
          <h2 className="mt-2 text-4xl sm:text-5xl">From folded silk to favourite outfit, in five steps.</h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-5">
          {steps.map((s, i) => (
            <div key={s.title} className="relative glass rounded-3xl p-6 shadow-soft">
              <span className="absolute -top-3 right-4 rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">0{i+1}</span>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"><s.icon className="h-4 w-4" /></div>
              <h3 className="mt-4 text-lg">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sustainability() {
  return (
    <section id="sustain" className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="relative">
          <img src={saree1} alt="Lavender saree" loading="lazy" width={768} height={768}
            className="rounded-3xl shadow-float" />
          <div className="absolute -bottom-6 -right-4 glass rounded-2xl px-5 py-4 shadow-elegant">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground"><Leaf className="h-5 w-5" /></div>
              <div>
                <p className="font-display text-2xl">7.2 tons</p>
                <p className="text-xs text-muted-foreground">textile waste avoided in 2025</p>
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-primary">Sustainability</p>
          <h2 className="mt-2 text-4xl sm:text-5xl">Reuse, not refuse.</h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Every saree given a second life is fabric that doesn't reach a landfill. MatchO is built around the slow-fashion belief that the most sustainable garment is the one already in your wardrobe.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Zero new textile produced per redesign","Powering circular local economies","Heirloom fabrics, modern silhouettes"].map(t => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
                  <Leaf className="h-3 w-3" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function TailorEmpowerment() {
  return (
    <section id="tailors" className="relative py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="glass overflow-hidden rounded-[2.5rem] p-8 shadow-elegant md:p-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-primary">For tailors</p>
              <h2 className="mt-2 text-4xl sm:text-5xl">A storefront for the artisan next door.</h2>
              <p className="mt-5 text-lg text-muted-foreground">
                Showcase your craft, get discovered by people in your neighbourhood, and grow a verified profile customers actually trust.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  { v: "+38%", l: "avg. monthly orders" },
                  { v: "2.4k", l: "tailors on MatchO" },
                  { v: "4.8★", l: "avg. rating" },
                ].map(s => (
                  <div key={s.l} className="rounded-2xl bg-card p-4 shadow-soft">
                    <p className="font-display text-2xl text-gradient">{s.v}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
              <Link to="/register" className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-medium text-primary-foreground shadow-soft hover:scale-[1.03]">
                Apply as a tailor <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative">
              <TailorPreviewCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TailorPreviewCard() {
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5 shadow-float">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary font-display text-lg text-primary-foreground">R</div>
          <div className="flex-1">
            <p className="font-medium">Rohini Tailoring Studio</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Indiranagar · 1.2 km away</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
            <ShieldCheck className="h-3 w-3" /> Verified
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Orders" value="248" />
          <Stat label="Rating" value="4.9★" />
          <Stat label="Replies in" value="< 1h" />
        </div>
      </div>
      <div className="glass rounded-3xl p-5 shadow-soft">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">New saree request · 3 min ago</p>
        <div className="mt-3 flex gap-3">
          <img src={saree2} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Mom's pink Kanjivaram → crop-top set?</p>
            <p className="text-muted-foreground">Cocktail · soft pink · light gold border</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-full bg-gradient-primary py-2 text-sm font-medium text-primary-foreground">Send suggestion</button>
          <button className="rounded-full border border-border bg-card px-4 text-sm">View</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-2 shadow-soft">
      <p className="font-display text-base">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Testimonials() {
  const items = [
    { name: "Aanya, Mumbai", quote: "I uploaded my grandmother's saree at midnight. By morning, four tailors had sent the loveliest mood boards.", color: "bg-blush" },
    { name: "Vikram, Tailor · Pune", quote: "MatchO put me on the map. I've doubled my orders without spending a rupee on ads.", color: "bg-lavender" },
    { name: "Diya, Delhi", quote: "Got a gorgeous Indo-Western dress out of a saree I almost donated. Cried a little, honestly.", color: "bg-cream" },
  ];
  return (
    <section id="stories" className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Stories</p>
        <h2 className="mt-2 text-4xl sm:text-5xl">Loved by closets and craftspeople.</h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.name} className="glass rounded-3xl p-7 shadow-soft">
            <div className="flex gap-0.5 text-gold">{[...Array(5)].map((_,i)=><Star key={i} className="h-4 w-4 fill-current" />)}</div>
            <blockquote className="mt-4 font-display text-xl leading-snug">"{t.quote}"</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className={`h-9 w-9 rounded-full ${t.color}`} />
              <span className="text-sm text-muted-foreground">{t.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-6 py-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-gradient-primary p-10 shadow-elegant md:p-16">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative text-primary-foreground">
          <h2 className="max-w-2xl text-4xl sm:text-5xl">Your next favourite outfit is folded in your cupboard.</h2>
          <p className="mt-4 max-w-xl text-primary-foreground/80">Join MatchO today — free for both users and tailors.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-full bg-background px-6 py-3 font-medium text-foreground shadow-soft hover:scale-[1.03]">Upload a saree</Link>
            <Link to="/register" className="rounded-full border border-white/40 bg-white/10 px-6 py-3 font-medium text-primary-foreground backdrop-blur-md hover:bg-white/20">I'm a tailor</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
