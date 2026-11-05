"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Gif } from "@/lib/types";

// Ask the server once whether GIPHY is configured, so the button only appears when it will work.
let giphyStatus: Promise<boolean> | null = null;
function giphyEnabled() {
  giphyStatus ??= api.searchGifs("").then((r) => r.enabled, () => false);
  return giphyStatus;
}

/** Optional: suggest GIPHY GIFs for the chosen movie; the player can attach one to their pick. */
export function GifPicker({ movieTitle, value, onChange }: { movieTitle: string; value: string | null; onChange: (url: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(movieTitle);
  const [gifs, setGifs] = useState<Gif[] | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    giphyEnabled().then((on) => live && setEnabled(on));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      api.searchGifs(query).then(
        (r) => {
          if (!live) return;
          setError(null);
          setGifs(r.results);
        },
        (e) => live && setError(e.message),
      );
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, query]);

  if (!enabled) return null;

  if (value) {
    return (
      <div>
        <div className="label mb-2">Your GIF</div>
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Chosen GIF" className="max-h-40 rounded-lg" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-1"
            aria-label="Remove GIF"
          >
            <X size={14} />
          </button>
        </div>
        <GiphyCredit />
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost px-3 py-1.5 text-sm">
        ＋ Add a GIF (optional)
      </button>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label">Pick a GIF (optional)</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs" style={{ color: "var(--reel-grey)" }}>
          No GIF
        </button>
      </div>
      <div className="relative mb-2">
        <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2" color="var(--reel-grey)" />
        <input className="field py-2 pl-8 text-sm" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {gifs === null && !error && (
        <p className="text-xs" style={{ color: "var(--reel-grey)" }}>
          Finding GIFs…
        </p>
      )}
      {gifs?.length === 0 && (
        <p className="text-xs" style={{ color: "var(--reel-grey)" }}>
          No GIFs found — try different words.
        </p>
      )}
      {gifs && gifs.length > 0 && (
        <div className="columns-3 gap-2 sm:columns-4">
          {gifs.map((g) => (
            <button key={g.id} type="button" onClick={() => onChange(g.url)} className="mb-2 block w-full overflow-hidden rounded-md hover:ring-2 hover:ring-[var(--marquee-gold)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt={g.title} className="w-full" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs" style={{ color: "var(--ticket-red)" }}>{error}</p>}
      <GiphyCredit />
    </div>
  );
}

export function GiphyCredit() {
  return (
    <p className="mono mt-1 text-[10px] tracking-wide uppercase" style={{ color: "var(--reel-grey)" }}>
      Powered by GIPHY
    </p>
  );
}

/** A GIF attached to a pick, shown on voting and results cards. */
export function PickGif({ url }: { url?: string | null }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="mt-2 max-h-32 rounded-md" loading="lazy" />;
}
