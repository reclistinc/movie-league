// Artwork ported from the original prototype (movie-league-v2.jsx):
// genre palettes, the 20 drawn characters, and the generated poster used when TMDb has no image.
import type React from "react";

export const GENRE_STYLE: Record<string, { from: string; to: string; icon: string }> = {
  Drama: { from: "#5b2333", to: "#211622", icon: "\u{1F3AD}" },
  Comedy: { from: "#f0b429", to: "#7a4a12", icon: "\u{1F3AA}" },
  SciFi: { from: "#0f5c66", to: "#141a3d", icon: "\u{1F6F8}" },
  Horror: { from: "#7a1f1f", to: "#120909", icon: "\u{1F52A}" },
  Action: { from: "#c0521f", to: "#2a1509", icon: "\u{1F4A5}" },
  Romance: { from: "#a83a63", to: "#3a1530", icon: "\u{1F339}" },
  Animation: { from: "#2fb3a3", to: "#3a1f6e", icon: "\u{1F3A8}" },
  Thriller: { from: "#3a4152", to: "#0b0c11", icon: "\u{1F0CF}" },
  Fantasy: { from: "#5b3fa0", to: "#1a1442", icon: "\u2728" },
  Documentary: { from: "#4a5568", to: "#1c2230", icon: "\u{1F3A5}" },
  Musical: { from: "#e0a13c", to: "#7a2e4d", icon: "\u{1F3B5}" },
  Western: { from: "#b5893a", to: "#3a2410", icon: "\u{1F335}" },
};

export const AVATAR_OPTIONS = [
  { id: "detective", label: "Detective", color: "#3a2410", skin: "#d9a066" },
  { id: "wizard", label: "Wizard", color: "#1a1442", skin: "#d9a066" },
  { id: "astronaut", label: "Astronaut", color: "#0f5c66", skin: "#cfd8e3" },
  { id: "robot", label: "Robot", color: "#4a5568", skin: "#aab4c4" },
  { id: "ghost", label: "Ghost", color: "#3a4152", skin: "#eef1f6" },
  { id: "alien", label: "Alien", color: "#0f5c66", skin: "#7fd6c2" },
  { id: "cowboy", label: "Cowboy", color: "#7a4a12", skin: "#d9a066" },
  { id: "vampire", label: "Vampire", color: "#7a1f1f", skin: "#d8c6e0" },
  { id: "ninja", label: "Ninja", color: "#151821", skin: "#d9a066" },
  { id: "pirate", label: "Pirate", color: "#7a1f1f", skin: "#d9a066" },
  { id: "hero", label: "Hero", color: "#c0521f", skin: "#d9a066" },
  { id: "scientist", label: "Scientist", color: "#4a5568", skin: "#d9a066" },
  { id: "explorer", label: "Explorer", color: "#5a7a3a", skin: "#d9a066" },
  { id: "knight", label: "Knight", color: "#4a5568", skin: "#c9ccd1" },
  { id: "monster", label: "Monster", color: "#1a2e12", skin: "#6fae52" },
  { id: "star", label: "Star", color: "#111", skin: "#d9a066" },
  { id: "rager", label: "Rager", color: "#14210d", skin: "#4a8f3e" },
  { id: "lizard", label: "Lizard", color: "#3a4a12", skin: "#8fae52" },
  { id: "cyborg", label: "Cyborg", color: "#1c2230", skin: "#c9ccd1" },
  { id: "guardian", label: "Guardian", color: "#0c0f1a", skin: "#d9a066" },
];

export const AVATAR_MAP = Object.fromEntries(AVATAR_OPTIONS.map((a) => [a.id, a]));

const ANGRY_BROWS = new Set(["rager", "monster", "lizard"]);
const NO_MOUTH = new Set(["robot", "knight", "cyborg", "lizard"]);

