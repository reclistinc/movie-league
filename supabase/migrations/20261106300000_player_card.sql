-- Player card: one player's stats, shown when you tap their avatar or name.
--   * This league: finish, points, round wins, every pick from finished rounds (with its place
--     and points), biggest fan and favourite player to vote for.
--   * Career: totals across every league the player is in. These are counts only; the card
--     never names a league or shows picks from a league you aren't in.
-- Only finished rounds count anywhere, so nothing leaks while a round is still open.

create or replace function public.get_player_card(p_league_id uuid, p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  res jsonb;
begin
  perform public._require_member(p_league_id);
  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = p_user_id)
     and not exists (select 1 from public.submissions s join public.rounds r on r.id = s.round_id
                     where r.league_id = p_league_id and s.user_id = p_user_id) then
    raise exception 'That player isn''t in this league';
  end if;

  with
  their_leagues as (
    select league_id from public.league_members where user_id = p_user_id
    union
    select p_league_id
  ),
  scored as (
    select s.id, s.user_id, s.round_id, r.league_id, r.position, r.theme,
           s.tmdb_id, s.title, s.release_year, s.poster_path,
           coalesce(v.pts, 0) as pts, coalesce(v.voters, 0) as voters
    from public.submissions s
    join public.rounds r on r.id = s.round_id and r.status = 'complete'
    left join lateral (
      select sum(x.points)::int as pts, (count(*) filter (where x.points > 0))::int as voters
      from public.votes x where x.submission_id = s.id
    ) v on true
    where r.league_id in (select league_id from their_leagues)
  ),
  placed as (
    select sc.*,
           rank() over (partition by sc.round_id order by sc.pts desc) as place,
           count(*) over (partition by sc.round_id) as field,
           sc.pts > 0 and sc.pts = max(sc.pts) over (partition by sc.round_id) as is_win
    from scored sc
  ),
  totals as (
    select m.league_id, m.user_id,
           coalesce(sum(p.pts), 0)::int as pts,
           (count(p.id) filter (where p.is_win))::int as wins
    from public.league_members m
    left join placed p on p.league_id = m.league_id and p.user_id = m.user_id
    where m.league_id in (select league_id from their_leagues)
    group by m.league_id, m.user_id
  ),
  ranked as (
    select t.*, l.status,
           rank() over (partition by t.league_id order by t.pts desc, t.wins desc) as finish,
           count(*) over (partition by t.league_id) as field
    from totals t join public.leagues l on l.id = t.league_id
  ),
  mine as (select * from placed where user_id = p_user_id),
  fans as (
    select v.voter_id, sum(v.points)::int as pts
    from public.votes v join mine on mine.id = v.submission_id
    where mine.league_id = p_league_id and v.voter_id <> p_user_id
    group by v.voter_id
  ),
  faves as (
    select s.user_id, sum(v.points)::int as pts
    from public.votes v
    join public.submissions s on s.id = v.submission_id
    join public.rounds r on r.id = s.round_id and r.status = 'complete' and r.league_id = p_league_id
    where v.voter_id = p_user_id and s.user_id <> p_user_id
    group by s.user_id
  )
  select jsonb_build_object(
    'user_id', p_user_id,
    'display_name', (select display_name from public.league_members where league_id = p_league_id and user_id = p_user_id),
    'avatar', (select avatar from public.league_members where league_id = p_league_id and user_id = p_user_id),
    'joined_at', (select joined_at from public.league_members where league_id = p_league_id and user_id = p_user_id),
    'is_commissioner', (select commissioner_id = p_user_id from public.leagues where id = p_league_id),
    'league', jsonb_build_object(
      'status', (select status from public.leagues where id = p_league_id),
      'finish', (select finish from ranked where league_id = p_league_id and user_id = p_user_id),
      'field', (select count(*) from public.league_members where league_id = p_league_id),
      'points', coalesce((select sum(pts) from mine where league_id = p_league_id), 0),
      'round_wins', (select count(*) from mine where league_id = p_league_id and is_win),
      'rounds_played', (select count(*) from mine where league_id = p_league_id),
      'rounds_complete', (select count(*) from public.rounds where league_id = p_league_id and status = 'complete'),
      'picks', (select coalesce(jsonb_agg(jsonb_build_object(
                  'position', position, 'theme', theme, 'tmdb_id', tmdb_id, 'title', title,
                  'release_year', release_year, 'poster_path', poster_path,
                  'points', pts, 'place', place, 'field', field, 'voters', voters, 'is_win', is_win)
                order by position), '[]') from mine where league_id = p_league_id),
      'biggest_fan', (select jsonb_build_object('user_id', voter_id, 'points', pts) from fans order by pts desc limit 1),
      'favorite', (select jsonb_build_object('user_id', user_id, 'points', pts) from faves order by pts desc limit 1)
    ),
    'career', jsonb_build_object(
      'leagues', (select count(*) from ranked where user_id = p_user_id),
      'seasons_finished', (select count(*) from ranked where user_id = p_user_id and status = 'complete'),
      'titles', (select count(*) from ranked where user_id = p_user_id and status = 'complete' and finish = 1),
      'podiums', (select count(*) from ranked where user_id = p_user_id and status = 'complete' and finish <= 3),
      'best_finish', (select jsonb_build_object('finish', finish, 'field', field) from ranked
                      where user_id = p_user_id and status = 'complete' order by finish, field desc limit 1),
      'rounds_played', (select count(*) from mine),
      'round_wins', (select count(*) from mine where is_win),
      'points', coalesce((select sum(pts) from mine), 0),
      'avg_points', (select round(avg(pts), 1) from mine),
      'best_round', (select jsonb_build_object('points', pts, 'place', place, 'field', field) from mine
                     order by pts desc limit 1)
    )
  ) into res;
  return res;
end;
$$;

revoke execute on function public.get_player_card(uuid, uuid) from public, anon;
grant execute on function public.get_player_card(uuid, uuid) to authenticated;
