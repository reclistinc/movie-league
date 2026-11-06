"use client";

import { Trophy } from "lucide-react";
import { AVATAR_FILMS } from "@/lib/avatar-films";
import type { Member } from "@/lib/types";
import { backdropUrl, useMovieDetails } from "./media";
import { Avatar } from "./ui";

const CONFETTI_COLORS = ["#f0b429", "#e2472c", "#f5f1e6", "#2fb3a3", "#a83a63"];

/** Season champion: their avatar's signature movie as the backdrop, plus gold confetti. */
export function ChampionCard({ champion, points }: { champion: Member; points?: number }) {
  const film = AVATAR_FILMS[champion.avatar];
  const d = useMovieDetails(film?.tmdb_id);
  const bg = backdropUrl(d?.backdrop_path, "w1280");

  return (
    <div className="card relative overflow-hidden text-center" style={{ borderColor: "rgba(240,180,41,0.6)" }}>
      {bg && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg})`, opacity: 0.85 }}
          aria-hidden
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(18,19,31,0.35) 0%, rgba(18,19,31,0.8) 70%, rgba(18,19,31,0.92) 100%)" }}
        aria-hidden
      />
      <div className="confetti" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 9) * 0.45}s`,
              animationDuration: `${3.2 + (i % 5) * 0.5}s`,
              width: i % 3 === 0 ? 6 : 8,
              height: i % 3 === 0 ? 10 : 5,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 px-5 py-7">
        <Trophy size={30} color="var(--marquee-gold)" className="mx-auto drop-shadow-[0_0_10px_rgba(240,180,41,0.7)]" />
        <div className="label mt-1" style={{ color: "var(--screen-white)" }}>
          Season champion
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="rounded-full" style={{ boxShadow: "0 0 0 3px var(--marquee-gold), 0 0 24px 6px rgba(240,180,41,0.55)" }}>
            <Avatar avatar={champion.avatar} size={56} />
          </div>
          <span className="display text-5xl leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ color: "var(--marquee-gold)" }}>
            {champion.display_name}
          </span>
        </div>
        {points !== undefined && (
          <div className="mono mt-2 text-sm" style={{ color: "var(--screen-white)" }}>
            {points} pts
          </div>
        )}
      </div>
    </div>
  );
}
