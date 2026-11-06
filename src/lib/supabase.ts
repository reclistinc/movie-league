"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Browser Supabase client. All game rules are enforced in Postgres, so the anon key is safe to ship. */
export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local",
      );
    }
    client = createClient(url, key, {
      // "implicit": the default Supabase email link carries the session itself, so it works even when a
      // phone opens it in a different browser (e.g. the Gmail app). Our custom template uses token_hash.
      auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true },
    });
  }
  return client;
}
