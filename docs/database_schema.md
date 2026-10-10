# SnakeBiteAI — Database Schema Design
**Target:** Neon Postgres (serverless, branchable, PostGIS extension available)
**Status:** DRAFT — for review

---

## 1. Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage | Neon Postgres for relational data; S3-compatible bucket (Neon has no object storage) for 12,640 webp images | Neon is serverless SQL, not a blob store. 1.1 GB of images would bloat the DB and slow writes. A public S3/R2 bucket keyed by `storage_path` gives static CDN-ready URLs the frontend can read without auth. |
| Auth | Neon Auth (built into Neon, OIDC-compatible) — users, sessions, roles | Avoids a separate Auth0/Clerk. `role` column distinguishes `user` vs `government` on the same identity. |
| Species geo | `geometry(Point, 4326)` + GiST index (Neon supports PostGIS) | Enables the government map: filter by province polygon, count density, nearest-species. |
| Assessments | One row per incident; `owner_user_id NULL` = anonymous (DESIGN.md §18) | Anonymous triage is a core requirement; the row persists but has no owner, so it never appears in any user's history. |
| Incident details | `jsonb` column, not 30 sub-tables | The clinical detail shape is stable but will evolve; JSONB avoids schema migrations for every form tweak. Photos are S3 URLs in the JSONB, not base64 in DB. |
| Species ↔ images | `species_image_refs` join table (one species → many webp files) | Current app seeds 2–3 reference images per species; the full dataset has up to 120+ per species. The join table decouples the count. |

---

## 2. Entity Overview

```
users ──< incidents ──< incident_photos (S3 urls in jsonb, no separate table)
  │
species ──< species_image_refs >── snake_images
  │
species ──< snake_observations (from CSV: 17,879 rows, one per record)
```

---

## 3. Tables

### `users`
```sql
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  display_name  text not null,
  role          text not null default 'user'
                check (role in ('user', 'government')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
```
- `role`: `user` = general public (triage, identify, history); `government` = surveillance dashboard
- Auth credentials live in Neon Auth; this table holds the app-level profile
- No password column — Neon Auth handles it

---

### `species`
```sql
create table public.species (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,   -- 'acanthophis_laevis' (lowercase, stable URL key)
  scientific_name      text not null,           -- 'Acanthophis laevis'
  genus                text not null,
  specific_epithet     text not null,
  common_name_en       text,                    -- 'Smooth-scaled Death Adder'
  common_name_local    text,                    -- 'Ular Kematian Papua'
  venom_type           text not null default 'NON-VENOMOUS'
                      check (venom_type in ('NEUROTOXIC','HEMOTOXIC','NON-VENOMOUS')),
  is_venomous          boolean not null default false,
  clinical_priority    int not null default 0,  -- 0–5, used to rank which species to show first
  habitat              text,
  morphological_traits text[],                  -- ['Short stout body', 'Wide triangular head', ...]
  venom_notes          text,
  geo_bbox             box,                      -- 'LL(-9,130) UR(-1,141)' — bounding box of known range
  province_bitmask     bigint,                   -- 34-bit mask, kept from current app model
  kde_params           jsonb,                    -- {bandwidth, n_observations, mean_lat, mean_lng}
  created_at           timestamptz not null default now()
);
create index species_slug_idx    on public.species (slug);
create index species_venom_idx   on public.species (venom_type);
create index species_bbox_idx    on public.species using gist (geo_bbox);
```

**Population:** 293 rows from disk folders (245 match CSV, 48 are extra species not in the coordinate dataset). The 48 get `common_name_en`/`is_venomous` as null until manually enriched.

---

