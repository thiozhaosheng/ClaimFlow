export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-3 mb-4 border-b border-border-subtle">
      <div className="min-w-0">
        <h1 className="text-[1.4rem] font-bold tracking-tight leading-tight text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[13px] text-text-secondary leading-snug max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
