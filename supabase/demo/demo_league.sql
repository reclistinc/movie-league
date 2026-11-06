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
--   3) Skip to the end: a finished league with random rounds, picks, votes and a random
--      champion. Optionally force which avatar wins, or make one for every avatar:
--        select public.demo_champion_league('you@example.com');              -- random champion
--        select public.demo_champion_league('you@example.com', 'wizard');    -- the Wizard wins
--        select public.demo_champion_all('you@example.com');                 -- 20 leagues, one per avatar
--      demo_champion_all makes leagues of every shape: one with 20 players, one with 2, a 22-round
--      marathon, a very chatty one, and random ones in between. Pretend players turn up in several
--      leagues (a few in just one), and each has their own Seen / Watchlist habits.
--
--   4) Remove all demo leagues and pretend players when you're done:
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
    (13, 'Forrest Gump', 1994), (562, 'Die Hard', 1988), (37165, 'The Truman Show', 1998),
    (278, 'The Shawshank Redemption', 1994),
    (238, 'The Godfather', 1972),
    (424, 'Schindler''s List', 1993),
    (120, 'The Lord of the Rings: The Fellowship of the Ring', 2001),
    (11, 'Star Wars', 1977),
    (1891, 'The Empire Strikes Back', 1980),
    (85, 'Raiders of the Lost Ark', 1981),
    (597, 'Titanic', 1997),
    (157336, 'Interstellar', 2014),
    (24428, 'The Avengers', 2012),
    (12, 'Finding Nemo', 2003),
    (585, 'Monsters, Inc.', 2001),
    (9806, 'The Incredibles', 2004),
    (2062, 'Ratatouille', 2007),
    (10681, 'WALL·E', 2008),
    (14160, 'Up', 2009),
    (8587, 'The Lion King', 1994),
    (807, 'Se7en', 1995),
    (274, 'The Silence of the Lambs', 1991),
    (769, 'GoodFellas', 1990),
    (77, 'Memento', 2000),
    (1124, 'The Prestige', 2006),
    (98, 'Gladiator', 2000),
    (1726, 'Iron Man', 2008),
    (76341, 'Mad Max: Fury Road', 2015),
    (78, 'Blade Runner', 1982),
    (679, 'Aliens', 1986),
    (280, 'Terminator 2: Judgment Day', 1991),
    (9377, 'Ferris Bueller''s Day Off', 1986),
    (2108, 'The Breakfast Club', 1985),
    (6977, 'No Country for Old Men', 2007),
    (115, 'The Big Lebowski', 1998),
    (747, 'Shaun of the Dead', 2004),
    (496243, 'Parasite', 2019),
    (419430, 'Get Out', 2017),
    (120467, 'The Grand Budapest Hotel', 2014),
    (313369, 'La La Land', 2016),
    (244786, 'Whiplash', 2014),
    (37799, 'The Social Network', 2010),
    (62, '2001: A Space Odyssey', 1968),
    (539, 'Psycho', 1960),
    (16869, 'Inglourious Basterds', 2009),
    (68718, 'Django Unchained', 2012),
    (272, 'Batman Begins', 2005),
    (671, 'Harry Potter and the Philosopher''s Stone', 2001),
    (129, 'Spirited Away', 2001),
    (8392, 'My Neighbor Totoro', 1988),
    (194, 'Amélie', 2001),
    (550, 'Fight Club', 1999),
    (578, 'Jaws', 1975),
    (694, 'The Shining', 1980),
    (161, 'Ocean''s Eleven', 2001),
    (546554, 'Knives Out', 2019),
    (18785, 'The Hangover', 2009),
    (10625, 'Mean Girls', 2004);
$$;

create or replace function public._demo_league()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.leagues where name = 'Demo League' and invite_code like 'DEMO%' order by created_at desc limit 1;
$$;

