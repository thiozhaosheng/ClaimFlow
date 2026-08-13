import { Link } from "react-router-dom";
import policies from "../data/policies.json";
import categoryFields from "../data/categoryFields.json";
import { formatSGD } from "../utils/helpers.js";

/**
 * A threshold, not a transaction. formatSGD always prints two decimals, which
 * is right for a claim amount and wrong for a limit — "Transport up to
 * S$50.00" reads like a figure someone calculated rather than a round number
 * someone set.
 */
const threshold = (n) =>
  Number.isInteger(n) ? `S$${n.toLocaleString("en-SG")}` : formatSGD(n);

/**
 * The company approval policy, for the person it applies to.
 *
 * This page used to be a rendering of policies.json: one card per rule, headed
 * by its id in code font (`block-entertainment-missing-context`), with the
 * conditions printed as the expressions the engine evaluates —
 * `details.businessJustification is missing`, `expenseDate > today`,
 * `amount > 50`. It is linked from the rail as "Approval policy" and from the
 * sign-in page, so a claimant or an auditor opening it met the engine talking
 * to itself.
 *
 * The rules are unchanged and still read straight from policies.json — the
 * same file the backend evaluates, so this page cannot drift from what
 * actually runs. Only the presentation is different: grouped by what happens,
 * conditions in English, and the rule id kept as small traceable metadata
 * rather than the headline.
 */

// The words every other screen uses for the same three outcomes. This page
// said "Route to human" where the claim row, the review modal and the finance
// dashboard all say "Needs review".
const OUTCOMES = {
  block: {
    label: "Blocked",
    heading: "Refused at submission",
    // Colour only where it is a verdict, and only for the exception: a block
    // is the one outcome that stops a claim dead.
    tone: "text-danger-text bg-danger-bg border-danger/20",
    blurb:
      "These are checked before anything is saved. The claim is not created, and the submitter is told which rule stopped it and why.",
  },
  "auto-approve": {
    label: "In policy",
    heading: "Within allowance",
    tone: "text-success-text bg-success-bg border-success/20",
    blurb:
      "The rules are satisfied, so the claim reaches the approving officer marked as ready. It is still a person who approves it — the engine has no power to endorse or to pay.",
  },
  "route-to-human": {
    label: "Needs review",
    heading: "Sent to a person",
    tone: "text-text-secondary bg-subtle border-border-subtle",
    blurb:
      "Nothing is wrong with these; they are simply outside the automatic allowances, so an approving officer looks at them properly. Anything that matches no rule at all lands here too.",
  },
};

const ORDER = ["block", "auto-approve", "route-to-human"];

// Labels for the eight fields the rules actually name. The four under
// `details.` are read from categoryFields.json, so the policy calls a field
// exactly what the form calls it.
const detailLabel = (key) => {
  for (const spec of Object.values(categoryFields)) {
    const found = (spec.fields || []).find((f) => f.key === key);
    if (found) return found.label;
  }
  return key;
};

const FIELD_LABELS = {
  amount: "the amount",
  category: "the category",
  expenseDate: "the expense date",
  receiptUrl: "a receipt",
};

const fieldName = (path) => {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  if (path.startsWith("details.")) {
    return `“${detailLabel(path.slice("details.".length))}”`;
  }
  return path;
};

const list = (values) => {
  const items = values.map((v) => `${v}`);
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
};

/** One condition, as a sentence rather than an expression. */
function describeCondition(c) {
  const money = c.field === "amount" && typeof c.value === "number";
  switch (c.op) {
    case "present":
      return c.field === "receiptUrl"
        ? "a receipt is attached"
        : `${fieldName(c.field)} is filled in`;
    case "missing":
      return c.field === "receiptUrl"
        ? "no receipt is attached"
        : `${fieldName(c.field)} is left blank`;
    case "in":
      return `${fieldName(c.field)} is ${list(c.value)}`;
    case "not_in":
      return `${fieldName(c.field)} is not ${list(c.value)}`;
    case "==":
      return `${fieldName(c.field)} is ${c.value}`;
    case "!=":
      return `${fieldName(c.field)} is not ${c.value}`;
    case ">":
      if (c.value === "today") return "the expense date is in the future";
      return `${fieldName(c.field)} is more than ${money ? threshold(c.value) : c.value}`;
    case ">=":
      return `${fieldName(c.field)} is ${money ? threshold(c.value) : c.value} or more`;
    case "<":
      return `${fieldName(c.field)} is under ${money ? threshold(c.value) : c.value}`;
    case "<=":
      return `${fieldName(c.field)} is ${money ? threshold(c.value) : c.value} or less`;
    case "older_than_days":
      return `${fieldName(c.field)} is more than ${c.value} days ago`;
    case "younger_than_days":
      return `${fieldName(c.field)} is within the last ${c.value} days`;
    default:
      return `${fieldName(c.field)} ${c.op} ${c.value}`;
  }
}

/**
 * The thresholds, pulled out of the rules rather than typed here.
 *
 * These are the numbers people come to this page for, and they were only
 * readable by working through eleven rule cards. Derived, so they cannot say
 * something policies.json does not.
 */
