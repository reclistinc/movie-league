-- Commissioner tools: remove_player, end_season, delete_league.
\set ON_ERROR_STOP on
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');

create function pg_temp.as_user(c char) returns void language sql as
  $$ select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000' || c, false) $$;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;
create function pg_temp.expect_error(stmt text, fragment text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then
    if position(fragment in sqlerrm) = 0 then raise exception 'Expected "%" got "%"', fragment, sqlerrm; end if;
    raise notice 'ok - refused: %', fragment; return;
  end;
  raise exception 'Expected error "%"', fragment;
end $$;

set role authenticated;
select pg_temp.as_user('a');
select public.create_league('Gone Soon', 'Ana', 'detective', 20, 5, 5) as lid \gset
select public.set_season_queue(:'lid', '[{"theme":"One"},{"theme":"Two"},{"theme":"Three"}]');
select invite_code as code from public.leagues where id = :'lid' \gset
select pg_temp.as_user('b'); select public.join_league(:'code', 'Ben', 'wizard');
select pg_temp.as_user('c'); select public.join_league(:'code', 'Cy', 'robot');
select pg_temp.as_user('d'); select public.join_league(:'code', 'Dee', 'ghost');
select pg_temp.as_user('a'); select public.start_season(:'lid');
select id as r1 from public.rounds where league_id = :'lid' and position = 1 \gset

-- Non-commissioners can't use the tools
select pg_temp.as_user('b');
select pg_temp.expect_error(format('select public.remove_player(%L, %L)', :'lid', '00000000-0000-0000-0000-00000000000c'), 'Only the commissioner');
select pg_temp.expect_error(format('select public.end_season(%L)', :'lid'), 'Only the commissioner');
select pg_temp.expect_error(format('select public.delete_league(%L, %L)', :'lid', 'Gone Soon'), 'Only the commissioner');

-- Round 1: A, B, C submit; D hasn't. Removing D lets the round advance to voting.
select pg_temp.as_user('a'); select public.submit_pick(:'r1', 1, 'A1');
select pg_temp.as_user('b'); select public.submit_pick(:'r1', 2, 'B1');
select pg_temp.as_user('c'); select public.submit_pick(:'r1', 3, 'C1');
select pg_temp.as_user('a');
select pg_temp.expect_error(format('select public.remove_player(%L, %L)', :'lid', '00000000-0000-0000-0000-00000000000a'), 'can''t remove themselves');
select public.remove_player(:'lid', '00000000-0000-0000-0000-00000000000d');
select pg_temp.check((public.get_league_state(:'lid')->'rounds'->0->>'status') = 'voting', 'removing the straggler advances the round');
select pg_temp.check(jsonb_array_length(public.get_league_state(:'lid')->'members') = 3, 'removed player gone from roster');

-- Removed player loses access
select pg_temp.as_user('d');
select pg_temp.expect_error(format('select public.get_league_state(%L)', :'lid'), 'not in this league');

-- Votes: A and B vote; C (with a pick) gets removed mid-voting → their pick and votes vanish, round completes
select pg_temp.as_user('a');
select public.get_league_state(:'lid') as st \gset
select (select e->>'id' from jsonb_array_elements((:'st'::jsonb)->'current'->'submissions') e where e->>'title' = 'B1') as sb,
       (select e->>'id' from jsonb_array_elements((:'st'::jsonb)->'current'->'submissions') e where e->>'title' = 'C1') as sc \gset
select public.cast_votes(:'r1', jsonb_build_array(jsonb_build_object('submission_id', :'sb', 'points', 20)));
select pg_temp.as_user('b');
select public.cast_votes(:'r1', jsonb_build_array(jsonb_build_object('submission_id', :'sc', 'points', 20)));
select pg_temp.as_user('a');
select public.remove_player(:'lid', '00000000-0000-0000-0000-00000000000c');
select public.get_league_state(:'lid') as st \gset
select pg_temp.check(((:'st'::jsonb)->'rounds'->0->>'status') = 'complete', 'round completes once the rest have voted');
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'results'->(:'r1')) = 2, 'removed player''s live pick is gone from results');
select pg_temp.check(((:'st'::jsonb)->'rounds'->1->>'status') = 'submitting', 'round 2 opened');

-- End season while round 2 is taking picks → cancelled, queued round dropped, league complete
select pg_temp.as_user('a');
select public.submit_pick((select id from public.rounds where league_id = :'lid' and position = 2), 9, 'A2');
select public.end_season(:'lid');
select public.get_league_state(:'lid') as st \gset
select pg_temp.check(((:'st'::jsonb)->'league'->>'status') = 'complete', 'season ended');
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'rounds') = 1, 'unfinished and queued rounds removed, finished round kept');
select pg_temp.check(((:'st'::jsonb)->'standings'->0->>'points')::int = 20, 'standings intact');
select pg_temp.expect_error(format('select public.end_season(%L)', :'lid'), 'Only a season in progress');

-- Delete requires the exact name
select pg_temp.expect_error(format('select public.delete_league(%L, %L)', :'lid', 'wrong'), 'Type the league name');
select public.delete_league(:'lid', 'gone soon');
reset role;
select pg_temp.check((select count(*) = 0 from public.leagues), 'league deleted');
select pg_temp.check((select count(*) = 0 from public.rounds) and (select count(*) = 0 from public.submissions), 'everything cascaded');
\echo 'COMMISSIONER TESTS PASSED'
