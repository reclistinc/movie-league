"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, LogOut, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarPicker, ErrorText } from "./ui";

type Membership = { league_id: string; display_name: string; avatar: string; joined_at: string };

/**
 * Top-right account menu. Inside a league it shows your avatar there and Profile edits that league only;
 * elsewhere it's a plain account icon (your name/avatar can differ from league to league).
 */
export function UserMenu({ session, leagueId }: { session: Session; leagueId: string | null }) {
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const uid = session.user.id;

  const load = useCallback(() => {
    supabase()
      .from("league_members")
      .select("league_id, display_name, avatar, joined_at")
      .eq("user_id", uid)
      .order("joined_at", { ascending: false })
      .then(({ data }) => setMemberships((data as Membership[]) ?? []));
  }, [uid]);

  useEffect(load, [load, leagueId]);

  // Close the menu when tapping elsewhere.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Your name/avatar in the league you're looking at (none outside a league).
  const me = leagueId ? (memberships?.find((m) => m.league_id === leagueId) ?? null) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="rounded-full"
        style={{ boxShadow: open ? "0 0 0 2px var(--marquee-gold)" : "0 0 0 1px rgba(240,180,41,0.5)" }}
      >
        {me ? (
          <Avatar avatar={me.avatar} size={34} />
        ) : (
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full" style={{ background: "var(--velvet)" }}>
            <UserRound size={18} color="var(--marquee-gold)" />
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-56 overflow-hidden p-0 shadow-xl shadow-black/50" style={{ background: "rgba(28,30,51,0.97)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "rgba(107,111,138,0.3)" }}>
            <div className="truncate text-sm font-bold">{me?.display_name ?? "Signed in"}</div>
            <div className="truncate text-xs" style={{ color: "var(--reel-grey)" }}>
              {session.user.email}
            </div>
          </div>
          {me && leagueId && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(true);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-white/5"
            >
              <UserRound size={16} color="var(--marquee-gold)" /> Profile (this league)
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/?watchlist");
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-white/5"
          >
            <Bookmark size={16} color="var(--marquee-gold)" /> My Watchlist
          </button>
          <button
            type="button"
            onClick={() => supabase().auth.signOut()}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-white/5"
          >
            <LogOut size={16} color="var(--marquee-gold)" /> Sign out
          </button>
        </div>
      )}

      {editing && me && leagueId && (
        <ProfileEditor
          uid={uid}
          email={session.user.email ?? ""}
          leagueId={leagueId}
          start={me}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProfileEditor({
  uid,
  email,
  leagueId,
  start,
  onClose,
  onSaved,
}: {
  uid: string;
  email: string;
  leagueId: string;
  start: Membership;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(start.display_name);
  const [avatar, setAvatar] = useState(start.avatar);
  const [taken, setTaken] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Grey out avatars other players in this league already use.
  useEffect(() => {
    supabase()
      .from("league_members")
      .select("avatar")
      .eq("league_id", leagueId)
      .neq("user_id", uid)
      .then(({ data }) => setTaken(((data as { avatar: string }[]) ?? []).map((r) => r.avatar)));
  }, [leagueId, uid]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateMe(leagueId, name, avatar);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <form onSubmit={save} className="card max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto p-5" style={{ background: "rgba(28,30,51,0.98)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="display text-2xl" style={{ color: "var(--marquee-gold)" }}>
            YOUR PROFILE
          </span>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="text-xs" style={{ color: "var(--reel-grey)" }}>
          Signed in as {email}
        </div>
        <p className="text-xs" style={{ color: "var(--reel-grey)" }}>
          Your name and avatar in this league only — you can be someone different in each league.
        </p>
        <AvatarPicker value={avatar} onChange={setAvatar} taken={taken} />
        <input className="field mono" required maxLength={40} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn-primary px-5 py-2.5" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className="btn-ghost px-5 py-2.5" onClick={onClose}>
            Cancel
          </button>
        </div>
        <ErrorText error={error} />
      </form>
    </div>,
    document.body,
  );
}
