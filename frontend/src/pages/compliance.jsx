import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  Database,
  FileText,
  Lock,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

/**
 * Who can reach what, and where that is decided.
 *
 * The question the compliance page could not answer was the security one: it
 * listed documents and linked two pages, and said nothing about how access is
 * controlled. Each row here is a rule the API enforces on every request —
 * `canAccessClaim` in claim.controller.ts — not a description of what the
 * screens happen to show.
 */
const ACCESS = [
  {
    who: "Employee",
    sees: "Their own claims, receipts and history. Nothing else, including by reference.",
  },
  {
    who: "Approving officer",
    sees: "Claims from their own department. They can endorse, refuse, or send named fields back to be corrected.",
  },
  {
    who: "Finance administrator",
    sees: "Every claim, the whole audit trail, and the staff directory. They settle every claim and file the GST.",
  },
];

const MEASURES = [
  "Passwords stored as bcrypt hashes, never returned by any endpoint.",
  "Access decided in the API on every request. The gateway forwards traffic; it does not decide who may see what.",
  "Uploaded receipts held in a private store, reached through a signed link that expires after fifteen minutes.",
  "Sign-in limited to five attempts per quarter of an hour from one address; other requests to 120 a minute.",
  "HTTPS, Helmet security headers, and a CORS allowlist rather than a wildcard.",
  "Every status change written to an audit trail with the actor and the time.",
];

// Stated rather than left for someone to discover. The compliance documents
// carry their own gap lists; these are the two that matter most to a reader
// deciding whether to trust the portal.
const LIMITS = [
  "A sign-in token lasts one day and cannot be cancelled early — signing out clears it from the browser only.",
  "There is no second factor at sign-in, and no automatic job that deletes or anonymises a record when its retention period ends.",
];

const SECTIONS = [
  {
    title: "Approval policy",
    summary:
      "The rules that check every claim at submission — blocking what is not allowed, and marking the rest ready to approve or needing judgement.",
    to: "/policies",
    icon: BookOpen,
    docHref:
      "https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/approval-policy.md",
  },
  {
    title: "Privacy notice",
    summary:
      "What ClaimFlow collects, why, how long we keep it, and the choices you have under the PDPA.",
    to: "/privacy",
    icon: Lock,
    docHref:
      "https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/pdpa.md",
  },
];

const EXTERNAL_DOCS = [
  {
    title: "Data inventory",
    summary:
      "Every schema field mapped to its PDPA classification, lawful basis, and retention period.",
    href: "https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/data-inventory.md",
    icon: Database,
  },
  {
    title: "IRAS GST compliance",
    summary:
      "Tax invoice fields, the S$1,000 simplified-invoice threshold, and disallowed input tax categories.",
    href: "https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/gst-iras.md",
    icon: ScrollText,
  },
  {
    title: "Retention policy",
    summary:
      "The consolidated retention schedule and the PDPA-vs-IRAS conflict resolution via anonymisation.",
    href: "https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/retention-policy.md",
    icon: FileText,
  },
  {
    title: "QA acceptance checklist",
    summary:
      "Test cases for consent, DSAR, GST, retention, and the approval-policy outcomes.",
    href: "https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/qa-compliance-checklist.md",
    icon: ClipboardCheck,
  },
];

function SectionHeading({ children }) {
  return (
    <h2 className="text-[1.25rem] font-semibold tracking-tight mt-12 mb-3 text-text-primary">
      {children}
    </h2>
  );
}

export default function Compliance() {
  return (
    <div className="mx-auto px-5 py-16" style={{ maxWidth: 880 }}>
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-2 text-[13px] text-text-tertiary list-none p-0 m-0">
          <li>
            <Link to="/" className="hover:text-text-primary transition-colors">
              Sign in
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-text-primary font-medium">
            Compliance
          </li>
        </ol>
      </nav>

      <div className="flex items-start gap-3 mb-3">
        <ShieldCheck className="h-7 w-7 text-accent mt-1" strokeWidth={1.5} />
        <h1 className="text-[2.25rem] font-semibold tracking-tightest leading-[1.05]">
          Compliance
        </h1>
      </div>
      <p className="text-text-secondary leading-relaxed max-w-2xl">
        ClaimFlow is built for Singapore SMEs. The pages and documents linked
        here cover how it meets Personal Data Protection Act and IRAS GST
        obligations, and the company-policy layer that keeps the approval queue
        manageable.
      </p>

      <SectionHeading>In the portal</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to}
              className="no-underline text-text-primary group"
            >
              <div className="bg-card border border-border-subtle rounded-ds-lg h-full p-5 transition hover:border-border">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Icon className="h-4 w-4 text-accent" />
                  <h3 className="text-[16px] font-medium m-0 tracking-tight">
                    {s.title}
                  </h3>
                </div>
                <p className="text-text-tertiary text-[13px] leading-relaxed mb-3">
                  {s.summary}
                </p>
                <span className="text-[12px] text-accent font-medium inline-flex items-center gap-1">
                  Open page
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <SectionHeading>Who can see what</SectionHeading>
      <dl className="border border-border-subtle rounded-ds-panel divide-y divide-border-subtle overflow-hidden bg-card m-0">
        {ACCESS.map((row) => (
          <div
            key={row.who}
            className="flex flex-col sm:flex-row gap-1 sm:gap-5 px-4 py-3"
          >
            <dt className="text-[14px] font-medium text-text-primary sm:w-44 shrink-0">
              {row.who}
            </dt>
            <dd className="text-[14px] text-text-secondary leading-relaxed m-0">
              {row.sees}
            </dd>
          </div>
        ))}
      </dl>

      <SectionHeading>How the data is protected</SectionHeading>
      <ul className="list-disc pl-5 space-y-1.5 text-[14px] text-text-secondary leading-relaxed m-0">
        {MEASURES.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="text-[14px] text-text-secondary leading-relaxed mt-4 mb-0">
        <strong className="text-text-primary font-medium">
          And what it does not do.
        </strong>{" "}
        {LIMITS.join(" ")}{" "}
        <Link to="/privacy" className="text-accent hover:underline">
          The privacy notice
        </Link>{" "}
        lists the rest under &ldquo;What is not built yet&rdquo;.
      </p>

      <SectionHeading>Reference documents</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXTERNAL_DOCS.map((d) => {
          const Icon = d.icon;
          return (
            <a
              key={d.href}
              href={d.href}
              target="_blank"
              rel="noreferrer"
              className="no-underline text-text-primary group"
            >
              <div className="bg-card border border-border-subtle rounded-ds-lg h-full p-5 transition hover:border-border">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <Icon className="h-4 w-4 text-text-secondary" />
                  <h3 className="text-[16px] font-medium m-0 tracking-tight">
                    {d.title}
                  </h3>
                </div>
                <p className="text-text-tertiary text-[13px] leading-relaxed mb-3">
                  {d.summary}
                </p>
                <span className="text-[12px] text-accent font-medium inline-flex items-center gap-1">
                  Read on GitHub
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </a>
          );
        })}
      </div>

      <hr className="my-16 border-border-subtle" />
      <p className="text-[12px] text-text-tertiary">
        {/* "Owners are named so the team can pick them up at the next sprint"
            was not true of the documents — they carry gap lists, and no
            owners. A compliance page is the last place to describe a process
            that is not running. */}
        The documents above record the gaps still open in each area alongside
        what is already in place.
      </p>
    </div>
  );
}
