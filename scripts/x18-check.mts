// node scripts/x18-check.mts  ->  the checks of the schedule of x18 "Unattended" that need no render: no shot over 2.4 s (docs/format.md), a note where the first 3 s hold a picture over 1 s, no two framings alike in a row (src/x18-views.ts), and
// every caption sits out of the bottom 400 px by its band and never runs over a cut. Exits non-zero when a check fails.
import { CAPS, CAP_BAND, FPS, FRAMES, NO, SHOTS, capBand } from "../src/x18-sched.ts";
import { VIEWS } from "../src/x18-views.ts";

let bad = 0;
const fail = (m: string) => { bad++; console.log("FAIL " + m); };
const longest = SHOTS.reduce((a, s) => (s.t1 - s.t0 > a.d ? { id: s.id, d: s.t1 - s.t0 } : a), { id: SHOTS[0].id, d: 0 });
SHOTS.forEach((s) => { if (s.t1 - s.t0 > 2.4 + 1e-6) fail(`shot ${NO[s.id]} ${s.id} is ${(s.t1 - s.t0).toFixed(2)} s`); });
console.log(`${SHOTS.length} pictures in ${FRAMES} frames (${(FRAMES / FPS).toFixed(2)} s); the longest is ${NO[longest.id]} ${longest.id}, ${longest.d.toFixed(2)} s; the shortest ${Math.min(...SHOTS.map((s) => s.t1 - s.t0)).toFixed(2)} s`);
const first3 = SHOTS.filter((s) => s.t0 < 3);
first3.forEach((s, i) => { if (i + 1 < first3.length && first3[i + 1].t0 - s.t0 > 1.0 + 1e-6) console.log(`NOTE the first 3 s: ${NO[s.id]} ${s.id} runs ${(first3[i + 1].t0 - s.t0).toFixed(2)} s (docs/format.md asks for a new picture every 0.4-1 s: cut it)`); });
console.log("cuts in the first 3 s:", first3.map((s) => s.t0.toFixed(2)).join(", "));
// the framings: the same plate (or picture), the scale within 20 % and the middle within 250 px is the same framing
for (let i = 0; i + 1 < SHOTS.length; i++) {
  const a = VIEWS[SHOTS[i].id], b = VIEWS[SHOTS[i + 1].id];
  const same = a.plate === b.plate && Math.abs(Math.log(a.s / b.s)) < Math.log(1.2) && Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) * Math.min(a.s, b.s) < 250;
  if (same) fail(`${NO[SHOTS[i].id]} ${SHOTS[i].id} and ${NO[SHOTS[i + 1].id]} ${SHOTS[i + 1].id} are the same framing (${a.plate}, scale ${a.s} and ${b.s})`);
}
CAPS.forEach((c) => {
  const s = SHOTS.find((x) => c.t0 + 0.02 >= x.t0 - 1e-6 && c.t0 + 0.02 < x.t1 - 1e-6)!, band = capBand(s.id);
  if (band[1] > 1520) fail(`caption "${c.text}" in ${NO[s.id]} has its band down to y ${band[1]} (the bottom 400 px start at 1520)`);
  if (c.t1 > s.t1 + 1e-6) fail(`caption "${c.text}" runs over the cut at ${s.t1.toFixed(2)} s`);
});
console.log(`${CAPS.length} captions, the default band y ${CAP_BAND[0]}-${CAP_BAND[1]}`);
console.log(bad ? `${bad} check(s) failed` : "all checks pass");
process.exit(bad ? 1 : 0);
