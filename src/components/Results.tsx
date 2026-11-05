"use client";

import { Trophy } from "lucide-react";
import type { LeagueState, ResultPick, Round } from "@/lib/types";
import { BackdropCard, TrailerButton } from "./media";
import { Avatar, Poster, memberMap } from "./ui";
import { PickGif } from "./GifPicker";

/** Full breakdown of a finished round: winner hero + ranked ticket stubs with votes and comments. */
export function RoundResults({ round, picks, state }: { round: Round; picks: ResultPick[]; state: LeagueState }) {
  const byId = memberMap(state.members);
  const winner = picks[0] && picks[0].points > 0 ? picks[0] : null;

  return (
    <div className="space-y-3">
      <BackdropCard tmdbId={winner?.tmdb_id} strong className="card overflow-hidden">
        <div className="p-5">
          <div className="label">Final cut · round {round.position}</div>
          <div className="display mt-0.5 text-[28px] leading-tight" style={{ color: "var(--marquee-gold)" }}>
            {round.theme}
          </div>
          {winner && (
            <div className="mt-4 flex items-end gap-4">
              <Poster movie={winner} width={96} />
              <div className="min-w-0 flex-1 pb-1">
                <div className="mono flex items-center gap-1.5 text-xs uppercase" style={{ color: "var(--marquee-gold)" }}>
                  <Trophy size={14} /> Round winner · {winner.points} pts
                </div>
                <div className="display text-3xl leading-tight">{winner.title}</div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Avatar avatar={byId[winner.user_id]?.avatar ?? ""} size={22} />
                  picked by {byId[winner.user_id]?.display_name}
                </div>
                <div className="mt-2">
                  <TrailerButton tmdbId={winner.tmdb_id} title={winner.title} />
                </div>
              </div>
            </div>
          )}
          {picks.length === 0 && (
            <p className="mt-2 text-sm" style={{ color: "var(--reel-grey)" }}>
              No picks were submitted this round.
            </p>
          )}
        </div>
      </BackdropCard>

      {picks.map((p, i) => {
        const m = byId[p.user_id];
        return (
          <div key={p.id} className="ticket">
            <div className="shrink-0 p-2.5">
              <Poster movie={p} width={68} />
            </div>
            <div className="stub-divider min-w-0 flex-1 px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold">
                  <span className="mono" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)" }}>
                    #{i + 1}
                  </span>{" "}
                  {p.title}{" "}
                  <span className="mono font-normal" style={{ color: "var(--reel-grey)" }}>
                    {p.release_year}
                  </span>
                </div>
                <span className="mono shrink-0" style={{ color: "var(--marquee-gold)" }}>
                  {p.points} pts
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[13px]" style={{ color: "var(--reel-grey)" }}>
                <Avatar avatar={m?.avatar ?? ""} size={18} /> picked by {m?.display_name}
                <span className="ml-auto">
                  <TrailerButton tmdbId={p.tmdb_id} title={p.title} compact />
                </span>
              </div>
              {p.note && <div className="mt-1 text-[13px]">{p.note}</div>}
              <PickGif url={p.gif_url} />
              {p.votes.some((v) => v.points > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.votes
                    .filter((v) => v.points > 0)
                    .map((v) => (
                      <span key={v.voter_id} className="mono inset rounded-full px-2 py-0.5 text-[11px]" style={{ color: "var(--reel-grey)", borderRadius: 20 }}>
                        {byId[v.voter_id]?.display_name}: <span style={{ color: "var(--marquee-gold)" }}>{v.points}</span>
                      </span>
                    ))}
                </div>
              )}
              {p.votes.some((v) => v.comment) && (
                <div className="mt-2 flex flex-col gap-1">
                  {p.votes
                    .filter((v) => v.comment)
                    .map((v) => (
                      <div
                        key={v.voter_id}
                        className="rounded-lg px-2.5 py-1.5 text-[13px]"
                        style={{ background: "var(--midnight)", borderLeft: "2px solid var(--marquee-gold)" }}
                      >
                        <span className="mono" style={{ color: "var(--marquee-gold)" }}>
                          {byId[v.voter_id]?.display_name}:
                        </span>{" "}
                        {v.comment}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
