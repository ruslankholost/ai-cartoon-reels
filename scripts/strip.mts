// node scripts/strip.mts key1,key2,... [N]  ->  scratch/job-strip.json + scratch/strip-labels.json: N frames across each named shot, one row per shot
import fs from "node:fs";
import { buildSched, type Timings } from "../src/sched.ts";

const keys = (process.argv[2] ?? "dip").split(",");
const N = Number(process.argv[3] ?? 6);
const S = buildSched(JSON.parse(fs.readFileSync("public/friday/timings.json", "utf8")) as Timings);
const jobs: { id: string; frame: number; out: string; label: string }[] = [];
for (const k of keys) {
  const s = S.shots.find((x) => x.key === k);
  if (!s) throw new Error("no shot " + k);
  for (let i = 0; i < N; i++) {
    const t = s.start + ((s.end - s.start) * (i + 0.5)) / N;
    jobs.push({ id: "FridayNightLead", frame: Math.min(S.frames - 1, Math.round(t * 30)), out: `scratch/strip/${k}-${i}.png`, label: `${k} ${(t - s.start).toFixed(2)}s` });
  }
}
fs.writeFileSync("scratch/job-strip.json", JSON.stringify(jobs));
fs.writeFileSync("scratch/strip-labels.json", JSON.stringify(jobs.map((j) => ({ label: j.label, path: j.out }))));
console.log(jobs.length, "frames");
