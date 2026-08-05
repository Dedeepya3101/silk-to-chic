import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  SUSPENSION_DURATIONS, SUSPENSION_REASONS, type DurationKey,
} from "@/lib/moderation";

/** Confirmation dialog collecting duration + reason before suspending an account. */
export function SuspendDialog({
  open, onOpenChange, memberName, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memberName: string;
  onConfirm: (opts: { duration: DurationKey; reason: string; details: string }) => Promise<void>;
}) {
  const [duration, setDuration] = useState<DurationKey>("24h");
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!reason) return;
    setBusy(true);
    await onConfirm({ duration, reason, details: details.trim() });
    setBusy(false);
    setReason("");
    setDetails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suspend {memberName}</DialogTitle>
          <DialogDescription>
            The account is never deleted. Access to marketplace actions is blocked for the selected period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Duration</p>
            <div className="flex flex-wrap gap-2">
              {SUSPENSION_DURATIONS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDuration(d.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    duration === d.key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason (required)</p>
            <div className="flex flex-wrap gap-2">
              {SUSPENSION_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    reason === r
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            placeholder="Internal notes (optional)"
          />
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={() => void confirm()}
            disabled={busy || !reason}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm suspension
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
