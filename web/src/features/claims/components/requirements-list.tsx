import {
  Check,
  AlertTriangle,
  Ban,
  Clock,
  CircleDashed,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import type { Requirement, RequirementState } from "@/core/domain/claim-progress";
import { cn } from "@/lib/cn";

const PRES: Record<RequirementState, { icon: LucideIcon; tone: string }> = {
  done: { icon: Check, tone: "bg-success-bg text-success-fg" },
  missing: { icon: AlertTriangle, tone: "bg-warning-bg text-warning-fg" },
  blocked: { icon: Ban, tone: "bg-danger-bg text-danger-fg" },
  review: { icon: Clock, tone: "bg-accent-subtle text-accent" },
  optional: { icon: CircleDashed, tone: "bg-surface text-fg-tertiary" },
};

export function RequirementsList({
  requirements,
  onUpload,
}: {
  requirements: Requirement[];
  onUpload?: () => void;
}) {
  return (
    <ul className="flex flex-col">
      {requirements.map((r) => {
        const { icon: Icon, tone } = PRES[r.state];
        return (
          <li
            key={r.key}
            className="flex items-start gap-3 border-b border-border py-3 last:border-0"
          >
            <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", tone)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{r.label}</p>
              <p className="text-xs text-fg-tertiary">{r.detail}</p>
            </div>
            {r.canUpload && (
              <button
                type="button"
                onClick={onUpload}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline"
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
