import { Link } from "react-router-dom";
import policies from "../data/policies.json";

const OUTCOME_STYLES = {
  "auto-approve": {
    label: "Auto-approve",
    className: "bg-success-bg text-success-text",
  },
  "route-to-human": {
    label: "Route to human",
    className: "bg-warning-bg text-warning-text",
  },
  block: {
    label: "Block",
    className: "bg-danger-bg text-danger-text",
  },
};

function describeCondition(c) {
  if (c.op === "present") return `${c.field} is provided`;
  if (c.op === "missing") return `${c.field} is missing`;
  if (c.op === "older_than_days")
    return `${c.field} older than ${c.value} days`;
  if (c.op === "younger_than_days")
    return `${c.field} within last ${c.value} days`;
  if (c.op === "in") return `${c.field} is one of: ${c.value.join(", ")}`;
  if (c.op === "not_in")
    return `${c.field} is not one of: ${c.value.join(", ")}`;
  return `${c.field} ${c.op} ${c.value}`;
}

export default function Policies() {
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
            Approval policy
          </li>
        </ol>
      </nav>

      <p className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-tertiary mb-2">
        Approval policy
      </p>
      <h1 className="text-[2.25rem] font-semibold tracking-tightest leading-[1.05] mb-3">
        Company approval policy
      </h1>
      <p className="text-text-secondary leading-relaxed max-w-2xl">
        These rules run on every claim at submission time and decide whether the
        claim is auto-approved, routed to a human reviewer, or blocked. The
        first matching rule wins. If nothing matches, the claim is routed to a
        human reviewer by default.
      </p>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-text-tertiary mt-6 mb-8 pb-4 border-b border-border-subtle font-mono tabular-nums">
        <span>
          <span className="text-text-secondary font-sans">Version</span>{" "}
          <strong className="text-text-primary font-medium">
            {policies.version}
          </strong>
        </span>
        <span>
          <span className="text-text-secondary font-sans">Currency</span>{" "}
          <strong className="text-text-primary font-medium">
            {policies.currency}
          </strong>
        </span>
        <span>
          <span className="text-text-secondary font-sans">Rules</span>{" "}
          <strong className="text-text-primary font-medium">
            {policies.rules.length}
          </strong>
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {policies.rules.map((rule, idx) => {
          const style =
            OUTCOME_STYLES[rule.then] || {
              label: rule.then,
              className: "bg-subtle text-text-primary",
            };
          return (
            <div
              key={rule.id}
              className="bg-card border border-border-subtle rounded-ds-md p-5"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-text-tertiary text-[11px] tabular-nums font-mono">
                  #{String(idx + 1).padStart(2, "0")}
                </span>
                <code className="text-text-primary">{rule.id}</code>
                <span
                  className={`ml-auto inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${style.className}`}
                >
                  {style.label}
                </span>
              </div>

              <div className="mb-3">
                <div className="uppercase text-[10px] tracking-[0.08em] text-text-tertiary font-semibold mb-1.5">
                  When
                </div>
                <ul className="m-0 pl-4 list-disc space-y-0.5">
                  {rule.when.map((cond, i) => (
                    <li key={i} className="text-[13px]">
                      <code>{describeCondition(cond)}</code>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="uppercase text-[10px] tracking-[0.08em] text-text-tertiary font-semibold mb-1.5">
                  Message to user
                </div>
                <p className="mb-0 text-[13px] text-text-secondary leading-relaxed">
                  {rule.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <hr className="my-16 border-border-subtle" />
      <p className="text-[12px] text-text-tertiary">
        Source of truth: <code>frontend/src/data/policies.json</code>. Spec and
        rationale: <code>docs/compliance/approval-policy.md</code>.
      </p>
    </div>
  );
}
