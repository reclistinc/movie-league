import { getMovieDetails } from "@/lib/tmdb-server";

// Public, cached per movie id: backdrop, genres, overview and YouTube trailers/clips.
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Bad id" }, { status: 400 });
  try {
    return Response.json(await getMovieDetails(id), { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
