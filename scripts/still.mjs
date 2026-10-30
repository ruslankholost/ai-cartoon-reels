// node scripts/still.mjs <job.json> [--par=3] [--scale=1]
// job.json: [{ "id": "Preview", "props": {...}, "frame": 40, "out": "out/preview-1.png" }]
// Bundles once, opens one browser and renders every job as a PNG. GL backend: ANGLE (the GPU) unless GL=... is set.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const jobsFile = args.find((a) => !a.startsWith("--"));
const par = Number((args.find((a) => a.startsWith("--par=")) ?? "--par=3").split("=")[1]);
const scale = Number((args.find((a) => a.startsWith("--scale=")) ?? "--scale=1").split("=")[1]);
const jobs = JSON.parse(fs.readFileSync(path.resolve(root, jobsFile), "utf8"));

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), outDir: path.join(root, "scratch/bundle"), onProgress: () => {} });
console.log(`bundle ${(Date.now() - t0) / 1000}s`);

const chromiumOptions = { gl: process.env.GL || "angle" };
const browser = await openBrowser("chrome", { chromiumOptions, shouldDumpIo: false });
const comps = new Map();
async function comp(id, props) {
  const key = id + JSON.stringify(props ?? {});
  if (!comps.has(key)) comps.set(key, await selectComposition({ serveUrl, id, inputProps: props ?? {}, puppeteerInstance: browser, chromiumOptions, timeoutInMilliseconds: 180000 }));
  return comps.get(key);
}
let next = 0;
async function worker() {
  while (next < jobs.length) {
    const j = jobs[next++];
    const c = await comp(j.id, j.props);
    const out = path.resolve(root, j.out);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const t = Date.now();
    await renderStill({ composition: c, serveUrl, output: out, frame: j.frame ?? 0, inputProps: j.props ?? {}, imageFormat: out.endsWith(".png") ? "png" : "jpeg", puppeteerInstance: browser, chromiumOptions, timeoutInMilliseconds: 180000, overwrite: true, scale });
    console.log(`${j.out} frame ${j.frame ?? 0} ${(Date.now() - t) / 1000}s`);
  }
}
for (const j of jobs) await comp(j.id, j.props);
await Promise.all(Array.from({ length: par }, worker));
await browser.close({ silent: true });
console.log(`done ${(Date.now() - t0) / 1000}s`);
process.exit(0);
