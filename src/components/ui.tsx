"use client";

import { useState, type ReactNode } from "react";
import { AVATARS, AVATAR_KEYS } from "@/lib/avatars";
import type { Member, Movie } from "@/lib/types";

export const POSTER_BASE = "https://image.tmdb.org/t/p/";

export function Avatar({ avatar, size = 36 }: { avatar: string; size?: number }) {
  const a = AVATARS[avatar] ?? { glyph: "🎬", label: avatar };
  return (
    <span
      title={a.label}
      className="inline-flex items-center justify-center rounded-full bg-zinc-800 ring-1 ring-zinc-700 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {a.glyph}
    </span>
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
  return (
    <div className="grid grid-cols-5 gap-2">
      {AVATAR_KEYS.map((k) => {
        const isTaken = taken.includes(k) && k !== value;
        return (
          <button
            key={k}
            type="button"
            disabled={isTaken}
            onClick={() => onChange(k)}
            className={`flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] ${
              value === k ? "bg-amber-500/20 ring-2 ring-amber-400" : "bg-zinc-900 hover:bg-zinc-800"
            } ${isTaken ? "opacity-30" : ""}`}
          >
            <Avatar avatar={k} size={32} />
            {AVATARS[k].label}
          </button>
        );
      })}
    </div>
  );
}

export function Poster({ movie, width = 92 }: { movie: Pick<Movie, "title" | "poster_path">; width?: number }) {
  const h = Math.round(width * 1.5);
  if (!movie.poster_path) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-gradient-to-b from-zinc-700 to-zinc-900 p-1 text-center text-[10px] text-zinc-300 shrink-0"
        style={{ width, height: h }}
      >
        {movie.title}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${POSTER_BASE}${width > 154 ? "w342" : "w185"}${movie.poster_path}`}
      alt={`${movie.title} poster`}
      width={width}
      height={h}
      className="rounded-md object-cover shrink-0"
      style={{ width, height: h }}
      loading="lazy"
    />
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-amber-400 text-zinc-950 hover:bg-amber-300 disabled:bg-zinc-700 disabled:text-zinc-400",
    ghost: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:opacity-50",
    danger: "bg-red-500/20 text-red-300 hover:bg-red-500/30",
  }[variant];
  return (
    <button {...props} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "rounded-lg bg-zinc-900 px-3 py-2 text-zinc-100 ring-1 ring-zinc-700 focus:outline-none focus:ring-amber-400";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl bg-zinc-900/70 p-4 ring-1 ring-zinc-800 ${className}`}>{children}</section>;
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="text-sm text-red-400">{error}</p> : null;
}

export function memberMap(members: Member[]) {
  return Object.fromEntries(members.map((m) => [m.user_id, m]));
}

export function timeLeft(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closing…";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}

export function TmdbAttribution() {
  return (
    <p className="mt-10 text-center text-[11px] text-zinc-500">
      Movie data and posters from{" "}
      <a href="https://www.themoviedb.org/" className="underline" target="_blank" rel="noreferrer">
        TMDb
      </a>
      . This product uses the TMDb API but is not endorsed or certified by TMDb.
    </p>
  );
}

export function InviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/?join=${code}` : `${window.location.origin}/?join=${code}`;
  return (
    <button
      type="button"
      className="font-mono text-amber-400 underline"
      onClick={() => {
        navigator.clipboard?.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "copied!" : `${code} (copy link)`}
    </button>
  );
}
