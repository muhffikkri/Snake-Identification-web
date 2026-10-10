import dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env' });

const BUCKET = 'snake-image';
const WEBP_DIR = 'C:/Users/muhffikkri/Downloads/snake-dataset/snake-image-webp';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

const dataPath = 'C:/Users/muhffikkri/Downloads/snake-dataset/supabase_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
console.log(`loaded ${data.snake_images.length} image records`);

// Wipe
console.log('wiping existing objects under reference/...');
let wipeKey = null;
let wiped = 0;
while (true) {
  const r = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET, Prefix: 'reference/', ContinuationToken: wipeKey, MaxKeys: 1000,
  }));
  const objs = r.Contents ?? [];
  for (const o of objs) wiped++;
  if (objs.length > 0) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: objs.map(o => ({ Key: o.Key })) },
    }));
  }
  if (!r.IsTruncated) break;
  wipeKey = r.NextContinuationToken;
}
console.log(`wiped ${wiped} objects`);

// Upload all with public-read ACL, 8 workers in parallel
const IMG_WORKERS = 8;
const files = data.snake_images.filter(img => {
  const local = path.join(WEBP_DIR, ...img.storage_path.split('/'));
  return fs.existsSync(local);
}).map(img => ({
  storage_path: img.storage_path,
  s3Key: `reference/${img.storage_path}`,
  local: path.join(WEBP_DIR, ...img.storage_path.split('/')),
}));
console.log(`uploading ${files.length} files with ${IMG_WORKERS} workers`);

let done = 0;
let failed = 0;

async function uploadOne(item) {
  const body = fs.readFileSync(item.local);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: item.s3Key,
    Body: body,
    ContentType: 'image/webp',
    ACL: 'public-read',
  }));
}

const chunkSize = Math.ceil(files.length / IMG_WORKERS);
const workers = Array.from({ length: IMG_WORKERS }, (_, wi) =>
  (async () => {
    const start = wi * chunkSize;
    const end = Math.min(start + chunkSize, files.length);
    for (let i = start; i < end; i++) {
      try {
        await uploadOne(files[i]);
        done++;
        if (done % 500 === 0) console.log(`${done}/${files.length} uploaded`);
      } catch (e) {
        console.error(`  FAIL ${files[i].s3Key}: ${e.message}`);
        failed++;
      }
    }
  })()
);
await Promise.all(workers);
console.log(`done: ${done} uploaded, ${failed} failed`);
