-- Movie League — commissioner tools: remove a player, end the season early, delete the league.
-- All three are commissioner-only and enforced here in the database.

-- Remove a player. Finished rounds keep their history; the live round forgets them
-- (their pick, the votes they cast, their locked ballot) so it can't get stuck waiting.
create or replace function public.remove_player(p_league_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  l    public.leagues%rowtype;
  live uuid;
begin
  l := public._require_commissioner(p_league_id);
  if p_user_id = l.commissioner_id then
    raise exception 'The commissioner can''t remove themselves';
  end if;
  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = p_user_id) then
    raise exception 'That player isn''t in this league';
  end if;

  select id into live from public.rounds where league_id = p_league_id and status in ('submitting', 'voting');
  if live is not null then
    delete from public.votes where round_id = live and voter_id = p_user_id;
    delete from public.ballots where round_id = live and user_id = p_user_id;
    delete from public.submissions where round_id = live and user_id = p_user_id;  -- cascades votes on it
  end if;

  delete from public.league_members where league_id = p_league_id and user_id = p_user_id;
  perform public._bump(p_league_id);
  perform public.sync_league(p_league_id);  -- everyone left may already be done
end;
$$;

-- End the season now. A round in voting is wrapped up with the votes cast so far;
-- a round still taking picks is cancelled (its picks cleared). Queued rounds are dropped.
create or replace function public.end_season(p_league_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  l public.leagues%rowtype;
  r public.rounds%rowtype;
begin
  l := public._require_commissioner(p_league_id);
  if l.status <> 'active' then
    raise exception 'Only a season in progress can be ended';
  end if;

  select * into r from public.rounds where league_id = p_league_id and status in ('submitting', 'voting');
  if found then
    if r.status = 'voting' then
      update public.rounds set status = 'complete', completed_at = now() where id = r.id;
    else
      delete from public.submissions where round_id = r.id;
      delete from public.rounds where id = r.id;
    end if;
  end if;
  delete from public.rounds where league_id = p_league_id and status = 'queued';

  update public.leagues set status = 'complete', completed_at = now(), version = version + 1 where id = p_league_id;
end;
$$;

-- Delete the league and everything in it. The name must be typed to confirm.
create or replace function public.delete_league(p_league_id uuid, p_confirm_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  l public.leagues%rowtype;
begin
  l := public._require_commissioner(p_league_id);
  if lower(btrim(p_confirm_name)) <> lower(btrim(l.name)) then
    raise exception 'Type the league name exactly to confirm';
  end if;
  delete from public.leagues where id = p_league_id;  -- cascades members, rounds, picks, votes, chat
end;
$$;

revoke execute on function public.remove_player(uuid, uuid), public.end_season(uuid), public.delete_league(uuid, text)
  from public, anon;
grant execute on function public.remove_player(uuid, uuid), public.end_season(uuid), public.delete_league(uuid, text)
  to authenticated;
