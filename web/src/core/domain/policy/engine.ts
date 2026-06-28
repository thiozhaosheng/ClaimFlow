/**
 * Policy engine — pre-compiled, fast, data-driven evaluator.
 * Faithful TypeScript port of the SG rule evaluator.
 */
import policies from "@/data/policies.json";
import { daysSince, parseDate } from "@/core/domain/dates";
import type { PolicyContext, PolicyOutcome, PolicyResult, Claim } from "@/core/domain/types";
import { formatSGD } from "@/core/domain/money";

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

interface CompiledRule {
  id: string;
  label: string;
  then: PolicyOutcome;
  message: string;
  when: ((ctx: Record<string, unknown>) => boolean)[];
}

// Pre-compiled rules array built once at module loading time for maximum performance
const compiledRules: CompiledRule[] = doc.rules.map((rule) => {
  return {
    id: rule.id,
    label: rule.label,
    then: rule.then,
    message: rule.message,
    when: rule.when.map((cond) => {
      const parts = cond.field.split(".");

      // Fast, compiled field resolver (nested path support without repeatedly splitting strings)
      const resolve = (ctx: Record<string, unknown>): unknown => {
        let cur: unknown = ctx;
        for (const part of parts) {
          if (cur == null || typeof cur !== "object") return undefined;
          cur = (cur as Record<string, unknown>)[part];
        }
        return cur;
      };

      switch (cond.op) {
        case "present":
          return (ctx) => {
            const v = resolve(ctx);
            return v !== null && v !== undefined && v !== "";
          };
        case "missing":
          return (ctx) => {
            const v = resolve(ctx);
            return v === null || v === undefined || v === "";
          };
        case "in":
          return (ctx) => {
            const v = resolve(ctx);
            return Array.isArray(cond.value) && cond.value.includes(v);
          };
        case "not_in":
          return (ctx) => {
            const v = resolve(ctx);
            return Array.isArray(cond.value) && !cond.value.includes(v);
          };
        case "==":
          return (ctx) => resolve(ctx) == cond.value;
        case "!=":
          return (ctx) => resolve(ctx) != cond.value;
        case ">":
          if (cond.value === "today") {
            return (ctx) => {
              const v = resolve(ctx);
              const d = parseDate(v as string);
              return !!d && d > new Date();
            };
          }
          return (ctx) => Number(resolve(ctx)) > Number(cond.value);
        case ">=":
          return (ctx) => Number(resolve(ctx)) >= Number(cond.value);
        case "<":
          return (ctx) => Number(resolve(ctx)) < Number(cond.value);
        case "<=":
          return (ctx) => Number(resolve(ctx)) <= Number(cond.value);
        case "older_than_days":
          return (ctx) => {
            const v = resolve(ctx);
            const d = daysSince(v as string);
            return d !== null && d > Number(cond.value);
          };
        case "younger_than_days":
          return (ctx) => {
            const v = resolve(ctx);
            const d = daysSince(v as string);
            return d !== null && d <= Number(cond.value);
          };
        default:
          return () => false;
      }
    }),
  };
});

/** Walk pre-compiled rules in order. Supports stateful checks (duplicates, GST mismatch). */
export function evaluatePolicies(ctx: PolicyContext, existingClaims?: Claim[]): PolicyResult {
  const flat = ctx as unknown as Record<string, unknown>;

  // 1. Stateful Duplicate Claim Detection Node
  if (existingClaims && ctx.employee && ctx.amount && ctx.expenseDate) {
    const duplicate = existingClaims.find((c) => {
      return (
        c.employee === ctx.employee &&
        c.amount === ctx.amount &&
        c.date === ctx.expenseDate &&
        (ctx.merchant ? c.merchant === ctx.merchant : true)
      );
    });
    if (duplicate) {
      return {
        outcome: "route-to-human",
        ruleId: "flag-potential-duplicate",
        message: `Potential duplicate claim flagged. Matches CLM code ${duplicate.id} submitted on ${duplicate.date} for ${formatSGD(duplicate.amount)}.`,
        duplicateFlag: true,
      };
    }
  }

  // 2. Automated Singapore GST 9% Auditing Node
  if (ctx.amount && ctx.details && ctx.details.gstAmount !== undefined) {
    const declaredGst = Number(ctx.details.gstAmount) || 0;
    if (declaredGst > 0) {
      // Singapore GST = Total * 9 / 109
      const expectedGst = (ctx.amount * 9) / 109;
      const diff = Math.abs(declaredGst - expectedGst);
      if (diff > 0.05) { // Rounding tolerance of 5 cents
        return {
          outcome: "route-to-human",
          ruleId: "flag-gst-mismatch",
          message: `GST calculation mismatch: Declared GST of S$${declaredGst.toFixed(2)} deviates from Singapore 9% GST (S$${expectedGst.toFixed(2)}) for total S$${ctx.amount.toFixed(2)}.`,
          gstMatched: false,
        };
      }
    }
  }

  // 3. Normal rule validation loop
  const ruleChecks: Array<{ ruleId: string; label: string; passed: boolean; outcome: string }> = [];

  for (const rule of compiledRules) {
    const passed = rule.when.every((c) => c(flat));
    ruleChecks.push({
      ruleId: rule.id,
      label: rule.label,
      passed,
      outcome: rule.then,
    });

    if (passed) {
      return {
        outcome: rule.then,
        ruleId: rule.id,
        message: rule.message,
        details: { ruleChecks },
      };
    }
  }

  return {
    outcome: "route-to-human",
    ruleId: "default",
    message: "No rule matched; routing to a human reviewer.",
    details: { ruleChecks },
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
  employee?: string;
  merchant?: string | null;
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
    employee: form.employee,
    merchant: form.merchant,
  };
}

export const POLICY_VERSION = doc.version;
