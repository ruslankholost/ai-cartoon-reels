// node scripts/x14-stills.mts  ->  scratch/x14-job.json + scratch/x14-labels.json: stills of X14 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x08-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x14-sched.ts KEY_FRAMES)
//   X14_MID=1         one still at the middle of every shot (X14_ONLY=1,5,12 keeps only those shots)
//   X14_EDGES=1       the first and the last frame of every shot
//   X14_AT=12,200     those frames
//   X14_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X14_COVER=1       scratch/x14-cover-job.json instead: the cover's frame (the shout shot's first picture: Ross's purple face and the phone with the four stars, no captions, the cover's title on)
// X14_DIR=scratch/x14-mid sets the folder of the stills (default scratch/x14).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS } from "../src/x14-sched.ts";
const COVER_T = 1.87;  // the cover: the shout shot's first picture (1.43-1.97 s, the medium shot with the phone at his fingertip), Ross purple and shouting FOUR, just before the punch-in on STARS?!

const dir = process.env.X14_DIR ?? "scratch/x14";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X14_COVER) {
  const frame = Math.round(COVER_T * FPS);
  fs.writeFileSync("scratch/x14-cover-job.json", JSON.stringify([{ id: "X14", props: { noCaps: true, cover: true }, frame, out: "scratch/x14-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/x14-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X14_AT) pts = process.env.X14_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X14_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X14_MID) {
    const only = process.env.X14_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X14_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X14", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x14-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x14-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
