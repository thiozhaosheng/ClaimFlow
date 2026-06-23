import { renderHook } from "@testing-library/react";
import { useCountUp } from "./useCountUp.js";

afterEach(() => {
  window.__reduceMotion = false;
});

describe("useCountUp", () => {
  it("starts at the target on first render", () => {
    const { result } = renderHook(() => useCountUp(42));
    expect(result.current).toBe(42);
  });

  it("snaps straight to the value when reduced motion is preferred", () => {
    window.__reduceMotion = true;
    const { result, rerender } = renderHook(({ v }) => useCountUp(v), {
      initialProps: { v: 0 },
    });
    rerender({ v: 100 });
    expect(result.current).toBe(100);
  });

  it("treats non-finite input as 0", () => {
    const { result } = renderHook(() => useCountUp(NaN));
    expect(result.current).toBe(0);
  });
});
