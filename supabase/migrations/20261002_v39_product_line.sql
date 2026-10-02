-- ASTRA AURA v39: product line, analytics, sessions, compatibility and personal months
alter table public.numerology_purchases
  add column if not exists is_recurring boolean not null default false,
  add column if not exists subscription_expiration_date timestamptz;

create table if not exists public.numerology_sessions (
  telegram_user_id bigint primary key,
  mode text not null,
  step integer not null default 1,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.numerology_events (
  id bigserial primary key,
  telegram_user_id bigint not null,
  event_key text not null,
  product_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists numerology_events_user_time_idx on public.numerology_events(telegram_user_id,created_at desc);
create index if not exists numerology_events_key_time_idx on public.numerology_events(event_key,created_at desc);

create table if not exists public.numerology_compatibility (
  id bigserial primary key,
  pair_key text unique not null,
  number_a integer not null,
  number_b integer not null,
  title text not null,
  meaning text not null,
  strengths text not null,
  challenges text not null,
  guidance text not null
);

alter table public.numerology_sessions enable row level security;
alter table public.numerology_events enable row level security;
alter table public.numerology_compatibility enable row level security;
revoke all on public.numerology_sessions from anon,authenticated;
revoke all on public.numerology_events from anon,authenticated;
revoke all on public.numerology_compatibility from anon,authenticated;