"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, FastForward, Play, RotateCcw, RotateCw, Volume2, X } from "lucide-react";
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

/** Under the chosen movie: pick which trailer/teaser/clip goes with your submission. */
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
  const [preview, setPreview] = useState<MovieVideo | null>(null);
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
      <div className="label mb-2">Video to show voters</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {videos.map((v) => {
          const selected = v.key === selectedKey;
          return (
            <div key={v.key} className="w-32 shrink-0">
              <button type="button" onClick={() => onChange(v)} className="relative block w-full text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${v.key}/mqdefault.jpg`}
                  alt=""
                  className="aspect-video w-full rounded object-cover"
                  style={{ border: selected ? "2px solid var(--marquee-gold)" : "2px solid transparent", opacity: selected ? 1 : 0.7 }}
                />
                {selected && (
                  <span className="absolute top-1 right-1 rounded-full p-0.5" style={{ background: "var(--marquee-gold)", color: "#211a06" }}>
                    <Check size={12} />
                  </span>
                )}
              </button>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="mono text-[10px] uppercase" style={{ color: "var(--marquee-gold)" }}>
                  {v.type}
                </span>
                <button type="button" onClick={() => setPreview(v)} className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--reel-grey)" }}>
                  <Play size={10} fill="currentColor" /> preview
                </button>
              </div>
              <div className="truncate text-xs">{v.name}</div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => onChange("none")}
          className="flex aspect-video w-24 shrink-0 items-center justify-center rounded text-xs"
          style={{
            border: value === "none" ? "2px solid var(--marquee-gold)" : "1px dashed rgba(107,111,138,0.6)",
            color: value === "none" ? "var(--marquee-gold)" : "var(--reel-grey)",
          }}
        >
          No video
        </button>
      </div>
      {preview && <TrailerModal title={title} videos={[preview]} onClose={() => setPreview(null)} />}
    </div>
  );
}

function TrailerModal({ title, videos, onClose }: { title: string; videos: MovieVideo[]; onClose: () => void }) {
  const [current, setCurrent] = useState(videos[0]);
  const frame = useRef<HTMLIFrameElement>(null);
  const time = useRef(0);
  // Browsers only reliably allow autoplay when muted, so every video starts muted and
  // plays; one tap on "Tap for sound" unmutes (and later clips keep the sound on).
  const [muted, setMuted] = useState(true);
  const soundWanted = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // The YouTube player reports its position once we say we're listening.
    const onMessage = (e: MessageEvent) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (typeof data?.info?.currentTime === "number") time.current = data.info.currentTime;
        if (typeof data?.info?.muted === "boolean") setMuted(data.info.muted);
      } catch {}
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("message", onMessage);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMessage);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const send = (msg: object) => frame.current?.contentWindow?.postMessage(JSON.stringify(msg), "*");
  const unmute = () => {
    soundWanted.current = true;
    send({ event: "command", func: "unMute", args: [] });
    send({ event: "command", func: "setVolume", args: [100] });
    send({ event: "command", func: "playVideo", args: [] });
    setMuted(false);
  };
  const skip = (seconds: number) => {
    const to = Math.max(0, time.current + seconds);
    time.current = to;
    send({ event: "command", func: "seekTo", args: [to, true] });
  };

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
            src={`https://www.youtube-nocookie.com/embed/${current.key}?autoplay=1&mute=1&rel=0&playsinline=1&controls=1&fs=1&enablejsapi=1&origin=${encodeURIComponent(
              typeof window === "undefined" ? "" : window.location.origin,
            )}`}
            title={current.name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={() => {
              time.current = 0;
              send({ event: "listening", id: current.key, channel: "widget" });
              // Nudge playback (muted autoplay is always allowed) and restore sound if they asked for it.
              setTimeout(() => {
                send({ event: "command", func: "playVideo", args: [] });
                if (soundWanted.current) {
                  send({ event: "command", func: "unMute", args: [] });
                  send({ event: "command", func: "setVolume", args: [100] });
                }
              }, 400);
            }}
          />
          {muted && (
            <button
              type="button"
              onClick={unmute}
              className="btn-primary absolute bottom-12 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 px-4 py-2.5 text-sm shadow-lg shadow-black/50"
            >
              <Volume2 size={18} /> Tap for sound
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <button onClick={() => skip(-10)} className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm">
            <RotateCcw size={14} /> 10s
          </button>
          <button onClick={() => skip(10)} className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm">
            10s <RotateCw size={14} />
          </button>
          <button onClick={() => skip(30)} className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-sm">
            30s <FastForward size={14} />
          </button>
        </div>
        {videos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {videos.map((v) => (
              <button
                key={v.key}
                onClick={() => {
                  setCurrent(v);
                  setMuted(!soundWanted.current);
                }}
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
          Tap outside the video or press Close to go back.
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
