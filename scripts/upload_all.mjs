/**
 * SnakeBiteAI — full upload pipeline
 *
 * Usage:
 *   node scripts/upload_all.mjs            # everything (DDL + data + images)
 *   node scripts/upload_all.mjs --data     # DDL + tables only
 *   node scripts/upload_all.mjs --images   # images only (tables must exist)
 *   node scripts/upload_all.mjs --dry      # verify counts, no writes
 */
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(import.meta.dirname, '..', '.env') });

const REPO = path.resolve(import.meta.dirname, '..');
const DATA_JSON = path.resolve('C:/Users/muhffikkri/Downloads/snake-dataset/supabase_data.json');
const WEBP_DIR  = path.resolve('C:/Users/muhffikkri/Downloads/snake-dataset/snake-image-webp');
const BUCKET    = 'snake-image';

const flags = new Set(process.argv.slice(2));
const dryRun = flags.has('--dry');
const skipImages = flags.has('--data');
const skipData   = flags.has('--images');

const BATCH = 500;
const IMG_WORKERS = 6;

// ── helpers ──────────────────────────────────────────────────────────────────
function log(step, msg) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${step}: ${msg}`);
}

async function query(pool, sql, params) {
  const r = await pool.query(sql, params ? [] : params);
  return r.rows;
}

// ── 1. DDL ────────────────────────────────────────────────────────────────────
async function runDDL(pool) {
  log('DDL', 'applying schema.sql');
  const sql = fs.readFileSync(path.join(REPO, 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    log('DDL', 'done');
  } finally {
    client.release();
  }
}

// ── 2. species ────────────────────────────────────────────────────────────────
async function loadSpecies(pool, data) {
  const rows = data.species.map(s => ({
    slug: s.name,
    scientific_name: s.common_name || `${s.genus} ${s.specific_epithet}`,
    genus: s.genus,
    specific_epithet: s.specific_epithet,
    common_name_en: s.common_name,
    is_venomous: s.is_venomous === true,
    venom_type: s.is_venomous ? 'NEUROTOXIC' : 'NON-VENOMOUS',
    // clinical_priority / kde_params / habitat: null until enriched
  }));

  if (dryRun) { log('species', `dry-run: ${rows.length} rows`); return new Map(); }

  // check which slugs already exist
  const existing = await pool.query('SELECT slug FROM species');
  const existingSet = new Set(existing.rows.map(r => r.slug));
  const newRows = rows.filter(r => !existingSet.has(r.slug));
  log('species', `total=${rows.length}, already=${rows.length - newRows.length}, to insert=${newRows.length}`);

  const idMap = new Map();

  for (let i = 0; i < newRows.length; i += BATCH) {
    const batch = newRows.slice(i, i + BATCH);
    for (const r of batch) {
      const res = await pool.query(
        `INSERT INTO species (slug, scientific_name, genus, specific_epithet,
                             common_name_en, is_venomous, venom_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, slug`,
        [r.slug, r.scientific_name, r.genus, r.specific_epithet,
         r.common_name_en ?? null, r.is_venomous, r.venom_type]
      );
      idMap.set(res.rows[0].slug, res.rows[0].id);
    }
    log('species', `${i + batch.length}/${newRows.length}`);
    await new Promise(r => setTimeout(r, 50));
  }

  // load all ids (including pre-existing rows)
  const allExisting = await pool.query('SELECT id, slug FROM species');
  for (const r of allExisting.rows) idMap.set(r.slug, r.id);

  return idMap;
}

// ── 3. snake_observations ─────────────────────────────────────────────────────
async function loadObservations(pool, data, speciesIdMap) {
  const rows = data.snakes
    .filter(s => s.coords && speciesIdMap.has(s.species_name))
    .map(s => ({
      species_id: speciesIdMap.get(s.species_name),
      lat: s.coords[0],
      lng: s.coords[1],
      locality: s.locality || null,
      province: s.province || null,
      full_name: s.full_name,
    }));

  if (dryRun) { log('observations', `dry-run: ${rows.length} rows`); return; }

  log('observations', `inserting ${rows.length} rows`);
  for (let i = 0; i < rows.length; i += 1000) {
    const batch = rows.slice(i, i + 1000);
    const vals = batch.map((r, j) => `($${j*6+1},$${j*6+2},$${j*6+3},$${j*6+4},$${j*6+5},$${j*6+6})`).join(',');
    const params = batch.flatMap(r => [r.species_id, r.lat, r.lng, r.locality, r.province, r.full_name]);
    await pool.query(
      `INSERT INTO snake_observations (species_id,lat,lng,locality,province,full_name) VALUES ${vals} ON CONFLICT DO NOTHING`,
      params
    );
    log('observations', `${i + batch.length}/${rows.length}`);
    await new Promise(r => setTimeout(r, 50));
  }
  log('observations', 'done');
}

// ── 4. snake_images + species_image_refs ──────────────────────────────────────
async function loadImages(pool, data, speciesIdMap) {
  const rows = data.snake_images
    .filter(s => speciesIdMap.has(s.species_name))
    .map(s => ({
      species_id: speciesIdMap.get(s.species_name),
      filename: s.filename,
      storage_path: `reference/${s.storage_path}`,   // prefix with reference/
    }));

  if (dryRun) { log('images', `dry-run: ${rows.length} rows`); return; }

  log('snake_images', `inserting ${rows.length} rows`);
  for (let i = 0; i < rows.length; i += 1000) {
    const batch = rows.slice(i, i + 1000);
    const vals = batch.map((r, j) => `($${j*3+1},$${j*3+2},$${j*3+3})`).join(',');
    const params = batch.flatMap(r => [r.species_id, r.filename, r.storage_path]);
    await pool.query(
      `INSERT INTO snake_images (species_id,filename,storage_path) VALUES ${vals} ON CONFLICT (storage_path) DO NOTHING`,
      params
    );
    log('snake_images', `${i + batch.length}/${rows.length}`);
    await new Promise(r => setTimeout(r, 50));
  }
  log('snake_images', 'done');

  // species_image_refs: all images are refs; first 3 by filename = is_primary
  log('refs', 'populating species_image_refs');
  const imgById = await pool.query(
    'SELECT id, filename FROM snake_images ORDER BY species_id, filename'
  );
  const bySpecies = {};
  for (const r of imgById.rows) {
    (bySpecies[r.species_id] ??= []).push(r.id);
  }
  const refRows = Object.entries(bySpecies).flatMap(([sid, ids]) =>
    ids.map((id, i) => ({
      species_id: sid,
      image_id: id,
      is_primary: i < 3,
      position: i,
    }))
  );
  log('refs', `inserting ${refRows.length} rows`);
  for (let i = 0; i < refRows.length; i += 1000) {
    const batch = refRows.slice(i, i + 1000);
    const vals = batch.map((r, j) => `($${j*4+1}::uuid,$${j*4+2},$${j*4+3},$${j*4+4})`).join(',');
    const params = batch.flatMap(r => [r.species_id, r.image_id, r.is_primary, r.position]);
    await pool.query(
      `INSERT INTO species_image_refs (species_id,image_id,is_primary,position) VALUES ${vals} ON CONFLICT (species_id,image_id) DO NOTHING`,
      params
    );
    log('refs', `${i + batch.length}/${refRows.length}`);
    await new Promise(r => setTimeout(r, 50));
  }
  log('refs', 'done');
  log('refs', 'done');
}

// ── 5. upload webp files to Neon Object Storage ───────────────────────────────
async function uploadImages(data) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

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

  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');

  // 1. List what's already in the bucket (idempotent re-runs)
  const existing = new Set();
  let key = null;
  while (true) {
    const r = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: 'reference/', ContinuationToken: key, MaxKeys: 1000,
    }));
    for (const o of (r.Contents ?? [])) existing.add(o.Key);
    if (!r.IsTruncated) break;
    key = r.NextContinuationToken;
  }
  log('s3', `${existing.size} files already in bucket`);

  const files = data.snake_images
    .filter(s => {
      const local = path.join(WEBP_DIR, ...s.storage_path.split('/'));
      const s3Key = `reference/${s.storage_path}`;
      return fs.existsSync(local) && !existing.has(s3Key);
    })
    .map(s => s.storage_path);

  log('s3', `${files.length} files to upload (${existing.size} already present, skipping)`);

  if (dryRun) { log('s3', 'dry-run: skipping upload'); return; }
  if (files.length === 0) { log('s3', 'nothing to do'); return; }

  let done = 0;
  let failed = 0;
  const failures = [];

  async function uploadOne(relPath) {
    const absPath = path.join(WEBP_DIR, ...relPath.split('/'));
    const body = fs.readFileSync(absPath);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `reference/${relPath}`,
      Body: body,
      ContentType: 'image/webp',
    }));
  }

  // Each worker gets a slice to avoid the shared-array stall
  const chunkSize = Math.ceil(files.length / IMG_WORKERS);
  const workers = Array.from({ length: IMG_WORKERS }, (_, wi) =>
    (async () => {
      const start = wi * chunkSize;
      const end = Math.min(start + chunkSize, files.length);
      for (let i = start; i < end; i++) {
        const item = files[i];
        try {
          await uploadOne(item);
          done++;
          if (done % 500 === 0) log('s3', `${done}/${files.length} uploaded`);
        } catch (e) {
          failed++;
          failures.push(item);
          console.error(`  UPLOAD FAIL ${item}: ${e.message}`);
        }
      }
    })()
  );
  await Promise.all(workers);

  log('s3', `done: ${done} uploaded, ${failed} failed`);
  if (failures.length > 0) {
    console.error('failed files:', failures.length);
    console.error('re-run `node scripts/upload_all.mjs --images` to retry — it skips what is already present.');
    process.exitCode = 1;
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('init', `dry=${dryRun} skipData=${skipData} skipImages=${skipImages}`);

  const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
  log('init', `loaded ${data.species.length} species, ${data.snakes.length} snakes, ${data.snake_images.length} images`);

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
  });

  try {
    if (!skipData) {
      await runDDL(pool);
      const speciesIdMap = await loadSpecies(pool, data);
      if (speciesIdMap.size > 0) {
        await loadObservations(pool, data, speciesIdMap);
        await loadImages(pool, data, speciesIdMap);
      }
    }

    if (!skipImages) {
      await uploadImages(data);
    }

    // summary
    if (!skipData && !dryRun) {
      const summary = await pool.query(`
        select
          (select count(*) from species) as species,
          (select count(*) from snake_observations) as observations,
          (select count(*) from snake_images) as images,
          (select count(*) from species_image_refs) as refs
      `);
      log('done', JSON.stringify(summary.rows[0]));
    }
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
