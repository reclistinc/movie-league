"use client";

import { useState } from "react";
import type { LeagueState, ResultPick, Round } from "@/lib/types";
import { Avatar, Card, Poster, memberMap } from "./ui";

export function Results({ round, picks, state }: { round: Round; picks: ResultPick[]; state: LeagueState }) {
  const [open, setOpen] = useState(false);
  const byId = memberMap(state.members);
  const winner = picks[0];

  return (
    <Card>
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <p className="text-xs uppercase text-zinc-500">Round {round.position} · complete</p>
        <p className="font-semibold">{round.theme}</p>
        {winner && winner.points > 0 && (
          <p className="text-sm text-zinc-400">
            🏆 {winner.title} — {byId[winner.user_id]?.display_name} ({winner.points} pts)
          </p>
        )}
        {picks.length === 0 && <p className="text-sm text-zinc-500">No picks were submitted.</p>}
        <p className="mt-1 text-xs text-amber-400">{open ? "Hide" : "Show"} results</p>
      </button>
      {open && (
        <ol className="mt-4 space-y-4">
          {picks.map((p, i) => {
            const m = byId[p.user_id];
            return (
              <li key={p.id} className="flex gap-3">
                <span className="w-5 font-mono text-zinc-500">{i + 1}</span>
                <Poster movie={p} width={60} />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">
                    {p.title} {p.release_year && <span className="font-normal text-zinc-500">({p.release_year})</span>}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-zinc-400">
                    <Avatar avatar={m?.avatar ?? ""} size={20} /> {m?.display_name} · <b className="text-zinc-100">{p.points} pts</b>
                  </p>
                  {p.note && <p className="text-sm italic text-zinc-400">&ldquo;{p.note}&rdquo;</p>}
                  <ul className="space-y-0.5 text-xs text-zinc-400">
                    {p.votes.map((v) => (
                      <li key={v.voter_id}>
                        <b className="text-zinc-200">{byId[v.voter_id]?.display_name}</b>
                        {v.points > 0 && ` +${v.points}`}
                        {v.comment && ` — “${v.comment}”`}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
