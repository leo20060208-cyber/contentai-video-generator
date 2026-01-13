-- Migration to fix "Database error saving new user" on Vercel/Prod
-- Adds missing columns to profiles table and updates handle_new_user function

-- 1. Add columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Update the trigger function to insert these new fields
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url, plan, credits, created_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url',
    'Free',
    0,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
