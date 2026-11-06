"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Eye, Film, Heart, Trophy, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Member, PlayerCard as Card } from "@/lib/types";
import { Avatar, Poster } from "./ui";
import { AVATAR_MAP } from "./art";

// ---------------------------------------------------------------------------
// Tap any player's avatar or name to open their card.
// ---------------------------------------------------------------------------

type Ctx = { open: (userId: string) => void };
const PlayerCardContext = createContext<Ctx | null>(null);

export function PlayerCardProvider({
  leagueId,
  members,
  me,
  children,
}: {
  leagueId: string;
  members: Member[];
  me: string;
  children: ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const close = useCallback(() => setUserId(null), []);
  return (
    <PlayerCardContext.Provider value={{ open: setUserId }}>
      {children}
      {userId && (
        <PlayerCardModal key={userId} leagueId={leagueId} userId={userId} members={members} me={me} onClose={close} />
      )}
    </PlayerCardContext.Provider>
  );
}

/** Wraps an avatar and/or name so tapping it opens that player's card. Plain content outside a league. */
export function PlayerLink({ userId, children, className = "" }: { userId: string | null | undefined; children: ReactNode; className?: string }) {
  const ctx = useContext(PlayerCardContext);
  if (!ctx || !userId) return <span className={`inline-flex items-center gap-2 ${className}`}>{children}</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        ctx.open(userId);
      }}
      className={`player-link inline-flex items-center gap-2 text-left ${className}`}
    >
      {children}
    </button>
  );
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function favoriteDecade(card: Card) {
  const counts = new Map<number, number>();
  for (const p of card.league.picks) {
    if (!p.release_year) continue;
    const d = Math.floor(p.release_year / 10) * 10;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  return best && card.league.picks.length >= 2 ? `${best[0]}s` : null;
}

function Stat({ label, value, sub, gold }: { label: string; value: ReactNode; sub?: ReactNode; gold?: boolean }) {
  return (
    <div className="inset px-2.5 py-2 text-center">
      <div className="display text-[26px] leading-none" style={{ color: gold ? "var(--marquee-gold)" : "var(--screen-white)" }}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--reel-grey)" }}>
        {label}
      </div>
      {sub && (
        <div className="mono mt-0.5 text-[10px]" style={{ color: "var(--reel-grey)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function PlayerCardModal({
  leagueId,
  userId,
  members,
  me,
  onClose,
}: {
  leagueId: string;
  userId: string;
  members: Member[];
  me: string;
  onClose: () => void;
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byId = Object.fromEntries(members.map((m) => [m.user_id, m]));

  useEffect(() => {
    let live = true;
    api.playerCard(leagueId, userId).then(
      (c) => live && setCard(c),
      (e: Error) => live && setError(e.message),
    );
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      live = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [leagueId, userId, onClose]);

  const name = card?.display_name ?? byId[userId]?.display_name ?? "Former player";
  const avatar = card?.avatar ?? byId[userId]?.avatar ?? "";
  const L = card?.league;
  const C = card?.career;
  const avg = L && L.rounds_played ? Math.round((L.points / L.rounds_played) * 10) / 10 : null;
  const best = L?.picks.reduce<Card["league"]["picks"][number] | null>((b, p) => (!b || p.points > b.points ? p : b), null);
  const decade = card ? favoriteDecade(card) : null;
  const who = (id: string) => (id === me ? "You" : (byId[id]?.display_name ?? "Former player"));

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="card relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-b-[14px]"
        style={{ background: "rgba(18,19,31,0.97)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${name}'s stats`}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5" aria-label="Close" style={{ color: "var(--reel-grey)" }}>
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="rounded-full" style={{ boxShadow: "0 0 0 2px var(--marquee-gold)" }}>
            <Avatar avatar={avatar} size={58} />
          </div>
          <div className="min-w-0">
            <div className="display truncate text-[32px] leading-none" style={{ color: "var(--marquee-gold)" }}>
              {name}
              {userId === me && <span className="text-xl" style={{ color: "var(--reel-grey)" }}> (you)</span>}
            </div>
            <div className="mt-1 text-xs" style={{ color: "var(--reel-grey)" }}>
              {AVATAR_MAP[avatar] && <span style={{ color: "var(--screen-white)" }}>The {AVATAR_MAP[avatar].label} · </span>}
              {card?.is_commissioner && <span style={{ color: "var(--marquee-gold)" }}>★ Commissioner · </span>}
              {card?.joined_at
                ? `Joined ${new Date(card.joined_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
                : card && "No longer in this league"}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm" style={{ color: "#f08a76" }}>
            {error}
          </p>
        )}
        {!card && !error && (
          <p className="mono mt-6 text-center text-xs" style={{ color: "var(--reel-grey)" }}>
            Pulling the stats…
          </p>
        )}

        {L && C && (
          <>
            {/* This league */}
            <div className="label mt-5 mb-2">This league</div>
            {L.rounds_complete === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--reel-grey)" }}>
                No finished rounds yet — stats show up once the first round&apos;s votes are in.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-1.5">
                  <Stat
                    label={L.status === "complete" ? "Finish" : "Standing"}
                    value={L.finish ? ordinal(L.finish) : "—"}
                    sub={`of ${L.field}`}
                    gold={L.finish === 1}
                  />
                  <Stat label="Points" value={L.points} />
                  <Stat label="Round wins" value={L.round_wins} gold={L.round_wins > 0} />
                  <Stat label="Avg / round" value={avg ?? "—"} />
                </div>
                <div className="mt-2 flex flex-col gap-1 text-[13px]">
                  {L.biggest_fan && (
                    <div className="flex items-center gap-2">
                      <Heart size={13} color="var(--ticket-red)" /> Biggest fan:
                      <Avatar avatar={byId[L.biggest_fan.user_id]?.avatar ?? ""} size={18} />
                      <b>{who(L.biggest_fan.user_id)}</b>
                      <span className="mono text-[11px]" style={{ color: "var(--reel-grey)" }}>
                        gave {L.biggest_fan.points} pts
                      </span>
                    </div>
                  )}
                  {L.favorite && (
                    <div className="flex items-center gap-2">
                      <Trophy size={13} color="var(--marquee-gold)" /> Votes most for:
                      <Avatar avatar={byId[L.favorite.user_id]?.avatar ?? ""} size={18} />
                      <b>{who(L.favorite.user_id)}</b>
                      <span className="mono text-[11px]" style={{ color: "var(--reel-grey)" }}>
                        {L.favorite.points} pts
                      </span>
                    </div>
                  )}
                  {decade && (
                    <div className="flex items-center gap-2">
                      <Film size={13} color="var(--reel-grey)" /> Favorite decade: <b>{decade}</b>
                    </div>
                  )}
                  {L.seen_picks != null && (L.others_picks ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <Eye size={13} color="var(--reel-grey)" /> Has seen{" "}
                      <b>
                        {L.seen_picks} of {L.others_picks}
                      </b>{" "}
                      league picks
                    </div>
                  )}
                </div>

                {/* Picks */}
                <div className="label mt-5 mb-2">
                  Picks · {L.rounds_played} of {L.rounds_complete} round{L.rounds_complete === 1 ? "" : "s"}
                </div>
                {L.picks.length === 0 ? (
                  <p className="text-[13px]" style={{ color: "var(--reel-grey)" }}>
                    No picks in a finished round yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {L.picks.map((p) => (
                      <div
                        key={p.position}
                        className="inset flex items-center gap-3 px-2.5 py-2"
                        style={p === best && L.picks.length > 1 ? { borderColor: "rgba(240,180,41,0.55)" } : undefined}
                      >
                        <Poster movie={p} width={38} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px]" style={{ color: "var(--reel-grey)" }}>
                            R{p.position} · {p.theme}
                          </div>
                          <div className="truncate text-sm font-bold">
                            {p.title}{" "}
                            <span className="mono font-normal" style={{ color: "var(--reel-grey)" }}>
                              {p.release_year}
                            </span>
                          </div>
                          {p === best && L.picks.length > 1 && (
                            <div className="mono text-[10px] uppercase" style={{ color: "var(--marquee-gold)" }}>
                              Best pick
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="mono text-sm" style={{ color: "var(--marquee-gold)" }}>
                            {p.points} pts
                          </div>
                          <div className="mono text-[11px]" style={{ color: p.is_win ? "var(--marquee-gold)" : "var(--reel-grey)" }}>
                            {p.is_win ? "🏆 won" : `${ordinal(p.place)} of ${p.field}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Career */}
            <div className="label mt-5 mb-2">Career · all leagues</div>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Leagues" value={C.leagues} sub={`${C.seasons_finished} finished`} />
              <Stat label="Titles" value={C.titles} gold={C.titles > 0} sub={C.titles > 0 ? "🏆".repeat(Math.min(C.titles, 5)) : undefined} />
              <Stat
                label="Best finish"
                value={C.best_finish ? ordinal(C.best_finish.finish) : "—"}
                sub={C.best_finish ? `of ${C.best_finish.field}` : "no seasons yet"}
                gold={C.best_finish?.finish === 1}
              />
              <Stat label="Podiums" value={C.podiums} sub="top 3" />
              <Stat label="Round wins" value={C.round_wins} sub={`of ${C.rounds_played} played`} />
              <Stat label="Avg / round" value={C.avg_points ?? "—"} sub={C.best_round ? `best ${C.best_round.points}` : undefined} />
            </div>
            <p className="mt-3 text-center text-[11px]" style={{ color: "var(--reel-grey)" }}>
              Only finished rounds count. Career totals include leagues you&apos;re not in, but never their names or picks.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
