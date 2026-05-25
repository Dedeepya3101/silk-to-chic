import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    const s = getSession();
    setTo(s?.role === "tailor" ? "/dashboard/tailor" : s?.role === "user" ? "/dashboard/user" : "/login");
  }, []);
  if (!to) return null;
  return <Navigate to={to} replace />;
}
