import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — MatchO" }] }),
  component: MessagesRedirect,
});

function MessagesRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    (async () => {
      const s = await refreshSession();
      if (!active) return;
      if (!s) { navigate({ to: "/login", replace: true }); return; }
      navigate({
        to: s.role === "tailor" ? "/dashboard/tailor/messages" : "/dashboard/user/messages",
        replace: true,
      });
    })();
    return () => { active = false; };
  }, [navigate]);
  return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Opening messages…</div>;
}
