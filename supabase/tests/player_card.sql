\set ON_ERROR_STOP on
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'casey@example.com'),
                                          ('00000000-0000-0000-0000-0000000000ee', 'eve@example.com');
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAILED: %', what; end if; raise notice 'ok - %', what; end $$;
select public.demo_champion_league('casey@example.com', 'wizard');
select public.demo_champion_league('casey@example.com');
select id as lid from public.leagues where name = 'Champion Demo — Wizard' \gset
select user_id as champ from public.league_members where league_id = :'lid' and avatar = 'wizard' \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', false);
select public.get_player_card(:'lid', :'champ') as c \gset
\echo :c
select pg_temp.check(((:'c'::jsonb)->'league'->>'finish')::int = 1, 'champion finishes 1st');
select pg_temp.check(jsonb_array_length((:'c'::jsonb)->'league'->'picks') = ((:'c'::jsonb)->'league'->>'rounds_complete')::int, 'a pick per finished round');
select pg_temp.check(((:'c'::jsonb)->'career'->>'leagues')::int = 2, 'career counts both leagues');
select pg_temp.check(((:'c'::jsonb)->'career'->>'titles')::int >= 1, 'title counted');
select pg_temp.check((:'c'::jsonb)->'league'->'biggest_fan'->>'user_id' is not null, 'biggest fan found');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ee', false);
select set_config('my.lid', :'lid', false);
do $$ begin perform public.get_player_card(current_setting('my.lid')::uuid, '00000000-0000-0000-0000-0000000000aa');
  raise exception 'FAILED: outsider allowed'; exception when others then
  if sqlerrm like 'FAILED%' then raise; end if; raise notice 'ok - outsider refused'; end $$;
\echo 'PLAYER CARD TESTS PASSED'
