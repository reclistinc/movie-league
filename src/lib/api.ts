"use client";

import { supabase } from "./supabase";
import type {
  ChatMessage,
  Gif,
  InvitePreview,
  LeagueState,
  LeagueSummary,
  Movie,
  VoteInput,
} from "./types";

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const api = {
  myLeagues: () => rpc<LeagueSummary[]>("my_leagues"),
  leagueState: (leagueId: string) => rpc<LeagueState>("get_league_state", { p_league_id: leagueId }),

  createLeague: (a: {
    name: string;
    displayName: string;
    avatar: string;
    voteBudget: number;
    submissionDays: number;
    votingDays: number;
  }) =>
    rpc<string>("create_league", {
      p_name: a.name,
      p_display_name: a.displayName,
      p_avatar: a.avatar,
      p_vote_budget: a.voteBudget,
      p_submission_days: a.submissionDays,
      p_voting_days: a.votingDays,
    }),
  updateSettings: (leagueId: string, a: { name: string; voteBudget: number; submissionDays: number; votingDays: number }) =>
    rpc<void>("update_league_settings", {
      p_league_id: leagueId,
      p_name: a.name,
      p_vote_budget: a.voteBudget,
      p_submission_days: a.submissionDays,
      p_voting_days: a.votingDays,
    }),
  setQueue: (leagueId: string, rounds: { theme: string; description?: string | null }[]) =>
    rpc<void>("set_season_queue", { p_league_id: leagueId, p_rounds: rounds }),
  startSeason: (leagueId: string) => rpc<void>("start_season", { p_league_id: leagueId }),

  previewInvite: (code: string) => rpc<InvitePreview | null>("preview_invite", { p_invite_code: code }),
  joinLeague: (code: string, displayName: string, avatar: string) =>
    rpc<string>("join_league", { p_invite_code: code, p_display_name: displayName, p_avatar: avatar }),
  updateMe: (leagueId: string, displayName: string, avatar: string) =>
    rpc<void>("update_my_member", { p_league_id: leagueId, p_display_name: displayName, p_avatar: avatar }),

  submitPick: (roundId: string, movie: Movie, note?: string, gifUrl?: string | null) =>
    rpc<void>("submit_pick", {
      p_round_id: roundId,
      p_tmdb_id: movie.tmdb_id,
      p_title: movie.title,
      p_release_year: movie.release_year,
      p_poster_path: movie.poster_path,
      p_note: note ?? null,
      // Only sent when a GIF is chosen, so picks keep working before the GIF migration is applied.
      ...(gifUrl ? { p_gif_url: gifUrl } : {}),
    }),
  castVotes: (roundId: string, votes: VoteInput[]) => rpc<void>("cast_votes", { p_round_id: roundId, p_votes: votes }),

  chatHistory: async (leagueId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase()
      .from("chat_messages")
      .select("*")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return data as ChatMessage[];
  },
  sendChat: async (leagueId: string, body: string) => {
    const { error } = await supabase().from("chat_messages").insert({ league_id: leagueId, body });
    if (error) throw new Error(error.message);
  },

  /** GIPHY search via our server route; enabled=false means no key is configured. */
  searchGifs: async (query: string): Promise<{ enabled: boolean; results: Gif[] }> => {
    const { data } = await supabase().auth.getSession();
    const res = await fetch(`/api/gifs?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "GIF search failed");
    return res.json();
  },

  /** Movie search goes through our server route so the TMDb key never reaches the browser. */
  searchMovies: async (query: string): Promise<Movie[]> => {
    const { data } = await supabase().auth.getSession();
    const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Movie search failed");
    return (await res.json()).results as Movie[];
  },
};
