import { ChevronLeft, ChevronRight } from "lucide-react";

const SIZES = [25, 50, 100];

/**
 * The bar under a ledger: what you are looking at, and how to move.
 *
 * It states the range in words rather than drawing a row of numbered page
 * buttons. Nobody navigating an audit trail wants page 7 specifically; they
 * want the next screenful, or a bigger screenful, and they want to know how
 * much is left.
 */
export default function TablePager({ paging, noun = "entries" }) {
  return (
    <div className="table-pager">
      <p className="table-pager-count">
        {paging.total === 0
          ? `No ${noun}`
          : `${paging.from}–${paging.to} of ${paging.total} ${noun}`}
      </p>

      <div className="table-pager-controls">
        <label className="table-pager-size">
          <span>Rows</span>
          <select
            className="form-select form-select-sm"
            value={paging.size}
            onChange={(e) => paging.setSize(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="table-pager-steps">
          <button
            type="button"
            onClick={paging.previous}
            disabled={paging.page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span>
            Page {paging.page} of {paging.pageCount}
          </span>
          <button
            type="button"
            onClick={paging.next}
            disabled={paging.page >= paging.pageCount}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
