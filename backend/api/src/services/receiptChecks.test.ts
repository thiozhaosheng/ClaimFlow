/**
 * The verification that stands between a receipt scan and the claim form.
 *
 * Each case here is a real reading from the three reference receipts, or the
 * failure mode it exists to catch.
 */
import { verifyParsedReceipt, gstFromInclusiveTotal } from './receiptChecks';

// Fixed "today" so the 90-day window is deterministic.
const NOW = new Date('2026-08-13T12:00:00Z');

describe('gstFromInclusiveTotal', () => {
  it('takes 9% out of a GST-inclusive total', () => {
    expect(gstFromInclusiveTotal(24.5)).toBeCloseTo(2.02, 2);
    expect(gstFromInclusiveTotal(46.6)).toBeCloseTo(3.85, 2);
    expect(gstFromInclusiveTotal(18.5)).toBeCloseTo(1.53, 2);
  });
});

describe('verifyParsedReceipt', () => {
  it('passes the Grab receipt through untouched — every field checks out', () => {
    const { parsed, checks } = verifyParsedReceipt(
      { total: 24.5, gstAmount: 2.02, expenseDate: '2026-07-18' },
      NOW,
    );
    expect(parsed).toEqual({ total: 24.5, gstAmount: 2.02, expenseDate: '2026-07-18' });
    expect(checks).toMatchObject({
      total: 'verified',
      gstAmount: 'verified',
      expenseDate: 'verified',
    });
    expect(checks.notes).toHaveLength(0);
  });

  it('reads a day-first date the way it was printed', () => {
    // The FairPrice receipt prints 18-07-26 and the scan returned 2018-07-26,
    // which is eight years out and was being prefilled silently.
    const { parsed, checks } = verifyParsedReceipt(
      { total: 46.6, gstAmount: 3.85, expenseDate: '2018-07-26' },
      NOW,
    );
    expect(parsed.expenseDate).toBe('2026-07-18');
    expect(checks.expenseDate).toBe('verified');
    expect(checks.notes.join(' ')).toContain('day-first');
  });

  it('withholds a date that cannot be made sense of', () => {
    const { parsed, checks } = verifyParsedReceipt(
      { total: 20, gstAmount: null, expenseDate: '2019-03-04' },
      NOW,
    );
    expect(parsed.expenseDate).toBeNull();
    expect(checks.expenseDate).toBe('unverified');
    expect(checks.notes.join(' ')).toContain('not within the last 90 days');
  });

  it('withholds a date in the future', () => {
    const { parsed, checks } = verifyParsedReceipt(
      { total: 20, gstAmount: null, expenseDate: '2026-09-01' },
      NOW,
    );
    expect(parsed.expenseDate).toBeNull();
    expect(checks.expenseDate).toBe('unverified');
  });

  it('withholds a tax line that is not 9% of the total', () => {
    const { parsed, checks } = verifyParsedReceipt(
      { total: 46.6, gstAmount: 51.19, expenseDate: '2026-08-01' },
      NOW,
    );
    expect(parsed.gstAmount).toBeNull();
    expect(checks.gstAmount).toBe('unverified');
    expect(checks.notes.join(' ')).toContain('9% GST on S$46.60 is S$3.85');
  });

  it('allows the rounding a printed receipt actually has', () => {
    // 9% of 100.00 inclusive is 8.26; a receipt printing 8.25 is not an error.
    const { checks } = verifyParsedReceipt(
      { total: 100, gstAmount: 8.25, expenseDate: '2026-08-01' },
      NOW,
    );
    expect(checks.gstAmount).toBe('verified');
  });

  it('accepts a receipt with no tax line, like a PayNow transfer', () => {
    const { parsed, checks } = verifyParsedReceipt(
      { total: 135, gstAmount: null, expenseDate: '2026-07-19' },
      NOW,
    );
    expect(parsed.gstAmount).toBeNull();
    expect(checks.gstAmount).toBe('absent');
    expect(checks.notes).toHaveLength(0);
  });

  it('drops a total that is not an amount, and the tax with it', () => {
    const { parsed, checks } = verifyParsedReceipt(
      { total: 0, gstAmount: 3.85, expenseDate: '2026-08-01' },
      NOW,
    );
    expect(parsed.total).toBeNull();
    expect(parsed.gstAmount).toBeNull();
    expect(checks.total).toBe('unverified');
  });
});
