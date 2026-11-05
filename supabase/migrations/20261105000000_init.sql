-- Movie League — initial schema
--
-- Design notes
-- * Clients only get read access to non-secret tables (leagues, members, rounds, chat).
--   Submissions, votes and ballots are never selectable directly, because the
--   submitter and voter identities must stay hidden until a round is complete.
--   Everything gameplay-related goes through SECURITY DEFINER functions that
--   enforce the rules and return a per-viewer snapshot (get_league_state).
-- * Rounds advance lazily: every RPC first calls sync_league(), which applies
--   deadlines and "everyone is done" early advances. sync_all_leagues() can also
--   be scheduled with pg_cron so phases advance even when nobody has the app open.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.leagues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(btrim(name)) between 1 and 80),
  commissioner_id  uuid not null references auth.users (id) on delete cascade,
  vote_budget      int  not null default 20 check (vote_budget between 1 and 100),
  submission_days  int  not null default 5  check (submission_days between 1 and 30),
  voting_days      int  not null default 5  check (voting_days between 1 and 30),
  invite_code      text not null unique
                   default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  status           text not null default 'setup' check (status in ('setup', 'active', 'complete')),
  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  completed_at     timestamptz,
  version          bigint not null default 0   -- bumped on every game-state change; clients subscribe to it
);

