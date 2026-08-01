import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AdminUser = { id: string; email: string; name: string };

/** Guards an admin surface. Non-admins are sent to the homepage. */
export function useAdminGuard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        navigate({ to: "/admin/login", replace: true });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin" as never)
        .maybeSingle();
      if (!active) return;
      if (!roleRow) {
        navigate({ to: "/", replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setAdmin({
        id: user.id,
        email: profile?.email || user.email || "",
        name: profile?.display_name || "Administrator",
      });
      setChecking(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  return { admin, checking };
}

export const REPORT_STATUSES = ["pending", "under_review", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export function statusClass(status: string) {
  switch (status) {
    case "resolved": return "bg-primary/15 text-primary border-primary/30";
    case "under_review": return "bg-secondary text-secondary-foreground border-border";
    case "dismissed": return "bg-muted text-muted-foreground border-border";
    default: return "bg-destructive/10 text-destructive border-destructive/30";
  }
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
