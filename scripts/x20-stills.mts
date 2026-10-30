// node scripts/x20-stills.mts  ->  scratch/x20-job.json + scratch/x20-labels.json: stills of X20 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x19-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x20-sched.ts KEY_FRAMES)
//   X20_MID=1         one still at the middle of every shot (X20_ONLY=1,5,12 keeps only those shots)
//   X20_EDGES=1       the first and the last frame of every shot
//   X20_AT=12,200     those frames
//   X20_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X20_COVER=1       scratch/x20-cover-job.json instead: the cover's frame (shot 3, the camper in cobwebs at his laptop, the label in big text, no captions)
//   X20_NAMED=1       one still at the named moment of every shot (src/x20-sched.ts SHEET_T)
//   X20_ANIMATIC=1    the debug label (the shot's number and name) in the corner
// X20_DIR=scratch/x20-mid sets the folder of the stills (default scratch/x20).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, NO, SHEET_T, SHOTS } from "../src/x20-sched.ts";
const COVER_F = 46;  // the cover: shot 3, the camper at his laptop in his cobwebs with the dust on his hair, the label in big text

const dir = process.env.X20_DIR ?? "scratch/x20";
fs.mkdirSync(dir, { recursive: true });
const animatic = !!process.env.X20_ANIMATIC;
if (process.env.X20_COVER) {
  fs.writeFileSync("scratch/x20-cover-job.json", JSON.stringify([{ id: "X20", props: { noCaps: true, cover: true }, frame: COVER_F, out: "scratch/x20-cover.png" }]));
  console.log(`cover: frame ${COVER_F} of ${FRAMES} -> scratch/x20-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X20_AT) pts = process.env.X20_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X20_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X20_NAMED) {
    const only = process.env.X20_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s) => ({ label: `${NO[s.id]} ${s.id}`, f: fr(SHEET_T[s.id]) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X20_MID) {
    const only = process.env.X20_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s) => ({ label: `${NO[s.id]} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X20_EDGES) {
    const only = process.env.X20_ONLY?.split(",").map(Number);
    pts = SHOTS.flatMap((s, i) => (only && !only.includes(i + 1) ? [] : [{ label: `${NO[s.id]} first`, f: fr(s.t0) }, { label: `${NO[s.id]} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]));
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X20", frame: p.f, ...(animatic ? { props: { animatic: true } } : {}), out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x20-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x20-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
