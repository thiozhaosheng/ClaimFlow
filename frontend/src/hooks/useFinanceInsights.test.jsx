import { renderHook } from "@testing-library/react";
import { useFinanceInsights, claimInRange } from "./useFinanceInsights.js";

const iso = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};
const day = (daysAgo) => iso(daysAgo).slice(0, 10);

// A claim expensed long ago but filed yesterday. Ranging on the expense date
// put this outside every window but "All time", which is how "claims in the
// last 30 days" came to exclude the ones that had just arrived.
const lateFiled = {
  id: "CLM-001",
  type: "Travel",
  amount: 900,
  status: "Pending",
  date: day(120),
  createdAt: iso(1),
  department: "Sales",
  employee: "Rachel Tan",
  receiptUrl: "/r.svg",
  details: {},
};

const paidLastWeek = {
  id: "CLM-002",
  type: "Transport",
  amount: 20,
  status: "Paid",
  date: day(100),
  createdAt: iso(95),
  department: "Sales",
  employee: "Rachel Tan",
  receiptUrl: "/r.svg",
  details: {},
};

const auditLog = [
  { id: "CLM-002", actionKey: "FINANCE_REIMBURSEMENT", createdAt: iso(5) },
  { id: "CLM-002", actionKey: "MANAGER_APPROVAL", createdAt: iso(90) },
];

const view = (claims, range = "30d", log = []) =>
  renderHook(() => useFinanceInsights(claims, range, log)).result.current;

describe("claimInRange", () => {
  it("ranges on the submission date, not the expense date", () => {
    expect(claimInRange(lateFiled, "30d")).toBe(true);
  });

  it("falls back to the expense date when a claim has no createdAt", () => {
    const { createdAt, ...noCreated } = lateFiled;
    expect(claimInRange(noCreated, "30d")).toBe(false);
    expect(claimInRange(noCreated, "all")).toBe(true);
  });
});

describe("useFinanceInsights totals", () => {
  it("counts a claim filed this week even though the expense is old", () => {
    const v = view([lateFiled]);
    expect(v.totals.count).toBe(1);
    expect(v.totals.spend).toBe(900);
  });

  it("counts disbursement on the day the money left, from the audit trail", () => {
    // Submitted 95 days ago, so outside a 30-day window; paid 5 days ago, so
    // inside it. The old code asked "is this claim Paid, and is its EXPENSE in
    // range" and answered no to a payment made last week.
    const v = view([paidLastWeek], "30d", auditLog);
    expect(v.totals.disbursedCount).toBe(1);
    expect(v.totals.disbursed).toBe(20);
    // and it is not counted as a claim submitted in the window
    expect(v.totals.count).toBe(0);
  });

  it("reports no disbursement when the trail holds no payment", () => {
    const v = view([paidLastWeek], "30d", []);
    expect(v.totals.disbursedCount).toBe(0);
    expect(v.totals.disbursed).toBe(0);
  });

  it("plots submissions and payouts in their own weeks", () => {
    const v = view([lateFiled, paidLastWeek], "all", auditLog);
    const submitted = v.submissionTrend.reduce((s, w) => s + w.submitted, 0);
    const disbursed = v.submissionTrend.reduce((s, w) => s + w.disbursed, 0);
    expect(submitted).toBe(2);
    expect(disbursed).toBe(1);
    // The payout week is not the week the expense fell in.
    const payoutWeek = v.submissionTrend.find((w) => w.disbursed > 0);
    const submitWeek = v.submissionTrend.find((w) => w.submitted > 0);
    expect(payoutWeek.week).not.toBe(submitWeek.week);
  });
});

describe("useFinanceInsights policy tally", () => {
  // The hook used to run its own copy of the engine that passed no `details`,
  // so every Client Entertainment and Training claim came back blocked — a
  // verdict no live claim can hold, since the API refuses one with a 422.
  const entertainment = {
    id: "CLM-003",
    type: "Client Entertainment",
    amount: 268,
    status: "Pending",
    date: day(2),
    createdAt: iso(1),
    department: "Sales",
    employee: "Rachel Tan",
    receiptUrl: "/r.svg",
    details: {
      clientCompany: "Acme Pte Ltd",
      businessJustification: "Contract renewal discussion.",
    },
  };

  it("does not block a complete entertainment claim", () => {
    const v = view([entertainment]);
    expect(v.policyCounts.block).toBe(0);
    expect(v.policyCounts["route-to-human"]).toBe(1);
  });

  it("still blocks one that really is missing its justification", () => {
    const v = view([{ ...entertainment, details: { clientCompany: "Acme" } }]);
    expect(v.policyCounts.block).toBe(1);
  });

  it("never lists a raw rule id as a rule name", () => {
    const v = view([entertainment, lateFiled]);
    for (const reason of v.topPolicyReasons) {
      expect(reason.label).toBeTruthy();
      expect(reason.label).not.toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
