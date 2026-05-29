import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessagesView } from "@/components/MessagesView";
import { refreshSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/tailor_/messages")({
  head: () => ({ meta: [{ title: "Conversations — MatchO Tailor" }] }),
  component: TailorMessages,
});

function TailorMessages() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const s = await refreshSession();
      if (!active) return;
      if (!s) { navigate({ to: "/login", replace: true }); return; }
      if (s.role !== "tailor") { navigate({ to: "/dashboard/user/messages", replace: true }); return; }
      setReady(true);
    })();
    return () => { active = false; };
  }, [navigate]);
  if (!ready) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  return <MessagesView role="tailor" />;
}
