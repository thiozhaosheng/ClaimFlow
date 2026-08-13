import { useCallback, useState } from "react";

const DURATION = 260;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Lets a row leave a ledger visibly.
 *
 * Endorsing, rejecting or paying a claim removes it from the list you are
 * looking at, and until now it simply was not there on the next render — the
 * table silently reflowed and the reader had to work out from a toast which
 * line had gone. The row that changed is the one piece of information the
 * action produced, so it is worth 260ms.
 *
 * The motion runs BEFORE the refetch, on rows that are still in the data, so
 * nothing has to be held back artificially or re-inserted after the fact. When
 * the reader has asked for reduced motion the wait is skipped entirely and the
 * work happens at once.
 *
 * @returns {{isLeaving: (id: string) => boolean, exit: (ids: string[], run: () => Promise<any>) => Promise<any>}}
 */
export function useRowExit() {
  const [leaving, setLeaving] = useState(() => new Set());

  const isLeaving = useCallback((id) => leaving.has(id), [leaving]);

  const exit = useCallback(async (ids, run) => {
    const list = Array.from(ids);
    if (list.length === 0 || reducedMotion()) return run();

    setLeaving(new Set(list));
    // The animation and the request overlap: the rows are already on their way
    // out while the API is being asked, so the motion costs nothing in
    // practice unless the request is faster than the animation.
    const [result] = await Promise.all([
      run(),
      new Promise((resolve) => setTimeout(resolve, DURATION)),
    ]);
    setLeaving(new Set());
    return result;
  }, []);

  return { isLeaving, exit };
}