export function CharacterFace({ type, skin, accent }: { type: string; skin: string; accent: string }) {
  const line = "#211a06";

  if (type === "ghost") {
    return (
      <>
        <path d="M20 90 V50 a30 30 0 0 1 60 0 V90 l-8 -8 -8 8 -8 -8 -8 8 -8 -8 -8 8 -8 -8Z" fill={skin} stroke={line} strokeWidth="2" />
        <ellipse cx="44" cy="40" rx="9" ry="6" fill="#fff" opacity="0.35" />
        <circle cx="42" cy="46" r="4.5" fill={line} />
        <circle cx="62" cy="46" r="4.5" fill={line} />
        <path d="M44 58 Q52 62 60 58" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    );
  }

  const shoulders = <path d="M0 80 Q52 60 104 80 L104 100 L0 100 Z" fill="#242830" stroke={line} strokeWidth="1.5" />;

  let headShape: React.ReactNode;
  if (type === "robot" || type === "knight") {
    headShape = <rect x="20" y="18" width="64" height="60" rx="14" fill={skin} stroke={line} strokeWidth="2" />;
  } else if (type === "alien") {
    headShape = <ellipse cx="52" cy="48" rx="26" ry="34" fill={skin} stroke={line} strokeWidth="2" />;
  } else if (type === "lizard") {
    headShape = (
      <>
        <ellipse cx="50" cy="54" rx="32" ry="24" fill={skin} stroke={line} strokeWidth="2" />
        <ellipse cx="18" cy="58" rx="14" ry="11" fill={skin} stroke={line} strokeWidth="2" />
      </>
    );
  } else if (type === "rager") {
    headShape = <circle cx="52" cy="50" r="33" fill={skin} stroke={line} strokeWidth="2" />;
  } else {
    headShape = <circle cx="52" cy="50" r="30" fill={skin} stroke={line} strokeWidth="2" />;
  }

  const shading = (
    <>
      <ellipse cx="40" cy="36" rx="11" ry="7" fill="#fff" opacity="0.16" />
      <path d="M28 62 Q52 78 76 62 L76 72 Q52 84 28 72 Z" fill="#000" opacity="0.1" />
    </>
  );

  let eyes: React.ReactNode;
  if (type === "robot") {
    eyes = <><rect x="34" y="44" width="10" height="7" rx="2" fill={accent} /><rect x="60" y="44" width="10" height="7" rx="2" fill={accent} /></>;
  } else if (type === "alien") {
    eyes = <><ellipse cx="40" cy="48" rx="8" ry="12" fill={line} transform="rotate(-12 40 48)" /><ellipse cx="66" cy="48" rx="8" ry="12" fill={line} transform="rotate(12 66 48)" /><ellipse cx="37" cy="44" rx="2" ry="3" fill="#fff" opacity="0.6" /><ellipse cx="63" cy="44" rx="2" ry="3" fill="#fff" opacity="0.6" /></>;
  } else if (type === "knight") {
    eyes = <rect x="32" y="46" width="40" height="7" rx="2" fill={line} />;
  } else if (type === "lizard") {
    eyes = <><ellipse cx="34" cy="46" rx="3" ry="8" fill="#c8221a" transform="rotate(15 34 46)" /><ellipse cx="60" cy="40" rx="3.5" ry="9" fill="#c8221a" transform="rotate(15 60 40)" /></>;
  } else if (type === "monster") {
    eyes = <><circle cx="40" cy="46" r="6" fill={line} /><circle cx="66" cy="50" r="4" fill={line} /></>;
  } else if (type === "cyborg") {
    eyes = <circle cx="38" cy="48" r="4.5" fill={line} />;
  } else {
    eyes = <><circle cx="42" cy="50" r="4" fill={line} /><circle cx="64" cy="50" r="4" fill={line} /><circle cx="43.2" cy="48.5" r="1.1" fill="#fff" /><circle cx="65.2" cy="48.5" r="1.1" fill="#fff" /></>;
  }

  const brows = ANGRY_BROWS.has(type) ? (
    <>
      <path d="M32 40 L48 36" stroke={line} strokeWidth="3" strokeLinecap="round" />
      <path d="M56 36 L72 40" stroke={line} strokeWidth="3" strokeLinecap="round" />
    </>
  ) : type === "robot" || type === "cyborg" || type === "lizard" ? null : (
    <>
      <path d="M36 40 Q42 37 48 40" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M56 40 Q62 37 68 40" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );

  let mouth: React.ReactNode = null;
  if (!NO_MOUTH.has(type)) {
    if (type === "vampire") {
      mouth = (
        <>
          <path d="M44 62 Q52 66 60 62" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M46 63 L48 69 L50 63Z" fill="#fff" stroke={line} strokeWidth="1" />
          <path d="M54 63 L56 69 L58 63Z" fill="#fff" stroke={line} strokeWidth="1" />
        </>
      );
    } else if (type === "rager") {
      mouth = (
        <>
          <path d="M38 62 Q52 58 66 62 L64 70 Q52 74 40 70 Z" fill="#7a1f1f" stroke={line} strokeWidth="2" />
          <path d="M42 63 L44 68 M50 63 L50 69 M58 63 L56 68" stroke="#fff" strokeWidth="2" />
        </>
      );
    } else if (type === "pirate") {
      mouth = <path d="M42 62 Q52 70 62 60" stroke={line} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
    } else if (type === "hero" || type === "guardian") {
      mouth = <path d="M42 62 Q52 67 62 62" stroke={line} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
    } else {
      mouth = <path d="M44 64 Q52 68 60 64" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />;
    }
  }

  let extra: React.ReactNode = null;
  switch (type) {
    case "detective":
      extra = (
        <>
          <path d="M16 34 Q52 14 90 34 L86 40 Q52 24 20 40 Z" fill={accent} stroke={line} strokeWidth="2" />
          <rect x="30" y="18" width="46" height="16" rx="3" fill={accent} stroke={line} strokeWidth="2" />
          <rect x="30" y="30" width="46" height="4" fill="#8a6a3a" />
          <path d="M40 58 Q52 62 64 58 L62 61 Q52 65 42 61 Z" fill="#3a2a1a" stroke={line} strokeWidth="1" />
        </>
      );
      break;
    case "wizard":
      extra = (
        <>
          <path d="M52 4 L82 40 Q52 32 22 40 Z" fill={accent} stroke={line} strokeWidth="2" />
          <circle cx="60" cy="18" r="2" fill="#f0b429" />
          <circle cx="46" cy="26" r="1.6" fill="#f0b429" />
          <circle cx="52" cy="8" r="4" fill="#f0b429" />
          <path d="M30 68 Q52 84 74 68 L72 78 Q52 90 32 78 Z" fill="#eef1f6" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case "astronaut":
      extra = (
        <>
          <circle cx="52" cy="48" r="34" fill="none" stroke={accent} strokeWidth="5" />
          <path d="M28 32 Q52 20 76 32" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" />
          <path d="M32 60 Q52 70 72 60" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" />
          <line x1="52" y1="18" x2="52" y2="6" stroke={accent} strokeWidth="3" />
          <circle cx="52" cy="4" r="4" fill={accent} />
        </>
      );
      break;
    case "robot":
      extra = (
        <>
          <line x1="52" y1="18" x2="52" y2="6" stroke={accent} strokeWidth="3" />
          <circle cx="52" cy="4" r="4" fill="#f0b429" />
          <rect x="14" y="40" width="8" height="16" rx="3" fill={skin} stroke={line} strokeWidth="2" />
          <rect x="82" y="40" width="8" height="16" rx="3" fill={skin} stroke={line} strokeWidth="2" />
          <path d="M38 62 L46 62 M50 62 L58 62 M62 62 L70 62" stroke={line} strokeWidth="2" />
          <path d="M26 26 L30 20 M78 26 L74 20" stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "alien":
      extra = (
        <>
          <line x1="40" y1="16" x2="34" y2="4" stroke={accent} strokeWidth="3" />
          <circle cx="34" cy="4" r="4" fill={accent} />
          <line x1="64" y1="16" x2="70" y2="4" stroke={accent} strokeWidth="3" />
          <circle cx="70" cy="4" r="4" fill={accent} />
        </>
      );
      break;
    case "cowboy":
      extra = (
        <>
          <ellipse cx="52" cy="26" rx="42" ry="9" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M32 26 Q52 -2 72 26 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M32 26 Q52 20 72 26" fill="none" stroke="#4a2f0d" strokeWidth="2" />
          <path d="M20 78 Q52 88 84 78" fill="none" stroke="#7a4a12" strokeWidth="6" />
        </>
      );
      break;
    case "vampire":
      extra = (
        <>
          <path d="M44 22 L52 34 L60 22 Z" fill="#0c0c12" />
          <path d="M14 70 L30 46 L34 74 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M90 70 L74 46 L70 74 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M24 22 Q36 8 52 12 Q68 8 80 22 Q66 16 52 18 Q38 16 24 22 Z" fill="#0c0c12" />
        </>
      );
      break;
    case "ninja":
      extra = (
        <>
          <rect x="18" y="40" width="68" height="16" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M86 44 L98 40 L96 50 Z" fill={accent} stroke={line} strokeWidth="1.5" />
          <rect x="16" y="18" width="72" height="14" rx="4" fill={accent} stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "pirate":
      extra = (
        <>
          <path d="M18 32 Q52 14 86 32 L86 44 Q52 30 18 44 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M20 34 L14 30 M20 38 L14 40" stroke={accent} strokeWidth="2" />
          <circle cx="64" cy="50" r="9" fill="#151821" stroke={line} strokeWidth="2" />
          <line x1="73" y1="46" x2="90" y2="40" stroke="#151821" strokeWidth="2" />
          <circle cx="30" cy="56" r="2.5" fill="#f0b429" stroke={line} strokeWidth="1" />
        </>
      );
      break;
    case "hero":
      extra = (
        <>
          <path d="M20 44 Q52 34 84 44 L80 54 Q52 46 24 54 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M20 78 L28 66 L36 78 Z" fill={accent} />
          <path d="M68 78 L76 66 L84 78 Z" fill={accent} />
          <path d="M46 84 L52 76 L58 84 L52 90 Z" fill="none" stroke={accent} strokeWidth="2.5" />
        </>
      );
      break;
    case "scientist":
      extra = (
        <>
          <circle cx="42" cy="50" r="10" fill="none" stroke={accent} strokeWidth="3" />
          <circle cx="64" cy="50" r="10" fill="none" stroke={accent} strokeWidth="3" />
          <line x1="52" y1="50" x2="54" y2="50" stroke={accent} strokeWidth="3" />
          <path d="M18 26 Q30 8 52 14 Q74 8 86 26" fill="none" stroke={line} strokeWidth="3" />
          <path d="M30 80 L40 68 L64 68 L74 80" fill="#fff" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case "explorer":
      extra = (
        <>
          <ellipse cx="52" cy="28" rx="40" ry="8" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M30 28 Q52 8 74 28 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M30 28 Q52 24 74 28" fill="none" stroke="#3d5228" strokeWidth="2" />
          <path d="M18 74 L34 84 L20 90 Z" fill="#7a5a2e" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case "knight":
      extra = (
        <>
          <rect x="26" y="44" width="52" height="8" fill="#1c2230" />
          <path d="M20 30 Q52 16 84 30 L80 60 Q52 50 24 60 Z" fill="none" stroke={line} strokeWidth="2.5" />
          <line x1="52" y1="16" x2="52" y2="60" stroke={line} strokeWidth="2" />
          <path d="M18 76 Q52 68 86 76 L84 90 Q52 82 20 90 Z" fill={accent} stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "monster":
      extra = (
        <>
          <rect x="12" y="46" width="8" height="6" fill="#8a94a6" stroke={line} strokeWidth="1.5" />
          <rect x="84" y="46" width="8" height="6" fill="#8a94a6" stroke={line} strokeWidth="1.5" />
          <path d="M34 24 L40 30 L46 24 L52 30 L58 24 L64 30 L70 24" fill="none" stroke={line} strokeWidth="2" />
          <path d="M40 66 L44 70 L48 66 L52 70 L56 66 L60 70 L64 66" fill="none" stroke={line} strokeWidth="1.5" />
        </>
      );
      break;
    case "star":
      extra = (
        <>
          <rect x="30" y="44" width="18" height="9" rx="4" fill="#111" />
          <rect x="56" y="44" width="18" height="9" rx="4" fill="#111" />
          <line x1="48" y1="48" x2="56" y2="48" stroke="#111" strokeWidth="2" />
          <ellipse cx="36" cy="46" rx="3" ry="1.6" fill="#fff" opacity="0.5" />
          <path d="M84 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="#f0b429" />
          <path d="M20 20 Q30 6 46 12" fill="none" stroke="#3a2a10" strokeWidth="4" strokeLinecap="round" />
        </>
      );
      break;
    case "rager":
      extra = (
        <>
          <path d="M20 82 L26 74 L32 82 L38 74 L44 82" fill="none" stroke={line} strokeWidth="2" />
          <path d="M60 82 L66 74 L72 82 L78 74 L84 82" fill="none" stroke={line} strokeWidth="2" />
          <path d="M14 50 Q10 60 16 68" fill="none" stroke={line} strokeWidth="2" />
          <path d="M90 50 Q94 60 88 68" fill="none" stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "lizard":
      extra = (
        <>
          <path d="M30 26 L34 16 L38 26 M46 22 L50 12 L54 22 M62 26 L66 16 L70 26" fill={skin} stroke={line} strokeWidth="1.5" />
          <path d="M4 56 L9 64 L14 56 L19 64 L24 56" fill="#fff" stroke={line} strokeWidth="1.5" />
          <path d="M20 70 Q30 76 40 72" fill="none" stroke={line} strokeWidth="2" />
        </>
      );
      break;
    case "cyborg":
      extra = (
        <>
          <path d="M52 20 L84 22 Q92 50 84 78 L52 80 Z" fill="#3a4152" stroke={line} strokeWidth="2" />
          <circle cx="68" cy="50" r="6" fill="#e2472c" />
          <circle cx="68" cy="50" r="9" fill="none" stroke="#e2472c" strokeWidth="1.5" opacity="0.5" />
          <rect x="49" y="18" width="4" height="64" fill="#151821" />
          <path d="M74 34 L80 34 M74 66 L80 66" stroke="#151821" strokeWidth="2" />
          <line x1="20" y1="70" x2="14" y2="86" stroke="#8a94a6" strokeWidth="3" />
          <circle cx="13" cy="88" r="3" fill="#f0b429" />
        </>
      );
      break;
    case "guardian":
      extra = (
        <>
          <path d="M8 92 Q52 104 96 92 L96 58 Q52 46 8 58 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M40 20 Q52 8 64 20 L60 32 Q52 26 44 32 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M30 24 Q34 6 42 22 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M62 22 Q70 6 74 24 Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M46 74 L52 68 L58 74 L52 80 Z" fill="none" stroke="#c9ccd1" strokeWidth="2" />
        </>
      );
      break;
    default:
      extra = null;
  }

  return (
    <>
      {shoulders}
      {headShape}
      {shading}
      {eyes}
      {brows}
      {mouth}
      {extra}
    </>
  );
}

export const hashStr = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const wrapTitle = (title: string, maxChars = 11, maxLines = 3) => {
  const words = (title || "").split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? cur + " " + w : w;
    if (candidate.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    trimmed[maxLines - 1] = trimmed[maxLines - 1].slice(0, maxChars - 1) + "\u2026";
    return trimmed;
  }
  return lines;
};

export function GeneratedPoster({ genre, title, year, size = "normal" }: { genre?: string; title: string; year?: number | null; size?: "normal" | "small" }) {
  const style = (genre && GENRE_STYLE[genre]) || GENRE_STYLE.Drama;
  const seed = hashStr((title || genre || "movie") + (year || ""));
  const angle = 20 + (seed % 140);
  const spotX = 20 + (seed % 60);
  const spotY = 15 + ((seed >> 3) % 40);
  const shapeType = seed % 3;
  const uid2 = seed.toString(36);
  const lines = size === "small" ? [] : wrapTitle(title, 13, 3);

  return (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block", borderRadius: 6, overflow: "hidden" }}
    >
      <defs>
        <linearGradient id={`grad-${uid2}`} x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform={`rotate(${angle} 50 70)`}>
          <stop offset="0%" stopColor={style.from} />
          <stop offset="100%" stopColor={style.to} />
        </linearGradient>
        <radialGradient id={`spot-${uid2}`} cx={`${spotX}%`} cy={`${spotY}%`} r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`vig-${uid2}`} cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <rect width="100" height="140" fill={`url(#grad-${uid2})`} />
      <rect width="100" height="140" fill={`url(#spot-${uid2})`} />
      {shapeType === 0 && (
        <g opacity="0.25" stroke="#ffffff" fill="none" strokeWidth="1">
          <circle cx={spotX} cy={spotY} r="14" />
          <circle cx={spotX} cy={spotY} r="24" />
          <circle cx={spotX} cy={spotY} r="34" />
        </g>
      )}
      {shapeType === 1 && (
        <g opacity="0.16" stroke="#ffffff" strokeWidth="1.4">
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={-10 + i * 30} y1="0" x2={-30 + i * 30} y2="140" />
          ))}
        </g>
      )}
      {shapeType === 2 && (
        <g opacity="0.2" fill="#ffffff">
          {Array.from({ length: 24 }).map((_, i) => (
            <circle key={i} cx={8 + (i % 4) * 28} cy={10 + Math.floor(i / 4) * 22} r="1.6" />
          ))}
        </g>
      )}
      {size !== "small" && (
        <text x="50" y="76" textAnchor="middle" fontSize="72" opacity="0.14" style={{ pointerEvents: "none" }}>{style.icon}</text>
      )}
      <rect width="100" height="140" fill={`url(#vig-${uid2})`} />
      <g fill="rgba(0,0,0,0.22)">
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x="0" y={6 + i * 19} width="6" height="10" rx="2" />
        ))}
      </g>
      <rect x="1.5" y="1.5" width="97" height="137" rx="5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <text x="94" y="14" textAnchor="end" fontSize={size === "small" ? 13 : 16}>{style.icon}</text>
      {size !== "small" && year && (
        <text x="6" y="14" fontFamily="'Space Mono', monospace" fontSize="7" fill="rgba(255,255,255,0.75)">{year}</text>
      )}
      {size !== "small" && lines.length > 0 && (
        <>
          <rect x="0" y={132 - lines.length * 13} width="100" height={140 - (132 - lines.length * 13)} fill="rgba(10,8,4,0.55)" />
          <line x1="10" y1={132 - lines.length * 13} x2="90" y2={132 - lines.length * 13} stroke={style.from} strokeWidth="1.2" opacity="0.9" />
          <text x="50" y={136 - (lines.length - 1) * 11} textAnchor="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="10.5" fill="#fff" style={{ letterSpacing: "0.02em" }}>
            {lines.map((l, i) => (
              <tspan key={i} x="50" dy={i === 0 ? 0 : 12}>{l.toUpperCase()}</tspan>
            ))}
          </text>
        </>
      )}
    </svg>
  );
}
