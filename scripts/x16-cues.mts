// node scripts/x16-cues.mts  ->  scratch/cues.json for x16 "Hiring a Zoomer" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/x15-cues.mts is the model): the fifteen voice takes at their places on the
// reel's clock (the table read's: the lead and the gaps of episodes/x16.jsonc carry the silent beats), the sound cues of src/x16-sched.ts (every sound's measured peak on its picture's hit; the ring light, the slurp, the unsheathe, the kettle,
// the storm and the grumble of the line start on their frames), and the 28 shots for the contact sheet. `duck`: the sounds sit 6 dB lower while somebody talks. No bed: the room is quiet. Every line is its voice file as it is, except Mom's
// first two (9 and 10): they come out of a phone, through a band-pass of 250-4500 Hz (`bp`, scripts/sp-mix.py; 300-3400 lost the "Or" of line 10 once encoded); line 12 is her full voice, since her arm is out of the screen by then.
import fs from "node:fs";
import { LINES, SHEET_T, SHOTS, T_END, cues } from "../src/x16-sched.ts";

const out = {
  total: T_END,
  duck: 6,
  voices: LINES.map((l) => ({ file: l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs })), text: l.text, ...(l.n === 9 || l.n === 10 ? { bp: [250, 4500] } : {}) })),
  cues: cues(),
  shots: SHOTS.map((s, i) => ({ key: s.id, start: SHEET_T[s.id] - 0.01, end: SHEET_T[s.id] + 0.01, n: i + 1 })),   // (the contact sheet takes the middle of start .. end: here the shot's named moment)
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
