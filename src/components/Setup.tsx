"use client";

import { useState } from "react";
import { ChevronRight, Clapperboard, Plus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { THEMES, sampleThemes } from "@/lib/themes";
import type { LeagueState } from "@/lib/types";
import { Avatar, ErrorText, InviteLink, Marquee, SectionTitle } from "./ui";
import { CommissionerTools } from "./CommissionerTools";

type QueueItem = { theme: string; description: string };

// Commissioner plans the whole season queue before starting; everyone else sees the lobby.
export function Setup({ state, onChange }: { state: LeagueState; onChange: () => void }) {
  const isComm = state.league.is_commissioner;
  const saved = state.rounds.map((r) => ({ theme: r.theme, description: r.description ?? "" }));
  const [queue, setQueue] = useState<QueueItem[]>(saved);
  const [themeInput, setThemeInput] = useState("");
  const [themeSummary, setThemeSummary] = useState("");
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserSample, setBrowserSample] = useState<{ title: string; summary: string }[]>([]); // filled when the browser opens
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(queue) !== JSON.stringify(saved);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const pickTheme = (t: { title: string; summary: string }) => {
    setThemeInput(t.title);
    setThemeSummary(t.summary);
  };
  const surpriseMe = () => {
    const used = new Set(queue.map((q) => q.theme));
    const pool = THEMES.filter((t) => !used.has(t.title));
    pickTheme(pool[Math.floor(Math.random() * pool.length)] ?? THEMES[0]);
  };
  const addToQueue = () => {
    if (!themeInput.trim()) return;
    setQueue([...queue, { theme: themeInput.trim(), description: themeSummary }]);
    setThemeInput("");
    setThemeSummary("");
  };
  const move = (i: number, d: number) => {
    const q = [...queue];
    const [x] = q.splice(i, 1);
    q.splice(i + d, 0, x);
    setQueue(q);
  };

  return (
    <div className="space-y-4">
      <Marquee>
        <div className="text-center">
          <div className="display text-[34px] leading-none" style={{ color: "var(--marquee-gold)" }}>
            {isComm ? "BUILD THE SEASON" : state.league.name}
          </div>
          <div className="mt-1 text-[13px]" style={{ color: "var(--reel-grey)" }}>
            {isComm ? state.league.name : "the lobby — waiting for the commissioner to roll film"}
          </div>
        </div>
      </Marquee>

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users size={16} color="var(--marquee-gold)" />
            <span className="display text-lg tracking-[0.06em]">IN THE LOBBY</span>
          </div>
          <InviteLink code={state.league.invite_code} leagueName={state.league.name} />
        </div>
        <div className="flex flex-wrap gap-3">
          {state.members.map((m) => (
            <span key={m.user_id} className="flex items-center gap-2 text-sm">
              <Avatar avatar={m.avatar} size={30} /> {m.display_name}
              {m.user_id === state.me && <span style={{ color: "var(--reel-grey)" }}>(you)</span>}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[13px]" style={{ color: "var(--reel-grey)" }}>
          <b style={{ color: "var(--screen-white)" }}>{state.league.vote_budget}</b> points per voter ·{" "}
          {state.league.submission_days}-day picks · {state.league.voting_days}-day voting
        </p>
      </div>

      <div className="card p-5">
        <SectionTitle icon={<Clapperboard size={16} color="var(--marquee-gold)" />}>SEASON QUEUE</SectionTitle>
        {isComm && (
          <p className="mb-4 text-[13px]" style={{ color: "var(--reel-grey)" }}>
            Queue every round&apos;s theme now — it locks when the season starts.
          </p>
        )}
        {queue.length === 0 && (
          <p className="mb-3 text-sm" style={{ color: "var(--reel-grey)" }}>
            No rounds queued yet.
          </p>
        )}
        <div className="mb-4 flex flex-col gap-1.5">
          {queue.map((q, i) => (
            <div key={i} className="inset flex items-center gap-3 px-3 py-2">
              <span className="mono w-5" style={{ color: i === 0 ? "var(--marquee-gold)" : "var(--reel-grey)" }}>
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold">{q.theme}</div>
                {q.description && (
                  <div className="text-xs" style={{ color: "var(--reel-grey)" }}>
                    {q.description}
                  </div>
                )}
              </div>
              {isComm && (
                <div className="flex gap-1 text-xs">
                  <button disabled={i === 0} onClick={() => move(i, -1)} className="px-1 disabled:opacity-30">
                    ↑
                  </button>
                  <button disabled={i === queue.length - 1} onClick={() => move(i, 1)} className="px-1 disabled:opacity-30">
                    ↓
                  </button>
                  <button onClick={() => setQueue(queue.filter((_, j) => j !== i))} className="px-1.5" style={{ color: "var(--ticket-red)" }}>
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {isComm && (
          <>
            <div className="flex flex-wrap gap-2">
              <input
                className="field min-w-[180px] flex-1"
                maxLength={120}
                placeholder="e.g. a movie set in one location"
                value={themeInput}
                onChange={(e) => {
                  setThemeInput(e.target.value);
                  setThemeSummary("");
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToQueue())}
              />
              <button onClick={surpriseMe} title="Surprise me" className="btn-ghost px-3.5 text-lg">
                🎲
              </button>
              <button onClick={addToQueue} disabled={!themeInput.trim()} className="btn-primary flex items-center gap-1.5 px-4">
                <Plus size={16} /> Add round
              </button>
            </div>
            <select
              value=""
              onChange={(e) => {
                const t = THEMES.find((x) => x.title === e.target.value);
                if (t) pickTheme(t);
              }}
              className="field mono mt-2 text-sm"
            >
              <option value="">Or pick from all {THEMES.length} theme ideas…</option>
              {THEMES.map((t) => (
                <option key={t.title} value={t.title}>
                  {t.title}
                </option>
              ))}
            </select>
            {themeSummary && (
              <p className="mt-2 text-[13px] italic" style={{ color: "var(--marquee-gold)" }}>
                {themeSummary}
              </p>
            )}
            <button
              onClick={() => {
                if (!showBrowser) setBrowserSample(sampleThemes(8));
                setShowBrowser(!showBrowser);
              }}
              className="btn-ghost mt-3 px-3 py-1.5 text-xs"
              style={{ color: "var(--reel-grey)" }}
            >
              {showBrowser ? "Hide idea cards" : "Browse theme ideas"}
            </button>
            {showBrowser && (
              <div className="mt-3">
                <div className="flex flex-col gap-1.5">
                  {browserSample.map((t) => (
                    <button key={t.title} onClick={() => pickTheme(t)} className="inset px-3 py-2 text-left">
                      <div className="text-sm font-bold">{t.title}</div>
                      <div className="mt-0.5 text-xs" style={{ color: "var(--reel-grey)" }}>
                        {t.summary}
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setBrowserSample(sampleThemes(8))} className="btn-ghost mono mt-2 px-3 py-1.5 text-xs">
                  Show 8 more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isComm && (
        <div className="space-y-2">
          {dirty && (
            <button disabled={busy} onClick={() => run(() => api.setQueue(state.league.id, queue))} className="btn-ghost w-full px-4 py-3">
              Save queue
            </button>
          )}
          <button
            disabled={busy || dirty || queue.length === 0 || state.members.length < 2}
            onClick={() => {
              if (confirm("Start the season? The queue locks and round 1 opens for picks.")) run(() => api.startSeason(state.league.id));
            }}
            className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3.5 text-base"
          >
            <ChevronRight size={18} /> Start the season ({queue.length} round{queue.length === 1 ? "" : "s"})
          </button>
          <p className="text-center text-xs" style={{ color: "var(--reel-grey)" }}>
            {dirty
              ? "Save the queue before starting."
              : state.members.length < 2
                ? "Share the invite — you need at least 2 players to start."
                : "Rounds can't be added or changed once the season starts."}
          </p>
        </div>
      )}
      <ErrorText error={error} />
      <CommissionerTools state={state} onChange={onChange} />
    </div>
  );
}
