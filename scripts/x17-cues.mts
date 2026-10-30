// node scripts/x17-cues.mts  ->  scratch/cues.json for x17 "Seat Swap" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/x16-cues.mts is the model): the fourteen voice takes at their places on the
// reel's clock (the table read's: the lead and the gaps of episodes/x17.jsonc carry the silent beats; the couple's "Hiii!" is two takes on each other, 2 and 3, 13 and 14), the sound cues of src/x17-sched.ts (every sound's measured peak on its
// picture's hit; the chime, the flush, the squawk, the wind bed, the suck, the kettle and the squeak start on their frames), and the 22 shots for the contact sheet. `duck`: the sounds sit 6 dB lower while somebody talks. The wind is a bed from
// the door's pop (12.97 s) to the cut to the cockpit (24.17 s); it is ducked under the voices like every other sound. Every line is its voice file as it is.
import fs from "node:fs";
import { LINES, SHEET_T, SHOTS, T_END, cues } from "../src/x17-sched.ts";

const out = {
  total: T_END,
  duck: 6,
  voices: LINES.map((l) => ({ file: l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs })), text: l.text })),
  cues: cues(),
  shots: SHOTS.map((s, i) => ({ key: s.id, start: SHEET_T[s.id] - 0.01, end: SHEET_T[s.id] + 0.01, n: i + 1 })),   // (the contact sheet takes the middle of start .. end: here the shot's named moment)
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
