// Pure functions for evaluating claims against policies.json rules.
// Shared by the employee form's compliance preflight panel and the
// finance dashboard's policy-breakdown computation.

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

export function evaluateCondition(cond, ctx) {
  const v = ctx[cond.field];
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

// Walk the rules in order; first match wins.
// Returns { outcome, ruleId, message } or default "route-to-human".
export function evaluatePolicies(ctx) {
  for (const rule of policies.rules) {
    const ok = rule.when.every((c) => evaluateCondition(c, ctx));
    if (ok) {
      return {
        outcome: rule.then,
        ruleId: rule.id,
        message: rule.message,
      };
    }
  }
  return {
    outcome: "route-to-human",
    ruleId: "default",
    message: "No rule matched; sending to a human reviewer.",
  };
}

// Convenience builder: pull the fields the rules expect from raw form state.
export function claimContextFromForm({
  category,
  amount,
  receiptUrl,
  expenseDate,
  supplierGstRegNumber = null,
  hasFile = false,
}) {
  return {
    category,
    amount: Number(amount) || 0,
    // policies use receiptUrl present/missing as a proxy for "receipt attached"
    receiptUrl: receiptUrl || (hasFile ? "pending-upload" : null),
    expenseDate,
    supplierGstRegNumber,
  };
}
