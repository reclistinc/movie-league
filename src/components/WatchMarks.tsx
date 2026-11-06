"use client";

import { useEffect, useState } from "react";
import { Bookmark, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import type { WatchStatus } from "@/lib/types";

const OPTIONS: { id: WatchStatus; label: string; Icon: typeof Eye }[] = [
  { id: "seen", label: "Seen", Icon: Eye },
  { id: "unseen", label: "Unseen", Icon: EyeOff },
  { id: "want", label: "Watchlist", Icon: Bookmark },
];

/** Your marks for a set of movies (private to you), with an optimistic setter. */
export function useWatchMarks(tmdbIds: number[]) {
  const key = [...new Set(tmdbIds)].sort((a, b) => a - b).join(",");
  const [marks, setMarks] = useState<Record<string, WatchStatus>>({});
  useEffect(() => {
    if (!key) return;
    let live = true;
    api.myWatchStatus(key.split(",").map(Number)).then(
      (m) => live && setMarks((prev) => ({ ...m, ...prev })),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [key]);

  const set = (tmdbId: number, status: WatchStatus | null) => {
    const k = String(tmdbId);
    const before = marks[k];
    setMarks((m) => {
      const next = { ...m };
      if (status) next[k] = status;
      else delete next[k];
      return next;
    });
    api.setWatchStatus(tmdbId, status).catch(() =>
      setMarks((m) => {
        const next = { ...m };
        if (before) next[k] = before;
        else delete next[k];
        return next;
      }),
    );
  };
  return { marks, set };
}

/** Seen · Unseen · Watchlist — pick one, tap again to clear. */
export function WatchMarks({ value, onChange }: { value: WatchStatus | undefined; onChange: (s: WatchStatus | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Have you seen it?">
      {OPTIONS.map(({ id, label, Icon }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? null : id)}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors"
            style={{
              border: `1px solid ${on ? "var(--marquee-gold)" : "rgba(245,241,230,0.22)"}`,
              background: on ? "rgba(240,180,41,0.18)" : "rgba(18,19,31,0.6)",
              color: on ? "var(--marquee-gold)" : "var(--reel-grey)",
            }}
          >
            <Icon size={12} /> {label}
          </button>
        );
      })}
    </div>
  );
}
