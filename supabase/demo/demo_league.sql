-- Movie League — DEMO LEAGUE + PRETEND PLAYERS (for solo testing)
--
-- Run this whole file once in Supabase → SQL Editor. It only creates helper functions;
-- nothing changes until you call them. They can't be called from the app — only from
-- the SQL Editor.
--
--   1) Create a demo league that you're in (use the email you sign into the app with):
--        select public.demo_create_league('you@example.com');
--
--   2) Make the pretend players take their turn (submit / vote / chat). Run it whenever
--      you want the game to move on — after you've submitted or voted yourself:
--        select public.demo_bots_act();
--
--   3) Remove the demo league and pretend players when you're done:
--        select public.demo_cleanup();
--
-- The four pretend players are accounts with no password that can't sign in.

-- Fixed ids so the helpers can find the pretend players again.
create or replace function public._demo_bots()
returns table (user_id uuid, name text, avatar text)
language sql immutable
as $$
  values
    ('00000000-0000-4000-8000-0000000000b1'::uuid, 'Jordan', 'wizard'),
    ('00000000-0000-4000-8000-0000000000b2'::uuid, 'Sam',    'rager'),
    ('00000000-0000-4000-8000-0000000000b3'::uuid, 'Riley',  'astronaut'),
    ('00000000-0000-4000-8000-0000000000b4'::uuid, 'Alex',   'vampire');
$$;

-- Movies the pretend players pick from in new rounds (real TMDb ids, so backdrops/trailers work).
create or replace function public._demo_pool()
returns table (tmdb_id int, title text, release_year int)
language sql immutable
as $$
  values
    (949, 'Heat', 1995), (27205, 'Inception', 2010), (339403, 'Baby Driver', 2017),
    (500, 'Reservoir Dogs', 1992), (4638, 'Hot Fuzz', 2007), (275, 'Fargo', 1996),
    (329, 'Jurassic Park', 1993), (105, 'Back to the Future', 1985), (137, 'Groundhog Day', 1993),
    (862, 'Toy Story', 1995), (348, 'Alien', 1979), (620, 'Ghostbusters', 1984),
    (680, 'Pulp Fiction', 1994), (808, 'Shrek', 2001), (603, 'The Matrix', 1999),
    (13, 'Forrest Gump', 1994), (562, 'Die Hard', 1988), (37165, 'The Truman Show', 1998);
$$;

create or replace function public._demo_league()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.leagues where name = 'Demo League' and invite_code like 'DEMO%' order by created_at desc limit 1;
$$;

