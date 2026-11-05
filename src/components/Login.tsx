"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ErrorText, Marquee } from "./ui";

// Passwordless email sign-in: a magic link plus a 6-digit code (handy on phones).
export function Login({ inviteCode }: { inviteCode: string | null }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
