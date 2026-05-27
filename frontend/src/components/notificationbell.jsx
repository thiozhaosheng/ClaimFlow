import { useState } from "react";
import {
  Bell,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
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

const ICON_BY_KIND = {
  "auto-endorsed": ShieldCheck,
  "route-to-human": Eye,
  "ocr-unavailable": ScanLine,
  "claim-endorsed": CircleCheck,
  "claim-rejected": CircleX,
  "claim-paid": Wallet,
  "claim-edited": CircleAlert,
};

const TONE_BY_KIND = {
  "auto-endorsed": "text-success-text bg-success-bg",
  "route-to-human": "text-accent bg-accent-subtle",
  "ocr-unavailable": "text-warning-text bg-warning-bg",
  "claim-endorsed": "text-accent bg-accent-subtle",
  "claim-rejected": "text-danger-text bg-danger-bg",
  "claim-paid": "text-success-text bg-success-bg",
  "claim-edited": "text-text-secondary bg-subtle",
};

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

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

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
      <PopoverContent className="w-[360px] p-0">
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

        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-text-tertiary">
              No notifications yet.
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => {
                const Icon = ICON_BY_KIND[n.kind] || Bell;
                const tone = TONE_BY_KIND[n.kind] || "text-text-secondary bg-subtle";
                const isUnread = !n.readAt;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnread) markRead(n.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full text-left flex items-start gap-2.5 px-4 py-3 border-b border-border-subtle last:border-b-0 transition-colors hover:bg-subtle cursor-pointer",
                        isUnread && "bg-accent-subtle/30",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-ds-sm flex-shrink-0",
                          tone,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 leading-snug">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-medium text-text-primary truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-text-tertiary tabular-nums flex-shrink-0">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-text-secondary line-clamp-2">
                          {n.body}
                        </p>
                        {n.hint && (
                          <p className="mt-1 text-[11px] text-text-tertiary line-clamp-2">
                            <span className="inline-flex items-center gap-1 mr-1 text-text-secondary">
                              <CircleAlert className="h-2.5 w-2.5" /> Hint:
                            </span>
                            {n.hint}
                          </p>
                        )}
                      </div>
                      {isUnread && (
                        <span
                          className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0"
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
