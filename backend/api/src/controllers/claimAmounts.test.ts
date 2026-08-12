/**
 * The money sanity-check that guards claim submission and editing.
 *
 * This is the gap that let a claim of S$46.60 carry S$51.19 of GST all the way
 * through approval and payout: the policy engine compares a field against a
 * constant, so no rule it can express catches GST exceeding its own total, and
 * neither create nor edit checked anything beyond the presence of a receipt.
 */
import { checkClaimAmounts } from './claim.controller';

describe('checkClaimAmounts', () => {
  it('accepts an ordinary claim', () => {
    expect(checkClaimAmounts(46.6, 3.85)).toBeNull();
  });

  it('accepts a claim with no GST recorded', () => {
    expect(checkClaimAmounts(20, null)).toBeNull();
    expect(checkClaimAmounts(20, undefined)).toBeNull();
    expect(checkClaimAmounts(20, '')).toBeNull();
  });

  it('accepts GST of exactly zero, and GST equal to the total', () => {
    expect(checkClaimAmounts(20, 0)).toBeNull();
    // Equal is not impossible — a full-value adjustment line reads this way —
    // so the boundary is rejected only once GST goes above the total.
    expect(checkClaimAmounts(20, 20)).toBeNull();
  });

  it('rejects GST larger than the total, the case that reached production', () => {
    expect(checkClaimAmounts(46.6, 51.19)).toBe(
      'GST cannot be more than the claim total.',
    );
  });

  it('rejects an amount of zero or less', () => {
    expect(checkClaimAmounts(0, null)).toBe('Enter a claim amount greater than zero.');
    expect(checkClaimAmounts(-5, null)).toBe('Enter a claim amount greater than zero.');
  });

  it('rejects amounts that are not numbers at all', () => {
    for (const bad of ['abc', null, undefined, NaN, Infinity, {}]) {
      expect(checkClaimAmounts(bad, null)).toBe(
        'Enter a claim amount greater than zero.',
      );
    }
  });

  it('rejects a negative GST', () => {
    expect(checkClaimAmounts(20, -1)).toBe(
      'Enter a GST amount of zero or more, or leave it blank.',
    );
  });

  it('reads numeric strings, since form bodies arrive as text', () => {
    expect(checkClaimAmounts('46.60', '3.85')).toBeNull();
    expect(checkClaimAmounts('46.60', '51.19')).toBe(
      'GST cannot be more than the claim total.',
    );
  });
});
