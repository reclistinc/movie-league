"use client";

import { useEffect, useRef, useState } from "react";
import { Ticket } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, LeagueState } from "@/lib/types";
import { Avatar, ErrorText, SectionTitle, memberMap } from "./ui";
import { PlayerLink } from "./PlayerCard";

export function Chat({ state }: { state: LeagueState }) {
  const leagueId = state.league.id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const byId = memberMap(state.members);
  const me = byId[state.me];

  useEffect(() => {
    api.chatHistory(leagueId).then(setMessages, (e) => setError(e.message));
    const channel = supabase()
      .channel(`chat:${leagueId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `league_id=eq.${leagueId}` },
        (payload) =>
          setMessages((ms) => (ms.some((m) => m.id === payload.new.id) ? ms : [...ms, payload.new as ChatMessage])),
      )
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [leagueId]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    try {
      await api.sendChat(leagueId, text);
    } catch (err) {
      setError((err as Error).message);
      setBody(text);
    }
  }

  return (
    <div className="card flex h-[65vh] min-h-[420px] flex-col p-4">
      <SectionTitle icon={<Ticket size={16} color="var(--marquee-gold)" />}>LOBBY CHAT</SectionTitle>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-[13px]" style={{ color: "var(--reel-grey)" }}>
            No messages yet — say hi before the next round kicks off.
          </p>
        )}
        {messages.map((m) => {
          const who = byId[m.user_id];
          const mine = m.user_id === state.me;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <PlayerLink userId={m.user_id}>
                <Avatar avatar={who?.avatar ?? ""} size={26} />
              </PlayerLink>
              <div className={`flex max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
                <div className="mb-0.5 text-[11px]" style={{ color: "var(--reel-grey)" }}>
                  {who?.display_name ?? "Someone"} ·{" "}
                  {new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
                <div
                  className="whitespace-pre-wrap rounded-[10px] px-3 py-2 text-sm"
                  style={{
                    background: mine ? "rgba(240,180,41,0.15)" : "var(--midnight)",
                    border: mine ? "1px solid var(--marquee-gold)" : "1px solid rgba(107,111,138,0.3)",
                  }}
                >
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="field flex-1 py-2.5"
          maxLength={1000}
          placeholder={`Message as ${me?.display_name ?? "you"}…`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button disabled={!body.trim()} className="btn-primary px-4">
          Send
        </button>
      </form>
      <ErrorText error={error} />
    </div>
  );
}
