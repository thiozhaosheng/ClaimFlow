// The homepage hero card claims specific policy verdicts for specific
// claims. These tests run each scenario's claim through the real policy
// engine so the card can't drift from policies.json without failing CI.
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";
import { OUTCOMES, SCENARIOS } from "./signin.scenarios.js";

const EXPECTED_OUTCOME = {
  approved: "auto-approve",
  review: "route-to-human",
  blocked: "block",
};

const money = (s) => Number(/S\$([\d.]+)/.exec(s)[1]);

describe("homepage hero scenarios", () => {
  it.each(OUTCOMES)(
    "%s: the rule the card cites is the rule that actually fires",
    (key) => {
      const scenario = SCENARIOS[key];
      const verdict = evaluatePolicies(claimContextFromForm(scenario.claim));
      expect(verdict.ruleId).toBe(scenario.rule);
      expect(verdict.outcome).toBe(EXPECTED_OUTCOME[key]);
    },
  );

  it.each(OUTCOMES)(
    "%s: the displayed GST is the 9% inclusive share of the amount",
    (key) => {
      const scenario = SCENARIOS[key];
      const amount = money(scenario.amount);
      const gst = money(scenario.gst);
      expect(gst.toFixed(2)).toBe(((amount * 9) / 109).toFixed(2));
    },
  );

  it.each(OUTCOMES)(
    "%s: the claim uses an amount consistent with its own card",
    (key) => {
      const scenario = SCENARIOS[key];
      expect(scenario.claim.amount).toBe(money(scenario.amount));
    },
  );
});