function keyAmounts() {
  const allowances = [];
  const ceilings = [];
  for (const rule of policies.rules) {
    const amount = rule.when.find((c) => c.field === "amount" && typeof c.value === "number");
    const category = rule.when.find((c) => c.field === "category" && c.op === "==");
    if (!amount) continue;
    if (rule.then === "auto-approve" && category) {
      allowances.push({
        what: `${category.value} up to ${threshold(amount.value)}`,
        means: "goes to your approver marked as within allowance",
      });
    }
    if (rule.id === "route-large-amount") {
      ceilings.push({
        what: `Anything over ${threshold(amount.value)}`,
        means: "always gets a closer look, whatever the category",
      });
    }
    if (rule.id === "block-missing-receipt-over-threshold") {
      ceilings.push({
        what: `Over ${threshold(amount.value)} with no receipt`,
        means: "cannot be submitted at all",
      });
    }
  }
  // What you are allowed first, then where the limits are. Sorted by amount
  // inside each half so the column reads as a ladder.
  const byAmount = (a, b) =>
    (parseFloat(a.what.replace(/[^0-9.]/g, "")) || 0) -
    (parseFloat(b.what.replace(/[^0-9.]/g, "")) || 0);
  return [...allowances.sort(byAmount), ...ceilings.sort(byAmount)];
}

function Crumbs() {
  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-2 text-[13px] text-text-tertiary list-none p-0 m-0">
        <li>
          <Link to="/" className="hover:text-text-primary transition-colors">
            Sign in
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/compliance" className="hover:text-text-primary transition-colors">
            Compliance
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-text-primary font-medium">
          Approval policy
        </li>
      </ol>
    </nav>
  );
}

export default function Policies() {
  const grouped = ORDER.map((outcome) => ({
    outcome,
    ...OUTCOMES[outcome],
    rules: policies.rules.filter((r) => r.then === outcome),
  })).filter((g) => g.rules.length > 0);

  const amounts = keyAmounts();

  return (
    <div className="mx-auto px-5 py-16" style={{ maxWidth: 880 }}>
      <Crumbs />

      <p className="text-[0.75rem] uppercase tracking-[0.12em] font-medium text-text-tertiary mb-2">
        Approval policy
      </p>
      <h1 className="text-[2.25rem] font-semibold tracking-tightest leading-[1.05] mb-3">
        Company approval policy
      </h1>
      <p className="text-text-secondary leading-relaxed max-w-2xl">
        Every claim is checked against these {policies.rules.length} rules the
        moment it is submitted. A claim that fails a hard rule is refused before
        anything is saved. Everything else goes to an approving officer, marked
        either as within allowance or as needing a closer look. The first
        matching rule wins, and a claim that matches none simply waits for its
        reviewer. <strong className="text-text-primary font-medium">The engine
        advises; a person decides.</strong> Nothing here can approve a claim or
        release a payment.
      </p>

      {amounts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[0.75rem] uppercase tracking-[0.12em] font-semibold text-text-tertiary mb-3">
            The numbers
          </h2>
          <dl className="border border-border-subtle rounded-ds-panel divide-y divide-border-subtle overflow-hidden bg-card">
            {amounts.map((a) => (
              <div
                key={a.what}
                className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 px-4 py-3"
              >
                <dt className="text-[14px] font-medium text-text-primary sm:w-64 shrink-0 tabular-nums">
                  {a.what}
                </dt>
                <dd className="text-[14px] text-text-secondary m-0">{a.means}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {grouped.map((group) => (
        <section key={group.outcome} className="mt-12">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-[1.15rem] font-semibold tracking-tight m-0">
              {group.heading}
            </h2>
            <span
              className={`inline-flex items-center rounded-ds-chip border px-2 py-0.5 text-[12px] font-medium ${group.tone}`}
            >
              {group.label}
            </span>
            <span className="text-[13px] text-text-tertiary tabular-nums">
              {group.rules.length}{" "}
              {group.rules.length === 1 ? "rule" : "rules"}
            </span>
          </div>
          <p className="text-text-secondary text-[14px] leading-relaxed max-w-2xl mb-4">
            {group.blurb}
          </p>

          <div className="border border-border-subtle rounded-ds-panel divide-y divide-border-subtle overflow-hidden bg-card">
            {group.rules.map((rule) => (
              <article key={rule.id} className="px-4 py-4">
                <h3 className="text-[14px] font-medium text-text-primary m-0 mb-1">
                  {rule.label}
                </h3>
                <p className="text-[14px] text-text-secondary leading-relaxed m-0 mb-2">
                  {/* Applies when… — the conditions joined as one sentence,
                      because a two-line bullet list for two clauses is more
                      furniture than the thought needs. */}
                  Applies when{" "}
                  {rule.when.map(describeCondition).join(", and ")}.
                </p>
                <p className="text-[13px] text-text-tertiary leading-relaxed m-0">
                  <span className="text-text-secondary">What the submitter is told:</span>{" "}
                  {rule.message}
                </p>
                {/* Kept, but demoted: the id is what the audit trail and the
                    report cite, so it has to be findable — it just is not the
                    heading a claimant reads. */}
                <p className="text-[12px] text-text-tertiary font-mono mt-2 mb-0">
                  {rule.id}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <hr className="my-16 border-border-subtle" />
      <div className="text-[13px] text-text-tertiary leading-relaxed">
        <p className="mb-2">
          Version{" "}
          <span className="font-mono text-text-secondary">{policies.version}</span>
          , {policies.currency}. This page is rendered from{" "}
          <code>policies.json</code> — the same file the approval engine
          evaluates — so it cannot describe a rule that is not running.
        </p>
        <p className="m-0">
          Rationale and worked examples:{" "}
          <a
            href="https://github.com/thiozhaosheng/ClaimFlow/blob/main/docs/compliance/approval-policy.md"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            approval-policy.md
          </a>
          . See also the{" "}
          <Link to="/privacy" className="text-accent hover:underline">
            privacy notice
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
