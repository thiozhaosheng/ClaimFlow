import { Link } from "react-router-dom";
import policies from "../data/policies.json";

const OUTCOME_STYLES = {
  "auto-approve": { label: "Auto-approve", className: "bg-success text-white" },
  "route-to-human": { label: "Route to human", className: "bg-warning text-text-primary" },
  "block": { label: "Block", className: "bg-danger text-white" },
};

function describeCondition(c) {
  if (c.op === "present") return `${c.field} is provided`;
  if (c.op === "missing") return `${c.field} is missing`;
  if (c.op === "older_than_days") return `${c.field} older than ${c.value} days`;
  if (c.op === "younger_than_days") return `${c.field} within last ${c.value} days`;
  if (c.op === "in") return `${c.field} is one of: ${c.value.join(", ")}`;
  if (c.op === "not_in") return `${c.field} is not one of: ${c.value.join(", ")}`;
  return `${c.field} ${c.op} ${c.value}`;
}

export default function Policies() {
  return (
    <div className="mx-auto px-4 py-12" style={{ maxWidth: 960 }}>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-text-secondary list-none p-0 m-0">
          <li><Link to="/" className="hover:underline">Sign in</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/compliance" className="hover:underline">Compliance</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-text-primary">Approval policy</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight mb-2">Company approval policy</h1>
      <p className="text-text-tertiary">
        These rules run on every claim at submission time and decide whether the claim is auto-approved,
        routed to a human reviewer, or blocked. The first matching rule wins. If nothing matches, the claim
        is routed to a human reviewer by default.
      </p>

      <div className="flex flex-wrap gap-4 text-xs text-text-tertiary mt-4 mb-6 border-b border-border-subtle pb-3">
        <span><strong>Version:</strong> {policies.version}</span>
        <span><strong>Currency:</strong> {policies.currency}</span>
        <span><strong>Rule count:</strong> {policies.rules.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {policies.rules.map((rule, idx) => {
          const style = OUTCOME_STYLES[rule.then] || { label: rule.then, className: "bg-subtle text-text-primary" };
          return (
            <div key={rule.id} className="bg-card border border-border-subtle rounded-ds-lg shadow-ds-sm p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-text-tertiary text-xs">#{idx + 1}</span>
                <code className="text-text-primary">{rule.id}</code>
                <span className={`ml-auto badge-custom ${style.className}`}>{style.label}</span>
              </div>

              <div className="mb-2">
                <div className="uppercase text-xs text-text-tertiary font-semibold">When</div>
                <ul className="m-0 pl-4 list-disc">
                  {rule.when.map((cond, i) => (
                    <li key={i}><code>{describeCondition(cond)}</code></li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="uppercase text-xs text-text-tertiary font-semibold">Message to user</div>
                <p className="mb-0">{rule.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      <hr className="my-12 border-border-subtle" />

      <p className="text-xs text-text-tertiary">
        Source of truth: <code>frontend/src/data/policies.json</code>.
        Spec and rationale: <code>docs/compliance/approval-policy.md</code>.
      </p>
    </div>
  );
}
