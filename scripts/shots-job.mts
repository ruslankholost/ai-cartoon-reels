// node scripts/shots-job.mts [mid|first]  ->  scratch/job-shots.json: one still per planned shot (the middle of each shot, or its first frame)
import fs from "node:fs";
import { buildSched, type Timings } from "../src/sched.ts";

const mode = process.argv[2] ?? "mid";
const S = buildSched(JSON.parse(fs.readFileSync("public/friday/timings.json", "utf8")) as Timings);
const jobs = S.shots.map((s, i) => {
  const t = mode === "first" ? s.start + 0.03 : (s.start + s.end) / 2;
  const frame = Math.min(S.frames - 1, Math.round(t * 30));
  return { id: "FridayNightLead", frame, out: `scratch/shots-${mode}/${String(i + 1).padStart(2, "0")}-${s.key}.png`, label: `${i + 1} ${s.key} ${t.toFixed(2)}s` };
});
fs.writeFileSync("scratch/job-shots.json", JSON.stringify(jobs, null, 1));
fs.writeFileSync("scratch/sheet-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
console.log(jobs.length, "stills,", mode);
