\set ON_ERROR_STOP on
-- join_league: 20-player cap and unique avatars
insert into auth.users (id) select ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,21) i;
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAILED: %', what; end if; raise notice 'ok - %', what; end $$;
create function pg_temp.fails(q text, msg text) returns boolean language plpgsql as $$
begin execute q; return false; exception when others then return sqlerrm like '%'||msg||'%'; end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.create_league('Cap','U1','detective') as lid \gset
reset role;
select invite_code as code from public.leagues where id = :'lid' \gset
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select pg_temp.check(pg_temp.fails(format('select public.join_league(%L,%L,%L)', :'code','U2','detective'), 'already has that avatar'), 'duplicate avatar rejected');
select set_config('my.code', :'code', false);
do $$ declare av text[] := array['detective','wizard','astronaut','robot','ghost','alien','cowboy','vampire','ninja','pirate','hero','scientist','explorer','knight','monster','star','rager','lizard','cyborg','guardian']; i int; begin
 for i in 2..20 loop
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-'||lpad(i::text,12,'0'),false);
  perform public.join_league(current_setting('my.code'),'U'||i,av[i]);
 end loop; end $$;
select pg_temp.check((select (public.preview_invite(:'code')->>'member_count')::int = 20), '20 players joined');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',false);
select pg_temp.check(pg_temp.fails(format('select public.join_league(%L,%L,%L)', :'code','U21','wizard'), 'full'), '21st player rejected');
\echo 'CAP TESTS PASSED'
