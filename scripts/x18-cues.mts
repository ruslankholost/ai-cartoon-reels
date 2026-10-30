// node scripts/x18-cues.mts  ->  scratch/cues.json for x18 "Unattended" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/x16-cues.mts is the model): the fifteen voice takes at their places on the
// reel's clock (the table read's: the lead and the gaps of episodes/x18.jsonc carry the silent beats; the kids' chant is three takes on each other, 9, 10 and 11), the sound cues of src/x18-sched.ts (every sound's measured peak on its
// picture's hit; the register, the glug, the coins, the giggle, the squeak, the licks, the bells, the wagon, the cups, the zap, the flip, the frenzy, the dryer and the clock start on their frames), and the 26 pictures for the contact sheet.
// `duck`: the sounds sit 6 dB lower while somebody talks. Every line is its voice file as it is.
import fs from "node:fs";
import { LINES, NO, SHEET_T, SHOTS, T_END, cues } from "../src/x18-sched.ts";

const out = {
  total: T_END,
  duck: 6,
  voices: LINES.map((l) => ({ file: l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs })), text: l.text })),
  cues: cues(),
  shots: SHOTS.map((s, i) => ({ key: `${NO[s.id]}-${s.id}`, start: SHEET_T[s.id] - 0.01, end: SHEET_T[s.id] + 0.01, n: i + 1 })),   // (the contact sheet takes the middle of start .. end: here the shot's named moment)
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