create table public.league_members (
  league_id     uuid not null references public.leagues (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar        text not null,
  joined_at     timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index on public.league_members (user_id);

create table public.rounds (
  id                     uuid primary key default gen_random_uuid(),
  league_id              uuid not null references public.leagues (id) on delete cascade,
  position               int  not null,
  theme                  text not null check (char_length(btrim(theme)) between 1 and 120),
  description            text check (char_length(description) <= 500),
  status                 text not null default 'queued'
                         check (status in ('queued', 'submitting', 'voting', 'complete')),
  submissions_opened_at  timestamptz,
  submission_deadline    timestamptz,
  voting_opened_at       timestamptz,
  voting_deadline        timestamptz,
  completed_at           timestamptz,
  unique (league_id, position)
);
-- At most one live round per league.
create unique index rounds_one_live_per_league
  on public.rounds (league_id) where status in ('submitting', 'voting');

create table public.submissions (
  id           uuid primary key default gen_random_uuid(),
  round_id     uuid not null references public.rounds (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  tmdb_id      int  not null,
  title        text not null,
  release_year int,
  poster_path  text,
  note         text check (char_length(note) <= 280),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (round_id, user_id),   -- one pick per player per round
  unique (round_id, tmdb_id)    -- no duplicate picks per round
);

-- A ballot row means the voter has locked in; votes are immutable after that.
create table public.ballots (
  round_id   uuid not null references public.rounds (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  locked_at  timestamptz not null default now(),
  primary key (round_id, user_id)
);

create table public.votes (
  round_id       uuid not null references public.rounds (id) on delete cascade,
  voter_id       uuid not null references auth.users (id) on delete cascade,
  submission_id  uuid not null references public.submissions (id) on delete cascade,
  points         int  not null default 0 check (points >= 0),
  comment        text check (char_length(comment) <= 500),
  primary key (voter_id, submission_id)
);
create index on public.votes (round_id);

create table public.chat_messages (
  id          bigint generated always as identity primary key,
  league_id   uuid not null references public.leagues (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index on public.chat_messages (league_id, created_at);

-- ---------------------------------------------------------------------------
-- Row level security: reads only, writes go through functions
-- ---------------------------------------------------------------------------

alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;
alter table public.rounds         enable row level security;
alter table public.submissions    enable row level security;
alter table public.ballots        enable row level security;
alter table public.votes          enable row level security;
alter table public.chat_messages  enable row level security;

revoke all on public.leagues, public.league_members, public.rounds, public.submissions,
              public.ballots, public.votes, public.chat_messages from anon, authenticated;
grant select on public.leagues, public.league_members, public.rounds, public.chat_messages to authenticated;
grant insert (league_id, body) on public.chat_messages to authenticated;

create or replace function public.is_member(p_league_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  );
$$;

create policy "members read league"  on public.leagues        for select to authenticated using (public.is_member(id));
create policy "members read roster"  on public.league_members for select to authenticated using (public.is_member(league_id));
create policy "members read rounds"  on public.rounds         for select to authenticated using (public.is_member(league_id));
create policy "members read chat"    on public.chat_messages  for select to authenticated using (public.is_member(league_id));
create policy "members post chat"    on public.chat_messages  for insert to authenticated
  with check (public.is_member(league_id) and user_id = auth.uid());
-- submissions / ballots / votes: RLS on with no policies = no direct access.

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------

-- Members who were in the league when the round opened. Late joiners start next round.
create or replace function public._round_participants(p_round_id uuid)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.user_id
  from public.rounds r
  join public.league_members m on m.league_id = r.league_id
  where r.id = p_round_id
    and r.submissions_opened_at is not null
    and m.joined_at <= r.submissions_opened_at;
$$;

-- Participants who have at least one other player's pick to vote on.
create or replace function public._round_voters(p_round_id uuid)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select p.uid
  from public._round_participants(p_round_id) as p(uid)
  where exists (
    select 1 from public.submissions s
    where s.round_id = p_round_id and s.user_id <> p.uid
  );
$$;

create or replace function public._bump(p_league_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.leagues set version = version + 1 where id = p_league_id;
$$;

-- Apply deadlines and early advances. Loops so that several transitions that are
-- all due (e.g. a round finishing and the next one opening) happen in one call.
create or replace function public.sync_league(p_league_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  l       public.leagues%rowtype;
  r       public.rounds%rowtype;
  changed boolean := false;
  n_part  int;
  n_sub   int;
  n_voter int;
  n_lock  int;
begin
  select * into l from public.leagues where id = p_league_id for update;
  if not found or l.status <> 'active' then
    return;
  end if;

  loop
    select * into r from public.rounds
      where league_id = p_league_id and status in ('submitting', 'voting');

    if not found then
      -- Open the next queued round, or finish the season.
      select * into r from public.rounds
        where league_id = p_league_id and status = 'queued'
        order by position limit 1;
      if not found then
        update public.leagues set status = 'complete', completed_at = now() where id = p_league_id;
        changed := true;
        exit;
      end if;
      update public.rounds
        set status = 'submitting',
            submissions_opened_at = now(),
            submission_deadline = now() + make_interval(days => l.submission_days)
        where id = r.id;
      changed := true;
      exit;  -- a freshly opened round can't be due yet
    end if;

    if r.status = 'submitting' then
      select count(*) into n_part from public._round_participants(r.id);
      select count(*) into n_sub  from public.submissions where round_id = r.id;
      if now() >= r.submission_deadline or (n_part > 0 and n_sub >= n_part) then
        if n_sub = 0 then
          update public.rounds set status = 'complete', completed_at = now() where id = r.id;
          changed := true;
          continue;
        end if;
        update public.rounds
          set status = 'voting',
              voting_opened_at = now(),
              voting_deadline = now() + make_interval(days => l.voting_days)
          where id = r.id;
        changed := true;
        r.status := 'voting';
        r.voting_deadline := now() + make_interval(days => l.voting_days);
      else
        exit;
      end if;
    end if;

    if r.status = 'voting' then
      select count(*) into n_voter from public._round_voters(r.id);
      select count(*) into n_lock from public.ballots b
        where b.round_id = r.id and b.user_id in (select public._round_voters(r.id));
      if now() >= r.voting_deadline or n_lock >= n_voter then
        update public.rounds set status = 'complete', completed_at = now() where id = r.id;
        changed := true;
        continue;  -- go open the next round
      end if;
      exit;
    end if;
  end loop;

  if changed then
    perform public._bump(p_league_id);
  end if;
end;
$$;

create or replace function public.sync_all_leagues()
returns void
language plpgsql security definer set search_path = ''
as $$
declare lid uuid;
begin
  for lid in select id from public.leagues where status = 'active' loop
    perform public.sync_league(lid);
  end loop;
end;
$$;

create or replace function public._require_member(p_league_id uuid)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not public.is_member(p_league_id) then
    raise exception 'You are not in this league' using errcode = '42501';
  end if;
end;
$$;

create or replace function public._require_commissioner(p_league_id uuid)
returns public.leagues
language plpgsql security definer set search_path = ''
as $$
declare l public.leagues%rowtype;
begin
  select * into l from public.leagues where id = p_league_id for update;
  if not found or l.commissioner_id is distinct from auth.uid() then
    raise exception 'Only the commissioner can do that' using errcode = '42501';
  end if;
  return l;
end;
$$;

create or replace function public._valid_avatar(p_avatar text)
returns boolean
language sql immutable
as $$
  select p_avatar in ('detective','wizard','astronaut','robot','ghost','alien','cowboy','vampire',
                      'ninja','pirate','hero','scientist','explorer','knight','monster','star',
                      'rager','lizard','cyborg','guardian');
$$;

-- ---------------------------------------------------------------------------
-- League setup (commissioner)
-- ---------------------------------------------------------------------------

create or replace function public.create_league(
  p_name text,
  p_display_name text,
  p_avatar text,
  p_vote_budget int default 20,
  p_submission_days int default 5,
  p_voting_days int default 5
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if not public._valid_avatar(p_avatar) then
    raise exception 'Unknown avatar';
  end if;
  insert into public.leagues (name, commissioner_id, vote_budget, submission_days, voting_days)
    values (btrim(p_name), auth.uid(), p_vote_budget, p_submission_days, p_voting_days)
    returning id into new_id;
  insert into public.league_members (league_id, user_id, display_name, avatar)
    values (new_id, auth.uid(), btrim(p_display_name), p_avatar);
  return new_id;
end;
$$;

create or replace function public.update_league_settings(
  p_league_id uuid,
  p_name text,
  p_vote_budget int,
  p_submission_days int,
  p_voting_days int
) returns void
language plpgsql security definer set search_path = ''
as $$
declare l public.leagues%rowtype;
begin
  l := public._require_commissioner(p_league_id);
  if l.status <> 'setup' then
    raise exception 'Settings are locked once the season starts';
  end if;
  update public.leagues
    set name = btrim(p_name), vote_budget = p_vote_budget,
        submission_days = p_submission_days, voting_days = p_voting_days,
        version = version + 1
    where id = p_league_id;
end;
$$;

-- Replace the whole season queue: p_rounds = [{"theme": "...", "description": "..."}, ...]
create or replace function public.set_season_queue(p_league_id uuid, p_rounds jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare l public.leagues%rowtype;
begin
  l := public._require_commissioner(p_league_id);
  if l.status <> 'setup' then
    raise exception 'The queue is locked once the season starts';
  end if;
  if jsonb_typeof(p_rounds) <> 'array' or jsonb_array_length(p_rounds) > 52 then
    raise exception 'Rounds must be a list of at most 52 themes';
  end if;
  delete from public.rounds where league_id = p_league_id;
  insert into public.rounds (league_id, position, theme, description)
    select p_league_id, e.ord::int, btrim(e.val->>'theme'), nullif(btrim(e.val->>'description'), '')
    from jsonb_array_elements(p_rounds) with ordinality as e(val, ord);
  perform public._bump(p_league_id);
end;
$$;

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
  if (select count(*) from public.league_members where league_id = p_league_id) < 2 then
    raise exception 'You need at least 2 players to start';
  end if;
  update public.leagues set status = 'active', started_at = now() where id = p_league_id;
  perform public.sync_league(p_league_id);  -- opens round 1
end;
$$;

-- ---------------------------------------------------------------------------
-- Joining and profile
-- ---------------------------------------------------------------------------

create or replace function public.preview_invite(p_invite_code text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'league_id', l.id,
    'name', l.name,
    'status', l.status,
    'member_count', (select count(*) from public.league_members m where m.league_id = l.id),
    'taken_avatars', (select coalesce(jsonb_agg(m.avatar), '[]') from public.league_members m where m.league_id = l.id),
    'already_member', exists (select 1 from public.league_members m where m.league_id = l.id and m.user_id = auth.uid())
  )
  from public.leagues l
  where l.invite_code = upper(btrim(p_invite_code));
$$;

create or replace function public.join_league(p_invite_code text, p_display_name text, p_avatar text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare l public.leagues%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select * into l from public.leagues where invite_code = upper(btrim(p_invite_code));
  if not found then
    raise exception 'That invite code does not match a league';
  end if;
  if exists (select 1 from public.league_members where league_id = l.id and user_id = auth.uid()) then
    return l.id;
  end if;
  if l.status = 'complete' then
    raise exception 'This league''s season is over';
  end if;
  if not public._valid_avatar(p_avatar) then
    raise exception 'Unknown avatar';
  end if;
  insert into public.league_members (league_id, user_id, display_name, avatar)
    values (l.id, auth.uid(), btrim(p_display_name), p_avatar);
  perform public._bump(l.id);
  return l.id;
end;
$$;

create or replace function public.update_my_member(p_league_id uuid, p_display_name text, p_avatar text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public._require_member(p_league_id);
  if not public._valid_avatar(p_avatar) then
    raise exception 'Unknown avatar';
  end if;
  update public.league_members
    set display_name = btrim(p_display_name), avatar = p_avatar
    where league_id = p_league_id and user_id = auth.uid();
  perform public._bump(p_league_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Gameplay
-- ---------------------------------------------------------------------------

-- Submit or change your pick. Changes are allowed until everyone has submitted
-- (at which point the round moves to voting) or the deadline passes.
create or replace function public.submit_pick(
  p_round_id uuid,
  p_tmdb_id int,
  p_title text,
  p_release_year int default null,
  p_poster_path text default null,
  p_note text default null
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
  if exists (select 1 from public.submissions
             where round_id = r.id and tmdb_id = p_tmdb_id and user_id <> auth.uid()) then
    raise exception 'Someone already picked that movie this round';
  end if;

  insert into public.submissions (round_id, user_id, tmdb_id, title, release_year, poster_path, note)
    values (r.id, auth.uid(), p_tmdb_id, btrim(p_title), p_release_year, p_poster_path, nullif(btrim(p_note), ''))
  on conflict (round_id, user_id) do update
    set tmdb_id = excluded.tmdb_id, title = excluded.title, release_year = excluded.release_year,
        poster_path = excluded.poster_path, note = excluded.note, updated_at = now();

  perform public._bump(r.league_id);
  perform public.sync_league(r.league_id);
end;
$$;

-- Lock in votes. p_votes = [{"submission_id": "...", "points": 5, "comment": "..."}, ...]
-- Points must add up to exactly the league's vote budget. Locked ballots are final.
create or replace function public.cast_votes(p_round_id uuid, p_votes jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r      public.rounds%rowtype;
  budget int;
  total  int;
begin
  select * into r from public.rounds where id = p_round_id;
  if not found then
    raise exception 'Round not found';
  end if;
  perform public._require_member(r.league_id);
  perform public.sync_league(r.league_id);
  select * into r from public.rounds where id = p_round_id;
  if r.status <> 'voting' then
    raise exception 'Voting is closed for this round';
  end if;
  if auth.uid() not in (select public._round_voters(r.id)) then
    raise exception 'You''re not a voter in this round';
  end if;
  if exists (select 1 from public.ballots where round_id = r.id and user_id = auth.uid()) then
    raise exception 'You''ve already locked in your votes';
  end if;
  if jsonb_typeof(p_votes) <> 'array' then
    raise exception 'Votes must be a list';
  end if;

  create temp table _v on commit drop as
    select (e->>'submission_id')::uuid as submission_id,
           coalesce((e->>'points')::int, 0) as points,
           nullif(btrim(e->>'comment'), '') as comment
    from jsonb_array_elements(p_votes) e;

  if exists (select 1 from _v where points < 0) then
    raise exception 'Points can''t be negative';
  end if;
  if (select count(*) from _v) <> (select count(distinct submission_id) from _v) then
    raise exception 'Each pick can only appear once';
  end if;
  if exists (select 1 from _v left join public.submissions s
               on s.id = _v.submission_id and s.round_id = r.id
             where s.id is null) then
    raise exception 'A vote refers to a pick that isn''t in this round';
  end if;
  if exists (select 1 from _v join public.submissions s on s.id = _v.submission_id
             where s.user_id = auth.uid() and (_v.points > 0 or _v.comment is not null)) then
    raise exception 'You can''t vote for your own pick';
  end if;

  select vote_budget into budget from public.leagues where id = r.league_id;
  select coalesce(sum(points), 0) into total from _v;
  if total <> budget then
    raise exception 'Use exactly % points (you used %)', budget, total;
  end if;

  insert into public.votes (round_id, voter_id, submission_id, points, comment)
    select r.id, auth.uid(), submission_id, points, comment
    from _v where points > 0 or comment is not null;
  insert into public.ballots (round_id, user_id) values (r.id, auth.uid());

  drop table _v;
  perform public._bump(r.league_id);
  perform public.sync_league(r.league_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Per-viewer snapshot of everything the UI needs
-- ---------------------------------------------------------------------------

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
                 'note', s.note, 'is_mine', s.user_id = me)
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
                   'release_year', s.release_year, 'poster_path', s.poster_path, 'note', s.note,
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

-- Leagues the signed-in user belongs to, for the home screen.
create or replace function public.my_leagues()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', l.id, 'name', l.name, 'status', l.status,
           'is_commissioner', l.commissioner_id = auth.uid(),
           'member_count', (select count(*) from public.league_members x where x.league_id = l.id),
           'live_round', (select jsonb_build_object('theme', r.theme, 'status', r.status,
                                   'deadline', coalesce(r.voting_deadline, r.submission_deadline))
                          from public.rounds r
                          where r.league_id = l.id and r.status in ('submitting', 'voting')))
         order by l.created_at desc), '[]')
  from public.leagues l
  join public.league_members m on m.league_id = l.id and m.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_member(uuid),
  public.create_league(text, text, text, int, int, int),
  public.update_league_settings(uuid, text, int, int, int),
  public.set_season_queue(uuid, jsonb),
  public.start_season(uuid),
  public.preview_invite(text),
  public.join_league(text, text, text),
  public.update_my_member(uuid, text, text),
  public.submit_pick(uuid, int, text, int, text, text),
  public.cast_votes(uuid, jsonb),
  public.get_league_state(uuid),
  public.my_leagues()
to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: clients refetch get_league_state when leagues.version changes,
-- and receive chat messages directly. Both respect the RLS policies above.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.leagues, public.chat_messages;
  end if;
end $$;
