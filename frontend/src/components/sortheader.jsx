import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * A sortable column header.
 *
 * The caret only appears on the column actually in force. Showing a faint
 * up/down glyph on every header — the pattern component libraries ship by
 * default — puts six pieces of chrome in a row where one piece of information
 * belongs, and it makes the sorted column harder to spot, not easier.
 */
export default function SortHeader({ label, sortKey, state, className }) {
  const active = state.sortKey === sortKey;
  const Caret = state.direction === "asc" ? ChevronUp : ChevronDown;
  return (
    <th scope="col" className={className} aria-sort={state.ariaSort(sortKey)}>
      <button
        type="button"
        className={active ? "col-sort col-sort-active" : "col-sort"}
        onClick={() => state.toggle(sortKey)}
        title={`Sort by ${label.toLowerCase()}`}
      >
        <span>{label}</span>
        {active && <Caret className="h-3 w-3" aria-hidden="true" />}
      </button>
    </th>
  );
}
