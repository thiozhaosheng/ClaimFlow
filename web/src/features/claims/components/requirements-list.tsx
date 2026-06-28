import {
  Check,
  AlertTriangle,
  CircleDashed,
  UploadCloud,
} from "lucide-react";
import type { Requirement } from "@/core/domain/claim-progress";
import { cn } from "@/lib/cn";

export function RequirementsList({
  requirements,
  onUpload,
}: {
  requirements: Requirement[];
  onUpload?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {requirements.map((r) => {
        const isDone = r.state === "done";
        const isWarning = r.state === "missing" || r.state === "blocked";
        
        return (
          <li
            key={r.key}
            className={cn(
              "flex items-start gap-3.5 p-4 rounded-[20px] transition-colors duration-200 select-none",
              isWarning 
                ? "bg-rose-500/[0.04] dark:bg-rose-950/20 text-left border border-rose-500/5" 
                : isDone 
                ? "bg-emerald-500/[0.04] dark:bg-emerald-950/20 text-left border border-emerald-500/5"
                : "bg-zinc-100/40 dark:bg-zinc-900/40 text-left border border-transparent"
            )}
          >
            {isWarning ? (
              <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : isDone ? (
              <Check className="h-5 w-5 text-emerald-500 dark:text-emerald-450 shrink-0 mt-0.5" />
            ) : (
              <CircleDashed className="h-5 w-5 text-fg-tertiary shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1 leading-tight text-left">
              <p className="text-sm font-extrabold text-fg block">{r.label}</p>
              <p className="text-xs text-fg-secondary mt-1.5 leading-normal font-medium">{r.detail}</p>
            </div>
            {r.canUpload && (
              <button
                type="button"
                onClick={onUpload}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline mt-0.5"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
