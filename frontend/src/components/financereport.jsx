import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.jsx";
import {
  useFinanceInsights,
  claimInRange,
  submittedOn,
} from "../hooks/useFinanceInsights.js";
import { formatSGD, formatSGDate } from "../utils/helpers.js";
import policies from "../data/policies.json";
import "./finance-report.css";

/**
 * The report a manager hands upward: what was spent, where it went, what is
 * moving, and what needs a decision — one printable sheet, every figure
 * computed from the same claims the dashboard reads. Print it and the browser
 * makes the PDF; nothing here is typed in by hand, so it cannot drift from
 * the ledger it summarises.
 */

const RANGE_OPTIONS = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
];

// Thresholds come from the policy file, never typed here — if the rules move,
// the report moves with them.
const ruleAmount = (id) => {
  const rule = policies.rules.find((r) => r.id === id);
  const cond = rule?.when?.find((w) => w.field === "amount");
  return typeof cond?.value === "number" ? cond.value : null;
};
const LARGE_AMOUNT = ruleAmount("route-large-amount"); // S$500
const MEAL_ALLOWANCE = ruleAmount("auto-approve-small-meal"); // S$30
const TRANSPORT_ALLOWANCE = ruleAmount("auto-approve-transport"); // S$50

const pctOf = (part, whole) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";

