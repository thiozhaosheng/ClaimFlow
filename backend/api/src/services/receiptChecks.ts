/**
 * Verification of what the receipt scan returned.
 *
 * The scan is good — measured against the three reference receipts it read 14
 * of 15 fields correctly — but "good" is not the bar. If an approver has to
 * re-check every field because any one of them might be wrong, the scan has
 * saved the submitter typing and cost the approver the same work twice over,
 * which is the double-handling this product exists to remove.
 *
 * The bar is different: **a field is either verified or it is not offered**.
 * Two of the three fields that matter can be verified without a human, because
 * arithmetic and the calendar are not opinions:
 *
 *   - GST on a Singapore receipt is 9% of a GST-inclusive total, so it must be
 *     total x 9/109. A tax line that does not satisfy that is either not GST
 *     or was misread.
 *   - A claim's expense date has to be in the claim window and cannot be in the
 *     future. The FairPrice reference receipt prints "18-07-26" (DD-MM-YY) and
 *     the scan returned 2018-07-26 — eight years out, silently prefilled into
 *     the form. Read as DD-MM-YY it is 2026-07-18, which is inside the window
 *     and matches the receipt.
 *
 * So each field comes back marked. What is verified is prefilled and can be
 * trusted; what is not is left blank for the submitter to type, and the
 * approver is told which is which instead of being asked to audit all of it.
 */

/** Singapore GST is 9%, charged inside the printed total. */
export const GST_RATE = 0.09;
const GST_TOLERANCE = 0.03; // rounding on a printed receipt, in dollars
const MAX_AGE_DAYS = 90;

export type FieldVerdict = 'verified' | 'unverified' | 'absent';

export interface ReceiptChecks {
  total: FieldVerdict;
  gstAmount: FieldVerdict;
  expenseDate: FieldVerdict;
  /**
   * The merchant name as it appeared on the receipt, kept verbatim.
   *
   * It cannot be verified by arithmetic — only a person can say whether "Cold
   * Storage" is the shop on an NTUC FairPrice slip — but discarding it left
   * the approver with no way to notice the difference at all. A claim in the
   * demo data reads "Cold Storage" against a FairPrice receipt, and the
   * correction raised on it named the amount and the GST, which both match.
   * The one field that was wrong was the one nothing could see.
   */
  scannedMerchant: string | null;
  /** Plain-language reasons, for the fields that did not pass. */
  notes: string[];
}

/** GST implied by a GST-inclusive total. */
export const gstFromInclusiveTotal = (total: number) =>
  Math.round(((total * GST_RATE) / (1 + GST_RATE)) * 100) / 100;

/**
 * A date printed DD-MM-YY is ambiguous to a parser that expects YY-MM-DD.
 * Returns the same day read the other way round, when that reading exists.
 */
function swapDayAndYear(iso: string): string | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, year, month, day] = m;
  // 2018-07-26 was printed 18-07-26: the last pair is the year, the first the
  // day. Rebuild it as 20{day}-{month}-{year mod 100}.
  const rebuilt = `20${day}-${month}-${year.slice(2)}`;
  const parsed = new Date(rebuilt);
  return Number.isNaN(parsed.getTime()) ? null : rebuilt;
}

const withinWindow = (iso: string, now: Date) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const ageDays = Math.round((today - day) / 86_400_000);
  return ageDays >= 0 && ageDays <= MAX_AGE_DAYS;
};

/**
 * Checks a parsed receipt and returns it with unverifiable values removed.
 *
 * @param parsed the scan result
 * @param now injected so the window check is testable
 */
export function verifyParsedReceipt<
  T extends {
    total: number | null;
    gstAmount: number | null;
    expenseDate: string | null;
    merchant?: string | null;
  },
>(parsed: T, now: Date = new Date()): { parsed: T; checks: ReceiptChecks } {
  const notes: string[] = [];
  const out = { ...parsed };

  // --- total: nothing to check it against, but it must be a real amount ----
  let total: FieldVerdict = 'absent';
  if (out.total != null && Number.isFinite(out.total) && out.total > 0) {
    total = 'verified';
  } else if (out.total != null) {
    out.total = null;
    total = 'unverified';
    notes.push('The total on the receipt could not be read as an amount.');
  }

  // --- GST: must be 9% of the inclusive total ------------------------------
  let gstAmount: FieldVerdict = 'absent';
  if (out.gstAmount != null && out.total != null) {
    const expected = gstFromInclusiveTotal(out.total);
    if (Math.abs(out.gstAmount - expected) <= GST_TOLERANCE) {
      gstAmount = 'verified';
    } else {
      notes.push(
        `The tax line read as S$${out.gstAmount.toFixed(2)}, but 9% GST on S$${out.total.toFixed(2)} is S$${expected.toFixed(2)}. Left blank to be checked.`,
      );
      out.gstAmount = null;
      gstAmount = 'unverified';
    }
  } else if (out.gstAmount != null) {
    // A tax figure with no total to test it against is not offered.
    out.gstAmount = null;
    gstAmount = 'unverified';
    notes.push('A tax amount was read but there is no total to check it against.');
  }

  // --- date: must be inside the claim window -------------------------------
  let expenseDate: FieldVerdict = 'absent';
  if (out.expenseDate) {
    if (withinWindow(out.expenseDate, now)) {
      expenseDate = 'verified';
    } else {
      const swapped = swapDayAndYear(out.expenseDate);
      if (swapped && withinWindow(swapped, now)) {
        // The day-first reading is the one that makes sense.
        out.expenseDate = swapped;
        expenseDate = 'verified';
        notes.push(
          'The date was printed day-first and has been read that way.',
        );
      } else {
        notes.push(
          `The date read as ${out.expenseDate}, which is not within the last ${MAX_AGE_DAYS} days. Left blank to be entered.`,
        );
        out.expenseDate = null;
        expenseDate = 'unverified';
      }
    }
  }

  return {
    parsed: out,
    checks: {
      total,
      gstAmount,
      expenseDate,
      scannedMerchant: out.merchant ?? null,
      notes,
    },
  };
}
