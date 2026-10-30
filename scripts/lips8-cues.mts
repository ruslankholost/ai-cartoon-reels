// node scripts/lips8-cues.mts  ->  scratch/cues.json for "Cold Lips" v8 (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/lips-cues.mts is v2's): the voice takes at their places on the
// reel's clock (the table read's: the lead and the gaps of episodes/lips8.jsonc carry the silent beats), the sound cues of src/lips8-sched.ts, and the 31 shots for the contact sheet. `duck`: the sounds sit 8 dB lower while
// somebody talks. No word is bleeped.
import fs from "node:fs";
import { LINES, SHOTS, T_END, cues } from "../src/lips8-sched.ts";

const out = {
  total: T_END,
  duck: 8,
  voices: LINES.map((l) => ({ file: l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs })), text: l.text })),
  cues: cues(),
  shots: SHOTS.map((s, i) => ({ key: s.id, start: s.t0, end: Math.min(s.t1, T_END - 0.03), n: i + 1 })),
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
