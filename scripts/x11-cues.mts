// node scripts/x11-cues.mts  ->  scratch/cues.json for x11 "Are You Open?" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/x10-cues.mts is the model): the sixteen voice takes at their places on the
// reel's clock (the table read's: the lead and the gaps of episodes/x11.jsonc carry the silent beats), the sound cues of src/x11-sched.ts (every sound's measured peak on its picture's hit; the snore, the squeak, the screech, the boil, the clunks and
// the drum start on their frame), and the 27 shots for the contact sheet. `duck`: the sounds sit 6 dB lower while somebody talks. No bed: the rooms are quiet.
// Lines 4, 6, 7 and 9 (Chuck through the glass of a car window, a bedroom window and a shop door) are not the voice files but their muffled copies: scripts/render-x11.sh runs a low-pass of about 1.5 kHz over public/x11/NN-chuck.mp3 into
// scratch/x11-NN-muffled.wav before the mix (a voice rebuild cannot undo it); sp-mix.py looks voice files up under public/, so the path goes back out of it.
import fs from "node:fs";
import { LINES, SHOTS, T_END, cues } from "../src/x11-sched.ts";

const MUFFLED = new Set([4, 6, 7, 9]);
const out = {
  total: T_END,
  duck: 6,
  voices: LINES.map((l) => ({ file: MUFFLED.has(l.n) ? `../scratch/x11-${String(l.n).padStart(2, "0")}-muffled.wav` : l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs })), text: l.text })),
  cues: cues(),
  shots: SHOTS.map((s, i) => ({ key: s.id, start: s.t0, end: Math.min(s.t1, T_END - 0.03), n: i + 1 })),
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