-- One voter spreads the league's budget across everyone else's picks (random, sums exactly).
drop function if exists public._demo_cast(uuid, uuid);
create or replace function public._demo_cast(p_round uuid, p_voter uuid, p_comment_rate float8 default 0.45)
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
  h bigint;
  seen_p float8;
  want_p float8;
  comments text[] := array['Great pick', 'Ha, perfect for this theme', 'Never seen it — adding to my list',
                           'Bold choice', 'This one is a classic', 'Was torn between this and mine', 'Chef''s kiss',
                           'How did I not think of this', 'Controversial, but I respect it', 'Took me a second, then YES',
                           'Underrated pick', 'Not sure this fits but I love it', 'The ending still haunts me',
                           'Instant rewatch', 'Points for nostalgia', 'This is the one to beat', 'Saw this on a first date lol',
                           'Respectfully, no', 'The soundtrack alone', 'Somebody had to pick it'];
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
      values (p_round, p_voter, ids[i], pts[i],
              case when random() < p_comment_rate then comments[1 + floor(random() * array_length(comments, 1))::int] end)
      on conflict do nothing;
    end if;
  end loop;
  insert into public.ballots (round_id, user_id) values (p_round, p_voter) on conflict do nothing;

  -- Pretend players mark movies Seen / Watchlist, each with their own habits (some never do).
  -- Never you — your marks are yours.
  if p_voter in (select user_id from public._demo_roster()) then
    h := ('x' || substr(md5(p_voter::text), 1, 8))::bit(32)::int::bigint;
    h := abs(h);
    if h % 6 <> 0 then
      seen_p := (h % 97) / 100.0;          -- 0 – 96% of movies seen
      want_p := ((h / 97) % 45) / 100.0;   -- 0 – 44% go on the watchlist
      insert into public.watch_status (user_id, tmdb_id, status)
      select p_voter, s.tmdb_id, case when x.r < seen_p then 'seen' else 'want' end
      from public.submissions s cross join lateral (select random() as r) x
      where s.round_id = p_round and s.user_id <> p_voter and x.r < seen_p + want_p
      on conflict (user_id, tmdb_id) do nothing;
    end if;
  end if;
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
  perform public._snapshot_round(r1);
  perform public._snapshot_round(r2);
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
        and not exists (select 1 from public.submissions s join public.rounds rr on rr.id = s.round_id
                        where rr.league_id = r.league_id and s.user_id = d.user_id and s.tmdb_id = p.tmdb_id)
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
  delete from public.leagues where invite_code like 'DEMO%';
  delete from auth.users where id in (select user_id from public._demo_roster());
  return 'All demo leagues and pretend players removed.';
end;
$$;

