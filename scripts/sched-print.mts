// node scripts/sched-print.mts  ->  prints the shot table, the captions and the checks of the Friday Night Lead timeline
import fs from "node:fs";
import { buildSched, type Timings } from "../src/sched.ts";

const T = JSON.parse(fs.readFileSync("public/friday/timings.json", "utf8")) as Timings;
const S = buildSched(T);
const f2 = (n: number) => n.toFixed(2);
console.log(`total ${f2(S.total)} s = ${S.frames} frames, ${S.shots.length} shots`);
S.shots.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${f2(s.start).padStart(6)} - ${f2(s.end).padStart(6)}  (${f2(s.end - s.start)} s)  ${s.key}`));
console.log("\ntakes:");
S.takes.forEach((t, k) => console.log(`  ${String(k + 1).padStart(2)}  ${t.character.padEnd(13)} at ${f2(S.P[k]).padStart(6)}  first word ${f2(S.P[k] + t.words[0].t)}  voiced end ${f2(S.P[k] + t.end)}  "${t.text}"`));
console.log("\ncaptions:");
S.caps.forEach((c) => console.log(`  ${f2(c.t0).padStart(6)} - ${f2(c.t1).padStart(6)}  ${c.who.padEnd(5)} ${c.text}`));
console.log("\nstamps:", S.stamps.map((s) => `${s.text} ${f2(s.t0)}-${f2(s.t1)}`).join(" | "));

let problems = 0;
const bad = (m: string) => { problems++; console.log("  PROBLEM:", m); };
console.log("\ncheck: a cut inside a word (cuts should land in a pause, or 0.04 s before a word):");
S.shots.forEach((s, i) => {
  if (i === 0) return;
  S.takes.forEach((t, k) => t.words.forEach((w, j) => {
    const a = S.P[k] + w.t + 0.015, b = S.P[k] + w.e - 0.015;
    if (s.start > a && s.start < b) bad(`shot ${i + 1} ${s.key} cuts inside "${w.d}" of take ${k + 1} (${f2(s.start)} in ${f2(a)}-${f2(b)})`);
  }));
});
console.log("check: shot lengths >= 0.38 s:");
S.shots.forEach((s, i) => { if (s.end - s.start < 0.38 - 1e-6) bad(`shot ${i + 1} ${s.key} is ${f2(s.end - s.start)} s`); });
console.log("check: takes do not overlap:");
S.takes.forEach((t, k) => { if (k && S.P[k - 1] + S.takes[k - 1].end > S.P[k] + first(t) - 0.05) bad(`take ${k + 1} starts before take ${k} ends`); });
function first(t: { voiced: [number, number][]; words: { t: number }[] }) { return t.voiced?.[0]?.[0] ?? t.words[0].t; }
console.log(problems ? `${problems} problem(s)` : "no problems");
