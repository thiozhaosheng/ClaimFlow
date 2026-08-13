// Mirror of frontend/src/lib/policy.js — keeps approval-policy logic in one
// place per side. When the rule set changes, update both policies.json files.

import fs from 'fs';
import path from 'path';

const POLICIES_PATH = path.resolve(__dirname, '..', '..', 'config', 'policies.json');
const MS_PER_DAY = 86_400_000;

type Outcome = 'auto-approve' | 'route-to-human' | 'block';

interface Condition {
  field: string;
  op: string;
  value?: unknown;
}

interface Rule {
  id: string;
  label?: string;
  when: Condition[];
  then: Outcome;
  message: string;
}

interface PoliciesFile {
  version: string;
  currency: string;
  rules: Rule[];
}

interface ClaimContext {
  category: string;
  amount: number;
  receiptUrl: string | null;
  expenseDate: string | Date;
  supplierGstRegNumber?: string | null;
}

let cached: PoliciesFile | null = null;

export function loadPolicies(): PoliciesFile {
  if (cached) return cached;
  const raw = fs.readFileSync(POLICIES_PATH, 'utf-8');
  cached = JSON.parse(raw);
  return cached!;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(value: unknown, now = new Date()): number | null {
  const d = parseDate(value);
  if (!d) return null;
  return Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY);
}

function resolveField(ctx: any, fieldPath: string): unknown {
  if (!fieldPath) return undefined;
  const parts = fieldPath.split('.');
  let cur: any = ctx;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function evaluateCondition(cond: Condition, ctx: ClaimContext): boolean {
  const v: unknown = resolveField(ctx, cond.field);
  switch (cond.op) {
    case 'present':
      return v !== null && v !== undefined && v !== '';
    case 'missing':
      return v === null || v === undefined || v === '';
    case 'in':
      return Array.isArray(cond.value) && (cond.value as unknown[]).includes(v);
    case 'not_in':
      return Array.isArray(cond.value) && !(cond.value as unknown[]).includes(v);
    case '==':
      return v == cond.value;
    case '!=':
      return v != cond.value;
    case '>':
      if (cond.value === 'today') {
        const d = parseDate(v);
        return !!d && d > new Date();
      }
      return Number(v) > Number(cond.value);
    case '>=':
      return Number(v) >= Number(cond.value);
    case '<':
      return Number(v) < Number(cond.value);
    case '<=':
      return Number(v) <= Number(cond.value);
    case 'older_than_days': {
      const d = daysAgo(v);
      return d !== null && d > Number(cond.value);
    }
    case 'younger_than_days': {
      const d = daysAgo(v);
      return d !== null && d <= Number(cond.value);
    }
    default:
      return false;
  }
}

export interface PolicyResult {
  outcome: Outcome;
  ruleId: string;
  /**
   * The rule's written name from policies.json ("Missing receipt over S$50").
   * Notifications quote the rule at an approver, and quoting its id — or worse,
   * "default", which is not a rule — puts the engine's internal vocabulary in
   * front of someone deciding whether to release money. Absent when no rule
   * matched, because then there is nothing to name.
   */
  label?: string;
  message: string;
}

export function evaluateClaim(claim: ClaimContext): PolicyResult {
  const policies = loadPolicies();
  for (const rule of policies.rules) {
    if (rule.when.every((c) => evaluateCondition(c, claim))) {
      return { outcome: rule.then, ruleId: rule.id, label: rule.label, message: rule.message };
    }
  }
  return {
    outcome: 'route-to-human',
    ruleId: 'default',
    message: 'No rule matched; sending to a human reviewer.',
  };
}
