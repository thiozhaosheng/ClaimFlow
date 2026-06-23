import {
  deriveStages,
  deriveRequirements,
  requirementsSummary,
} from "./claimProgress.js";

const NOW = new Date("2024-12-01T00:00:00Z");

describe("deriveStages", () => {
  it("marks the current stage by status", () => {
    const s = deriveStages({ status: "Pending" });
    expect(s.map((x) => x.state)).toEqual(["done", "current", "upcoming"]);
  });

  it("advances as the claim progresses", () => {
    expect(deriveStages({ status: "Endorsed" }).map((x) => x.state)).toEqual([
      "done",
      "done",
      "current",
    ]);
    expect(deriveStages({ status: "Paid" }).map((x) => x.state)).toEqual([
      "done",
      "done",
      "done",
    ]);
  });

  it("shows a terminal rejected path", () => {
    const s = deriveStages({ status: "Rejected" });
    expect(s[s.length - 1]).toMatchObject({ key: "rejected", state: "rejected" });
  });

  it("defaults to Pending when status is missing", () => {
    expect(deriveStages({}).map((x) => x.state)).toEqual([
      "done",
      "current",
      "upcoming",
    ]);
  });
});

describe("deriveRequirements", () => {
  const base = { type: "Meal", date: "2024-11-20", status: "Pending" };

  it("requires a receipt above S$50 and flags it missing", () => {
    const reqs = deriveRequirements({ ...base, amount: 80 }, NOW);
    const receipt = reqs.find((r) => r.key === "receipt");
    expect(receipt.state).toBe("missing");
    expect(receipt.canUpload).toBe(true);
  });

  it("marks the receipt done when attached", () => {
    const reqs = deriveRequirements(
      { ...base, amount: 80, receiptUrl: "blob://x" },
      NOW,
    );
    expect(reqs.find((r) => r.key === "receipt").state).toBe("done");
  });

  it("treats a small claim's receipt as optional", () => {
    const reqs = deriveRequirements({ ...base, amount: 12 }, NOW);
    expect(reqs.find((r) => r.key === "receipt").state).toBe("optional");
  });

  it("adds a full-tax-invoice review item above S$1,000", () => {
    const reqs = deriveRequirements({ ...base, amount: 1500 }, NOW);
    expect(reqs.find((r) => r.key === "tax-invoice")).toBeTruthy();
  });

  it("blocks expenses past the 90-day window", () => {
    const reqs = deriveRequirements(
      { ...base, amount: 20, date: "2024-01-01" },
      NOW,
    );
    expect(reqs.find((r) => r.key === "age").state).toBe("blocked");
  });

  it("blocks disallowed categories", () => {
    const reqs = deriveRequirements(
      { ...base, amount: 20, type: "Club Subscription" },
      NOW,
    );
    expect(reqs.find((r) => r.key === "category").state).toBe("blocked");
  });
});

describe("requirementsSummary", () => {
  it("prioritises blocked > missing > review > complete", () => {
    expect(requirementsSummary([{ state: "done" }, { state: "blocked" }, { state: "missing" }])).toBe("blocked");
    expect(requirementsSummary([{ state: "done" }, { state: "missing" }])).toBe("missing");
    expect(requirementsSummary([{ state: "done" }, { state: "review" }])).toBe("review");
    expect(requirementsSummary([{ state: "done" }, { state: "optional" }])).toBe("complete");
  });
});
