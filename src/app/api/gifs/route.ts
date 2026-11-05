import { createClient } from "@supabase/supabase-js";

// Server-side GIPHY search so the API key stays secret. Signed-in users only.
// Returns { enabled: false } when GIPHY_API_KEY isn't configured, and the UI hides the feature.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""; // read first: keeps this route per-request
  const key = process.env.GIPHY_API_KEY;
  if (!key) return Response.json({ enabled: false, results: [] });

  if (q.length < 2 || q.length > 100) return Response.json({ enabled: true, results: [] });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !sbUrl || !sbKey) return Response.json({ error: "Sign in to search" }, { status: 401 });
  const { data: user, error } = await createClient(sbUrl, sbKey).auth.getUser(token);
  if (error || !user.user) return Response.json({ error: "Sign in to search" }, { status: 401 });

  const params = new URLSearchParams({ api_key: key, q, limit: "12", rating: "pg-13", lang: "en" });
  const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`);
  if (!res.ok) return Response.json({ error: `GIPHY error ${res.status}` }, { status: 502 });
  const body = (await res.json()) as {
    data: { id: string; title: string; images: { fixed_height: { url: string; width: string; height: string } } }[];
  };
  const results = body.data
    .map((g) => ({ id: g.id, title: g.title, url: g.images.fixed_height.url, width: Number(g.images.fixed_height.width), height: Number(g.images.fixed_height.height) }))
    .filter((g) => /^https:\/\/media[0-9]*\.giphy\.com\//.test(g.url));
  return Response.json({ enabled: true, results }, { headers: { "Cache-Control": "private, max-age=300" } });
}
