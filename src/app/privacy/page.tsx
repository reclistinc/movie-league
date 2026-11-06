import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Movie League",
};

const CONTACT = "reclistinc@gmail.com";
const UPDATED = "November 5, 2026";

export default function PrivacyPage() {
  return (
    <main className="relative z-10 mx-auto w-full max-w-[720px] px-4 py-8">
      <Link href="/" className="display text-xl" style={{ color: "var(--screen-white)" }}>
        🎬 Movie <span style={{ color: "var(--marquee-gold)" }}>League</span>
      </Link>
      <article className="card mt-5 space-y-4 p-6 text-[15px] leading-relaxed">
        <h1 className="display text-4xl" style={{ color: "var(--marquee-gold)" }}>
          Privacy Policy
        </h1>
        <p className="text-xs" style={{ color: "var(--reel-grey)" }}>
          Last updated {UPDATED}
        </p>

        <p>
          Movie League is a free, non-commercial game where friends pick movies for themed rounds and vote on each
          other&apos;s picks. This page explains what information the app uses and why.
        </p>

        <h2 className="display text-2xl">What we collect</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Your email address</b> — to sign you in, either with an emailed link or with Google. If you use Google,
            we receive your email address and basic profile (name and picture) from Google; the app only uses your
            email address to identify your account.
          </li>
          <li>
            <b>What you enter in the game</b> — the display name and avatar you choose in each league, your movie picks
            and notes, the video or GIF you attach, your votes and comments, and chat messages.
          </li>
          <li>
            <b>Basic technical data</b> — our hosting providers keep standard logs (such as IP address and browser
            type) to run and secure the service.
          </li>
        </ul>

        <h2 className="display text-2xl">How it&apos;s used</h2>
        <p>
          Only to run the game: signing you in, showing your leagues, keeping picks anonymous until a round ends, and
          showing results, standings and chat to the members of your league. We don&apos;t sell your information, show
          ads, or use it for marketing.
        </p>

        <h2 className="display text-2xl">Who can see what</h2>
        <p>
          Members of a league see your display name, avatar, and — once a round is over — your picks, votes and
          comments in that league. Chat messages are visible to that league&apos;s members. People outside a league
          can&apos;t see anything in it.
        </p>

        <h2 className="display text-2xl">Services we rely on</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Supabase</b> stores accounts and game data and handles sign-in.
          </li>
          <li>
            <b>Vercel</b> hosts the website.
          </li>
          <li>
            <b>Google</b> provides &ldquo;Continue with Google&rdquo; sign-in, if you choose it.
          </li>
          <li>
            <b>The Movie Database (TMDB)</b> provides movie details and images. This product uses the TMDB API but is
            not endorsed or certified by TMDB.
          </li>
          <li>
            <b>YouTube</b> plays trailers and clips in an embedded player (youtube-nocookie.com), which is subject to
            Google&apos;s privacy policy when you play a video.
          </li>
          <li>
            <b>GIPHY</b> provides GIF search, if that feature is enabled.
          </li>
        </ul>

        <h2 className="display text-2xl">Keeping and deleting your data</h2>
        <p>
          Your information is kept while you use Movie League. To delete your account and the data tied to it, email{" "}
          <a href={`mailto:${CONTACT}`} className="underline" style={{ color: "var(--marquee-gold)" }}>
            {CONTACT}
          </a>{" "}
          from the address you sign in with, and we&apos;ll remove it.
        </p>

        <h2 className="display text-2xl">Children</h2>
        <p>Movie League isn&apos;t intended for children under 13.</p>

        <h2 className="display text-2xl">Changes and contact</h2>
        <p>
          If this policy changes, we&apos;ll update the date above. Questions? Email{" "}
          <a href={`mailto:${CONTACT}`} className="underline" style={{ color: "var(--marquee-gold)" }}>
            {CONTACT}
          </a>
          .
        </p>
      </article>
    </main>
  );
}
