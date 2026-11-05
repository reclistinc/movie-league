"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { LeagueState } from "@/lib/types";
import { Avatar, Card, ErrorText, InviteLink, memberMap, timeLeft } from "./ui";
import { Setup } from "./Setup";
import { RoundPanel } from "./RoundPanel";
import { Results } from "./Results";
import { Chat } from "./Chat";

type Tab = "home" | "round" | "standings" | "chat";

export function League({ leagueId }: { leagueId: string }) {
  const [state, setState] = useState<LeagueState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");

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
  if (!state) return <p className="text-zinc-500">Loading league…</p>;

  if (state.league.status === "setup") return <Setup state={state} onChange={refresh} />;

  const tabs: [Tab, string][] = [
    ["home", "Home"],
    ["round", "Round"],
    ["standings", "Standings"],
    ["chat", "Chat"],
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">{state.league.name}</h1>
      <nav className="flex gap-1 rounded-xl bg-zinc-900 p-1">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === k ? "bg-amber-400 text-zinc-950" : "text-zinc-400"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <ErrorText error={error} />
      {tab === "home" && <HomeTab state={state} goToRound={() => setTab("round")} />}
      {tab === "round" && <RoundPanel state={state} onChange={refresh} />}
      {tab === "standings" && <Standings state={state} />}
      {tab === "chat" && <Chat state={state} />}
    </div>
  );
}

function HomeTab({ state, goToRound }: { state: LeagueState; goToRound: () => void }) {
  const live = state.rounds.find((r) => r.status === "submitting" || r.status === "voting");
  const queued = state.rounds.filter((r) => r.status === "queued");
  const done = state.rounds.filter((r) => r.status === "complete").reverse();
  const byId = memberMap(state.members);

  return (
    <div className="space-y-4">
      {state.league.status === "complete" && (
        <Card className="text-center">
          🏆 Season complete! Champion: <b>{byId[state.standings[0]?.user_id]?.display_name}</b>
        </Card>
      )}
      {live && (
        <Card>
          <button onClick={goToRound} className="w-full text-left">
            <p className="text-xs uppercase text-amber-400">
              Round {live.position} · {live.status === "submitting" ? "Submissions open" : "Voting open"} ·{" "}
              {timeLeft(live.status === "submitting" ? live.submission_deadline : live.voting_deadline)}
            </p>
            <p className="text-lg font-bold">{live.theme}</p>
            {live.description && <p className="text-sm text-zinc-400">{live.description}</p>}
          </button>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 font-semibold">Players</h2>
        <ul className="space-y-2">
          {state.members.map((m) => {
            let status = "";
            if (live) {
              if (!live.participant_ids.includes(m.user_id)) status = "joins next round";
              else if (live.status === "submitting") status = live.submitted_ids.includes(m.user_id) ? "✅ submitted" : "⏳ picking";
              else status = live.voted_ids.includes(m.user_id) ? "✅ voted" : "⏳ voting";
            }
            return (
              <li key={m.user_id} className="flex items-center gap-3">
                <Avatar avatar={m.avatar} />
                <span className="flex-1">
                  {m.display_name}
                  {m.user_id === state.league.commissioner_id && <span className="ml-1 text-xs text-amber-400">★</span>}
                  {m.user_id === state.me && <span className="ml-1 text-xs text-zinc-500">(you)</span>}
                </span>
                <span className="text-xs text-zinc-400">{status}</span>
              </li>
            );
          })}
        </ul>
        {state.league.status === "active" && (
          <p className="mt-3 text-xs text-zinc-500">
            Invite more friends: <InviteLink code={state.league.invite_code} />
          </p>
        )}
      </Card>

      {queued.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">Up next</h2>
          <ol className="space-y-1 text-sm text-zinc-300">
            {queued.map((r) => (
              <li key={r.id}>
                {r.position}. {r.theme}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {done.map((r) => (
        <Results key={r.id} round={r} picks={state.results[r.id] ?? []} state={state} />
      ))}
    </div>
  );
}

function Standings({ state }: { state: LeagueState }) {
  const byId = memberMap(state.members);
  const completed = state.rounds.filter((r) => r.status === "complete").length;
  return (
    <Card>
      <h2 className="mb-1 font-semibold">Leaderboard</h2>
      <p className="mb-3 text-xs text-zinc-500">
        After {completed} round{completed === 1 ? "" : "s"} · updates when a round&apos;s votes are all in
      </p>
      <ol className="space-y-2">
        {state.standings.map((s, i) => {
          const m = byId[s.user_id];
          return (
            <li key={s.user_id} className="flex items-center gap-3">
              <span className="w-6 text-right font-mono text-zinc-500">{i + 1}</span>
              <Avatar avatar={m?.avatar ?? ""} />
              <span className="flex-1">{m?.display_name}</span>
              {s.round_wins > 0 && <span className="text-xs text-amber-400">{s.round_wins}× 🏆</span>}
              <span className="w-12 text-right font-bold">{s.points}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
