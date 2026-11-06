// Looks up a pasted YouTube video (title, channel) and whether it can be played inside the app.
// Uses YouTube's public oEmbed endpoint — no API key needed.

const ID = /^[A-Za-z0-9_-]{11}$/;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!ID.test(id)) return Response.json({ error: "That doesn't look like a YouTube video." }, { status: 400 });
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
    );
    if (res.status === 401 || res.status === 403)
      return Response.json({ error: "That video's owner doesn't allow it to be played on other sites — try another upload." }, { status: 422 });
    if (!res.ok) return Response.json({ error: "Couldn't find that video — it may be private or deleted." }, { status: 404 });
    const o = (await res.json()) as { title?: string; author_name?: string };
    return Response.json(
      { id, title: o.title ?? "YouTube video", channel: o.author_name ?? null },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return Response.json({ error: "Couldn't reach YouTube — try again in a moment." }, { status: 502 });
  }
}
