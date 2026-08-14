import { useMemo, useState } from "react";

/**
 * Click-to-sort for the ledgers.
 *
 * Every table in this app was fixed in one order. That is not what a ledger
 * is: an approver decides what to open first by age or by amount, and finance
 * chases the largest payouts before the small ones. Xero, Concur, QuickBooks
 * and every bank statement export sort on the column headers, and the absence
 * of it is one of the things that made these screens read as a mock-up of
 * software rather than software.
 *
 * The rules are the ordinary ones a person expects: the first click on a text
 * column sorts A→Z, the first click on a number or a date sorts largest or
 * newest first (nobody opens a queue wanting the smallest claim), and clicking
 * the same header again reverses it.
 *
 * @param {Array} rows
 * @param {Record<string, (row: any) => any>} accessors  column key → value
 * @param {string} initialKey
 * @param {"asc"|"desc"} [initialDirection]  newest/largest first by default;
 *   a queue worked oldest-first passes "asc"
 * @returns {{rows: Array, sortKey: string, direction: "asc"|"desc", toggle: (key: string) => void, ariaSort: (key: string) => string}}
 */
export function useSort(rows, accessors, initialKey, initialDirection = "desc") {
  const [sortKey, setSortKey] = useState(initialKey);
  const [direction, setDirection] = useState(initialDirection);

  const sorted = useMemo(() => {
    const read = accessors[sortKey];
    if (!read) return rows;
    const factor = direction === "asc" ? 1 : -1;
    // A copy: sorting the array we were handed would reorder the caller's
    // state and, in React, do it without telling anyone.
    return [...rows].sort((a, b) => {
      const av = read(a);
      const bv = read(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // absent values sit at the end either way
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * factor;
      }
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
    });
  }, [rows, accessors, sortKey, direction]);

  const toggle = (key) => {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    // Text reads naturally A→Z; numbers and dates are wanted biggest and
    // newest first.
    const sample = rows.find((r) => accessors[key]?.(r) != null);
    const value = sample ? accessors[key](sample) : null;
    setDirection(typeof value === "number" ? "desc" : "asc");
  };

  const ariaSort = (key) =>
    key === sortKey ? (direction === "asc" ? "ascending" : "descending") : "none";

  return { rows: sorted, sortKey, direction, toggle, ariaSort };
}
