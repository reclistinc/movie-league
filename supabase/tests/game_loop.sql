-- End-to-end test of the game loop. Run with:  npm run test:db  (see README)
\set ON_ERROR_STOP on
\set QUIET on

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),  -- Ana (commissioner)
  ('00000000-0000-0000-0000-00000000000b'),  -- Ben
  ('00000000-0000-0000-0000-00000000000c'),  -- Cy
  ('00000000-0000-0000-0000-00000000000d'),  -- Dee (outsider, joins late)
  ('00000000-0000-0000-0000-00000000000e');  -- Eve (never joins)

create function pg_temp.as_user(c char) returns void language sql as
  $$ select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || c, false) $$;

create function pg_temp.expect_error(stmt text, fragment text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if position(fragment in sqlerrm) = 0 then
      raise exception 'Expected error containing "%" but got "%"', fragment, sqlerrm;
    end if;
    return;
  end;
  raise exception 'Expected error containing "%" but statement succeeded: %', fragment, stmt;
end $$;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

set role authenticated;

-- ---- Setup ---------------------------------------------------------------
select pg_temp.as_user('a');
select public.create_league('Friday Flicks', 'Ana', 'detective', 20, 5, 5) as lid \gset
select pg_temp.check((select count(*) = 1 from public.leagues), 'commissioner sees own league');

select public.set_season_queue(:'lid', '[{"theme":"Best heist"},{"theme":"90s comfort watch","description":"cozy"}]');
select pg_temp.check((select count(*) = 2 from public.rounds where league_id = :'lid'), 'queue saved');
select pg_temp.expect_error(format('select public.start_season(%L)', :'lid'), 'at least 3 players');

select invite_code as code from public.leagues where id = :'lid' \gset

select pg_temp.as_user('e');
select pg_temp.check((select count(*) = 0 from public.leagues), 'non-member cannot read league');
select pg_temp.expect_error(format('select public.get_league_state(%L)', :'lid'), 'not in this league');
select pg_temp.check((public.preview_invite(:'code')->>'name') = 'Friday Flicks', 'invite preview works for outsiders');
select pg_temp.expect_error(format('select public.set_season_queue(%L, %L)', :'lid', '[]'), 'Only the commissioner');

select pg_temp.as_user('b');  select public.join_league(lower(:'code'), 'Ben', 'wizard');
select pg_temp.as_user('a');  select pg_temp.expect_error(format('select public.start_season(%L)', :'lid'), 'at least 3 players');
select pg_temp.as_user('c');  select public.join_league(:'code', 'Cy', 'robot');
select pg_temp.expect_error(format('select public.start_season(%L)', :'lid'), 'Only the commissioner');
select pg_temp.check(public.join_league(:'code', 'Cy', 'robot') = :'lid'::uuid, 'joining twice is harmless');

select pg_temp.as_user('a');
select public.start_season(:'lid');
select pg_temp.expect_error(format('select public.set_season_queue(%L, %L)', :'lid', '[{"theme":"x"}]'), 'locked');
select pg_temp.expect_error(format('select public.update_league_settings(%L, %L, 10, 5, 5)', :'lid', 'X'), 'locked');

select id as r1 from public.rounds where league_id = :'lid' and position = 1 \gset
select id as r2 from public.rounds where league_id = :'lid' and position = 2 \gset
select pg_temp.check((select status = 'submitting' from public.rounds where id = :'r1'), 'round 1 opens on start');

-- Dee joins mid-round: participates from next round.
select pg_temp.as_user('d');  select public.join_league(:'code', 'Dee', 'ghost');
select pg_temp.expect_error(format('select public.submit_pick(%L, 1, %L)', :'r1', 'Heat'), 'next round');

-- ---- Submissions ---------------------------------------------------------
select pg_temp.as_user('a');  select public.submit_pick(:'r1', 949, 'Heat', 1995, '/heat.jpg', 'classic');
select pg_temp.as_user('b');
select pg_temp.expect_error(format('select public.submit_pick(%L, 949, %L)', :'r1', 'Heat'), 'already picked');
select public.submit_pick(:'r1', 161, 'Ocean''s Eleven', 2001);
select public.submit_pick(:'r1', 1422, 'The Departed', 2006);  -- change of pick allowed
select pg_temp.check((public.get_league_state(:'lid')->'current'->'my_submission'->>'title') = 'The Departed', 'changed submission');
select pg_temp.check((select count(*) = 0 from information_schema.table_privileges
                      where grantee = 'authenticated' and table_name in ('submissions','votes','ballots')),
                     'no direct table access to picks or votes');
select pg_temp.check((public.get_league_state(:'lid')->'current'->'submissions') = 'null', 'picks hidden during submission phase');
select pg_temp.check(jsonb_array_length(public.get_league_state(:'lid')->'rounds'->0->'submitted_ids') = 2, 'who-has-submitted is visible');

select pg_temp.expect_error(format('select public.submit_pick(%L, 107, %L, 2000, null, null, %L)', :'r1', 'Snatch', 'https://evil.example/x.gif'), 'GIPHY');
select pg_temp.as_user('c');
select pg_temp.expect_error(format('select public.submit_pick(%L, 107, %L, 2000, null, null, null, %L)', :'r1', 'Snatch', 'not a key'), 'can''t be attached');
select public.submit_pick(:'r1', 107, 'Snatch', 2000, null, null, 'https://media1.giphy.com/media/abc/giphy.gif', 'dQw4w9WgXcQ', 'Official Trailer', 'Trailer');
select pg_temp.check((select status = 'voting' from public.rounds where id = :'r1'), 'auto-advance to voting once all submitted');
select pg_temp.as_user('a');
select pg_temp.expect_error(format('select public.submit_pick(%L, 5, %L)', :'r1', 'X'), 'closed');

-- ---- Voting --------------------------------------------------------------
select public.get_league_state(:'lid') as st \gset
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'current'->'submissions') = 3, 'voters see all picks');
select pg_temp.check(not ((:'st'::jsonb)->'current'->'submissions'->0 ? 'user_id'), 'picks are anonymous during voting');
select pg_temp.check(exists (select 1 from jsonb_array_elements((:'st'::jsonb)->'current'->'submissions') e where e->>'gif_url' like 'https://media1.giphy.com/%'), 'GIF visible during voting');
select pg_temp.check(exists (select 1 from jsonb_array_elements((:'st'::jsonb)->'current'->'submissions') e where e->>'video_key' = 'dQw4w9WgXcQ' and e->>'video_type' = 'Trailer'), 'chosen video visible during voting');
select pg_temp.check(((:'st'::jsonb)->'current'->'live_totals') = 'null', 'totals hidden before locking in');