### `snake_images`
```sql
create table public.snake_images (
  id           bigserial primary key,
  species_id   uuid not null references public.species(id) on delete cascade,
  filename     text not null,          -- 'Acanthophis_laevis_obs121339246_photo205315764.webp'
  storage_path text not null unique,   -- 'acanthophis_laevis/Acanthophis_laevis_obs121339246_photo205315764.webp'
  created_at   timestamptz not null default now()
);
create index snake_images_species_idx on public.snake_images (species_id);
```
**Population:** 12,640 rows. `storage_path` matches the S3 key exactly. Public URL pattern:
```
https://<bucket>.s3.<region>.amazonaws.com/{storage_path}
```

---

### `species_image_refs`
```sql
create table public.species_image_refs (
  species_id   uuid not null references public.species(id) on delete cascade,
  image_id     bigint not null references public.snake_images(id) on delete cascade,
  is_primary   boolean not null default false,  -- first 2-3 images shown on species page
  position     int not null default 0,
  primary key (species_id, image_id)
);
```
**Population:** initially one row per `snake_images` row (all images are reference images for their species). `is_primary` marks the 2–3 the UI shows as thumbnails; the rest are browsable in a grid. This table exists so the app can curate which images to feature without duplicating data.

---

### `snake_observations`
```sql
create table public.snake_observations (
  id          bigserial primary key,
  species_id  uuid not null references public.species(id) on delete cascade,
  coords      geometry(Point, 4326),           -- WKT 'POINT(lng lat)'
  locality    text,                            -- 'Maluku Tengah, ID-MA, ID'
  province    text,                            -- geocoded from coords (one-time backfill)
  province_code text,                           -- ISO 3166-2:ID code, e.g. 'ID-MA'
  full_name   text not null,                   -- 'acanthophis laevis'
  created_at  timestamptz not null default now()
);
create index snake_obs_species_idx on public.snake_observations (species_id);
create index snake_obs_coords_idx  on public.snake_observations using gist (coords);
create index snake_obs_province_idx on public.snake_observations (province);
```
**Population:** 17,879 rows from the CSV (only rows whose species folder exists on disk). `province` and `province_code` are backfilled by point-in-polygon geocoding against Indonesian province boundaries (GeoJSON from BPS/Geospatial Information Agency). This powers:
- Government map: `SELECT species_id, count(*) FROM snake_observations WHERE province = 'Maluku' GROUP BY species_id`
- Province-level aggregation for dashboard stat cards (no spatial query needed)
- "Nearest recorded location" for a user's GPS (still uses the GiST index on `coords`)

**Geocoding approach (decided):** point-in-polygon against a lightweight Indonesian province boundary GeoJSON. One-time backfill script runs locally before upload; results written into `supabase_data.json` before the DB load. No geocoding API calls at runtime.

---

### `incidents`
```sql
create table public.incidents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete set null,  -- NULL = anonymous
  species_id   uuid references public.species(id) on delete set null, -- which species triggered the assessment
  -- clinical detail payload (see JSONB shape below)
  details      jsonb not null,
  grade        smallint not null check (grade between 0 and 4),
  gps_lat      double precision,
  gps_lng      double precision,
  gps_accuracy  double precision,
  gps_at       timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index incidents_user_idx    on public.incidents (user_id, created_at desc);
create index incidents_species_idx on public.incidents (species_id);
create index incidents_grade_idx   on public.incidents (grade);
create index incidents_created_idx on public.incidents (created_at desc);
```

**`details` jsonb shape** (matches `IncidentDetails` in `db.ts`):
```json
{
  "bite_location": "Lower leg",
  "bite_time": "2026-10-09T14:30",
  "pain_scale": 6,
  "swelling_grade": 2,
  "local_effects": ["Bruising", "Numbness"],
  "systemic_effects": ["Difficulty swallowing"],
  "vital_signs": { "hr": 110, "bp": "90/60", "spo2": 94 },
  "who_protocol": ["Immobilise limb", "Firm elastic bandage"],
  "photos": [
    "https://<bucket>.s3.../incidents/2026-10/inc_<id>_1.jpg"
  ],
  "species_prediction": {
    "primary": "Acanthophis laevis",
    "confidence": 0.87,
    "alternatives": [
      { "name": "Acanthophis antarcticus", "confidence": 0.08 },
      { "name": "Pseudonaja textilis", "confidence": 0.04 }
    ]
  }
}
```
Photos are S3 URLs under `incidents/YYYY-MM/<incident_id>_<n>.jpg` — separate from the reference-image bucket.