create or replace function public._demo_themes()
returns table (title text, summary text)
language sql immutable
as $$
  values
    ('Worst Vacation Ever', 'A trip that goes hilariously, catastrophically wrong.'),
    ('A Meal You''d Regret Ordering', 'Something edible plays a bigger role than it should.'),
    ('The Villain Had a Point', 'The bad guy''s plan makes uncomfortable amounts of sense.'),
    ('One-Star Yelp Review Energy', 'A place, person, or event that deserved harsh feedback.'),
    ('Everyone''s in Way Over Their Head', 'Nobody involved is remotely qualified for the situation.'),
    ('This Would Never Fly at HR', 'Workplace behavior that should''ve triggered an investigation.'),
    ('A Group Chat Waiting to Implode', 'An ensemble one bad text away from disaster.'),
    ('Weather Ruins Everything', 'Mother Nature is basically a supporting cast member.'),
    ('Should Have Read the Fine Print', 'A deal, contract, or wish goes badly sideways.'),
    ('A Pet That''s Smarter Than the Owner', 'An animal quietly running the show.'),
    ('Peak Sibling Rivalry', 'Family competition escalates way past reasonable.'),
    ('The Reunion Nobody Wanted', 'Old faces come back at the worst possible time.'),
    ('A Plan That Was Doomed From Minute One', 'You can see the disaster coming from the opening scene.'),
    ('Small Town, Big Secret', 'A quiet place hiding something it really shouldn''t.'),
    ('This Job Interview Went Poorly', 'Someone''s professional life takes a hard left turn.'),
    ('A Road Trip That Should''ve Stayed a Plan', 'The journey is the whole problem.'),
    ('Everybody''s Lying to Everybody', 'A web of deception nobody can keep straight.'),
    ('A Party That Got Wildly Out of Hand', 'One night, way too many consequences.'),
    ('The Neighbor Is Definitely Up to Something', 'Suburbia hides more than lawn care disputes.'),
    ('Somebody Should Not Have Adopted That', 'A creature that was a terrible idea to bring home.'),
    ('A Wedding Held Together by Duct Tape', 'Nothing about this ceremony is going smoothly.'),
    ('The Group Project From Hell', 'Collaboration that should''ve stayed solo.'),
    ('A Disguise That Fools No One', 'A cover story so bad it''s almost impressive.'),
    ('This Escape Room Got Real', 'Getting out is suddenly not optional.'),
    ('A Diet That Went Too Far', 'Someone took ''clean eating'' way past reasonable.'),
    ('The Babysitter Bit Off More Than They Could Chew', 'One evening of childcare spirals completely out of control.'),
    ('A Rivalry Over Something Genuinely Petty', 'Two people at war over almost nothing.'),
    ('Retirement Didn''t Go as Planned', 'Someone''s quiet golden years get interrupted.'),
    ('A Get-Rich-Quick Scheme That Wasn''t', 'The money plan collapses spectacularly.'),
    ('The Worst Possible Time for This to Happen', 'Terrible timing makes an already bad day worse.'),
    ('A Costume That Ruined the Night', 'Wardrobe choices with real consequences.'),
    ('Everyone Underestimated the New Kid', 'The newcomer turns out to be a serious problem.'),
    ('A House That''s Definitely Not Just Creaky', 'Something''s off about this address.'),
    ('The Company Retreat Nobody Survived Emotionally', 'Team building goes horribly, memorably wrong.'),
    ('A Rumor That Snowballed Into Chaos', 'One whisper becomes a full-blown disaster.'),
    ('Grandma Knows More Than She''s Letting On', 'The sweet old relative has secrets.'),
    ('A Heist That Was Obviously a Bad Idea', 'The plan has more holes than a heist should.'),
    ('This Was Supposed to Be a Simple Errand', 'A quick task spirals into an odyssey.'),
    ('The Best Man Speech Went Off the Rails', 'A toast that should never have happened live.'),
    ('A Roommate Situation Gone Very Wrong', 'Shared living turns into shared trauma.'),
    ('The Class Reunion Reveals Too Much', 'Old classmates, way too much unfinished business.'),
    ('A Con Artist Meets Their Match', 'The scammer picked the wrong target this time.'),
    ('Somebody Peaked in High School', 'Glory days that clearly never ended for them.'),
    ('A Family Business That''s a Front for Something', 'The shop downstairs isn''t what it seems.'),
    ('The Fire Drill That Wasn''t a Drill', 'A routine precaution turns urgent fast.'),
    ('A Bet That Escalated Way Too Far', 'A dare nobody should have taken this seriously.'),
    ('The Intern Runs the Whole Place Now', 'Someone junior ends up holding it all together.'),
    ('A Long-Lost Relative Shows Up Uninvited', 'Family history walks through the front door.'),
    ('This Book Club Turned Into Something Else', 'A cozy gathering with an unexpected agenda.'),
    ('The GPS Led Everyone Astray', 'Navigation failure becomes the whole plot.'),
    ('A Talent Show With Way Too Much at Stake', 'The stakes of a school stage are oddly high.'),
    ('Somebody''s Secret Identity Slips', 'A double life starts to crack.'),
    ('The Neighborhood Watch Took It Too Far', 'Community vigilance spirals into obsession.'),
    ('A Cursed Object Nobody Should Have Bought', 'That flea-market find was a mistake.'),
    ('The Office Holiday Party, Unfiltered', 'Workplace boundaries dissolve for one night.'),
    ('A Prank That Went Way Too Far', 'A joke with real, lasting fallout.'),
    ('Somebody''s Ex Shows Up at the Worst Time', 'History reappears at exactly the wrong moment.'),
    ('A Small Lie That Grew Legs', 'One fib spirals into an unmanageable mess.'),
    ('The New Diet Guru Is Hiding Something', 'Wellness culture takes a sinister turn.'),
    ('A Storm Traps Everyone Together', 'The weather forces an unlikely group to bond or clash.'),
    ('This Field Trip Was Not on the Itinerary', 'A school outing goes seriously off script.'),
    ('A Family Recipe With a Dark History', 'That secret ingredient has a backstory.'),
    ('Somebody Faked Their Own Disappearance', 'Vanishing on purpose comes back to bite them.'),
    ('The Support Group Gets Complicated', 'Healing turns messy fast.'),
    ('A Sports Team of Total Misfits', 'Nobody on this roster should logically win.'),
    ('The Landlord Is Genuinely Terrifying', 'Renting this place was a mistake.'),
    ('A Karaoke Night That Changed Everything', 'Singing badly has unexpectedly high stakes.'),
    ('Somebody''s Side Hustle Got Out of Control', 'A little extra income becomes a full crisis.'),
    ('The Babysitting Job Was Actually a Trap', 'This gig was too good to be true.'),
    ('A Small Business Feud Turns Ugly', 'Two shops at war over the same block.'),
    ('The Group Chat Screenshots Someone', 'Digital drama has real-world consequences.'),
    ('A Cruise That Should Have Stayed Docked', 'Vacation at sea, disaster included.'),
    ('Somebody''s Fake ID Backfires Spectacularly', 'A little deception with big fallout.'),
    ('The Summer Camp Counselor Has No Idea What They''re Doing', 'Supervision is more theoretical than actual.'),
    ('A Family Game Night Gets Way Too Competitive', 'Board games bring out everyone''s worst instincts.'),
    ('Somebody Inherited a House With Baggage', 'The will came with strings attached.'),
    ('The Substitute Teacher Isn''t Who They Say They Are', 'Classroom authority hides something odd.'),
    ('A Road Sign Nobody Should Have Ignored', 'The warning was right there the whole time.'),
    ('Somebody''s Wellness Retreat Gets Weird', 'Finding yourself takes an unexpected turn.'),
    ('The Family Dog Knows Something', 'The pet is onto the plot before anyone else.'),
    ('A Blind Date That Should Have Been Cancelled', 'Two strangers, zero chemistry, plenty of chaos.'),
    ('The Company Picnic Turns Into a Turf War', 'Departments clash over sack races and grudges.'),
    ('Somebody''s Garage Sale Sold the Wrong Thing', 'A stray item causes a whole ordeal.'),
    ('The Tour Guide Doesn''t Actually Know the Way', 'Confidence outpaces competence badly.'),
    ('A Family Portrait Session Falls Apart', 'Smiling for the camera was never going to be easy.'),
    ('Somebody''s Side of the Story Doesn''t Add Up', 'The narrator can''t quite be trusted.'),
    ('The Book Report That Ruined Someone''s Week', 'A school assignment with unreasonable stakes.'),
    ('A Wellness App That''s Definitely Watching You', 'Self-improvement with a sinister subscription model.'),
    ('The Family Reunion Softball Game Gets Intense', 'A casual game becomes a blood feud.'),
    ('Somebody''s Emotional Support Animal Causes a Scene', 'A creature that should''ve stayed home.'),
    ('The Open Mic Night No One Will Forget', 'A stage debut that becomes local legend.'),
    ('A Rideshare Driver With a Lot to Say', 'The commute becomes the whole story.'),
    ('Somebody''s New Year''s Resolution Spirals', 'Self-improvement pursued way too intensely.'),
    ('The Cul-de-Sac Has a Pecking Order', 'Suburban status games with real stakes.'),
    ('A Wedding Toast That Says the Quiet Part Loud', 'Someone finally airs the family grievances.'),
    ('The Vending Machine at Work Holds Secrets', 'An unassuming object becomes central to the plot.'),
    ('Somebody''s Improv Class Gets Too Real', 'Acting exercises reveal genuine feelings.'),
    ('The Garden Gnome Situation Escalates', 'A lawn ornament rivalry spirals wildly.'),
    ('A Group Vacation Rental Splits the Friend Group', 'Shared lodging exposes every fault line.'),
    ('Somebody''s Fantasy League Ruins Real Friendships', 'A game gets taken far too seriously.');
