import { getTrending } from "@/lib/tmdb-server";

// Public: a fixed, cached list (not an open proxy), used for the sign-in poster wall.
export async function GET(request: Request) {
  void request.url; // request-time route; the TMDb call itself is cached for hours
  try {
    return Response.json({ results: await getTrending() }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return Response.json({ results: [] });
  }
}
