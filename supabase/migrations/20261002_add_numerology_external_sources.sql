create table if not exists public.numerology_external_sources (
  id bigserial primary key,
  source_key text not null unique,
  source_type text not null check (source_type in ('api','github','package','docs')),
  display_name text not null,
  base_url text,
  auth_env text,
  enabled boolean not null default true,
  role text not null default 'enrichment',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.numerology_external_sources enable row level security;
create table if not exists public.numerology_external_cache (
  id bigserial primary key,
  source_key text not null references public.numerology_external_sources(source_key) on delete cascade,
  calculation_key text not null,
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(source_key, calculation_key)
);
alter table public.numerology_external_cache enable row level security;
create index if not exists numerology_external_cache_source_idx on public.numerology_external_cache(source_key, fetched_at desc);