// node scripts/x16-stills.mts  ->  scratch/x16-job.json + scratch/x16-labels.json: stills of X16 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x15-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x16-sched.ts KEY_FRAMES)
//   X16_MID=1         one still at the middle of every shot (X16_ONLY=1,5,12 keeps only those shots)
//   X16_EDGES=1       the first and the last frame of every shot
//   X16_AT=12,200     those frames
//   X16_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X16_COVER=1       scratch/x16-cover-job.json instead: the cover's frame (shot 20 just after the THUNK: Ross with the flagpole on his head, his eyes bulging, the label under his chin, no captions)
//   X16_NAMED=1       one still at the named moment of every shot (src/x16-sched.ts SHEET_T)
// X16_DIR=scratch/x16-mid sets the folder of the stills (default scratch/x16).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHEET_T, SHOTS } from "../src/x16-sched.ts";
const COVER_T = 618 / FPS;  // the cover: shot 20, three frames after the THUNK (the pole has wobbled once, the eyes have bulged), the label under his chin

const dir = process.env.X16_DIR ?? "scratch/x16";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X16_COVER) {
  const frame = Math.round(COVER_T * FPS);
  fs.writeFileSync("scratch/x16-cover-job.json", JSON.stringify([{ id: "X16", props: { noCaps: true, cover: true }, frame, out: "scratch/x16-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/x16-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X16_AT) pts = process.env.X16_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X16_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X16_NAMED) {
    const only = process.env.X16_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr(SHEET_T[s.id]) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X16_MID) {
    const only = process.env.X16_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X16_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X16", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x16-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x16-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
