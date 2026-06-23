// Per-category color system — the heart of the "modern but vibrant" refresh.
// Each claim category maps to a single base hue; the UI derives tints/strips
// from it with CSS color-mix(), so components only need to set one `--cat`
// custom property. Kept as a pure module so the mapping is unit-testable.

// Modern, vibrant-but-not-neon palette. Keys match the app's claim `type`
// values (see CATEGORY_OPTIONS in pages/employee.jsx).
const CATEGORY_COLORS = {
  Transport: { color: "#0ea5e9", icon: "car" }, // sky
  Meal: { color: "#f59e0b", icon: "utensils" }, // amber
  "Client Entertainment": { color: "#8b5cf6", icon: "wine" }, // violet
  "Office Supplies": { color: "#3b82f6", icon: "package" }, // blue
  Travel: { color: "#06b6d4", icon: "plane" }, // cyan
  Training: { color: "#f43f5e", icon: "graduation" }, // rose (≈ "Education")
  "Medical (statutory)": { color: "#10b981", icon: "heart" }, // emerald
  "Medical (non-statutory)": { color: "#10b981", icon: "heart" },
  "Club Subscription": { color: "#d946ef", icon: "dumbbell" }, // fuchsia (≈ "Gym")
  "Family Benefit": { color: "#ec4899", icon: "users" }, // pink
  "Motor Car (non-commercial)": { color: "#f97316", icon: "car" }, // orange
};

// Neutral fallback hue for anything unmapped ("Other", null, etc.).
export const DEFAULT_CATEGORY_COLOR = { color: "#6366f1", icon: "tag" }; // indigo

/**
 * Resolve a claim category to its color metadata.
 * @param {string|null|undefined} category
 * @returns {{ color: string, icon: string }}
 */
export function categoryColor(category) {
  if (category && Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, category)) {
    return CATEGORY_COLORS[category];
  }
  return DEFAULT_CATEGORY_COLOR;
}

/** Just the base hue for a category (handy for charts / inline styles). */
export function categoryHue(category) {
  return categoryColor(category).color;
}

/**
 * Build the inline CSS custom properties a `.cat-tile` / colored surface needs.
 * Usage: <div className="cat-tile" style={categoryStyle(type)} />
 * @param {string|null|undefined} category
 * @returns {{ ["--cat"]: string }}
 */
export function categoryStyle(category) {
  return { "--cat": categoryHue(category) };
}

export { CATEGORY_COLORS };
