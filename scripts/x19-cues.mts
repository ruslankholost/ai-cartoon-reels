// node scripts/x19-cues.mts  ->  scratch/cues.json for x19 "Screen Time" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/x18-cues.mts is the model): the thirteen voice takes at their places on the reel's clock
// (the table read's: the lead and the gaps of episodes/x19.jsonc carry the silent beats), the sound cues of src/x19-sched.ts (every sound's measured peak on its picture's hit; the blast, the cups, the hops, the whimpers, the zip, the canopy, THOOM, the
// windows, the popcorn, the cash, the munch, the slide and the power-up start on their frames) and the song: two runs of public/sfx/song.mp3, the first from the blast (0.30) to the BLIP (23.47: it stops dead), the second from the power-up (29.07) to the end; each
// has its own duck (21 dB under the voices; the other sounds 6), its level steps (`env`, src/x19-sched.ts SONG_ENV) and, from THOOM on, an octave-down bass layer (`boom`). `tail`: the mix fades out over its last 0.08 s, not 0.3: the song's power-up carries
// into the loop. The 30 pictures for the contact sheet are at the shots' named moments. Every line is its voice file as it is.
import fs from "node:fs";
import { LINES, NO, SHEET_T, SHOTS, T_END, cues } from "../src/x19-sched.ts";

const out = {
  total: T_END,
  duck: 6,
  tail: 0.08,
  voices: LINES.map((l) => ({ file: l.file, at: l.ofs, skip: 0, who: l.who, first: l.first - l.ofs, end: l.tend - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs })), text: l.text })),
  cues: cues(),
  shots: SHOTS.map((s, i) => ({ key: `${NO[s.id]}-${s.id}`, start: SHEET_T[s.id] - 0.01, end: SHEET_T[s.id] + 0.01, n: i + 1 })),   // (the contact sheet takes the middle of start .. end: here the shot's named moment)
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
const counts: Record<string, number> = {};
out.cues.forEach((c) => (counts[c.name] = (counts[c.name] ?? 0) + 1));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, cues:`, JSON.stringify(counts));