-- One voter spreads the league's budget across everyone else's picks (random, sums exactly).
create or replace function public._demo_cast(p_round uuid, p_voter uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  budget int;
  ids uuid[];
  w float8[];
  total float8 := 0;
  pts int[];
  given int := 0;
  i int;
  comments text[] := array['Great pick', 'Ha, perfect for this theme', 'Never seen it — adding to my list',
                           'Bold choice', 'This one is a classic', 'Was torn between this and mine', 'Chef''s kiss'];
begin
  select l.vote_budget into budget from public.rounds r join public.leagues l on l.id = r.league_id where r.id = p_round;
  select array_agg(id order by random()) into ids from public.submissions where round_id = p_round and user_id <> p_voter;
  if ids is null then return; end if;
  for i in 1 .. array_length(ids, 1) loop
    w[i] := random() ^ 2;               -- skewed, so votes look like real favourites
    total := total + w[i];
  end loop;
  for i in 1 .. array_length(ids, 1) loop
    pts[i] := floor(budget * w[i] / total);
    given := given + pts[i];
  end loop;
  pts[1] := pts[1] + (budget - given); -- put the rounding remainder on one pick
  for i in 1 .. array_length(ids, 1) loop
    if pts[i] > 0 or random() < 0.25 then
      insert into public.votes (round_id, voter_id, submission_id, points, comment)
      values (p_round, p_voter, ids[i], pts[i], case when random() < 0.45 then comments[1 + floor(random() * array_length(comments, 1))::int] end)
      on conflict do nothing;
    end if;
  end loop;
  insert into public.ballots (round_id, user_id) values (p_round, p_voter) on conflict do nothing;
end;
$$;

create or replace function public.demo_create_league(p_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid;
  lid uuid;
  r1 uuid; r2 uuid; r3 uuid;
  b record;
  started timestamptz := now() - interval '14 days';
begin
  select id into me from auth.users where lower(email) = lower(btrim(p_email));
  if me is null then
    raise exception 'No account for %. Sign into the app with that email first.', p_email;
  end if;

  -- Pretend players (no password, can't sign in).
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', d.user_id, 'authenticated', 'authenticated',
         lower(d.name) || '@demo.movieleague.invalid', '', now(), now(), now(),
         '{"provider":"email","providers":["email"]}', jsonb_build_object('demo', true), '', '', '', ''
  from public._demo_bots() d
  on conflict (id) do nothing;

  insert into public.leagues (name, commissioner_id, vote_budget, submission_days, voting_days, invite_code, status, created_at, started_at)
  values ('Demo League', me, 20, 5, 5, 'DEMO' || upper(substr(md5(random()::text), 1, 4)), 'active', started - interval '1 day', started)
  returning id into lid;

  insert into public.league_members (league_id, user_id, display_name, avatar, joined_at)
  select lid, me, coalesce((select display_name from public.league_members where user_id = me order by joined_at desc limit 1), 'You'),
         coalesce((select avatar from public.league_members where user_id = me order by joined_at desc limit 1), 'detective'),
         started - interval '1 day';
  insert into public.league_members (league_id, user_id, display_name, avatar, joined_at)
  select lid, d.user_id, d.name, d.avatar, started - interval '1 day' from public._demo_bots() d;

  -- Season: 2 finished rounds, 1 in voting, 2 queued.
  insert into public.rounds (league_id, position, theme, description, status, submissions_opened_at, submission_deadline,
                             voting_opened_at, voting_deadline, completed_at)
  values
    (lid, 1, 'The Villain Had a Point', 'The bad guy''s plan makes uncomfortable amounts of sense.', 'complete',
       started, started + interval '3 days', started + interval '3 days', started + interval '6 days', started + interval '6 days'),
    (lid, 2, 'Worst Vacation Ever', 'A trip that goes hilariously, catastrophically wrong.', 'complete',
       started + interval '6 days', started + interval '9 days', started + interval '9 days', started + interval '12 days', started + interval '12 days'),
    (lid, 3, 'Everybody''s Lying to Everybody', 'A web of deception nobody can keep straight.', 'voting',
       now() - interval '2 days', now() - interval '1 hour', now() - interval '1 hour', now() + interval '3 days', null),
    (lid, 4, 'A Heist That Was Obviously a Bad Idea', 'The plan has more holes than a heist should.', 'queued', null, null, null, null, null),
    (lid, 5, 'Small Town, Big Secret', 'A quiet place hiding something it really shouldn''t.', 'queued', null, null, null, null, null);
  select id into r1 from public.rounds where league_id = lid and position = 1;
  select id into r2 from public.rounds where league_id = lid and position = 2;
  select id into r3 from public.rounds where league_id = lid and position = 3;

  insert into public.submissions (round_id, user_id, tmdb_id, title, release_year, note, created_at)
  values
    (r1, me,                                      155,    'The Dark Knight', 2008, 'Some men just want to watch the world burn — and honestly?', started),
    (r1, '00000000-0000-4000-8000-0000000000b1', 284054, 'Black Panther', 2018, 'Killmonger wasn''t wrong.', started),
    (r1, '00000000-0000-4000-8000-0000000000b2', 299536, 'Avengers: Infinity War', 2018, 'Thanos had a spreadsheet.', started),
    (r1, '00000000-0000-4000-8000-0000000000b3', 475557, 'Joker', 2019, null, started),
    (r1, '00000000-0000-4000-8000-0000000000b4', 550,    'Fight Club', 1999, 'Rule one: we don''t talk about it.', started),
    (r2, me,                                      11153,  'National Lampoon''s Vacation', 1983, 'The Griswolds. Enough said.', started + interval '6 days'),
    (r2, '00000000-0000-4000-8000-0000000000b1', 694,    'The Shining', 1980, 'Worst. Off-season. Job. Ever.', started + interval '6 days'),
    (r2, '00000000-0000-4000-8000-0000000000b2', 530385, 'Midsommar', 2019, null, started + interval '6 days'),
    (r2, '00000000-0000-4000-8000-0000000000b3', 578,    'Jaws', 1975, 'You''re gonna need a bigger vacation.', started + interval '6 days'),
    (r2, '00000000-0000-4000-8000-0000000000b4', 18785,  'The Hangover', 2009, null, started + interval '6 days'),
    (r3, me,                                      546554, 'Knives Out', 2019, 'Literally everyone is lying.', now() - interval '2 days'),
    (r3, '00000000-0000-4000-8000-0000000000b1', 210577, 'Gone Girl', 2014, null, now() - interval '2 days'),
    (r3, '00000000-0000-4000-8000-0000000000b2', 629,    'The Usual Suspects', 1995, 'Keyser Söze says hi.', now() - interval '2 days'),
    (r3, '00000000-0000-4000-8000-0000000000b3', 161,    'Ocean''s Eleven', 2001, null, now() - interval '2 days'),
    (r3, '00000000-0000-4000-8000-0000000000b4', 10625,  'Mean Girls', 2004, 'On Wednesdays we lie.', now() - interval '2 days');

  -- Everyone voted in rounds 1–2 (you included, randomly); two players already voted in round 3.
  perform public._demo_cast(r1, m.user_id) from public.league_members m where m.league_id = lid;
  perform public._demo_cast(r2, m.user_id) from public.league_members m where m.league_id = lid;
  perform public._demo_cast(r3, d.user_id) from public._demo_bots() d where d.name in ('Jordan', 'Sam');

  insert into public.chat_messages (league_id, user_id, body, created_at)
  values
    (lid, '00000000-0000-4000-8000-0000000000b1', 'Who picked Fight Club for the villain round 😂', started + interval '6 days 1 hour'),
    (lid, '00000000-0000-4000-8000-0000000000b2', 'Thanos deserved better.', started + interval '6 days 2 hours'),
    (lid, me,                                      'The Dark Knight robbed!!', started + interval '6 days 3 hours'),
    (lid, '00000000-0000-4000-8000-0000000000b4', 'Vacation round was elite', started + interval '12 days 1 hour'),
    (lid, '00000000-0000-4000-8000-0000000000b3', 'Voting is open — go go go', now() - interval '50 minutes');

  update public.leagues set version = version + 1 where id = lid;
  return 'Demo League created — open the app and look for it on your home screen.';
end;
$$;

create or replace function public.demo_bots_act()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  lid uuid := public._demo_league();
  r public.rounds%rowtype;
  d record;
  pick record;
  n int := 0;
  lines text[] := array['Locked in 🔒', 'This round is tough', 'My pick is going to win, calling it now',
                        'Whoever picked the last one… respect', 'Can''t wait for results', 'Popcorn ready 🍿'];
begin
  if lid is null then
    return 'No demo league. Run: select public.demo_create_league(''you@example.com'');';
  end if;
  perform public.sync_league(lid);
  select * into r from public.rounds where league_id = lid and status in ('submitting', 'voting');
  if not found then
    return 'The demo season is over. Run demo_cleanup() and demo_create_league() to start again.';
  end if;

  if r.status = 'submitting' then
    for d in select * from public._demo_bots() b
             where b.user_id in (select public._round_participants(r.id))
               and not exists (select 1 from public.submissions s where s.round_id = r.id and s.user_id = b.user_id) loop
      select p.* into pick from public._demo_pool() p
      where not exists (select 1 from public.submissions s where s.round_id = r.id and s.tmdb_id = p.tmdb_id)
      order by random() limit 1;
      insert into public.submissions (round_id, user_id, tmdb_id, title, release_year, note)
      values (r.id, d.user_id, pick.tmdb_id, pick.title, pick.release_year,
              case when random() < 0.5 then 'Trust me on this one.' end);
      n := n + 1;
    end loop;
  else
    for d in select * from public._demo_bots() b
             where b.user_id in (select public._round_voters(r.id))
               and not exists (select 1 from public.ballots x where x.round_id = r.id and x.user_id = b.user_id) loop
      perform public._demo_cast(r.id, d.user_id);
      n := n + 1;
    end loop;
  end if;

  insert into public.chat_messages (league_id, user_id, body)
  select lid, b.user_id, lines[1 + floor(random() * array_length(lines, 1))::int]
  from public._demo_bots() b order by random() limit 1;

  update public.leagues set version = version + 1 where id = lid;
  perform public.sync_league(lid);
  select * into r from public.rounds where id = r.id;
  return format('%s pretend player(s) took their turn. Round "%s" is now: %s.%s', n, r.theme, r.status,
    case r.status
      when 'submitting' then ' Waiting on your pick.'
      when 'voting' then ' Waiting on your votes.'
      else ' Results are in — the next round has opened.' end);
end;
$$;

create or replace function public.demo_cleanup()
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.leagues where name = 'Demo League' and invite_code like 'DEMO%';
  delete from auth.users where id in (select user_id from public._demo_bots());
  return 'Demo league and pretend players removed.';
end;
$$;

-- Only callable from the SQL Editor (as the database owner), never from the app.
revoke execute on function public._demo_bots(), public._demo_pool(), public._demo_league(),
  public._demo_cast(uuid, uuid), public.demo_create_league(text), public.demo_bots_act(), public.demo_cleanup()
  from public, anon, authenticated;
