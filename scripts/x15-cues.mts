// node scripts/x15-cues.mts  ->  scratch/cues.json for x15 "Bleep Fee" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/x12-cues.mts is the model): the nine voice takes at their places on the
// reel's clock (the table read's: the lead and the gaps of episodes/x15.jsonc carry the silent beats), the sound cues of src/x15-sched.ts (every sound's measured peak on its picture's hit; the spit, the splat, the kettle and the scribble start on
// their frame), and the 27 shots for the contact sheet. `duck`: the sounds sit 6 dB lower while somebody talks. No bed: the room is quiet. Every line is its voice file as it is (no echo, no muffle).
import fs from "node:fs";
import { LINES, SHEET_T, SHOTS, T_END, cues } from "../src/x15-sched.ts";

const out = {
  total: T_END,
  duck: 6,
  voices: LINES.map((l) => ({ file: l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs, ...(w.bleep ? { bleep: true } : {}) })), text: l.text, ...(l.n === 1 ? { bp: [300, 3400] } : {}) })),   // (the robocall comes through a phone: a band-pass of 300-3400 Hz; a bleeped word is a tone in the mix, scripts/stt-lines.py does not expect it)
  cues: cues(),
  shots: SHOTS.map((s, i) => ({ key: s.id, start: SHEET_T[s.id] - 0.01, end: SHEET_T[s.id] + 0.01, n: i + 1 })),   // (the contact sheet takes the middle of start .. end: here the shot's named moment)
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
