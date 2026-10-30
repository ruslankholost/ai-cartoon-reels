// node scripts/x17-stills.mts  ->  scratch/x17-job.json + scratch/x17-labels.json: stills of X17 for scripts/still.mjs and scripts/sheet.py (the shape of scripts/x16-stills.mts). Which frames:
//   (nothing)         a still per key frame (src/x17-sched.ts KEY_FRAMES)
//   X17_MID=1         one still at the middle of every shot (X17_ONLY=1,5,12 keeps only those shots)
//   X17_EDGES=1       the first and the last frame of every shot
//   X17_AT=12,200     those frames
//   X17_FIRST3=1      the first 3 s every 0.1 s (frames 0-89 step 3)
//   X17_COVER=1       scratch/x17-cover-job.json instead: the cover's frame (shot 16, Ross on the wing pointing at window 12A with the couple inside, the label in big text, no captions)
//   X17_NAMED=1       one still at the named moment of every shot (src/x17-sched.ts SHEET_T)
// X17_DIR=scratch/x17-mid sets the folder of the stills (default scratch/x17).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHEET_T, SHOTS } from "../src/x17-sched.ts";
const COVER_F = 552;  // the cover: shot 16 at 18.40 s, in "PAID": the shout's mouth wide open (544 caught him between syllables, mouth shut), Ross pointing at window 12A, the couple kissing in it

const dir = process.env.X17_DIR ?? "scratch/x17";
fs.mkdirSync(dir, { recursive: true });
if (process.env.X17_COVER) {
  fs.writeFileSync("scratch/x17-cover-job.json", JSON.stringify([{ id: "X17", props: { noCaps: true, cover: true }, frame: COVER_F, out: "scratch/x17-cover.png" }]));
  console.log(`cover: frame ${COVER_F} of ${FRAMES} -> scratch/x17-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.X17_AT) pts = process.env.X17_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.X17_FIRST3) pts = Array.from({ length: 30 }, (_, i) => ({ label: `${(i * 0.1).toFixed(1)} s`, f: i * 3 }));
  else if (process.env.X17_NAMED) {
    const only = process.env.X17_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr(SHEET_T[s.id]) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X17_MID) {
    const only = process.env.X17_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.X17_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else pts = KEY_FRAMES;
  const jobs = pts.map((p, i) => ({ id: "X17", frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/x17-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/x17-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(`${jobs.length} stills, ${FRAMES} frames in all (${(FRAMES / FPS).toFixed(2)} s)`);
}
