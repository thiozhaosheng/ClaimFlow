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

      <p className="text-[0.75rem] uppercase tracking-[0.12em] font-medium text-text-tertiary mb-2">
        Privacy
      </p>
      <h1 className="text-[2.25rem] font-semibold tracking-tightest leading-[1.05] mb-3">
        Privacy notice
      </h1>
      <P>
        Effective 13 August 2026. This notice explains what ClaimFlow collects
        from you, why, how long we keep it, and the choices you have under
        Singapore's Personal Data Protection Act 2012. It describes what the
        portal does today — where something is intended but not yet built, it
        is listed in section 11 rather than written as though it were running.
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
          href="https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/data-inventory.md"
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
          href="https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/retention-policy.md"
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
        <li>You can see all of your own claims and their full history.</li>
        <li>
          An approving officer sees claims from{" "}
          <strong className="text-text-primary font-medium">
            their own department only
          </strong>
          . This is enforced by the API on every request, not just by what the
          screen chooses to show — including when a claim is opened directly by
          its reference.
        </li>
        <li>
          Finance administrators can see all claims. They settle every claim
          and file the GST, so the scope is the job.
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
        {/* The named products were wrong: the deployed frontend is a container
            image behind nginx, not Azure Static Web Apps. Naming a specific
            service in a privacy notice is a factual claim, so this now says
            only what can be checked from outside — Azure, and a managed
            PostgreSQL database. */}
        ClaimFlow runs on Microsoft Azure, with claims and account data held in
        a managed Azure Database for PostgreSQL. The configured region is set by
        the infrastructure team. Where any processing happens outside Singapore
        (for example, receipt OCR via Azure Document Intelligence), comparable
        protection is required under PDPA s.26.
      </P>

      <H2>7. Your choices</H2>
      <UL>
        <li>
          <strong className="text-text-primary font-medium">Access</strong> —
          download a copy of everything ClaimFlow holds about you at any time,
          from the button beside your name in the sidebar. It contains your
          account, your claims and their full history, with other people&rsquo;s
          names removed.
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
        Only access is self-service. Correction and withdrawal of consent go
        through your employer&rsquo;s Data Protection Officer by email — see
        section 11, and the{" "}
        <a
          href="https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/pdpa.md"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          PDPA compliance document
        </a>{" "}
        for where that sits on the roadmap.
      </P>

      <H2>8. How we protect your data</H2>
      <UL>
        <li>
          Passwords are stored as bcrypt hashes and are never returned by any
          endpoint.
        </li>
        <li>Traffic is served over HTTPS, with security headers set by Helmet.</li>
        <li>
          Sign-in attempts are rate limited to five per quarter of an hour from
          one address; ordinary requests to 120 a minute.
        </li>
        <li>
          Every access rule is enforced in the API. The gateway in front of it
          forwards requests; it is not the thing that decides who may see what.
        </li>
        <li>
          Uploaded receipts are held in a private store. Viewing one needs a
          signed link that lasts fifteen minutes, and a link is only issued to
          someone allowed to open that claim.
        </li>
        <li>
          Every status change is written to an audit trail with the actor and
          the time, and you can read your own.
        </li>
      </UL>
      <P>
        Two limits worth stating plainly rather than leaving you to assume
        otherwise. A sign-in token lasts{" "}
        <strong className="text-text-primary font-medium">one day</strong> and
        cannot be cancelled early — signing out removes it from your browser,
        but a copy taken from that browser would keep working until it expires.
        And there is no second factor at sign-in yet.
      </P>

      <H2>9. If something goes wrong</H2>
      <P>
        In the event of a data breach affecting your personal data, we will
        notify the PDPC and affected users within the timelines required by the
        PDPA (Amendment) Act 2020. The written internal procedure for doing so
        does not exist yet — it is listed under section 11 rather than cited as
        though it were already in place.
      </P>

      <H2>10. Updates to this notice</H2>
      <P>
        This page carries the date it was last reviewed, and the approval policy
        it refers to carries its own version number. Re-showing the notice at
        sign-in when it materially changes is intended and{" "}
        <strong className="text-text-primary font-medium">is not built</strong>
        {" "}— the database has columns for the date and version you consented
        to, and nothing writes to them yet.
      </P>

      <H2>11. What is not built yet</H2>
      <P>
        A privacy notice that describes intentions as if they were controls is
        worse than one that admits the gap, so these are listed rather than
        implied:
      </P>
      <UL>
        <li>
          <strong className="text-text-primary font-medium">
            Consent capture
          </strong>{" "}
          — no record is kept of which version of this notice you agreed to.
        </li>
        <li>
          <strong className="text-text-primary font-medium">
            Correction and erasure in the portal
          </strong>{" "}
          — both go through your Data Protection Officer by email today. Only
          access is self-service.
        </li>
        <li>
          <strong className="text-text-primary font-medium">
            Automatic retention
          </strong>{" "}
          — nothing deletes or anonymises a record when its retention period
          ends; the schedule below is a policy, not a scheduled job.
        </li>
        <li>
          <strong className="text-text-primary font-medium">
            Breach procedure
          </strong>{" "}
          — the obligation is understood, the written runbook is not finished.
        </li>
        <li>
          <strong className="text-text-primary font-medium">
            Demo data
          </strong>{" "}
          — receipt images in the sample dataset are ordinary files served by
          the web server and are not access-controlled. They are generated
          illustrations, not anyone&rsquo;s documents. Receipts you upload go to
          the private store described in section 8.
        </li>
      </UL>

      <hr className="my-16 border-border-subtle" />
      <p className="text-[12px] text-text-tertiary">
        Last reviewed: 13 August 2026. See also:{" "}
        <Link to="/policies" className="text-accent hover:underline">
          company approval policy
        </Link>
        .
      </p>
    </div>
  );
}
