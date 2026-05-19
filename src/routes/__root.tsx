import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10 shadow-elegant">
        <h1 className="text-7xl font-display text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-medium text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This thread doesn't exist — but your saree's next chapter does.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-transform hover:scale-105"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10 shadow-elegant">
        <h1 className="text-xl font-display">Something went sideways</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border border-border bg-card px-5 py-2 text-sm">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MatchO — Redesign your saree, locally" },
      { name: "description", content: "MatchO connects you with trusted nearby tailors who reimagine your old sarees into modern outfits — lehengas, gowns, kurtas, crop-top sets and more." },
      { property: "og:title", content: "MatchO — Redesign your saree, locally" },
      { property: "og:description", content: "MatchO connects you with trusted nearby tailors who reimagine your old sarees into modern outfits — lehengas, gowns, kurtas, crop-top sets and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MatchO — Redesign your saree, locally" },
      { name: "twitter:description", content: "MatchO connects you with trusted nearby tailors who reimagine your old sarees into modern outfits — lehengas, gowns, kurtas, crop-top sets and more." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f08479e-e365-4b60-80db-453466d345a5/id-preview-d2a0e232--daea0393-50dd-41d9-aef6-f99babbd30f3.lovable.app-1779178050045.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f08479e-e365-4b60-80db-453466d345a5/id-preview-d2a0e232--daea0393-50dd-41d9-aef6-f99babbd30f3.lovable.app-1779178050045.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
