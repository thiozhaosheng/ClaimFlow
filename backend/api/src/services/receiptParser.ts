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
  category: string | null;
  source: 'azure' | 'mock';
}

export async function parseReceipt(
  buffer: Buffer,
  mimeType: string,
): Promise<ParsedReceipt> {
  if (useAzure) {
    try {
      return await parseWithAzure(buffer, mimeType);
    } catch (err: any) {
      console.warn('[receiptParser] Azure failed, falling back to mock:', err?.message);
      return parseWithMock(buffer);
    }
  }
  return parseWithMock(buffer);
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
      category: null,
      source: 'azure',
    };
  }

  const fields = doc.fields as any;
  const merchant = fields?.MerchantName?.value ?? null;
  const totalField = fields?.Total?.value;
  const total = typeof totalField === 'object' ? totalField.amount : totalField ?? null;
  const taxField = fields?.TotalTax?.value;
  const tax = typeof taxField === 'object' ? taxField.amount : taxField ?? null;
  const currency = typeof totalField === 'object' ? totalField.currencyCode ?? null : null;
  const dateField = fields?.TransactionDate?.value;
  const expenseDate = dateField
    ? new Date(dateField).toISOString().slice(0, 10)
    : null;

  return {
    merchant,
    total,
    gstAmount: tax,
    currency,
    expenseDate,
    category: guessCategoryFromMerchant(merchant),
    source: 'azure',
  };
}

// Deterministic mock so the demo is reproducible without an Azure key.
// Picks one of a handful of plausible SG receipts based on the file size.
function parseWithMock(buffer: Buffer): ParsedReceipt {
  const fixtures = [
    { merchant: 'Grab',              total: 12.5,   gst: 1.03 },
    { merchant: 'Comfort Taxi',      total: 18.4,   gst: 1.52 },
    { merchant: 'Toast Box',         total: 9.8,    gst: 0.81 },
    { merchant: 'Tiong Bahru Bakery',total: 22.5,   gst: 1.86 },
    { merchant: 'NTUC FairPrice',    total: 47.85,  gst: 3.95 },
    { merchant: 'Cold Storage',      total: 64.2,   gst: 5.3  },
    { merchant: 'Din Tai Fung',      total: 145.9,  gst: 12.05 },
    { merchant: 'Crystal Jade',      total: 198.3,  gst: 16.37 },
    { merchant: 'Raffles Medical',   total: 85.0,   gst: 7.02 },
    { merchant: 'PaperOne Office Hub', total: 36.5, gst: 3.01 },
  ];
  const pick = fixtures[buffer.length % fixtures.length];
  return {
    merchant: pick.merchant,
    total: pick.total,
    gstAmount: pick.gst,
    currency: 'SGD',
    expenseDate: new Date().toISOString().slice(0, 10),
    category: guessCategoryFromMerchant(pick.merchant),
    source: 'mock',
  };
}

function guessCategoryFromMerchant(merchant: string | null): string | null {
  if (!merchant) return null;
  const m = merchant.toLowerCase();
  if (/grab|gojek|taxi|comfort|smrt|mrt|transport|fuel|shell|esso|spc/.test(m)) {
    return 'Transport';
  }
  if (/clinic|polyclinic|hospital|raffles medical|parkway|guardian|watsons|dental/.test(m)) {
    return 'Medical';
  }
  if (/ntuc|fairprice|cold storage|sheng siong|giant|stationery|office|paper/.test(m)) {
    return 'Office Supplies';
  }
  if (/airline|sia|jetstar|airbnb|hotel|booking\.com|expedia/.test(m)) {
    return 'Travel';
  }
  if (/coursera|udemy|workshop|conference|seminar/.test(m)) {
    return 'Training';
  }
  return 'Meal';
}
