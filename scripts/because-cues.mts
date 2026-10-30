// node scripts/because-cues.mts  ->  scratch/cues.json for "Because" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read):
// the voice takes at their places on the reel's clock (the table read's: the gaps of episodes/because.jsonc carry the silent beats), the sound cues of src/because-sched.ts, and
// two-second "shots" for the contact sheet. `duck`: the sounds sit 8 dB lower while somebody talks. A bleeped word keeps its `bleep` flag, so the speech check does not expect it.
import fs from "node:fs";
import { LINES, T_END, cues } from "../src/because-sched.ts";

const out = {
  total: T_END,
  duck: 8,
  voices: LINES.map((l) => ({ file: l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs, ...(w.bleep ? { bleep: true } : {}) })), text: l.text })),
  cues: cues(),
  shots: Array.from({ length: Math.floor(T_END / 2) }, (_, i) => ({ key: `t${String(i * 2).padStart(2, "0")}`, start: i * 2, end: i * 2 + 2 })),
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
