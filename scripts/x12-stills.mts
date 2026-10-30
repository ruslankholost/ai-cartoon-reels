// node scripts/x12-stills.mts  ->  scratch/x12-job.json + scratch/x12-labels.json: stills of X12 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x08-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x12-sched.ts KEY_FRAMES)
//   X12_MID=1         one still at the middle of every shot (X12_ONLY=1,5,12 keeps only those shots)
//   X12_EDGES=1       the first and the last frame of every shot
//   X12_AT=12,200     those frames
//   X12_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X12_COVER=1       scratch/x12-cover-job.json instead: the cover's frame (0.93 s: the face just snapped to purple, no captions, the cover's title on)
// X12_DIR=scratch/x12-mid sets the folder of the stills (default scratch/x12).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS, SNAP_T } from "../src/x12-sched.ts";

const dir = process.env.X12_DIR ?? "scratch/x12";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X12_COVER) {
  const frame = Math.round((SNAP_T + 0.4) * FPS);
  fs.writeFileSync("scratch/x12-cover-job.json", JSON.stringify([{ id: "X12", props: { noCaps: true, cover: true }, frame, out: "scratch/x12-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/x12-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X12_AT) pts = process.env.X12_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X12_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X12_MID) {
    const only = process.env.X12_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X12_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X12", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x12-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x12-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
