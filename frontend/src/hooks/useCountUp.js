import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Ease-out cubic — fast then settling, so numbers feel like they "land".
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Animate a number from its previous value up to `value` with requestAnimationFrame.
 * Returns the current (in-flight) value. Honours prefers-reduced-motion and the
 * SSR/no-rAF case by snapping straight to the target.
 *
 * @param {number} value     target value
 * @param {object} [opts]
 * @param {number} [opts.duration=650]   animation length in ms
 * @param {number} [opts.decimals=0]     decimal places to round to
 * @returns {number}
 */
export function useCountUp(value, { duration = 650, decimals = 0 } = {}) {
  const target = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const factor = Math.pow(10, decimals);
    const round = (n) => Math.round(n * factor) / factor;

    if (
      from === target ||
      prefersReducedMotion() ||
      typeof requestAnimationFrame === "undefined"
    ) {
      fromRef.current = target;
      setDisplay(target);
      return undefined;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * easeOutCubic(t);
      setDisplay(round(next));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setDisplay(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration, decimals]);

  return display;
}
