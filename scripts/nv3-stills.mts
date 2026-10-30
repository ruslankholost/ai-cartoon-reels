// node scripts/nv3-stills.mts  ->  scratch/nv3-job.json + scratch/nv3-labels.json: a still per shot of NobodyV3 (the key frames of src/nv3-sched.ts)
// for scripts/still.mjs and scripts/sheet.py. NV3_AT=12,200 gives stills at those frames instead.
import fs from "node:fs";
import { KEY_FRAMES, FRAMES } from "../src/nv3-sched.ts";

const pts = process.env.NV3_AT ? process.env.NV3_AT.split(",").map((x) => ({ label: `f ${x}`, f: Math.min(FRAMES - 1, Number(x)) })) : KEY_FRAMES;
const jobs = pts.map((p, i) => ({ id: "NobodyV3", frame: p.f, out: `scratch/nv3/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
fs.mkdirSync("scratch/nv3", { recursive: true });
fs.writeFileSync("scratch/nv3-job.json", JSON.stringify(jobs));
fs.writeFileSync("scratch/nv3-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
console.log(jobs.map((j) => `${j.label} -> ${j.out}`).join("\n"), `\n(${FRAMES} frames in all)`);
