import { renderHook, act } from "@testing-library/react";
import { usePaging } from "./usepaging.js";

const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe("usePaging", () => {
  it("reports the range the way it is read aloud", () => {
    const { result } = renderHook(() => usePaging(rows(341), 25));
    expect(result.current.from).toBe(1);
    expect(result.current.to).toBe(25);
    expect(result.current.total).toBe(341);
    expect(result.current.pageCount).toBe(14);
    expect(result.current.rows).toHaveLength(25);
  });

  it("stops at the last page, and the last page is short", () => {
    const { result } = renderHook(() => usePaging(rows(341), 25));
    act(() => result.current.setPage(14));
    expect(result.current.rows).toHaveLength(341 - 13 * 25);
    expect(result.current.to).toBe(341);
    act(() => result.current.next());
    expect(result.current.page).toBe(14);
  });

  it("does not step below the first page", () => {
    const { result } = renderHook(() => usePaging(rows(10), 25));
    act(() => result.current.previous());
    expect(result.current.page).toBe(1);
  });

  it("returns to the first page when the page size changes", () => {
    const { result } = renderHook(() => usePaging(rows(341), 25));
    act(() => result.current.setPage(6));
    act(() => result.current.setSize(100));
    expect(result.current.page).toBe(1);
    expect(result.current.rows).toHaveLength(100);
  });

  it("lands on a real page when a filter shortens the list underneath it", () => {
    // The case that shows an empty table with no explanation: you are on page
    // 12, you type a filter, and there are now two pages.
    const { result, rerender } = renderHook(({ data }) => usePaging(data, 25), {
      initialProps: { data: rows(341) },
    });
    act(() => result.current.setPage(12));
    rerender({ data: rows(30) });
    expect(result.current.page).toBe(2);
    expect(result.current.rows.length).toBeGreaterThan(0);
  });

  it("says nothing rather than 1-0 of 0 when the list is empty", () => {
    const { result } = renderHook(() => usePaging([], 25));
    expect(result.current.from).toBe(0);
    expect(result.current.to).toBe(0);
    expect(result.current.pageCount).toBe(1);
  });
});
