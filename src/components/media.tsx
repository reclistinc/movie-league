"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Play, X } from "lucide-react";
import type { MovieDetails, MovieVideo, TrendingMovie } from "@/lib/types";
import { POSTER_BASE } from "./ui";

// ---------------------------------------------------------------------------
// Movie details (backdrop, genres, trailers), fetched once per movie and shared
// ---------------------------------------------------------------------------

const detailsCache = new Map<number, Promise<MovieDetails | null>>();

function loadDetails(id: number) {
  let p = detailsCache.get(id);
  if (!p) {
    p = fetch(`/api/movies/details?id=${id}`)
      .then((r) => (r.ok ? (r.json() as Promise<MovieDetails>) : null))
      .catch(() => null);
    detailsCache.set(id, p);
  }
  return p;
}

export function useMovieDetails(id: number | null | undefined) {
  const [loaded, setLoaded] = useState<{ id: number; details: MovieDetails | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    loadDetails(id).then((details) => live && setLoaded({ id, details }));
    return () => {
      live = false;
    };
  }, [id]);
  return loaded && loaded.id === id ? loaded.details : null;
}

export const backdropUrl = (path: string | null | undefined, size: "w780" | "w1280" = "w780") =>
  path ? `${POSTER_BASE}${size}${path}` : null;

/** A card whose background is the movie's backdrop, faded into the card colour. */
export function BackdropCard({
  tmdbId,
  className = "",
  strong = false,
  children,
}: {
  tmdbId: number | null | undefined;
  className?: string;
  strong?: boolean;
  children: ReactNode;
}) {
  const d = useMovieDetails(tmdbId);
  const url = backdropUrl(d?.backdrop_path);
  return (
    <div className={`backdrop-banner ${className}`}>
      {url && <div className="bg" style={{ backgroundImage: `url(${url})`, opacity: strong ? 0.6 : 0.35 }} />}
      <div className="fg">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trailers & clips (YouTube embeds — played from YouTube, not hosted by us)
// ---------------------------------------------------------------------------

export function TrailerButton({ tmdbId, title, compact = false }: { tmdbId: number; title: string; compact?: boolean }) {
  const d = useMovieDetails(tmdbId);
  const [open, setOpen] = useState(false);
  if (!d || d.videos.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`btn-ghost inline-flex items-center gap-1.5 ${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"}`}
        style={{ borderColor: "rgba(240,180,41,0.5)", color: "var(--marquee-gold)" }}
      >
        <Play size={compact ? 12 : 14} fill="currentColor" /> Trailer
      </button>
      {open && <TrailerModal title={title} videos={d.videos} onClose={() => setOpen(false)} />}
    </>
  );
}

function TrailerModal({ title, videos, onClose }: { title: string; videos: MovieVideo[]; onClose: () => void }) {
  const [current, setCurrent] = useState(videos[0]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3" onClick={onClose}>
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="display truncate text-2xl" style={{ color: "var(--marquee-gold)" }}>
            {title}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-black">
          <iframe
            key={current.key}
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${current.key}?autoplay=1&rel=0&playsinline=1`}
            title={current.name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        {videos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {videos.map((v) => (
              <button
                key={v.key}
                onClick={() => setCurrent(v)}
                className="w-36 shrink-0 text-left"
                style={{ opacity: v.key === current.key ? 1 : 0.65 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${v.key}/mqdefault.jpg`}
                  alt=""
                  className="aspect-video w-full rounded object-cover"
                  style={{ border: v.key === current.key ? "2px solid var(--marquee-gold)" : "2px solid transparent" }}
                />
                <div className="mono mt-1 text-[10px] uppercase" style={{ color: "var(--marquee-gold)" }}>
                  {v.type}
                </div>
                <div className="truncate text-xs">{v.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drifting wall of this week's trending posters behind the whole app
// ---------------------------------------------------------------------------

let trendingPromise: Promise<TrendingMovie[]> | null = null;

export function PosterWall({ intensity = 0.22 }: { intensity?: number }) {
  const [movies, setMovies] = useState<TrendingMovie[]>([]);
  useEffect(() => {
    trendingPromise ??= fetch("/api/movies/trending")
      .then((r) => r.json())
      .then((b) => (b.results ?? []) as TrendingMovie[])
      .catch(() => []);
    trendingPromise.then(setMovies);
  }, []);
  if (movies.length === 0) return null;
  // Repeat to fill a tall grid so the drift never shows an edge.
  const tiles = Array.from({ length: 70 }, (_, i) => movies[i % movies.length]);
  return (
    <>
      <div className="poster-wall" style={{ opacity: intensity }} aria-hidden>
        {tiles.map((m, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={`${POSTER_BASE}w185${m.poster_path}`} alt="" loading="lazy" />
        ))}
      </div>
      <div className="poster-veil" aria-hidden />
    </>
  );
}
