/** Singapore dollar money helpers. Pure, locale-stable. */

const SGD = new Intl.NumberFormat("en-SG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as "S$1,420.50". Non-finite input → "S$0.00". */
export function formatSGD(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "S$0.00";
  return `S$${SGD.format(n)}`;
}

/** Format without the symbol — "1,420.50" — for tight stat tiles. */
export function formatAmount(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0.00";
  return SGD.format(n);
}
