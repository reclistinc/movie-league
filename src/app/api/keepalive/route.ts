// Daily Vercel cron (see vercel.json): one tiny database read so the free Supabase project
// never pauses for inactivity. Free on Vercel's Hobby plan.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  const res = await fetch(`${url}/rest/v1/rpc/keepalive_ping`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  return Response.json({ ok: res.ok, at: res.ok ? await res.json() : null }, { status: res.ok ? 200 : 502 });
}
