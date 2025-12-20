-- Billing + entitlements support
-- Adds subscription fields and pay-per-video credits to profiles

alter table if exists public.profiles
  add column if not exists subscription_status text,
  add column if not exists billing_interval text,
  add column if not exists current_period_end timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists video_credits integer not null default 0;

-- Keep backward compatibility: some code previously used plan='Free'
alter table if exists public.profiles
  add column if not exists plan text not null default 'Free';

create index if not exists profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id);
create index if not exists profiles_stripe_subscription_id_idx on public.profiles (stripe_subscription_id);

