-- Seen / Not seen / Watchlist marks on movies. One mark per player per movie (by TMDb id),
-- so it carries across rounds and leagues. Private: only you can read your own marks.

create table if not exists public.watch_status (
  user_id    uuid not null references auth.users (id) on delete cascade,
  tmdb_id    int  not null,
  status     text not null check (status in ('seen', 'unseen', 'want')),
  updated_at timestamptz not null default now(),
  primary key (user_id, tmdb_id)
);

alter table public.watch_status enable row level security;
drop policy if exists "read own watch status" on public.watch_status;
create policy "read own watch status" on public.watch_status
  for select to authenticated using (user_id = auth.uid());

-- Set or clear (p_status null) your mark on a movie.
create or replace function public.set_watch_status(p_tmdb_id int, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_status is null then
    delete from public.watch_status where user_id = auth.uid() and tmdb_id = p_tmdb_id;
  elsif p_status in ('seen', 'unseen', 'want') then
    insert into public.watch_status (user_id, tmdb_id, status) values (auth.uid(), p_tmdb_id, p_status)
    on conflict (user_id, tmdb_id) do update set status = excluded.status, updated_at = now();
  else
    raise exception 'Unknown status %', p_status;
  end if;
end;
$$;

-- Your marks for a set of movies, as {"603": "seen", ...}.
create or replace function public.my_watch_status(p_tmdb_ids int[])
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_object_agg(tmdb_id::text, status), '{}')
  from public.watch_status
  where user_id = auth.uid() and tmdb_id = any (p_tmdb_ids);
$$;

revoke all on public.watch_status from anon;
grant select on public.watch_status to authenticated;
revoke execute on function public.set_watch_status(int, text), public.my_watch_status(int[]) from public, anon;
grant execute on function public.set_watch_status(int, text), public.my_watch_status(int[]) to authenticated;
