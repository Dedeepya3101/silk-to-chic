import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await refreshSession();
      if (cancelled) return;
      const to = s?.role === "tailor" ? "/dashboard/tailor" : s?.role === "user" ? "/dashboard/user" : "/login";
      navigate({ to, replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);
  return (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      Loading your dashboard…
    </div>
  );
}
