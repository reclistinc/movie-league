import { formatTime, parseTime, parseYouTube } from "../src/lib/youtube.ts";
let failed = 0;
const eq = (what: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
const id = "dQw4w9WgXcQ";
eq("watch link", parseYouTube(`https://www.youtube.com/watch?v=${id}`), { id, start: null });
eq("watch link with t=83", parseYouTube(`https://www.youtube.com/watch?v=${id}&t=83s`), { id, start: 83 });
eq("share link", parseYouTube(`https://youtu.be/${id}?si=abc123`), { id, start: null });
eq("share link with start", parseYouTube(`https://youtu.be/${id}?t=1m23s`), { id, start: 83 });
eq("shorts", parseYouTube(`https://youtube.com/shorts/${id}?feature=share`), { id, start: null });
eq("mobile", parseYouTube(`https://m.youtube.com/watch?v=${id}&t=90`), { id, start: 90 });
eq("embed", parseYouTube(`https://www.youtube.com/embed/${id}?start=12`), { id, start: 12 });
eq("live", parseYouTube(`https://www.youtube.com/live/${id}`), { id, start: null });
eq("no scheme", parseYouTube(`youtube.com/watch?v=${id}`), { id, start: null });
eq("bare id", parseYouTube(id), { id, start: null });
eq("not youtube", parseYouTube("https://vimeo.com/12345"), null);
eq("bad id", parseYouTube("https://youtu.be/short"), null);
eq("junk", parseYouTube("hello there"), null);
eq("time 1:23", parseTime("1:23"), 83);
eq("time 1:02:03", parseTime("1:02:03"), 3723);
eq("time 83", parseTime("83"), 83);
eq("time 1m5s", parseTime("1m5s"), 65);
eq("time bad", parseTime("1:75"), null);
eq("time blank", parseTime(""), null);
eq("format 83", formatTime(83), "1:23");
eq("format 3723", formatTime(3723), "1:02:03");
if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log("YOUTUBE LINK TESTS PASSED");
