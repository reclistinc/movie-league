"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { LeagueState, Movie, Round, VotingPick } from "@/lib/types";
import { Button, Card, ErrorText, Poster, inputCls, timeLeft } from "./ui";

export function RoundPanel({ state, onChange }: { state: LeagueState; onChange: () => void }) {
  const round = state.rounds.find((r) => r.id === state.current?.round_id);
  if (!round || !state.current) {
    return <Card>No round is open right now.{state.league.status === "complete" && " The season is over!"}</Card>;
  }
  const cur = state.current;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs uppercase text-amber-400">
          Round {round.position} · {round.status === "submitting" ? "Submissions" : "Voting"} ·{" "}
          {timeLeft(round.status === "submitting" ? round.submission_deadline : round.voting_deadline)}
        </p>
        <h2 className="text-xl font-bold">{round.theme}</h2>
        {round.description && <p className="text-sm text-zinc-400">{round.description}</p>}
      </Card>
      {round.status === "submitting" &&
        (cur.is_participant ? (
          <Submit round={round} state={state} onChange={onChange} />
        ) : (
          <Card>You joined after this round opened — you&apos;re in from the next one.</Card>
        ))}
      {round.status === "voting" &&
        (cur.ballot_locked ? (
          <Locked state={state} />
        ) : cur.is_voter ? (
          <Vote round={round} state={state} onChange={onChange} />
        ) : (
          <Card>You&apos;re not voting in this round. Results appear when voting closes.</Card>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Submit({ round, state, onChange }: { round: Round; state: LeagueState; onChange: () => void }) {
  const mine = state.current!.my_submission;
  const [editing, setEditing] = useState(!mine);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [chosen, setChosen] = useState<Movie | null>(null);
  const [note, setNote] = useState(mine?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waitingOn = round.participant_ids.length - round.submitted_ids.length;

  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => {
      api.searchMovies(query).then(setResults, (e) => setError(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function submit() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      await api.submitPick(round.id, chosen, note);
      setEditing(false);
      setChosen(null);
      setQuery("");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (mine && !editing) {
    return (
      <Card className="flex gap-4">
        <Poster movie={mine} width={92} />
        <div className="flex-1 space-y-2">
          <p className="text-xs text-zinc-400">Your pick</p>
          <p className="text-lg font-bold">
            {mine.title} {mine.release_year && <span className="text-zinc-500">({mine.release_year})</span>}
          </p>
          {mine.note && <p className="text-sm italic text-zinc-300">&ldquo;{mine.note}&rdquo;</p>}
          <p className="text-xs text-zinc-500">
            Waiting on {waitingOn} more player{waitingOn === 1 ? "" : "s"}. You can change your pick until everyone has submitted.
          </p>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Change pick
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <input className={`${inputCls} w-full`} autoFocus placeholder="Search for a movie…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {(query.trim().length < 2 ? [] : results).map((m) => (
          <button
            key={m.tmdb_id}
            onClick={() => setChosen(m)}
            className={`flex flex-col items-center gap-1 rounded-lg p-1 text-center text-xs ${
              chosen?.tmdb_id === m.tmdb_id ? "bg-amber-500/20 ring-2 ring-amber-400" : "hover:bg-zinc-800"
            }`}
          >
            <Poster movie={m} width={92} />
            <span>
              {m.title} {m.release_year && <span className="text-zinc-500">({m.release_year})</span>}
            </span>
          </button>
        ))}
      </div>
      {chosen && (
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <p className="text-sm">
            Picking <b>{chosen.title}</b>
          </p>
          <input className={`${inputCls} w-full`} maxLength={280} placeholder="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button disabled={busy} onClick={submit}>
            {busy ? "Submitting…" : mine ? "Change my pick" : "Submit pick"}
          </Button>
        </div>
      )}
      {mine && (
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Keep {mine.title}
        </Button>
      )}
      <ErrorText error={error} />
    </Card>
  );
}

// ---------------------------------------------------------------------------

function Vote({ round, state, onChange }: { round: Round; state: LeagueState; onChange: () => void }) {
  const budget = state.league.vote_budget;
  const picks = state.current!.submissions ?? []; // already shuffled per viewer by the server
  const [points, setPoints] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const used = useMemo(() => Object.values(points).reduce((a, b) => a + b, 0), [points]);
  const left = budget - used;

  const bump = (id: string, d: number) =>
    setPoints((p) => {
      const next = Math.max(0, (p[id] ?? 0) + d);
      if (d > 0 && left <= 0) return p;
      return { ...p, [id]: next };
    });

  async function lockIn() {
    if (!confirm("Lock in your votes? You can't change them afterwards.")) return;
    setBusy(true);
    setError(null);
    try {
      await api.castVotes(
        round.id,
        picks
          .filter((p) => !p.is_mine)
          .map((p) => ({ submission_id: p.id, points: points[p.id] ?? 0, comment: comments[p.id]?.trim() || undefined }))
          .filter((v) => v.points > 0 || v.comment),
      );
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="sticky top-2 z-10 flex items-center justify-between">
        <span>
          <b className={left === 0 ? "text-green-400" : "text-amber-400"}>{left}</b> of {budget} points left
        </span>
        <Button disabled={busy || left !== 0} onClick={lockIn}>
          {busy ? "Locking…" : "Lock in votes"}
        </Button>
      </Card>
      {picks.map((p) => (
        <PickCard key={p.id} pick={p}>
          {p.is_mine ? (
            <p className="text-xs text-zinc-500">Your pick — you can&apos;t vote for it.</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="px-3" onClick={() => bump(p.id, -1)}>
                  −
                </Button>
                <span className="w-8 text-center text-xl font-bold">{points[p.id] ?? 0}</span>
                <Button variant="ghost" className="px-3" disabled={left <= 0} onClick={() => bump(p.id, 1)}>
                  +
                </Button>
              </div>
              <input
                className={`${inputCls} w-full text-sm`}
                maxLength={500}
                placeholder="Comment (optional, revealed after the round)"
                value={comments[p.id] ?? ""}
                onChange={(e) => setComments({ ...comments, [p.id]: e.target.value })}
              />
            </>
          )}
        </PickCard>
      ))}
      <ErrorText error={error} />
    </div>
  );
}

function Locked({ state }: { state: LeagueState }) {
  const cur = state.current!;
  const totals = Object.fromEntries((cur.live_totals ?? []).map((t) => [t.submission_id, t.points]));
  const mine = Object.fromEntries((cur.my_votes ?? []).map((v) => [v.submission_id, v.points]));
  const picks = [...(cur.submissions ?? [])].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));
  return (
    <div className="space-y-3">
      <Card className="text-sm">
        🔒 Votes locked. Here are the running totals — the round wraps up when everyone has voted.
      </Card>
      {picks.map((p) => (
        <PickCard key={p.id} pick={p}>
          <p className="text-sm">
            <b className="text-xl">{totals[p.id] ?? 0}</b> pts so far
            {mine[p.id] ? <span className="text-zinc-500"> · you gave {mine[p.id]}</span> : null}
            {p.is_mine && <span className="text-zinc-500"> · your pick</span>}
          </p>
        </PickCard>
      ))}
    </div>
  );
}

function PickCard({ pick, children }: { pick: VotingPick; children: React.ReactNode }) {
  return (
    <Card className="flex gap-4">
      <Poster movie={pick} width={80} />
      <div className="flex-1 space-y-2">
        <p className="font-bold">
          {pick.title} {pick.release_year && <span className="font-normal text-zinc-500">({pick.release_year})</span>}
        </p>
        {pick.note && <p className="text-sm italic text-zinc-400">&ldquo;{pick.note}&rdquo;</p>}
        {children}
      </div>
    </Card>
  );
}
