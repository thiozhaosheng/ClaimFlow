import { PageHeader } from "@/components/ui/page-header";
import { ClaimList } from "@/features/claims/components/claim-list";

export const metadata = { title: "Claims · ClaimFlow" };

export default function ClaimsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reimbursement"
        title="Claims"
        subtitle="Track every claim from receipt capture to GIRO/PayNow payout."
      />
      <ClaimList />
    </>
  );
}
