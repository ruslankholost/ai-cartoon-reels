// node scripts/pen-stills.mts  ->  scratch/pen-job.json + scratch/pen-labels.json: stills of Pen for scripts/still.mjs and scripts/sheet.py. Which frames:
//   (nothing)         a still per key frame (src/pen-sched.ts KEY_FRAMES)
//   PEN_MID=1         one still at the middle of every shot, labelled with its number and its v1 number (PEN_ONLY=1,5,12 keeps only those shots, by the v2 numbers)
//   PEN_TRIPLES=1     three frames (2 before, on, 3 after) of the picture's hit: the pallet's slam, the box's landing, the pen's landing, the reader's pop, the fine print's arrival
//   PEN_AT=12,200     those frames
//   PEN_COVER=1       scratch/pen-cover-job.json instead: the cover's frame (0.2 s before the end of the last shot, no captions, no share line, the title on) for scripts/render-pen.sh
// PEN_PROPS='{"noCaps":true}' passes props; PEN_DIR=scratch/pen-mid sets the folder of the stills (default scratch/pen).
import fs from "node:fs";
import { FPS, FRAMES, KEY_FRAMES, SHOTS, T, V1_NO } from "../src/pen-sched.ts";

const dir = process.env.PEN_DIR ?? "scratch/pen";
fs.mkdirSync(dir, { recursive: true });
if (process.env.PEN_COVER) {
  const frame = FRAMES - 6;
  fs.writeFileSync("scratch/pen-cover-job.json", JSON.stringify([{ id: "Pen", props: { noCaps: true, noShare: true, cover: true }, frame, out: "scratch/pen-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/pen-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.PEN_AT) pts = process.env.PEN_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.PEN_MID) {
    const only = process.env.PEN_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id} (v1 ${V1_NO[s.id]})`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.PEN_TRIPLES) {
    const hits: [string, number][] = [["pallet slam", T.pallet], ["box lands", T.boxLand], ["pen lands", T.clatter], ["reader pops", T.readerPop], ["fine print arrives", T.fineIn]];
    pts = hits.flatMap(([n, t]) => [-2, 0, 3].map((d) => ({ label: `${n} ${d >= 0 ? "+" : ""}${d}`, f: fr(t) + d })));
  } else pts = KEY_FRAMES;
  const props = process.env.PEN_PROPS ? JSON.parse(process.env.PEN_PROPS) : undefined;
  const jobs = pts.map((p, i) => ({ id: "Pen", props, frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/pen-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/pen-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(jobs.map((j) => `${j.label} -> ${j.out}`).join("\n"), `\n(${FRAMES} frames in all)`);
}
