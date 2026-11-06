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
select pg_temp.check((select count(distinct m->>'avatar') = 5 from jsonb_array_elements((:'st'::jsonb)->'members') m), 'avatars unique');
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'rounds') between 4 and 6, '4-6 finished rounds');
select pg_temp.check((select count(*) = jsonb_array_length((:'st'::jsonb)->'rounds') from jsonb_each((:'st'::jsonb)->'results')), 'results for every round');
reset role;
select public.demo_champion_all('casey@example.com');
select pg_temp.check((select count(*) = 22 from public.leagues), '20 per-avatar leagues + 2');
select pg_temp.check((select bool_and(ok) from (
  select (select m.avatar from public.league_members m where m.league_id = l.id and m.user_id = (
            select sub.user_id from public.submissions sub join public.rounds r on r.id = sub.round_id and r.league_id = l.id
            left join public.votes v on v.submission_id = sub.id group by sub.user_id order by sum(coalesce(v.points,0)) desc limit 1))
         = lower(split_part(l.name, ' — ', 2)) as ok
  from public.leagues l where l.name like 'Champion Demo — %') x), 'each avatar league is won by that avatar');
select pg_temp.check(not exists (
  select 1 from public.submissions s join public.rounds r on r.id = s.round_id
  group by r.league_id, s.user_id, s.tmdb_id having count(*) > 1), 'no player picks the same movie twice in a league');
select pg_temp.check((select count(*) from public.submissions s join public.rounds r on r.id = s.round_id
  join public.leagues l on l.id = r.league_id where l.name like 'Champion Demo%') =
  (select count(*) * 5 from public.rounds r join public.leagues l on l.id = r.league_id where l.name like 'Champion Demo%'),
  'every player has a pick in every round');
select public.demo_cleanup();
select pg_temp.check((select count(*) = 0 from public.leagues), 'cleanup removes champion demos');
\echo 'CHAMPION TESTS PASSED'
