import {
  ACTION_GROUPS,
  actionLabel,
  actionInGroup,
  remarkText,
} from "./auditTrail.js";
import policies from "../data/policies.json";

describe("actionLabel", () => {
  it("gives every action the API writes a human name", () => {
    // The full set, from `grep -rhoE "action: '[A-Z_]+'" backend/api/src prisma`
    // plus the two RECOMMENDATION_WITHHELD_* strings built inline.
    const written = [
      "POLICY_RECOMMENDED_APPROVAL",
      "ROUTED_TO_HUMAN",
      "RECOMMENDATION_WITHHELD_OCR_UNAVAILABLE",
      "RECOMMENDATION_WITHHELD_OCR_INCOMPLETE",
      "MANAGER_APPROVAL",
      "MANAGER_REJECTION",
      "CHANGES_REQUESTED",
      "CORRECTION_SUBMITTED",
      "FINANCE_REIMBURSEMENT",
      "WITHDRAWN_BY_SUBMITTER",
      "COMMENT",
    ];
    for (const action of written) {
      const label = actionLabel(action);
      expect(label).toBeTruthy();
      expect(label).not.toContain("_");
      expect(label).not.toBe(action);
    }
  });

  it("falls back to a readable form rather than dropping an unknown action", () => {
    expect(actionLabel("SOME_NEW_ACTION")).toBe("some new action");
    expect(actionLabel("")).toBe("");
  });
});

describe("actionInGroup", () => {
  it("passes everything for All", () => {
    expect(actionInGroup("MANAGER_APPROVAL", "All")).toBe(true);
    expect(actionInGroup("ANYTHING", "All")).toBe(true);
  });

  // The bug this replaced: the filters compared against rendered strings
  // ("Claim submitted", "Marked as paid") that no action has ever produced, so
  // each one emptied the table.
  it("matches the raw action, and every group has at least one member", () => {
    for (const [group, members] of Object.entries(ACTION_GROUPS)) {
      expect(members.length).toBeGreaterThan(0);
      for (const action of members) {
        expect(actionInGroup(action, group)).toBe(true);
      }
    }
  });

  it("keeps the groups disjoint, so a row can never be counted twice", () => {
    const seen = new Set();
    for (const members of Object.values(ACTION_GROUPS)) {
      for (const action of members) {
        expect(seen.has(action)).toBe(false);
        seen.add(action);
      }
    }
  });

  it("does not match an action from another group", () => {
    expect(actionInGroup("MANAGER_APPROVAL", "Paid")).toBe(false);
    expect(actionInGroup("FINANCE_REIMBURSEMENT", "Endorsed")).toBe(false);
  });
});

describe("remarkText", () => {
  it("swaps a bare rule id for the rule's written name", () => {
    const rule = policies.rules.find((r) => r.id === "route-large-amount");
    expect(remarkText("route-large-amount")).toBe(rule.label);
  });

  it("keeps the parenthetical when a rule id carries one", () => {
    expect(
      remarkText(
        "auto-approve-small-meal (recommendation withheld: OCR did not read the receipt)",
      ),
    ).toBe(
      "Small meal — within allowance (recommendation withheld: OCR did not read the receipt)",
    );
  });

  it('names "default" for what it is — not a rule', () => {
    expect(remarkText("default")).toBe("No rule matched");
  });

  it("leaves a sentence a person typed alone", () => {
    const typed = "Receipt total reads S$46.60, not S$620.00";
    expect(remarkText(typed)).toBe(typed);
  });

  it("returns nothing for an empty or missing remark", () => {
    expect(remarkText(null)).toBe("");
    expect(remarkText("   ")).toBe("");
  });

  it("every rule id in policies.json resolves to its label", () => {
    for (const rule of policies.rules) {
      expect(remarkText(rule.id)).toBe(rule.label);
    }
  });
});
