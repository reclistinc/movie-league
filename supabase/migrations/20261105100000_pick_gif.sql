-- Movie League — optional GIPHY GIF attached to a pick.
-- Adds submissions.gif_url, lets submit_pick accept it (GIPHY URLs only),
-- and includes it in get_league_state. Safe to run once on top of the init migration.

alter table public.submissions
  add column if not exists gif_url text check (gif_url is null or char_length(gif_url) <= 500);

drop function if exists public.submit_pick(uuid, int, text, int, text, text);

create or replace function public.submit_pick(
  p_round_id uuid,
  p_tmdb_id int,
  p_title text,
  p_release_year int default null,
  p_poster_path text default null,
  p_note text default null,
  p_gif_url text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare r public.rounds%rowtype;
begin
  select * into r from public.rounds where id = p_round_id;
  if not found then
    raise exception 'Round not found';
  end if;
  perform public._require_member(r.league_id);
  perform public.sync_league(r.league_id);
  select * into r from public.rounds where id = p_round_id;
  if r.status <> 'submitting' then
    raise exception 'Submissions are closed for this round';
  end if;
  if auth.uid() not in (select public._round_participants(r.id)) then
    raise exception 'You joined after this round opened — you''re in from the next round';
  end if;
  if p_gif_url is not null and p_gif_url !~ '^https://media[0-9]*\.giphy\.com/' then
    raise exception 'GIFs must come from GIPHY';
  end if;
  if exists (select 1 from public.submissions
             where round_id = r.id and tmdb_id = p_tmdb_id and user_id <> auth.uid()) then
    raise exception 'Someone already picked that movie this round';
  end if;

  insert into public.submissions (round_id, user_id, tmdb_id, title, release_year, poster_path, note, gif_url)
    values (r.id, auth.uid(), p_tmdb_id, btrim(p_title), p_release_year, p_poster_path, nullif(btrim(p_note), ''), p_gif_url)
  on conflict (round_id, user_id) do update
    set tmdb_id = excluded.tmdb_id, title = excluded.title, release_year = excluded.release_year,
        poster_path = excluded.poster_path, note = excluded.note, gif_url = excluded.gif_url, updated_at = now();

  perform public._bump(r.league_id);
  perform public.sync_league(r.league_id);
end;
$$;

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
                 'note', s.note, 'gif_url', s.gif_url, 'is_mine', s.user_id = me)
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
                   'points', (select coalesce(sum(v.points), 0) from public.votes v where v.submission_id = s.id),
                   'votes', (select coalesce(jsonb_agg(jsonb_build_object(
                               'voter_id', v.voter_id, 'points', v.points, 'comment', v.comment)
                             order by v.points desc), '[]')
                             from public.votes v where v.submission_id = s.id)
                 ) as row
          from public.submissions s where s.round_id = r.id
        ) x)), '{}')
      from public.rounds r where r.league_id = p_league_id and r.status = 'complete'),
    -- Standings only count completed rounds (i.e. once all votes are locked or voting closed).
    'standings', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'user_id', t.user_id, 'points', t.points, 'round_wins', t.wins)
             order by t.points desc, t.wins desc), '[]')
      from (
        select m.user_id,
               coalesce(sum(st.points), 0)::int as points,
               count(*) filter (where st.is_win)::int as wins
        from public.league_members m
        left join (
          select s.user_id, sc.points,
                 sc.points > 0 and sc.points = max(sc.points) over (partition by s.round_id) as is_win
          from public.submissions s
          join public.rounds r on r.id = s.round_id and r.status = 'complete' and r.league_id = p_league_id
          cross join lateral (
            select coalesce(sum(v.points), 0)::int as points from public.votes v where v.submission_id = s.id
          ) sc
        ) st on st.user_id = m.user_id
        where m.league_id = p_league_id
        group by m.user_id
      ) t)
  ) into result;

  return result;
end;
$$;

revoke execute on function public.submit_pick(uuid, int, text, int, text, text, text) from public, anon;
grant execute on function public.submit_pick(uuid, int, text, int, text, text, text) to authenticated;
revoke execute on function public.get_league_state(uuid) from public, anon;
grant execute on function public.get_league_state(uuid) to authenticated;
