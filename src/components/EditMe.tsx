"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { api } from "@/lib/api";
import type { LeagueState } from "@/lib/types";
import { AvatarPicker, ErrorText } from "./ui";

/** Small "Edit" button that opens an inline editor for your own name + avatar in this league. */
export function EditMe({ state, onChange, label = "Edit" }: { state: LeagueState; onChange: () => void; label?: string }) {
  const me = state.members.find((m) => m.user_id === state.me);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(me?.display_name ?? "");
  const [avatar, setAvatar] = useState(me?.avatar ?? "detective");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;

  const taken = state.members.filter((m) => m.user_id !== state.me).map((m) => m.avatar);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(me.display_name);
          setAvatar(me.avatar);
          setOpen(true);
        }}
        className="btn-ghost ml-auto flex items-center gap-1 px-2 py-0.5 text-xs"
      >
        <Pencil size={12} /> {label}
      </button>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateMe(state.league.id, name, avatar);
      setOpen(false);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="inset mt-2 w-full space-y-3 p-3">
      <div className="label">Your name &amp; avatar in this league</div>
      <AvatarPicker value={avatar} onChange={setAvatar} taken={taken} />
      <input className="field mono" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn-primary px-4 py-2 text-sm" disabled={busy || !name.trim()}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <ErrorText error={error} />
    </form>
  );
}
