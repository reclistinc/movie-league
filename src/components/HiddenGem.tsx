"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Gem, X } from "lucide-react";

export const GEM_COLOR = "#7dd3fc";

/** Wraps Hidden Gem text/badges so tapping them explains what a Hidden Gem is. */
export function HiddenGemInfo({
  title,
  seenBy,
  points,
  children,
  className = "",
}: {
  title: string;
  seenBy: number;
  points: number;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`text-left ${className}`} title="What's a Hidden Gem?">
        {children}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
            <div
              className="card relative w-full max-w-md rounded-b-none p-5 sm:rounded-b-[14px]"
              style={{ background: "rgba(18,19,31,0.97)" }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Hidden Gem"
            >
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1.5" aria-label="Close" style={{ color: "var(--reel-grey)" }}>
                <X size={20} />
              </button>
              <div className="display flex items-center gap-2 text-[28px] leading-none" style={{ color: GEM_COLOR }}>
                <Gem size={22} /> HIDDEN GEM
              </div>
              <p className="mt-3 text-sm">
                The pick hardly anyone had seen that still scored big — this round&apos;s best discovery.
              </p>
              <div className="inset mt-4 px-3 py-2.5 text-sm">
                <b>{title}</b>{" "}
                <span style={{ color: "var(--reel-grey)" }}>
                  — {seenBy === 0 ? "nobody else had seen it" : `only ${seenBy} had seen it`}, and it still scored {points} pts.
                </span>
              </div>
              <ul className="mt-4 flex flex-col gap-1.5 text-[13px]" style={{ color: "var(--reel-grey)" }}>
                <li>• Based on the Seen marks players made, frozen when the round&apos;s results came out.</li>
                <li>• Only awarded when at least 2 players marked movies that round, and fewer than half of them had seen it.</li>
                <li>• It has to have scored points. If two picks were seen by equally few, the higher score wins.</li>
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
