"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { LeagueSummary } from "@/lib/types";
import { AvatarPicker, Button, Card, ErrorText, Field, inputCls, timeLeft } from "./ui";

export function Home() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.myLeagues().then(setLeagues, (e) => setError(e.message));
  }, []);

  if (creating) return <CreateLeague onCancel={() => setCreating(false)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Your leagues</h1>
        <Button onClick={() => setCreating(true)}>+ New league</Button>
      </div>
      <ErrorText error={error} />
      {leagues?.length === 0 && <p className="text-sm text-zinc-400">No leagues yet — start one or join with a code.</p>}
      {leagues?.map((l) => (
        <Link key={l.id} href={`/?league=${l.id}`} className="block">
          <Card className="hover:ring-amber-400/50">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{l.name}</span>
              <span className="text-xs uppercase text-zinc-500">{l.status}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {l.member_count} players{l.is_commissioner && " · you're commissioner"}
              {l.live_round &&
                ` · "${l.live_round.theme}" — ${l.live_round.status} (${timeLeft(l.live_round.deadline)})`}
            </p>
          </Card>
        </Link>
      ))}
      <Card>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) router.push(`/?join=${encodeURIComponent(joinCode.trim())}`);
          }}
        >
          <input className={`${inputCls} flex-1`} placeholder="Invite code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <Button variant="ghost">Join</Button>
        </form>
      </Card>
    </div>
  );
}

function CreateLeague({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("detective");
  const [voteBudget, setVoteBudget] = useState(20);
  const [submissionDays, setSubmissionDays] = useState(5);
  const [votingDays, setVotingDays] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const id = await api.createLeague({ name, displayName, avatar, voteBudget, submissionDays, votingDays });
      router.push(`/?league=${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={create} className="space-y-4">
        <h1 className="text-lg font-bold">New league</h1>
        <Field label="League name">
          <input className={inputCls} required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Vote points">
            <input className={inputCls} type="number" min={1} max={100} value={voteBudget} onChange={(e) => setVoteBudget(+e.target.value)} />
          </Field>
          <Field label="Submit days">
            <input className={inputCls} type="number" min={1} max={30} value={submissionDays} onChange={(e) => setSubmissionDays(+e.target.value)} />
          </Field>
          <Field label="Vote days">
            <input className={inputCls} type="number" min={1} max={30} value={votingDays} onChange={(e) => setVotingDays(+e.target.value)} />
          </Field>
        </div>
        <Field label="Your name in this league">
          <input className={inputCls} required maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <ErrorText error={error} />
        <div className="flex gap-2">
          <Button disabled={busy}>{busy ? "Creating…" : "Create league"}</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
