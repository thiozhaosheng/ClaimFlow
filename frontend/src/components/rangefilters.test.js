import { EMPTY_RANGE, withinRange } from "./rangefilters.jsx";

const row = { date: "2026-07-15", amount: 250 };

describe("withinRange", () => {
  it("keeps everything when nothing is set", () => {
    expect(withinRange(EMPTY_RANGE, row)).toBe(true);
  });

  it("treats both ends of the date range as inclusive", () => {
    expect(withinRange({ ...EMPTY_RANGE, from: "2026-07-15" }, row)).toBe(true);
    expect(withinRange({ ...EMPTY_RANGE, to: "2026-07-15" }, row)).toBe(true);
    expect(withinRange({ ...EMPTY_RANGE, from: "2026-07-16" }, row)).toBe(false);
    expect(withinRange({ ...EMPTY_RANGE, to: "2026-07-14" }, row)).toBe(false);
  });

  it("treats both ends of the amount range as inclusive", () => {
    expect(withinRange({ ...EMPTY_RANGE, min: "250" }, row)).toBe(true);
    expect(withinRange({ ...EMPTY_RANGE, max: "250" }, row)).toBe(true);
    expect(withinRange({ ...EMPTY_RANGE, min: "250.01" }, row)).toBe(false);
    expect(withinRange({ ...EMPTY_RANGE, max: "249.99" }, row)).toBe(false);
  });

  it("applies date and amount together", () => {
    const range = { from: "2026-07-01", to: "2026-07-31", min: "100", max: "300" };
    expect(withinRange(range, row)).toBe(true);
    expect(withinRange(range, { date: "2026-08-01", amount: 250 })).toBe(false);
    expect(withinRange(range, { date: "2026-07-15", amount: 400 })).toBe(false);
  });

  it("does not silently keep a row that has no date or no amount", () => {
    // An audit row with nothing to compare must not slip through a filter the
    // reader believes is narrowing the list.
    expect(withinRange({ ...EMPTY_RANGE, from: "2026-07-01" }, { date: null, amount: 5 })).toBe(false);
    expect(withinRange({ ...EMPTY_RANGE, min: "1" }, { date: "2026-07-15", amount: null })).toBe(false);
  });

  it("reads the numbers as numbers, since the inputs hand back strings", () => {
    expect(withinRange({ ...EMPTY_RANGE, min: "90" }, { date: "2026-07-15", amount: "100" })).toBe(true);
    expect(withinRange({ ...EMPTY_RANGE, max: "90" }, { date: "2026-07-15", amount: "100" })).toBe(false);
  });
});
