// node scripts/cues.mts  ->  scratch/cues.json: everything the audio mix needs from the timeline
// (where each voice take starts, every sound cue, the shot starts, the end-card start, the total length)
import fs from "node:fs";
import { buildSched, type Timings } from "../src/sched.ts";

const T = JSON.parse(fs.readFileSync("public/friday/timings.json", "utf8")) as Timings;
const S = buildSched(T);
const out = {
  total: S.total,
  endcard: S.shots[S.shots.length - 1].start,
  voices: S.voice.map((v, k) => ({ file: v.file, at: v.at, who: v.who, first: S.takes[k].voiced?.[0]?.[0] ?? S.takes[k].words[0].t, end: S.takes[k].end, words: S.takes[k].words.map((w) => ({ d: w.d, t: w.t, e: w.e })), text: S.takes[k].text })),
  cues: [...S.cues].sort((a, b) => a.at - b.at),
  shots: S.shots,
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, counts);
