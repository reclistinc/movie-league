-- Seen / Watchlist, round snapshots, watchlist page.
--   * Two marks now: Seen and Watchlist ("Not Seen" is the same as no mark, so it's dropped).
--   * When a round's results come out, what every voter had marked is frozen for that round:
--       submissions.seen_by / want_by   how many other players had seen it / wanted to
--       rounds.markers                  how many players marked anything that round
--       round_marks                     per player: seen / watchlist counts and how many picks they could mark
--     Results, Hidden Gem, the player card and tiebreakers 6-7 all use the frozen numbers, so changing your
--     marks later only changes your own list. Nobody can see which movies another player marked.
--   * my_watchlist(): everything you've put on your Watchlist, with the league/round/friend it came from.

delete from public.watch_status where status = 'unseen';

alter table public.submissions
  add column if not exists seen_by int,
  add column if not exists want_by int;
alter table public.rounds add column if not exists markers int;

create table if not exists public.round_marks (
  round_id uuid not null references public.rounds (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  seen     int  not null,
  want     int  not null,
  others   int  not null,  -- other players' picks in the round (what they could have marked)
  primary key (round_id, user_id)
);
alter table public.round_marks enable row level security;  -- read only through the functions below
revoke all on public.round_marks from anon, authenticated;

create or replace function public._snapshot_round(p_round uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare voters uuid[];
begin
  voters := array(select public._round_participants(p_round));
  update public.submissions s set
    seen_by = (select count(*) from public.watch_status w
               where w.tmdb_id = s.tmdb_id and w.status = 'seen' and w.user_id = any (voters) and w.user_id <> s.user_id),
    want_by = (select count(*) from public.watch_status w
               where w.tmdb_id = s.tmdb_id and w.status = 'want' and w.user_id = any (voters) and w.user_id <> s.user_id)
  where s.round_id = p_round;

  delete from public.round_marks where round_id = p_round;
  insert into public.round_marks (round_id, user_id, seen, want, others)
  select p_round, v,
         (select count(*) from public.submissions s
            join public.watch_status w on w.tmdb_id = s.tmdb_id and w.user_id = v and w.status = 'seen'
           where s.round_id = p_round and s.user_id <> v),
         (select count(*) from public.submissions s
            join public.watch_status w on w.tmdb_id = s.tmdb_id and w.user_id = v and w.status = 'want'
           where s.round_id = p_round and s.user_id <> v),
         (select count(*) from public.submissions s where s.round_id = p_round and s.user_id <> v)
  from unnest(voters) v;

  update public.rounds
     set markers = (select count(*) from public.round_marks m where m.round_id = p_round and m.seen + m.want > 0)
   where id = p_round;
end;
$$;
revoke execute on function public._snapshot_round(uuid) from public, anon, authenticated;

create or replace function public._rounds_on_complete()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'complete' and old.status is distinct from 'complete' then
    perform public._snapshot_round(new.id);
  end if;
  return null;
end;
$$;
drop trigger if exists rounds_snapshot on public.rounds;
create trigger rounds_snapshot after update of status on public.rounds
  for each row execute function public._rounds_on_complete();

-- Rounds that already finished: snapshot today's marks.
do $$
declare rid uuid;
begin
  for rid in select id from public.rounds where status = 'complete' loop
    perform public._snapshot_round(rid);
  end loop;
end $$;

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
           (select coalesce(sum(rm.seen), 0) from public.round_marks rm
              join public.rounds r on r.id = rm.round_id and r.league_id = p_league_id and r.status = 'complete'
             where rm.user_id = m.user_id)::int as seen,
           (select coalesce(sum(rm.want), 0) from public.round_marks rm
              join public.rounds r on r.id = rm.round_id and r.league_id = p_league_id and r.status = 'complete'
             where rm.user_id = m.user_id)::int as want
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
               'completed_at', r.completed_at, 'markers', r.markers,
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
                   'seen_by', s.seen_by, 'want_by', s.want_by,
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
      -- Frozen at each round's results (round_marks); null if they've never marked anything here.
      'seen_picks', (select case when sum(rm.seen + rm.want) > 0 then sum(rm.seen) end
                     from public.round_marks rm join public.rounds r on r.id = rm.round_id and r.league_id = p_league_id
                     where rm.user_id = p_user_id),
      'others_picks', (select sum(rm.others) from public.round_marks rm
                       join public.rounds r on r.id = rm.round_id and r.league_id = p_league_id
                       where rm.user_id = p_user_id),
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


create or replace function public.my_watchlist()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(x.j order by x.updated_at desc), '[]')
  from (
    select w.updated_at, jsonb_build_object(
             'tmdb_id', w.tmdb_id, 'added_at', w.updated_at,
             'title', src.title, 'release_year', src.release_year, 'poster_path', src.poster_path,
             'from', case when src.league_id is null then null else jsonb_build_object(
                 'league_id', src.league_id, 'league_name', src.league_name,
                 'round_position', src.position, 'round_theme', src.theme,
                 -- who picked it stays hidden until that round's results are out
                 'picker_id', case when src.status = 'complete' then src.user_id end,
                 'picker_name', case when src.status = 'complete' then coalesce(src.display_name, 'Former player') end,
                 'picker_avatar', case when src.status = 'complete' then src.avatar end) end) as j
    from public.watch_status w
    left join lateral (
      select s.title, s.release_year, s.poster_path, s.user_id, r.position, r.theme, r.status,
             l.id as league_id, l.name as league_name, m.display_name, m.avatar
      from public.submissions s
      join public.rounds r on r.id = s.round_id and r.status in ('voting', 'complete')
      join public.leagues l on l.id = r.league_id
      join public.league_members me on me.league_id = l.id and me.user_id = auth.uid()
      left join public.league_members m on m.league_id = l.id and m.user_id = s.user_id
      where s.tmdb_id = w.tmdb_id and s.user_id <> auth.uid()
      order by (r.status = 'complete') desc, s.created_at desc
      limit 1
    ) src on true
    where w.user_id = auth.uid() and w.status = 'want'
  ) x;
$$;

revoke execute on function public.get_league_state(uuid), public.get_player_card(uuid, uuid), public.my_watchlist() from public, anon;
grant execute on function public.get_league_state(uuid), public.get_player_card(uuid, uuid), public.my_watchlist() to authenticated;
