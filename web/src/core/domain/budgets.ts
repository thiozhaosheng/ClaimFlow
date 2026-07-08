/**
 * Budget + treasury constants. Single source for the spend limits the
 * dashboard budget trackers and reports compare actual claim spend against,
 * so every surface tells the same story. Keyed by the real claim `type`
 * values used in the ledger (see MOCK_CLAIMS / category-fields).
 */

/** Per-category spend allowance (SGD) for the period shown in the trackers. */
export const CATEGORY_BUDGETS: Record<string, number> = {
  "Client Entertainment": 500,
  Transport: 300,
  Meal: 200,
  "Office Supplies": 800,
  Travel: 3000,
  Training: 2000,
};

/** Fallback allowance for any category not explicitly listed above. */
export const DEFAULT_CATEGORY_BUDGET = 500;

export function categoryBudget(category: string): number {
  return CATEGORY_BUDGETS[category] ?? DEFAULT_CATEGORY_BUDGET;
}

/** Corporate FAST treasury ceiling — disbursements draw this down. */
export const TREASURY_LIMIT = 50000;

/** Per-department quarterly spend budget (the approver's gauge compares against this). */
export const DEPARTMENT_BUDGET = 10000;
