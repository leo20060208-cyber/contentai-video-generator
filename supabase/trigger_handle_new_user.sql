-- 1. Create the function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, plan, credits, created_at)
  values (
    new.id,
    new.raw_user_meta_data->>'name', -- Extract name from metadata
    'Free',
    100,
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
