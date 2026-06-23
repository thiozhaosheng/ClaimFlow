import type { ReactNode } from "react";

/** Consistent page heading with eyebrow, title, subtitle, and optional actions. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-fg-tertiary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm text-fg-secondary">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
