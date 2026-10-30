// node scripts/x20-caps-job.mts  ->  scratch/job-caps.json: every caption of x20 "One Coffee" (src/x20-sched.ts CAPS), once with its captions and once without (props noCaps), at the moment all its words are up
// (the shape of scripts/x19-caps-job.mts). Then: node scripts/still.mjs scratch/job-caps.json --par=4 ; python scripts/caps-check.py 250 1500 measures where the captions sit (the difference of the two pictures).
import fs from "node:fs";
import { CAPS, FPS, FRAMES } from "../src/x20-sched.ts";

const jobs: unknown[] = [];
CAPS.forEach((c, i) => {
  const t = Math.min(c.t1 - 0.03, c.w1 + 0.15), frame = Math.min(FRAMES - 1, Math.round(t * FPS)), id = String(i + 1).padStart(2, "0");
  jobs.push({ id: "X20", frame, out: `scratch/caps/${id}-on.png` });
  jobs.push({ id: "X20", frame, props: { noCaps: true }, out: `scratch/caps/${id}-off.png` });
});
fs.mkdirSync("scratch/caps", { recursive: true });
fs.writeFileSync("scratch/job-caps.json", JSON.stringify(jobs));
fs.writeFileSync("scratch/caps-text.json", JSON.stringify(CAPS.map((c) => c.text)));
console.log(CAPS.length, "captions");
