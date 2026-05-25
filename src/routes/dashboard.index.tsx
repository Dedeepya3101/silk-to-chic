import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const navigate = useNavigate();
  useEffect(() => {
    const s = getSession();
    const to = s?.role === "tailor" ? "/dashboard/tailor" : s?.role === "user" ? "/dashboard/user" : "/login";
    navigate({ to, replace: true });
  }, [navigate]);
  return null;
}