select id as s_a from public.get_league_state(:'lid') x, jsonb_to_recordset(x->'current'->'submissions') as t(id uuid, title text) where title = 'Heat' \gset
select id as s_b from public.get_league_state(:'lid') x, jsonb_to_recordset(x->'current'->'submissions') as t(id uuid, title text) where title = 'The Departed' \gset
select id as s_c from public.get_league_state(:'lid') x, jsonb_to_recordset(x->'current'->'submissions') as t(id uuid, title text) where title = 'Snatch' \gset

select pg_temp.expect_error(format('select public.cast_votes(%L, %L)', :'r1',
  jsonb_build_array(jsonb_build_object('submission_id', :'s_a', 'points', 5), jsonb_build_object('submission_id', :'s_b', 'points', 15))), 'own pick');
select pg_temp.expect_error(format('select public.cast_votes(%L, %L)', :'r1',
  jsonb_build_array(jsonb_build_object('submission_id', :'s_b', 'points', 5))), 'exactly 20');
select public.cast_votes(:'r1', jsonb_build_array(
  jsonb_build_object('submission_id', :'s_b', 'points', 12, 'comment', 'great'),
  jsonb_build_object('submission_id', :'s_c', 'points', 8)));
select pg_temp.expect_error(format('select public.cast_votes(%L, %L)', :'r1',
  jsonb_build_array(jsonb_build_object('submission_id', :'s_b', 'points', 20))), 'already locked');
