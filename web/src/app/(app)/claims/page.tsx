import { PageHeader } from "@/components/ui/page-header";
import { ClaimList } from "@/features/claims/components/claim-list";

export const metadata = { title: "Claims Queue & Submissions | ClaimFlow" };

export default function ClaimsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reimbursement"
        title="Claims"
        subtitle="Track every claim from receipt capture to GIRO/PayNow payout."
      />
      <div id="claims-ledger-table" className="mt-4 flex-1 flex flex-col min-h-0">
        <ClaimList />
      </div>
    </>
  );
}
