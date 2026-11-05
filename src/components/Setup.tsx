"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { LeagueState } from "@/lib/types";
import { Avatar, Button, Card, ErrorText, Field, InviteLink, inputCls } from "./ui";

// Commissioner plans the whole season queue before starting; everyone else sees the lobby.
export function Setup({ state, onChange }: { state: LeagueState; onChange: () => void }) {
  const isComm = state.league.is_commissioner;
  const [queue, setQueue] = useState(
    state.rounds.map((r) => ({ theme: r.theme, description: r.description ?? "" })),
  );
  const [draft, setDraft] = useState({ theme: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty =
    JSON.stringify(queue) !== JSON.stringify(state.rounds.map((r) => ({ theme: r.theme, description: r.description ?? "" })));

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

  const move = (i: number, d: number) => {
    const q = [...queue];
    const [x] = q.splice(i, 1);
    q.splice(i + d, 0, x);
    setQueue(q);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">{state.league.name}</h1>
      <Card>
        <p className="text-sm text-zinc-400">
          Lobby · {state.league.vote_budget} vote points · {state.league.submission_days}-day picks ·{" "}
          {state.league.voting_days}-day voting
        </p>
        <p className="mt-2 text-sm">
          Invite code: <InviteLink code={state.league.invite_code} />
        </p>
        <ul className="mt-3 flex flex-wrap gap-3">
          {state.members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2 text-sm">
              <Avatar avatar={m.avatar} size={28} /> {m.display_name}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Season queue</h2>
        {queue.length === 0 && <p className="text-sm text-zinc-500">No rounds yet.</p>}
        <ol className="space-y-2">
          {queue.map((r, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg bg-zinc-950 p-2">
              <span className="w-5 text-zinc-500">{i + 1}.</span>
              <div className="flex-1">
                <p className="font-medium">{r.theme}</p>
                {r.description && <p className="text-xs text-zinc-400">{r.description}</p>}
              </div>
              {isComm && (
                <div className="flex gap-1 text-xs">
                  <button disabled={i === 0} onClick={() => move(i, -1)} className="px-1 disabled:opacity-30">↑</button>
                  <button disabled={i === queue.length - 1} onClick={() => move(i, 1)} className="px-1 disabled:opacity-30">↓</button>
                  <button onClick={() => setQueue(queue.filter((_, j) => j !== i))} className="px-1 text-red-400">✕</button>
                </div>
              )}
            </li>
          ))}
        </ol>
        {isComm && (
          <>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.theme.trim()) return;
                setQueue([...queue, { theme: draft.theme.trim(), description: draft.description.trim() }]);
                setDraft({ theme: "", description: "" });
              }}
            >
              <Field label="Theme">
                <input className={inputCls} maxLength={120} placeholder="e.g. Best heist movie" value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value })} />
              </Field>
              <Field label="Description (optional)">
                <input className={inputCls} maxLength={500} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
              <Button variant="ghost">Add round</Button>
            </form>
            <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
              <Button disabled={busy || !dirty} onClick={() => run(() => api.setQueue(state.league.id, queue))}>
                Save queue
              </Button>
              <Button
                disabled={busy || dirty || queue.length === 0 || state.members.length < 2}
                onClick={() => {
                  if (confirm("Start the season? The queue locks and round 1 opens for submissions.")) {
                    run(() => api.startSeason(state.league.id));
                  }
                }}
              >
                Start season
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              {dirty ? "Save the queue before starting. " : ""}
              Needs at least 1 round and 2 players. The queue can&apos;t change once the season starts.
            </p>
          </>
        )}
        {!isComm && <p className="text-sm text-zinc-400">Waiting for the commissioner to start the season…</p>}
        <ErrorText error={error} />
      </Card>
    </div>
  );
}
