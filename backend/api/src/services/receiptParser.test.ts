process.env.AZURE_DOC_INTEL_ENDPOINT = 'https://fake.azure.com';
process.env.AZURE_DOC_INTEL_KEY = 'fake-key';

import { parseReceipt } from './receiptParser';
import DocumentIntelligence from '@azure/ai-form-recognizer';

// Mock the Azure SDK
jest.mock('@azure/ai-form-recognizer', () => {
  return {
    DocumentAnalysisClient: jest.fn().mockImplementation(() => {
      return {
        beginAnalyzeDocument: jest.fn().mockResolvedValue({
          pollUntilDone: jest.fn().mockResolvedValue({
            documents: [
              {
                fields: {
                  MerchantName: { content: 'Test Merchant' },
                  Total: { content: '50.00' },
                  TotalTax: { content: '4.50' },
                  TransactionDate: { value: '2023-10-27' },
                }
              }
            ]
          })
        })
      };
    }),
    AzureKeyCredential: jest.fn()
  };
});

describe('receiptParser', () => {
  it('should parse a receipt and return expected fields', async () => {
    const buffer = Buffer.from('test-image-data');
    const result = await parseReceipt(buffer, 'image/jpeg');
    
    expect(result.source).toBe('azure');
    expect(result.merchant).toBe('Test Merchant');
    expect(result.total).toBe(50.00);
    expect(result.gstAmount).toBe(4.50);
    expect(result.expenseDate).toBe('2023-10-27');
  });
});
