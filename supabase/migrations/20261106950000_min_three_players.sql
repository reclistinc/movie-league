-- A season needs at least 3 players to start (with 2, every round is an automatic tie).

create or replace function public.start_season(p_league_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare l public.leagues%rowtype;
begin
  l := public._require_commissioner(p_league_id);
  if l.status <> 'setup' then
    raise exception 'The season has already started';
  end if;
  if not exists (select 1 from public.rounds where league_id = p_league_id) then
    raise exception 'Add at least one round to the queue first';
  end if;
  if (select count(*) from public.league_members where league_id = p_league_id) < 3 then
    raise exception 'You need at least 3 players to start';
  end if;
  update public.leagues set status = 'active', started_at = now() where id = p_league_id;
  perform public.sync_league(p_league_id);  -- opens round 1
end;
$$;

revoke execute on function public.start_season(uuid) from public, anon;
grant execute on function public.start_season(uuid) to authenticated;
