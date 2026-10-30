// node scripts/x11-stills.mts  ->  scratch/x11-job.json + scratch/x11-labels.json: stills of X11 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x08-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x11-sched.ts KEY_FRAMES)
//   X11_MID=1         one still at the middle of every shot (X11_ONLY=1,5,12 keeps only those shots)
//   X11_EDGES=1       the first and the last frame of every shot
//   X11_AT=12,200     those frames
//   X11_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X11_COVER=1       scratch/x11-cover-job.json instead: the cover's frame (1.53 s: the face settled on the glass, no captions, the cover's title on)
// X11_DIR=scratch/x11-mid sets the folder of the stills (default scratch/x11).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS, SMACK_T } from "../src/x11-sched.ts";

const dir = process.env.X11_DIR ?? "scratch/x11";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X11_COVER) {
  const frame = Math.round((SMACK_T[0] + 0.4) * FPS);
  fs.writeFileSync("scratch/x11-cover-job.json", JSON.stringify([{ id: "X11", props: { noCaps: true, cover: true }, frame, out: "scratch/x11-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/x11-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X11_AT) pts = process.env.X11_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X11_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X11_MID) {
    const only = process.env.X11_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X11_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X11", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x11-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x11-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
