import { useState } from "react";
import { AlertTriangle, ShieldCheck, Flag, Ban, MoreHorizontal, BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_REASONS, type ReportReason } from "@/lib/safety";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

/** Part 2 — persistent lightweight safety reminder at the top of a conversation. */
export function SafetyReminder() {
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-border bg-accent/60 px-4 py-3 text-xs text-accent-foreground">
      <p className="flex items-center gap-1.5 font-medium">
        <ShieldCheck className="h-3.5 w-3.5" /> For your safety:
      </p>
      <ul className="mt-1 space-y-0.5 opacity-90">
        <li>• Avoid advance payments.</li>
        <li>• Do not share OTPs.</li>
        <li>• Meet only after both parties agree.</li>
        <li>• Verify the tailor profile before proceeding.</li>
      </ul>
    </div>
  );
}

/** Part 1 — non-blocking warning shown above the chat input. */
export function SafetyWarningBanner() {
  return (
    <div className="mx-4 mb-2 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <p className="font-medium">MatchO Safety Notice</p>
        <p className="opacity-90">
          Avoid sharing personal phone numbers, exact addresses, payment information, OTPs, or making
          advance payments until you trust the other person.
        </p>
      </div>
    </div>
  );
}

/** Part 5 — verified badges beside a tailor name. */
export type Verification = {
  verified_tailor?: boolean | null;
  identity_verified?: boolean | null;
  portfolio_verified?: boolean | null;
};

export function VerifiedBadges({ v, className = "" }: { v?: Verification | null; className?: string }) {
  if (!v) return null;
  const items: string[] = [];
  if (v.verified_tailor) items.push("Verified Tailor");
  if (v.identity_verified) items.push("Identity Verified");
  if (v.portfolio_verified) items.push("Portfolio Verified");
  if (!items.length) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 align-middle ${className}`}>
      {items.map((label) => (
        <span
          key={label}
          title={label}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          <BadgeCheck className="h-3 w-3 text-primary" />
          {label}
        </span>
      ))}
    </span>
  );
}

/** Parts 3 & 4 — report / block menu for a conversation. */
export function ConversationSafetyMenu({
  meId,
  otherUserId,
  suggestionId,
  blockedByMe,
  onBlockChange,
}: {
  meId: string;
  otherUserId: string;
  suggestionId: string;
  blockedByMe: boolean;
  onBlockChange: (blocked: boolean) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("Spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submitReport = async () => {
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: meId,
      reported_user_id: otherUserId,
      suggestion_id: suggestionId,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setReportOpen(false);
    setDetails("");
    toast.success("Report submitted. Our team will review it.");
  };

  const toggleBlock = async () => {
    if (blockedByMe) {
      const { error } = await supabase
        .from("blocks").delete().eq("blocker_id", meId).eq("blocked_id", otherUserId);
      if (error) { toast.error(error.message); return; }
      onBlockChange(false);
      toast.success("User unblocked.");
    } else {
      const { error } = await supabase
        .from("blocks").insert({ blocker_id: meId, blocked_id: otherUserId });
      if (error) { toast.error(error.message); return; }
      onBlockChange(true);
      toast.success("User blocked. You can no longer send messages.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Conversation options"
            className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-soft"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover">
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" /> Report
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void toggleBlock()}>
            <Ban className="mr-2 h-4 w-4" /> {blockedByMe ? "Unblock" : "Block"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this conversation</DialogTitle>
            <DialogDescription>
              Tell us what went wrong. The conversation stays visible to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
                <input
                  type="radio"
                  name="report-reason"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-primary"
                />
                {r}
              </label>
            ))}
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              placeholder="Add details (optional)"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => void submitReport()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit report
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Shown in place of the composer when a block is active. */
export function BlockedComposerNotice() {
  return (
    <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">
      You cannot send messages because this user has been blocked.
    </div>
  );
}
