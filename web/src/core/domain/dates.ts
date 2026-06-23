/** Date helpers — SG locale, ISO-first. Pure. */

const MS_PER_DAY = 86_400_000;

export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days between `value` and `now` (negative if `value` is in the future). */
export function daysSince(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  const d = parseDate(value);
  if (!d) return null;
  return Math.floor((now.getTime() - d.getTime()) / MS_PER_DAY);
}

/** "26 May 2026" — SG-style. */
export function formatDate(value: string | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return value ? String(value) : "";
  return d.toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
