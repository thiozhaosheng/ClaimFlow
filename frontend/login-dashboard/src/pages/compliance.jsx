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
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Sign in</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Compliance</li>
        </ol>
      </nav>

      <h1 className="mb-2">Compliance</h1>
      <p className="text-muted">
        ClaimFlow is built for Singapore SMEs. The pages and documents linked here cover how it meets
        Personal Data Protection Act and IRAS GST obligations, and the company-policy layer that keeps the
        approval queue manageable.
      </p>

      <h2 className="h5 text-uppercase text-muted fw-semibold mt-5">In the portal</h2>
      <div className="row g-3 mt-1">
        {SECTIONS.map((s) => (
          <div key={s.to} className="col-md-6">
            <Link to={s.to} className="text-decoration-none text-body">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className={`fa-solid ${s.icon} text-primary`}></i>
                    <h3 className="h5 mb-0">{s.title}</h3>
                  </div>
                  <p className="text-muted mb-2">{s.summary}</p>
                  <span className="small">Open page <i className="fa-solid fa-arrow-right ms-1"></i></span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <h2 className="h5 text-uppercase text-muted fw-semibold mt-5">Reference documents</h2>
      <div className="row g-3 mt-1">
        {EXTERNAL_DOCS.map((d) => (
          <div key={d.href} className="col-md-6">
            <a href={d.href} target="_blank" rel="noreferrer" className="text-decoration-none text-body">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="fa-solid fa-file-lines text-secondary"></i>
                    <h3 className="h5 mb-0">{d.title}</h3>
                  </div>
                  <p className="text-muted mb-2">{d.summary}</p>
                  <span className="small">Read on GitHub <i className="fa-solid fa-arrow-up-right-from-square ms-1"></i></span>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>

      <hr className="my-5" />
      <p className="small text-muted">
        Gaps and follow-ups are tracked at the bottom of each compliance document. Owners are named so the
        team can pick them up at the next sprint.
      </p>
    </div>
  );
}
