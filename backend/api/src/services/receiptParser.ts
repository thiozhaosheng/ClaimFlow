import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from '@azure/ai-form-recognizer';

const endpoint = process.env.AZURE_DOC_INTEL_ENDPOINT;
const key = process.env.AZURE_DOC_INTEL_KEY;
const useAzure = Boolean(endpoint && key);

export interface ParsedReceipt {
  merchant: string | null;
  total: number | null;
  gstAmount: number | null;
  currency: string | null;
  expenseDate: string | null;
  // Local time of transaction in "HH:MM" 24-hour format. Used by the frontend
  // to derive Transport.travelWindow (morning/afternoon/evening/late night).
  transactionTime: string | null;
  category: string | null;
  // Top line-item descriptions (used to prefill Office Supplies itemSummary
  // and to look for Transport routes like "GrabCar - From → To").
  items: string[];
  // If the receipt clearly encodes a transport route, the parsed endpoints.
  route: { from: string; to: string } | null;
  // 'unavailable' covers both "Azure isn't configured" and "Azure couldn't
  // read this receipt" — either way there's no fallback: the caller shows
  // an error and the user fills the form in manually. No mock data is ever
  // returned as if it were a real extraction.
  source: 'azure' | 'unavailable';
}

const EMPTY_RESULT: ParsedReceipt = {
  merchant: null,
  total: null,
  gstAmount: null,
  currency: null,
  expenseDate: null,
  transactionTime: null,
  category: null,
  items: [],
  route: null,
  source: 'unavailable',
};

// Azure jobs are normally done in a few seconds, but a throttled/degraded
// endpoint can leave the poller spinning indefinitely. Cap it so a slow
// Azure call degrades to "fill in manually" instead of hanging the request.
const AZURE_TIMEOUT_MS = 25_000;

