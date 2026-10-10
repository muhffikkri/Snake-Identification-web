-- SnakeBiteAI — Neon Postgres Schema
-- No PostGIS (Neon limitation). Coordinates stored as lat/lng doubles.
-- Province already geocoded client-side (GADM 4.1 point-in-polygon).

create extension if not exists pgcrypto;

create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  display_name  text not null,
  role          text not null default 'user' check (role in ('user', 'government')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);

create table if not exists public.species (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  scientific_name      text not null,
  genus                text not null,
  specific_epithet     text not null,
  common_name_en       text,
  common_name_local    text,
  venom_type           text not null default 'NON-VENOMOUS'
                       check (venom_type in ('NEUROTOXIC','HEMOTOXIC','NON-VENOMOUS')),
  is_venomous          boolean not null default false,
  clinical_priority    int not null default 0,
  habitat              text,
  morphological_traits text[],
  venom_notes          text,
  geo_bbox             jsonb,          -- {latMin,latMax,lngMin,lngMax}
  province_bitmask     bigint,
  kde_params           jsonb,
  created_at           timestamptz not null default now()
);
create index if not exists species_slug_idx   on public.species (slug);
create index if not exists species_venom_idx  on public.species (venom_type);

create table if not exists public.snake_images (
  id           bigserial primary key,
  species_id   uuid not null references public.species(id) on delete cascade,
  filename     text not null,
  storage_path text not null unique,
  created_at   timestamptz not null default now()
);
create index if not exists snake_images_species_idx on public.snake_images (species_id);

create table if not exists public.species_image_refs (
  species_id   uuid not null references public.species(id) on delete cascade,
  image_id     bigint not null references public.snake_images(id) on delete cascade,
  is_primary   boolean not null default false,
  position     int not null default 0,
  primary key (species_id, image_id)
);

create table if not exists public.snake_observations (
  id           bigserial primary key,
  species_id   uuid not null references public.species(id) on delete cascade,
  lat          double precision,
  lng          double precision,
  locality     text,
  province     text,
  full_name    text not null,
  created_at   timestamptz not null default now()
);
create index if not exists snake_obs_species_idx  on public.snake_observations (species_id);
create index if not exists snake_obs_province_idx on public.snake_observations (province);
create index if not exists snake_obs_coords_idx   on public.snake_observations (lng, lat);

create table if not exists public.incidents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id) on delete set null,
  species_id    uuid references public.species(id) on delete set null,
  details       jsonb not null,
  grade         smallint not null check (grade between 0 and 4),
  gps_lat       double precision,
  gps_lng       double precision,
  gps_accuracy  double precision,
  gps_at        timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists incidents_user_idx    on public.incidents (user_id, created_at desc);
create index if not exists incidents_species_idx on public.incidents (species_id);
create index if not exists incidents_grade_idx   on public.incidents (grade);

create table if not exists public.user_preferences (
  user_id      uuid primary key references public.users(id) on delete cascade,
  default_gps  jsonb,
  locale       text not null default 'en',
  updated_at   timestamptz not null default now()
);

-- View: one row per species with cached aggregates
create or replace view public.v_species_summary as
select
  s.id, s.slug, s.scientific_name, s.common_name_en, s.common_name_local,
  s.venom_type, s.is_venomous, s.clinical_priority, s.geo_bbox,
  (select count(*) from public.snake_images img where img.species_id = s.id) as image_count,
  (select count(*) from public.snake_observations obs where obs.species_id = s.id) as observation_count,
  (select count(*) from public.incidents inc where inc.species_id = s.id) as incident_count
from public.species s;
