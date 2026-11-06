"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { InvitePreview } from "@/lib/types";
import { AVATAR_OPTIONS } from "./art";
import { AvatarPicker, ErrorText, Marquee } from "./ui";

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
        if (!p) return;
        const firstFree = AVATAR_OPTIONS.find((a) => !p.taken_avatars.includes(a.id))?.id ?? AVATAR_OPTIONS[0].id;
        setAvatar(firstFree);
        // Start from the name/avatar you used most recently (if that avatar is free here).
        supabase()
          .auth.getSession()
          .then(({ data }) => {
            const uid = data.session?.user.id;
            if (!uid) return;
            return supabase()
              .from("league_members")
              .select("display_name, avatar")
              .eq("user_id", uid)
              .order("joined_at", { ascending: false })
              .limit(1)
              .then(({ data: rows }) => {
                const last = (rows as { display_name: string; avatar: string }[] | null)?.[0];
                if (!last) return;
                setDisplayName((n) => n || last.display_name);
                if (!p.taken_avatars.includes(last.avatar)) setAvatar(last.avatar);
              });
          });
      },
      (e) => setError(e.message),
    );
  }, [code, router]);

  if (preview === undefined) return <p style={{ color: "var(--reel-grey)" }}>Loading invite…</p>;
  if (preview === null) return <div className="card p-5">That invite code doesn&apos;t match any league.</div>;
  if (preview.status === "complete") return <div className="card p-5">{preview.name}&apos;s season is already over.</div>;
  if (preview.member_count >= 20) return <div className="card p-5">{preview.name} is full — it already has 20 players.</div>;

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
    <form onSubmit={join} className="mx-auto max-w-[420px] space-y-5">
      <Marquee>
        <div className="text-center">
          <div className="display text-[40px] leading-none" style={{ color: "var(--marquee-gold)" }}>
            {preview.name}
          </div>
          <div className="mt-1 text-[13px]" style={{ color: "var(--reel-grey)" }}>
            pick a name to step up to the box office
          </div>
        </div>
      </Marquee>
      <p className="text-center text-sm" style={{ color: "var(--reel-grey)" }}>
        {preview.member_count} player{preview.member_count === 1 ? "" : "s"} so far
        {preview.status === "active" && " · the season is underway — you'll start with the next round"}
      </p>
      <div>
        <div className="label mb-3 text-center">Pick your avatar</div>
        <AvatarPicker value={avatar} onChange={setAvatar} taken={preview.taken_avatars} />
      </div>
      <div className="flex gap-2">
        <input
          className="field mono flex-1"
          required
          maxLength={40}
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <button className="btn-primary px-5" disabled={busy || !avatar}>
          {busy ? "Joining…" : "Join"}
        </button>
      </div>
      <ErrorText error={error} />
    </form>
  );
}