$$;

-- Everyone who can show up in the finished-league demos: the 4 regulars plus 30 more.
create or replace function public._demo_roster()
returns table (user_id uuid, name text)
language sql immutable
as $$
  select user_id, name from public._demo_bots()
  union all
  select ('00000000-0000-4000-8000-000000000c' || lpad(i::text, 2, '0'))::uuid, n
  from unnest(array['Morgan','Taylor','Jamie','Quinn','Avery','Drew','Parker','Reese','Skyler','Rowan',
                    'Emerson','Hayden','Blake','Cameron','Dakota','Finley','Harper','Jesse','Kendall','Logan',
                    'Marley','Noel','Oakley','Peyton','Remy','Sage','Tatum','Wren','Ellis','Frankie']) with ordinality as x(n, i);
$$;

create or replace function public._demo_ensure_bots()
returns void
language sql security definer set search_path = ''
as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', d.user_id, 'authenticated', 'authenticated',
         lower(d.name) || '@demo.movieleague.invalid', '', now(), now(), now(),
         '{"provider":"email","providers":["email"]}', jsonb_build_object('demo', true), '', '', '', ''
  from public._demo_roster() d
  on conflict (id) do nothing;
$$;

-- A finished league: random rounds, picks and votes, random champion (or force an avatar to win).
-- Optional: which pretend players (p_bots), how many rounds, a chatty league, and a label for the name.
drop function if exists public.demo_champion_league(text, text);
create or replace function public.demo_champion_league(
  p_email text,
  p_avatar text default null,
  p_bots uuid[] default null,
  p_rounds int default null,
  p_chatty boolean default false,
  p_label text default null
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid;
  lid uuid;
  rid uuid;
  n_rounds int := coalesce(p_rounds, 3 + floor(random() * 6)::int);  -- 3 to 8 rounds unless asked
  started timestamptz := now() - make_interval(days => 6 * coalesce(p_rounds, 8) + 1);
  n int;
  k int;
  chat text[] := array['What a season 🍿', 'Who picked that?? Respect.', 'I''m still mad about last round',
    'This theme is impossible', 'Okay this round is stacked', 'Adding like 5 of these to my watchlist',
    'Never doubt the classics', 'Somebody explain the points on mine 😂', 'Rewatch party when?',
    'That trailer sold me', 'Hot take: the winner was overrated', 'I need a sequel to this league',
    'Called it.', 'My pick deserved better and I''ll die on this hill', 'Can we do a horror round next?',
    'Movie night at my place Friday?', 'Ok who gave mine zero 👀', 'The comments this round 😂',
    'I''ve seen literally none of these', 'Peak cinema only from here on'];
  avatars text[];
  players uuid[];
  names text[];
  i int;
  th record;
  leader uuid;
  holder uuid;
  leader_avatar text;
  mv record;
  pl uuid;
  all_avatars text[] := array['detective','wizard','astronaut','robot','ghost','alien','cowboy','vampire','ninja','pirate',
                              'hero','scientist','explorer','knight','monster','star','rager','lizard','cyborg','guardian'];
begin
  select id into me from auth.users where lower(email) = lower(btrim(p_email));
  if me is null then
    raise exception 'No account for %. Sign into the app with that email first.', p_email;
  end if;
  if p_avatar is not null and not (p_avatar = any (all_avatars)) then
    raise exception 'Unknown avatar %. Use one of: %', p_avatar, array_to_string(all_avatars, ', ');
  end if;
  perform public._demo_ensure_bots();

  if p_bots is null then  -- 2 to 7 random pretend players
    p_bots := array(select user_id from public._demo_roster() order by random() limit 2 + floor(random() * 6)::int);
  end if;
  if array_length(p_bots, 1) is null or array_length(p_bots, 1) > 19 then
    raise exception 'Pick 1 to 19 pretend players (leagues hold 20 including you)';
  end if;
  players := array[me] || p_bots;
  n := array_length(players, 1);
  names := array[coalesce((select display_name from public.league_members where user_id = me order by joined_at desc limit 1), 'You')]
           || array(select r.name from unnest(p_bots) with ordinality b(id, o) join public._demo_roster() r on r.user_id = b.id order by b.o);
  avatars := array(select a from unnest(all_avatars) a order by random() limit n);

  insert into public.leagues (name, commissioner_id, vote_budget, invite_code, status, created_at, started_at, completed_at)
  values ('Champion Demo' || coalesce(' — ' || initcap(p_avatar), '') || coalesce(' · ' || p_label, ''), me, 20,
          'DEMO' || upper(substr(md5(random()::text), 1, 4)), 'active', started - interval '1 day', started, null)
  returning id into lid;

  for i in 1 .. n loop
    insert into public.league_members (league_id, user_id, display_name, avatar, joined_at)
    values (lid, players[i], names[i], avatars[i], started - interval '1 day');
  end loop;

  i := 0;
  for th in select * from public._demo_themes() order by random() limit n_rounds loop
    i := i + 1;
    insert into public.rounds (league_id, position, theme, description, status, submissions_opened_at, submission_deadline,
                               voting_opened_at, voting_deadline, completed_at)
    values (lid, i, th.title, th.summary, 'complete',
            started + make_interval(days => 6 * (i - 1)), started + make_interval(days => 6 * (i - 1) + 3),
            started + make_interval(days => 6 * (i - 1) + 3), started + make_interval(days => 6 * i),
            started + make_interval(days => 6 * i))
    returning id into rid;

    -- Each player picks a movie nobody has this round and they haven't picked before in this league.
    foreach pl in array players loop
      insert into public.submissions (round_id, user_id, tmdb_id, title, release_year, created_at)
      select rid, pl, m.tmdb_id, m.title, m.release_year, started + make_interval(days => 6 * (i - 1))
      from public._demo_pool() m
      where not exists (select 1 from public.submissions s where s.round_id = rid and s.tmdb_id = m.tmdb_id)
        and not exists (select 1 from public.submissions s join public.rounds rr on rr.id = s.round_id
                        where rr.league_id = lid and s.user_id = pl and s.tmdb_id = m.tmdb_id)
      order by random() limit 1;
    end loop;

    perform public._demo_cast(rid, uid, case when p_chatty then 0.9 else 0.35 end) from unnest(players) uid;
    perform public._snapshot_round(rid);
  end loop;

  -- Who won? (same ordering as the app's standings: points, then round wins)
  select s.user_id into leader
  from (
    select sub.user_id, sum(coalesce(v.points, 0)) as pts
    from public.submissions sub join public.rounds r on r.id = sub.round_id and r.league_id = lid
    left join public.votes v on v.submission_id = sub.id
    group by sub.user_id
  ) s order by s.pts desc, random() limit 1;

  -- No ties at the top: move single points from rivals to the leader (same voter, same round,
  -- so every ballot still adds up) until the leader is clear.
  loop
    select v.voter_id, v.submission_id, ls.id into mv
    from public.votes v
    join public.submissions rs on rs.id = v.submission_id
    join public.rounds r on r.id = rs.round_id and r.league_id = lid
    join public.submissions ls on ls.round_id = rs.round_id and ls.user_id = leader
    where v.points > 0 and v.voter_id <> leader
      and rs.user_id in (
        select sub.user_id from public.submissions sub
        join public.rounds rr on rr.id = sub.round_id and rr.league_id = lid
        left join public.votes vv on vv.submission_id = sub.id
        where sub.user_id <> leader group by sub.user_id
        having sum(coalesce(vv.points, 0)) >= (
          select sum(coalesce(v2.points, 0)) from public.submissions s2
          join public.rounds r2 on r2.id = s2.round_id and r2.league_id = lid
          left join public.votes v2 on v2.submission_id = s2.id where s2.user_id = leader))
    order by random() limit 1;
    exit when not found;
    update public.votes set points = points - 1 where voter_id = mv.voter_id and submission_id = mv.submission_id;
    insert into public.votes (round_id, voter_id, submission_id, points)
      select round_id, mv.voter_id, mv.id, 1 from public.submissions where id = mv.id
    on conflict (voter_id, submission_id) do update set points = public.votes.points + 1;
  end loop;

  -- The champion is whoever the app's standings put first (tiebreakers included — a 2-player
  -- league is always level on points).
  select st.user_id into leader from public._league_standings(lid) st where st.place = 1;

  -- Force the champion's avatar if asked (swap with whoever had it).
  if p_avatar is not null then
    select avatar into leader_avatar from public.league_members where league_id = lid and user_id = leader;
    select user_id into holder from public.league_members where league_id = lid and avatar = p_avatar;
    if holder is not null and holder <> leader then
      update public.league_members set avatar = leader_avatar where league_id = lid and user_id = holder;
    end if;
    update public.league_members set avatar = p_avatar where league_id = lid and user_id = leader;
  end if;

  -- Chat spread over the season (lots of it in a chatty league).
  for k in 1 .. case when p_chatty then 60 + floor(random() * 30)::int else 2 + floor(random() * 5)::int end loop
    insert into public.chat_messages (league_id, user_id, body, created_at)
    values (lid, p_bots[1 + floor(random() * array_length(p_bots, 1))::int],
            chat[1 + floor(random() * array_length(chat, 1))::int],
            started + (now() - started) * random());
  end loop;
  insert into public.chat_messages (league_id, user_id, body, created_at)
  values (lid, leader, 'Thank you, thank you 🏆', now() - interval '1 hour');

  update public.leagues set status = 'complete', completed_at = now(), version = version + 1 where id = lid;
  return format('Created "%s" — %s rounds. Champion: %s (%s).',
    (select name from public.leagues where id = lid), n_rounds,
    (select display_name from public.league_members where league_id = lid and user_id = leader),
    (select avatar from public.league_members where league_id = lid and user_id = leader));
end;
$$;

-- One finished league per avatar, each won by that avatar, all shapes and sizes:
--   one with all 20 players, one with just 2, one 22-round marathon, one very chatty,
--   the rest random (3–12 players, 3–8 rounds). Most pretend players turn up in several
--   leagues; a few appear in exactly one.
create or replace function public.demo_champion_all(p_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  avs text[] := array(select a from unnest(array['detective','wizard','astronaut','robot','ghost','alien','cowboy','vampire',
                      'ninja','pirate','hero','scientist','explorer','knight','monster','star','rager','lizard','cyborg','guardian']) a
                      order by random());
  roster uuid[] := array(select user_id from public._demo_roster() order by random());
  oneoffs uuid[];
  regulars uuid[];
  i int;
  bots uuid[];
begin
  oneoffs := roster[1:8];            -- each of these plays in exactly one league
  regulars := roster[9:array_length(roster, 1)];
  for i in 1 .. 20 loop
    bots := case
      when i = 1 then oneoffs[1:1] || array(select r from unnest(regulars) r order by random() limit 18)   -- 20 players
      when i = 2 then oneoffs[2:2]                                                                          -- 2 players
      when i = 3 then oneoffs[3:3] || array(select r from unnest(regulars) r order by random() limit 3)    -- marathon
      when i = 4 then oneoffs[4:4] || array(select r from unnest(regulars) r order by random() limit 6)    -- chatty
      when i <= 8 then oneoffs[i:i] || array(select r from unnest(regulars) r order by random() limit 1 + floor(random() * 9)::int)
      else array(select r from unnest(regulars) r order by random() limit 2 + floor(random() * 10)::int)
    end;
    perform public.demo_champion_league(
      p_email, avs[i], bots,
      case when i = 3 then 22 when i = 1 then 5 end,
      i = 4,
      case i when 1 then '20 players' when 2 then '2 players' when 3 then '22 rounds' when 4 then 'chatty' end);
  end loop;
  return 'Created 20 Champion Demo leagues, one won by each avatar (incl. 20 players, 2 players, 22 rounds, chatty).';
end;
$$;

-- Only callable from the SQL Editor (as the database owner), never from the app.
revoke execute on function public._demo_bots(), public._demo_pool(), public._demo_league(),
  public._demo_cast(uuid, uuid, float8), public.demo_create_league(text), public.demo_bots_act(), public.demo_cleanup(),
  public._demo_themes(), public._demo_roster(), public._demo_ensure_bots(),
  public.demo_champion_league(text, text, uuid[], int, boolean, text), public.demo_champion_all(text)
  from public, anon, authenticated;
