create table if not exists public.numerology_admins (
  telegram_user_id bigint primary key,
  role text not null default 'owner' check (role in ('owner','admin')),
  created_at timestamptz not null default now()
);
alter table public.numerology_admins enable row level security;
revoke all on public.numerology_admins from anon, authenticated;
insert into public.numerology_admins (telegram_user_id, role)
values (1932110514, 'owner')
on conflict (telegram_user_id) do update set role = excluded.role;

create table if not exists public.astra_saved_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.astra_users(id) on delete cascade,
  name text not null,
  birth_date date not null,
  relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists astra_saved_people_user_id_idx on public.astra_saved_people(user_id);
alter table public.astra_saved_people enable row level security;

create table if not exists public.astra_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.astra_users(id) on delete cascade,
  reading_type text not null check (reading_type in ('profile','compatibility','forecast','max')),
  title text,
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists astra_readings_user_created_idx on public.astra_readings(user_id, created_at desc);
alter table public.astra_readings enable row level security;

create table if not exists public.astra_user_settings (
  user_id uuid primary key references public.astra_users(id) on delete cascade,
  notifications_enabled boolean not null default true,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.astra_user_settings enable row level security;