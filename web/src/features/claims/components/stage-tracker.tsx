import { Check, Clock, Ban } from "lucide-react";
import type { Stage } from "@/core/domain/claim-progress";
import { cn } from "@/lib/cn";

const DOT: Record<Stage["state"], string> = {
  done: "bg-success border-success text-white",
  current: "bg-accent-subtle border-accent text-accent ring-4 ring-accent/15",
  upcoming: "bg-card border-border-strong text-fg-tertiary",
  rejected: "bg-danger border-danger text-white",
};

const LINE: Record<Stage["state"], string> = {
  done: "bg-success",
  current: "bg-border-strong",
  upcoming: "bg-border-strong",
  rejected: "bg-border-strong",
};

export function StageTracker({ stages }: { stages: Stage[] }) {
  return (
    <ol className="flex items-center" aria-label="Claim progress">
      {stages.map((s, i) => (
        <li
          key={s.key}
          className={cn("flex items-center gap-2", i < stages.length - 1 && "flex-1")}
        >
          <span
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
              DOT[s.state],
            )}
          >
            {s.state === "done" ? (
              <Check className="h-3 w-3" />
            ) : s.state === "rejected" ? (
              <Ban className="h-3 w-3" />
            ) : s.state === "current" ? (
              <Clock className="h-3 w-3" />
            ) : (
              i + 1
            )}
          </span>
          <span
            className={cn(
              "whitespace-nowrap text-xs font-medium",
              s.state === "current" || s.state === "done"
                ? "text-fg"
                : s.state === "rejected"
                  ? "text-danger-fg"
                  : "text-fg-tertiary",
            )}
          >
            {s.label}
          </span>
          {i < stages.length - 1 && (
            <span className={cn("mx-2 h-0.5 flex-1 rounded-full", LINE[s.state])} />
          )}
        </li>
      ))}
    </ol>
  );
}
