import { X } from "lucide-react";

/**
 * Date-range and amount-range filters for a ledger.
 *
 * The audit trail could be searched by text and filtered by action, which
 * answers "find this claim" but not the two questions finance actually opens
 * a log to answer: what happened between these dates, and what was over this
 * amount. Both are the reason anyone exports to a spreadsheet, and doing it in
 * the spreadsheet is the double work worth removing.
 *
 * Fields are inline and unlabelled-by-box: four small controls on the toolbar
 * the ledger already has, with a Clear that only appears once something is set.
 */
export default function RangeFilters({ value, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const active =
    value.from || value.to || value.min !== "" || value.max !== "";

  return (
    <div className="range-filters">
      <label className="range-field">
        <span>From</span>
        <input
          type="date"
          className="form-control form-control-sm"
          value={value.from}
          onChange={set("from")}
          aria-label="Filter from date"
        />
      </label>
      <label className="range-field">
        <span>To</span>
        <input
          type="date"
          className="form-control form-control-sm"
          value={value.to}
          onChange={set("to")}
          aria-label="Filter to date"
        />
      </label>
      <label className="range-field">
        <span>Min S$</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          className="form-control form-control-sm range-amount"
          value={value.min}
          onChange={set("min")}
          aria-label="Minimum amount"
        />
      </label>
      <label className="range-field">
        <span>Max S$</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          className="form-control form-control-sm range-amount"
          value={value.max}
          onChange={set("max")}
          aria-label="Maximum amount"
        />
      </label>

      {active && (
        <button
          type="button"
          className="range-clear"
          onClick={() => onChange({ from: "", to: "", min: "", max: "" })}
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  );
}

/** The empty value, and the test a row has to pass. */
export const EMPTY_RANGE = { from: "", to: "", min: "", max: "" };

export function withinRange(range, { date, amount }) {
  if (range.from && (!date || date < range.from)) return false;
  if (range.to && (!date || date > range.to)) return false;
  const value = Number(amount);
  if (range.min !== "" && (!Number.isFinite(value) || value < Number(range.min)))
    return false;
  if (range.max !== "" && (!Number.isFinite(value) || value > Number(range.max)))
    return false;
  return true;
}
