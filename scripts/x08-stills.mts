// node scripts/x08-stills.mts  ->  scratch/x08-job.json + scratch/x08-labels.json: stills of X08 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/lips8-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x08-sched.ts KEY_FRAMES)
//   X08_MID=1         one still at the middle of every shot (X08_ONLY=1,5,12 keeps only those shots)
//   X08_EDGES=1       the first and the last frame of every shot
//   X08_AT=12,200     those frames
//   X08_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X08_COVER=1       scratch/x08-cover-job.json instead: the cover's frame (2.77 s, three frames after the 4th slap: his face buried under the pop-ups, the flash gone, no captions, the title on)
// X08_DIR=scratch/x08-mid sets the folder of the stills (default scratch/x08).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS, SLAP_T } from "../src/x08-sched.ts";

const dir = process.env.X08_DIR ?? "scratch/x08";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X08_COVER) {
  const frame = Math.round((SLAP_T[3] + 0.1) * FPS);
  fs.writeFileSync("scratch/x08-cover-job.json", JSON.stringify([{ id: "X08", props: { noCaps: true, cover: true }, frame, out: "scratch/x08-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/x08-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X08_AT) pts = process.env.X08_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X08_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X08_MID) {
    const only = process.env.X08_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X08_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X08", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x08-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x08-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
