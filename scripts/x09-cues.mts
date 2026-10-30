// node scripts/x09-cues.mts  ->  scratch/cues.json for x09 "Habits of the Rich" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/x08-cues.mts is the model): the thirteen voice takes at their places on the
// reel's clock (the table read's: the lead and the gaps of episodes/x09.jsonc carry the silent beats), the sound cues of src/x09-sched.ts (every sound's measured peak on its picture's hit; the kettle, the alarm, the woo, the clicks, the marker, the
// washer, the creak, the rustle and the glug start on their frame), and the 28 shots for the contact sheet. `duck`: the sounds sit 6 dB lower while somebody talks. No bed: the room is quiet.
// Line 4 (the guru through the tape) is not the voice file but its muffled copy: scripts/render-x09.sh runs a low-pass of about 800 Hz over public/x09/04-guru.mp3 into scratch/x09-04-muffled.wav before the mix (a voice rebuild cannot undo it);
// sp-mix.py looks voice files up under public/, so the path goes back out of it.
import fs from "node:fs";
import { LINES, SHOTS, T_END, cues } from "../src/x09-sched.ts";

const MUFFLED = "../scratch/x09-04-muffled.wav";
const out = {
  total: T_END,
  duck: 6,
  voices: LINES.map((l) => ({ file: l.n === 4 ? MUFFLED : l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs })), text: l.text })),
  cues: cues(),
  shots: SHOTS.map((s, i) => ({ key: s.id, start: s.t0, end: Math.min(s.t1, T_END - 0.03), n: i + 1 })),
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
