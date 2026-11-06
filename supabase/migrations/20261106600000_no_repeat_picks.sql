-- A player can't pick the same movie twice in one league (other players still can).
-- Replaces submit_pick with one extra check; everything else is unchanged.

create or replace function public.submit_pick(
  p_round_id uuid,
  p_tmdb_id int,
  p_title text,
  p_release_year int default null,
  p_poster_path text default null,
  p_note text default null,
  p_gif_url text default null,
  p_video_key text default null,
  p_video_name text default null,
  p_video_type text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r public.rounds%rowtype;
  prev_round int;
begin
  select * into r from public.rounds where id = p_round_id;
  if not found then
    raise exception 'Round not found';
  end if;
  perform public._require_member(r.league_id);
  perform public.sync_league(r.league_id);
  select * into r from public.rounds where id = p_round_id;
  if r.status <> 'submitting' then
    raise exception 'Submissions are closed for this round';
  end if;
  if auth.uid() not in (select public._round_participants(r.id)) then
    raise exception 'You joined after this round opened — you''re in from the next round';
  end if;
  if p_gif_url is not null and p_gif_url !~ '^https://media[0-9]*\.giphy\.com/' then
    raise exception 'GIFs must come from GIPHY';
  end if;
  if p_video_key is not null and p_video_key !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception 'That video can''t be attached';
  end if;
  if exists (select 1 from public.submissions
             where round_id = r.id and tmdb_id = p_tmdb_id and user_id <> auth.uid()) then
    raise exception 'Someone already picked that movie this round';
  end if;
  select r2.position into prev_round
  from public.submissions s join public.rounds r2 on r2.id = s.round_id
  where r2.league_id = r.league_id and s.user_id = auth.uid() and s.tmdb_id = p_tmdb_id and s.round_id <> r.id
  order by r2.position limit 1;
  if found then
    raise exception 'You already picked that movie in round % — choose a different one', prev_round;
  end if;

  insert into public.submissions (round_id, user_id, tmdb_id, title, release_year, poster_path, note, gif_url,
                                  video_key, video_name, video_type)
    values (r.id, auth.uid(), p_tmdb_id, btrim(p_title), p_release_year, p_poster_path, nullif(btrim(p_note), ''), p_gif_url,
            p_video_key, left(p_video_name, 200), left(p_video_type, 30))
  on conflict (round_id, user_id) do update
    set tmdb_id = excluded.tmdb_id, title = excluded.title, release_year = excluded.release_year,
        poster_path = excluded.poster_path, note = excluded.note, gif_url = excluded.gif_url,
        video_key = excluded.video_key, video_name = excluded.video_name, video_type = excluded.video_type,
        updated_at = now();

  perform public._bump(r.league_id);
  perform public.sync_league(r.league_id);
end;
$$;

revoke execute on function public.submit_pick(uuid, int, text, int, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_pick(uuid, int, text, int, text, text, text, text, text, text) to authenticated;
