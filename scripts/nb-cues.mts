// node scripts/nb-cues.mts  ->  scratch/cues.json for "Nobody Picks Up" (same shape scripts/mix.py and stt-lines.py read);
// `endcard` is the final thunk, where the music's last hit is laid.
import fs from "node:fs";
import { buildSched, type Timings } from "../src/nb-sched.ts";

const S = buildSched(JSON.parse(fs.readFileSync("public/nobody/timings.json", "utf8")) as Timings);
const out = {
  total: S.total,
  endcard: S.T.thunk,
  voices: S.takes.map((t, k) => ({ file: t.file, at: S.P[k], who: t.character, first: t.voiced?.[0]?.[0] ?? t.words[0].t, end: t.end, words: t.words.map((w) => ({ d: w.d, t: w.t, e: w.e })), text: t.text })),
  cues: [...S.cues].sort((a, b) => a.at - b.at),
  shots: S.shots,
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, counts);
