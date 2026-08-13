import { useCountUp } from "../hooks/useCountUp.js";

/**
 * A figure that moves when it changes.
 *
 * The motion is doing one job: making a change perceptible. These numbers move
 * for real reasons — a payout run empties part of the queue, a date range
 * narrows the spend, an approver's decision leaves the pending count one lower
 * — and a figure that silently reads differently from a second ago is a change
 * the reader has to notice on their own, or miss.
 *
 * It is deliberately not applied to figures that never move under the reader's
 * hand, because animating something static is decoration, and the hook snaps
 * straight to the value when the reader has asked for reduced motion.
 */
export default function AnimatedNumber({ value, format, decimals = 0, duration = 650 }) {
  const shown = useCountUp(Number(value) || 0, { decimals, duration });
  return <>{format ? format(shown) : shown.toLocaleString()}</>;
}
