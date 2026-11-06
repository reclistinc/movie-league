"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Play, X } from "lucide-react";
import { api } from "@/lib/api";
import type { MovieVideo } from "@/lib/types";
import { formatTime, parseTime, parseYouTube } from "@/lib/youtube";
import { TrailerModal } from "./media";

type Checked = { id: string; title: string; channel: string | null };

/**
 * Its own pop-up for the less common case: paste a YouTube link to a specific scene,
 * optionally with a start / end time, preview it, then use it for your pick.
 */
export function CustomClipModal({
  movieTitle,
  initial,
  onClose,
  onUse,
}: {
  movieTitle: string;
  initial: MovieVideo | null;
  onClose: () => void;
  onUse: (clip: MovieVideo) => void;
}) {
  const [link, setLink] = useState(initial ? `https://youtu.be/${initial.key}` : "");
  const [startText, setStartText] = useState(initial?.start != null ? formatTime(initial.start) : "");
  const [endText, setEndText] = useState(initial?.end != null ? formatTime(initial.end) : "");
  const [checked, setChecked] = useState<Checked | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const parsed = parseYouTube(link);
  const linkError = link.trim() && !parsed ? "That isn't a YouTube link we can read — copy it from YouTube's Share button." : null;

  // Look the video up once the link is readable.
  const id = parsed?.id ?? null;
  useEffect(() => {
    if (!id) return;
    let live = true;
    const t = setTimeout(() => {
      setChecking(true);
      setError(null);
      api.checkVideo(id).then(
        (c) => live && setChecked(c),
        (e: Error) => live && (setChecked(null), setError(e.message)),
      ).finally(() => live && setChecking(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [id]);

  const start = parseTime(startText);
  const end = parseTime(endText);
  const timeError =
    startText.trim() && start === null
      ? "Start time should look like 1:23"
      : endText.trim() && end === null
        ? "End time should look like 2:05"
        : end !== null && end <= (start ?? 0)
          ? "The end has to be after the start"
          : null;

  const ready = checked && checked.id === id && !timeError && !checking;
  const clip: MovieVideo | null = ready
    ? { key: checked.id, name: checked.title.slice(0, 200), type: "Custom", start: start || null, end }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/80 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="card relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-b-[14px]"
        style={{ background: "rgba(18,19,31,0.98)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Use your own clip"
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5" aria-label="Close" style={{ color: "var(--reel-grey)" }}>
          <X size={20} />
        </button>
        <div className="display pr-8 text-[28px] leading-none" style={{ color: "var(--marquee-gold)" }}>
          USE YOUR OWN CLIP
        </div>
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--reel-grey)" }}>
          Paste a YouTube link to the scene from <b style={{ color: "var(--screen-white)" }}>{movieTitle}</b> you want voters to see.
        </p>

        <div className="label mt-4 mb-1.5">YouTube link</div>
        <input
          className="field text-sm"
          autoFocus
          inputMode="url"
          placeholder="https://youtu.be/…"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            // A time in the link (YouTube's "Share → Start at") fills in the start box.
            const t = parseYouTube(e.target.value)?.start;
            if (t != null) setStartText(formatTime(t));
          }}
        />
        {(linkError || error) && (
          <p className="mt-1.5 text-xs" style={{ color: "#f08a76" }}>
            {linkError ?? error}
          </p>
        )}
        {checking && (
          <p className="mono mt-1.5 text-xs" style={{ color: "var(--reel-grey)" }}>
            Checking the video…
          </p>
        )}

        {checked && checked.id === id && !error && (
          <div className="inset mt-3 flex items-center gap-3 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${checked.id}/mqdefault.jpg`} alt="" className="aspect-video w-28 shrink-0 rounded object-cover" />
            <div className="min-w-0">
              <div className="line-clamp-2 text-sm font-bold">{checked.title}</div>
              {checked.channel && (
                <div className="truncate text-xs" style={{ color: "var(--reel-grey)" }}>
                  {checked.channel}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1.5">Start at</div>
            <input className="field mono text-sm" inputMode="numeric" placeholder="0:00" value={startText} onChange={(e) => setStartText(e.target.value)} />
          </div>
          <div>
            <div className="label mb-1.5">End at (optional)</div>
            <input className="field mono text-sm" inputMode="numeric" placeholder="end" value={endText} onChange={(e) => setEndText(e.target.value)} />
          </div>
        </div>
        {timeError && (
          <p className="mt-1.5 text-xs" style={{ color: "#f08a76" }}>
            {timeError}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" disabled={!clip} onClick={() => clip && onUse(clip)} className="btn-primary flex items-center gap-1.5 px-5 py-2.5">
            <Check size={16} /> Use this clip
          </button>
          <button type="button" disabled={!clip} onClick={() => setPreviewing(true)} className="btn-ghost flex items-center gap-1.5 px-4 py-2.5">
            <Play size={14} /> Preview
          </button>
        </div>
        <p className="mt-3 text-[11px]" style={{ color: "var(--reel-grey)" }}>
          Voters will see it marked as your own clip, with a &ldquo;may contain spoilers&rdquo; note. The commissioner can
          remove it.
        </p>
      </div>
      {previewing && clip && <TrailerModal title={movieTitle} videos={[clip]} onClose={() => setPreviewing(false)} />}
    </div>,
    document.body,
  );
}
