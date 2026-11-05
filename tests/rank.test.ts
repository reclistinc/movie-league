import { rankMovies } from "../src/lib/rank.ts";
const m = (title: string, vote_count: number, popularity = 5, original_title?: string) => ({ title, vote_count, popularity, original_title });
// Realistic-ish vote counts
const homeAlone = [
  m("Home Alone 2: Lost in New York", 8500, 40), m("Home Alone 3", 2200, 20), m("Home Alone 4", 900, 12),
  m("Home Alone: The Holiday Heist", 500, 10), m("Home Sweet Home Alone", 600, 15), m("Home Alone", 12, 2, "Одна дома"),
  m("Home Alone da Riber", 3, 1), m("Home Alone", 2, 1), m("Home Alone", 11500, 60), m("Home Along da Riles: Da Reunion", 1, 3),
];
const top = (q: string, list: ReturnType<typeof m>[], n = 4) => rankMovies(q, list).slice(0, n).map((x) => `${x.title}(${x.vote_count})`).join(" | ");
const checks: [string, string, ReturnType<typeof m>[], string][] = [
  ["home alon", "partial title", homeAlone, "Home Alone(11500)"],
  ["home alone", "exact title", homeAlone, "Home Alone(11500)"],
  ["home alone 2", "sequel by number", homeAlone, "Home Alone 2: Lost in New York(8500)"],
  ["godfather", "leading 'The' ignored, famous beats obscure", [m("Godfather", 40), m("The Godfather Part II", 12000), m("The Godfather", 20000), m("Godfather of Harlem", 10)], "The Godfather(20000)"],
  ["lord rings", "in-order word prefixes", [m("Lords of Dogtown", 900), m("The Lord of the Rings: The Fellowship of the Ring", 25000), m("Rings", 2000)], "The Lord of the Rings: The Fellowship of the Ring(25000)"],
  ["jaws", "short exact", [m("Jaws 2", 2000), m("Jaws", 10000), m("Jaws: The Revenge", 900), m("Jaws of Satan", 30)], "Jaws(10000)"],
  ["amelie", "accents", [m("Amélie", 11000), m("Amelie Rose", 5)], "Amélie(11000)"],
];
let fail = 0;
for (const [q, why, list, want] of checks) {
  const got = top(q, list);
  const ok = got.startsWith(want);
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${q.padEnd(13)} ${why.padEnd(42)} → ${got}`);
}
process.exit(fail);
