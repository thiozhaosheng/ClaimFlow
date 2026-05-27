import { Link } from "react-router-dom";
import policies from "../data/policies.json";

const OUTCOME_STYLES = {
  "auto-approve": { label: "Auto-approve", className: "bg-success" },
  "route-to-human": { label: "Route to human", className: "bg-warning text-dark" },
  "block": { label: "Block", className: "bg-danger" },
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
    <div className="container py-5" style={{ maxWidth: 960 }}>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Sign in</Link></li>
          <li className="breadcrumb-item"><Link to="/compliance">Compliance</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Approval policy</li>
        </ol>
      </nav>

      <h1 className="mb-2">Company approval policy</h1>
      <p className="text-muted">
        These rules run on every claim at submission time and decide whether the claim is auto-approved,
        routed to a human reviewer, or blocked. The first matching rule wins. If nothing matches, the claim
        is routed to a human reviewer by default.
      </p>

      <div className="d-flex flex-wrap gap-3 small text-muted mb-4 border-bottom pb-3">
        <span><strong>Version:</strong> {policies.version}</span>
        <span><strong>Currency:</strong> {policies.currency}</span>
        <span><strong>Rule count:</strong> {policies.rules.length}</span>
      </div>

      <div className="d-flex flex-column gap-3">
        {policies.rules.map((rule, idx) => {
          const style = OUTCOME_STYLES[rule.then] || { label: rule.then, className: "bg-secondary" };
          return (
            <div key={rule.id} className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span className="text-muted small">#{idx + 1}</span>
                  <code className="text-body">{rule.id}</code>
                  <span className={`badge ms-auto ${style.className}`}>{style.label}</span>
                </div>

                <div className="mb-2">
                  <div className="text-uppercase small text-muted fw-semibold">When</div>
                  <ul className="mb-0 ps-3">
                    {rule.when.map((cond, i) => (
                      <li key={i}><code>{describeCondition(cond)}</code></li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-uppercase small text-muted fw-semibold">Message to user</div>
                  <p className="mb-0">{rule.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <hr className="my-5" />

      <p className="small text-muted">
        Source of truth: <code>frontend/login-dashboard/src/data/policies.json</code>.
        Spec and rationale: <code>docs/compliance/approval-policy.md</code>.
      </p>
    </div>
  );
}
