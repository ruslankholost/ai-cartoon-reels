// node scripts/lips-stills.mts  ->  scratch/lips-job.json + scratch/lips-labels.json: stills of Lips for scripts/still.mjs and scripts/sheet.py. Which frames:
//   (nothing)         a still per key frame (src/lips-sched.ts KEY_FRAMES)
//   LIPS_MID=1        one still at the middle of every shot, labelled with its number and its name (LIPS_ONLY=1,5,12 keeps only those shots)
//   LIPS_EDGES=1      the first and the last frame of every shot (to look at the cuts)
//   LIPS_HITS=1       three frames (2 before, on, 3 after) of the picture's hits: the vault's landing, the knee drop, the smooch, the dog's gasp, the post, the door
//   LIPS_AT=12,200    those frames
//   LIPS_COVER=1      scratch/lips-cover-job.json instead: the cover's frame (a frame of shot 1 before she speaks, no captions, no share line, the title on) for scripts/render-lips.sh
// LIPS_PROPS='{"noCaps":true}' passes props; LIPS_DIR=scratch/lips-mid sets the folder of the stills (default scratch/lips).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS, T } from "../src/lips-sched.ts";

const dir = process.env.LIPS_DIR ?? "scratch/lips";
fs.mkdirSync(dir, { recursive: true });
if (process.env.LIPS_COVER) {
  const frame = Math.round(0.2 * FPS);
  fs.writeFileSync("scratch/lips-cover-job.json", JSON.stringify([{ id: "Lips", props: { noCaps: true, noShare: true, cover: true }, frame, out: "scratch/lips-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/lips-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.LIPS_AT) pts = process.env.LIPS_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.LIPS_MID) {
    const only = process.env.LIPS_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.LIPS_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else if (process.env.LIPS_HITS) {
    const hits: [string, number][] = [["vault lands", T.land], ["knee drop", T.kneel], ["cut to the side view", T.s12b], ["smooch", T.smooch], ["dog gasps", T.dogT], ["post", T.postT], ["door opens", T.doorOpen + 2 / FPS]];
    pts = hits.flatMap(([n, t]) => [-2, 0, 3].map((d) => ({ label: `${n} ${d >= 0 ? "+" : ""}${d}`, f: fr(t) + d })));
  } else pts = KEY_FRAMES;
  const props = process.env.LIPS_PROPS ? JSON.parse(process.env.LIPS_PROPS) : undefined;
  const jobs = pts.map((p, i) => ({ id: "Lips", props, frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/lips-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/lips-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(jobs.map((j) => `${j.label} -> ${j.out}`).join("\n"), `\n(${FRAMES} frames in all)`);
}
