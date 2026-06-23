/**
 * Policy engine — faithful TypeScript port of the proven rule evaluator.
 * Pure & data-driven: rules live in policies.json; first match wins.
 */
import policies from "@/data/policies.json";
import { daysSince, parseDate } from "@/core/domain/dates";
import type { PolicyContext, PolicyOutcome, PolicyResult } from "@/core/domain/types";

type Op =
  | "present"
  | "missing"
  | "in"
  | "not_in"
  | "=="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "older_than_days"
  | "younger_than_days";

interface Condition {
  field: string;
  op: Op;
  value?: unknown;
}

interface Rule {
  id: string;
  label: string;
  when: Condition[];
  then: PolicyOutcome;
  message: string;
}

interface PolicyDoc {
  version: string;
  currency: string;
  rules: Rule[];
}

const doc = policies as PolicyDoc;

/** Dot-path resolver so rules can target "details.clientCompany". */
function resolveField(ctx: Record<string, unknown>, fieldPath: string): unknown {
  if (!fieldPath) return undefined;
  let cur: unknown = ctx;
  for (const part of fieldPath.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function evaluateCondition(
  cond: Condition,
  ctx: Record<string, unknown>,
): boolean {
  const v = resolveField(ctx, cond.field);
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
        const d = parseDate(v as string);
        return !!d && d > new Date();
      }
      return Number(v) > Number(cond.value);
    case ">=":
      return Number(v) >= Number(cond.value);
    case "<":
      return Number(v) < Number(cond.value);
    case "<=":
      return Number(v) <= Number(cond.value);
    case "older_than_days": {
      const d = daysSince(v as string);
      return d !== null && d > Number(cond.value);
    }
    case "younger_than_days": {
      const d = daysSince(v as string);
      return d !== null && d <= Number(cond.value);
    }
    default:
      return false;
  }
}

/** Walk rules in order; first full match wins, else route-to-human. */
export function evaluatePolicies(ctx: PolicyContext): PolicyResult {
  const flat = ctx as unknown as Record<string, unknown>;
  for (const rule of doc.rules) {
    if (rule.when.every((c) => evaluateCondition(c, flat))) {
      return { outcome: rule.then, ruleId: rule.id, message: rule.message };
    }
  }
  return {
    outcome: "route-to-human",
    ruleId: "default",
    message: "No rule matched; sending to a human reviewer.",
  };
}

export interface FormLike {
  category: string;
  amount: number | string;
  receiptUrl?: string | null;
  expenseDate: string;
  supplierGstRegNumber?: string | null;
  hasFile?: boolean;
  details?: Record<string, unknown>;
}

/** Build the policy context from raw form/claim state. */
export function claimContextFromForm(form: FormLike): PolicyContext {
  return {
    category: form.category,
    amount: Number(form.amount) || 0,
    receiptUrl: form.receiptUrl || (form.hasFile ? "pending-upload" : null),
    expenseDate: form.expenseDate,
    supplierGstRegNumber: form.supplierGstRegNumber ?? null,
    details: form.details ?? {},
  };
}

export const POLICY_VERSION = doc.version;
