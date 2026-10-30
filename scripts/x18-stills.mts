// node scripts/x18-stills.mts  ->  scratch/x18-job.json + scratch/x18-labels.json: stills of X18 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x16-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x18-sched.ts KEY_FRAMES)
//   X18_MID=1         one still at the middle of every shot (X18_ONLY=1,5,12 keeps only those shots)
//   X18_EDGES=1       the first and the last frame of every shot
//   X18_AT=12,200     those frames
//   X18_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X18_COVER=1       scratch/x18-cover-job.json instead: the cover's frame (shot 2, the toddler pouring oat milk into the till, the label in big text, no captions)
//   X18_NAMED=1       one still at the named moment of every shot (src/x18-sched.ts SHEET_T)
// X18_DIR=scratch/x18-mid sets the folder of the stills (default scratch/x18).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, NO, SHEET_T, SHOTS } from "../src/x18-sched.ts";
const COVER_F = 26;  // the cover: shot 2, the toddler pouring the oat milk into the till (the stream is down, the carton is tipped), with the label in big text

const dir = process.env.X18_DIR ?? "scratch/x18";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X18_COVER) {
  fs.writeFileSync("scratch/x18-cover-job.json", JSON.stringify([{ id: "X18", props: { noCaps: true, cover: true }, frame: COVER_F, out: "scratch/x18-cover.png" }]));
  console.log(`cover: frame ${COVER_F} of ${FRAMES} -> scratch/x18-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X18_AT) pts = process.env.X18_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X18_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X18_NAMED) {
    const only = process.env.X18_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${NO[s.id]} ${s.id}`, f: fr(SHEET_T[s.id]) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X18_MID) {
    const only = process.env.X18_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${NO[s.id]} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X18_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${NO[s.id]} first`, f: fr(s.t0) }, { label: `${NO[s.id]} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X18", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x18-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x18-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
