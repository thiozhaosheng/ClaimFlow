import {
  categoryColor,
  categoryHue,
  categoryStyle,
  DEFAULT_CATEGORY_COLOR,
  CATEGORY_COLORS,
} from "./categoryColors.js";

describe("categoryColor", () => {
  it("returns a distinct mapping for known categories", () => {
    const transport = categoryColor("Transport");
    const meal = categoryColor("Meal");
    expect(transport.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(transport.color).not.toBe(meal.color);
    expect(transport.icon).toBeTruthy();
  });

  it("maps both medical variants to the same hue", () => {
    expect(categoryColor("Medical (statutory)").color).toBe(
      categoryColor("Medical (non-statutory)").color,
    );
  });

  it("falls back to the default for unknown / nullish input", () => {
    for (const v of [null, undefined, "", "Nonsense"]) {
      expect(categoryColor(v)).toBe(DEFAULT_CATEGORY_COLOR);
    }
  });

  it("does not treat inherited object props as categories", () => {
    expect(categoryColor("toString")).toBe(DEFAULT_CATEGORY_COLOR);
    expect(categoryColor("hasOwnProperty")).toBe(DEFAULT_CATEGORY_COLOR);
  });
});

describe("categoryHue", () => {
  it("returns just the color string", () => {
    expect(categoryHue("Travel")).toBe(CATEGORY_COLORS.Travel.color);
    expect(categoryHue("???")).toBe(DEFAULT_CATEGORY_COLOR.color);
  });
});

describe("categoryStyle", () => {
  it("produces an inline --cat custom property", () => {
    expect(categoryStyle("Meal")).toEqual({ "--cat": categoryHue("Meal") });
  });
});
