import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto mt-4 max-w-6xl px-4">
        <nav className="glass flex items-center justify-between rounded-full px-4 py-2.5 shadow-soft sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-lg tracking-tight">MatchO</span>
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">How it works</a>
            <a href="#sustain" className="text-sm text-muted-foreground hover:text-foreground">Sustainability</a>
            <a href="#tailors" className="text-sm text-muted-foreground hover:text-foreground">For tailors</a>
            <a href="#stories" className="text-sm text-muted-foreground hover:text-foreground">Stories</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm text-foreground hover:bg-accent sm:inline-flex">Sign in</Link>
            <Link to="/register" className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-transform hover:scale-[1.03]">
              Get started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
