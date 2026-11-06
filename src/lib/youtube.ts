// Reading YouTube links people paste in, plus start/end times.

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Seconds from "83", "1:23", "1:02:03", "1m23s", "1h2m3s" or "83s". null if blank/unreadable. */
export function parseTime(input: string | null | undefined): number | null {
  const t = (input ?? "").trim().toLowerCase();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  if (/^\d+(:\d{1,2}){1,2}$/.test(t)) {
    const parts = t.split(":").map(Number);
    if (parts.slice(1).some((p) => p >= 60)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (m && (m[1] || m[2] || m[3])) return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return null;
}

/** 83 -> "1:23", 3723 -> "1:02:03" */
export function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/**
 * The video id (and start time, if the link has one) from any common YouTube link:
 * youtube.com/watch?v=…, youtu.be/…, /shorts/…, /embed/…, /live/…, m. and music. hosts, or a bare id.
 */
export function parseYouTube(input: string): { id: string; start: number | null } | null {
  const raw = input.trim();
  if (ID.test(raw)) return { id: raw, start: null };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(first ?? "")) id = second ?? null;
  }
  if (!id || !ID.test(id)) return null;
  const t = url.searchParams.get("t") ?? url.searchParams.get("start") ?? url.hash.match(/t=([^&]+)/)?.[1] ?? null;
  return { id, start: parseTime(t) };
}
