// Standalone probe: call Azure Document Intelligence with one of our test
// receipt PDFs and dump the raw fields so we can see exactly what the SDK
// returns. Helps debug `total: null` extractions.
//
// Run: ts-node scripts/probe-azure-ocr.ts <path-to-receipt-file>
//
// Reads AZURE_DOC_INTEL_ENDPOINT / KEY from .env.

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from '@azure/ai-form-recognizer';

const endpoint = process.env.AZURE_DOC_INTEL_ENDPOINT;
const key = process.env.AZURE_DOC_INTEL_KEY;

if (!endpoint || !key) {
  console.error('Missing AZURE_DOC_INTEL_ENDPOINT or AZURE_DOC_INTEL_KEY in .env');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: ts-node scripts/probe-azure-ocr.ts <path-to-receipt-file>');
  process.exit(1);
}

async function main() {
  const buffer = fs.readFileSync(path.resolve(file));
  console.log(`Sending ${buffer.length} bytes to prebuilt-receipt...`);

  const client = new DocumentAnalysisClient(endpoint!, new AzureKeyCredential(key!));
  const poller = await client.beginAnalyzeDocument('prebuilt-receipt', buffer);
  const result = await poller.pollUntilDone();
  const doc = result.documents?.[0];

  if (!doc) {
    console.log('No documents detected.');
    return;
  }

  const fields = doc.fields as any;
  console.log('\n=== Field keys ===');
  console.log(Object.keys(fields));

  console.log('\n=== Total / Subtotal / TotalTax / TransactionDate / MerchantName ===');
  for (const k of ['Total', 'TotalPrice', 'Subtotal', 'TotalTax', 'TransactionDate', 'MerchantName']) {
    const v = fields[k];
    if (!v) {
      console.log(`${k}: <missing>`);
      continue;
    }
    console.log(`${k}:`, {
      kind: v.kind,
      value: v.value,
      valueCurrency: v.valueCurrency,
      valueNumber: v.valueNumber,
      valueString: v.valueString,
      content: v.content,
    });
  }

  console.log('\n=== First 5 line items ===');
  const items = fields?.Items?.values ?? fields?.Items?.valueArray ?? [];
  for (const item of items.slice(0, 5)) {
    const p = item?.properties ?? item?.valueObject ?? {};
    console.log({
      description: p.Description?.value ?? p.Description?.valueString ?? p.Description?.content,
      totalPrice: p.TotalPrice?.value ?? p.TotalPrice?.valueCurrency ?? p.TotalPrice?.valueNumber,
    });
  }

  console.log('\n=== Raw doc keys ===');
  console.log(Object.keys(doc));
}

main().catch((e) => {
  console.error('Probe failed:', e?.message ?? e);
  if (e?.details) console.error('details:', e.details);
  process.exit(1);
});
