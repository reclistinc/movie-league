-- Names are unique within a league (ignoring capitals and extra spaces), like avatars.
-- "Sam" in two different leagues is fine; two Sams in one league isn't.

create or replace function public._name_key(p text)
returns text
language sql immutable
as $$ select regexp_replace(lower(btrim(p)), '\s+', ' ', 'g'); $$;

-- Is this name used by someone else (not you) in the league?
create or replace function public._name_taken(p_league_id uuid, p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.league_members
                 where league_id = p_league_id and user_id is distinct from auth.uid()
                   and public._name_key(display_name) = public._name_key(p_name));
$$;
revoke execute on function public._name_taken(uuid, text) from public, anon, authenticated;

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
  if public._name_taken(l.id, p_display_name) then
    raise exception 'Someone in this league is already called % — try a nickname or add an initial', btrim(p_display_name);
  end if;
  insert into public.league_members (league_id, user_id, display_name, avatar)
    values (l.id, auth.uid(), btrim(p_display_name), p_avatar);
  perform public._bump(l.id);
  return l.id;
end;
$$;

create or replace function public.update_my_member(p_league_id uuid, p_display_name text, p_avatar text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public._require_member(p_league_id);
  if not public._valid_avatar(p_avatar) then
    raise exception 'Unknown avatar';
  end if;
  perform 1 from public.leagues where id = p_league_id for update;  -- serialize with joins
  if exists (select 1 from public.league_members
             where league_id = p_league_id and avatar = p_avatar and user_id <> auth.uid()) then
    raise exception 'Someone in this league already has that avatar — pick another';
  end if;
  if public._name_taken(p_league_id, p_display_name) then
    raise exception 'Someone in this league is already called % — try a nickname or add an initial', btrim(p_display_name);
  end if;
  update public.league_members
    set display_name = btrim(p_display_name), avatar = p_avatar
    where league_id = p_league_id and user_id = auth.uid();
  perform public._bump(p_league_id);
end;
$$;

revoke execute on function public.join_league(text, text, text), public.update_my_member(uuid, text, text) from public, anon;
grant execute on function public.join_league(text, text, text), public.update_my_member(uuid, text, text) to authenticated;
