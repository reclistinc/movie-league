\set ON_ERROR_STOP on
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'casey@example.com');
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAILED: %', what; end if; raise notice 'ok - %', what; end $$;
select public.demo_create_league('casey@example.com');
select id as lid from public.leagues where name = 'Demo League' \gset
select id as r1 from public.rounds where league_id = :'lid' and position = 1 \gset
select id as r3 from public.rounds where league_id = :'lid' and position = 3 \gset

select pg_temp.check((select markers >= 1 from public.rounds where id = :'r1'), 'finished demo rounds have a snapshot');
select pg_temp.check((select bool_and(seen_by is not null and want_by is not null) from public.submissions where round_id = :'r1'), 'every pick has frozen counts');

-- a bot's pick from round 1 that Casey hasn't marked
select s.tmdb_id as m1, s.seen_by as before_seen from public.submissions s
  where s.round_id = :'r1' and s.user_id <> '00000000-0000-0000-0000-0000000000aa' limit 1 \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
select public.set_watch_status(:m1, 'seen');
reset role;
select pg_temp.check((select seen_by = :before_seen from public.submissions where round_id = :'r1' and tmdb_id = :m1), 'marks after results do not change a finished round');

-- Casey marks a round-3 (voting) movie, then the round finishes: it's in the snapshot
select s.tmdb_id as m3 from public.submissions s where s.round_id = :'r3' and s.user_id <> '00000000-0000-0000-0000-0000000000aa' limit 1 \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
select public.set_watch_status(:m3, 'want');
select public.my_watchlist() as wl \gset
select pg_temp.check(((:'wl'::jsonb)->0->'from'->>'picker_name') is null, 'picker hidden while the round is in voting');
select pg_temp.check(((:'wl'::jsonb)->0->>'title') is not null, 'watchlist has the movie title');
reset role;
-- Casey votes so the round can finish
select (select jsonb_agg(jsonb_build_object('submission_id', id, 'points', p))
  from (select id, case when row_number() over () = 1 then 20 else 0 end as p
        from public.submissions where round_id = :'r3' and user_id <> '00000000-0000-0000-0000-0000000000aa') x) as ballot \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
select public.cast_votes(:'r3', :'ballot');
reset role;
select public.demo_bots_act();
select pg_temp.check((select status = 'complete' from public.rounds where id = :'r3'), 'round 3 finished');
select pg_temp.check((select want_by >= 1 from public.submissions where round_id = :'r3' and tmdb_id = :m3), 'mark made during voting is in the snapshot');
select pg_temp.check((select want >= 1 from public.round_marks where round_id = :'r3' and user_id = '00000000-0000-0000-0000-0000000000aa'), 'per-player snapshot');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
select public.my_watchlist() as wl \gset
select pg_temp.check(((:'wl'::jsonb)->0->'from'->>'picker_name') is not null, 'picker shown once results are out');
select public.get_player_card(:'lid', '00000000-0000-0000-0000-0000000000aa') as c \gset
select pg_temp.check(((:'c'::jsonb)->'league'->>'others_picks')::int > 0 and ((:'c'::jsonb)->'league'->>'seen_picks') is not null, 'player card seen stat');
select public.get_league_state(:'lid') as st \gset
select pg_temp.check(((:'st'::jsonb)->'results'->(:'r3')->0) ? 'seen_by', 'results include seen_by');
select pg_temp.check(((:'st'::jsonb)->'rounds'->2) ? 'markers', 'rounds include markers');
do $$ begin perform 1 from public.round_marks; raise exception 'FAILED: round_marks readable';
exception when insufficient_privilege then raise notice 'ok - round_marks not readable directly'; end $$;
\echo 'WATCH SNAPSHOT TESTS PASSED'
