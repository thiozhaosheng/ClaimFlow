// OCR source metadata — pure, side-effect-free helpers so the UI can give the
// user honest feedback about *which* engine produced the extracted values.
//
// The backend's receiptParser returns `source` as one of:
//   - "azure"        → live Azure AI Document Intelligence (prebuilt-receipt)
//   - "unavailable"  → Azure was tried but rejected the file; nothing extracted
//
// Those two are the whole contract — see the OcrResult type in
// backend/api/src/services/receiptParser.ts. When no Azure key is configured
// the parser returns "unavailable" with null fields rather than inventing
// sample values, so the UI never presents fabricated numbers as a real read.
//
// Anything else falls through to the neutral "unknown" bucket. The earlier
// "mock"/"demo" sources were retired along with the frontend mock API; the
// SOURCES.sample entry below is now unreachable and kept only so the badge
// keeps rendering if a stale source string ever reaches it.

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
  // No vendor names in anything a claimant reads — "Azure Document
  // Intelligence" and "prebuilt-receipt model" are the same jargon family as
  // status codes, and the person claiming a kopi has no use for either. The
  // honesty the badge exists for ("did a real scan run?") survives in plain
  // words: a live scan read this receipt / nothing was read.
  azure: {
    kind: "azure",
    live: true,
    engine: "Live scan",
    label: "Read from your receipt",
    description:
      "The merchant, amount, GST and date were read off this receipt — you confirm each one on the next step.",
    tone: "accent",
  },
  sample: {
    kind: "sample",
    live: false,
    engine: "Demo values",
    label: "Filled with demo data",
    description:
      "No live scan ran — these are sample values so you can try the flow.",
    tone: "warning",
  },
  unavailable: {
    kind: "unavailable",
    live: false,
    engine: "Scan unavailable",
    label: "Couldn't read this receipt",
    description:
      "The image was uploaded and stored, but the details couldn't be read off it. Please type each field yourself.",
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
