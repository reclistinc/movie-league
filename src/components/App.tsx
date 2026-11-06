"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Film } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Login } from "./Login";
import { Home } from "./Home";
import { Join } from "./Join";
import { League } from "./League";
import { Watchlist } from "./Watchlist";
import { UserMenu } from "./UserMenu";
import { PosterWall } from "./media";
import { TmdbAttribution } from "./ui";

// Routes (query-string based so the whole app is one statically-served page):
//   /                 -> your leagues + create
//   /?join=CODE       -> invite / join flow
//   /?league=ID       -> league view
//   /?watchlist       -> your watchlist
export function App() {
  const params = useSearchParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // If Supabase sent us back with an error (expired / already-used link), show it.
  const [linkError, setLinkError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1));
    const desc = p.get("error_description");
    return desc ? `Sign-in link problem: ${desc.replace(/\+/g, " ")}. Request a new link below.` : null;
  });
  const tokenHash = params.get("token_hash");
  const code = params.get("code");

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Sign-in links from the email point at this site: /?token_hash=...&type=email.
  // Verifying here works in any browser (unlike the PKCE code flow).
  useEffect(() => {
    if (!tokenHash) return;
    supabase()
      .auth.verifyOtp({ token_hash: tokenHash, type: "email" })
      .then(({ error }) => {
        let back = "";
        try {
          back = localStorage.getItem("ml_return") ?? "";
          localStorage.removeItem("ml_return");
        } catch {}
        if (error) setLinkError("That sign-in link has expired or was already used. Request a new one below.");
        router.replace(error ? "/" : `/${back}`);
      });
  }, [tokenHash, router]);

  // Links from emails requested by an older version of the app arrive as ?code=… (PKCE).
  useEffect(() => {
    if (!code) return;
    supabase()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error)
          setLinkError("That link has to be opened in the same browser you requested it from. Request a new link below — it will work from any browser.");
        router.replace("/");
      });
  }, [code, router]);

  const join = params.get("join");
  const league = params.get("league");

  let body;
  if (tokenHash || code) body = <p style={{ color: "var(--reel-grey)" }}>Signing you in…</p>;
  else if (session === undefined) body = <p style={{ color: "var(--reel-grey)" }}>Loading…</p>;
  else if (!session) body = <Login inviteCode={join} />;
  else if (join) body = <Join code={join} />;
  else if (league) body = <League leagueId={league} />;
  else if (params.has("watchlist")) body = <Watchlist />;
  else body = <Home />;

  return (
    <>
      <PosterWall intensity={session ? 0.45 : 0.7} />
      <main className="relative z-10 mx-auto w-full max-w-[720px] px-4 pt-4 pb-16">
        <header className="mb-4 flex items-center justify-between">
          <Link href="/" className="display flex items-center gap-2 text-xl" style={{ color: "var(--screen-white)" }}>
            <Film size={18} color="var(--marquee-gold)" /> Movie <span style={{ color: "var(--marquee-gold)" }}>League</span>
          </Link>
          {session && <UserMenu session={session} leagueId={league} />}
        </header>
        {linkError && !session && (
          <p className="mb-4 text-sm" style={{ color: "var(--ticket-red)" }}>
            {linkError}
          </p>
        )}
        {body}
        <TmdbAttribution />
      </main>
    </>
  );
}
