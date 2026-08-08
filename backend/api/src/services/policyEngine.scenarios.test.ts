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
 *
 * Companion suites, deliberately kept separate because they answer a different
 * question against a different rule set:
 *   - policyEngine.test.ts            runs the *shipped* config/policies.json,
 *                                     so a policy change fails the build.
 *   - policyEngine.operators.test.ts  covers each of the twelve operators.
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
      id: 'block-future-date',
      label: 'Future-dated claim',
      when: [{ field: 'expenseDate', op: '>', value: 'today' }],
      then: 'block',
      message: 'The expense date is in the future.',
    },
    {
      id: 'block-missing-receipt-over-threshold',
      label: 'Missing receipt over S$50',
      when: [
        { field: 'amount', op: '>', value: 50 },
        { field: 'receiptUrl', op: 'missing' },
      ],
      then: 'block',
      message: 'A receipt image is required for claims above S$50.',
    },
    {
      id: 'route-late-night-transport',
      label: 'Late-night transport',
      when: [
        { field: 'category', op: '==', value: 'Transport' },
        { field: 'details.travelWindow', op: '==', value: 'Late night (22-06)' },
        { field: 'amount', op: '>', value: 25 },
      ],
      then: 'route-to-human',
      message: 'Late-night transport over S$25 needs a manager check.',
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
  describe('happy path', () => {
    it('auto-approves a small transport claim that has a receipt', () => {
      // Arrange
      const { evaluateClaim } = loadFreshEngine();
      const claim = buildClaim({ category: 'Transport', amount: 20 });

      // Act
      const result = evaluateClaim(claim);

      // Assert
      expect(result.outcome).toBe('auto-approve');
      expect(result.ruleId).toBe('auto-approve-small-transport');
      expect(result.message).toMatch(/auto-approve/i);
    });
  });

  describe('edge cases', () => {
    it('auto-approves at the exact S$50 boundary (inclusive "<=" limit)', () => {
      // Arrange — boundary value: the rule is `amount <= 50`, so 50 must pass.
      const { evaluateClaim } = loadFreshEngine();
      const claim = buildClaim({ amount: 50 });

      // Act
      const result = evaluateClaim(claim);

      // Assert
      expect(result.outcome).toBe('auto-approve');
      expect(result.ruleId).toBe('auto-approve-small-transport');
    });

    it('falls through to a human reviewer one cent above the boundary', () => {
      // Arrange — 50.01 matches no rule, so the engine must use its default.
      const { evaluateClaim } = loadFreshEngine();
      const claim = buildClaim({ amount: 50.01 });

      // Act
      const result = evaluateClaim(claim);

      // Assert
      expect(result.outcome).toBe('route-to-human');
      expect(result.ruleId).toBe('default');
    });

    it('blocks a disallowed expense category regardless of amount', () => {
      // Arrange
      const { evaluateClaim } = loadFreshEngine();
      const claim = buildClaim({ category: 'Club Subscription', amount: 5 });

      // Act
      const result = evaluateClaim(claim);

      // Assert
      expect(result.outcome).toBe('block');
      expect(result.ruleId).toBe('block-disallowed-category');
    });

    it('blocks a future-dated claim', () => {
      // Arrange — expense dated a week from now.
      const { evaluateClaim } = loadFreshEngine();
      const nextWeek = new Date(Date.now() + 7 * 86_400_000);
      const claim = buildClaim({ expenseDate: nextWeek });

      // Act
      const result = evaluateClaim(claim);

      // Assert
      expect(result.outcome).toBe('block');
      expect(result.ruleId).toBe('block-future-date');
    });

    it('blocks a claim over S$50 when the receipt is missing', () => {
      // Arrange — multi-condition rule: both amount AND missing receipt.
      const { evaluateClaim } = loadFreshEngine();
      const claim = buildClaim({ amount: 120, receiptUrl: null });

      // Act
      const result = evaluateClaim(claim);

      // Assert
      expect(result.outcome).toBe('block');
      expect(result.ruleId).toBe('block-missing-receipt-over-threshold');
    });

    it('routes late-night transport over S$25 using a nested "details" field', () => {
      // Arrange — exercises dot-path resolution (details.travelWindow).
      const { evaluateClaim } = loadFreshEngine();
      const claim = buildClaim({
        amount: 40,
        details: { travelWindow: 'Late night (22-06)' },
      });

      // Act
      const result = evaluateClaim(claim);

      // Assert
      expect(result.outcome).toBe('route-to-human');
      expect(result.ruleId).toBe('route-late-night-transport');
    });

    it('applies the first matching rule when several rules could match', () => {
      // Arrange — a Club Subscription over S$50 with no receipt matches both
      // the disallowed-category rule and the missing-receipt rule. Rule order
      // in the file decides, and disallowed-category is declared first.
      const { evaluateClaim } = loadFreshEngine();
      const claim = buildClaim({
        category: 'Club Subscription',
        amount: 300,
        receiptUrl: null,
      });

      // Act
      const result = evaluateClaim(claim);

      // Assert
      expect(result.ruleId).toBe('block-disallowed-category');
    });
  });

  describe('collaborator interaction', () => {
    it('reads the policy file exactly once and caches it (SPY)', () => {
      // Arrange — a spy wraps the mocked collaborator so we can observe calls.
      const readSpy = jest.spyOn(mockedFs, 'readFileSync');
      const { evaluateClaim } = loadFreshEngine();

      // Act — three evaluations through the same module instance.
      evaluateClaim(buildClaim({ amount: 10 }));
      evaluateClaim(buildClaim({ amount: 20 }));
      evaluateClaim(buildClaim({ category: 'Club Subscription' }));

      // Assert — the cache means only the first call touches the filesystem.
      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenCalledWith(
        expect.stringContaining('policies.json'),
        'utf-8',
      );
    });
  });
});
