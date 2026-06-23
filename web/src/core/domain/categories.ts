/**
 * Category metadata: per-category icon key + form-field definitions.
 * Icon keys are mapped to concrete components at the UI layer (keeps this
 * domain module framework-free). Color is intentionally NOT per-category —
 * the app uses semantic color only; the icon shape conveys the category.
 */
import categoryFieldsJson from "@/data/category-fields.json";

export type FieldType = "text" | "number" | "select" | "textarea";

export interface CategoryField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
  min?: number;
  max?: number;
}

export interface CategorySpec {
  label: string;
  fields: CategoryField[];
}

export const CATEGORY_FIELDS = categoryFieldsJson as Record<string, CategorySpec>;

export type IconKey =
  | "car"
  | "utensils"
  | "wine"
  | "package"
  | "plane"
  | "graduation"
  | "heart"
  | "dumbbell"
  | "users"
  | "tag";

const CATEGORY_ICON: Record<string, IconKey> = {
  Transport: "car",
  Meal: "utensils",
  "Client Entertainment": "wine",
  "Office Supplies": "package",
  Travel: "plane",
  Training: "graduation",
  "Medical (statutory)": "heart",
  "Medical (non-statutory)": "heart",
  "Club Subscription": "dumbbell",
  "Family Benefit": "users",
  "Motor Car (non-commercial)": "car",
};

export function categoryIconKey(category: string | null | undefined): IconKey {
  if (category && category in CATEGORY_ICON) return CATEGORY_ICON[category];
  return "tag";
}

/** Required field keys for a category that are still empty in `details`. */
export function missingRequiredFields(
  category: string,
  details: Record<string, unknown>,
): string[] {
  const spec = CATEGORY_FIELDS[category];
  if (!spec) return [];
  return spec.fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = details?.[f.key];
      return v === undefined || v === null || v === "";
    })
    .map((f) => f.key);
}
