import { Link } from "react-router-dom";

const SECTIONS = [
  {
    title: "Approval policy",
    summary: "The rules that decide whether a submitted claim is auto-approved, routed for human review, or blocked.",
    to: "/policies",
    icon: "fa-list-check",
    docHref: "https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/approval-policy.md",
  },
  {
    title: "Privacy notice",
    summary: "What ClaimFlow collects, why, how long we keep it, and the choices you have under the PDPA.",
    to: "/privacy",
    icon: "fa-user-shield",
    docHref: "https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/pdpa.md",
  },
];

const EXTERNAL_DOCS = [
  {
    title: "Data inventory",
    summary: "Every schema field mapped to its PDPA classification, lawful basis, and retention period.",
    href: "https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/data-inventory.md",
  },
  {
    title: "IRAS GST compliance",
    summary: "Tax invoice fields, the S$1,000 simplified-invoice threshold, and disallowed input tax categories.",
    href: "https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/gst-iras.md",
  },
  {
    title: "Retention policy",
    summary: "The consolidated retention schedule and the PDPA-vs-IRAS conflict resolution via anonymisation.",
    href: "https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/retention-policy.md",
  },
  {
    title: "QA acceptance checklist",
    summary: "Test cases for consent, DSAR, GST, retention, and the approval-policy outcomes.",
    href: "https://github.com/thiozhaosheng/ClaimFlow/blob/develop/docs/compliance/qa-compliance-checklist.md",
  },
];

export default function Compliance() {
  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 960 }}>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-text-secondary list-none p-0 m-0">
          <li><Link to="/" className="hover:underline">Sign in</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-text-primary">Compliance</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight mb-2">Compliance</h1>
      <p className="text-text-tertiary">
        ClaimFlow is built for Singapore SMEs. The pages and documents linked here cover how it meets
        Personal Data Protection Act and IRAS GST obligations, and the company-policy layer that keeps the
        approval queue manageable.
      </p>

      <h2 className="text-xs uppercase tracking-wider text-text-tertiary font-semibold mt-10 mb-2">In the portal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="no-underline text-text-primary"
          >
            <div className="bg-card border border-border-subtle rounded-ds-lg shadow-ds-sm h-full p-4 transition hover:border-border hover:shadow-ds-md">
              <div className="flex items-center gap-2 mb-2">
                <i className={`fa-solid ${s.icon} text-accent`}></i>
                <h3 className="text-base font-semibold m-0">{s.title}</h3>
              </div>
              <p className="text-text-tertiary mb-2">{s.summary}</p>
              <span className="text-xs text-accent">Open page <i className="fa-solid fa-arrow-right ml-1"></i></span>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="text-xs uppercase tracking-wider text-text-tertiary font-semibold mt-10 mb-2">Reference documents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXTERNAL_DOCS.map((d) => (
          <a
            key={d.href}
            href={d.href}
            target="_blank"
            rel="noreferrer"
            className="no-underline text-text-primary"
          >
            <div className="bg-card border border-border-subtle rounded-ds-lg shadow-ds-sm h-full p-4 transition hover:border-border hover:shadow-ds-md">
              <div className="flex items-center gap-2 mb-2">
                <i className="fa-solid fa-file-lines text-text-secondary"></i>
                <h3 className="text-base font-semibold m-0">{d.title}</h3>
              </div>
              <p className="text-text-tertiary mb-2">{d.summary}</p>
              <span className="text-xs text-accent">Read on GitHub <i className="fa-solid fa-arrow-up-right-from-square ml-1"></i></span>
            </div>
          </a>
        ))}
      </div>

      <hr className="my-12 border-border-subtle" />
      <p className="text-xs text-text-tertiary">
        Gaps and follow-ups are tracked at the bottom of each compliance document. Owners are named so the
        team can pick them up at the next sprint.
      </p>
    </div>
  );
}
