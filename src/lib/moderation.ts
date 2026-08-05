import { supabase } from "@/integrations/supabase/client";

export const SUSPENSION_DURATIONS = [
  { key: "24h", label: "24 Hours", hours: 24 },
  { key: "7d", label: "7 Days", hours: 24 * 7 },
  { key: "30d", label: "30 Days", hours: 24 * 30 },
  { key: "permanent", label: "Permanent", hours: null },
] as const;

export type DurationKey = (typeof SUSPENSION_DURATIONS)[number]["key"];

export const SUSPENSION_REASONS = [
  "Spam",
  "Fraud",
  "Harassment",
  "Fake Portfolio",
  "Repeated Abuse",
  "Other",
] as const;

export type SuspensionReason = (typeof SUSPENSION_REASONS)[number];

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected", "more_info"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  pending: "Pending Verification",
  approved: "Verified",
  rejected: "Rejected",
  more_info: "More Info Requested",
};

export const APPEAL_STATUSES = ["pending", "approved", "rejected", "more_info"] as const;
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

export const APPEAL_LABEL: Record<AppealStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  more_info: "More Info Requested",
};

export function endsAtFor(duration: DurationKey): string | null {
  const found = SUSPENSION_DURATIONS.find((d) => d.key === duration);
  if (!found || found.hours === null) return null;
  return new Date(Date.now() + found.hours * 3600_000).toISOString();
}

export function durationLabel(key?: string | null) {
  return SUSPENSION_DURATIONS.find((d) => d.key === key)?.label || "Permanent";
}

/** A suspension is only active while it has not expired. */
export function suspensionActive(p: { suspended?: boolean | null; suspended_until?: string | null }) {
  if (!p?.suspended) return false;
  if (!p.suspended_until) return true;
  return new Date(p.suspended_until).getTime() > Date.now();
}

export function remainingTime(until?: string | null) {
  if (!until) return "Permanent";
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days) return `${days}d ${hours}h remaining`;
  if (hours) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

async function notify(userId: string, title: string, message: string, link?: string) {
  await supabase.from("notifications").insert({ user_id: userId, title, message, link: link ?? null } as never);
}

export async function suspendAccount(opts: {
  userId: string;
  adminId: string;
  reason: string;
  details?: string;
  duration: DurationKey;
}) {
  const ends_at = endsAtFor(opts.duration);
  const { error: sErr } = await supabase.from("suspensions").insert({
    user_id: opts.userId,
    admin_id: opts.adminId,
    reason: opts.reason,
    details: opts.details || null,
    duration: opts.duration,
    ends_at,
  } as never);
  if (sErr) return sErr;
  const { error } = await supabase
    .from("profiles")
    .update({
      suspended: true,
      suspended_at: new Date().toISOString(),
      suspended_until: ends_at,
      suspension_reason: opts.reason,
      suspended_by: opts.adminId,
    } as never)
    .eq("id", opts.userId);
  if (error) return error;
  await notify(
    opts.userId,
    "Account suspended",
    `Your account has been suspended (${opts.reason}). ${ends_at ? "Duration: " + durationLabel(opts.duration) : "This suspension is permanent."} You may submit an appeal.`,
    "/suspended",
  );
  return null;
}

export async function liftSuspension(userId: string, adminId: string) {
  await supabase
    .from("suspensions")
    .update({ lifted_at: new Date().toISOString(), lifted_by: adminId } as never)
    .eq("user_id", userId)
    .is("lifted_at", null);
  const { error } = await supabase
    .from("profiles")
    .update({ suspended: false, suspended_until: null, suspension_reason: null } as never)
    .eq("id", userId);
  if (error) return error;
  await notify(userId, "Account reactivated", "Your MatchO account has been reactivated. Welcome back.", "/dashboard");
  return null;
}

export async function logModerationAction(opts: {
  reportId?: string | null;
  targetUserId: string;
  adminId: string;
  action: string;
  notes?: string | null;
}) {
  await supabase.from("moderation_actions").insert({
    report_id: opts.reportId ?? null,
    target_user_id: opts.targetUserId,
    admin_id: opts.adminId,
    action: opts.action,
    notes: opts.notes ?? null,
  } as never);
}

export { notify as notifyMember };
