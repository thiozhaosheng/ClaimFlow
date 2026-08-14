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

  it('accepts GST of exactly zero', () => {
    expect(checkClaimAmounts(20, 0)).toBeNull();
  });

  it('accepts GST at exactly 9/109 of the total, and a cent of rounding', () => {
    // S$168.00 × 9/109 = S$13.8716… — the cent-rounded figure a receipt prints.
    expect(checkClaimAmounts(168, 13.87)).toBeNull();
    expect(checkClaimAmounts(168, 13.88)).toBeNull();
    expect(checkClaimAmounts(10, 0.83)).toBeNull();
  });

  it('accepts GST below 9% — zero-rated and exempt items pull it down', () => {
    expect(checkClaimAmounts(100, 4.5)).toBeNull();
  });

  it('rejects GST above 9/109 of the total — the stale-GST-after-correction case', () => {
    // A S$268 claim corrected to S$168 with GST left at the old S$22.13:
    // arithmetically impossible on a GST-inclusive total, and exactly what an
    // approver would otherwise have to catch by hand.
    expect(checkClaimAmounts(168, 22.13)).toBe(
      "GST looks too high — 9% GST on S$168.00 is S$13.87 at most. Check the receipt's GST line, or leave it blank.",
    );
    expect(checkClaimAmounts(20, 20)).toBe(
      "GST looks too high — 9% GST on S$20.00 is S$1.65 at most. Check the receipt's GST line, or leave it blank.",
    );
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
