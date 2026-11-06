// Shapes returned by the Postgres functions in supabase/migrations.

export type LeagueStatus = "setup" | "active" | "complete";
export type RoundStatus = "queued" | "submitting" | "voting" | "complete";

export interface LeagueSummary {
  id: string;
  name: string;
  status: LeagueStatus;
  is_commissioner: boolean;
  member_count: number;
  live_round: { theme: string; status: RoundStatus; deadline: string } | null;
}

export interface Member {
  user_id: string;
  display_name: string;
  avatar: string;
  joined_at: string;
}

export interface Round {
  id: string;
  position: number;
  theme: string;
  description: string | null;
  status: RoundStatus;
  submissions_opened_at: string | null;
  submission_deadline: string | null;
  voting_opened_at: string | null;
  voting_deadline: string | null;
  completed_at: string | null;
  participant_ids: string[];
  submitted_ids: string[];
  voted_ids: string[];
}

export interface Movie {
  tmdb_id: number;
  title: string;
  release_year: number | null;
  poster_path: string | null;
  vote_count?: number; // search results only, for re-ranking in the browser
  popularity?: number;
}

export interface MySubmission extends Movie {
  id: string;
  round_id: string;
  note: string | null;
  gif_url: string | null;
  video_key?: string | null;
  video_name?: string | null;
  video_type?: string | null;
}

export interface VotingPick extends Movie {
  id: string;
  note: string | null;
  gif_url?: string | null;
  video_key?: string | null;
  video_name?: string | null;
  video_type?: string | null;
  is_mine: boolean;
}

export interface VoteInput {
  submission_id: string;
  points: number;
  comment?: string;
}

export interface CurrentRound {
  round_id: string;
  is_participant: boolean;
  is_voter: boolean;
  my_submission: MySubmission | null;
  submissions: VotingPick[] | null; // only during voting
  ballot_locked: boolean;
  my_votes: VoteInput[] | null;
  live_totals: { submission_id: string; points: number }[] | null; // only after you lock in
}

export interface ResultPick extends Movie {
  id: string;
  user_id: string;
  note: string | null;
  gif_url?: string | null;
  video_key?: string | null;
  video_name?: string | null;
  video_type?: string | null;
  points: number;
  votes: { voter_id: string; points: number; comment: string | null }[];
}

export interface Standing {
  user_id: string;
  points: number;
  round_wins: number;
  // tiebreakers (see supabase/migrations/20261106500000_tiebreakers.sql)
  best_round?: number;
  avg_voters?: number;
  last_places?: number;
  place?: number;
}

export interface LeagueState {
  me: string;
  league: {
    id: string;
    name: string;
    status: LeagueStatus;
    vote_budget: number;
    submission_days: number;
    voting_days: number;
    invite_code: string;
    commissioner_id: string;
    is_commissioner: boolean;
    started_at: string | null;
    completed_at: string | null;
    version: number;
  };
  members: Member[];
  rounds: Round[];
  current: CurrentRound | null;
  results: Record<string, ResultPick[]>;
  standings: Standing[];
}

export interface InvitePreview {
  league_id: string;
  name: string;
  status: LeagueStatus;
  member_count: number;
  taken_avatars: string[];
  already_member: boolean;
}

export interface ChatMessage {
  id: number;
  league_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface TrendingMovie {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface MovieVideo {
  key: string; // YouTube video id
  name: string;
  type: string; // Trailer | Teaser | Clip
}

export interface MovieDetails {
  tmdb_id: number;
  title: string;
  overview: string;
  runtime: number | null;
  release_year: number | null;
  backdrop_path: string | null;
  poster_path: string | null;
  genres: string[];
  videos: MovieVideo[];
}

export interface Gif {
  id: string;
  title: string;
  url: string;
  width: number;
  height: number;
}

/** The video a player attached to a pick: a video, "none" (explicitly no video), or null (older pick). */
export type PickVideo = MovieVideo | "none" | null;

export interface PlayerCardPick {
  position: number;
  theme: string;
  tmdb_id: number;
  title: string;
  release_year: number | null;
  poster_path: string | null;
  points: number;
  place: number;
  field: number;
  voters: number;
  is_win: boolean;
}

/** One player's stats (get_player_card). Only finished rounds count. */
export interface PlayerCard {
  user_id: string;
  display_name: string | null; // null = no longer in this league
  avatar: string | null;
  joined_at: string | null;
  is_commissioner: boolean;
  league: {
    status: LeagueStatus;
    finish: number | null;
    field: number;
    points: number;
    round_wins: number;
    rounds_played: number;
    rounds_complete: number;
    picks: PlayerCardPick[];
    biggest_fan: { user_id: string; points: number } | null;
    favorite: { user_id: string; points: number } | null;
  };
  career: {
    leagues: number;
    seasons_finished: number;
    titles: number;
    podiums: number;
    best_finish: { finish: number; field: number } | null;
    rounds_played: number;
    round_wins: number;
    points: number;
    avg_points: number | null;
    best_round: { points: number; place: number; field: number } | null;
  };
}

/** Your private mark on a movie: seen it, haven't, or on your watchlist. */
export type WatchStatus = "seen" | "unseen" | "want";
