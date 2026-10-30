// node scripts/sp-cues.mts  ->  scratch/cues.json for SpCallTest (the shape scripts/stt-lines.py and scripts/mp4-frames.py read; scripts/sp-mix.py
// places the voices and the three sounds from it). "shots" are one-second windows, so mp4-frames.py takes a frame every second.
import fs from "node:fs";
import { LINES, T_END, T_PICK, T_RING } from "../src/sp-sched.ts";

const last = LINES[LINES.length - 1];
const out = {
  total: T_END,
  voices: LINES.map((l) => ({ file: l.file, at: l.ofs, skip: l.skip, who: l.who, first: l.words[0].t - l.ofs, end: l.end - l.ofs, words: l.words.map((w) => ({ d: w.d, t: w.t - l.ofs, e: w.e - l.ofs })), text: l.text })),
  cues: [
    { name: "ringback", at: T_RING, db: -4 },
    { name: "pickup", at: T_PICK, db: 0 },
    { name: "engine", at: last.end + 0.12, db: -9, len: 0.9, fade: 0.3 }, // Gary turns the key
  ],
  shots: Array.from({ length: Math.floor(T_END) }, (_, i) => ({ key: `s${String(i).padStart(2, "0")}`, start: i, end: i + 1 })),
};
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/cues.json", JSON.stringify(out));
console.log(`total ${out.total.toFixed(2)} s, ${out.voices.length} voices, ${out.cues.length} sounds`);
