// node scripts/x09-stills.mts  ->  scratch/x09-job.json + scratch/x09-labels.json: stills of X09 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x08-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x09-sched.ts KEY_FRAMES)
//   X09_MID=1         one still at the middle of every shot (X09_ONLY=1,5,12 keeps only those shots)
//   X09_EDGES=1       the first and the last frame of every shot
//   X09_AT=12,200     those frames
//   X09_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X09_PARTS=1       the parts that are drawn in code (src/X09Parts.tsx) on flat colours, each at a few ages: the art-free check of src/x09-draw.tsx and src/x09-ui.tsx
//   X09_COVER=1       scratch/x09-cover-job.json instead: the cover's frame (0.63 s: just after the splash, the cubes flying, the pyro up, no captions, the screen's title dimmed, the cover's title on)
// X09_DIR=scratch/x09-mid sets the folder of the stills (default scratch/x09).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS, SPLASH1_T } from "../src/x09-sched.ts";

const dir = process.env.X09_DIR ?? "scratch/x09";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X09_COVER) {
  const frame = Math.round((SPLASH1_T + 0.1) * FPS);
  fs.writeFileSync("scratch/x09-cover-job.json", JSON.stringify([{ id: "X09", props: { noCaps: true, cover: true }, frame, out: "scratch/x09-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/x09-cover.png`);
} else if (process.env.X09_PARTS) {
  const P: [string, number, number][] = [
    ["ice", 0.3, 1], ["ice", 0.6, 1], ["splash", 0.15, 1], ["splash", 0.4, 1], ["splash", 0.8, 1], ["pyro", 0.05, 1], ["pyro", 0.3, 1], ["pyro", 0.8, 1], ["clock", 0.05, 1], ["clock", 0.4, 1], ["tape", 0.1, 0], ["tape", 0.1, 0.5], ["glass", 0, 1],
    ["board", 0, 0.5], ["board", 0, 1], ["notebook", 0, 0.5], ["notebook", 0, 1], ["title", 0, 0.5], ["label", 0, 1], ["speed", 0.1, 1], ["steam", 0.9, 1],
  ];
  const jobs = P.map(([part, age, p], i) => ({ id: "X09Parts", props: { part, age, p }, frame: 0, out: `${dir}/part-${String(i + 1).padStart(2, "0")}.png`, label: `${part} age ${age} p ${p}` }));
  fs.writeFileSync("scratch/x09-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x09-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} part stills`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X09_AT) pts = process.env.X09_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X09_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X09_MID) {
    const only = process.env.X09_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X09_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X09", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x09-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x09-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
