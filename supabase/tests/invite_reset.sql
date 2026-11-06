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
select pg_temp.expect_error(format('select public.reset_invite_code(%L)', :'lid'), 'Only the commissioner');
select pg_temp.as_user('a');
select public.remove_player(:'lid', '00000000-0000-0000-0000-00000000000b');
select public.reset_invite_code(:'lid') as newcode \gset
select pg_temp.check(:'newcode' <> :'code' and length(:'newcode') = 8, 'new invite code issued');
select pg_temp.as_user('b');
select pg_temp.expect_error(format('select public.join_league(%L, %L, %L)', :'code', 'Ben', 'wizard'), 'does not match');
select pg_temp.check(public.preview_invite(:'code') is null, 'old link no longer previews');
select pg_temp.as_user('c'); select public.join_league(:'newcode', 'Cy', 'robot');
select pg_temp.check((public.preview_invite(:'newcode')->>'member_count')::int = 2, 'new link works');
\echo 'INVITE RESET TESTS PASSED'
