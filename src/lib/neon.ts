import { neon } from '@neondatabase/serverless';
import type { VenomClass } from '../db/db';

export type SpeciesItem = {
  slug: string;
  scientific_name: string;
  common_name_en: string | null;
  common_name_local: string | null;
  venom_type: VenomClass;
  image_path: string;
  observation_count: number;
};

export type Page = {
  items: SpeciesItem[];
  total: number;
  page: number;
  pages: number;
};

export const PAGE_SIZE = 24;

let cached: Page | null = null;

const STORAGE_BASE =
  (import.meta as any).env?.NEON_STORAGE_ENDPOINT?.replace(/\/+$/, '') ||
  'https://br-jolly-bird-b5k243m5.storage.c-7.us-east-2.aws.neon.tech';

export function imageSrc(storagePath: string): string {
  return storagePath ? `${STORAGE_BASE}/snake-image/reference/${storagePath}` : '';
}

/**
 * Browser-safe: Neon serverless driver (WASM pooler), no pool, no server credentials.
 * ponytail: single query + module cache; add search/filter when the UI needs it.
 */
export async function fetchSpeciesPage(page = 1): Promise<Page> {
  if (cached && page === 1) return cached;

  const sql = (import.meta as any).env?.DATABASE_URL;
  if (!sql) throw new Error('DATABASE_URL not set in .env');
  const client = neon(sql);

  const countSql = 'select count(*)::int as total from public.v_species_summary';
  const listSql =
    'select s.scientific_name, s.slug, s.common_name_en, s.common_name_local, ' +
    's.venom_type, coalesce(s.observation_count, 0) as observation_count, ' +
    "coalesce(img.image_path, '') as image_path, " +
    'count(*) over (partition by s.scientific_name) as image_count ' +
    'from public.v_species_summary s ' +
    'left join lateral (' +
    '  select img2.storage_path as image_path, ref.is_primary ' +
    '  from public.snake_images img2 ' +
    '  left join public.species_image_refs ref ' +
    '    on ref.image_id = img2.id and ref.species_id = img2.species_id ' +
    '  where img2.species_id = s.id ' +
    '  limit 1' +
    ') img on true ' +
    'order by s.scientific_name, s.image_count asc ' +
    'limit $1 offset $2';

  const totalRows = (await client
    .query(countSql, [])) as Array<{ total: number }>;
  const total = totalRows[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const listRows = (await client
    .query(listSql, [PAGE_SIZE, (page - 1) * PAGE_SIZE])) as Array<{
    scientific_name: string;
    slug: string;
    common_name_en: string | null;
    common_name_local: string | null;
    venom_type: VenomClass;
    observation_count: number | null;
    image_path: string;
  }>;

  const rows: Array<{
    scientific_name: string;
    slug: string;
    common_name_en: string | null;
    common_name_local: string | null;
    venom_type: VenomClass;
    observation_count: number;
    image_path: string;
  }> = listRows.map((r) => ({
    scientific_name: r.scientific_name,
    slug: r.slug,
    common_name_en: r.common_name_en,
    common_name_local: r.common_name_local,
    venom_type: r.venom_type,
    observation_count: r.observation_count ?? 0,
    image_path: r.image_path ?? '',
  }));

  const out: Page = { items: rows, total, page, pages };
  if (page === 1) cached = out;
  return out;
}

export function invalidate() {
  cached = null;
}