export async function parseReceipt(
  buffer: Buffer,
  mimeType: string,
): Promise<ParsedReceipt> {
  if (buffer.length === 0) {
    return EMPTY_RESULT;
  }
  if (!useAzure) {
    console.warn('[receiptParser] AZURE_DOC_INTEL_ENDPOINT/KEY not configured — OCR unavailable');
    return EMPTY_RESULT;
  }
  try {
    return await withTimeout(parseWithAzure(buffer, mimeType), AZURE_TIMEOUT_MS);
  } catch (err: any) {
    // Surface what Azure actually complained about so we can fix the upstream issue
    // instead of silently masking it with the mock.
    const detail = err?.details ?? err?.response?.parsedBody ?? err?.response?.bodyAsText;
    console.warn(
      '[receiptParser] Azure failed:',
      err?.code ?? err?.statusCode ?? '',
      err?.message ?? err,
      detail ? `| detail: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : '',
    );
    // When Azure is configured but rejects this file (or times out), returning
    // random mock data would silently overwrite the form with values that don't
    // match the receipt. Better to return empties so the user fills in manually
    // and knows OCR failed.
    return EMPTY_RESULT;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Azure Document Intelligence timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Extract item descriptions from the prebuilt-receipt Items field.
function readLineItems(fields: any, limit = 6): string[] {
  const itemsField = fields?.Items;
  const items = itemsField?.values ?? itemsField?.valueArray ?? [];
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const item of items.slice(0, limit)) {
    const props = item?.properties ?? item?.valueObject ?? {};
    const descField = props.Description ?? props.Name;
    const desc =
      descField?.value ?? descField?.valueString ?? descField?.content;
    if (typeof desc === 'string') {
      const trimmed = desc.trim().replace(/\s+/g, ' ');
      if (trimmed) out.push(trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed);
    }
  }
  return out;
}

// Try to parse a transport route from the first line item.
// Examples Azure has returned (real Grab / TADA / Gojek receipts):
//   "GrabCar - Marina Bay → Toa Payoh"
//   "GrabCar — Marina Bay -> Toa Payoh"
//   "Trip from Office to Airport"
//
// Note: Azure's OCR sometimes misreads the → glyph as "!'", "!>", ">'", or
// ">", depending on the receipt's rendering. We accept these as route
// separators too so the route is still recoverable on real receipts.
function parseTransportRoute(items: string[]): { from: string; to: string } | null {
  // Group 1 = origin, group 2 = destination. The arrow-token alternation
  // covers Unicode arrows, ASCII arrows, common OCR misreads, and the
  // English word "to" used as a bridge.
  const arrowToken = "(?:→|⟶|↦|⇨|->|=>|!'|!>|>'|»|\\sto\\s)";
  const routeRe = new RegExp(`^\\s*(.+?)\\s*${arrowToken}\\s*(.+?)\\s*$`, 'i');
  for (const item of items) {
    // Split on dash variants (the "service - route" split that Grab uses)
    const dashSplit = item.split(/\s+[-—–]\s+/);
    const candidate = dashSplit.length > 1 ? dashSplit.slice(1).join(' - ') : item;
    const routeMatch = candidate.match(routeRe);
    if (routeMatch) {
      const from = routeMatch[1].trim();
      const to = routeMatch[2].trim();
      // Reject if either side looks like a fee/amount or is too short to be a place
      if (
        from &&
        to &&
        from.length >= 2 &&
        to.length >= 2 &&
        from.length < 80 &&
        to.length < 80 &&
        !/^\$?\d/.test(from) &&
        !/^\$?\d/.test(to)
      ) {
        return { from, to };
      }
    }
  }
  return null;
}

// Read the TransactionTime field (HH:MM:SS or HH:MM string).
function readTransactionTime(fields: any): string | null {
  const f = fields?.TransactionTime;
  if (!f) return null;
  const v = f.value ?? f.valueTime ?? f.content;
  if (typeof v !== 'string') return null;
  const m = v.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = String(Math.min(23, Math.max(0, parseInt(m[1], 10)))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, parseInt(m[2], 10)))).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Read a string field from an Azure DocumentField. The SDK's exact shape varies by
// model + version: sometimes the string is on .value, sometimes .valueString,
// sometimes only .content. Try each in order and trim whitespace.
function readStringField(field: any): string | null {
  if (!field) return null;
  const candidates = [field.value, field.valueString, field.content];
  for (const c of candidates) {
    if (typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

// Read a currency/number field. Azure prebuilt-receipt returns the amount in
// one of several shapes depending on field `kind` and SDK version:
//   { kind: 'number',   value: 12.5,                       content: 'S$12.50' }
//   { kind: 'currency', value: { amount: 12.5, currencyCode: 'SGD' } }
//   { kind: 'currency', valueCurrency: { amount: 12.5, currencySymbol: 'S$' } }
//   { kind: 'string',   content: 'S$12.50' }   (rare — when model couldn't type)
// Try all of them so the same code path works for printed receipts, hawker
// chits, digital PDFs and phone screenshots alike.
function readMoneyField(field: any): { amount: number | null; currency: string | null } {
  if (!field) return { amount: null, currency: null };
  const v = field.value ?? field.valueCurrency ?? field.valueNumber;
  if (typeof v === 'object' && v !== null) {
    const amount = typeof v.amount === 'number' ? v.amount : null;
    const currency =
      (typeof v.currencyCode === 'string' && v.currencyCode) ||
      (typeof v.currencySymbol === 'string' && v.currencySymbol) ||
      null;
    if (amount !== null) return { amount, currency };
  }
  if (typeof v === 'number') return { amount: v, currency: null };
  // Fallback: parse the raw .content string ("S$36.50", "$ 12,345.67", "SGD 8.70")
  if (typeof field.content === 'string') {
    const cleaned = field.content.replace(/,/g, '');
    const m = cleaned.match(/[-]?\d+(?:\.\d{1,2})?/);
    if (m) {
      const n = parseFloat(m[0]);
      if (Number.isFinite(n)) return { amount: n, currency: null };
    }
  }
  return { amount: null, currency: null };
}

// Scan the OCR text for "<label> $<amount>" patterns. Labels are ranked by
// reliability — receipts almost always say "Amount Paid" or "Grand Total" for
// the final figure, while plain "Total" often appears mid-receipt (subtotal,
// pre-discount total etc.) and can mislead the prebuilt-receipt model.
//
// Returns the best-ranked match and its confidence weight so the caller can
// decide whether to override Azure's Total field.
interface TextTotal {
  amount: number;
  label: string;
  weight: number; // higher = more trustworthy
}

function scanTotalsFromRawText(result: any): TextTotal[] {
  const pages: any[] = result?.pages ?? [];
  const allLines: string[] = [];
  for (const page of pages) {
    for (const line of page?.lines ?? []) {
      if (typeof line?.content === 'string') allLines.push(line.content);
    }
  }

  // Labels ranked by trust. Higher weight = stronger signal that this IS
  // the final total the customer actually paid.
  const labelWeights: Array<{ pattern: RegExp; weight: number; label: string }> = [
    { pattern: /\bamount\s*paid\b/i, weight: 100, label: 'amount paid' },
    { pattern: /\btotal\s*paid\b/i, weight: 95, label: 'total paid' },
    { pattern: /\bgrand\s*total\b/i, weight: 90, label: 'grand total' },
    { pattern: /\bnet(?:t)?\s*total\b/i, weight: 85, label: 'net total' },
    { pattern: /\btotal\s*due\b/i, weight: 80, label: 'total due' },
    { pattern: /\bamount\s*due\b/i, weight: 75, label: 'amount due' },
    { pattern: /\btotal\s*amount\b/i, weight: 60, label: 'total amount' },
    { pattern: /\bfinal\s*total\b/i, weight: 55, label: 'final total' },
    { pattern: /\btotal\b/i, weight: 30, label: 'total' }, // ambiguous
    // Bank/wallet transfer confirmations (PayNow, PayLah, bank alert emails)
    // typically just say "Amount:" with no "paid"/"due" qualifier — lower
    // weight than the "total" family since it's common on non-receipt pages,
    // but still trustworthy when it's the only money label present.
    { pattern: /\bamount\b/i, weight: 25, label: 'amount' },
  ];

  // Find currency-looking numbers and the line they sit on.
  const moneyRe = /\$?\s*([\d,]+\.\d{2})\b/;
  const results: TextTotal[] = [];

  // Some receipts put the label and amount on the SAME line ("TOTAL  $19.10").
  // Others split them across two adjacent lines ("TOTAL", then "$19.10").
  // Handle both.
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    let matchedWeight = 0;
    let matchedLabel = '';
    for (const { pattern, weight, label } of labelWeights) {
      if (pattern.test(line)) {
        if (weight > matchedWeight) {
          matchedWeight = weight;
          matchedLabel = label;
        }
      }
    }
    if (matchedWeight === 0) continue;

    // Try same line first.
    let amountMatch = line.match(moneyRe);
    if (!amountMatch && i + 1 < allLines.length) {
      // Try the next line.
      amountMatch = allLines[i + 1].match(moneyRe);
    }
    if (!amountMatch) continue;

    const n = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;

    results.push({ amount: n, label: matchedLabel, weight: matchedWeight });
  }

  // Sort by weight desc, then by position-in-document (later wins on tie —
  // receipts put the final total at the bottom).
  return results.sort((a, b) => b.weight - a.weight);
}

// Convenience: pick the single best raw-text total, returning null if none.
function bestTextTotal(result: any): TextTotal | null {
  const all = scanTotalsFromRawText(result);
  return all.length > 0 ? all[0] : null;
}

// Sum the per-line prices the prebuilt-receipt model extracted. Useful when
// the Total field is missing but Items are present.
function sumLineItemTotals(fields: any): number | null {
  const itemsField = fields?.Items;
  const items = itemsField?.values ?? itemsField?.valueArray ?? [];
  if (!Array.isArray(items) || items.length === 0) return null;
  let sum = 0;
  let counted = 0;
  for (const item of items) {
    const props = item?.properties ?? item?.valueObject ?? {};
    const total = readMoneyField(props.TotalPrice ?? props.Total ?? props.Price);
    if (total.amount !== null) {
      sum += total.amount;
      counted++;
    }
  }
  if (counted === 0) return null;
  return Math.round(sum * 100) / 100;
}

// Merchant names can come back with stray characters: "Grab\n3 Media Close..."
// when the model tags the brand line + the start of the address as one block.
// Take only the first line, strip trailing punctuation.
function cleanMerchant(raw: string | null): string | null {
  if (!raw) return null;
  const firstLine = raw.split(/\r?\n/)[0]?.trim() ?? '';
  if (!firstLine) return null;
  return firstLine.replace(/[\s\-—–:]+$/g, '').slice(0, 80);
}

// Logo-only receipts (Grab, Gojek, TADA) often have no readable brand text —
// Azure's MerchantName extractor picks up the most prominent text instead,
// which is usually the SERVICE name from the first line item ("GrabCar",
// "GrabBike", "GoCar Plus", "TADA Premium"). Map those service codes back to
// the parent brand so the form shows the right merchant.
const SERVICE_TO_BRAND: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /^grab(?:car|bike|share|pet|family|hitch|exec|premium|coach|taxi|pay|food|express|forbusiness|business)\b/i, brand: 'Grab' },
  { pattern: /^grab\b/i, brand: 'Grab' },
  { pattern: /^go(?:car|ride|send|food|pay|jek)\b/i, brand: 'Gojek' },
  { pattern: /^tada\b/i, brand: 'TADA' },
  { pattern: /^comfortdelgro\b/i, brand: 'ComfortDelGro Taxi' },
  { pattern: /^cd\s?(?:taxi|cab)\b/i, brand: 'ComfortDelGro Taxi' },
  { pattern: /^trans-?cab\b/i, brand: 'Trans-Cab' },
  { pattern: /^smrt\s?(?:taxi|cabs?)\b/i, brand: 'SMRT Taxi' },
  { pattern: /^(?:simplygo|ez-?link)\b/i, brand: 'SimplyGo' },
];

// Apply the SERVICE_TO_BRAND map to a string. Returns the brand if matched,
// otherwise the original string.
function brandFromServiceText(text: string | null): string | null {
  if (!text) return null;
  for (const { pattern, brand } of SERVICE_TO_BRAND) {
    if (pattern.test(text)) return brand;
  }
  return null;
}

// Combine MerchantName + line items to figure out the best brand label.
// Priority:
//   1. If MerchantName resolves to a known brand via service code, use that.
//   2. If the first line item resolves to a brand, use that (logo-only Grab
//      receipts often end up here).
//   3. Otherwise fall back to MerchantName as-is (cleaned).
function inferBrandedMerchant(
  rawMerchant: string | null,
  items: string[],
): string | null {
  const cleaned = cleanMerchant(rawMerchant);
  const fromMerchant = brandFromServiceText(cleaned);
  if (fromMerchant) return fromMerchant;
  for (const item of items) {
    const brand = brandFromServiceText(item);
    if (brand) return brand;
  }
  return cleaned;
}

// Payment intermediaries (banks, e-wallets) — when these show up as the
// MerchantName, the *real* merchant is the recipient/payee elsewhere on the
// receipt. Used to detect payment-confirmation screenshots like DBS PayLah!,
// OCBC PayNow, Google Pay receipts, etc.
const PAYMENT_INTERMEDIARY_RE =
  /\b(?:dbs|posb|ocbc|uob|standard\s*chartered|stanchart|citibank|citi|hsbc|maybank|trust\s*bank|gxs|mari\s*bank|cimb|rhb|paynow|paylah!?|pay\s*lah|grabpay|favepay|shopeepay|google\s*pay|apple\s*pay|samsung\s*pay|singtel\s*dash|nets|nets\s*click|fave|atome|airwallex|stripe|hitpay|wise|revolut)\b/i;

function isPaymentIntermediary(text: string | null | undefined): boolean {
  if (!text) return false;
  return PAYMENT_INTERMEDIARY_RE.test(text);
}

// Scan the OCR text for a labelled recipient/payee line. Receipts and
// e-wallet screenshots typically show one of these labels right before the
// real merchant name.
function findRecipientInLines(result: any): string | null {
  const pages: any[] = result?.pages ?? [];
  const lines: string[] = [];
  for (const page of pages) {
    for (const line of page?.lines ?? []) {
      if (typeof line?.content === 'string') lines.push(line.content);
    }
  }

  // Same-line: "Pay to: Toast Box" / "Merchant: Tiong Bahru Bakery"
  const sameLine =
    /\b(?:pay(?:ee|ment\s*to)?|to|recipient|beneficiary|merchant|paid\s*to|transfer\s*to|sent\s*to)\b\s*[:\-]\s*(.+)$/i;
  // Next-line: a label line followed by the recipient on the next line.
  const labelOnly =
    /^\s*(?:pay(?:ee|ment\s*to)?|to|recipient|beneficiary|merchant|paid\s*to|transfer\s*to|sent\s*to)\s*[:\-]?\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const sameMatch = raw.match(sameLine);
    if (sameMatch) {
      const candidate = sameMatch[1].trim();
      // Reject if the candidate is itself an intermediary or empty
      if (candidate && !isPaymentIntermediary(candidate)) {
        return candidate.slice(0, 80);
      }
    }

    if (labelOnly.test(raw) && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (next && !isPaymentIntermediary(next)) {
        // Avoid picking up an obvious amount/date line
        if (!/^\$?\s*[\d,]+\.\d{2}\s*$/.test(next) && !/^\d{1,2}[\/\-]\d/.test(next)) {
          return next.slice(0, 80);
        }
      }
    }
  }
  return null;
}

// Some bank/e-wallet screenshots (e.g. a forwarded PayNow confirmation
// email) don't look like a receipt at all, so Azure's prebuilt-receipt
// model often can't populate MerchantName — there's no "merchant" region
// for it to find. In that case isPaymentIntermediary(fieldMerchant) never
// fires because fieldMerchant is empty, and merchant resolution falls
// through to a much weaker heuristic. Scanning the raw OCR text directly
// for a bank/wallet name catches that case too.
function anyLineIsPaymentIntermediary(result: any): boolean {
  const pages: any[] = result?.pages ?? [];
  for (const page of pages) {
    for (const line of page?.lines ?? []) {
      if (typeof line?.content === 'string' && isPaymentIntermediary(line.content)) {
        return true;
      }
    }
  }
  return false;
}

async function parseWithAzure(
  buffer: Buffer,
  _mimeType: string,
): Promise<ParsedReceipt> {
  const client = new DocumentAnalysisClient(
    endpoint!,
    new AzureKeyCredential(key!),
  );
  const poller = await client.beginAnalyzeDocument(
    'prebuilt-receipt',
    buffer,
  );
  const result = await poller.pollUntilDone();
  const doc = result.documents?.[0];

  if (!doc) {
    return {
      merchant: null,
      total: null,
      gstAmount: null,
      currency: null,
      expenseDate: null,
      transactionTime: null,
      category: null,
      items: [],
      route: null,
      source: 'azure',
    };
  }

  const fields = doc.fields as any;

  // Useful while iterating on Azure output: keep this off unless explicitly debugging.
  if (process.env.RECEIPT_DEBUG === '1') {
    console.log('[receiptParser] Azure raw fields:', JSON.stringify(fields, null, 2).slice(0, 2000));
  }

  const fieldMerchant = readStringField(fields?.MerchantName);
  const lineItems = readLineItems(fields);

  // Three-stage merchant resolution:
  //   1. Bank / payment-intermediary detection. DBS PayNow / OCBC PayLah! /
  //      GrabPay screenshots: the bank logo is the most prominent text but
  //      the *real* merchant is the recipient. Look for "Pay to: <name>" /
  //      "Recipient: <name>" labels in the OCR text and use that instead.
  //      Also fires when MerchantName came back empty but the document text
  //      elsewhere clearly reads as a bank/wallet screenshot (e.g. a
  //      forwarded PayNow confirmation email, which isn't receipt-shaped
  //      enough for Azure to tag a merchant region at all).
  //   2. Brand-aware: logo-only Grab/Gojek/TADA whose MerchantName comes
  //      back as a service code ("GrabCar"/"GoRide"/"TADA Plus") → parent.
  //   3. Fallback: first line of the document that looks like a name,
  //      brand-normalized the same way as step 2.
  let merchant: string | null = null;

  if (isPaymentIntermediary(fieldMerchant) || (!fieldMerchant && anyLineIsPaymentIntermediary(result))) {
    merchant = findRecipientInLines(result);
  }

  if (!merchant) {
    merchant = inferBrandedMerchant(fieldMerchant, lineItems);
  }

  if (!merchant || isPaymentIntermediary(merchant)) {
    // Still landed on a bank/wallet — last try, scan for any non-intermediary
    // proper-name line, normalizing it to a known brand if it matches one
    // (e.g. a stray "GrabForBusiness" heading picked up from the page body).
    const guess = guessMerchantFromLines(result);
    const brandedGuess = brandFromServiceText(guess) ?? guess;
    if (brandedGuess && !isPaymentIntermediary(brandedGuess)) {
      merchant = brandedGuess;
    } else {
      merchant = merchant ?? brandedGuess ?? null;
    }
  }

  // Pick the most trustworthy "amount paid". Strategy:
  //   1. Scan raw OCR text for explicit labels (Amount Paid > Grand Total >
  //      Total Due > Total). The prebuilt-receipt model frequently mis-tags
  //      subtotal/discount/fare-cap lines as "Total" — but the printed
  //      label on the receipt is almost always right.
  //   2. If raw-text found a high-confidence match (Amount Paid / Grand Total
  //      / Net Total / Total Due / Amount Due), trust it.
  //   3. Otherwise fall back to Azure's typed Total fields.
  //   4. Then Subtotal + TotalTax, sum of line items.
  //   5. If everything fails, leave null so the form stays blank for manual entry.
  let total: number | null = null;
  let currency: string | null = null;

  const text = bestTextTotal(result);

  if (text && text.weight >= 75) {
    total = text.amount;
  }

  if (total === null) {
    for (const candidateName of ['Total', 'TotalPrice', 'AmountDue', 'GrandTotal']) {
      const money = readMoneyField(fields?.[candidateName]);
      if (money.amount !== null) {
        total = money.amount;
        currency = money.currency;
        break;
      }
    }
  }

  const taxMoney = readMoneyField(fields?.TotalTax);

  if (total === null && text) {
    // Weight < 75 — only ambiguous "Total" label. Use it before fallbacks but
    // sanity-check against any line-item sum first.
    total = text.amount;
  }

  if (total === null) {
    const sub = readMoneyField(fields?.Subtotal);
    if (sub.amount !== null) {
      total = sub.amount + (taxMoney.amount ?? 0);
      currency = currency ?? sub.currency;
    }
  }

  if (total === null) {
    total = sumLineItemTotals(fields);
  }

  // Cross-check: if Azure's Total disagrees with a high-confidence raw-text
  // total by more than $1, log a warning so we can see drift in production.
  if (process.env.RECEIPT_DEBUG === '1' && text && total !== null) {
    const azureMoney = readMoneyField(fields?.Total);
    if (azureMoney.amount !== null && Math.abs(azureMoney.amount - total) > 1) {
      console.warn(
        `[receiptParser] Total disagreement — using "${text.label}" (S$${text.amount.toFixed(2)}) over Azure Total (S$${azureMoney.amount.toFixed(2)})`,
      );
    }
  }

  const dateRaw =
    fields?.TransactionDate?.value ?? fields?.TransactionDate?.valueDate;
  const expenseDate = dateRaw
    ? new Date(dateRaw).toISOString().slice(0, 10)
    : null;

  // lineItems was already read above for merchant inference.
  const route = parseTransportRoute(lineItems);
  const transactionTime = readTransactionTime(fields);

  return {
    merchant,
    total,
    gstAmount: taxMoney.amount,
    currency: currency ?? taxMoney.currency ?? null,
    expenseDate,
    transactionTime,
    category: guessCategoryFromMerchant(merchant),
    items: lineItems,
    route,
    source: 'azure',
  };
}

// When MerchantName isn't filled in by the prebuilt model, take the first line
// in the document that looks like a name (has letters, isn't dominated by digits,
// isn't a generic header word). Keeps merchant capture working on screenshots
// and digital PDFs where the receipt geometry isn't a normal paper layout.
function guessMerchantFromLines(result: any): string | null {
  const pages: any[] = result?.pages ?? [];
  const lines: string[] = [];
  for (const page of pages) {
    for (const line of page?.lines ?? []) {
      if (typeof line?.content === 'string') lines.push(line.content);
    }
    if (lines.length >= 6) break;
  }
  const SKIP = /^(tax invoice|receipt|invoice|order|gst|address|tel|phone|date|time|page)\b/i;
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (!line) continue;
    if (SKIP.test(line)) continue;
    const letters = (line.match(/[A-Za-z]/g) ?? []).length;
    const digits = (line.match(/\d/g) ?? []).length;
    if (letters < 3) continue; // need at least a short word
    if (digits > letters) continue; // probably an address or phone number
    return line.length > 60 ? line.slice(0, 60).trim() : line;
  }
  return null;
}

// Best-guess category from the merchant string. Returns null when no pattern
// matches — earlier versions defaulted to "Meal" which silently overrode the
// user's manual category choice (e.g. a medical receipt would come back as
// Meal). The caller (frontend) only applies a non-null guess, and only when
// the user hasn't already picked a different category.
function guessCategoryFromMerchant(merchant: string | null): string | null {
  if (!merchant) return null;
  const m = merchant.toLowerCase();
  if (/grab|gojek|taxi|comfort|smrt|mrt|transport|fuel|shell|esso|spc|tada/.test(m)) {
    return 'Transport';
  }
  if (
    /clinic|polyclinic|hospital|raffles medical|parkway|healthway|guardian|watsons|dental|medical|pharmacy|tcm|chinese physician|optical/.test(
      m,
    )
  ) {
    // Default to the statutory variant — non-statutory is disallowed and we
    // don't want OCR to suggest a category that would be blocked. Approver
    // can correct if it's actually non-statutory.
    return 'Medical (statutory)';
  }
  if (
    /ntuc|fairprice|cold storage|sheng siong|giant|stationery|popular|paper one|challenger|courts|harvey norman|daiso/.test(
      m,
    )
  ) {
    return 'Office Supplies';
  }
  if (/singapore airlines|jetstar|scoot|airasia|sia|airbnb|hotel|booking\.com|agoda|expedia|trip\.com|klook/.test(m)) {
    return 'Travel';
  }
  if (/coursera|udemy|workshop|conference|seminar|smu academy|nus iss|aws training|microsoft learn/.test(m)) {
    return 'Training';
  }
  if (
    /toast box|ya kun|old chang kee|hawker|food centre|kopitiam|koufu|crystal jade|din tai fung|burnt ends|ippudo|paradise|jumbo|imperial treasure|swensen|mcdonald|kfc|burger king|starbucks|coffee bean|subway|pizza|sushi|restaurant|cafe|bistro|bakery/.test(
      m,
    )
  ) {
    return 'Meal';
  }
  // No confident match — let the user keep their selection.
  return null;
}