**Note:** `user_id NULL` = anonymous assessment (DESIGN.md §18). These rows are written but never shown in any user's history endpoint. Government users can query all rows (including anonymous) for surveillance.

---

### `user_preferences`
```sql
create table public.user_preferences (
  user_id      uuid primary key references public.users(id) on delete cascade,
  default_gps  jsonb,          -- {lat, lng, accuracy} — last known location for "nearby species"
  locale       text not null default 'en',
  updated_at   timestamptz not null default now()
);
```
Used by Discover page to pre-populate the "nearby species" query with the user's last known location instead of requiring a fresh GPS fix every visit.

---

### `government_reports` *(optional — defer to v2)*
```sql
-- create table public.government_reports (
--   id          uuid primary key default gen_random_uuid(),
--   created_by  uuid not null references public.users(id),
--   title       text not null,
--   filters     jsonb not null,   -- {province, species_id, date_from, date_to, min_grade}
--   summary     jsonb not null,   -- computed at generation time: counts, top species, etc.
--   created_at  timestamptz not null default now()
-- );
```
Deferred — not in DESIGN.md v1. Add when the "Data & Reports" government page needs saved snapshots.

---

## 4. Views

### `v_species_summary` — one row per species, cached aggregates
```sql
create view public.v_species_summary as
select
  s.id,
  s.slug,
  s.scientific_name,
  s.common_name_en,
  s.common_name_local,
  s.venom_type,
  s.is_venomous,
  s.clinical_priority,
  s.geo_bbox,
  (select count(*) from public.snake_images img where img.species_id = s.id) as image_count,
  (select count(*) from public.snake_observations obs where obs.species_id = s.id) as observation_count,
  (select count(*) from public.incidents inc where inc.species_id = s.id) as incident_count
from public.species s;
```
Frontend calls `select * from v_species_summary order by clinical_priority desc` — one query, no joins.

---

### `v_provincial_stats` — government dashboard stat cards
```sql
create view public.v_provincial_stats as
select
  s.venue_code as province,       -- extract province from locality or join a province lookup
  count(distinct s.species_id)    as recorded_species,
  count(distinct s.id)            as reports
from public.snake_observations s
group by 1;
```
*Requires a `province` column on `snake_observations` (parsed from `locality` at load time) or a separate `idn_provinces` reference table with polygon boundaries. Flagged as a gap — see §6.*

---

## 5. Neon Object Storage

Neon Object Storage (S3-compatible, branch-scoped). Configured in `neon.ts`, credentials auto-pulled into `.env.local` by `neon deploy`.

**Bucket:** `snake-image` (private — uploads via presigned PUT URL, downloads via presigned GET URL or a short-lived signed URL from an API route)

```
snake-image/
├── reference/
│   ├── acanthophis_laevis/
│   │   ├── Acanthophis_laevis_obs121339246_photo205315764.webp
│   │   └── ...
│   └── boiga_cynodon/
│       └── ...
└── incidents/
    └── 2026-10/
        ├── inc_a1b2c3d4_1.jpg
        └── inc_a1b2c3d4_2.jpg
```

`snake_images.storage_path` = `reference/{slug}/{filename}.webp`
`incidents.details.photos[]` = `incidents/YYYY-MM/inc_{id}_{n}.jpg`

**S3 client (server-side, Node/Edge):**
```ts
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// .env.local after `neon deploy`:
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION
export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

// Presigned PUT for incident photo upload (browser → S3, no server proxy for the body)
export async function presignIncidentPhoto(key: string, contentType: string, expiresIn = 300) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: 'snake-image', Key: key, ContentType: contentType }), { expiresIn });
}
```

