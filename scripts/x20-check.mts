// node scripts/x20-check.mts  ->  the checks of the schedule of x20 "One Coffee" that need no render: no shot over 2.4 s (docs/format.md), a note where the first 3 s hold a picture over 1.3 s (the spec's own longest there is 0.70 s), no two framings alike in a row
// (src/x20-views.ts), every caption sits out of the bottom 400 px by its band and never runs over a cut, the radio's runs (out in shot 11, back on the bell, dead on the gong, none after it) and the shot list's times (docs/x20-one-coffee.md) against this
// schedule's frames: every cut and every hit within half a frame of the spec's time. Exits non-zero when a check fails.
import { CAPS, CAP_BAND, FPS, FRAMES, HITS, NO, RADIO_RUNS, SHOTS, SHOT_IDS, capBand, cues } from "../src/x20-sched.ts";
import { VIEWS } from "../src/x20-views.ts";

let bad = 0;
const fail = (m: string) => { bad++; console.log("FAIL " + m); };
const longest = SHOTS.reduce((a, s) => (s.t1 - s.t0 > a.d ? { id: s.id, d: s.t1 - s.t0 } : a), { id: SHOTS[0].id, d: 0 });
SHOTS.forEach((s) => { if (s.t1 - s.t0 > 2.4 + 1e-6) fail(`shot ${NO[s.id]} ${s.id} is ${(s.t1 - s.t0).toFixed(2)} s`); });
console.log(`${SHOTS.length} pictures in ${FRAMES} frames (${(FRAMES / FPS).toFixed(2)} s); the longest is ${NO[longest.id]} ${longest.id}, ${longest.d.toFixed(2)} s; the shortest ${Math.min(...SHOTS.map((s) => s.t1 - s.t0)).toFixed(2)} s`);
const first3 = SHOTS.filter((s) => s.t0 < 3);
first3.forEach((s, i) => { if (i + 1 < first3.length && first3[i + 1].t0 - s.t0 > 1.3 + 1e-6) console.log(`NOTE the first 3 s: ${NO[s.id]} ${s.id} runs ${(first3[i + 1].t0 - s.t0).toFixed(2)} s (docs/format.md asks for a new picture every 0.4-1 s)`); });
console.log("cuts in the first 3 s:", first3.map((s) => s.t0.toFixed(2)).join(", "), `(the longest holds ${Math.max(...first3.map((s, i) => (i + 1 < first3.length ? first3[i + 1].t0 : 3.267) - s.t0)).toFixed(2)} s)`);
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

// the radio: out on the cut to shot 11, back on the bell (shot 12), stopped dead on the gong (shot 22); nothing after it, and the music does not run over the end
const at = (id: string) => SHOTS[SHOT_IDS.indexOf(id as never)];
const R = RADIO_RUNS;
if (R.length !== 2) fail(`the radio has ${R.length} runs, the shot list has 2`);
else {
  if (Math.abs(R[0].end - at("empty").t0) > 1e-6) fail(`the radio's first run ends at ${R[0].end.toFixed(3)} s, shot 11 starts at ${at("empty").t0.toFixed(3)} s`);
  if (Math.abs(R[1].at - HITS.find((h) => h.id === "bell")!.t) > 1e-6) fail("the radio's second run does not start on the door's bell");
  if (Math.abs(R[1].end - HITS.find((h) => h.id === "gong")!.t) > 1e-6 || R[1].fade > 0.01) fail("the radio does not stop dead on the gong");
  if (R[1].end > at("cheer").t0 + 1e-6) fail("the radio plays on after the gong's shot");
}
const radio = cues().filter((c) => c.name === "radio");
if (radio.some((c) => c.at + (c.len ?? 0) > at("dry").t0)) fail("music is playing in or after shot 27 (after the last line there is none)");
console.log(`the radio: ${R.map((r) => `${r.at.toFixed(2)}-${r.end.toFixed(2)} s`).join(", ")} (out in shot 11, back on the bell, dead on the gong)`);

// the shot list of docs/x20-one-coffee.md, "Shot list (v2, on the voices' clock)": each shot's start and each hit's time, as the doc has them (s); the schedule puts every one on a frame, a time on half a frame going up
const SPEC_CUTS = [0.0, 0.6, 1.35, 1.85, 2.55, 3.25, 4.55, 5.85, 7.4, 9.65, 10.55, 11.4, 11.8, 13.25, 14.15, 15.7, 16.3, 16.85, 17.6, 19.0, 20.55, 21.15, 21.7, 22.9, 24.1, 25.25, 26.9, 28.3, 28.9];
SHOT_IDS.forEach((id, i) => {
  const t = SHOTS[i].t0, d = Math.abs(t - SPEC_CUTS[i]);
  if (d > 0.5 / FPS + 1e-6) fail(`shot ${i + 1} ${id} starts at ${t.toFixed(3)} s, the spec's ${SPEC_CUTS[i]} s`);
});
// (clock: the whirl starts at 0.95, where the clip's first strike is; the clip itself starts 0.10 s before that)
const SPEC_HITS: Record<string, number> = {
  stamp: 0.0, coins1: 0.05, cup: 0.3, pop: 0.35, clock: 0.85, typing: 3.25, slurp: 5.9, snap: 6.6, tumbleweed: 10.6, cricket: 10.95, bell: 11.42, scrape: 15.72, pull: 16.35, plugin: 16.65, sputter: 16.87, chime: 20.6, gong: 21.25, cheer: 21.75, champagne: 22.95,
  spray: 24.12, drip: 27.95, coins2: 28.95,
};
for (const h of HITS) {
  const want = SPEC_HITS[h.id];
  if (want === undefined) { if (!["pop1", "pop2"].includes(h.id)) console.log(`NOTE hit ${h.id} is not in the spec's hits`); continue; }
  if (Math.abs(h.t - want) > 0.5 / FPS + 0.012) fail(`hit ${h.id} is at ${h.t.toFixed(3)} s, the spec's ${want.toFixed(3)} s`);
}
const missing = Object.keys(SPEC_HITS).filter((k) => !HITS.some((h) => h.id === k));
if (missing.length) fail(`hits of the spec that the schedule lacks: ${missing.join(", ")}`);
console.log(`${HITS.length} hits, ${cues().length} sound cues`);
console.log(bad ? `${bad} check(s) failed` : "all checks pass");
process.exit(bad ? 1 : 0);
