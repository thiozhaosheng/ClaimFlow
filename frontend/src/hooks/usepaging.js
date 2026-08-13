import { useEffect, useMemo, useState } from "react";

/**
 * Pages a ledger.
 *
 * The audit trail rendered all 341 rows into one scroller, and it grows by
 * several rows per claim forever — a year of a real SME's claims is tens of
 * thousands of them. Every accounting package pages its ledger and states the
 * range out loud ("1–25 of 341"), because a scrollbar is not an answer to
 * "how far through am I" or "how much is there".
 *
 * Page size is the caller's, not a hardcoded 10: finance reads long, an
 * approver reads short.
 *
 * @param {Array} rows already filtered and sorted
 * @param {number} [initialSize]
 */
export function usePaging(rows, initialSize = 25) {
  const [size, setSize] = useState(initialSize);
  const [page, setPage] = useState(1);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));

  // Filtering or sorting can leave you on a page that no longer exists —
  // land on the last real one rather than an empty table with no explanation.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const start = (page - 1) * size;
  const pageRows = useMemo(
    () => rows.slice(start, start + size),
    [rows, start, size],
  );

  return {
    rows: pageRows,
    page,
    pageCount,
    size,
    total,
    // 1-based and inclusive, which is how the range is read aloud.
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
    setPage,
    setSize: (next) => {
      setSize(next);
      setPage(1);
    },
    next: () => setPage((p) => Math.min(p + 1, pageCount)),
    previous: () => setPage((p) => Math.max(p - 1, 1)),
  };
}