**Reference images (batch upload):** done by the upload script, not by the app. 12,640 webp files go straight into the `reference/` folder via the same S3 client, authenticated with the service credential from `.env.local`.

**Presigned URL for frontend reads:** since the bucket is private, the app generates short-lived GET presigned URLs via a serverless function (Vercel API route / Neon Function) when the user opens a species page. URL expiry: 5 minutes.

---

## 6. Open Questions (deferred to v2)

1. **Government user provisioning.** `role='government'` accounts are seeded manually via `.env` at deployment time (e.g. `GOV_EMAILS=a@b.c,b@d.e` allowlist checked at signup). No self-serve government signup in v1.

2. **Incident photo upload flow.** Browser uploads wound photos via presigned PUT URL (Neon Object Storage). The API route that issues the presigned URL is a Vercel function using the `AWS_*` vars from `.env.local`. Schema is ready — `details.photos` array holds S3 keys.

3. **`species_image_refs.is_primary` curation.** Upload script auto-marks first 3 images per species (by filename sort order) as `is_primary=true`. Manual curation later.

4. **`government_reports` table.** Deferred to v2 when the Data & Reports page needs saved snapshots.

---

## 7. Seed / Load Plan

| Step | What | Source |
|---|---|---|
| 1 | Run DDL (all tables + views + indexes) | This file, §3–§4 |
| 2 | Insert `species` (293 rows) | `supabase_data.json → species` (field mapping below) |
| 3 | Insert `snake_observations` (17,879 rows) | `supabase_data.json → snakes` |
| 4 | Insert `snake_images` (12,640 rows) | `supabase_data.json → snake_images` |
| 5 | Insert `species_image_refs` (12,640 rows, all `is_primary=false` initially) | auto-generated from `snake_images` |
| 6 | Upload 12,640 webp files to S3 `reference/` | `snake-image-webp/` |
| 7 | Mark first 3 images per species `is_primary=true` | script, by filename order |

**Field mapping `supabase_data.json → species`:**
```
json.name              → slug
json.genus             → genus
json.specific_epithet  → specific_epithet
json.common_name       → common_name_en  (null for 48 no-csv species)
json.is_venomous       → is_venomous     (null for 48 no-csv species → default false)
                         venom_type       → 'NEUROTOXIC' if is_venomous else 'NON-VENOMOUS' (heuristic, needs clinical review)
                         scientific_name  → genus + ' ' + specific_epithet
```

**Field mapping `supabase_data.json → snake_observations`:**
```
json.species_name  → species_id (lookup by slug)
json.coords        → WKT 'POINT(lng lat)'
json.locality      → locality
json.full_name     → full_name
```

---

## 8. Frontend Migration Notes (for later)

| Current (Dexie/local) | New (Neon + S3) |
|---|---|
| `db.species` Dexie table, 4 hard-coded seed rows | `SELECT * FROM species` via Neon client SDK, cached in memory |
| `db.incidents` encrypted in browser, never leaves device | `POST /incidents` to Neon (Neon has no HTTP API — use a thin Vercel/Cloudflare function as a proxy, or Neon's managed Postgres directly via `@neondatabase/serverless` from the edge) |
| Photos as base64 in IndexedDB | Photos uploaded to S3 presigned URL, stored as S3 key in `details.photos` |
| `owner: string \| null` (display name) | `user_id: uuid \| null` (FK to `users`) |
| `sync_status` PENDING/SYNCED (local queue) | Remove — no local queue needed once always-online |

**Neon client (frontend):** `@neondatabase/serverless` — works in Vercel edge functions and Cloudflare Workers. For a pure Vite SPA deployed to Vercel, calls go through a Vercel API route that uses the serverless driver (avoids exposing the pooler connection string to the client).

---

*End of draft. Awaiting review.*
