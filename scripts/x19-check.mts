// node scripts/x19-check.mts  ->  the checks of the schedule of x19 "Screen Time" that need no render: no shot over 2.4 s (docs/format.md), a note where the first 3 s hold a picture over 1.3 s (the spec's own longest is 1.25 s), no two framings alike in a row
// (src/x19-views.ts), every caption sits out of the bottom 400 px by its band and never runs over a cut, and the shot list's times (docs/x19-screen-time.md) against this schedule's frames: every cut and every hit within half a frame of the spec's time
// (a cut that was moved onto a word is listed). Exits non-zero when a check fails.
import { CAPS, CAP_BAND, FPS, FRAMES, HITS, NO, SHOTS, SHOT_IDS, capBand, cues, BAR_FRAMES } from "../src/x19-sched.ts";
import { VIEWS } from "../src/x19-views.ts";

let bad = 0;
const fail = (m: string) => { bad++; console.log("FAIL " + m); };
const longest = SHOTS.reduce((a, s) => (s.t1 - s.t0 > a.d ? { id: s.id, d: s.t1 - s.t0 } : a), { id: SHOTS[0].id, d: 0 });
SHOTS.forEach((s) => { if (s.t1 - s.t0 > 2.4 + 1e-6) fail(`shot ${NO[s.id]} ${s.id} is ${(s.t1 - s.t0).toFixed(2)} s`); });
console.log(`${SHOTS.length} pictures in ${FRAMES} frames (${(FRAMES / FPS).toFixed(2)} s); the longest is ${NO[longest.id]} ${longest.id}, ${longest.d.toFixed(2)} s; the shortest ${Math.min(...SHOTS.map((s) => s.t1 - s.t0)).toFixed(2)} s`);
const first3 = SHOTS.filter((s) => s.t0 < 3);
first3.forEach((s, i) => { if (i + 1 < first3.length && first3[i + 1].t0 - s.t0 > 1.3 + 1e-6) console.log(`NOTE the first 3 s: ${NO[s.id]} ${s.id} runs ${(first3[i + 1].t0 - s.t0).toFixed(2)} s (docs/format.md asks for a new picture every 0.4-1 s: the spec's longest is 1.25 s)`); });
console.log("cuts in the first 3 s:", first3.map((s) => s.t0.toFixed(2)).join(", "), `(the longest holds ${Math.max(...first3.map((s, i) => (i + 1 < first3.length ? first3[i + 1].t0 : 3.167) - s.t0)).toFixed(2)} s)`);
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

// the shot list of docs/x19-screen-time.md, "Shot list (v3, on the voices' clock)": each shot's start and each hit's time, as the doc has them (s); the schedule puts every one on a frame, a time on half a frame going up
const SPEC_CUTS = [0.0, 0.5, 1.15, 1.9, 3.15, 4.7, 6.25, 7.45, 8.3, 10.1, 10.8, 11.75, 13.3, 13.95, 14.8, 16.45, 17.05, 17.65, 18.4, 18.85, 20.1, 20.6, 21.45, 22.9, 23.7, 24.4, 25.7, 27.0, 27.3, 28.45];
const MOVED: Record<number, string> = { 23: "shot 23 starts on the end of the word \"See?\" (21.63), the spec's 21.45 is inside it" };
SHOT_IDS.forEach((id, i) => {
  const t = SHOTS[i].t0, d = Math.abs(t - SPEC_CUTS[i]);
  if (d > 0.5 / FPS + 1e-6) { if (MOVED[i + 1]) console.log(`NOTE ${MOVED[i + 1]} (${d.toFixed(2)} s off)`); else fail(`shot ${i + 1} ${id} starts at ${t.toFixed(3)} s, the spec's ${SPEC_CUTS[i]} s`); }
});
const SPEC_HITS: Record<string, number> = {
  stamp: 0.0, blast: 0.3, smash: 0.78, hop1: 4.75, hop2: 5.05, hop3: 5.35, rattle: 7.5, tik: 10.2, whimper1: 10.85, jam: 13.3, zip: 13.35, canopy: 16.5, thoom: 16.75, windows: 17.1, turn1: 17.7, turn2: 17.9, turn3: 18.1, switch: 18.45, popcorn: 18.9, cash: 20.12,
  munch: 20.65, blip: 23.45, whimper2: 24.45, slide: 27.02, slap: 28.5, plug: 28.85, power: 29.05,
};
for (const h of HITS) {
  const want = h.id.startsWith("bar") ? 0.05 + (Number(h.id.slice(3)) - 1) * (0.28 - 0.05) / 6 : SPEC_HITS[h.id];
  if (want === undefined) { if (!["whump", "whoosh", "panes"].includes(h.id)) console.log(`NOTE hit ${h.id} is not in the spec's hits`); continue; }
  if (Math.abs(h.t - want) > 0.5 / FPS + 0.012) fail(`hit ${h.id} is at ${h.t.toFixed(3)} s, the spec's ${want.toFixed(3)} s`);
}
console.log(`${HITS.length} hits (${BAR_FRAMES.length} volume ticks), ${cues().length} sound cues`);
console.log(bad ? `${bad} check(s) failed` : "all checks pass");
process.exit(bad ? 1 : 0);
