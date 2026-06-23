import {
  describeOcrSource,
  isLiveOcr,
  extractedFieldKeys,
} from "./ocr.js";

describe("describeOcrSource", () => {
  it("treats azure as the only live source", () => {
    const info = describeOcrSource("azure");
    expect(info.kind).toBe("azure");
    expect(info.live).toBe(true);
    expect(info.engine).toMatch(/Azure/);
    expect(info.tone).toBe("accent");
  });

  it("treats backend mock and frontend demo identically (sample, not live)", () => {
    for (const src of ["mock", "demo"]) {
      const info = describeOcrSource(src);
      expect(info.kind).toBe("sample");
      expect(info.live).toBe(false);
      expect(info.tone).toBe("warning");
    }
  });

  it("flags unavailable as a non-live failure", () => {
    const info = describeOcrSource("unavailable");
    expect(info.kind).toBe("unavailable");
    expect(info.live).toBe(false);
  });

  it("falls back to a neutral unknown bucket for anything else", () => {
    for (const src of [null, undefined, "", "weird"]) {
      const info = describeOcrSource(src);
      expect(info.kind).toBe("unknown");
      expect(info.live).toBe(false);
    }
  });
});

describe("isLiveOcr", () => {
  it("is true only for azure", () => {
    expect(isLiveOcr("azure")).toBe(true);
    expect(isLiveOcr("mock")).toBe(false);
    expect(isLiveOcr("demo")).toBe(false);
    expect(isLiveOcr("unavailable")).toBe(false);
    expect(isLiveOcr(null)).toBe(false);
  });
});

describe("extractedFieldKeys", () => {
  it("returns only the fields that were actually populated", () => {
    const data = {
      total: 28.5,
      gstAmount: null,
      merchant: "Grab",
      expenseDate: "",
      category: "Transport",
    };
    expect(extractedFieldKeys(data).sort()).toEqual(
      ["amount", "category", "merchant"].sort(),
    );
  });

  it("counts a zero amount as present but skips null/empty", () => {
    expect(extractedFieldKeys({ total: 0 })).toEqual(["amount"]);
    expect(extractedFieldKeys({ total: null })).toEqual([]);
    expect(extractedFieldKeys({ merchant: "" })).toEqual([]);
  });

  it("returns an empty array for nullish input", () => {
    expect(extractedFieldKeys(null)).toEqual([]);
    expect(extractedFieldKeys(undefined)).toEqual([]);
  });
});
