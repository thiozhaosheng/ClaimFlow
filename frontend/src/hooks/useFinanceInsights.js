import { useMemo } from "react";
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";

const MS_PER_DAY = 86_400_000;

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(value, now = new Date()) {
  const d = parseDate(value);
  if (!d) return null;
  return Math.floor((now - d) / MS_PER_DAY);
}

/**
 * When a claim entered the system.
 *
 * Everything on this dashboard used to be filtered on `claim.date`, which is
 * the EXPENSE date — the day the taxi ride happened. So "Last 30 days" meant
 * "claims for meals eaten in the last 30 days", and a claim submitted this
 * morning for a conference in March fell outside every range but "All time".
 * Finance counts what arrived, so the range is the submission date; the expense
 * date stays what it is, a fact about the receipt.
 */
export const submittedOn = (claim) => claim?.createdAt || claim?.date || null;

/**
 * Is a claim inside the selected range?
 *
 * Exported because the drill-through list has to use the same predicate as the
 * figure it was opened from — the dashboard kept its own copy, so the two could
 * drift and the reader would have no way to tell which was right.
 */
export function claimInRange(claim, range, now = new Date()) {
  if (range === "all") return true;
  const value = submittedOn(claim);
  const d = parseDate(value);
  if (!d) return false;
  if (range === "ytd") return d >= new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - d) / MS_PER_DAY);
  if (range === "30d") return days <= 30;
  if (range === "90d") return days <= 90;
  return true;
}

function inPreviousRange(claim, range, now) {
  const d = daysAgo(submittedOn(claim), now);
  if (d === null) return false;
  if (range === "30d") return d > 30 && d <= 60;
  if (range === "90d") return d > 90 && d <= 180;
  return false;
}

/**
 * The bucket key. It stays ISO ("2026-W29") because it sorts and groups
 * correctly; what the axis shows is weekLabel below, because "2026-W29" is how
 * a developer names a week and nobody in a finance department reads a chart
 * that way.
 */
function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date - yearStart) / MS_PER_DAY + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** The Monday of the week a date falls in, as "29 Jun". */
function weekCommencingLabel(d) {
  const monday = new Date(d);
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  return monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * When each claim was actually paid, read from the audit trail.
 *
 * There is no `paidAt` column, and inventing one on the client would be a
 * guess. The FINANCE_REIMBURSEMENT entry is the payment: it is written by
 * PATCH /api/workflow/pay/:id and by nothing else, and finance already loads
 * the whole log for the audit table. Without it, "Disbursed, last 30 days" was
 * really "claims whose expense fell in the last 30 days and which happen to be
 * paid" — a figure that changes when nobody has paid anything.
 */
function paymentDates(auditLog) {
  const map = new Map();
  for (const entry of auditLog || []) {
    if (entry.actionKey !== "FINANCE_REIMBURSEMENT") continue;
    const d = parseDate(entry.createdAt || `${entry.date} ${entry.time}`);
    if (!d) continue;
    const seen = map.get(entry.id);
    // If a claim somehow carries two payment entries, the first one is when
    // the money moved.
    if (!seen || d < seen) map.set(entry.id, d);
  }
  return map;
}

function dateInRange(d, range, now) {
  if (range === "all") return true;
  if (!d) return false;
  if (range === "ytd") return d >= new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - d) / MS_PER_DAY);
  if (range === "30d") return days <= 30;
  if (range === "90d") return days <= 90;
  return true;
}

