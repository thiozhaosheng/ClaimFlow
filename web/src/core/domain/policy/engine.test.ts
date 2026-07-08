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

  it("routes Client Entertainment over S$300 for attendee review", () => {
    const r = evaluatePolicies(
      claimContextFromForm({
        category: "Client Entertainment",
        amount: 318.4,
        receiptUrl: "blob://x",
        expenseDate: "2026-06-01",
        details: {
          clientCompany: "Acme Pte Ltd",
          businessJustification: "Q3 renewal discussion",
        },
      }),
    );
    expect(r.outcome).toBe("route-to-human");
    expect(r.ruleId).toBe("route-entertainment-over-300");
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

  it("flags a potential duplicate claim", () => {
    const existingClaims: any[] = [
      {
        id: "CLM-1001",
        employee: "Sarah Tan",
        amount: 23.10,
        date: "2026-06-25",
        merchant: "Grab",
        category: "Transport",
      }
    ];

    const ctx = claimContextFromForm({
      category: "Transport",
      amount: 23.10,
      expenseDate: "2026-06-25",
      employee: "Sarah Tan",
      merchant: "Grab",
    });

    const r = evaluatePolicies(ctx, existingClaims);
    expect(r.outcome).toBe("route-to-human");
    expect(r.ruleId).toBe("flag-potential-duplicate");
    expect(r.duplicateFlag).toBe(true);
  });

  it("flags a GST calculation mismatch", () => {
    const ctx = claimContextFromForm({
      category: "Meal",
      amount: 109,
      expenseDate: "2026-06-01",
      details: {
        gstAmount: 18.00,
      }
    });

    const r = evaluatePolicies(ctx);
    expect(r.outcome).toBe("route-to-human");
    expect(r.ruleId).toBe("flag-gst-mismatch");
    expect(r.gstMatched).toBe(false);
  });

  it("passes validation on correct Singapore GST", () => {
    const ctx = claimContextFromForm({
      category: "Meal",
      amount: 30,
      receiptUrl: "blob://x",
      expenseDate: "2026-06-01",
      details: {
        gstAmount: 2.48,
      }
    });

    const r = evaluatePolicies(ctx);
    expect(r.outcome).toBe("auto-approve");
    expect(r.ruleId).toBe("auto-approve-small-meal");
  });
});

