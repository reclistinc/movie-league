"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Scale, X } from "lucide-react";
import type { Standing } from "@/lib/types";

export const TIEBREAKERS = [
  "Total points",
  "Round wins",
  "Most points in a single round",
  "Most voters per round, on average",
  "Fewest last-place round finishes",
  "Most of the league's picks marked Seen",
  "Most of the league's picks marked Watchlist",
  "Joined the league first",
];

/** Which rule (0-based) put `above` ahead of `below`. Rules 5-7 use private marks, so they're reported as "5+". */
export function decidingRule(above: Standing, below: Standing): number {
  if (above.points !== below.points) return 0;
  if (above.round_wins !== below.round_wins) return 1;
  if ((above.best_round ?? 0) !== (below.best_round ?? 0)) return 2;
  if (Number(above.avg_voters ?? 0) !== Number(below.avg_voters ?? 0)) return 3;
  if ((above.last_places ?? 0) !== (below.last_places ?? 0)) return 4;
  return 5;
}

/** Small tappable tag on a standings row that's tied on points with the row above. */
export function TiebreakTag({ rule }: { rule: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mono flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase"
        style={{ border: "1px solid rgba(240,180,41,0.45)", color: "var(--marquee-gold)", background: "rgba(240,180,41,0.08)" }}
        title="How ties are broken"
      >
        <Scale size={11} /> Tiebreak
      </button>
      {open && <TiebreakRules highlight={rule} onClose={() => setOpen(false)} />}
    </>
  );
}

function TiebreakRules({ highlight, onClose }: { highlight: number; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="card relative w-full max-w-md rounded-b-none p-5 sm:rounded-b-[14px]"
        style={{ background: "rgba(18,19,31,0.97)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Tiebreaker rules"
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5" aria-label="Close" style={{ color: "var(--reel-grey)" }}>
          <X size={20} />
        </button>
        <div className="display flex items-center gap-2 text-[28px] leading-none" style={{ color: "var(--marquee-gold)" }}>
          <Scale size={22} /> TIEBREAKERS
        </div>
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--reel-grey)" }}>
          Players level on points are ranked by these, in order, until one comes out ahead.
        </p>
        <ol className="mt-4 flex flex-col gap-1.5">
          {TIEBREAKERS.map((rule, i) => {
            const decided = i === highlight || (highlight >= 5 && i >= 5);
            return (
              <li
                key={rule}
                className="inset flex items-center gap-3 px-3 py-2 text-sm"
                style={decided ? { borderColor: "var(--marquee-gold)", background: "rgba(240,180,41,0.1)" } : undefined}
              >
                <span className="mono w-4" style={{ color: decided ? "var(--marquee-gold)" : "var(--reel-grey)" }}>
                  {i + 1}
                </span>
                <span className="flex-1" style={{ color: decided || i < highlight ? "var(--screen-white)" : "var(--reel-grey)" }}>
                  {rule}
                </span>
                {i === highlight && i < 5 && (
                  <span className="mono text-[10px] uppercase" style={{ color: "var(--marquee-gold)" }}>
                    decided it
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px]" style={{ color: "var(--reel-grey)" }}>
          Only finished rounds count. Seen and Watchlist count other players&apos; picks in this league, as marked
          when each round&apos;s results came out. Nobody can see which movies you marked.
        </p>
      </div>
    </div>,
    document.body,
  );
}
