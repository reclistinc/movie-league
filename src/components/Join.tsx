"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AVATAR_KEYS } from "@/lib/avatars";
import type { InvitePreview } from "@/lib/types";
import { AvatarPicker, Button, Card, ErrorText, Field, inputCls } from "./ui";

export function Join({ code }: { code: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.previewInvite(code).then(
      (p) => {
        if (p?.already_member) router.replace(`/?league=${p.league_id}`);
        setPreview(p);
        if (p) setAvatar(AVATAR_KEYS.find((k) => !p.taken_avatars.includes(k)) ?? AVATAR_KEYS[0]);
      },
      (e) => setError(e.message),
    );
  }, [code, router]);

  if (preview === undefined) return <p className="text-zinc-500">Loading invite…</p>;
  if (preview === null) return <Card>That invite code doesn&apos;t match any league.</Card>;
  if (preview.status === "complete") return <Card>{preview.name}&apos;s season is already over.</Card>;

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const id = await api.joinLeague(code, displayName, avatar);
      router.replace(`/?league=${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={join} className="space-y-4">
        <h1 className="text-lg font-bold">Join {preview.name}</h1>
        <p className="text-sm text-zinc-400">
          {preview.member_count} players so far.
          {preview.status === "active" && " The season is underway — you'll start with the next round."}
        </p>
        <Field label="Your name in this league">
          <input className={inputCls} required maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <p className="text-sm text-zinc-400">Pick your character</p>
        <AvatarPicker value={avatar} onChange={setAvatar} taken={preview.taken_avatars} />
        <ErrorText error={error} />
        <Button disabled={busy || !avatar}>{busy ? "Joining…" : "Join league"}</Button>
      </form>
    </Card>
  );
}
