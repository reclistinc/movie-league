\set ON_ERROR_STOP on
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'casey@example.com');
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;
select public.demo_champion_league('casey@example.com');
select public.demo_champion_league('casey@example.com', 'wizard');
select id as lw from public.leagues where name = 'Champion Demo — Wizard' \gset
-- seen through the app as Casey
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
select public.get_league_state(:'lw') as st \gset
select pg_temp.check(((:'st'::jsonb)->'league'->>'status') = 'complete', 'league complete');
select pg_temp.check((select m->>'avatar' from jsonb_array_elements((:'st'::jsonb)->'members') m
                      where m->>'user_id' = (:'st'::jsonb)->'standings'->0->>'user_id') = 'wizard', 'forced avatar is the champion');
select pg_temp.check((select count(distinct m->>'avatar') = count(*) from jsonb_array_elements((:'st'::jsonb)->'members') m), 'avatars unique');
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'rounds') between 3 and 8, '3-8 finished rounds');
select pg_temp.check((select count(*) = jsonb_array_length((:'st'::jsonb)->'rounds') from jsonb_each((:'st'::jsonb)->'results')), 'results for every round');
reset role;
select public.demo_cleanup();
select public.demo_champion_all('casey@example.com');
select pg_temp.check((select count(*) = 20 from public.leagues), '20 per-avatar leagues');
select pg_temp.check((select bool_and(ok) from (
  select (select m.avatar from public.league_members m where m.league_id = l.id and m.user_id = (
            select st.user_id from public._league_standings(l.id) st where st.place = 1))
         = lower(split_part(split_part(l.name, ' — ', 2), ' · ', 1)) as ok
  from public.leagues l where l.name like 'Champion Demo — %') x), 'each avatar league is won by that avatar');
select pg_temp.check(not exists (
  select 1 from public.submissions s join public.rounds r on r.id = s.round_id
  group by r.league_id, s.user_id, s.tmdb_id having count(*) > 1), 'no player picks the same movie twice in a league');
select pg_temp.check((select count(*) from public.submissions s join public.rounds r on r.id = s.round_id
  join public.leagues l on l.id = r.league_id where l.name like 'Champion Demo%') =
  (select sum((select count(*) from public.league_members m where m.league_id = r.league_id))
     from public.rounds r join public.leagues l on l.id = r.league_id where l.name like 'Champion Demo%'),
  'every player has a pick in every round');
-- shapes
select pg_temp.check(exists (select 1 from public.leagues l where (select count(*) from public.league_members m where m.league_id = l.id) = 20), 'a 20-player league');
select pg_temp.check(exists (select 1 from public.leagues l where (select count(*) from public.league_members m where m.league_id = l.id) = 2), 'a 2-player league');
select pg_temp.check(exists (select 1 from public.leagues l where (select count(*) from public.rounds r where r.league_id = l.id) >= 20), 'a 20+ round league');
select pg_temp.check(exists (select 1 from public.leagues l where (select count(*) from public.chat_messages c where c.league_id = l.id) >= 50), 'a chatty league');
select pg_temp.check((select count(distinct (select count(*) from public.league_members m where m.league_id = l.id)) >= 5
                      from public.leagues l where l.name like 'Champion Demo%'), 'league sizes vary');
-- pretend players: some in exactly one demo-all league, some in several
with counts as (
  select m.user_id, count(*) as n from public.league_members m join public.leagues l on l.id = m.league_id
  where l.name like 'Champion Demo — %' and m.user_id <> '00000000-0000-0000-0000-0000000000aa' group by m.user_id)
select pg_temp.check((select count(*) filter (where n = 1) >= 8 and count(*) filter (where n >= 3) >= 5 from counts),
                     'some players in one league, others in many');
-- Seen/Watchlist habits differ a lot between pretend players
with rates as (
  select w.user_id, avg((w.status = 'seen')::int) as seen_share, count(*) as marks
  from public.watch_status w group by w.user_id)
select pg_temp.check((select max(seen_share) - min(seen_share) > 0.3 and max(marks) > 3 * min(marks) from rates), 'varied seen/watchlist habits');
select public.demo_cleanup();
select pg_temp.check((select count(*) = 0 from public.leagues), 'cleanup removes champion demos');
\echo 'CHAMPION TESTS PASSED'
