\set ON_ERROR_STOP on
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok,false) then raise exception 'FAILED: %', what; end if; raise notice 'ok - %', what; end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select public.set_watch_status(603, 'seen');
select public.set_watch_status(620, 'want');
select public.set_watch_status(620, 'unseen');
select pg_temp.check(public.my_watch_status(array[603, 620, 999]) = '{"603":"seen","620":"unseen"}'::jsonb, 'set + overwrite');
select public.set_watch_status(603, null);
select pg_temp.check(public.my_watch_status(array[603, 620]) = '{"620":"unseen"}'::jsonb, 'clear');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.check(public.my_watch_status(array[620]) = '{}'::jsonb, 'other players cannot see it');
select pg_temp.check((select count(*) from public.watch_status) = 0, 'table hidden by RLS');
\echo 'WATCH STATUS TESTS PASSED'
