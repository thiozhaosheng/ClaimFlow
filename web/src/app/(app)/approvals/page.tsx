import { PageHeader } from "@/components/ui/page-header";

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Coming next"
        title="Approvals"
        subtitle="This workspace is part of the rebuild roadmap."
      />
      <div className="grid place-items-center rounded-2xl border border-dashed border-border-strong bg-card p-16 text-center text-sm text-fg-secondary shadow-card">
        The Approvals module will be built out next.
      </div>
    </>
  );
}
