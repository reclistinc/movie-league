"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, Clapperboard, Ticket, Trophy, Users } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { LeagueState, Round } from "@/lib/types";
import { BackdropCard } from "./media";
import { Avatar, ErrorText, InviteLink, Marquee, SectionTitle, memberMap, timeLeft } from "./ui";
import { Setup } from "./Setup";
import { RoundPanel } from "./RoundPanel";
import { RoundResults } from "./Results";
import { Chat } from "./Chat";
import { EditMe } from "./EditMe";

type Page = "home" | "round" | "standings" | "chat" | "pastRound";

export function League({ leagueId }: { leagueId: string }) {
  const [state, setState] = useState<LeagueState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [viewingRound, setViewingRound] = useState<string | null>(null);

  const refresh = useCallback(() => {
    api.leagueState(leagueId).then(
      (s) => {
        setState(s);
        setError(null);
      },
      (e) => setError(e.message),
    );
  }, [leagueId]);

  useEffect(() => {
    refresh();
    // Any game change bumps leagues.version → refetch. Polling covers deadline-driven
    // transitions when nobody acts, and reconnects after the phone sleeps.
    const channel = supabase()
      .channel(`league:${leagueId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leagues", filter: `id=eq.${leagueId}` }, refresh)
      .subscribe();
    const timer = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase().removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [leagueId, refresh]);

  if (error && !state) return <ErrorText error={error} />;
  if (!state) return <p style={{ color: "var(--reel-grey)" }}>Loading league…</p>;
  if (state.league.status === "setup") return <Setup state={state} onChange={refresh} />;

  const live = state.rounds.find((r) => r.status === "submitting" || r.status === "voting");
  const cur = state.current;
  const myActionNeeded =
    !!live &&
    !!cur &&
    ((live.status === "submitting" && cur.is_participant && !cur.my_submission) ||
      (live.status === "voting" && cur.is_voter && !cur.ballot_locked));

  const tabs = [
    { id: "home" as const, label: "Home", Icon: Users },
    { id: "round" as const, label: "Round", Icon: Clapperboard },
    { id: "standings" as const, label: "Standings", Icon: Trophy },
    { id: "chat" as const, label: "Chat", Icon: Ticket },
  ];

  const viewing = viewingRound ? state.rounds.find((r) => r.id === viewingRound) : null;

  return (
    <div>
      <Marquee>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="display text-[32px] leading-none" style={{ color: "var(--marquee-gold)" }}>
            {state.league.name}
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--screen-white)" }}>
            <Users size={15} /> {state.members.length}
          </span>
        </div>
      </Marquee>

      <nav className="mt-3.5 flex gap-1.5">
        {tabs.map(({ id, label, Icon }) => {
          const active = page === id || (id === "home" && page === "pastRound");
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[13px] ${active ? "font-bold" : "mono"}`}
              style={{
                border: active ? "1px solid var(--marquee-gold)" : "1px solid rgba(245,241,230,0.25)",
                background: active ? "rgba(240,180,41,0.15)" : "rgba(18,19,31,0.85)",
                color: active ? "var(--marquee-gold)" : "var(--screen-white)",
              }}
            >
              <Icon size={14} /> {label}
              {id === "round" && myActionNeeded && (
                <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full" style={{ background: "var(--ticket-red)" }} />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-4">
        <ErrorText error={error} />
        {page === "home" && (
          <HomeTab
            state={state}
            onChange={refresh}
            goToRound={() => setPage("round")}
            openRound={(id) => {
              setViewingRound(id);
              setPage("pastRound");
            }}
          />
        )}
        {page === "pastRound" && viewing && (
          <div>
            <button onClick={() => setPage("home")} className="btn-ghost mb-3 px-3 py-1.5 text-[13px]">
              ← Back to Home
            </button>
            <RoundResults round={viewing} picks={state.results[viewing.id] ?? []} state={state} />
          </div>
        )}
        {page === "round" && <RoundPanel state={state} onChange={refresh} />}
        {page === "standings" && <Standings state={state} />}
        {page === "chat" && <Chat state={state} />}
      </div>
    </div>
  );
}

function HomeTab({
  state,
  onChange,
  goToRound,
  openRound,
}: {
  state: LeagueState;
  onChange: () => void;
  goToRound: () => void;
  openRound: (id: string) => void;
}) {
  const live = state.rounds.find((r) => r.status === "submitting" || r.status === "voting");
  const queued = state.rounds.filter((r) => r.status === "queued");
  const done = state.rounds.filter((r) => r.status === "complete").reverse();
  const byId = memberMap(state.members);
  const champion = state.league.status === "complete" ? byId[state.standings[0]?.user_id] : null;

  return (
    <div className="space-y-3.5">
      {champion && (
        <div className="card p-5 text-center">
          <Trophy size={26} color="var(--marquee-gold)" className="mx-auto" />
          <div className="label mt-1">Season champion</div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Avatar avatar={champion.avatar} size={40} />
            <span className="display text-3xl" style={{ color: "var(--marquee-gold)" }}>
              {champion.display_name}
            </span>
          </div>
        </div>
      )}

      <div className="card p-4">
        <SectionTitle icon={<Users size={16} color="var(--marquee-gold)" />}>THE LEAGUE</SectionTitle>
        <div className="flex flex-col gap-1.5">
          {state.members.map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center gap-2.5 px-1 py-1">
              <Avatar avatar={m.avatar} size={28} />
              <span className={m.user_id === state.me ? "font-bold" : ""}>
                {m.display_name}
                {m.user_id === state.me && " (you)"}
              </span>
              {m.user_id === state.league.commissioner_id && (
                <span className="mono text-[10px] uppercase" style={{ color: "var(--marquee-gold)" }}>
                  commish
                </span>
              )}
              {m.user_id === state.me && <EditMe state={state} onChange={onChange} />}
            </div>
          ))}
        </div>
        {state.league.status === "active" && (
          <p className="mt-3 text-xs" style={{ color: "var(--reel-grey)" }}>
            Invite more: <InviteLink code={state.league.invite_code} />
          </p>
        )}
      </div>

      <div className="card p-4">
        <SectionTitle icon={<Clapperboard size={16} color="var(--marquee-gold)" />}>CURRENT ROUND</SectionTitle>
        {live ? (
          <LiveRound round={live} state={state} onOpen={goToRound} />
        ) : (
          <p className="text-[13px]" style={{ color: "var(--reel-grey)" }}>
            {state.league.status === "complete" ? "That's a wrap — the season is over." : "No round in progress right now."}
          </p>
        )}
      </div>

      {queued.length > 0 && (
        <div className="card p-4">
          <SectionTitle icon={<Ticket size={16} color="var(--marquee-gold)" />}>UPCOMING ROUNDS</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {queued.map((q, i) => (
              <div key={q.id} className="inset flex items-center gap-2.5 px-3 py-2">
                <span className="mono w-6" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)" }}>
                  {q.position}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{q.theme}</div>
                  {q.description && (
                    <div className="text-xs" style={{ color: "var(--reel-grey)" }}>
                      {q.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="card p-4">
          <SectionTitle icon={<Trophy size={16} color="var(--marquee-gold)" />}>COMPLETED ROUNDS</SectionTitle>
          <div className="flex flex-col gap-2">
            {done.map((r) => {
              const winner = (state.results[r.id] ?? [])[0];
              return (
                <button key={r.id} onClick={() => openRound(r.id)} className="inset w-full overflow-hidden text-left">
                  <BackdropCard tmdbId={winner?.tmdb_id}>
                    <div className="flex items-center gap-2.5 px-3 py-3">
                      <span className="mono w-6" style={{ color: "var(--reel-grey)" }}>
                        {r.position}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-bold">{r.theme}</div>
                        {winner && winner.points > 0 && (
                          <div className="text-xs" style={{ color: "var(--reel-grey)" }}>
                            Won by <span style={{ color: "var(--screen-white)" }}>{winner.title}</span> · picked by{" "}
                            {byId[winner.user_id]?.display_name}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} color="var(--reel-grey)" />
                    </div>
                  </BackdropCard>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveRound({ round, state, onOpen }: { round: Round; state: LeagueState; onOpen: () => void }) {
  const submitting = round.status === "submitting";
  const deadline = submitting ? round.submission_deadline : round.voting_deadline;
  return (
    <div>
      <button onClick={onOpen} className="w-full text-left">
        <div className="text-xs" style={{ color: "var(--reel-grey)" }}>
          Round {round.position} · {submitting ? "Submitting" : "Voting"}
        </div>
        <div className="display mt-0.5 text-[24px] leading-tight" style={{ color: "var(--marquee-gold)" }}>
          {round.theme}
        </div>
        <div className="mono mb-2.5 text-xs" style={{ color: "var(--reel-grey)" }}>
          {submitting ? "Submissions" : "Voting"} {timeLeft(deadline)}
        </div>
      </button>
      <div className="flex flex-col gap-1.5">
        {state.members.map((m) => {
          const inRound = round.participant_ids.includes(m.user_id);
          const done = submitting ? round.submitted_ids.includes(m.user_id) : round.voted_ids.includes(m.user_id);
          return (
            <div key={m.user_id} className="flex items-center gap-2 text-sm">
              <Avatar avatar={m.avatar} size={22} />
              {done ? (
                <Check size={15} color="var(--marquee-gold)" />
              ) : (
                <span className="inline-block h-[15px] w-[15px] rounded-full" style={{ border: "1px solid var(--reel-grey)" }} />
              )}
              <span style={{ color: done ? "var(--screen-white)" : "var(--reel-grey)" }}>
                {m.display_name}
                {m.user_id === state.me && " (you)"} —{" "}
                {!inRound ? "joins next round" : submitting ? (done ? "submitted" : "hasn't submitted yet") : done ? "voted" : "hasn't voted yet"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Standings({ state }: { state: LeagueState }) {
  const byId = memberMap(state.members);
  const completed = state.rounds.filter((r) => r.status === "complete").length;
  return (
    <div className="card p-4">
      <SectionTitle icon={<Trophy size={16} color="var(--marquee-gold)" />}>STANDINGS</SectionTitle>
      {completed === 0 ? (
        <p className="text-[13px]" style={{ color: "var(--reel-grey)" }}>
          No scores yet — finish a round to see the board light up.
        </p>
      ) : (
        <>
          <div className="flex flex-col">
            {state.standings.map((s, i) => {
              const m = byId[s.user_id];
              return (
                <div
                  key={s.user_id}
                  className="flex items-center justify-between px-1 py-2"
                  style={{ borderBottom: i === state.standings.length - 1 ? "none" : "1px solid rgba(107,111,138,0.15)" }}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="mono w-5" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)" }}>
                      {i + 1}
                    </span>
                    <Avatar avatar={m?.avatar ?? ""} size={26} />
                    <span className={s.user_id === state.me ? "font-bold" : ""}>
                      {m?.display_name}
                      {s.user_id === state.me && " (you)"}
                    </span>
                    {s.round_wins > 0 && (
                      <span className="mono text-[11px]" style={{ color: "var(--marquee-gold)" }}>
                        {s.round_wins}× 🏆
                      </span>
                    )}
                  </span>
                  <span className="mono" style={{ color: "var(--marquee-gold)" }}>
                    {s.points} pts
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--reel-grey)" }}>
            After {completed} round{completed === 1 ? "" : "s"} · updates once every vote in a round is in
          </p>
        </>
      )}
    </div>
  );
}
