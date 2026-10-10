/**
 * Re-seed pipeline from snake-coordinate-indonesia.csv + snake-image-webp/
 *
 *   node scripts/seed_from_csv.mjs            # wipe DB data tables, upload S3, load CSV
 *   node scripts/seed_from_csv.mjs --no-wipe  # keep existing DB rows, insert missing only
 *   node scripts/seed_from_csv.mjs --no-s3    # skip S3 upload
 *
 * Steps: DDL -> wipe -> S3 upload (reference/) -> species -> observations -> image refs.
 */
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(import.meta.dirname, '..', '.env') });

const REPO = path.resolve(import.meta.dirname, '..');
const CSV = path.resolve('C:/Users/muhffikkri/Downloads/snake-dataset/snake-coordinate-indonesia.csv');
const WEBP_DIR = path.resolve('C:/Users/muhffikkri/Downloads/snake-dataset/snake-image-webp');
const BUCKET = 'snake-image';

const flags = new Set(process.argv.slice(2));
const noWipe = flags.has('--no-wipe');
const noS3 = flags.has('--no-s3');
const s3Only = flags.has('--s3-only');

const BATCH = 500;
const IMG_WORKERS = 6;

function log(step, msg) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${step}: ${msg}`);
}

// ── CSV parse (quote-aware) ───────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  return rows;
}

function coordsToLatLng(coords) {
  // CSV: "[-3.279, 129.645]" or "[lat, lng]"
  const m = /([-+]?\d+\.\d+|[-+]?\d+)\s*,\s*([-+]?\d+\.\d+|[-+]?\d+)/.exec(coords);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// ── DDL ───────────────────────────────────────────────────────────────────────
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

// ── wipe data tables (keep users/structural) ─────────────────────────────────
async function wipe(pool) {
  log('wipe', 'TRUNCATE data tables');
  await pool.query(`TRUNCATE
    public.snake_observations,
    public.species_image_refs,
    public.snake_images,
    public.species,
    public.incidents,
    public.user_preferences RESTART IDENTITY CASCADE`);
  log('wipe', 'done');
}

// ── S3: wipe reference/ then upload all webp under reference/ ───────────────
async function uploadS3() {
  const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } =
    await import('@aws-sdk/client-s3');
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

  // Wipe only when --wipe passed: re-runs otherwise stay incremental (skip existing keys).
  if (flags.has('--wipe')) {
    log('s3', 'wiping reference/ ...');
    let wipeKey = null;
    let wiped = 0;
    while (true) {
      const r = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET, Prefix: 'reference/', ContinuationToken: wipeKey, MaxKeys: 1000,
      }));
      const objs = r.Contents ?? [];
      wiped += objs.length;
      if (objs.length > 0) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: objs.map(o => ({ Key: o.Key })) },
        }));
      }
      if (!r.IsTruncated) break;
      wipeKey = r.NextContinuationToken;
    }
    log('s3', `wiped ${wiped} objects`);
  }

  // List what's already in the bucket (idempotent re-runs)
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

  // Walk WEBP_DIR -> reference/<folder>/<file>
  const folders = fs.readdirSync(WEBP_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());
  const jobs = [];
  for (const f of folders) {
    const fdir = path.join(WEBP_DIR, f.name);
    for (const file of fs.readdirSync(fdir)) {
      if (!file.toLowerCase().endsWith('.webp')) continue;
      const keyPath = `reference/${f.name}/${file}`;
      if (existing.has(keyPath)) continue;
      jobs.push({ key: keyPath, abs: path.join(fdir, file) });
    }
  }
  log('s3', `${jobs.length} files to upload (${existing.size} already present, skipping) across ${folders.length} folders`);

  let done = 0;
  let failed = 0;
  const failures = [];
  const chunk = Math.ceil(jobs.length / IMG_WORKERS);
  const workers = Array.from({ length: IMG_WORKERS }, (_, wi) =>
    (async () => {
      const start = wi * chunk;
      const end = Math.min(start + chunk, jobs.length);
      for (let i = start; i < end; i++) {
        const j = jobs[i];
        try {
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: j.key,
            Body: fs.readFileSync(j.abs),
            ContentType: 'image/webp',
          }));
          done++;
          if (done % 500 === 0) log('s3', `${done}/${jobs.length} uploaded`);
        } catch (e) {
          failed++;
          failures.push(j.key);
          console.error(`  UPLOAD FAIL ${j.key}: ${e.message}`);
        }
      }
    })()
  );
  await Promise.all(workers);
  log('s3', `done: ${done} uploaded this run, ${failed} failed`);
  if (failed > 0) {
    console.error(`  ${failures.length} failed — re-run \`node scripts/seed_from_csv.mjs --s3-only\` to retry (skips what's already present)`);
    process.exitCode = 1;
  }
}

