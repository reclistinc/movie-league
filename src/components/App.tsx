"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const join = params.get("join");
  const league = params.get("league");

  let body;
  if (session === undefined) body = <p className="text-zinc-500">Loading…</p>;
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
      {body}
      <TmdbAttribution />
    </main>
  );
}
