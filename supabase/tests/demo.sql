-- Exercises supabase/demo/demo_league.sql end to end.
\set ON_ERROR_STOP on
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'casey@example.com');
select public.demo_create_league('Casey@Example.com');

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end $$;

select id as lid from public.leagues where name = 'Demo League' \gset
select pg_temp.check((select count(*) = 5 from public.league_members where league_id = :'lid'), '5 members');
select pg_temp.check((select bool_and(s) from (select sum(v.points) = 20 as s from public.votes v join public.rounds r on r.id = v.round_id
   where r.league_id = :'lid' group by v.round_id, v.voter_id) x), 'every ballot spends exactly 20');
select pg_temp.check((select count(*) = 2 from public.ballots b join public.rounds r on r.id = b.round_id where r.position = 3 and r.league_id = :'lid'), '2 already voted in round 3');

-- Seen as Casey through the real app function
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
select public.get_league_state(:'lid') as st \gset
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'current'->'submissions') = 5, 'voting shows 5 anonymous picks');
select pg_temp.check(((:'st'::jsonb)->'current'->>'is_voter')::boolean and not ((:'st'::jsonb)->'current'->>'ballot_locked')::boolean, 'Casey can vote');
select pg_temp.check(jsonb_array_length((:'st'::jsonb)->'standings') = 5 and ((:'st'::jsonb)->'standings'->0->>'points')::int > 0, 'standings from 2 finished rounds');
reset role;

-- Bots finish voting; round waits for Casey
select public.demo_bots_act();
select pg_temp.check((select status = 'voting' from public.rounds where league_id = :'lid' and position = 3), 'round waits for Casey''s votes');

-- Casey votes via the real RPC → round completes, round 4 opens
select r.id as r3, (select jsonb_agg(jsonb_build_object('submission_id', x.id, 'points', case when x.rn = 1 then 20 else 0 end))
  from (select s.id, row_number() over (order by s.id) as rn from public.submissions s
        where s.round_id = r.id and s.user_id <> '00000000-0000-0000-0000-0000000000aa') x) as ballot
from public.rounds r where r.league_id = :'lid' and r.position = 3 \gset
set role authenticated;
select public.cast_votes(:'r3', :'ballot');
reset role;
select pg_temp.check((select status = 'complete' from public.rounds where league_id = :'lid' and position = 3), 'round 3 complete after Casey votes');
select pg_temp.check((select status = 'submitting' from public.rounds where league_id = :'lid' and position = 4), 'round 4 open');

-- Bots submit; Casey submits; bots vote; Casey votes → round 4 done
select public.demo_bots_act();
select pg_temp.check((select count(*) = 4 from public.submissions s join public.rounds r on r.id = s.round_id where r.league_id = :'lid' and r.position = 4), 'bots submitted round 4');
select id as r4 from public.rounds where league_id = :'lid' and position = 4 \gset
set role authenticated;
select public.submit_pick(:'r4', 1, 'A Movie No Bot Picked', 1999);
reset role;
select pg_temp.check((select status = 'voting' from public.rounds where league_id = :'lid' and position = 4), 'round 4 voting once Casey submits');
select public.demo_bots_act();

select public.demo_cleanup();
select pg_temp.check((select count(*) = 0 from public.leagues where name = 'Demo League') and (select count(*) = 1 from auth.users), 'cleanup removes demo league and bots');
\echo 'DEMO TESTS PASSED'
