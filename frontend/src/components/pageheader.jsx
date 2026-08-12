export default function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    // Standard page header without sticky positioning
    <header className="mb-8 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
      <div className="min-w-0 w-full lg:flex-1 lg:basis-[600px]">
        {eyebrow && (
          <p className="mb-1 text-[0.75rem] uppercase tracking-[0.1em] font-medium text-text-tertiary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tighter text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[0.875rem] text-text-secondary leading-[1.5] max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
