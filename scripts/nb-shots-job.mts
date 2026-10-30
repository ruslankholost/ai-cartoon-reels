// node scripts/nb-shots-job.mts [mid|first|cover]  ->  scratch/nb-job.json + scratch/nb-labels.json: a still per shot of "Nobody Picks Up"
// (the middle of each shot, plus the middle of each sub-cut), for scripts/still.mjs and scripts/sheet.py. NB_AT=1.2,5.5 gives stills at those seconds.
import fs from "node:fs";
import { buildSched, type Timings } from "../src/nb-sched.ts";

const mode = process.argv[2] ?? "mid";
const S = buildSched(JSON.parse(fs.readFileSync("public/nobody/timings.json", "utf8")) as Timings);
const pts: { label: string; t: number }[] = [];
S.shots.forEach((s, i) => {
  const edges = [s.start, ...s.cuts, s.end];
  for (let k = 0; k < edges.length - 1; k++) {
    const t = mode === "first" ? edges[k] + 0.03 : (edges[k] + edges[k + 1]) / 2;
    pts.push({ label: `${i + 1}${k ? "b" : ""} ${s.key} ${t.toFixed(2)}s`, t });
  }
});
if (process.env.NB_AT) process.env.NB_AT.split(",").forEach((x) => pts.push({ label: `t ${x}`, t: Number(x) }));
const jobs = (process.env.NB_AT ? pts.filter((p) => p.label.startsWith("t ")) : pts).map((p, i) => ({
  id: "Nobody", frame: Math.min(S.frames - 1, Math.round(p.t * 30)), out: `scratch/nb-${mode}/${String(i + 1).padStart(2, "0")}.png`, label: p.label,
}));
fs.mkdirSync("scratch", { recursive: true });
fs.writeFileSync("scratch/nb-job.json", JSON.stringify(jobs));
fs.writeFileSync("scratch/nb-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
console.log(jobs.length, "stills,", mode, "total", S.total.toFixed(2), "s");