// ── CSV load ───────────────────────────────────────────────────────────────────
async function loadCsv(pool) {
  const text = fs.readFileSync(CSV, 'utf8');
  const rows = parseCsv(text);
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const dataRows = rows.slice(1).filter(r => r.length >= 8);
  log('csv', `${dataRows.length} data rows`);

  // species = unique image_folder_name
  const speciesFolders = new Set();
  for (const r of dataRows) {
    const f = r[idx.image_folder_name];
    if (f) speciesFolders.add(f);
  }
  log('csv', `${speciesFolders.size} species folders`);

  // venom from `bisa` column: Bisa -> venomous, else non
  const venomByFolder = new Map();
  for (const r of dataRows) {
    const f = r[idx.image_folder_name];
    const venomous = /^(bisa|venom)/i.test((r[idx.bisa] || '').trim());
    venomByFolder.set(f, venomByFolder.has(f) ? venomByFolder.get(f) || venomous : venomous);
  }

  // upsert species
  const idMap = new Map();
  const folders = [...speciesFolders];
  for (let i = 0; i < folders.length; i += BATCH) {
    const batch = folders.slice(i, i + BATCH);
    const vals = batch.map((_, j) => `($${j*6+1},$${j*6+2},$${j*6+3},$${j*6+4},$${j*6+5},$${j*6+6})`).join(',');
    const params = batch.flatMap(f => {
      const [g, ...rest] = f.split('_');
      const venomous = venomByFolder.get(f) ?? false;
      return [f, `${g} ${rest.join(' ')}`, g, rest.join(' '), venomous, venomous ? 'NEUROTOXIC' : 'NON-VENOMOUS'];
    });
    const res = await pool.query(
      `INSERT INTO species (slug, scientific_name, genus, specific_epithet, is_venomous, venom_type)
       VALUES ${vals}
       ON CONFLICT (slug) DO UPDATE SET is_venomous = EXCLUDED.is_venomous
       RETURNING id, slug`,
      params
    );
    for (const r of res.rows) idMap.set(r.slug, r.id);
    log('species', `${i + batch.length}/${folders.length}`);
    await new Promise(r => setTimeout(r, 30));
  }
  log('species', `${idMap.size} upserted`);

  // observations
  const obs = [];
  for (const r of dataRows) {
    const f = r[idx.image_folder_name];
    const { lat, lng } = coordsToLatLng(r[idx.coords]) || {};
    if (lat === undefined || !idMap.has(f)) continue;
    obs.push({
      species_id: idMap.get(f),
      lat, lng,
      locality: r[idx.locality] || null,
      province: null, // CSV locality string; client geocodes provinces later
      full_name: r[idx.full_name] || `${genusOf(f)} ${f}`,
    });
  }
  function genusOf(folder) { return folder.split('_')[0]; }
  log('observations', `valid ${obs.length}/${dataRows.length}`);

  for (let i = 0; i < obs.length; i += BATCH) {
    const batch = obs.slice(i, i + BATCH);
    const vals = batch.map((_, j) => `($${j*6+1},$${j*6+2},$${j*6+3},$${j*6+4},$${j*6+5},$${j*6+6})`).join(',');
    const params = batch.flatMap(o => [o.species_id, o.lat, o.lng, o.locality, o.province, o.full_name]);
    await pool.query(
      `INSERT INTO snake_observations (species_id,lat,lng,locality,province,full_name) VALUES ${vals}`,
      params
    );
    log('observations', `${i + batch.length}/${obs.length}`);
    await new Promise(r => setTimeout(r, 30));
  }

  // snake_images: one row per webp in folder, storage_path = <folder>/<file>
  const imgRows = [];
  for (const folder of speciesFolders) {
    const fdir = path.join(WEBP_DIR, folder);
    if (!fs.existsSync(fdir)) continue;
    for (const file of fs.readdirSync(fdir)) {
      if (!file.toLowerCase().endsWith('.webp')) continue;
      imgRows.push({ species_id: idMap.get(folder), filename: file, storage_path: `${folder}/${file}` });
    }
  }
  log('images', `${imgRows.length} snake_images rows`);
  for (let i = 0; i < imgRows.length; i += BATCH) {
    const batch = imgRows.slice(i, i + BATCH);
    const vals = batch.map((_, j) => `($${j*3+1},$${j*3+2},$${j*3+3})`).join(',');
    const params = batch.flatMap(o => [o.species_id, o.filename, o.storage_path]);
    await pool.query(
      `INSERT INTO snake_images (species_id,filename,storage_path) VALUES ${vals}`,
      params
    );
    log('images', `${i + batch.length}/${imgRows.length}`);
    await new Promise(r => setTimeout(r, 30));
  }

  // species_image_refs: first 3 per species by filename = primary
  log('refs', 'populating species_image_refs');
  const imgById = await pool.query('SELECT id, species_id, filename FROM snake_images ORDER BY species_id, filename');
  const bySpecies = {};
  for (const r of imgById.rows) (bySpecies[r.species_id] ??= []).push(r.id);
  const refRows = Object.entries(bySpecies).flatMap(([sid, ids]) =>
    ids.map((id, i) => ({ species_id: sid, image_id: id, is_primary: i < 3, position: i }))
  );
  for (let i = 0; i < refRows.length; i += BATCH) {
    const batch = refRows.slice(i, i + BATCH);
    const vals = batch.map((_, j) => `($${j*4+1}::uuid,$${j*4+2},$${j*4+3},$${j*4+4})`).join(',');
    const params = batch.flatMap(r => [r.species_id, r.image_id, r.is_primary, r.position]);
    await pool.query(
      `INSERT INTO species_image_refs (species_id,image_id,is_primary,position) VALUES ${vals}`,
      params
    );
    log('refs', `${i + batch.length}/${refRows.length}`);
    await new Promise(r => setTimeout(r, 30));
  }
}

// ── main ───────────────────────────────────────────────────────────────────────
async function main() {
  log('init', `wipe=${!noWipe} s3=${!noS3} s3Only=${s3Only}`);
  if (s3Only) {
    await uploadS3();
    return;
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    await runDDL(pool);
    if (!noWipe) await wipe(pool);
    if (!noS3) await uploadS3();
    await loadCsv(pool);

    const summary = await pool.query(`
      select
        (select count(*) from species) as species,
        (select count(*) from snake_observations) as observations,
        (select count(*) from snake_images) as images,
        (select count(*) from species_image_refs) as refs
    `);
    log('done', JSON.stringify(summary.rows[0]));
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
