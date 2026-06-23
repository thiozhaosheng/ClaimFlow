import { describe, it, expect } from "vitest";
import {
  deriveStages,
  deriveRequirements,
  requirementsSummary,
} from "./claim-progress";
import type { Claim } from "./types";

const NOW = new Date("2024-12-01T00:00:00Z");

const base: Claim = {
  id: "CLM-1",
  employee: "Tester",
  department: "QA",
  type: "Meal",
  title: "Lunch",
  amount: 20,
  gstAmount: null,
  date: "2024-11-20",
  merchant: null,
  bank: null,
  status: "Pending",
  receiptUrl: null,
  ocrSource: null,
  details: {},
};

describe("deriveStages (SG 4-step flow)", () => {
  it("marks the current stage by status", () => {
    expect(deriveStages({ status: "Pending" }).map((s) => s.state)).toEqual([
      "done",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(deriveStages({ status: "Endorsed" }).map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
    ]);
    expect(deriveStages({ status: "Paid" }).map((s) => s.state)).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("uses the SG payout labels", () => {
    expect(deriveStages({ status: "Pending" }).map((s) => s.key)).toEqual([
      "submitted",
      "manager",
      "hr",
      "payout",
    ]);
  });

  it("shows a rejected manager step", () => {
    expect(
      deriveStages({ status: "Rejected" }).find((s) => s.key === "manager")?.state,
    ).toBe("rejected");
  });
});

describe("deriveRequirements", () => {
  it("requires a receipt above S$50 and flags it missing", () => {
    const reqs = deriveRequirements({ ...base, amount: 80 }, NOW);
    expect(reqs.find((r) => r.key === "receipt")?.state).toBe("missing");
  });

  it("blocks disallowed categories and stale claims", () => {
    expect(
      deriveRequirements({ ...base, type: "Club Subscription" }, NOW).find(
        (r) => r.key === "category",
      )?.state,
    ).toBe("blocked");
    expect(
      deriveRequirements({ ...base, date: "2024-01-01" }, NOW).find(
        (r) => r.key === "age",
      )?.state,
    ).toBe("blocked");
  });

  it("adds a tax-invoice review item above S$1,000", () => {
    expect(
      deriveRequirements({ ...base, amount: 1500 }, NOW).some(
        (r) => r.key === "tax-invoice",
      ),
    ).toBe(true);
  });
});

describe("requirementsSummary", () => {
  it("prioritises blocked > missing > review > complete", () => {
    expect(requirementsSummary([{ state: "blocked" }, { state: "missing" }])).toBe("blocked");
    expect(requirementsSummary([{ state: "missing" }, { state: "done" }])).toBe("missing");
    expect(requirementsSummary([{ state: "review" }, { state: "done" }])).toBe("review");
    expect(requirementsSummary([{ state: "done" }, { state: "optional" }])).toBe("complete");
  });
});
