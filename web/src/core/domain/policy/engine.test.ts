import { describe, it, expect } from "vitest";
import { evaluatePolicies, claimContextFromForm } from "./engine";

describe("policy engine (ported SG rules)", () => {
  it("auto-approves a small meal with a receipt", () => {
    const r = evaluatePolicies(
      claimContextFromForm({
        category: "Meal",
        amount: 18,
        receiptUrl: "blob://x",
        expenseDate: "2026-06-01",
      }),
    );
    expect(r.outcome).toBe("auto-approve");
    expect(r.ruleId).toBe("auto-approve-small-meal");
  });

  it("blocks a disallowed category", () => {
    const r = evaluatePolicies(
      claimContextFromForm({
        category: "Club Subscription",
        amount: 100,
        receiptUrl: "blob://x",
        expenseDate: "2026-06-01",
      }),
    );
    expect(r.outcome).toBe("block");
    expect(r.ruleId).toBe("block-disallowed-category");
  });

  it("blocks a >S$50 claim with no receipt", () => {
    const r = evaluatePolicies(
      claimContextFromForm({
        category: "Office Supplies",
        amount: 120,
        expenseDate: "2026-06-01",
      }),
    );
    expect(r.outcome).toBe("block");
    expect(r.ruleId).toBe("block-missing-receipt-over-threshold");
  });

  it("routes large amounts to a human", () => {
    const r = evaluatePolicies(
      claimContextFromForm({
        category: "Travel",
        amount: 900,
        receiptUrl: "blob://x",
        expenseDate: "2026-06-01",
      }),
    );
    expect(r.outcome).toBe("route-to-human");
    expect(r.ruleId).toBe("route-large-amount");
  });

  it("treats a pending file upload as a present receipt", () => {
    const ctx = claimContextFromForm({
      category: "Meal",
      amount: 10,
      hasFile: true,
      expenseDate: "2026-06-01",
    });
    expect(ctx.receiptUrl).toBe("pending-upload");
  });
});
