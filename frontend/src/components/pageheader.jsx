export default function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    // Sticks to the top of the scrollable <main> area in AppShell so the
    // title + actions stay visible while the user scrolls the form below.
    // bg-app + a faint border-b so content scrolling under it doesn't bleed.
    <header className="sticky top-0 z-20 -mt-4 lg:-mt-5 mb-8 pt-4 pb-4 bg-app border-b border-border-subtle flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
      <div className="min-w-0 w-full lg:flex-1 lg:basis-[600px]">
        {eyebrow && (
          <p className="mb-0.5 text-[10.5px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[1.25rem] leading-[1.15] font-semibold tracking-tighter text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[0.82rem] text-text-secondary leading-[1.5] max-w-2xl">
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
