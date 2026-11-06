"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, RefreshCw, Shield, Trash2, UserMinus } from "lucide-react";
import { api } from "@/lib/api";
import type { LeagueState } from "@/lib/types";
import { Avatar, ErrorText } from "./ui";

/** Commissioner-only: remove players, reset the invite code, end the season early, delete the league. Collapsed by default. */
export function CommissionerTools({ state, onChange }: { state: LeagueState; onChange: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const { league } = state;
  if (!league.is_commissioner) return null;

  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (after) after();
      else onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const others = state.members.filter((m) => m.user_id !== state.me);

  return (
    <div className="card p-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between">
        <span className="flex items-center gap-2">
          <Shield size={16} color="var(--marquee-gold)" />
          <span className="display text-lg tracking-[0.06em]">COMMISSIONER TOOLS</span>
        </span>
        <ChevronDown size={18} color="var(--reel-grey)" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          {/* Players */}
          <div>
            <div className="label mb-2">Players</div>
            {others.length === 0 && (
              <p className="text-sm" style={{ color: "var(--reel-grey)" }}>
                No other players yet.
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              {others.map((m) => (
                <div key={m.user_id} className="inset flex items-center gap-2.5 px-3 py-2">
                  <Avatar avatar={m.avatar} size={26} />
                  <span className="flex-1 truncate text-sm">{m.display_name}</span>
                  {league.status !== "complete" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            `Remove ${m.display_name} from ${league.name}?\n\nTheir pick and votes in the current round are cleared. Finished rounds keep their history.\n\nTo stop them rejoining, reset the invite code afterwards.`,
                          )
                        )
                          run(() => api.removePlayer(league.id, m.user_id));
                      }}
                      className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-xs"
                      style={{ borderColor: "rgba(226,71,44,0.5)", color: "#f08a76" }}
                    >
                      <UserMinus size={13} /> Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite code */}
          {league.status !== "complete" && (
            <div>
              <div className="label mb-2">Invite code</div>
              <p className="mb-2 text-xs" style={{ color: "var(--reel-grey)" }}>
                Current code <span className="mono" style={{ color: "var(--marquee-gold)" }}>{league.invite_code}</span>.
                Resetting makes a new code and the old link stops working — handy after removing someone. Current players
                stay in; share the new link with anyone still to join.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Reset ${league.name}'s invite code?\n\nThe old link stops working right away.`))
                    run(() => api.resetInviteCode(league.id));
                }}
                className="btn-ghost flex items-center gap-1.5 px-4 py-2 text-sm"
              >
                <RefreshCw size={14} /> Reset invite code
              </button>
            </div>
          )}

          {/* End season */}
          {league.status === "active" && (
            <div>
              <div className="label mb-2">End the season</div>
              <p className="mb-2 text-xs" style={{ color: "var(--reel-grey)" }}>
                Ends it now and crowns the leader. A round in voting is finished with the votes so far; a round still
                taking picks is cancelled; upcoming rounds are dropped.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm(`End ${league.name}'s season now? This can't be undone.`)) run(() => api.endSeason(league.id));
                }}
                className="btn-ghost px-4 py-2 text-sm"
              >
                End season now
              </button>
            </div>
          )}

          {/* Delete */}
          <div>
            <div className="label mb-2">Delete the league</div>
            <p className="mb-2 text-xs" style={{ color: "var(--reel-grey)" }}>
              Permanently deletes {league.name} — every round, pick, vote and chat message. Type the league name to
              confirm.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                className="field min-w-[160px] flex-1 py-2 text-sm"
                placeholder={league.name}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || confirmName.trim().toLowerCase() !== league.name.trim().toLowerCase()}
                onClick={() => run(() => api.deleteLeague(league.id, confirmName), () => router.replace("/"))}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-40"
                style={{ background: "var(--ticket-red)", color: "#fff" }}
              >
                <Trash2 size={14} /> Delete league
              </button>
            </div>
          </div>

          <ErrorText error={error} />
        </div>
      )}
    </div>
  );
}
