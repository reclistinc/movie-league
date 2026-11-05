import { createClient } from "@supabase/supabase-js";
import { matchTier, rankMovies } from "@/lib/rank";
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

  type TmdbResult = {
    id: number;
    title: string;
    adult?: boolean;
    original_title?: string;
    release_date?: string;
    poster_path: string | null;
    popularity: number;
    vote_count: number;
  };
  // TMDb's first page can miss the obvious film for a half-typed title ("home alon"),
  // so pull the first 3 pages in parallel and rank them ourselves.
  const fetchPage = async (query: string, page: number): Promise<TmdbResult[]> => {
    const params = new URLSearchParams({ query, include_adult: "false", language: "en-US", page: String(page) });
    if (!readToken && apiKey) params.set("api_key", apiKey);
    const res = await fetch(`${TMDB}/search/movie?${params}`, {
      headers: readToken ? { Authorization: `Bearer ${readToken}`, accept: "application/json" } : { accept: "application/json" },
    });
    if (!res.ok) {
      if (page === 1 && query === q) throw new Error(`TMDb error ${res.status}`);
      return []; // later pages are a bonus
    }
    const body = (await res.json()) as { results: TmdbResult[]; total_pages: number };
    return body.results;
  };

  // TMDb also drops films for some half-typed last words ("home al", "home alon" miss
  // Home Alone 1990). So also search the complete words ("home") and keep only results whose
  // titles still fit what was typed.
  const words = q.split(/\s+/);
  const completeWords = words.length >= 2 ? words.slice(0, -1).join(" ") : null;

  let pool: TmdbResult[];
  try {
    const [main, extra] = await Promise.all([
      Promise.all([1, 2, 3].map((p) => fetchPage(q, p))),
      completeWords && completeWords.length >= 2 ? Promise.all([1, 2].map((p) => fetchPage(completeWords, p))) : Promise.resolve([]),
    ]);
    pool = [...main.flat(), ...extra.flat().filter((m) => matchTier(q, m.title) >= 3)];
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
  const seen = new Set<number>();
  const unique = pool.filter((m) => m.adult !== true && !seen.has(m.id) && (seen.add(m.id), true)); // never show adult titles

  const results: Movie[] = rankMovies(q, unique)
    .slice(0, 12)
    .map((m) => ({
      tmdb_id: m.id,
      title: m.title,
      release_year: m.release_date ? Number(m.release_date.slice(0, 4)) || null : null,
      poster_path: m.poster_path,
      vote_count: m.vote_count,
      popularity: m.popularity,
    }));
  return Response.json({ results }, { headers: { "Cache-Control": "private, max-age=300" } });
}
