import { createClient } from "@supabase/supabase-js";
import type { Movie } from "@/lib/types";

// Server-side proxy to TMDb so the API credential stays secret.
// Requires a signed-in Supabase user to keep the key from being used as an open proxy.

const TMDB = "https://api.themoviedb.org/3";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ results: [] });
  if (q.length > 100) return Response.json({ error: "Query too long" }, { status: 400 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !sbUrl || !sbKey) return Response.json({ error: "Sign in to search" }, { status: 401 });
  const { data: user, error: authError } = await createClient(sbUrl, sbKey).auth.getUser(token);
  if (authError || !user.user) return Response.json({ error: "Sign in to search" }, { status: 401 });

  const readToken = process.env.TMDB_READ_ACCESS_TOKEN; // v4 "API Read Access Token" (preferred)
  const apiKey = process.env.TMDB_API_KEY; // or the v3 API key
  if (!readToken && !apiKey) {
    return Response.json({ error: "TMDb is not configured on the server" }, { status: 500 });
  }

  const params = new URLSearchParams({ query: q, include_adult: "false", language: "en-US", page: "1" });
  if (!readToken && apiKey) params.set("api_key", apiKey);
  const res = await fetch(`${TMDB}/search/movie?${params}`, {
    headers: readToken ? { Authorization: `Bearer ${readToken}`, accept: "application/json" } : { accept: "application/json" },
  });
  if (!res.ok) return Response.json({ error: `TMDb error ${res.status}` }, { status: 502 });

  const body = (await res.json()) as {
    results: { id: number; title: string; original_title?: string; release_date?: string; poster_path: string | null; popularity: number; vote_count: number }[];
  };
  // TMDb's own order is loose (e.g. "Home Alone" lands ~7th). Rank the well-known films first:
  // vote count is the best "everyone knows this one" signal, boosted when the title matches.
  const needle = q.toLowerCase();
  const score = (m: (typeof body.results)[number]) => {
    const t = m.title.toLowerCase();
    const boost = t === needle ? 3 : t.startsWith(needle) ? 1.5 : 1;
    return (m.vote_count + m.popularity) * boost;
  };
  const results: Movie[] = [...body.results].sort((a, b) => score(b) - score(a)).slice(0, 12).map((m) => ({
    tmdb_id: m.id,
    title: m.title,
    release_year: m.release_date ? Number(m.release_date.slice(0, 4)) || null : null,
    poster_path: m.poster_path,
  }));
  return Response.json({ results }, { headers: { "Cache-Control": "private, max-age=300" } });
}
