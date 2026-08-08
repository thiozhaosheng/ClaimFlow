/**
 * Policy engine — shipped configuration.
 *
 * This suite runs against the REAL config/policies.json. It deliberately does
 * not mock `fs`. The previous version of this file mocked fs.readFileSync with
 * an inline two-rule fixture, which meant the rule set that actually ships was
 * never executed by any test, while docs/final_report_testing.md claimed the
 * "11-rule Policy Engine" was covered.
 *
 * Scope here is the configuration and the engine's plumbing: that the shipped
 * file is well formed, that it is read once and cached, and that an unmatched
 * claim falls through to the documented default.
 *
 * Per-rule behaviour is verified end-to-end in
 * src/routes/__tests__/claims.policy.integration.test.ts, which drives each
 * rule through POST /api/claims so the wiring is proven too, not just the
 * pure function. Operator semantics — including the six operators the shipped
 * config never exercises — live in policyEngine.operators.test.ts.
 */
import fs from 'fs';
import { loadPolicies, evaluateClaim } from './policyEngine';

const OUTCOMES = ['auto-approve', 'route-to-human', 'block'];

describe('shipped policies.json', () => {
  // These two values are quoted in docs/final_report_testing.md. Pinning them
  // makes that claim self-verifying: change the rule set and this test fails
  // until the report is updated to match.
  it('is the 11-rule catalogue the capstone report describes', () => {
    const policies = loadPolicies();

    expect(policies.version).toBe('2026-05-27.b');
    expect(policies.currency).toBe('SGD');
    expect(policies.rules).toHaveLength(11);

    const ids = policies.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('declares a well-formed outcome, condition set and message for every rule', () => {
    const policies = loadPolicies();

    for (const rule of policies.rules) {
      expect(rule.id).toEqual(expect.any(String));
      expect(rule.id.length).toBeGreaterThan(0);

      expect(OUTCOMES).toContain(rule.then);

      // An empty `when` would match every claim and shadow every rule below
      // it, since evaluateClaim uses Array.every and returns on first match.
      expect(Array.isArray(rule.when)).toBe(true);
      expect(rule.when.length).toBeGreaterThan(0);

      for (const cond of rule.when) {
        expect(cond.field).toEqual(expect.any(String));
        expect(cond.field.length).toBeGreaterThan(0);
        expect(cond.op).toEqual(expect.any(String));
      }

      // Surfaced to the submitter on a block, so it must say something.
      expect(rule.message).toEqual(expect.any(String));
      expect(rule.message.length).toBeGreaterThan(0);
    }
  });

  it('reads the file once and returns the identical cached object thereafter', () => {
    // `cached` is module scope, so it must be reset for the read to be
    // observable. clearMocks does not reset module state.
    jest.resetModules();
    const readSpy = jest.spyOn(fs, 'readFileSync');

    const engine = require('./policyEngine') as typeof import('./policyEngine');
    const first = engine.loadPolicies();
    const second = engine.loadPolicies();

    const policyReads = readSpy.mock.calls.filter(([p]) =>
      String(p).endsWith('policies.json'),
    );

    expect(policyReads).toHaveLength(1);
    expect(second).toBe(first); // identity, not deep equality

    readSpy.mockRestore();
  });
});

describe('evaluateClaim against the shipped rules', () => {
  it('falls through to route-to-human when no rule matches', () => {
    // Stationery is not a listed category, the amount clears every threshold,
    // and the date is in the past — so all 11 rules miss.
    const result = evaluateClaim({
      category: 'Stationery',
      amount: 10,
      receiptUrl: 'https://example.test/receipt.png',
      expenseDate: '2026-01-15',
    });

    expect(result).toEqual({
      outcome: 'route-to-human',
      ruleId: 'default',
      message: 'No rule matched; sending to a human reviewer.',
    });
  });
});