select pg_temp.check(jsonb_array_length(public.get_league_state(:'lid')->'current'->'live_totals') = 3, 'totals revealed after locking in');
select pg_temp.check((select status = 'voting' from public.rounds where id = :'r1'), 'still voting while others pending');

select pg_temp.as_user('b');
select pg_temp.check((public.get_league_state(:'lid')->'current'->'live_totals') = 'null', 'other voters still cannot see totals');
select public.cast_votes(:'r1', jsonb_build_array(
  jsonb_build_object('submission_id', :'s_a', 'points', 10),
  jsonb_build_object('submission_id', :'s_c', 'points', 10, 'comment', 'fun')));

select pg_temp.as_user('c');
select public.cast_votes(:'r1', jsonb_build_array(
  jsonb_build_object('submission_id', :'s_a', 'points', 20)));

select pg_temp.check((select status = 'complete' from public.rounds where id = :'r1'), 'auto-reveal when all votes locked');
select pg_temp.check((select status = 'submitting' from public.rounds where id = :'r2'), 'next round opens automatically');

select public.get_league_state(:'lid') as st \gset
select pg_temp.check(((:'st'::jsonb)->'results'->(:'r1')->0->>'title') = 'Heat'
                 and ((:'st'::jsonb)->'results'->(:'r1')->0->>'points')::int = 30, 'results ranked with totals');
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'results'->(:'r1')->0->'votes') = 2, 'vote breakdown visible after round');
select pg_temp.check(exists (select 1 from jsonb_array_elements((:'st'::jsonb)->'results'->(:'r1')) e where e->>'video_key' = 'dQw4w9WgXcQ'), 'chosen video kept in results');
select pg_temp.check(((:'st'::jsonb)->'standings'->0->>'user_id') like '%a'
                 and ((:'st'::jsonb)->'standings'->0->>'round_wins')::int = 1, 'standings computed');
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'rounds'->1->'participant_ids') = 4, 'late joiner participates in round 2');

-- ---- Deadlines -----------------------------------------------------------
-- no repeat picks for the same player within a league (a picked Heat in round 1)
select pg_temp.as_user('a');
select pg_temp.expect_error(format('select public.submit_pick(%L, 949, %L)', :'r2', 'Heat'), 'already picked that movie in round 1');
select pg_temp.as_user('d');  select public.submit_pick(:'r2', 949, 'Heat', 1995);  -- someone else's old pick is fine
select pg_temp.as_user('d');  select public.submit_pick(:'r2', 9377, 'Ferris Bueller''s Day Off', 1986);
select pg_temp.as_user('a');  select public.submit_pick(:'r2', 8587, 'The Lion King', 1994);
reset role;
update public.rounds set submission_deadline = now() - interval '1 minute' where id = :'r2';
set role authenticated;
select public.get_league_state(:'lid') as st \gset
select pg_temp.check((select status = 'voting' from public.rounds where id = :'r2'), 'submission deadline advances to voting');
select pg_temp.as_user('b');
select pg_temp.expect_error(format('select public.cast_votes(%L, %L)', :'r2', '[]'), 'exactly 20');
reset role;
update public.rounds set voting_deadline = now() - interval '1 minute' where id = :'r2';
select public.sync_all_leagues();
set role authenticated;
select pg_temp.check((select status = 'complete' from public.rounds where id = :'r2'), 'voting deadline completes round');
select pg_temp.check((select status = 'complete' from public.leagues where id = :'lid'), 'season completes after last round');
select pg_temp.as_user('e');
select pg_temp.expect_error(format('select public.join_league(%L, %L, %L)', :'code', 'Eve', 'star'), 'season is over');
select pg_temp.as_user('a');

-- ---- Chat ----------------------------------------------------------------
insert into public.chat_messages (league_id, body) values (:'lid', 'gg everyone');
select pg_temp.as_user('e');
select pg_temp.expect_error(format('insert into public.chat_messages (league_id, body) values (%L, %L)', :'lid', 'hi'), 'row-level security');
select pg_temp.check((select count(*) = 0 from public.chat_messages), 'outsiders cannot read chat');

reset role;
\echo 'ALL TESTS PASSED'
