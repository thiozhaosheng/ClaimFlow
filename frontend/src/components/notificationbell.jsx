import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
  PenLine,
  Reply,
  ScanLine,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover.jsx";
import { useNotifications } from "../hooks/useNotifications.js";
import { cn } from "../lib/utils.js";
import "./notification-stack.css";

const ICON_BY_KIND = {
  recommended: ShieldCheck,
  "route-to-human": Eye,
  "ocr-unavailable": ScanLine,
  "ocr-incomplete": ScanLine,
  "claim-endorsed": CircleCheck,
  "claim-rejected": CircleX,
  "claim-paid": Wallet,
  "claim-edited": CircleAlert,
  "receipt-needs-attention": ScanLine,
  "changes-requested": PenLine,
  "correction-submitted": Reply,
};

const TONE_BY_KIND = {
  recommended: "text-success-text bg-success-bg",
  "route-to-human": "text-accent bg-accent-subtle",
  "ocr-unavailable": "text-warning-text bg-warning-bg",
  "ocr-incomplete": "text-warning-text bg-warning-bg",
  "claim-endorsed": "text-accent bg-accent-subtle",
  "claim-rejected": "text-danger-text bg-danger-bg",
  "claim-paid": "text-success-text bg-success-bg",
  "claim-edited": "text-text-secondary bg-subtle",
  "receipt-needs-attention": "text-text-secondary bg-subtle",
  "changes-requested": "text-warning-text bg-warning-bg",
  "correction-submitted": "text-accent bg-accent-subtle",
};

// Priority stack: work that blocks a claim first, one-click approvals next,
// pure status updates last.
//
// Both sides of the correction loop sit in "Action needed": the submitter has
// named fields to fix, and the approver has a corrected claim to re-check.
// Either one left sitting is a claim nobody is moving.
const SECTIONS = [
  {
    key: "action",
    label: "Action needed",
    kinds: [
      "changes-requested",
      "correction-submitted",
      "route-to-human",
      "ocr-unavailable",
      "ocr-incomplete",
    ],
  },
  {
    key: "ready",
    label: "Ready to approve",
    kinds: ["recommended"],
  },
  {
    key: "fyi",
    label: "For your information",
    kinds: [], // catch-all
  },
];

// Rows that carry the warning treatment — something is wrong with the claim
// and a person has to reconcile it against the receipt.
const WARNING_KINDS = new Set([
  "ocr-unavailable",
  "ocr-incomplete",
  "changes-requested",
]);
const ACTIONABLE_KINDS = new Set([
  "route-to-human",
  "ocr-unavailable",
  "ocr-incomplete",
  "recommended",
  "changes-requested",
  "correction-submitted",
]);

// Pull "Merchant, Date" out of the backend hint so the action line can say
// exactly which fields were hand-typed.
function ocrMissingFields(hint) {
  const match = /couldn't read:?\s*([^—]+?)\s*—/.exec(hint || "");
  return match ? match[1].trim() : null;
}

// Pull "Amount, GST" out of the backend title ("Fix Amount, GST on your meal
// claim") so the row names the fields rather than saying "some details".
function requestedFields(title) {
  const match = /^Fix\s+(.+?)\s+on your\b/.exec(title || "");
  return match ? match[1].trim() : null;
}

// Every row states its next action in plain words — nobody should have to
// work out what a notification wants from them.
function nextAction(n) {
  switch (n.kind) {
    case "route-to-human":
      return "Review this claim yourself — a policy rule needs your judgement.";
    case "ocr-unavailable":
      return "Verify every typed field against the receipt — the scan could not read it.";
    case "ocr-incomplete": {
      const fields = ocrMissingFields(n.hint);
      return fields
        ? `Verify the typed fields against the receipt — the scan couldn't read: ${fields}.`
        : "Verify the typed fields against the receipt — the scan couldn't read some of them.";
    }
    case "recommended":
      return "Open the claim, confirm the receipt matches, then approve.";
    case "changes-requested": {
      const fields = requestedFields(n.title);
      return fields
        ? `Open the claim, correct ${fields} and save — it goes straight back for approval.`
        : "Open the claim, correct the fields your approver named and save — it goes straight back for approval.";
    }
    case "correction-submitted":
      return "Re-check the corrected fields against the receipt, then approve.";
    case "claim-endorsed":
      return "No action needed — it is with finance for payment.";
    case "claim-rejected":
      return "Read the reason, then fix and resubmit if it still applies.";
    case "claim-paid":
      return "No action needed — the payout is done.";
    case "claim-edited":
      return "Open the claim to see what changed.";
    case "receipt-needs-attention":
      return "No action needed — your approver will double-check the typed details.";
    default:
      return null;
  }
}

