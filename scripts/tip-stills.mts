// node scripts/tip-stills.mts  ->  scratch/tip-job.json + scratch/tip-labels.json: a still per key frame of Tip (src/tip-sched.ts KEY_FRAMES) for scripts/still.mjs and scripts/sheet.py.
// TIP_AT=12,200 gives stills at those frames instead; TIP_PROPS='{"noCaps":true}' passes props.
import fs from "node:fs";
import { KEY_FRAMES, FRAMES } from "../src/tip-sched.ts";

const pts = process.env.TIP_AT ? process.env.TIP_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) })) : KEY_FRAMES;
const props = process.env.TIP_PROPS ? JSON.parse(process.env.TIP_PROPS) : undefined;
const jobs = pts.map((p, i) => ({ id: "Tip", props, frame: p.f, out: `scratch/tip/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
fs.mkdirSync("scratch/tip", { recursive: true });
fs.writeFileSync("scratch/tip-job.json", JSON.stringify(jobs));
fs.writeFileSync("scratch/tip-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
console.log(jobs.map((j) => `${j.label} -> ${j.out}`).join("\n"), `\n(${FRAMES} frames in all)`);
