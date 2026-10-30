// node scripts/x15-stills.mts  ->  scratch/x15-job.json + scratch/x15-labels.json: stills of X15 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x08-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x15-sched.ts KEY_FRAMES)
//   X15_MID=1         one still at the middle of every shot (X15_ONLY=1,5,12 keeps only those shots)
//   X15_EDGES=1       the first and the last frame of every shot
//   X15_AT=12,200     those frames
//   X15_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X15_COVER=1       scratch/x15-cover-job.json instead: the cover's frame (shot 6 at the bleep: Ross purple, the mosaic over his mouth and the red -$9.98, no captions, the cover's title on)
//   X15_NAMED=1       one still at the named moment of every shot (src/x15-sched.ts SHEET_T)
// X15_DIR=scratch/x15-mid sets the folder of the stills (default scratch/x15).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHEET_T, SHOTS } from "../src/x15-sched.ts";
const COVER_T = 118 / FPS;  // the cover: shot 6 on the second bleep (frame 118, 4 frames after the tone starts: the mosaic is up, the red "-$9.98" has popped), Ross purple, the title over the top

const dir = process.env.X15_DIR ?? "scratch/x15";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X15_COVER) {
  const frame = Math.round(COVER_T * FPS);
  fs.writeFileSync("scratch/x15-cover-job.json", JSON.stringify([{ id: "X15", props: { noCaps: true, cover: true }, frame, out: "scratch/x15-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/x15-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X15_AT) pts = process.env.X15_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X15_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X15_NAMED) {
    const only = process.env.X15_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr(SHEET_T[s.id]) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X15_MID) {
    const only = process.env.X15_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X15_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X15", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x15-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x15-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
