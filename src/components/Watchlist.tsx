"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Eye, X } from "lucide-react";
import { api } from "@/lib/api";
import type { WatchlistItem } from "@/lib/types";
import { BackdropCard, TrailerButton, useMovieDetails } from "./media";
import { Avatar, ErrorText, Marquee, Poster } from "./ui";

/** Every movie you've put on your Watchlist, across all your leagues. */
export function Watchlist({ fromLeague }: { fromLeague?: string | null }) {
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.myWatchlist().then(setItems, (e: Error) => setError(e.message));
  }, []);

  const drop = (tmdbId: number, status: "seen" | null) => {
    const before = items;
    setItems((list) => list?.filter((i) => i.tmdb_id !== tmdbId) ?? null);
    api.setWatchStatus(tmdbId, status).catch((e: Error) => {
      setItems(before);
      setError(e.message);
    });
  };

  return (
    <div className="space-y-4">
      <Marquee>
        <div className="text-center">
          <div className="display text-[34px] leading-none" style={{ color: "var(--marquee-gold)" }}>
            MY WATCHLIST
          </div>
          <div className="mt-1 text-[13px]" style={{ color: "var(--reel-grey)" }}>
            {items ? `${items.length} movie${items.length === 1 ? "" : "s"} your friends put you onto` : "movies your friends put you onto"}
          </div>
        </div>
      </Marquee>
      <Link href={fromLeague ? `/?league=${fromLeague}` : "/"} className="btn-ghost inline-block px-3 py-1.5 text-[13px]">
        {fromLeague ? "← Back to league" : "← Your leagues"}
      </Link>
      <ErrorText error={error} />
      {items === null && !error && <p style={{ color: "var(--reel-grey)" }}>Loading…</p>}
      {items?.length === 0 && (
        <div className="card p-5 text-sm" style={{ color: "var(--reel-grey)" }}>
          Nothing here yet. Tap <Bookmark size={13} className="inline" /> <b>Watchlist</b> on a pick while voting or in a round&apos;s
          results, and it lands here.
        </div>
      )}
      {items?.map((item) => (
        <Row key={item.tmdb_id} item={item} onSeen={() => drop(item.tmdb_id, "seen")} onRemove={() => drop(item.tmdb_id, null)} />
      ))}
    </div>
  );
}

function Row({ item, onSeen, onRemove }: { item: WatchlistItem; onSeen: () => void; onRemove: () => void }) {
  // Older picks may be missing a title/poster (or the league is gone) — fill in from TMDb.
  const details = useMovieDetails(item.title && item.poster_path ? null : item.tmdb_id);
  const title = item.title ?? details?.title ?? "Untitled";
  const movie = {
    tmdb_id: item.tmdb_id,
    title,
    release_year: item.release_year ?? details?.release_year ?? null,
    poster_path: item.poster_path ?? details?.poster_path ?? null,
  };
  const f = item.from;
  return (
    <div className="ticket">
      <BackdropCard tmdbId={item.tmdb_id} className="flex w-full">
        <div className="flex w-full">
          <div className="shrink-0 p-2.5">
            <Poster movie={movie} width={76} />
          </div>
          <div className="stub-divider min-w-0 flex-1 px-3.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold">
                {title}{" "}
                <span className="mono font-normal" style={{ color: "var(--reel-grey)" }}>
                  {movie.release_year}
                </span>
              </div>
              <TrailerButton tmdbId={item.tmdb_id} title={title} compact />
            </div>
            {f && (
              <div className="mt-1 text-[12px]" style={{ color: "var(--reel-grey)" }}>
                <Link href={`/?league=${f.league_id}`} className="underline decoration-dotted underline-offset-2">
                  {f.league_name}
                </Link>{" "}
                · R{f.round_position} {f.round_theme}
                {f.picker_name && (
                  <span className="mt-1 flex items-center gap-1.5">
                    <Avatar avatar={f.picker_avatar ?? ""} size={16} /> picked by {f.picker_name}
                  </span>
                )}
              </div>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onSeen}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold hover:text-[var(--marquee-gold)]"
                style={{ border: "1px solid rgba(245,241,230,0.22)", color: "var(--screen-white)" }}
              >
                <Eye size={12} /> Watched it
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ border: "1px solid rgba(245,241,230,0.22)", color: "var(--reel-grey)" }}
              >
                <X size={12} /> Remove
              </button>
            </div>
          </div>
        </div>
      </BackdropCard>
    </div>
  );
}
