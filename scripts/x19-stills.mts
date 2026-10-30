// node scripts/x19-stills.mts  ->  scratch/x19-job.json + scratch/x19-labels.json: stills of X19 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x18-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x19-sched.ts KEY_FRAMES)
//   X19_MID=1         one still at the middle of every shot (X19_ONLY=1,5,12 keeps only those shots)
//   X19_EDGES=1       the first and the last frame of every shot
//   X19_AT=12,200     those frames
//   X19_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X19_COVER=1       scratch/x19-cover-job.json instead: the cover's frame (shot 2, Ross in the hurricane with the cups flying, the label and a big PART 2, no captions)
//   X19_NAMED=1       one still at the named moment of every shot (src/x19-sched.ts SHEET_T)
//   X19_ANIMATIC=1    the debug label (the shot's number and name) in the corner
// X19_DIR=scratch/x19-mid sets the folder of the stills (default scratch/x19).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, NO, SHEET_T, SHOTS } from "../src/x19-sched.ts";
const COVER_F = 22;  // the cover: shot 2, Ross blown back by the song with the cups in the air, the label in big text and a big PART 2

const dir = process.env.X19_DIR ?? "scratch/x19";
fs.mkdirSync(dir, { recursive: true });
const animatic = !!process.env.X19_ANIMATIC;
if (process.env.X19_COVER) {
  fs.writeFileSync("scratch/x19-cover-job.json", JSON.stringify([{ id: "X19", props: { noCaps: true, cover: true }, frame: COVER_F, out: "scratch/x19-cover.png" }]));
  console.log(`cover: frame ${COVER_F} of ${FRAMES} -> scratch/x19-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X19_AT) pts = process.env.X19_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X19_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X19_NAMED) {
    const only = process.env.X19_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s) => ({ label: `${NO[s.id]} ${s.id}`, f: fr(SHEET_T[s.id]) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X19_MID) {
    const only = process.env.X19_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s) => ({ label: `${NO[s.id]} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X19_EDGES) {
    const only = process.env.X19_ONLY?.split(",").map(Number);
    pts = SHOTS.flatMap((s, i) => (only && !only.includes(i + 1) ? [] : [{ label: `${NO[s.id]} first`, f: fr(s.t0) }, { label: `${NO[s.id]} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]));
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X19", frame: p.f, ...(animatic ? { props: { animatic: true } } : {}), out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x19-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x19-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
