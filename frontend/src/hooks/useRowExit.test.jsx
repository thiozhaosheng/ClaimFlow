import { renderHook, act, waitFor } from "@testing-library/react";
import { useRowExit } from "./useRowExit.js";

/**
 * The visual half of this (a row collapsing) has to be looked at in a browser.
 * What is testable is the contract underneath it: the rows are marked while
 * the request runs, the work still happens, the marks clear afterwards, and a
 * reader who has asked for reduced motion waits for nothing.
 */
describe("useRowExit", () => {
  const matchMedia = (reduce) => (query) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });

  afterEach(() => {
    window.matchMedia = matchMedia(false);
  });

  it("marks the rows while the work runs, then clears them", async () => {
    window.matchMedia = matchMedia(false);
    const { result } = renderHook(() => useRowExit());
    expect(result.current.isLeaving("CLM-1")).toBe(false);

    let resolveWork;
    const work = new Promise((r) => (resolveWork = r));
    let done;
    act(() => {
      done = result.current.exit(["CLM-1", "CLM-2"], () => work);
    });

    await waitFor(() => expect(result.current.isLeaving("CLM-1")).toBe(true));
    expect(result.current.isLeaving("CLM-2")).toBe(true);
    expect(result.current.isLeaving("CLM-3")).toBe(false);

    await act(async () => {
      resolveWork("paid");
      await done;
    });
    expect(result.current.isLeaving("CLM-1")).toBe(false);
  });

  it("returns whatever the work returned, so callers can keep using it", async () => {
    window.matchMedia = matchMedia(false);
    const { result } = renderHook(() => useRowExit());
    let value;
    await act(async () => {
      value = await result.current.exit(["CLM-9"], async () => "receipt-123");
    });
    expect(value).toBe("receipt-123");
  });

  it("does the work immediately when reduced motion is asked for", async () => {
    window.matchMedia = matchMedia(true);
    const { result } = renderHook(() => useRowExit());
    const started = Date.now();
    let ran = false;
    await act(async () => {
      await result.current.exit(["CLM-1"], async () => {
        ran = true;
      });
    });
    expect(ran).toBe(true);
    // No 260ms hold: the row is never marked and nothing is delayed.
    expect(Date.now() - started).toBeLessThan(120);
    expect(result.current.isLeaving("CLM-1")).toBe(false);
  });

  it("runs the work even when nothing is selected", async () => {
    window.matchMedia = matchMedia(false);
    const { result } = renderHook(() => useRowExit());
    let ran = false;
    await act(async () => {
      await result.current.exit([], async () => {
        ran = true;
      });
    });
    expect(ran).toBe(true);
  });
});
