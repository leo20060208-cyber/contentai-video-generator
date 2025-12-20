-- Atomic credit consumption for Starter + Pay-per-video

create or replace function public.consume_video_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set video_credits = video_credits - 1
  where id = p_user_id
    and video_credits > 0;

  if found then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.consume_video_credit(uuid) to authenticated;

