"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Play, VolumeX, X } from "lucide-react";
import type { MovieDetails, MovieVideo, TrendingMovie } from "@/lib/types";
import { POSTER_BASE } from "@/lib/images";

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

type ChosenVideo = { video_key?: string | null; video_name?: string | null; video_type?: string | null };

/**
 * Plays a pick's video. If the player attached one, only that video plays (it's their pitch);
 * "none" hides the button; picks without a choice play the movie's main trailer.
 */
export function TrailerButton({
  tmdbId,
  title,
  compact = false,
  chosen,
}: {
  tmdbId: number;
  title: string;
  compact?: boolean;
  chosen?: ChosenVideo;
}) {
  const own = chosen?.video_key ? [{ key: chosen.video_key, name: chosen.video_name ?? title, type: chosen.video_type ?? "Trailer" }] : null;
  const d = useMovieDetails(own || chosen?.video_type === "none" ? null : tmdbId);
  const [open, setOpen] = useState(false);
  if (chosen?.video_type === "none") return null;
  // Picks without a chosen video (older picks, the demo league) show just the main trailer.
  const videos = own ?? (d?.videos.length ? [d.videos[0]] : []);
  if (videos.length === 0) return null;
  const label = own ? own[0].type : "Trailer";
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
        <Play size={compact ? 12 : 14} fill="currentColor" /> {label}
      </button>
      {open && <TrailerModal title={title} videos={videos} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Under the chosen movie: pick which trailer/teaser/clip goes with your submission.
 * Tapping a thumbnail plays it; "Use this video" in the player chooses it.
 */
export function VideoChooser({
  tmdbId,
  title,
  value,
  onChange,
}: {
  tmdbId: number;
  title: string;
  value: MovieVideo | "none" | null;
  onChange: (v: MovieVideo | "none") => void;
}) {
  const d = useMovieDetails(tmdbId);
  const [watching, setWatching] = useState<MovieVideo | null>(null);
  const firstVideo = d?.videos[0];

  // Pre-select the movie's main (official) trailer once its videos load.
  useEffect(() => {
    if (value === null && firstVideo) onChange(firstVideo);
  }, [value, firstVideo, onChange]);

  const videos = d?.videos ?? [];
  if (!d || videos.length === 0) return null;
  const selectedKey = value && value !== "none" ? value.key : null;

  return (
    <div>
      <div className="label">Video to show voters</div>
      <p className="mt-1 mb-2 text-xs" style={{ color: "var(--reel-grey)" }}>
        Tap a video to watch it, then choose the one that sells your pick — voters can watch it while they vote. The
        official trailer is selected to start with.
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {videos.map((v) => {
          const selected = v.key === selectedKey;
          return (
            <button key={v.key} type="button" onClick={() => setWatching(v)} className="w-36 shrink-0 text-left">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${v.key}/mqdefault.jpg`}
                  alt=""
                  className="aspect-video w-full rounded-md bg-black object-cover"
                  style={{ border: selected ? "2px solid var(--marquee-gold)" : "2px solid rgba(107,111,138,0.35)" }}
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/30">
                    <Play size={16} fill="white" color="white" />
                  </span>
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="mono text-[10px] uppercase" style={{ color: "var(--marquee-gold)" }}>
                  {v.type}
                </span>
                {selected && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase" style={{ color: "var(--marquee-gold)" }}>
                    <Check size={11} /> Selected
                  </span>
                )}
              </div>
              <div className="truncate text-xs">{v.name}</div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange("none")}
          className="flex aspect-video w-24 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md text-xs"
          style={{
            border: value === "none" ? "2px solid var(--marquee-gold)" : "1px dashed rgba(107,111,138,0.6)",
            color: value === "none" ? "var(--marquee-gold)" : "var(--reel-grey)",
          }}
        >
          {value === "none" && <Check size={13} />}
          No video
        </button>
      </div>
      {watching && (
        <TrailerModal
          title={title}
          videos={[watching]}
          onClose={() => setWatching(null)}
          action={{
            selected: watching.key === selectedKey,
            onUse: () => {
              onChange(watching);
              setWatching(null);
            },
          }}
        />
      )}
    </div>
  );
}

function TrailerModal({
  title,
  videos,
  onClose,
  action,
}: {
  title: string;
  videos: MovieVideo[];
  onClose: () => void;
  /** When choosing a video for your pick: shows a big "Use this video" button. */
  action?: { selected: boolean; onUse: () => void };
}) {
  const [current, setCurrent] = useState(videos[0]);
  const [muted, setMuted] = useState(true); // starts muted so it can autoplay
  const [paused, setPaused] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const send = (msg: object) => frame.current?.contentWindow?.postMessage(JSON.stringify(msg), "*");

  // Rendered at the top of the page (portal) so no card can clip or squash the player.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-3"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="display truncate text-2xl" style={{ color: "var(--marquee-gold)" }}>
            {title}
          </div>
          <button onClick={onClose} className="btn-primary flex items-center gap-1 px-3 py-1.5 text-sm" aria-label="Close trailer">
            <X size={16} /> Close
          </button>
        </div>
        <div className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-black" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            ref={frame}
            key={current.key}
            className="absolute inset-0 h-full w-full"
            // controls=0 etc.: just the video, none of YouTube's buttons or menus on top.
            src={`https://www.youtube-nocookie.com/embed/${current.key}?autoplay=1&mute=1&rel=0&playsinline=1&controls=0&fs=0&disablekb=1&iv_load_policy=3&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(
              typeof window === "undefined" ? "" : window.location.origin,
            )}`}
            title={current.name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={() => {
              // Browsers reliably allow muted autoplay; nudge playback in case it didn't start.
              setMuted(true);
              setPaused(false);
              setTimeout(() => send({ event: "command", func: "playVideo", args: [] }), 400);
            }}
          />
          {/* Tap layer over the video: first tap turns the sound on, after that taps pause / play.
              It also keeps YouTube's own overlay (title, settings, more videos) from popping up. */}
          <button
            type="button"
            aria-label={muted ? "Turn sound on" : paused ? "Play" : "Pause"}
            className="absolute inset-0 h-full w-full"
            onClick={() => {
              if (muted) {
                send({ event: "command", func: "unMute", args: [] });
                send({ event: "command", func: "setVolume", args: [100] });
                send({ event: "command", func: "playVideo", args: [] });
                setMuted(false);
                setPaused(false);
              } else if (paused) {
                send({ event: "command", func: "playVideo", args: [] });
                setPaused(false);
              } else {
                send({ event: "command", func: "pauseVideo", args: [] });
                setPaused(true);
              }
            }}
          >
            {muted && (
              <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white/90">
                <VolumeX size={13} /> Tap for sound
              </span>
            )}
            {paused && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60">
                  <Play size={26} color="#fff" fill="#fff" />
                </span>
              </span>
            )}
          </button>
        </div>
        {action &&
          (action.selected ? (
            <div
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-bold"
              style={{ border: "1px solid var(--marquee-gold)", color: "var(--marquee-gold)" }}
            >
              <Check size={18} /> Selected for your pick
            </div>
          ) : (
            <button onClick={action.onUse} className="btn-primary mt-3 flex w-full items-center justify-center gap-2 px-4 py-3 text-base">
              <Check size={18} /> Use this video
            </button>
          ))}
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
        <p className="mt-2 text-center text-[11px]" style={{ color: "var(--reel-grey)" }}>
          Tap the video for sound, tap again to pause. Tap outside it or press Close to go back.
        </p>
      </div>
    </div>,
    document.body,
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