export function useFinanceInsights(claims, range = "30d", auditLog = []) {
  return useMemo(() => {
    const now = new Date();
    const filtered = claims.filter((c) => claimInRange(c, range, now));
    const paidOn = paymentDates(auditLog);

    // overall totals
    const totalCount = filtered.length;
    const totalSpend = filtered.reduce((s, c) => s + (c.amount || 0), 0);

    // Disbursement is measured on the day the money left, over every claim —
    // not only the ones submitted inside the window, because a claim submitted
    // in June and paid last week is last week's disbursement.
    const disbursed = claims.filter(
      (c) => c.status === "Paid" && dateInRange(paidOn.get(c.id), range, now),
    );
    const disbursedTotal = disbursed.reduce((s, c) => s + c.amount, 0);

    const pendingEndorsement = filtered.filter((c) => c.status === "Pending").length;
    const awaitingPayout = filtered.filter((c) => c.status === "Endorsed").length;
    const avgClaim = totalCount ? totalSpend / totalCount : 0;

    // previous range delta
    const prev = claims.filter((c) => inPreviousRange(c, range, now));
    const prevCount = prev.length;
    const prevSpend = prev.reduce((s, c) => s + c.amount, 0);
    const countDelta = prevCount > 0 ? (totalCount - prevCount) / prevCount : null;
    const spendDelta = prevSpend > 0 ? (totalSpend - prevSpend) / prevSpend : null;

    // by department
    const byDeptMap = new Map();
    for (const c of filtered) {
      const key = c.department || "Other";
      byDeptMap.set(key, (byDeptMap.get(key) || 0) + c.amount);
    }
    const byDepartment = [...byDeptMap.entries()]
      .map(([department, amount]) => ({ department, amount }))
      .sort((a, b) => b.amount - a.amount);

    // by category
    const byCatMap = new Map();
    for (const c of filtered) {
      const key = c.type || "Other";
      byCatMap.set(key, (byCatMap.get(key) || 0) + c.amount);
    }
    const byCategory = [...byCatMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Policy breakdown — the SAME engine and the SAME context every other
    // screen uses. This file carried its own copy of the evaluator, and that
    // copy passed no `details` and forced supplierGstRegNumber to null: six of
    // the eleven rules read details, three of them blocks, so it reported nine
    // "Blocked" claims in a demo where a blocked claim cannot exist (the API
    // refuses one with a 422 before anything is written).
    const policyCounts = { "auto-approve": 0, "route-to-human": 0, block: 0 };
    const policyReasons = {};
    for (const c of filtered) {
      const { outcome, ruleId, label } = evaluatePolicies(
        claimContextFromForm({
          category: c.type,
          amount: c.amount,
          receiptUrl: c.receiptUrl,
          expenseDate: c.date,
          details: c.details || {},
          supplierGstRegNumber: c.supplierGstRegNumber ?? null,
        }),
      );
      policyCounts[outcome] = (policyCounts[outcome] || 0) + 1;
      const key = `${outcome}:${ruleId}`;
      // Carry the rule's written name through the tally: the list is read by a
      // person, and "default" or "route-meal-missing-attendees-context" is the
      // engine talking to itself. `default` is not a rule at all — it is what
      // happens when none of them matched, and it used to top the list.
      const named = label || (ruleId === "default" ? "No rule matched" : ruleId);
      const seen = policyReasons[key] || { count: 0, label: named };
      policyReasons[key] = { count: seen.count + 1, label: seen.label || named };
    }
    const topPolicyReasons = Object.entries(policyReasons)
      .map(([key, { count, label }]) => {
        const [outcome, ruleId] = key.split(":");
        return { outcome, ruleId, label, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Submission and disbursement, week by week — each on its own date. They
    // used to share one bucket keyed on the expense date, so a claim's payout
    // was plotted in the week the meal was eaten and the two series could only
    // ever rise and fall together.
    const weekMap = new Map();
    const bucket = (d) => {
      const key = isoWeekKey(d);
      const cur = weekMap.get(key) || {
        week: key,
        weekLabel: weekCommencingLabel(d),
        submitted: 0,
        disbursed: 0,
      };
      weekMap.set(key, cur);
      return cur;
    };
    for (const c of filtered) {
      const d = parseDate(submittedOn(c));
      if (d) bucket(d).submitted += 1;
    }
    for (const c of disbursed) {
      const d = paidOn.get(c.id);
      if (d) bucket(d).disbursed += 1;
    }
    const submissionTrend = [...weekMap.values()].sort((a, b) =>
      a.week.localeCompare(b.week),
    );

    // top claimants
    const claimantMap = new Map();
    for (const c of filtered) {
      const key = c.employee || "Unknown";
      const cur = claimantMap.get(key) || { name: key, total: 0, count: 0 };
      cur.total += c.amount;
      cur.count += 1;
      claimantMap.set(key, cur);
    }
    const topClaimants = [...claimantMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // status distribution
    const statusDistribution = ["Pending", "Endorsed", "Paid", "Rejected"].map(
      (status) => ({
        status,
        count: filtered.filter((c) => c.status === status).length,
      }),
    );

    return {
      range,
      totals: {
        count: totalCount,
        spend: totalSpend,
        disbursed: disbursedTotal,
        disbursedCount: disbursed.length,
        pendingEndorsement,
        awaitingPayout,
        avgClaim,
        countDelta,
        spendDelta,
      },
      disbursedIds: new Set(disbursed.map((c) => c.id)),
      byDepartment,
      byCategory,
      policyCounts,
      topPolicyReasons,
      submissionTrend,
      topClaimants,
      statusDistribution,
    };
  }, [claims, range, auditLog]);
}
