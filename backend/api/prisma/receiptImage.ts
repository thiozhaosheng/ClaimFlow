/**
 * Draws the receipt a seeded claim was supposedly made from.
 *
 * The demo dataset used to attach one of three photographs at random to every
 * claim, and mark the claim `ocrSource: 'azure'` — which says "these figures
 * were read off this image". So CLM-1107 read "Scoot, S$1,031.72, scanned"
 * over a S$24.50 taxi receipt, and CLM-1106 put Singapore Airlines on the same
 * taxi slip. Opening almost any claim showed a receipt that disagreed with
 * every field beside it, which does not read as demo data — it reads as the
 * scan being badly broken, on the one feature the product is sold on.
 *
 * Three photographs cannot back a hundred and forty claims, so the receipt is
 * drawn from the claim instead: same merchant, same date, same total, same
 * GST. The scan then agrees with the image because the image was made from the
 * same numbers, the 9/109 check passes, and the review step shows no conflict.
 *
 * Every generated receipt carries a "DEMO DATA" line so it can never be
 * mistaken for a real document. The seed is deterministic (fixed-seed PRNG),
 * so the same files come out of every run and can be committed.
 */

export interface ReceiptSpec {
  merchant: string;
  /** ISO date, e.g. "2026-07-18" */
  date: string;
  category: string;
  total: number;
  gst: number | null;
  reference: string;
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const money = (n: number) => n.toFixed(2);

/** A plausible line description for the category, so the body is not blank. */
function lineFor(category: string): string {
  switch (category) {
    case 'Transport':
      return 'Trip fare';
    case 'Meal':
      return 'Food & beverage';
    case 'Client Entertainment':
      return 'Dining — client';
    case 'Office Supplies':
      return 'Stationery & supplies';
    case 'Travel':
      return 'Travel booking';
    case 'Training':
      return 'Course fee';
    case 'Medical (statutory)':
      return 'Consultation';
    default:
      return 'Purchase';
  }
}

export function receiptSvg(spec: ReceiptSpec): string {
  const { merchant, date, category, total, gst, reference } = spec;
  const net = gst != null ? total - gst : null;
  const printed = new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const rows: string[] = [];
  let y = 176;
  const row = (label: string, value: string, opts: { bold?: boolean } = {}) => {
    rows.push(
      `<text x="28" y="${y}" class="${opts.bold ? 'b' : 'r'}">${escape(label)}</text>` +
        `<text x="292" y="${y}" text-anchor="end" class="${opts.bold ? 'b' : 'r'}">${escape(value)}</text>`,
    );
    y += 26;
  };

  // The line item is the net, so printing "Net of GST" underneath it repeats
  // the same figure — which is what a real receipt does not do.
  row(lineFor(category), money(net ?? total));
  if (gst != null) row('GST 9%', money(gst));
  y += 6;
  rows.push(`<line x1="28" y1="${y - 20}" x2="292" y2="${y - 20}" class="rule" />`);
  row('TOTAL (SGD)', money(total), { bold: true });

  const height = y + 96;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="${height}" viewBox="0 0 320 ${height}" role="img" aria-label="Receipt from ${escape(merchant)}">
  <style>
    .r { font: 13px ui-monospace, "SF Mono", Menlo, monospace; fill: #1f2937; }
    .b { font: 700 14px ui-monospace, "SF Mono", Menlo, monospace; fill: #111827; }
    .h { font: 700 16px ui-monospace, "SF Mono", Menlo, monospace; fill: #111827; }
    .m { font: 11px ui-monospace, "SF Mono", Menlo, monospace; fill: #6b7280; }
    .rule { stroke: #d1d5db; stroke-width: 1; }
  </style>
  <rect x="0" y="0" width="320" height="${height}" fill="#ffffff" />
  <rect x="0.5" y="0.5" width="319" height="${height - 1}" fill="none" stroke="#e5e7eb" />
  <text x="160" y="46" text-anchor="middle" class="h">${escape(merchant)}</text>
  <text x="160" y="66" text-anchor="middle" class="m">Singapore</text>
  <line x1="28" y1="86" x2="292" y2="86" class="rule" />
  <text x="28" y="110" class="m">Date</text>
  <text x="292" y="110" text-anchor="end" class="m">${escape(printed)}</text>
  <text x="28" y="130" class="m">Ref</text>
  <text x="292" y="130" text-anchor="end" class="m">${escape(reference)}</text>
  <line x1="28" y1="148" x2="292" y2="148" class="rule" />
  ${rows.join('\n  ')}
  <text x="160" y="${height - 44}" text-anchor="middle" class="m">Thank you</text>
  <text x="160" y="${height - 22}" text-anchor="middle" class="m">DEMO DATA — not a real receipt</text>
</svg>
`;
}
