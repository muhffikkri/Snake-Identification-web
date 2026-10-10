import 'dotenv/config';
import { S3Client } from '@aws-sdk/client-s3';

// Node-only module (upload pipeline + getSignedUrl helpers). Do not import from
// browser components; the frontend resolves bucket URLs via `imageSrc()` in neon.ts.
// tsc "include: src" pulls this file in, so read env through a cast instead of
// relying on @types/node being installed.
const env = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env;

/**
 * Neon Object Storage S3 client.
 * ponytail: shared client only; per-command signing (getSignedUrl) is inlined where needed.
 */
export const s3 = new S3Client({
  region: env?.AWS_REGION ?? 'us-east-2',
  endpoint: env?.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: env?.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: env?.AWS_SECRET_ACCESS_KEY ?? '',
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

export const BUCKET = env?.S3_BUCKET ?? 'snake-image';
