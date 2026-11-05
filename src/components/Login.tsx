"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Card, ErrorText, Field, inputCls } from "./ui";

// Passwordless email sign-in. The email contains a magic link and (if the Supabase
// email template includes {{ .Token }}) a 6-digit code — the code is handy on phones
// where the link opens in a different browser than the one you started in.
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
    <Card className="space-y-4">
      <h1 className="text-lg font-bold">{inviteCode ? "You've been invited to a Movie League" : "Sign in"}</h1>
      <p className="text-sm text-zinc-400">No password — we&apos;ll email you a sign-in link.</p>
      {!sent ? (
        <form onSubmit={send} className="space-y-3">
          <Field label="Email">
            <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button disabled={busy}>{busy ? "Sending…" : "Email me a link"}</Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm">
            Check <b>{email}</b> and tap the link. Or enter the code from the email:
          </p>
          <input
            className={inputCls}
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="flex gap-2">
            <Button disabled={busy || code.trim().length < 6}>Verify code</Button>
            <Button type="button" variant="ghost" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>
        </form>
      )}
      <ErrorText error={error} />
    </Card>
  );
}
