"use client";

import { useSyncExternalStore } from "react";

// One shared 1-second clock for every countdown on the page.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const nowSeconds = () => Math.floor(Date.now() / 1000);

const pad = (n: number) => String(n).padStart(2, "0");

/** Live countdown, ticking every second: "4d 03:12:45 left" · "03:12:45 left" · "Deadline passed". */
export function Countdown({ to, className = "", style }: { to: string | null; className?: string; style?: React.CSSProperties }) {
  const now = useSyncExternalStore(subscribe, nowSeconds, () => null);
  if (!to) return null;
  if (now === null) return <span className={className} style={style}>&nbsp;</span>;
  const left = Math.floor(new Date(to).getTime() / 1000) - now;
  if (left <= 0) return <span className={className} style={{ ...style, color: "var(--ticket-red)" }}>Deadline passed</span>;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return (
    <span className={`tabular-nums ${className}`} style={style}>
      {d > 0 && `${d}d `}
      {pad(h)}:{pad(m)}:{pad(s)} left
    </span>
  );
}
