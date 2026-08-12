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
  UserCheck,
} from "lucide-react";

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
    <h2 className="text-[0.75rem] uppercase tracking-[0.12em] font-semibold text-text-tertiary mt-12 mb-3">
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
                  <h3 className="text-[15px] font-semibold m-0 tracking-tight">
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
                  <h3 className="text-[15px] font-semibold m-0 tracking-tight">
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
        Gaps and follow-ups are tracked at the bottom of each compliance
        document. Owners are named so the team can pick them up at the next
        sprint.
      </p>
    </div>
  );
}
