-- Movie League — on-time deadlines, keep-alive ping, 20-player cap.
--
-- 1) Deadlines: a pg_cron job runs sync_all_leagues() every minute, so rounds move on at the
--    deadline even if nobody opens the app. If pg_cron isn't enabled yet this prints a
--    notice instead of failing: enable it under Database → Extensions, then run this file again.
-- 2) keepalive_ping(): a tiny read the app's daily Vercel cron calls, so the free Supabase
--    project never pauses for inactivity between seasons.
-- 3) join_league: max 20 players per league (one per avatar) and no duplicate avatars.

create or replace function public.join_league(p_invite_code text, p_display_name text, p_avatar text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare l public.leagues%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select * into l from public.leagues where invite_code = upper(btrim(p_invite_code)) for update;
  if not found then
    raise exception 'That invite code does not match a league';
  end if;
  if exists (select 1 from public.league_members where league_id = l.id and user_id = auth.uid()) then
    return l.id;
  end if;
  if l.status = 'complete' then
    raise exception 'This league''s season is over';
  end if;
  if (select count(*) from public.league_members where league_id = l.id) >= 20 then
    raise exception 'This league is full (20 players)';
  end if;
  if not public._valid_avatar(p_avatar) then
    raise exception 'Unknown avatar';
  end if;
  if exists (select 1 from public.league_members where league_id = l.id and avatar = p_avatar) then
    raise exception 'Someone in this league already has that avatar — pick another';
  end if;
  insert into public.league_members (league_id, user_id, display_name, avatar)
    values (l.id, auth.uid(), btrim(p_display_name), p_avatar);
  perform public._bump(l.id);
  return l.id;
end;
$$;

create or replace function public.keepalive_ping()
returns timestamptz
language sql stable
as $$ select now(); $$;

revoke execute on function public.join_league(text, text, text) from public, anon;
grant execute on function public.join_league(text, text, text) to authenticated;
revoke execute on function public.keepalive_ping() from public;
grant execute on function public.keepalive_ping() to anon, authenticated;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron is not available here (%). Enable it under Database → Extensions, then run this file again.', sqlerrm;
    return;
  end;
  perform cron.schedule('movie-league-deadlines', '* * * * *', 'select public.sync_all_leagues()');
  raise notice 'Scheduled movie-league-deadlines: rounds now advance on time, every minute.';
end $$;
