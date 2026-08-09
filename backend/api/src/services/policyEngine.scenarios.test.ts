/**
 * Unit tests — Policy Engine (`evaluateClaim`)
 * ---------------------------------------------------------------------------
 * `evaluateClaim` is the business-logic core of ClaimFlow: it decides whether a
 * submitted expense claim is auto-approved, routed to a human reviewer, or
 * blocked outright under the company/IRAS rule set. It is the same logic
 * exercised by the integration test (`POST /claims`) and the E2E journey, which
 * makes it the bottom layer of our vertical slice.
 *
 * Advanced techniques demonstrated here:
 *   - STUB : `POLICY_STUB` — a hand-written, fixed rule set that stands in for
 *            the real `config/policies.json`, so tests never depend on the
 *            production rule file (which changes as policy changes).
 *   - MOCK : `jest.mock('fs')` — replaces the real filesystem dependency, so no
 *            disk I/O happens and the engine is isolated from its environment.
 *   - SPY  : `jest.spyOn(fs, 'readFileSync')` — observes *how* the collaborator
 *            is called, proving the policy file is read once and then cached.
 *
 * Every test follows the AAA pattern: Arrange, Act, Assert.
 */

import fs from 'fs';

// --- MOCK: replace the real filesystem module for this entire test suite. ---
jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

// --- STUB: fixed, predictable test data standing in for config/policies.json.
// Mirrors the real file's shape and a representative slice of its rules.
const POLICY_STUB = {
  version: 'test-1.0',
  currency: 'SGD',
  rules: [
    {
      id: 'block-disallowed-category',
      label: 'Disallowed category',
      when: [
        {
          field: 'category',
          op: 'in',
          value: ['Club Subscription', 'Medical (non-statutory)'],
        },
      ],
      then: 'block',
      message: 'This category is not eligible for reimbursement.',
    },
    {
      id: 'auto-approve-small-transport',
      label: 'Small transport',
      when: [
        { field: 'category', op: '==', value: 'Transport' },
        { field: 'amount', op: '<=', value: 50 },
        { field: 'receiptUrl', op: 'present' },
      ],
      then: 'auto-approve',
      message: 'Transport claims up to S$50 with a receipt auto-approve.',
    },
  ],
};

/**
 * The engine caches the parsed policy file in module scope. Re-requiring it
 * through `jest.isolateModules` gives every test a fresh, empty cache so tests
 * stay independent of one another and of execution order.
 */
function loadFreshEngine(): typeof import('./policyEngine') {
  let engine!: typeof import('./policyEngine');
  jest.isolateModules(() => {
    engine = require('./policyEngine');
  });
  return engine;
}

/** Builds a valid baseline claim; each test overrides only what it cares about. */
function buildClaim(overrides: Record<string, unknown> = {}) {
  return {
    category: 'Transport',
    amount: 20,
    receiptUrl: '/receipts/grab-001.png',
    expenseDate: new Date('2026-01-15'),
    ...overrides,
  } as any;
}

beforeEach(() => {
  // The mocked filesystem always serves the STUB rule set.
  mockedFs.readFileSync.mockReturnValue(JSON.stringify(POLICY_STUB));
});

describe('policyEngine — evaluateClaim', () => {
  // TEST 1 — HAPPY PATH
  it('auto-approves a small transport claim that has a receipt', () => {
    // Arrange
    const { evaluateClaim } = loadFreshEngine();
    const claim = buildClaim({ category: 'Transport', amount: 20 });

    // Act
    const result = evaluateClaim(claim);

    // Assert
    expect(result.outcome).toBe('auto-approve');
    expect(result.ruleId).toBe('auto-approve-small-transport');
  });

  // TEST 2 — EDGE CASE: the rule is `amount <= 50`, so exactly 50 must pass.
  // An off-by-one here silently changes who gets paid without review.
  it('auto-approves at the exact S$50 boundary', () => {
    // Arrange
    const { evaluateClaim } = loadFreshEngine();
    const claim = buildClaim({ amount: 50 });

    // Act
    const result = evaluateClaim(claim);

    // Assert
    expect(result.outcome).toBe('auto-approve');
    expect(result.ruleId).toBe('auto-approve-small-transport');
  });

  // TEST 3 — EDGE CASE + SPY: a disallowed category is blocked whatever the
  // amount, and the spy proves the policy file is read once and then cached
  // rather than re-read on every evaluation.
  it('blocks a disallowed category and reads the policy file only once', () => {
    // Arrange
    const readSpy = jest.spyOn(mockedFs, 'readFileSync');
    const { evaluateClaim } = loadFreshEngine();
    const claim = buildClaim({ category: 'Club Subscription', amount: 5 });

    // Act — evaluate twice through the same module instance.
    const first = evaluateClaim(claim);
    const second = evaluateClaim(claim);

    // Assert — outcome
    expect(first.outcome).toBe('block');
    expect(first.ruleId).toBe('block-disallowed-category');
    expect(second.outcome).toBe('block');

    // Assert — interaction: two evaluations, one file read.
    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledWith(
      expect.stringContaining('policies.json'),
      'utf-8',
    );
  });
});
