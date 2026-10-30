// node scripts/tup-stills.mts  ->  scratch/tup-job.json + scratch/tup-labels.json: stills of Tup for scripts/still.mjs and scripts/sheet.py. Which frames:
//   (nothing)         a still per key frame (src/tup-sched.ts KEY_FRAMES)
//   TUP_MID=1         one still at the middle of every shot, labelled with its number and its name (TUP_ONLY=1,5,12 keeps only those shots)
//   TUP_EDGES=1       the first and the last frame of every shot (to look at the cuts)
//   TUP_TRIPLES=1     three frames (2 before, on, 3 after) of the picture's hits: the lid's landing, the burp's seal, the gift's handover, a form's landing, the newspaper's stop, the stamp's slam
//   TUP_AT=12,200     those frames
//   TUP_COVER=1       scratch/tup-cover-job.json instead: the cover's frame (0.2 s before the end of the last shot, no captions, no share line, the title on) for scripts/render-tup.sh
// TUP_PROPS='{"noCaps":true}' passes props; TUP_DIR=scratch/tup-mid sets the folder of the stills (default scratch/tup).
import fs from "node:fs";
import { FPS, FRAMES, FORMS, KEY_FRAMES, SHOTS, T } from "../src/tup-sched.ts";

const dir = process.env.TUP_DIR ?? "scratch/tup";
fs.mkdirSync(dir, { recursive: true });
if (process.env.TUP_COVER) {
  const frame = FRAMES - 6;
  fs.writeFileSync("scratch/tup-cover-job.json", JSON.stringify([{ id: "Tup", props: { noCaps: true, noShare: true, cover: true }, frame, out: "scratch/tup-cover.png" }]));
  console.log(`cover: frame ${frame} of ${FRAMES} -> scratch/tup-cover.png`);
} else {
  const fr = (t: number) => Math.round(t * FPS);
  let pts: { label: string; f: number }[];
  if (process.env.TUP_AT) pts = process.env.TUP_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) }));
  else if (process.env.TUP_MID) {
    const only = process.env.TUP_ONLY?.split(",").map(Number);
    pts = SHOTS.map((s, i) => ({ label: `${i + 1} ${s.id}`, f: fr((s.t0 + s.t1) / 2) })).filter((_, i) => !only || only.includes(i + 1));
  } else if (process.env.TUP_EDGES) {
    pts = SHOTS.flatMap((s, i) => [{ label: `${i + 1} first`, f: fr(s.t0) }, { label: `${i + 1} last`, f: Math.min(FRAMES - 1, fr(s.t1) - 1) }]);
  } else if (process.env.TUP_TRIPLES) {
    const hits: [string, number][] = [["lid lands", T.lidLand], ["burp seals", T.burpT], ["gift handed over", T.handover], ["a form lands", FORMS[2]], ["newspaper stops", T.paperStop], ["stamp slams", T.stampT]];
    pts = hits.flatMap(([n, t]) => [-2, 0, 3].map((d) => ({ label: `${n} ${d >= 0 ? "+" : ""}${d}`, f: fr(t) + d })));
  } else pts = KEY_FRAMES;
  const props = process.env.TUP_PROPS ? JSON.parse(process.env.TUP_PROPS) : undefined;
  const jobs = pts.map((p, i) => ({ id: "Tup", props, frame: p.f, out: `${dir}/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
  fs.writeFileSync("scratch/tup-job.json", JSON.stringify(jobs));
  fs.writeFileSync("scratch/tup-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
  console.log(jobs.map((j) => `${j.label} -> ${j.out}`).join("\n"), `\n(${FRAMES} frames in all)`);
}
