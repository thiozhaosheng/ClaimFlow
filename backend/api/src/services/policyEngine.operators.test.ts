/**
 * Policy engine — operator semantics.
 *
 * OPERATOR-SEMANTICS FIXTURE. This suite mocks the policy file on purpose.
 * That is the opposite of what policyEngine.test.ts does, so the distinction
 * matters: the SHIPPED 11-rule catalogue is verified for real in
 * policyEngine.test.ts (no mocks), and one shipped rule is driven over HTTP in
 * src/routes/claim.routes.test.ts. Nothing here is evidence about the shipped
 * rules.
 *
 * A fixture is unavoidable here because config/policies.json only ever uses
 * six of the twelve operators the engine implements:
 *
 *   used by the shipped rules:  in, ==, >, <=, present, missing
 *   never reachable in prod:    not_in, !=, >=, <, older_than_days,
 *                               younger_than_days
 *
 * Running the real config therefore cannot cover half the switch statement.
 * Driving synthetic single-condition rules through evaluateClaim covers all
 * twelve, plus resolveField and parseDate, which no other test touches.
 */

type Cond = { field: string; op: string; value?: unknown };
type Rule = { id: string; when: Cond[]; then: string; message: string };

const MS_PER_DAY = 86_400_000;

/**
 * Build a fresh policyEngine bound to a synthetic rule set.
 *
 * Two details are load-bearing:
 *
 *  - jest.resetModules() clears the module-scope `cached` in policyEngine.ts.
 *    clearMocks does not touch module state, so without this every call after
 *    the first would silently reuse the previous fixture.
 *  - the module must be require()d *after* jest.doMock, inside the test body.
 *    A top-level import binds once, before any mock is installed.
 *
 * The fs mock passes every path except policies.json through to the real
 * implementation so ts-jest can still read source files.
 */
function engineWithRules(rules: Rule[]) {
  jest.resetModules();
  jest.doMock('fs', () => {
    const real = jest.requireActual<typeof import('fs')>('fs');
    return {
      ...real,
      readFileSync: (p: unknown, enc?: unknown) =>
        String(p).endsWith('policies.json')
          ? JSON.stringify({ version: 'operator-fixture', currency: 'SGD', rules })
          : (real.readFileSync as (a: unknown, b: unknown) => unknown)(p, enc),
    };
  });
  return require('./policyEngine') as typeof import('./policyEngine');
}

/** True when a single-condition probe rule matched the claim. */
function matches(when: Cond[], claim: Record<string, unknown>): boolean {
  const { evaluateClaim } = engineWithRules([
    { id: 'probe', when, then: 'block', message: 'probe matched' },
  ]);
  return evaluateClaim(claim as never).ruleId === 'probe';
}

/** Shorthand for a one-condition probe. */
const hit = (field: string, op: string, value: unknown, claim: Record<string, unknown>) =>
  matches([{ field, op, value }], claim);

const daysFromNow = (n: number) => new Date(Date.now() + n * MS_PER_DAY).toISOString();

describe('presence operators', () => {
  it('treats 0 and false as present, but null, undefined and "" as absent', () => {
    // The check is an explicit !== against three values, not a truthiness
    // test, so a zero amount is present. A falsy-based implementation would
    // wrongly block a legitimate S$0 claim.
    expect(hit('amount', 'present', undefined, { amount: 0 })).toBe(true);
    expect(hit('flag', 'present', undefined, { flag: false })).toBe(true);

    expect(hit('receiptUrl', 'present', undefined, { receiptUrl: null })).toBe(false);
    expect(hit('receiptUrl', 'present', undefined, {})).toBe(false);
    expect(hit('receiptUrl', 'present', undefined, { receiptUrl: '' })).toBe(false);
  });

  it('makes missing the exact complement of present', () => {
    expect(hit('amount', 'missing', undefined, { amount: 0 })).toBe(false);
    expect(hit('flag', 'missing', undefined, { flag: false })).toBe(false);

    expect(hit('receiptUrl', 'missing', undefined, { receiptUrl: null })).toBe(true);
    expect(hit('receiptUrl', 'missing', undefined, {})).toBe(true);
    expect(hit('receiptUrl', 'missing', undefined, { receiptUrl: '' })).toBe(true);
  });
});

describe('membership operators', () => {
  it('matches in on membership and not_in on absence', () => {
    const blocked = ['Club Subscription', 'Family Benefit'];

    expect(hit('category', 'in', blocked, { category: 'Family Benefit' })).toBe(true);
    expect(hit('category', 'in', blocked, { category: 'Meal' })).toBe(false);

    // not_in is never exercised by the shipped rules.
    expect(hit('category', 'not_in', blocked, { category: 'Meal' })).toBe(true);
    expect(hit('category', 'not_in', blocked, { category: 'Family Benefit' })).toBe(false);
  });

  it('returns false for both when the configured value is not an array', () => {
    // Both branches guard on Array.isArray, so not_in fails closed rather than
    // defaulting to true. A malformed rule silently never matches — worth
    // knowing, since nothing validates policies.json at load time.
    expect(hit('category', 'in', 'Meal', { category: 'Meal' })).toBe(false);
    expect(hit('category', 'not_in', 'Meal', { category: 'Meal' })).toBe(false);
    expect(hit('category', 'not_in', undefined, { category: 'Meal' })).toBe(false);
  });
});

