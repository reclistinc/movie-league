-- League tiebreakers. Standings (and so the champion) are ordered by:
--   1. total points
--   2. round wins
--   3. most points in a single round
--   4. most voters per round, on average (people who gave the pick any points)
--   5. fewest last-place round finishes
--   6. most of the league's picks (by other players) marked Seen
--   7. most of the league's picks (by other players) marked Watchlist
--   8. joined the league first (so the order is never random)
-- Only finished rounds count. Seen / Watchlist counts are used for ordering but never returned.

create or replace function public._league_standings(p_league_id uuid)
returns table (user_id uuid, points int, round_wins int, best_round int, avg_voters numeric,
               last_places int, place int)
language sql stable security definer set search_path = ''
as $$
  with sc as (
    select s.id, s.user_id, s.round_id, s.tmdb_id,
           coalesce(v.pts, 0) as pts, coalesce(v.voters, 0) as voters
    from public.submissions s
    join public.rounds r on r.id = s.round_id and r.status = 'complete' and r.league_id = p_league_id
    left join lateral (
      select sum(x.points)::int as pts, (count(*) filter (where x.points > 0))::int as voters
      from public.votes x where x.submission_id = s.id
    ) v on true
  ),
  pl as (
    select sc.*,
           sc.pts > 0 and sc.pts = max(sc.pts) over w as is_win,
           count(*) over w > 1 and sc.pts = min(sc.pts) over w as is_last
    from sc window w as (partition by sc.round_id)
  ),
  t as (
    select m.user_id, m.joined_at,
           coalesce(sum(pl.pts), 0)::int as points,
           (count(pl.id) filter (where pl.is_win))::int as round_wins,
           coalesce(max(pl.pts), 0)::int as best_round,
           coalesce(avg(pl.voters), 0)::numeric as avg_voters,
           (count(pl.id) filter (where pl.is_last))::int as last_places,
           (select count(distinct sc.tmdb_id) from sc
              join public.watch_status w on w.tmdb_id = sc.tmdb_id and w.user_id = m.user_id and w.status = 'seen'
             where sc.user_id <> m.user_id)::int as seen,
           (select count(distinct sc.tmdb_id) from sc
              join public.watch_status w on w.tmdb_id = sc.tmdb_id and w.user_id = m.user_id and w.status = 'want'
             where sc.user_id <> m.user_id)::int as want
    from public.league_members m
    left join pl on pl.user_id = m.user_id
    where m.league_id = p_league_id
    group by m.user_id, m.joined_at
  )
  select t.user_id, t.points, t.round_wins, t.best_round, round(t.avg_voters, 2), t.last_places,
         (row_number() over (order by t.points desc, t.round_wins desc, t.best_round desc, t.avg_voters desc,
                                      t.last_places asc, t.seen desc, t.want desc, t.joined_at, t.user_id))::int
  from t;
$$;

revoke execute on function public._league_standings(uuid) from public, anon, authenticated;

