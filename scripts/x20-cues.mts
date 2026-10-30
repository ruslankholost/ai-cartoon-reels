// node scripts/x20-cues.mts  ->  scratch/cues.json for x20 "One Coffee" (the shape scripts/sp-mix.py, scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/x19-cues.mts is the model): the fifteen voice takes at their places on the reel's clock
// (the table read's: the lead and the gaps of episodes/x20.jsonc carry the silent beats), the sound cues of src/x20-sched.ts (every sound's measured peak on its picture's hit; the foam, the gong, the cheer, the scrape, the sputter, the tumbleweed, the cricket, the bell, the
// slurp, the typing, the chime and the whirr start on their frames) and the radio: two runs of public/sfx/radio.mp3, the first from the first frame to the cut to the empty café (a 0.15 s fade: it drops out), the second from the door's bell (clip second 15.98) to the gong
// (a 6 ms fade: it stops dead); each has its own duck (RADIO_DUCK dB under the voices; the other sounds 6). `tail`: the mix fades out over its last 0.08 s, not 0.3: the coins' ring carries into the loop. The 29 pictures for the contact sheet are at the shots' named
// moments. Every line is its voice file as it is.
import fs from "node:fs";
import { LINES, NO, SHEET_T, SHOTS, T_END, cues } from "../src/x20-sched.ts";

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
