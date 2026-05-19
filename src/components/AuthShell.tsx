import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import heroSaree from "@/assets/hero-saree.jpg";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-6 lg:grid-cols-2 lg:py-10">
        <aside className="relative hidden overflow-hidden rounded-[2rem] shadow-float lg:block">
          <img src={heroSaree} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-secondary/40" />
          <div className="relative flex h-full flex-col justify-between p-10 text-foreground">
            <Link to="/" className="flex w-fit items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-display text-lg">MatchO</span>
            </Link>
            <div className="glass rounded-3xl p-6">
              <p className="font-display text-2xl leading-snug">"Three tailors replied within an hour. I picked the one closest to me — and now I have my favourite lehenga."</p>
              <p className="mt-3 text-sm text-muted-foreground">Meera, Bengaluru</p>
            </div>
          </div>
        </aside>

        <main className="flex flex-col justify-center">
          <div className="mx-auto w-full max-w-md">
            <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
              <span className="font-display text-lg">MatchO</span>
            </Link>
            <h1 className="text-4xl">{title}</h1>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
            <div className="mt-8 glass rounded-3xl p-7 shadow-soft">{children}</div>
            {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}

export function TextField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input {...props}
        className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-soft outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40" />
    </label>
  );
}
