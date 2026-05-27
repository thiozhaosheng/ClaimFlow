import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol,
} from '@azure/storage-blob';
import { randomUUID } from 'crypto';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'receipts';

export const isBlobStorageConfigured = Boolean(connectionString);

// Lazy-initialise the client so missing config doesn't crash boot.
let serviceClient: BlobServiceClient | null = null;
let sharedKeyCredential: StorageSharedKeyCredential | null = null;
let accountName: string | null = null;

function getClient(): BlobServiceClient {
  if (!serviceClient) {
    if (!connectionString) {
      throw new Error(
        'AZURE_STORAGE_CONNECTION_STRING is not set; receipt upload is disabled.',
      );
    }
    serviceClient = BlobServiceClient.fromConnectionString(connectionString);

    // Parse the connection string to grab AccountName + AccountKey for SAS signing.
    const parts = Object.fromEntries(
      connectionString
        .split(';')
        .filter(Boolean)
        .map((kv) => {
          const i = kv.indexOf('=');
          return [kv.slice(0, i), kv.slice(i + 1)];
        }),
    );
    accountName = parts.AccountName || null;
    const accountKey = parts.AccountKey;
    if (accountName && accountKey) {
      sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    }
  }
  return serviceClient;
}

function extensionFor(mimeType: string, fallbackName?: string): string {
  const m: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'application/pdf': 'pdf',
  };
  if (m[mimeType]) return m[mimeType];
  const fromName = fallbackName?.split('.').pop()?.toLowerCase();
  return fromName && /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : 'bin';
}

// Path layout: receipts/YYYY/MM/uuid.ext  — keeps the container scannable by month.
function buildBlobName(mimeType: string, originalName?: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}/${mm}/${randomUUID()}.${extensionFor(mimeType, originalName)}`;
}

export interface UploadResult {
  blobName: string;
  viewUrl: string; // short-lived SAS URL for immediate preview
}

export async function uploadReceipt(
  buffer: Buffer,
  mimeType: string,
  originalName?: string,
): Promise<UploadResult> {
  const client = getClient();
  const container = client.getContainerClient(containerName);
  const blobName = buildBlobName(mimeType, originalName);
  const blockBlob = container.getBlockBlobClient(blobName);
  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });
  return {
    blobName,
    viewUrl: generateViewUrl(blobName, 15),
  };
}

/**
 * Generate a SAS URL granting read access for `expiresInMinutes` minutes.
 * Container is private; the caller decides who gets to see the SAS by checking
 * authorisation before calling this. Short TTL minimises leak blast radius.
 */
export function generateViewUrl(blobName: string, expiresInMinutes = 15): string {
  if (!sharedKeyCredential || !accountName) {
    // Without an account key we cannot sign a SAS; fall back to the bare URL.
    // (This is only useful if the container has been made anonymously readable —
    // which it should NOT be for receipt data per PDPA.)
    return `https://${accountName ?? 'unknown'}.blob.core.windows.net/${containerName}/${blobName}`;
  }
  const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      protocol: SASProtocol.Https,
      expiresOn,
    },
    sharedKeyCredential,
  ).toString();
  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
}
