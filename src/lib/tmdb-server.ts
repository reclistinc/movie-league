import "server-only";
import { cacheLife } from "next/cache";
import type { MovieDetails, MovieVideo, TrendingMovie } from "./types";

const TMDB = "https://api.themoviedb.org/3";

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const readToken = process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!readToken && !apiKey) throw new Error("TMDb is not configured on the server");
  const qs = new URLSearchParams({ language: "en-US", ...params });
  if (!readToken && apiKey) qs.set("api_key", apiKey);
  const res = await fetch(`${TMDB}${path}?${qs}`, {
    headers: readToken ? { Authorization: `Bearer ${readToken}`, accept: "application/json" } : { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDb error ${res.status}`);
  return (await res.json()) as T;
}

/** This week's trending movies, for the poster wall. Cached for a few hours. */
export async function getTrending(): Promise<TrendingMovie[]> {
  "use cache";
  cacheLife("hours");
  const body = await tmdb<{
    results: { id: number; title: string; poster_path: string | null; backdrop_path: string | null }[];
  }>("/trending/movie/week");
  return body.results
    .filter((m) => m.poster_path)
    .map((m) => ({ tmdb_id: m.id, title: m.title, poster_path: m.poster_path, backdrop_path: m.backdrop_path }));
}

/** Backdrop, genres and YouTube videos for one movie. Cached for a day. */
export async function getMovieDetails(id: number): Promise<MovieDetails> {
  "use cache";
  cacheLife("days");
  const m = await tmdb<{
    id: number;
    title: string;
    overview: string;
    runtime: number | null;
    release_date?: string;
    backdrop_path: string | null;
    poster_path: string | null;
    genres: { id: number; name: string }[];
    videos?: {
      results: { key: string; name: string; site: string; type: string; official: boolean; published_at: string }[];
    };
  }>(`/movie/${id}`, { append_to_response: "videos" });

  const rank: Record<string, number> = { Trailer: 0, Teaser: 1, Clip: 2, Featurette: 3 };
  const videos: MovieVideo[] = (m.videos?.results ?? [])
    .filter((v) => v.site === "YouTube" && v.type in rank)
    .sort(
      (a, b) =>
        rank[a.type] - rank[b.type] ||
        Number(b.official) - Number(a.official) ||
        a.published_at.localeCompare(b.published_at),
    )
    .slice(0, 8)
    .map((v) => ({ key: v.key, name: v.name, type: v.type }));

  return {
    tmdb_id: m.id,
    title: m.title,
    overview: m.overview,
    runtime: m.runtime,
    release_year: m.release_date ? Number(m.release_date.slice(0, 4)) || null : null,
    backdrop_path: m.backdrop_path,
    poster_path: m.poster_path,
    genres: m.genres.map((g) => g.name),
    videos,
  };
}
