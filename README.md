# 🎬 Movie League

Music League, but for movies. A commissioner plans a season of themed rounds, friends each pick a
movie per round, everyone spreads a points budget across the other picks anonymously, and the
leaderboard crowns a champion.

**Stack:** Next.js 16 (App Router) on Vercel · Supabase (Postgres, Auth, Realtime) · TMDb for movie data and posters.

## How it works

| Piece | Where |
| --- | --- |
| Game rules (phases, deadlines, anonymity, vote budget, no duplicate picks, locked queue) | `supabase/migrations/*_init.sql` — Postgres functions, so they can't be bypassed from the browser |
| Per-player view of a league | `get_league_state()` RPC, returns one JSON snapshot |
| Live updates | Realtime on `leagues.version` (bumped on every change) and `chat_messages` |
| Movie search | `src/app/api/movies/search/route.ts`, a server-side proxy so the TMDb key stays secret |
| UI | `src/components/*` (client components); `src/lib/api.ts` wraps every RPC |

Rules implemented:
- The commissioner sets the name, vote budget (default 20) and phase lengths (default 5 days), then plans the whole season queue before starting. Settings and queue lock when the season starts.
- Players join with an invite link/code, pick a name and one of 20 avatars. Late joiners play from the next round.
- Submissions: one pick per player per round, no duplicate movies in a round, changeable until everyone has submitted. The round moves to voting as soon as everyone submits or the deadline passes.
- Voting: anonymous, shuffled per viewer, can't vote for your own pick, must spend exactly the budget, optional comment per pick, final once locked. Running totals are shown only to players who've locked in.
- The round reveals as soon as all votes are in (or the deadline passes), then the next round opens automatically. Results show submitters, the vote breakdown and comments.
- Standings count completed rounds only.

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **SQL Editor →** paste and run `supabase/migrations/20261105000000_init.sql`.
   (Or with the CLI: `supabase link` then `supabase db push`.)
3. **Authentication → URL Configuration:** set *Site URL* to your Vercel URL and add
   `http://localhost:3000/**` and `https://YOUR-APP.vercel.app/**` to *Redirect URLs*.
4. **Email (required for real players):** Supabase's built-in sender only emails project team members, 2/hour.
   - **Authentication → Emails → SMTP Settings:** enable custom SMTP (e.g. Gmail: `smtp.gmail.com`, port 465, an app password), sender name `Movie League`. Then raise **Authentication → Rate Limits → emails**.
   - **Templates *Confirm signup* and *Magic Link*:** the sign-in link must point at the site, not Supabase:
     `<a href="{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=email">Sign in</a>` and optionally `{{ .Token }}` for the 6-digit code.
5. *(Optional)* To advance phases on deadlines even when nobody opens the app, enable the
   `pg_cron` extension and run:
   ```sql
   select cron.schedule('movie-league-sync', '*/5 * * * *', 'select public.sync_all_leagues()');
   ```
   Without it, deadlines still apply the next time anyone loads the league.

### 2. TMDb
Create a free account → Settings → API → request a key. Copy the **API Read Access Token** (preferred) or the v3 API key.

### 3. Run locally
```bash
cp .env.example .env.local   # fill in Supabase URL + anon key and the TMDb token
npm install
npm run dev
```

### 4. Deploy on Vercel
Import `reclistinc/movie-league` at [vercel.com/new](https://vercel.com/new), add the same env vars from `.env.example`, and deploy.

## Tests
The database test runs the whole game loop (setup → join → submit → vote → reveal → deadlines → season end) and the security rules against a throwaway Postgres database:
```bash
PGHOST=localhost PGUSER=postgres npm run test:db
```

## Status / next steps
- [x] Persistent backend and game loop, tested
- [x] Email sign-in, leagues, invites, submissions with TMDb search, voting, results, standings, chat
- [ ] **Port the prototype UI** (`movie-league-v2.jsx`): original SVG avatars (`src/lib/avatars.ts`), visual design, poster polish, per-player gate screens. The current UI is functional but plain.
