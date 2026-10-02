alter table public.numerology_referrals
  add column if not exists status text not null default 'joined'
    check (status in ('joined','qualified','rewarded')),
  add column if not exists first_purchase_at timestamptz,
  add column if not exists rewarded_at timestamptz;

create unique index if not exists numerology_referrals_referred_unique
  on public.numerology_referrals(referred_telegram_user_id);

create table if not exists public.aura_wallet_transactions (
  id bigserial primary key,
  telegram_user_id bigint not null,
  amount integer not null,
  kind text not null check (kind in ('referral_bonus','referral_welcome','admin_adjustment','spend','reversal')),
  reference_key text not null unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aura_wallet_transactions_user_idx
  on public.aura_wallet_transactions(telegram_user_id, created_at desc);

alter table public.aura_wallet_transactions enable row level security;

create or replace function public.qualify_referral(p_referred_telegram_user_id bigint, p_purchase_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.numerology_referrals%rowtype;
begin
  select * into r
  from public.numerology_referrals
  where referred_telegram_user_id = p_referred_telegram_user_id
  order by created_at asc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('qualified', false, 'reason', 'no_referral');
  end if;

  if r.referrer_telegram_user_id = p_referred_telegram_user_id then
    return jsonb_build_object('qualified', false, 'reason', 'self_referral');
  end if;

  if r.status = 'rewarded' then
    return jsonb_build_object('qualified', true, 'already_rewarded', true, 'referral_id', r.id);
  end if;

  insert into public.aura_wallet_transactions
    (telegram_user_id, amount, kind, reference_key, description, metadata)
  values
    (r.referrer_telegram_user_id, 50, 'referral_bonus',
     'referral:'||r.id||':inviter',
     'Бонус за приглашение друга',
     jsonb_build_object('referral_id', r.id, 'referred_telegram_user_id', r.referred_telegram_user_id))
  on conflict (reference_key) do nothing;

  insert into public.aura_wallet_transactions
    (telegram_user_id, amount, kind, reference_key, description, metadata)
  values
    (r.referred_telegram_user_id, 50, 'referral_welcome',
     'referral:'||r.id||':welcome',
     'Бонус за первую покупку после приглашения',
     jsonb_build_object('referral_id', r.id, 'referrer_telegram_user_id', r.referrer_telegram_user_id))
  on conflict (reference_key) do nothing;

  update public.numerology_referrals
  set status='rewarded',
      first_purchase_at=coalesce(first_purchase_at,p_purchase_at),
      rewarded_at=coalesce(rewarded_at,p_purchase_at)
  where id=r.id;

  return jsonb_build_object('qualified', true, 'already_rewarded', false, 'referral_id', r.id, 'reward', 50);
end;
$$;

revoke execute on function public.qualify_referral(bigint,timestamptz) from public;
revoke execute on function public.qualify_referral(bigint,timestamptz) from anon;
revoke execute on function public.qualify_referral(bigint,timestamptz) from authenticated;
grant execute on function public.qualify_referral(bigint,timestamptz) to service_role;
