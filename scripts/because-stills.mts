// node scripts/because-stills.mts  ->  scratch/because-job.json + scratch/because-labels.json: a still per key frame of Because (src/because-sched.ts KEY_FRAMES) for scripts/still.mjs and scripts/sheet.py.
// BECAUSE_AT=12,200 gives stills at those frames instead; BECAUSE_PROPS='{"noCaps":true}' passes props.
import fs from "node:fs";
import { KEY_FRAMES, FRAMES } from "../src/because-sched.ts";

const pts = process.env.BECAUSE_AT ? process.env.BECAUSE_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) })) : KEY_FRAMES;
const props = process.env.BECAUSE_PROPS ? JSON.parse(process.env.BECAUSE_PROPS) : undefined;
const jobs = pts.map((p, i) => ({ id: "Because", props, frame: p.f, out: `scratch/because/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
fs.mkdirSync("scratch/because", { recursive: true });
fs.writeFileSync("scratch/because-job.json", JSON.stringify(jobs));
fs.writeFileSync("scratch/because-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
console.log(jobs.map((j) => `${j.label} -> ${j.out}`).join("\n"), `\n(${FRAMES} frames in all)`);
