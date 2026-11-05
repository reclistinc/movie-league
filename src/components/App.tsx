"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Login } from "./Login";
import { Home } from "./Home";
import { Join } from "./Join";
import { League } from "./League";
import { TmdbAttribution } from "./ui";

// Routes (query-string based so the whole app is one statically-served page):
//   /                 -> your leagues + create
//   /?join=CODE       -> invite / join flow
//   /?league=ID       -> league view
export function App() {
  const params = useSearchParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [linkError, setLinkError] = useState<string | null>(null);
  const tokenHash = params.get("token_hash");

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

  const join = params.get("join");
  const league = params.get("league");

  let body;
  if (tokenHash) body = <p className="text-zinc-500">Signing you in…</p>;
  else if (session === undefined) body = <p className="text-zinc-500">Loading…</p>;
  else if (!session) body = <Login inviteCode={join} />;
  else if (join) body = <Join code={join} />;
  else if (league) body = <League leagueId={league} />;
  else body = <Home />;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-tight">
          🎬 Movie <span className="text-amber-400">League</span>
        </Link>
        {session && (
          <button className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => supabase().auth.signOut()}>
            Sign out
          </button>
        )}
      </header>
      {linkError && !session && <p className="mb-4 text-sm text-red-400">{linkError}</p>}
      {body}
      <TmdbAttribution />
    </main>
  );
}
