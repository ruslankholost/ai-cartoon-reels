// node scripts/sp-stills.mts  ->  scratch/sp-job.json + scratch/sp-labels.json: the four key frames of SpCallTest for scripts/still.mjs and sheet.py
// (SP_AT=12,200 gives stills at those frames instead)
import fs from "node:fs";
import { KEY_FRAMES } from "../src/sp-sched.ts";

const pts = process.env.SP_AT ? process.env.SP_AT.split(",").map((x) => ({ label: `f ${x}`, f: Number(x) })) : KEY_FRAMES;
const jobs = pts.map((p, i) => ({ id: "SpCallTest", frame: p.f, out: `scratch/sp/still-${String(i + 1).padStart(2, "0")}.png`, label: `${p.label} (frame ${p.f})` }));
fs.mkdirSync("scratch/sp", { recursive: true });
fs.writeFileSync("scratch/sp-job.json", JSON.stringify(jobs));
fs.writeFileSync("scratch/sp-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
console.log(jobs.map((j) => `${j.label} -> ${j.out}`).join("\n"));
