import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
            <span className="font-display text-lg">MatchO</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Redesign your sarees with trusted local tailors. Less waste. More magic.
          </p>
        </div>
        <div>
          <p className="font-medium">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>How it works</li><li>For tailors</li><li>Safety</li>
          </ul>
        </div>
        <div>
          <p className="font-medium">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>About</li><li>Sustainability</li><li>Careers</li>
          </ul>
        </div>
        <div>
          <p className="font-medium">Stay in the loop</p>
          <form className="mt-3 flex overflow-hidden rounded-full border border-border bg-card shadow-soft">
            <input className="w-full bg-transparent px-4 py-2 text-sm outline-none" placeholder="you@email.com" />
            <button className="bg-gradient-primary px-4 text-sm font-medium text-primary-foreground">Join</button>
          </form>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © 2026 MatchO. Crafted with care.
      </div>
    </footer>
  );
}
