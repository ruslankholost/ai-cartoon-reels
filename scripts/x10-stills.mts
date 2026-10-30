// node scripts/x10-stills.mts  ->  scratch/x10-job.json + scratch/x10-labels.json: stills of X10 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x08-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x10-sched.ts KEY_FRAMES)
//   X10_MID=1         one still at the middle of every shot (X10_ONLY=1,5,12 keeps only those shots)
//   X10_EDGES=1       the first and the last frame of every shot
//   X10_AT=12,200     those frames
//   X10_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X10_COVER=1       scratch/x10-cover-job.json instead: the cover's frame (0.63 s: just after the splash, the cubes flying, the pyro up, no captions, the screen's title dimmed, the cover's title on)
// X10_DIR=scratch/x10-mid sets the folder of the stills (default scratch/x10).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS, KACHING_T } from "../src/x10-sched.ts";

const dir = process.env.X10_DIR ?? "scratch/x10";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X10_COVER) {
  const frame = Math.round((KACHING_T + 0.15) * FPS);
  fs.writeFileSync("scratch/x10-cover-job.json", JSON.stringify([{ id: "X10", props: { noCaps: true, cover: true }, frame, out: "scratch/x10-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/x10-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X10_AT) pts = process.env.X10_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X10_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X10_MID) {
    const only = process.env.X10_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X10_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X10", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x10-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x10-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
