import { Link } from "react-router-dom";

function H2({ children }) {
  return (
    <h2 className="text-[1.15rem] font-semibold tracking-tight mt-12 mb-3 text-text-primary">
      {children}
    </h2>
  );
}

function P({ children }) {
  return (
    <p className="text-text-secondary leading-[1.65] mb-3">{children}</p>
  );
}

function UL({ children }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5 text-text-secondary leading-[1.6] mb-3">
      {children}
    </ul>
  );
}

export default function Privacy() {
  return (
    <div className="mx-auto px-5 py-16" style={{ maxWidth: 780 }}>
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-2 text-[13px] text-text-tertiary list-none p-0 m-0">
          <li>
            <Link to="/" className="hover:text-text-primary transition-colors">
              Sign in
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              to="/compliance"
              className="hover:text-text-primary transition-colors"
            >
              Compliance
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-text-primary font-medium">
            Privacy notice
          </li>
        </ol>
      </nav>

      <p className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-tertiary mb-2">
        Privacy
      </p>
      <h1 className="text-[2.25rem] font-semibold tracking-tightest leading-[1.05] mb-3">
        Privacy notice
      </h1>
      <P>
        Effective 26 May 2026. This notice explains what ClaimFlow collects from
        you, why, how long we keep it, and the choices you have under
        Singapore's Personal Data Protection Act 2012.
      </P>

      <H2>1. Who runs ClaimFlow</H2>
      <P>
        ClaimFlow is operated by your employer. They are the data controller.
        The ClaimFlow team builds the portal and operates the infrastructure on
        their behalf. For privacy questions, contact your employer's Data
        Protection Officer.
      </P>

      <H2>2. What we collect</H2>
      <P>The portal collects the following from you:</P>
      <UL>
        <li>
          <strong className="text-text-primary font-medium">
            Account details
          </strong>{" "}
          — name, work email, role, department.
        </li>
        <li>
          <strong className="text-text-primary font-medium">
            Authentication
          </strong>{" "}
          — your password is stored as a one-way bcrypt hash and never read
          back.
        </li>
        <li>
          <strong className="text-text-primary font-medium">Claims</strong> —
          amount, GST amount, merchant, category, expense date, status.
        </li>
        <li>
          <strong className="text-text-primary font-medium">
            Receipt images
          </strong>{" "}
          — the photo or PDF you upload to substantiate a claim. These can carry
          incidental personal data such as NRIC, addresses, or card numbers;
          please redact where possible before upload.
        </li>
        <li>
          <strong className="text-text-primary font-medium">Audit trail</strong>{" "}
          — every status change against a claim, the actor, the timestamp, and
          any remarks.
        </li>
      </UL>

      <H2>3. Why we collect it</H2>
      <P>
        Each field has a documented purpose, listed in our{" "}
        <a
          href="https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/data-inventory.md"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          data inventory
        </a>
        . In short:
      </P>
      <UL>
        <li>
          Account details — to give you access and route claims to the right
          reviewer.
        </li>
        <li>
          Claims and receipts — to process your reimbursement and to keep
          records IRAS may inspect.
        </li>
        <li>
          Audit trail — to be able to explain who approved what, in case of
          dispute or audit.
        </li>
      </UL>

      <H2>4. How long we keep it</H2>
      <P>
        Tax-relevant records (claims, receipts, related audit trail) are kept
        for five years from the end of the financial year of the transaction,
        as required by IRAS. Your account details are kept while your account
        is active and for one year after deactivation, then anonymised. Full
        schedule:{" "}
        <a
          href="https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/retention-policy.md"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          retention policy
        </a>
        .
      </P>

      <H2>5. Who can see your data</H2>
      <UL>
        <li>You can see all of your own claims and audit trail.</li>
        <li>
          Your assigned approver can see claims you submit for their review.
        </li>
        <li>
          Finance administrators can see all claims for accounting and IRAS
          reporting.
        </li>
        <li>
          The infrastructure team can access the database for operations, under
          access controls and audit logging.
        </li>
      </UL>
      <P>
        We do not sell your data and we do not share it with third parties for
        marketing.
      </P>

      <H2>6. Where your data is stored</H2>
      <P>
        ClaimFlow runs on Microsoft Azure (Static Web Apps, App Service,
        Postgres Flexible Server). The configured region is set by the
        infrastructure team. Where any processing happens outside Singapore
        (for example, receipt OCR via Azure Document Intelligence), comparable
        protection is required under PDPA s.26.
      </P>

      <H2>7. Your choices</H2>
      <UL>
        <li>
          <strong className="text-text-primary font-medium">Access</strong> —
          you can request a copy of every record about you held by ClaimFlow.
        </li>
        <li>
          <strong className="text-text-primary font-medium">Correction</strong>{" "}
          — you can ask for inaccurate data to be corrected.
        </li>
        <li>
          <strong className="text-text-primary font-medium">
            Withdrawal of consent
          </strong>{" "}
          — you can ask to stop using ClaimFlow. Records required by IRAS will
          be anonymised, not deleted, until their retention expires.
        </li>
      </UL>
      <P>
        To exercise any of these, email your employer's Data Protection
        Officer. Implementation of the in-portal export and erasure flow is
        tracked in the{" "}
        <a
          href="https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/pdpa.md"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          PDPA compliance doc
        </a>
        .
      </P>

      <H2>8. How we protect your data</H2>
      <UL>
        <li>Passwords are stored as bcrypt hashes.</li>
        <li>API traffic is served over HTTPS.</li>
        <li>Security headers are set via Helmet.</li>
        <li>Authentication uses short-lived JWTs.</li>
        <li>Receipt images require an authenticated session to view.</li>
      </UL>

      <H2>9. If something goes wrong</H2>
      <P>
        In the event of a data breach affecting your personal data, we will
        notify the PDPC and affected users within the timelines required by the
        PDPA (Amendment) Act 2020. The internal procedure is being drafted at{" "}
        <code>docs/compliance/breach-runbook.md</code>.
      </P>

      <H2>10. Updates to this notice</H2>
      <P>
        When this notice materially changes, we'll show it to you again at
        sign-in so you can confirm you've seen the new version.
      </P>

      <hr className="my-16 border-border-subtle" />
      <p className="text-[12px] text-text-tertiary">
        Last reviewed: 26 May 2026. See also:{" "}
        <Link to="/policies" className="text-accent hover:underline">
          company approval policy
        </Link>
        .
      </p>
    </div>
  );
}
