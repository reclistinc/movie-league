"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ErrorText, Marquee } from "./ui";

// Passwordless email sign-in: a magic link plus a 6-digit code (handy on phones).
export function Login({ inviteCode }: { inviteCode: string | null }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleOn, setGoogleOn] = useState(false);

  // Only offer Google once it's switched on in Supabase (Auth → Providers → Google).
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => r.json())
      .then((s) => setGoogleOn(Boolean(s?.external?.google)))
      .catch(() => {});
  }, []);

  async function google() {
    setError(null);
    try {
      localStorage.setItem("ml_return", window.location.search);
    } catch {}
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) setError(error.message);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Remember where to return (e.g. an invite) — the emailed link goes to the site root.
    try {
      localStorage.setItem("ml_return", window.location.search);
    } catch {}
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto mt-6 max-w-[400px]">
      <Marquee>
        <div className="text-center">
          <div className="display text-[42px] leading-none" style={{ color: "var(--marquee-gold)" }}>
            {inviteCode ? "YOU'RE INVITED" : "MOVIE LEAGUE"}
          </div>
          <div className="mt-1 text-[13px]" style={{ color: "var(--reel-grey)" }}>
            {inviteCode ? "sign in to grab your seat" : "pick it, pitch it, vote it, win it"}
          </div>
        </div>
      </Marquee>

      <div className="card mt-5 p-5">
        {googleOn && !sent && (
          <>
            <button
              type="button"
              onClick={google}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-3 font-semibold"
              style={{ background: "#fff", color: "#1f1f1f" }}
            >
              <GoogleG /> Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-xs" style={{ color: "var(--reel-grey)" }}>
              <span className="h-px flex-1" style={{ background: "rgba(107,111,138,0.4)" }} /> or use email
              <span className="h-px flex-1" style={{ background: "rgba(107,111,138,0.4)" }} />
            </div>
          </>
        )}
        {!sent ? (
          <form onSubmit={send} className="space-y-3">
            <div className="label">Step up to the box office</div>
            <input
              className="field mono"
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn-primary w-full px-4 py-3" disabled={busy}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
            <p className="text-xs" style={{ color: "var(--reel-grey)" }}>
              No password needed.
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <p className="text-sm">
              Check <b>{email}</b> and tap the link — or enter the 6-digit code from the email:
            </p>
            <input
              className="field mono text-center text-xl tracking-[0.3em]"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn-primary w-full px-4 py-3" disabled={busy || code.trim().length < 6}>
              Verify code
            </button>
            <button type="button" className="btn-ghost w-full px-4 py-2 text-sm" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </form>
        )}
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
