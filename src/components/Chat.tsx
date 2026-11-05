"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, LeagueState } from "@/lib/types";
import { Avatar, Button, Card, ErrorText, inputCls, memberMap } from "./ui";

export function Chat({ state }: { state: LeagueState }) {
  const leagueId = state.league.id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const byId = memberMap(state.members);

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

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

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
    <Card className="flex h-[65vh] flex-col">
      <ul className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && <li className="text-sm text-zinc-500">No messages yet. Talk some trash.</li>}
        {messages.map((m) => {
          const who = byId[m.user_id];
          return (
            <li key={m.id} className="flex gap-2">
              <Avatar avatar={who?.avatar ?? ""} size={28} />
              <div>
                <p className="text-xs text-zinc-500">
                  {who?.display_name ?? "Someone"} ·{" "}
                  {new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
              </div>
            </li>
          );
        })}
        <div ref={bottom} />
      </ul>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input className={`${inputCls} flex-1`} maxLength={1000} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
        <Button>Send</Button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}
