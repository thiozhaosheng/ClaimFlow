import { useMemo } from "react";
import policies from "../data/policies.json";

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

function inRange(claim, range, now) {
  if (range === "all") return true;
  const d = daysAgo(claim.date, now);
  if (d === null) return false;
  if (range === "30d") return d <= 30;
  if (range === "90d") return d <= 90;
  if (range === "ytd") {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return parseDate(claim.date) >= yearStart;
  }
  return true;
}

function evaluateCondition(cond, claim) {
  const v = claim[cond.field];
  switch (cond.op) {
    case "present":
      return v !== null && v !== undefined && v !== "";
    case "missing":
      return v === null || v === undefined || v === "";
    case "in":
      return Array.isArray(cond.value) && cond.value.includes(v);
    case "not_in":
      return Array.isArray(cond.value) && !cond.value.includes(v);
    case "==":
      return v == cond.value;
    case "!=":
      return v != cond.value;
    case ">":
      if (cond.value === "today") {
        const d = parseDate(v);
        return d && d > new Date();
      }
      return Number(v) > Number(cond.value);
    case ">=":
      return Number(v) >= Number(cond.value);
    case "<":
      return Number(v) < Number(cond.value);
    case "<=":
      return Number(v) <= Number(cond.value);
    case "older_than_days": {
      const d = daysAgo(v);
      return d !== null && d > cond.value;
    }
    case "younger_than_days": {
      const d = daysAgo(v);
      return d !== null && d <= cond.value;
    }
    default:
      return false;
  }
}

// Run policies against a claim and return the outcome of the first matching
// rule, or "route-to-human" by default.
function evaluatePolicies(claim) {
  // claim is in frontend shape; map fields the rules expect
  const ctx = {
    category: claim.type,
    amount: claim.amount,
    receiptUrl: claim.receiptUrl,
    expenseDate: claim.date,
    supplierGstRegNumber: null, // not surfaced in current shape
  };
  for (const rule of policies.rules) {
    const ok = rule.when.every((c) => evaluateCondition(c, ctx));
    if (ok) {
      return { outcome: rule.then, ruleId: rule.id };
    }
  }
  return { outcome: "route-to-human", ruleId: "default" };
}

function isoWeekKey(d) {
  // YYYY-Www
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date - yearStart) / MS_PER_DAY + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function useFinanceInsights(claims, range = "30d") {
  return useMemo(() => {
    const now = new Date();
    const filtered = claims.filter((c) => inRange(c, range, now));

    // overall totals
    const totalCount = filtered.length;
    const totalSpend = filtered.reduce((s, c) => s + (c.amount || 0), 0);
    const disbursed = filtered.filter((c) => c.status === "Paid");
    const disbursedTotal = disbursed.reduce((s, c) => s + c.amount, 0);
    const pendingEndorsement = filtered.filter((c) => c.status === "Pending").length;
    const awaitingPayout = filtered.filter((c) => c.status === "Endorsed").length;
    const avgClaim = totalCount ? totalSpend / totalCount : 0;

    // previous range delta
    const prev = claims.filter((c) => {
      const d = daysAgo(c.date, now);
      if (d === null) return false;
      if (range === "30d") return d > 30 && d <= 60;
      if (range === "90d") return d > 90 && d <= 180;
      return false;
    });
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

    // policy breakdown — run rules against each claim
    const policyCounts = { "auto-approve": 0, "route-to-human": 0, block: 0 };
    const policyReasons = {};
    for (const c of filtered) {
      const { outcome, ruleId } = evaluatePolicies(c);
      policyCounts[outcome] = (policyCounts[outcome] || 0) + 1;
      const key = `${outcome}:${ruleId}`;
      policyReasons[key] = (policyReasons[key] || 0) + 1;
    }
    const topPolicyReasons = Object.entries(policyReasons)
      .map(([key, count]) => {
        const [outcome, ruleId] = key.split(":");
        return { outcome, ruleId, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // submission trend — bucket filtered claims by ISO week
    const weekMap = new Map();
    for (const c of filtered) {
      const d = parseDate(c.date);
      if (!d) continue;
      const key = isoWeekKey(d);
      const cur = weekMap.get(key) || { week: key, submitted: 0, disbursed: 0 };
      cur.submitted += 1;
      if (c.status === "Paid") cur.disbursed += 1;
      weekMap.set(key, cur);
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
      byDepartment,
      byCategory,
      policyCounts,
      topPolicyReasons,
      submissionTrend,
      topClaimants,
      statusDistribution,
    };
  }, [claims, range]);
}
