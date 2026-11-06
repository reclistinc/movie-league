-- Commissioner tool: replace the league's invite code. The old link stops working immediately;
-- current players are unaffected. Pair with remove_player to keep someone from rejoining.
create or replace function public.reset_invite_code(p_league_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  l public.leagues%rowtype;
  new_code text;
begin
  l := public._require_commissioner(p_league_id);
  if l.status = 'complete' then
    raise exception 'This season is over';
  end if;
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.leagues where invite_code = new_code);
  end loop;
  update public.leagues set invite_code = new_code where id = p_league_id;
  perform public._bump(p_league_id);
  return new_code;
end;
$$;

revoke execute on function public.reset_invite_code(uuid) from public, anon;
grant execute on function public.reset_invite_code(uuid) to authenticated;
