// node scripts/lips8-stills.mts  ->  scratch/lips8-job.json + scratch/lips8-labels.json: stills of Lips8 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/lips-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/lips8-sched.ts KEY_FRAMES)
//   LIPS_MID=1        one still at the middle of every shot (LIPS_ONLY=1,5,12 keeps only those shots)
//   LIPS_EDGES=1      the first and the last frame of every shot
//   LIPS_AT=12,200    those frames
//   LIPS_COVER=1      scratch/lips8-cover-job.json instead: the cover's frame (shot 3, her purple face, no captions, the title on)
// LIPS_DIR=scratch/lips8-mid sets the folder of the stills (default scratch/lips8).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS, T } from "../src/lips8-sched.ts";

const dir = process.env.LIPS_DIR ?? "scratch/lips8";
fs.mkdirSync(dir, { recursive: true });
if (process.env.LIPS_COVER) {
  const frame = Math.round((T.s3 + 0.3) * FPS);
  fs.writeFileSync("scratch/lips8-cover-job.json", JSON.stringify([{ id: "Lips8", props: { noCaps: true, cover: true }, frame, out: "scratch/lips8-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/lips8-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.LIPS_AT) pts = process.env.LIPS_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.LIPS_MID) {
    const only = process.env.LIPS_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.LIPS_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "Lips8", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/lips8-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/lips8-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
