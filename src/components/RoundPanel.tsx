"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clapperboard, Lock, Ticket } from "lucide-react";
import { api } from "@/lib/api";
import type { LeagueState, Movie, Round, VotingPick } from "@/lib/types";
import { BackdropCard, TrailerButton, useMovieDetails } from "./media";
import { RoundResults } from "./Results";
import { matchTier, rankMovies } from "@/lib/rank";
import { GifPicker, PickGif } from "./GifPicker";
import { ErrorText, Poster, timeLeft } from "./ui";

export function RoundPanel({ state, onChange }: { state: LeagueState; onChange: () => void }) {
  const round = state.rounds.find((r) => r.id === state.current?.round_id);
  const [gateDismissed, setGateDismissed] = useState<string | null>(null); // "<round>:<phase>"

  if (!round || !state.current) {
    const last = [...state.rounds].reverse().find((r) => r.status === "complete");
    if (last) return <RoundResults round={last} picks={state.results[last.id] ?? []} state={state} />;
    return <div className="card p-5">No round is open right now.</div>;
  }

  const cur = state.current;
  const gateKey = `${round.id}:${round.status}`;
  const needsAction =
    (round.status === "submitting" && cur.is_participant && !cur.my_submission) ||
    (round.status === "voting" && cur.is_voter && !cur.ballot_locked);

  // Per-player gate screen, as in the prototype.
  if (needsAction && gateDismissed !== gateKey) {
    const voting = round.status === "voting";
    const me = state.members.find((m) => m.user_id === state.me);
    return (
      <div className="card p-6 text-center">
        {voting ? <Ticket size={24} color="var(--marquee-gold)" className="mx-auto mb-2" /> : <Clapperboard size={24} color="var(--marquee-gold)" className="mx-auto mb-2" />}
        <div className="label">Round {round.position} · theme</div>
        <div className="display mt-0.5 text-[28px] leading-tight" style={{ color: "var(--marquee-gold)" }}>
          {round.theme}
        </div>
        {round.description && (
          <p className="mt-1 text-sm italic" style={{ color: "var(--reel-grey)" }}>
            {round.description}
          </p>
        )}
        <p className="mt-3">
          Hi {me?.display_name} — {voting ? "you haven't voted on this round yet." : "you haven't submitted a movie yet."}
        </p>
        <p className="mono mt-1 text-xs" style={{ color: "var(--reel-grey)" }}>
          {voting ? "Voting" : "Submissions"} {timeLeft(voting ? round.voting_deadline : round.submission_deadline)}
        </p>
        <button onClick={() => setGateDismissed(gateKey)} className="btn-primary mt-5 px-6 py-3">
          {voting ? "Begin Voting" : "Start My Submission"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ThemeHeader round={round} />
      {round.status === "submitting" &&
        (cur.is_participant ? (
          <Submit round={round} state={state} onChange={onChange} />
        ) : (
          <div className="card p-5 text-sm">You joined after this round opened — you&apos;re in from the next one.</div>
        ))}
      {round.status === "voting" &&
        (cur.ballot_locked ? (
          <Locked state={state} round={round} />
        ) : cur.is_voter ? (
          <Vote round={round} state={state} onChange={onChange} />
        ) : (
          <div className="card p-5 text-sm">You&apos;re not voting in this round. Results appear when voting closes.</div>
        ))}
    </div>
  );
}

function ThemeHeader({ round }: { round: Round }) {
  const voting = round.status === "voting";
  const deadline = voting ? round.voting_deadline : round.submission_deadline;
  const left = timeLeft(deadline);
  const late = left === "Deadline passed";
  return (
    <div className="card p-5">
      <div className="label">{voting ? "Voting now" : "Now showing"} · round {round.position} theme</div>
      <div className="display mt-0.5 text-[28px] leading-tight" style={{ color: "var(--marquee-gold)" }}>
        {round.theme}
      </div>
      {round.description && (
        <p className="text-sm italic" style={{ color: "var(--reel-grey)" }}>
          {round.description}
        </p>
      )}
      <p className="mono mt-1 text-xs" style={{ color: late ? "var(--ticket-red)" : "var(--reel-grey)" }}>
        {voting ? "Voting" : "Submissions"} {left}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submitting
// ---------------------------------------------------------------------------

function Submit({ round, state, onChange }: { round: Round; state: LeagueState; onChange: () => void }) {
  const mine = state.current!.my_submission;
  const [editing, setEditing] = useState(!mine);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState<Movie | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [note, setNote] = useState(""); // starts empty; your saved pick + note stay untouched until you confirm
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waitingOn = round.participant_ids.length - round.submitted_ids.length;

  useEffect(() => {
    if (query.trim().length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      setSearching(true);
      api
        .searchMovies(query)
        .then(
          (r) => {
            if (!live) return;
            // Keep earlier results that still fit what's typed, so a good match found one
            // keystroke ago doesn't vanish when TMDb's matching wobbles.
            setResults((prev) => {
              const ids = new Set(r.map((m) => m.tmdb_id));
              const carried = prev.filter((m) => !ids.has(m.tmdb_id) && matchTier(query, m.title) >= 3);
              const rankable = (m: Movie) => ({ ...m, vote_count: m.vote_count ?? 0, popularity: m.popularity ?? 0 });
              return rankMovies(query, [...r, ...carried].map(rankable)).slice(0, 12);
            });
          },
          (e) => live && setError(e.message),
        )
        .finally(() => live && setSearching(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);

  async function submit() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      await api.submitPick(round.id, chosen, note, gifUrl);
      setEditing(false);
      setChosen(null);
      setGifUrl(null);
      setNote("");
      setQuery("");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const status = (
    <p className="text-[13px]" style={{ color: "var(--reel-grey)" }}>
      {round.submitted_ids.length} of {round.participant_ids.length} have submitted
      {waitingOn > 0 && " — names stay hidden until results"}
    </p>
  );

  if (mine && !editing) {
    return (
      <>
        <BackdropCard tmdbId={mine.tmdb_id} strong className="card overflow-hidden">
          <div className="flex gap-4 p-5">
            <Poster movie={mine} width={110} />
            <div className="min-w-0 flex-1">
              <div className="mono flex items-center gap-1.5 text-xs uppercase" style={{ color: "var(--marquee-gold)" }}>
                <Check size={14} /> Your pick is in
              </div>
              <div className="display mt-1 text-3xl leading-tight">{mine.title}</div>
              <div className="mono text-sm" style={{ color: "var(--reel-grey)" }}>
                {mine.release_year}
              </div>
              {mine.note && <p className="mt-2 text-sm italic">&ldquo;{mine.note}&rdquo;</p>}
              <PickGif url={mine.gif_url} />
              <div className="mt-3 flex flex-wrap gap-2">
                <TrailerButton tmdbId={mine.tmdb_id} title={mine.title} />
                <button onClick={() => setEditing(true)} className="btn-ghost px-3 py-1.5 text-sm">
                  Change my submission
                </button>
              </div>
            </div>
          </div>
        </BackdropCard>
        {status}
        <p className="text-xs" style={{ color: "var(--reel-grey)" }}>
          You can change your pick until everyone has submitted — then voting opens automatically.
        </p>
      </>
    );
  }

  const shown = query.trim().length < 2 ? [] : results;

  return (
    <div className="card space-y-4 p-5">
      {status}
      {chosen ? (
        <>
          <ChosenPreview
            movie={chosen}
            onClear={() => {
              setChosen(null);
              setGifUrl(null);
            }}
          />
          <GifPicker key={chosen.tmdb_id} movieTitle={chosen.title} value={gifUrl} onChange={setGifUrl} />
        </>
      ) : (
        <>
          <input className="field" autoFocus placeholder="Search for your pick…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {searching && shown.length === 0 && (
            <p className="text-sm" style={{ color: "var(--reel-grey)" }}>
              Searching…
            </p>
          )}
          {shown.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {shown.map((m) => (
                <button key={m.tmdb_id} onClick={() => setChosen(m)} className="group flex flex-col items-center gap-1.5 text-center">
                  <div className="transition group-hover:scale-[1.03]">
                    <Poster movie={m} width={100} />
                  </div>
                  <span className="text-xs leading-tight">
                    {m.title}{" "}
                    {m.release_year && <span style={{ color: "var(--reel-grey)" }}>({m.release_year})</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div>
        <div className="label mb-2">Why this pick fits the theme (optional)</div>
        <textarea
          className="field resize-y"
          rows={2}
          maxLength={280}
          placeholder={mine?.note ? `Currently: “${mine.note}” — leave blank to drop it` : "Say a word or two about why you picked this…"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {chosen && (
          <button disabled={busy} onClick={submit} className="btn-primary px-5 py-2.5">
            {busy ? "Locking in…" : mine ? "Update submission" : "Lock in submission"}
          </button>
        )}
        {mine && (
          <button
            onClick={() => {
              setEditing(false);
              setChosen(null);
              setGifUrl(null);
              setNote("");
            }}
            className="btn-ghost px-5 py-2.5"
          >
            Cancel
          </button>
        )}
      </div>
      {!chosen && (
        <p className="text-xs" style={{ color: "var(--reel-grey)" }}>
          Pick a movie above to finish your submission.
        </p>
      )}
      <ErrorText error={error} />
    </div>
  );
}

function ChosenPreview({ movie, onClear }: { movie: Movie; onClear: () => void }) {
  const d = useMovieDetails(movie.tmdb_id);
  return (
    <BackdropCard tmdbId={movie.tmdb_id} strong className="overflow-hidden rounded-lg border" >
      <div className="flex gap-4 p-4" style={{ borderColor: "var(--marquee-gold)" }}>
        <Poster movie={movie} width={92} />
        <div className="min-w-0 flex-1">
          <div className="display text-2xl leading-tight">{movie.title}</div>
          <div className="mono text-xs" style={{ color: "var(--reel-grey)" }}>
            {[movie.release_year, d?.runtime ? `${d.runtime} min` : null, d?.genres.slice(0, 2).join(" / ")].filter(Boolean).join(" · ")}
          </div>
          {d?.overview && <p className="mt-2 line-clamp-3 text-[13px]">{d.overview}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <TrailerButton tmdbId={movie.tmdb_id} title={movie.title} compact />
            <button onClick={onClear} className="btn-ghost px-2.5 py-1 text-xs">
              Change
            </button>
          </div>
        </div>
      </div>
    </BackdropCard>
  );
}

// ---------------------------------------------------------------------------
// Voting
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
      if (d > 0 && left <= 0) return p;
      return { ...p, [id]: Math.max(0, (p[id] ?? 0) + d) };
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
      <div className="card sticky top-2 z-20 flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm">
          <b className="mono text-lg" style={{ color: left === 0 ? "var(--marquee-gold)" : "var(--screen-white)" }}>
            {left}
          </b>{" "}
          of {budget} points left
        </span>
        <button disabled={busy || left !== 0} onClick={lockIn} className="btn-primary px-4 py-2 text-sm">
          {busy ? "Locking…" : left === 0 ? "Lock in my votes" : `Use all ${budget} points`}
        </button>
      </div>
      {picks.map((p) => (
        <PickTicket key={p.id} pick={p}>
          {p.is_mine ? (
            <span className="text-xs" style={{ color: "var(--reel-grey)" }}>
              This is your submission — you can&apos;t give it points
            </span>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <button disabled={(points[p.id] ?? 0) === 0} onClick={() => bump(p.id, -1)} className="btn-ghost mono h-8 w-8">
                  −
                </button>
                <span className="mono w-7 text-center text-lg">{points[p.id] ?? 0}</span>
                <button disabled={left <= 0} onClick={() => bump(p.id, 1)} className="btn-ghost mono h-8 w-8">
                  +
                </button>
                <span className="text-xs" style={{ color: "var(--reel-grey)" }}>
                  pts
                </span>
              </div>
              <input
                className="field mt-2 py-2 text-[13px]"
                maxLength={500}
                placeholder="Add a comment (optional)"
                value={comments[p.id] ?? ""}
                onChange={(e) => setComments({ ...comments, [p.id]: e.target.value })}
              />
            </>
          )}
        </PickTicket>
      ))}
      <p className="text-[13px]" style={{ color: "var(--reel-grey)" }}>
        {round.voted_ids.length} of {round.participant_ids.length} have locked in — names and comments stay hidden until everyone&apos;s voted.
      </p>
      <ErrorText error={error} />
    </div>
  );
}

function Locked({ state, round }: { state: LeagueState; round: Round }) {
  const cur = state.current!;
  const totals = Object.fromEntries((cur.live_totals ?? []).map((t) => [t.submission_id, t.points]));
  const mine = Object.fromEntries((cur.my_votes ?? []).map((v) => [v.submission_id, v.points]));
  const picks = [...(cur.submissions ?? [])].sort((a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0));
  return (
    <div className="space-y-3">
      <div className="card flex items-center gap-2 px-4 py-3 text-sm">
        <Lock size={15} color="var(--marquee-gold)" /> Votes locked. Running totals below — results reveal when everyone&apos;s in (
        {round.voted_ids.length}/{round.participant_ids.length}).
      </div>
      {picks.map((p) => (
        <PickTicket key={p.id} pick={p}>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--marquee-gold)" }}>
            {p.is_mine ? "Your pick" : (
              <>
                <Check size={14} /> You gave this {mine[p.id] ?? 0} pts
              </>
            )}
          </span>
          <div className="mt-2 border-t border-dashed pt-2 text-xs" style={{ borderColor: "rgba(107,111,138,0.25)", color: "var(--reel-grey)" }}>
            Current total so far:{" "}
            <span className="mono" style={{ color: "var(--marquee-gold)" }}>
              {totals[p.id] ?? 0} pts
            </span>
          </div>
        </PickTicket>
      ))}
    </div>
  );
}

function PickTicket({ pick, children }: { pick: VotingPick; children: React.ReactNode }) {
  return (
    <div className="ticket">
      <BackdropCard tmdbId={pick.tmdb_id} className="flex w-full">
        <div className="flex w-full">
          <div className="shrink-0 p-2.5">
            <Poster movie={pick} width={76} />
          </div>
          <div className="stub-divider min-w-0 flex-1 px-3.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold">
                {pick.title}{" "}
                <span className="mono font-normal" style={{ color: "var(--reel-grey)" }}>
                  {pick.release_year}
                </span>
              </div>
              <TrailerButton tmdbId={pick.tmdb_id} title={pick.title} compact />
            </div>
            {pick.note && (
              <div className="mt-1 text-[13px]" style={{ color: "var(--reel-grey)" }}>
                {pick.note}
              </div>
            )}
            <PickGif url={pick.gif_url} />
            <div className="mt-2.5">{children}</div>
          </div>
        </div>
      </BackdropCard>
    </div>
  );
}