function sectionOf(kind) {
  for (const section of SECTIONS) {
    if (section.kinds.includes(kind)) return section.key;
  }
  return "fyi";
}

function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
  });
}

// Collapse repeats: one row per claim, represented by its newest
// notification; older ones are folded into the count and marked read
// together. Items arrive newest-first from the API.
function stackItems(items) {
  const byClaim = new Map();
  const standalone = [];

  for (const n of items) {
    if (n.claimId == null) {
      standalone.push({ latest: n, ids: [n.id], unreadIds: n.readAt ? [] : [n.id], count: 1 });
      continue;
    }
    const existing = byClaim.get(n.claimId);
    if (existing) {
      existing.ids.push(n.id);
      if (!n.readAt) existing.unreadIds.push(n.id);
      existing.count += 1;
    } else {
      byClaim.set(n.claimId, {
        latest: n,
        ids: [n.id],
        unreadIds: n.readAt ? [] : [n.id],
        count: 1,
      });
    }
  }

  const stacked = [...byClaim.values(), ...standalone];
  const grouped = { action: [], ready: [], fyi: [] };
  for (const entry of stacked) {
    grouped[sectionOf(entry.latest.kind)].push(entry);
  }
  return grouped;
}

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const grouped = useMemo(() => stackItems(items), [items]);

  const openEntry = (entry) => {
    // Acknowledge the whole stack for this claim, not just the visible row.
    for (const id of entry.unreadIds) markRead(id);
    setOpen(false);
    const claimId = entry.latest.claimId;
    if (claimId != null) {
      navigate(`/claim/CLM-${String(claimId).padStart(3, "0")}`);
    }
  };

  const renderRow = (entry) => {
    const n = entry.latest;
    const Icon = ICON_BY_KIND[n.kind] || Bell;
    const tone = TONE_BY_KIND[n.kind] || "text-text-secondary bg-subtle";
    const isUnread = entry.unreadIds.length > 0;
    const action = nextAction(n);
    const isWarning = WARNING_KINDS.has(n.kind);
    const isActionable = ACTIONABLE_KINDS.has(n.kind);
    // The action line already carries the OCR hint's substance; only show
    // the raw hint when it adds detail (rule context for judgement calls).
    const showHint = n.hint && (n.kind === "route-to-human" || n.kind === "recommended");

    return (
      <li key={n.id}>
        <button
          type="button"
          onClick={() => openEntry(entry)}
          className={cn(
            "notif-row",
            isWarning && "notif-row-warning",
            isActionable && "notif-row-actionable",
            isUnread && "is-unread",
          )}
        >
          <span className={cn("notif-icon", tone)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="notif-main">
            <span className="notif-top">
              <span className="notif-title">{n.title}</span>
              <span className="notif-time">{timeAgo(n.createdAt)}</span>
            </span>
            {action && <span className="notif-action">{action}</span>}
            {showHint && <span className="notif-hint">{n.hint}</span>}
            <span className="notif-meta">
              {n.body}
              {entry.count > 1 &&
                ` · ${entry.count - 1} earlier update${entry.count - 1 === 1 ? "" : "s"}`}
            </span>
          </span>
          {isUnread && <span className="notif-unread-dot" aria-label="Unread" />}
        </button>
      </li>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            unread > 0 ? `${unread} unread notifications` : "Notifications"
          }
          className="relative flex h-8 w-8 items-center justify-center rounded-ds-sm text-text-tertiary hover:bg-subtle hover:text-foreground transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              className="absolute top-1 right-1 inline-flex h-2 w-2 rounded-full bg-accent"
              aria-hidden="true"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div>
            <div className="text-[13px] font-semibold tracking-tight">
              Notifications
            </div>
            <div className="text-[11px] text-text-tertiary mt-0.5">
              {unread > 0
                ? `${unread} unread · ${items.length} total`
                : `${items.length} total`}
            </div>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-foreground bg-transparent border-0 p-1 cursor-pointer"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-text-tertiary">
              No notifications yet.
            </div>
          ) : (
            SECTIONS.map((section) => {
              const entries = grouped[section.key];
              if (entries.length === 0) return null;
              return (
                <section key={section.key} className="notif-section" aria-label={section.label}>
                  <div className="notif-section-header">
                    <span>{section.label}</span>
                    <span className="notif-section-count">{entries.length}</span>
                  </div>
                  <ul className="flex flex-col">{entries.map(renderRow)}</ul>
                </section>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
