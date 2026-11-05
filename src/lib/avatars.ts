// The 20 avatar archetypes. Keys must match _valid_avatar() in the migration.
// TODO(port): swap the emoji placeholders for the original SVG avatars from movie-league-v2.jsx.
export const AVATARS: Record<string, { label: string; glyph: string }> = {
  detective: { label: "Detective", glyph: "🕵️" },
  wizard: { label: "Wizard", glyph: "🧙" },
  astronaut: { label: "Astronaut", glyph: "🧑‍🚀" },
  robot: { label: "Robot", glyph: "🤖" },
  ghost: { label: "Ghost", glyph: "👻" },
  alien: { label: "Alien", glyph: "👽" },
  cowboy: { label: "Cowboy", glyph: "🤠" },
  vampire: { label: "Vampire", glyph: "🧛" },
  ninja: { label: "Ninja", glyph: "🥷" },
  pirate: { label: "Pirate", glyph: "🏴‍☠️" },
  hero: { label: "Hero", glyph: "🦸" },
  scientist: { label: "Scientist", glyph: "🧑‍🔬" },
  explorer: { label: "Explorer", glyph: "🧭" },
  knight: { label: "Knight", glyph: "🛡️" },
  monster: { label: "Monster", glyph: "👹" },
  star: { label: "Star", glyph: "⭐" },
  rager: { label: "Rager", glyph: "😤" },
  lizard: { label: "Lizard", glyph: "🦎" },
  cyborg: { label: "Cyborg", glyph: "🦾" },
  guardian: { label: "Guardian", glyph: "🗿" },
};

export const AVATAR_KEYS = Object.keys(AVATARS);
