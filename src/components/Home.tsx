"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Clapperboard, Plus, Ticket } from "lucide-react";
import { api } from "@/lib/api";
import type { LeagueSummary } from "@/lib/types";
import { AvatarPicker, ErrorText, Field, Marquee, SectionTitle, timeLeft } from "./ui";

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
      <Marquee>
        <div className="text-center">
          <div className="display text-[34px] leading-none" style={{ color: "var(--marquee-gold)" }}>
            NOW SHOWING
          </div>
          <div className="mt-1 text-[13px]" style={{ color: "var(--reel-grey)" }}>
            your leagues
          </div>
        </div>
      </Marquee>
      <ErrorText error={error} />
      {leagues?.length === 0 && (
        <div className="card p-5 text-sm" style={{ color: "var(--reel-grey)" }}>
          No leagues yet — start one, or join a friend&apos;s with their invite code.
        </div>
      )}
      {leagues?.map((l) => (
        <Link key={l.id} href={`/?league=${l.id}`} className="ticket block hover:border-[var(--marquee-gold)]">
          <div className="flex w-16 shrink-0 items-center justify-center">
            <Clapperboard size={22} color="var(--marquee-gold)" />
          </div>
          <div className="stub-divider flex-1 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="display text-2xl" style={{ color: "var(--marquee-gold)" }}>
                {l.name}
              </span>
              <span className="mono text-[11px] uppercase" style={{ color: "var(--reel-grey)" }}>
                {l.status === "setup" ? "in setup" : l.status}
              </span>
            </div>
            <p className="text-[13px]" style={{ color: "var(--reel-grey)" }}>
              {l.member_count} players{l.is_commissioner && " · you're the commissioner"}
            </p>
            {l.live_round && (
              <p className="mono mt-1 text-xs">
                “{l.live_round.theme}” — {l.live_round.status === "submitting" ? "picks open" : "voting open"} ·{" "}
                {timeLeft(l.live_round.deadline)}
              </p>
            )}
          </div>
        </Link>
      ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => setCreating(true)} className="btn-primary flex items-center justify-center gap-2 px-4 py-3">
          <Plus size={16} /> Start a new league
        </button>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) router.push(`/?join=${encodeURIComponent(joinCode.trim())}`);
          }}
        >
          <input className="field mono flex-1" placeholder="Invite code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <button className="btn-ghost flex items-center gap-1 px-3">
            <Ticket size={15} /> Join
          </button>
        </form>
      </div>
    </div>
  );
}

function Stepper({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="btn-ghost mono h-9 w-9">
        −
      </button>
      <span className="mono w-12 text-center text-xl">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} className="btn-ghost mono h-9 w-9">
        +
      </button>
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
      const id = await api.createLeague({
        name: name.trim() || "Movie League",
        displayName,
        avatar,
        voteBudget,
        submissionDays,
        votingDays,
      });
      router.push(`/?league=${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="space-y-4">
      <Marquee>
        <div className="text-center">
          <div className="display text-[34px] leading-none" style={{ color: "var(--marquee-gold)" }}>
            CREATE YOUR GAME
          </div>
          <div className="mt-1 text-[13px]" style={{ color: "var(--reel-grey)" }}>
            you&apos;ll plan the season next, before anyone gets an invite
          </div>
        </div>
      </Marquee>

      <div className="card space-y-4 p-5">
        <Field label="League name">
          <input className="field" maxLength={80} placeholder="e.g. The Sunday Night Movie League" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div>
          <div className="label mb-2">Points per voter</div>
          <Stepper value={voteBudget} onChange={setVoteBudget} min={5} max={100} step={5} />
          <p className="mt-1.5 text-xs" style={{ color: "var(--reel-grey)" }}>
            Each voter spreads this many points across other players&apos; picks every round.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="label mb-2">Days to pick</div>
            <Stepper value={submissionDays} onChange={setSubmissionDays} min={1} max={30} />
          </div>
          <div>
            <div className="label mb-2">Days to vote</div>
            <Stepper value={votingDays} onChange={setVotingDays} min={1} max={30} />
          </div>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <SectionTitle>YOUR SEAT</SectionTitle>
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <input className="field mono" required maxLength={40} placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <ErrorText error={error} />
      <div className="flex gap-2">
        <button className="btn-primary flex flex-1 items-center justify-center gap-2 px-4 py-3 text-base" disabled={busy}>
          <ChevronRight size={18} /> {busy ? "Creating…" : "Create & plan the season"}
        </button>
        <button type="button" className="btn-ghost px-4" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
