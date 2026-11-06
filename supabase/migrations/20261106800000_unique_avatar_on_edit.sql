-- Editing your name/avatar now applies to one league at a time, and can't take an avatar
-- someone else in that league already has (joining already checked this; editing didn't).

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
  update public.league_members
    set display_name = btrim(p_display_name), avatar = p_avatar
    where league_id = p_league_id and user_id = auth.uid();
  perform public._bump(p_league_id);
end;
$$;

revoke execute on function public.update_my_member(uuid, text, text) from public, anon;
grant execute on function public.update_my_member(uuid, text, text) to authenticated;
