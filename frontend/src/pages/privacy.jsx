import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 860 }}>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-text-secondary list-none p-0 m-0">
          <li><Link to="/" className="hover:underline">Sign in</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/compliance" className="hover:underline">Compliance</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-text-primary">Privacy notice</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight mb-3">Privacy notice</h1>
      <p className="text-text-tertiary">
        Effective 26 May 2026. This notice explains what ClaimFlow collects from you, why, how long we keep
        it, and the choices you have under Singapore's Personal Data Protection Act 2012.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-2">1. Who runs ClaimFlow</h2>
      <p>
        ClaimFlow is operated by your employer. They are the data controller. The ClaimFlow team builds the
        portal and operates the infrastructure on their behalf. For privacy questions, contact your
        employer's Data Protection Officer.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-2">2. What we collect</h2>
      <p>The portal collects the following from you:</p>
      <ul className="list-disc pl-6">
        <li><strong>Account details</strong> — name, work email, role, department.</li>
        <li><strong>Authentication</strong> — your password is stored as a one-way bcrypt hash and never read back.</li>
        <li><strong>Claims</strong> — amount, GST amount, merchant, category, expense date, status.</li>
        <li><strong>Receipt images</strong> — the photo or PDF you upload to substantiate a claim. These can carry incidental personal data such as NRIC, addresses, or card numbers; please redact where possible before upload.</li>
        <li><strong>Audit trail</strong> — every status change against a claim, the actor, the timestamp, and any remarks.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-10 mb-2">3. Why we collect it</h2>
      <p>
        Each field has a documented purpose, listed in our{" "}
        <a href="https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/data-inventory.md" target="_blank" rel="noreferrer">
          data inventory
        </a>. In short:
      </p>
      <ul className="list-disc pl-6">
        <li>Account details — to give you access and route claims to the right reviewer.</li>
        <li>Claims and receipts — to process your reimbursement and to keep records IRAS may inspect.</li>
        <li>Audit trail — to be able to explain who approved what, in case of dispute or audit.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-10 mb-2">4. How long we keep it</h2>
      <p>
        Tax-relevant records (claims, receipts, related audit trail) are kept for five years from the end of
        the financial year of the transaction, as required by IRAS. Your account details are kept while
        your account is active and for one year after deactivation, then anonymised. Full schedule:{" "}
        <a href="https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/retention-policy.md" target="_blank" rel="noreferrer">
          retention policy
        </a>.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-2">5. Who can see your data</h2>
      <ul className="list-disc pl-6">
        <li>You can see all of your own claims and audit trail.</li>
        <li>Your assigned approver can see claims you submit for their review.</li>
        <li>Finance administrators can see all claims for accounting and IRAS reporting.</li>
        <li>The infrastructure team can access the database for operations, under access controls and audit logging.</li>
      </ul>
      <p>We do not sell your data and we do not share it with third parties for marketing.</p>

      <h2 className="text-xl font-semibold mt-10 mb-2">6. Where your data is stored</h2>
      <p>
        ClaimFlow runs on Microsoft Azure (Static Web Apps, App Service, Postgres Flexible Server). The
        configured region is set by the infrastructure team. Where any processing happens outside Singapore
        (for example, receipt OCR via Azure Document Intelligence), comparable protection is required under
        PDPA s.26.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-2">7. Your choices</h2>
      <ul className="list-disc pl-6">
        <li><strong>Access</strong> — you can request a copy of every record about you held by ClaimFlow.</li>
        <li><strong>Correction</strong> — you can ask for inaccurate data to be corrected.</li>
        <li><strong>Withdrawal of consent</strong> — you can ask to stop using ClaimFlow. Records required by IRAS will be anonymised, not deleted, until their retention expires.</li>
      </ul>
      <p>
        To exercise any of these, email your employer's Data Protection Officer. Implementation of the
        in-portal export and erasure flow is tracked in the{" "}
        <a href="https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/pdpa.md" target="_blank" rel="noreferrer">
          PDPA compliance doc
        </a>.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-2">8. How we protect your data</h2>
      <ul className="list-disc pl-6">
        <li>Passwords are stored as bcrypt hashes.</li>
        <li>API traffic is served over HTTPS.</li>
        <li>Security headers are set via Helmet.</li>
        <li>Authentication uses short-lived JWTs.</li>
        <li>Receipt images require an authenticated session to view.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-10 mb-2">9. If something goes wrong</h2>
      <p>
        In the event of a data breach affecting your personal data, we will notify the PDPC and affected
        users within the timelines required by the PDPA (Amendment) Act 2020. The internal procedure is
        being drafted at <code>docs/compliance/breach-runbook.md</code>.
      </p>

      <h2 className="text-xl font-semibold mt-10 mb-2">10. Updates to this notice</h2>
      <p>
        When this notice materially changes, we'll show it to you again at sign-in so you can confirm you've
        seen the new version.
      </p>

      <hr className="my-12 border-border-subtle" />
      <p className="text-xs text-text-tertiary">
        Last reviewed: 26 May 2026. See also: <Link to="/policies">company approval policy</Link>.
      </p>
    </div>
  );
}
