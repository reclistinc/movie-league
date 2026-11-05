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
}

export interface MySubmission extends Movie {
  id: string;
  round_id: string;
  note: string | null;
  gif_url: string | null;
}

export interface VotingPick extends Movie {
  id: string;
  note: string | null;
  gif_url?: string | null;
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
  points: number;
  votes: { voter_id: string; points: number; comment: string | null }[];
}

export interface Standing {
  user_id: string;
  points: number;
  round_wins: number;
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
  type: string; // Trailer | Teaser | Clip | Featurette
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
