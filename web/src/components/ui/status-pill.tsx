import { cn } from "@/lib/cn";
import type { ClaimStatus } from "@/core/domain/types";

const STATUS_STYLES: Record<ClaimStatus, string> = {
  Paid: "bg-success-bg text-success-fg ring-success/20",
  Endorsed: "bg-accent-subtle text-accent ring-accent/20",
  Pending: "bg-warning-bg text-warning-fg ring-warning/20",
  Rejected: "bg-danger-bg text-danger-fg ring-danger/20",
};

/** Desaturated pastel status pill with a hairline ring (semantic color). */
export function StatusPill({
  status,
  className,
}: {
  status: ClaimStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
