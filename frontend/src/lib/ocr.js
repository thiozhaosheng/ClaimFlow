// OCR source metadata — pure, side-effect-free helpers so the UI can give the
// user honest feedback about *which* engine produced the extracted values.
//
// The backend's receiptParser returns `source` as one of:
//   - "azure"        → live Azure AI Document Intelligence (prebuilt-receipt)
//   - "mock"         → deterministic backend stub (no Azure key configured)
//   - "demo"         → the frontend mock API (VITE_MOCK_API=true)
//   - "unavailable"  → Azure was tried but rejected the file; nothing extracted
//
// Treating "mock" and "demo" identically keeps the message honest: in both
// cases the numbers are sample data, NOT read from the uploaded receipt.

/**
 * @typedef {Object} OcrSourceInfo
 * @property {"azure"|"sample"|"unavailable"|"unknown"} kind  normalised bucket
 * @property {boolean} live   true only when real OCR read the receipt
 * @property {string}  engine short engine name for the badge
 * @property {string}  label  one-line status headline
 * @property {string}  description  supporting sentence
 * @property {"accent"|"warning"|"neutral"} tone  visual tone for the badge
 */

/** @type {Record<string, OcrSourceInfo>} */
const SOURCES = {
  azure: {
    kind: "azure",
    live: true,
    engine: "Azure Document Intelligence",
    label: "Read by Azure Document Intelligence",
    description:
      "Fields below were extracted from your receipt by Azure's prebuilt-receipt model. Review them before submitting.",
    tone: "accent",
  },
  sample: {
    kind: "sample",
    live: false,
    engine: "Demo parser",
    label: "Filled with demo data",
    description:
      "No live OCR ran — these are sample values so you can try the flow. Connect Azure Document Intelligence to read real receipts.",
    tone: "warning",
  },
  unavailable: {
    kind: "unavailable",
    live: false,
    engine: "OCR unavailable",
    label: "Couldn't read this receipt",
    description:
      "The image was uploaded and stored, but the parser couldn't extract details. Please fill in the fields manually.",
    tone: "warning",
  },
  unknown: {
    kind: "unknown",
    live: false,
    engine: "Receipt parser",
    label: "Receipt processed",
    description: "Review the fields below before submitting.",
    tone: "neutral",
  },
};

/**
 * Map a raw backend `source` string to its UI metadata.
 * @param {string|null|undefined} source
 * @returns {OcrSourceInfo}
 */
export function describeOcrSource(source) {
  if (source === "azure") return SOURCES.azure;
  if (source === "mock" || source === "demo") return SOURCES.sample;
  if (source === "unavailable") return SOURCES.unavailable;
  return SOURCES.unknown;
}

/** True only when the values came from a real receipt read. */
export function isLiveOcr(source) {
  return describeOcrSource(source).live;
}

// Human labels for the fields OCR can prefill — used by the per-field
// "auto-filled" affordance and in tests.
export const OCR_FIELD_LABELS = {
  amount: "Amount",
  gstAmount: "GST",
  merchant: "Merchant",
  expenseDate: "Date",
  category: "Category",
};

/**
 * Given a raw parse-receipt `data` payload, return the set of form-field keys
 * OCR actually populated (non-empty values only). Keeps the UI honest: we only
 * flag a field as auto-filled when there was a real signal for it.
 * @param {Record<string, any>|null|undefined} data
 * @returns {string[]}
 */
export function extractedFieldKeys(data) {
  if (!data) return [];
  const keys = [];
  if (data.total != null) keys.push("amount");
  if (data.gstAmount != null) keys.push("gstAmount");
  if (data.merchant) keys.push("merchant");
  if (data.expenseDate) keys.push("expenseDate");
  if (data.category) keys.push("category");
  return keys;
}
