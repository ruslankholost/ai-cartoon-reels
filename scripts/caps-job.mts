// node scripts/caps-job.mts  ->  scratch/job-caps.json: every caption phrase, once with its captions and once without (props noCaps),
// at the moment all its words are up. python scripts/caps-check.py then measures where the captions sit.
import fs from "node:fs";
import { buildSched, type Timings } from "../src/sched.ts";

const S = buildSched(JSON.parse(fs.readFileSync("public/friday/timings.json", "utf8")) as Timings);
const jobs: unknown[] = [];
S.caps.forEach((c, i) => {
  const t = Math.min(c.t1 - 0.03, c.words[c.words.length - 1].at + 0.25);
  const frame = Math.min(S.frames - 1, Math.round(t * 30));
  const id = String(i + 1).padStart(2, "0");
  jobs.push({ id: "FridayNightLead", frame, out: `scratch/caps/${id}-on.png` });
  jobs.push({ id: "FridayNightLead", frame, props: { noCaps: true }, out: `scratch/caps/${id}-off.png` });
});
fs.writeFileSync("scratch/job-caps.json", JSON.stringify(jobs));
fs.writeFileSync("scratch/caps-text.json", JSON.stringify(S.caps.map((c) => c.text)));
console.log(S.caps.length, "captions");