describe('equality operators', () => {
  it('compares loosely, so "30" equals 30', () => {
    // Characterisation of current behaviour: evaluateCondition uses == / !=,
    // not === / !==. A string amount arriving from an untyped payload will
    // satisfy a numeric rule.
    expect(hit('amount', '==', 30, { amount: '30' })).toBe(true);
    expect(hit('amount', '!=', 30, { amount: '30' })).toBe(false);

    expect(hit('category', '==', 'Meal', { category: 'Meal' })).toBe(true);
    expect(hit('category', '!=', 'Meal', { category: 'Transport' })).toBe(true);
  });
});

describe('numeric comparison operators', () => {
  it('is strict for > and < and inclusive for >= and <= at the boundary', () => {
    expect(hit('amount', '>', 50, { amount: 50 })).toBe(false);
    expect(hit('amount', '>', 50, { amount: 50.01 })).toBe(true);

    expect(hit('amount', '>=', 50, { amount: 50 })).toBe(true);
    expect(hit('amount', '>=', 50, { amount: 49.99 })).toBe(false);

    expect(hit('amount', '<', 30, { amount: 30 })).toBe(false);
    expect(hit('amount', '<', 30, { amount: 29.99 })).toBe(true);

    expect(hit('amount', '<=', 30, { amount: 30 })).toBe(true);
    expect(hit('amount', '<=', 30, { amount: 30.01 })).toBe(false);
  });

  it('never matches when the field coerces to NaN', () => {
    // Number(undefined) and Number("abc") are NaN, and every NaN comparison
    // is false — so a missing amount fails an upper-bound rule AND a
    // lower-bound rule. It cannot be caught by a numeric threshold at all.
    expect(hit('amount', '>', 50, {})).toBe(false);
    expect(hit('amount', '<=', 50, {})).toBe(false);
    expect(hit('amount', '>', 50, { amount: 'abc' })).toBe(false);
    expect(hit('amount', '<', 50, { amount: 'abc' })).toBe(false);
  });
});

describe('date operators', () => {
  it('treats > "today" as a future-date check rather than a numeric one', () => {
    expect(hit('expenseDate', '>', 'today', { expenseDate: daysFromNow(1) })).toBe(true);
    expect(hit('expenseDate', '>', 'today', { expenseDate: daysFromNow(-1) })).toBe(false);
    // Evaluated a moment after construction, so "now" is already in the past.
    expect(hit('expenseDate', '>', 'today', { expenseDate: new Date().toISOString() })).toBe(
      false,
    );
  });

  it('applies a floored, strict boundary for older_than_days', () => {
    // daysAgo floors, and the comparison is d > value, so a claim exactly N
    // days old is NOT older than N. Off-by-one risk for any retention rule.
    expect(hit('expenseDate', 'older_than_days', 90, { expenseDate: daysFromNow(-90) })).toBe(
      false,
    );
    expect(hit('expenseDate', 'older_than_days', 90, { expenseDate: daysFromNow(-91) })).toBe(
      true,
    );
  });

  it('applies an inclusive boundary for younger_than_days and counts future dates as younger', () => {
    expect(hit('expenseDate', 'younger_than_days', 30, { expenseDate: daysFromNow(-30) })).toBe(
      true,
    );
    expect(hit('expenseDate', 'younger_than_days', 30, { expenseDate: daysFromNow(-31) })).toBe(
      false,
    );
    // daysAgo goes negative for a future date, and negative <= 30, so a
    // future-dated claim satisfies "younger than 30 days".
    expect(hit('expenseDate', 'younger_than_days', 30, { expenseDate: daysFromNow(5) })).toBe(
      true,
    );
  });

  it('never matches a date operator when the value cannot be parsed', () => {
    for (const op of ['older_than_days', 'younger_than_days']) {
      expect(hit('expenseDate', op, 30, { expenseDate: 'not-a-date' })).toBe(false);
      expect(hit('expenseDate', op, 30, { expenseDate: null })).toBe(false);
      // parseDate guards with `if (!value)`, so the epoch 0 is rejected as
      // falsy even though it is a valid instant.
      expect(hit('expenseDate', op, 30, { expenseDate: 0 })).toBe(false);
    }
    expect(hit('expenseDate', '>', 'today', { expenseDate: 'not-a-date' })).toBe(false);
  });
});

describe('field resolution and rule ordering', () => {
  it('walks dot-notation paths and yields undefined instead of throwing', () => {
    expect(
      hit('details.businessJustification', 'present', undefined, {
        details: { businessJustification: 'Team offsite' },
      }),
    ).toBe(true);

    // Missing intermediate object must not throw — resolveField bails on null.
    expect(hit('details.businessJustification', 'missing', undefined, {})).toBe(true);
    expect(
      hit('details.businessJustification', 'missing', undefined, { details: null }),
    ).toBe(true);
    expect(hit('a.b.c.d', 'missing', undefined, { a: { b: {} } })).toBe(true);
  });

  it('returns false for an unrecognised operator and stops at the first matching rule', () => {
    // Unknown operators hit the switch default and fail closed.
    expect(hit('amount', 'approximately', 50, { amount: 50 })).toBe(false);

    // evaluateClaim returns on first match, so order in policies.json decides
    // the outcome when several rules would match the same claim.
    const { evaluateClaim } = engineWithRules([
      { id: 'first', when: [{ field: 'amount', op: '>', value: 10 }], then: 'block', message: 'first' },
      { id: 'second', when: [{ field: 'amount', op: '>', value: 20 }], then: 'auto-approve', message: 'second' },
    ]);

    const result = evaluateClaim({ amount: 100 } as never);
    expect(result.ruleId).toBe('first');
    expect(result.outcome).toBe('block');
  });
});
