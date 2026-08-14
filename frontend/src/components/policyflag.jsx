import { useMemo } from "react";
import { ShieldCheck, UserCheck, Ban, ScanLine } from "lucide-react";
import {
  evaluatePolicies,
  claimContextFromForm,
} from "../lib/policy.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip.jsx";
import { cn } from "../lib/utils.js";

// Our tooltip, not the browser's. The native `title` renders at whatever
// width and position the OS picks — a rule note was drawing itself as a wide
// slab across the queue's search box. This one wraps inside a measured
// column and steps out of the way of controls.
function FlagTip({ text, children }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const ICON = {
  "auto-approve": ShieldCheck,
  "route-to-human": UserCheck,
  block: Ban,
};

/**
 * Routing to a human is what happens to most claims — roughly two thirds of
 * them — so amber on it painted the ordinary outcome in the colour that means
 * attention, down entire columns. Nothing stood out because everything did.
 * It is neutral now; a block is the exception and stays red.
 */
const TONE = {
  "auto-approve": "text-success-text bg-success-bg border-success/20",
  "route-to-human": "text-text-secondary bg-subtle border-border-subtle",
  block: "text-danger-text bg-danger-bg border-danger/20",
};

const SHORT_LABEL = {
  "auto-approve": "In policy",
  "route-to-human": "Needs review",
  block: "Blocked",
};

/**
 * A claim that has already been settled. The flag is advice about a decision
 * still to be made, so re-running the rules against one of these says nothing
 * anyone can act on — and reads as a contradiction. "Paid" beside "Blocked" is
 * the case that gave this away: the money left the account weeks ago, and the
 * row still claimed policy would stop it. The rules can also have changed since,
 * which makes today's verdict on last quarter's claim actively misleading.
 */
const SETTLED = new Set(["Endorsed", "Paid", "Rejected", "Withdrawn"]);

/**
 * Inline flag indicator for a claim row. Two variants:
 *  - variant="dot"  : tiny coloured dot + native title tooltip (use in dense tables)
 *  - variant="chip" : small chip with icon + short label + tooltip (use in cards)
 *
 * Pass `hideAutoApproved` to suppress green flag for routine auto-approves
 * (useful in queue views where only the flagged items matter).
 */
export default function PolicyFlag({
  claim,
  variant = "chip",
  hideAutoApproved = false,
  className,
}) {
  const policy = useMemo(() => {
    if (!claim) return null;
    return evaluatePolicies(
      claimContextFromForm({
        category: claim.type,
        amount: claim.amount,
        receiptUrl: claim.receiptUrl,
        expenseDate: claim.date,
        // Six of the eleven rules read `details.*`, and three of those are
        // blocks. Leaving details out made every one of them see a missing
        // field, so this chip stamped a red "Blocked" on every pending Client
        // Entertainment and Training claim in the queue — a verdict no live
        // claim can hold, since a block is refused at submission with a 422.
        // The claim record and the review modal pass details and disagreed.
        details: claim.details || {},
        supplierGstRegNumber: claim.supplierGstRegNumber ?? null,
      }),
    );
  }, [claim]);

  if (!policy) return null;
  if (claim.withdrawn || SETTLED.has(claim.status)) return null;

  // The API withholds a recommendation when the scan could not read the
  // receipt, and tells the approver so in the notification — but the queue,
  // which is where they triage, showed nothing at all on these rows: a clean
  // auto-approve is hidden there, and that is what the rules alone return. So
  // the one claim where every field was typed by hand looked like the least
  // interesting row on the page.
  const scanFailed = claim.ocrSource === "unavailable";
  const scanIncomplete = claim.details?.ocrIncomplete === true;
  if (policy.outcome === "auto-approve" && (scanFailed || scanIncomplete)) {
    const why = scanFailed
      ? "The scan could not read this receipt — every field was typed in by hand."
      : "The scan could not read every field — some were typed in by hand.";
    return (
      <FlagTip text={`${why} Check them against the image.`}>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-ds-chip border px-1.5 py-0.5 text-[12px] font-medium",
            "text-warning-text bg-warning-bg border-warning/20",
            className,
          )}
          aria-label={`${why} Check them against the image.`}
        >
          <ScanLine className="h-2.5 w-2.5" />
          Check by hand
        </span>
      </FlagTip>
    );
  }

  if (hideAutoApproved && policy.outcome === "auto-approve") return null;

  const Icon = ICON[policy.outcome];
  const tooltip = policy.label
    ? `${policy.label}: ${policy.message}`
    : policy.message;

  if (variant === "dot") {
    const dotColor =
      policy.outcome === "auto-approve"
        ? "bg-success"
        : policy.outcome === "route-to-human"
          ? "bg-warning"
          : "bg-destructive";
    return (
      <FlagTip text={tooltip}>
        <span
          className={cn(
            "inline-flex h-1.5 w-1.5 rounded-full",
            dotColor,
            className,
          )}
          aria-label={tooltip}
        />
      </FlagTip>
    );
  }

  return (
    <FlagTip text={tooltip}>
      <span
        className={cn(
          // Squared and at 12px: it was a fully rounded capsule set in 10px
          // text, which is both the generated-UI shape and under the floor
          // nothing inside the workspace is allowed to go below.
          "inline-flex items-center gap-1 rounded-ds-chip border px-1.5 py-0.5 text-[12px] font-medium",
          TONE[policy.outcome],
          className,
        )}
        aria-label={tooltip}
      >
        <Icon className="h-2.5 w-2.5" />
        {SHORT_LABEL[policy.outcome]}
      </span>
    </FlagTip>
  );
}
