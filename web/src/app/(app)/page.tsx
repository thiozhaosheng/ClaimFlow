import { PageHeader } from "@/components/ui/page-header";
import { DashboardOverview } from "@/features/dashboard/overview";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Good afternoon, Sarah"
        subtitle="Here’s where your reimbursements stand today."
      />
      <DashboardOverview />
    </>
  );
}
