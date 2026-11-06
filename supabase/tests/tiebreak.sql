\set ON_ERROR_STOP on
-- Hand-built league (4 players, 2 finished rounds) to exercise each tiebreaker.
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d'), ('00000000-0000-0000-0000-00000000000e');
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAILED: %', what; end if; raise notice 'ok - %', what; end $$;
create function pg_temp.u(c text) returns uuid language sql as $$ select ('00000000-0000-0000-0000-00000000000' || c)::uuid $$;
create function pg_temp.order_str(l uuid) returns text language sql as $$
  select string_agg(right(user_id::text, 1), '' order by place) from public._league_standings(l) $$;

insert into public.leagues (id, name, commissioner_id, invite_code, status)
values ('11111111-1111-1111-1111-111111111111', 'Ties', pg_temp.u('a'), 'TIES0001', 'complete');
\set lid '11111111-1111-1111-1111-111111111111'
-- d joins first, so the final fallback would favour d
insert into public.league_members (league_id, user_id, display_name, avatar, joined_at) values
  (:'lid', pg_temp.u('d'), 'D', 'ghost',     now() - interval '4 days'),
  (:'lid', pg_temp.u('a'), 'A', 'detective', now() - interval '3 days'),
  (:'lid', pg_temp.u('b'), 'B', 'wizard',    now() - interval '2 days'),
  (:'lid', pg_temp.u('c'), 'C', 'robot',     now() - interval '1 day');
insert into public.rounds (id, league_id, position, theme, status) values
  ('22222222-0000-0000-0000-000000000001', :'lid', 1, 'One', 'complete'),
  ('22222222-0000-0000-0000-000000000002', :'lid', 2, 'Two', 'complete');
-- picks: round 1 movies 101..104, round 2 movies 201..204 (a,b,c,d)
insert into public.submissions (id, round_id, user_id, tmdb_id, title)
select ('33333333-0000-0000-0000-0000000000' || r || x)::uuid, ('22222222-0000-0000-0000-00000000000' || r)::uuid,
       pg_temp.u(x), (r::int * 100 + ascii(x) - 96), x || r
from (values ('1'), ('2')) rr(r), (values ('a'), ('b'), ('c'), ('d')) xx(x);
-- one voter ('e', not a member) gives every point so voter counts stay simple
create function pg_temp.vote(r text, x text, pts int, voter text default 'e') returns void language sql as $$
  insert into public.votes (round_id, voter_id, submission_id, points)
  values (('22222222-0000-0000-0000-00000000000' || r)::uuid, pg_temp.u(voter),
          ('33333333-0000-0000-0000-0000000000' || r || x)::uuid, pts) $$;
-- R1: a6 b5 c3 d0   R2: a4 b5 c0 d3
-- a,b: 10 pts, 1 win each -> best round a6 > b5.  c,d: 3 pts, 0 wins, best 3, 0.5 voters, 1 last place each.
select pg_temp.vote('1','a',6), pg_temp.vote('1','b',5), pg_temp.vote('1','c',3),
       pg_temp.vote('2','a',4), pg_temp.vote('2','b',5), pg_temp.vote('2','d',3);
select pg_temp.check(pg_temp.order_str(:'lid') = 'abdc', 'rule 3 (best round) splits a/b; rules 4-7 level so d (joined first) beats c');

-- Rule 6: c marks one of the others' picks Seen -> c passes d
insert into public.watch_status (user_id, tmdb_id, status) values (pg_temp.u('c'), 101, 'seen');
select pg_temp.check(pg_temp.order_str(:'lid') = 'abcd', 'rule 6 (seen) puts c ahead');
-- marking your own pick doesn't count
insert into public.watch_status (user_id, tmdb_id, status) values (pg_temp.u('d'), 204, 'seen');
select pg_temp.check(pg_temp.order_str(:'lid') = 'abcd', 'own pick not counted');
-- Rule 7: d level on seen, then more watchlist -> d ahead
insert into public.watch_status (user_id, tmdb_id, status) values (pg_temp.u('d'), 102, 'seen'), (pg_temp.u('d'), 103, 'want');
select pg_temp.check(pg_temp.order_str(:'lid') = 'abdc', 'rule 7 (watchlist) puts d ahead');

-- Rule 5: a and b level on points (5), wins (0), best round (3), voters (1.0); a finishes last once, b never.
-- a joined before b, so without rule 5 a would rank higher.
delete from public.votes; delete from public.watch_status;
-- R1: c9 d5 b3 a2 (a last)   R2: c9 a3 b2 d1 (d last)
select pg_temp.vote('1','c',9), pg_temp.vote('1','d',5), pg_temp.vote('1','b',3), pg_temp.vote('1','a',2),
       pg_temp.vote('2','c',9), pg_temp.vote('2','a',3), pg_temp.vote('2','b',2), pg_temp.vote('2','d',1);
select pg_temp.check(pg_temp.order_str(:'lid') = 'cdba', 'rule 5 (fewest last places) puts b over a');

-- Rule 4: c,d level on points (5), wins (0), best (3); c's picks drew more voters
delete from public.votes;
-- R1: a5 c3 d3 b0   R2: b5 c2 d2 a0  -> a,b: 5 pts, 1 win, best 5, avg 0.5 voters, 1 last each -> joined: a before b
select pg_temp.vote('1','a',5), pg_temp.vote('2','b',5);
select pg_temp.vote('1','c',1,'a'), pg_temp.vote('1','c',1,'b'), pg_temp.vote('1','c',1,'e');
select pg_temp.vote('2','c',1,'a'), pg_temp.vote('2','c',1,'b');
select pg_temp.vote('1','d',3), pg_temp.vote('2','d',2);
select pg_temp.check(pg_temp.order_str(:'lid') = 'abcd', 'rule 4 (avg voters) puts c over d');

-- Champion of a demo league is standings place 1 and matches the get_league_state order
set role authenticated;
select set_config('request.jwt.claim.sub', pg_temp.u('a')::text, false);
select pg_temp.check(((public.get_league_state(:'lid')->'standings'->0->>'place')::int) = 1, 'standings ordered by place');
select pg_temp.check(((public.get_league_state(:'lid')->'standings'->0) ? 'seen') = false, 'seen counts not exposed');
select pg_temp.check(((public.get_player_card(:'lid', (public.get_league_state(:'lid')->'standings'->0->>'user_id')::uuid))->'league'->>'finish')::int = 1, 'player card finish matches standings');
\echo 'TIEBREAK TESTS PASSED'
