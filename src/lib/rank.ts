// Ranking for movie search: how well the title matches what was typed, then how well-known
// the film is. TMDb's own order is loose (and it can bury the obvious film for a half-typed
// title like "home alon"), so the server fetches several pages and re-ranks with this.

export interface RankableMovie {
  title: string;
  original_title?: string;
  vote_count: number;
  popularity: number;
}

/** Lowercase, strip accents and punctuation, drop a leading "the/a/an". */
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

/**
 * 5 exact title · 4 title starts with the query · 3 every typed word starts a title word, in order
 * 2 every typed word starts a title word · 1 title contains the query · 0 otherwise
 */
export function matchTier(query: string, title: string): number {
  const q = normalizeTitle(query);
  const t = normalizeTitle(title);
  if (!q) return 0;
  if (t === q) return 5;
  if (t.startsWith(q)) return 4;
  const qw = q.split(" ");
  const tw = t.split(" ");
  // in-order word prefixes: "lord rings" → "lord of the rings"
  let i = 0;
  for (const w of tw) if (i < qw.length && w.startsWith(qw[i])) i++;
  if (i === qw.length) return 3;
  if (qw.every((w) => tw.some((x) => x.startsWith(w)))) return 2;
  if (t.includes(q)) return 1;
  return 0;
}

/**
 * Text accuracy dominates; within the same tier, closeness (how much of the title you've
 * typed) and then fame decide. Closeness puts "Home Alone" ahead of "Home Alone 2: Lost in
 * New York" for "home alo" even when the sequel happens to be trending.
 */
export function searchScore(query: string, m: RankableMovie): number {
  const tier = Math.max(matchTier(query, m.title), m.original_title ? matchTier(query, m.original_title) - 1 : 0);
  const q = normalizeTitle(query);
  const t = normalizeTitle(m.title);
  const closeness = tier >= 3 && t.length > 0 ? Math.min(1, q.length / t.length) : 0;
  const fame = Math.log10(1 + m.vote_count) + 0.5 * Math.log10(1 + m.popularity);
  // A tier is worth ~1.5 orders of magnitude of votes: a famous film one tier lower can still
  // beat an obscure exact match (e.g. "godfather" → The Godfather over an unknown "Godfather").
  return tier * 1.5 + closeness * 1.2 + fame;
}

export function rankMovies<T extends RankableMovie>(query: string, movies: T[]): T[] {
  return [...movies].sort((a, b) => searchScore(query, b) - searchScore(query, a));
}
