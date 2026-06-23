/**
 * Core domain types for the Claims & Reimbursement platform.
 * Framework-agnostic — no React/Next imports allowed in this layer.
 */

export type ClaimStatus = "Pending" | "Endorsed" | "Paid" | "Rejected";

export type PolicyOutcome = "auto-approve" | "route-to-human" | "block";

export type Role = "employee" | "approving" | "finance";

/** A reimbursement claim. Amounts are in SGD cents-free decimals. */
export interface Claim {
  id: string;
  employee: string;
  department: string;
  /** Expense category — see CATEGORY data. */
  type: string;
  title: string;
  amount: number;
  gstAmount: number | null;
  date: string; // ISO yyyy-mm-dd
  merchant: string | null;
  bank: string | null;
  status: ClaimStatus;
  receiptUrl: string | null;
  /** Which OCR engine produced the prefill, if any. */
  ocrSource: "azure" | "mock" | "demo" | "unavailable" | null;
  /** Per-category structured details (see category-fields). */
  details: Record<string, string | number | null>;
  flagged?: boolean;
}

/** One immutable audit-trail entry for a claim. */
export interface ClaimActivity {
  id: string;
  actor: string;
  role: string;
  action: string;
  status: ClaimStatus;
  date: string;
  time: string;
  reason?: string;
}

/** The context the policy engine evaluates. */
export interface PolicyContext {
  category: string;
  amount: number;
  receiptUrl: string | null;
  expenseDate: string;
  supplierGstRegNumber?: string | null;
  details: Record<string, unknown>;
}

export interface PolicyResult {
  outcome: PolicyOutcome;
  ruleId: string;
  message: string;
}
