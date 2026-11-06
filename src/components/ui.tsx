"use client";

import type { ReactNode } from "react";
import { AVATAR_MAP, AVATAR_OPTIONS, CharacterFace, GeneratedPoster } from "./art";
import type { Member, Movie } from "@/lib/types";

import { POSTER_BASE } from "@/lib/images";
import { useMovieDetails } from "./media";
export { POSTER_BASE };

// ---------------------------------------------------------------------------
// Avatars (the prototype's drawn characters)
// ---------------------------------------------------------------------------

export function Avatar({ avatar, size = 28 }: { avatar: string; size?: number }) {
  const a = AVATAR_MAP[avatar] || AVATAR_OPTIONS[0];
  return (
    <div
      title={a.label}
      className="shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size, background: a.color, border: "1px solid rgba(107,111,138,0.4)" }}
    >
      <svg viewBox="0 0 104 100" className="h-full w-full">
        <CharacterFace type={a.id} skin={a.skin} accent={a.color} />
      </svg>
    </div>
  );
}

export function AvatarPicker({
  value,
  onChange,
  taken = [],
}: {
  value: string;
  onChange: (v: string) => void;
  taken?: string[];
}) {
  const selected = AVATAR_MAP[value];
  return (
    <div>
    <div className="flex flex-wrap justify-center gap-2">
      {AVATAR_OPTIONS.map((a) => {
        const isTaken = taken.includes(a.id) && a.id !== value;
        return (
          <button
            key={a.id}
            type="button"
            title={isTaken ? `${a.label} (taken)` : a.label}
            disabled={isTaken}
            onClick={() => onChange(a.id)}
            className="overflow-hidden rounded-full p-0 disabled:cursor-not-allowed disabled:opacity-25"
            style={{
              width: 48,
              height: 48,
              background: a.color,
              border: value === a.id ? "3px solid var(--marquee-gold)" : "3px solid transparent",
            }}
          >
            <svg viewBox="0 0 104 100" className="h-full w-full">
              <CharacterFace type={a.id} skin={a.skin} accent={a.color} />
            </svg>
          </button>
        );
      })}
    </div>
    {/* Phones have no hover, so name the chosen avatar under the grid. */}
    <div className="display mt-2 h-6 text-center text-xl tracking-[0.06em]" style={{ color: "var(--marquee-gold)" }}>
      {selected?.label ?? ""}
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Posters: real TMDb art, or the prototype's generated poster as a fallback
// ---------------------------------------------------------------------------

export function Poster({
  movie,
  width = 80,
  genre,
}: {
  movie: Pick<Movie, "title" | "poster_path"> & { release_year?: number | null; tmdb_id?: number };
  width?: number;
  genre?: string;
}) {
  // Picks saved without a poster (e.g. the demo league) borrow it from TMDb details by id.
  const details = useMovieDetails(movie.poster_path ? null : movie.tmdb_id);
  const path = movie.poster_path ?? details?.poster_path ?? null;
  const h = Math.round(width * 1.4);
  if (!path) {
    return (
      <div className="shrink-0" style={{ width, height: h }}>
        <GeneratedPoster genre={genre} title={movie.title} year={movie.release_year} size={width < 60 ? "small" : "normal"} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${POSTER_BASE}${width > 150 ? "w342" : "w185"}${path}`}
      alt={`${movie.title} poster`}
      className="shrink-0 rounded-md object-cover shadow-lg shadow-black/40"
      style={{ width, height: h, border: "1px solid rgba(255,255,255,0.12)" }}
      loading="lazy"
    />
  );
}

// ---------------------------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------------------------

export function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className="marquee">
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * 2 * Math.PI;
        return (
          <span
            key={i}
            className="bulb"
            style={{
              left: `${50 + 49 * Math.cos(angle)}%`,
              top: `${50 + 46 * Math.sin(angle)}%`,
              animationDelay: `${(i % 8) * 0.18}s`,
            }}
          />
        );
      })}
      {children}
    </div>
  );
}

export function SectionTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <span className="display text-lg tracking-[0.06em]">{children}</span>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="text-sm" style={{ color: "var(--ticket-red)" }}>{error}</p> : null;
}

export function memberMap(members: Member[]) {
  return Object.fromEntries(members.map((m) => [m.user_id, m]));
}

export function TmdbAttribution() {
  return (
    <p className="mt-10 text-center text-[11px]" style={{ color: "var(--reel-grey)" }}>
      Movie data and images from{" "}
      <a href="https://www.themoviedb.org/" className="underline" target="_blank" rel="noreferrer">
        The Movie Database (TMDB)
      </a>
      . This product uses the TMDB API but is not endorsed or certified by TMDB. Trailers play from YouTube. ·{" "}
      <a href="/privacy" className="underline">
        Privacy
      </a>
    </p>
  );
}

export { InviteLink } from "./InviteTicket";