create or replace function public.get_league_state(p_league_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  l       public.leagues%rowtype;
  live    public.rounds%rowtype;
  result  jsonb;
  cur     jsonb := null;
  locked  boolean := false;
begin
  perform public._require_member(p_league_id);
  perform public.sync_league(p_league_id);
  select * into l from public.leagues where id = p_league_id;
  select * into live from public.rounds
    where league_id = p_league_id and status in ('submitting', 'voting');

  if found then
    locked := exists (select 1 from public.ballots where round_id = live.id and user_id = me);
    cur := jsonb_build_object(
      'round_id', live.id,
      'is_participant', me in (select public._round_participants(live.id)),
      'is_voter', me in (select public._round_voters(live.id)),
      'my_submission', (
        select to_jsonb(s) - 'user_id' from public.submissions s
        where s.round_id = live.id and s.user_id = me),
      -- Anonymous picks, in a stable per-viewer random order (anti-anchoring).
      'submissions', case when live.status = 'voting' then (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'id', s.id, 'tmdb_id', s.tmdb_id, 'title', s.title,
                 'release_year', s.release_year, 'poster_path', s.poster_path,
                 'note', s.note, 'gif_url', s.gif_url,
                 'video_key', s.video_key, 'video_name', s.video_name, 'video_type', s.video_type,
                 'is_mine', s.user_id = me)
               order by md5(s.id::text || me::text)), '[]')
        from public.submissions s where s.round_id = live.id)
        else null end,
      'ballot_locked', locked,
      'my_votes', case when locked then (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'submission_id', v.submission_id, 'points', v.points, 'comment', v.comment)), '[]')
        from public.votes v where v.round_id = live.id and v.voter_id = me)
        else null end,
      -- Running totals are only revealed to voters who have locked in.
      'live_totals', case when locked then (
        select coalesce(jsonb_agg(jsonb_build_object('submission_id', s.id,
                 'points', (select coalesce(sum(v.points), 0) from public.votes v where v.submission_id = s.id))), '[]')
        from public.submissions s where s.round_id = live.id)
        else null end
    );
  end if;

  select jsonb_build_object(
    'me', me,
    'league', jsonb_build_object(
      'id', l.id, 'name', l.name, 'status', l.status, 'vote_budget', l.vote_budget,
      'submission_days', l.submission_days, 'voting_days', l.voting_days,
      'invite_code', l.invite_code, 'commissioner_id', l.commissioner_id,
      'is_commissioner', l.commissioner_id = me, 'started_at', l.started_at,
      'completed_at', l.completed_at, 'version', l.version),
    'members', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'user_id', m.user_id, 'display_name', m.display_name,
               'avatar', m.avatar, 'joined_at', m.joined_at) order by m.joined_at), '[]')
      from public.league_members m where m.league_id = p_league_id),
    'rounds', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', r.id, 'position', r.position, 'theme', r.theme, 'description', r.description,
               'status', r.status,
               'submissions_opened_at', r.submissions_opened_at, 'submission_deadline', r.submission_deadline,
               'voting_opened_at', r.voting_opened_at, 'voting_deadline', r.voting_deadline,
               'completed_at', r.completed_at,
               'participant_ids', (select coalesce(jsonb_agg(p), '[]') from public._round_participants(r.id) p),
               -- Who has submitted / voted is public; what they picked is not.
               'submitted_ids', (select coalesce(jsonb_agg(s.user_id), '[]') from public.submissions s where s.round_id = r.id),
               'voted_ids', (select coalesce(jsonb_agg(b.user_id), '[]') from public.ballots b where b.round_id = r.id)
             ) order by r.position), '[]')
      from public.rounds r where r.league_id = p_league_id),
    'current', cur,
    -- Full results with submitters, vote breakdowns and comments for finished rounds only.
    'results', (
      select coalesce(jsonb_object_agg(r.id, (
        select coalesce(jsonb_agg(x.row order by x.total desc, x.created_at), '[]')
        from (
          select s.created_at,
                 (select coalesce(sum(v.points), 0) from public.votes v where v.submission_id = s.id) as total,
                 jsonb_build_object(
                   'id', s.id, 'user_id', s.user_id, 'tmdb_id', s.tmdb_id, 'title', s.title,
                   'release_year', s.release_year, 'poster_path', s.poster_path, 'note', s.note, 'gif_url', s.gif_url,
                   'video_key', s.video_key, 'video_name', s.video_name, 'video_type', s.video_type,
                   'points', (select coalesce(sum(v.points), 0) from public.votes v where v.submission_id = s.id),
                   'votes', (select coalesce(jsonb_agg(jsonb_build_object(
                               'voter_id', v.voter_id, 'points', v.points, 'comment', v.comment)
                             order by v.points desc), '[]')
                             from public.votes v where v.submission_id = s.id)
                 ) as row
          from public.submissions s where s.round_id = r.id
        ) x)), '{}')
      from public.rounds r where r.league_id = p_league_id and r.status = 'complete'),
    -- Standings only count completed rounds, ranked by the league tiebreakers (_league_standings).
    'standings', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'user_id', s.user_id, 'points', s.points, 'round_wins', s.round_wins,
               'best_round', s.best_round, 'avg_voters', s.avg_voters, 'last_places', s.last_places,
               'place', s.place)
             order by s.place), '[]')
      from public._league_standings(p_league_id) s)
  ) into result;

  return result;
end;
$$;


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
  ranked as (
    select tl.league_id, st.user_id, l.status, st.place as finish,
           count(*) over (partition by tl.league_id) as field
    from their_leagues tl
    cross join lateral public._league_standings(tl.league_id) st
    join public.leagues l on l.id = tl.league_id
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


revoke execute on function public.get_league_state(uuid), public.get_player_card(uuid, uuid) from public, anon;
grant execute on function public.get_league_state(uuid), public.get_player_card(uuid, uuid) to authenticated;