function deltaLabel(current, previous) {
  if (!previous || previous <= 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function SectionTitle({ children }) {
  return <h3 className="report-section-title">{children}</h3>;
}

export default function FinanceReport({ claims, auditLog = [] }) {
  const [range, setRange] = useState("30d");

  const uniqueClaims = useMemo(() => {
    const map = new Map();
    for (const c of claims || []) {
      if (!map.has(c.id)) map.set(c.id, c);
    }
    return [...map.values()];
  }, [claims]);

  const view = useFinanceInsights(uniqueClaims, range, auditLog);
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label || "";

  const claimsInRange = useMemo(() => {
    const now = new Date();
    return uniqueClaims.filter((c) => claimInRange(c, range, now));
  }, [uniqueClaims, range]);

  // Officer activity in the period, read from the audit log — the report
  // states what the control actually did, not what it is meant to do.
  const inRange = (value) => {
    if (!value) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime()) && claimInRange({ createdAt: value }, range);
  };
  const correctionsRequested = useMemo(
    () =>
      auditLog.filter(
        (l) => l.actionKey === "CHANGES_REQUESTED" && inRange(l.createdAt),
      ).length,
    [auditLog, range],
  );
  const rejections = useMemo(
    () =>
      auditLog.filter(
        (l) => l.actionKey === "MANAGER_REJECTION" && inRange(l.createdAt),
      ).length,
    [auditLog, range],
  );

  // Claims counted per category/department, for the tables' Claims column.
  const countBy = (keyOf) => {
    const m = new Map();
    for (const c of claimsInRange) {
      const k = keyOf(c);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  };
  const categoryCounts = useMemo(
    () => countBy((c) => c.type || "Other"),
    [claimsInRange],
  );
  const departmentCounts = useMemo(
    () => countBy((c) => c.department || "Other"),
    [claimsInRange],
  );

  const largestClaims = useMemo(
    () =>
      [...claimsInRange]
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 5),
    [claimsInRange],
  );

  // The no-rule set, named by category — "the policy is silent on 43 claims"
  // is only actionable when the report says silent about WHAT.
  const noRuleClaims = useMemo(
    () =>
      claimsInRange.filter(
        (c) => view.policyByClaim.get(c.id)?.ruleId === "default",
      ),
    [claimsInRange, view.policyByClaim],
  );
  const noRuleTopCategories = useMemo(() => {
    const m = new Map();
    for (const c of noRuleClaims) {
      const k = c.type || "Other";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  }, [noRuleClaims]);

  const largeClaims = useMemo(
    () =>
      LARGE_AMOUNT == null
        ? []
        : claimsInRange.filter((c) => (c.amount || 0) > LARGE_AMOUNT),
    [claimsInRange],
  );
  const largeTotal = largeClaims.reduce((s, c) => s + (c.amount || 0), 0);

  const oldestOpen = useMemo(() => {
    let oldest = null;
    const now = Date.now();
    for (const c of uniqueClaims) {
      if (c.status !== "Pending" || c.withdrawn) continue;
      const d = new Date(submittedOn(c));
      if (Number.isNaN(d.getTime())) continue;
      const days = Math.floor((now - d.getTime()) / 86_400_000);
      if (!oldest || days > oldest.days) oldest = { id: c.id, days };
    }
    return oldest;
  }, [uniqueClaims]);

  const riser = useMemo(() => {
    let best = null;
    for (const c of view.byCategory || []) {
      const before = view.byCategoryPrev?.get(c.category) || 0;
      if (before <= 0 || c.amount <= before) continue;
      const growth = (c.amount - before) / before;
      if (growth >= 0.15 && (!best || growth > best.growth)) {
        best = { ...c, before, growth };
      }
    }
    return best;
  }, [view.byCategory, view.byCategoryPrev]);

  const spendDelta = deltaLabel(view.totals.spend, view.prevTotals.spend);
  const countDelta = deltaLabel(view.totals.count, view.prevTotals.count);
  const awaitingPayoutTotal = claimsInRange
    .filter((c) => c.status === "Endorsed")
    .reduce((s, c) => s + (c.amount || 0), 0);

  const generatedOn = `${formatSGDate(new Date())}`;

  return (
    <div className="fin-report-wrap">
      {/* Controls stay off the paper. */}
      <div className="fin-report-controls">
        <div className="w-44">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="fin-select-trigger" aria-label="Report period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-1.5"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Print or save as PDF
        </button>
      </div>

      <article className="fin-report" aria-label="Expense report">
        <header className="report-masthead">
          <div>
            <h2 className="report-title">Expense report</h2>
            <p className="report-line">
              {rangeLabel} · generated {generatedOn} · figures in SGD, GST
              included where applicable
            </p>
          </div>
          <div className="report-headline-figure">
            <b>{formatSGD(view.totals.spend)}</b>
            <span>
              {view.totals.count} claims
              {spendDelta ? ` · ${spendDelta} vs previous period` : ""}
            </span>
          </div>
        </header>

        <section className="report-section">
          <SectionTitle>Summary</SectionTitle>
          <table className="report-table report-table-facts">
            <tbody>
              <tr>
                <th scope="row">Total spend</th>
                <td className="num">{formatSGD(view.totals.spend)}</td>
                <th scope="row">Claims submitted</th>
                <td className="num">
                  {view.totals.count}
                  {countDelta ? ` (${countDelta})` : ""}
                </td>
              </tr>
              <tr>
                <th scope="row">Disbursed in period</th>
                <td className="num">
                  {formatSGD(view.totals.disbursed)} · {view.totals.disbursedCount}{" "}
                  claims
                </td>
                <th scope="row">Awaiting payout</th>
                <td className="num">
                  {formatSGD(awaitingPayoutTotal)} · {view.totals.awaitingPayout}{" "}
                  claims
                </td>
              </tr>
              <tr>
                <th scope="row">With approving officers</th>
                <td className="num">{view.totals.pendingEndorsement} claims</td>
                <th scope="row">Average claim</th>
                <td className="num">{formatSGD(view.totals.avgClaim)}</td>
              </tr>
              <tr>
                <th scope="row">GST captured (IRAS)</th>
                <td className="num">{formatSGD(view.gstCaptured)}</td>
                <th scope="row">Policy version</th>
                <td className="num">{policies.version}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <SectionTitle>Where the money went</SectionTitle>
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" className="num">Claims</th>
                <th scope="col" className="num">Amount</th>
                <th scope="col" className="num">Share</th>
                <th scope="col" className="num">Vs previous</th>
              </tr>
            </thead>
            <tbody>
              {(view.byCategory || []).map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td className="num">{categoryCounts.get(c.category) || 0}</td>
                  <td className="num">{formatSGD(c.amount)}</td>
                  <td className="num">{pctOf(c.amount, view.totals.spend)}</td>
                  <td className="num">
                    {deltaLabel(c.amount, view.byCategoryPrev?.get(c.category)) ??
                      "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <SectionTitle>By department</SectionTitle>
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Department</th>
                <th scope="col" className="num">Claims</th>
                <th scope="col" className="num">Amount</th>
                <th scope="col" className="num">Share</th>
              </tr>
            </thead>
            <tbody>
              {(view.byDepartment || []).map((d) => (
                <tr key={d.department}>
                  <td>{d.department}</td>
                  <td className="num">{departmentCounts.get(d.department) || 0}</td>
                  <td className="num">{formatSGD(d.amount)}</td>
                  <td className="num">{pctOf(d.amount, view.totals.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <SectionTitle>Largest claims in period</SectionTitle>
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Claimant</th>
                <th scope="col">Department</th>
                <th scope="col">Category</th>
                <th scope="col" className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {largestClaims.map((c) => (
                <tr key={c.id}>
                  <td><span className="data-ref">{c.id}</span></td>
                  <td>{c.employee}</td>
                  <td>{c.department || "—"}</td>
                  <td>{c.type}</td>
                  <td className="num">{formatSGD(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <SectionTitle>Approval control</SectionTitle>
          <table className="report-table report-table-facts">
            <tbody>
              <tr>
                <th scope="row">Within a policy allowance</th>
                <td className="num">
                  {view.policyCounts["auto-approve"] || 0} claims
                </td>
                <th scope="row">Routed for judgement</th>
                <td className="num">
                  {view.policyCounts["route-to-human"] || 0} claims
                </td>
              </tr>
              <tr>
                <th scope="row">Corrections requested</th>
                <td className="num">{correctionsRequested}</td>
                <th scope="row">Refused</th>
                <td className="num">{rejections}</td>
              </tr>
            </tbody>
          </table>
          <p className="report-note">
            Every claim is decided by an approving officer; the policy engine
            recommends and never approves. Each decision is in the audit trail
            under the officer's name.
          </p>
        </section>

        <section className="report-section">
          <SectionTitle>For attention</SectionTitle>
          <ul className="report-points">
            {riser && (
              <li>
                {riser.category} spend grew from {formatSGD(riser.before)} to{" "}
                {formatSGD(riser.amount)} against the previous period — the
                fastest mover in the range.
              </li>
            )}
            {LARGE_AMOUNT != null && largeClaims.length > 0 && (
              <li>
                {largeClaims.length} claim{largeClaims.length === 1 ? "" : "s"}{" "}
                above S${LARGE_AMOUNT} carr{largeClaims.length === 1 ? "ies" : "y"}{" "}
                {formatSGD(largeTotal)} — {pctOf(largeTotal, view.totals.spend)} of
                the period's spend in {largeClaims.length} decision
                {largeClaims.length === 1 ? "" : "s"}.
              </li>
            )}
            {noRuleClaims.length > 0 && (
              <li>
                The approval policy is silent on {noRuleClaims.length} of{" "}
                {claimsInRange.length} claims
                {noRuleTopCategories.length > 0 && (
                  <>
                    {" "}
                    (mostly{" "}
                    {noRuleTopCategories
                      .map(([cat, n]) => `${cat} (${n})`)
                      .join(" and ")}
                    )
                  </>
                )}
                — each took an officer's unaided judgement. The allowances stop
                at S${MEAL_ALLOWANCE} for meals and S${TRANSPORT_ALLOWANCE} for
                transport; widening them, or adding rules between the gaps,
                would give officers guidance on these.
              </li>
            )}
            {oldestOpen && oldestOpen.days > 30 && (
              <li>
                The oldest open claim, {oldestOpen.id}, has waited{" "}
                {oldestOpen.days} days for a decision.
              </li>
            )}
          </ul>
        </section>

        <section className="report-section">
          <SectionTitle>Payouts</SectionTitle>
          <p className="report-note">
            {view.totals.awaitingPayout} endorsed claim
            {view.totals.awaitingPayout === 1 ? "" : "s"} (
            {formatSGD(awaitingPayoutTotal)}) awaiting release. ClaimFlow
            records each payment and notifies the claimant; the transfer itself
            is made by bank or PayNow run. Direct GIRO payout from ClaimFlow is
            on the roadmap.
          </p>
        </section>
      </article>
    </div>
  );
}
