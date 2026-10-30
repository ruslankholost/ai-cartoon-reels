// node scripts/sp-check.mts  ->  prints the SpCallTest timeline and checks it: length, blinks off the key frames, closed mouths outside
// speech, the peaks that move the head. Exits non-zero when a check fails.
import { BLINKS, CAPS, FPS, KEY_FRAMES, LINE, LINES, SP_FRAMES, T_END, T_PICK, moodAt, mouthAt, poseAt, speaking } from "../src/sp-sched.ts";

let bad = 0;
const ok = (c: boolean, msg: string) => { if (!c) { bad++; console.log("FAIL", msg); } };
console.log(`total ${T_END.toFixed(2)} s, ${SP_FRAMES} frames, pickup at ${T_PICK} s`);
LINES.forEach((l) => console.log(`line ${l.n} ${l.who.padEnd(6)} ${l.start.toFixed(2)}-${l.end.toFixed(2)} s  peaks ${l.peaks.map((p) => p.f).join(",")}  "${l.text}"`));
CAPS.forEach((c) => console.log(`cap ${c.t0.toFixed(2)}-${c.t1.toFixed(2)} ${c.who}: ${c.text}`));
ok(T_END >= 13 && T_END <= 16.05, "length 13-16 s");
for (const k of KEY_FRAMES) for (const who of ["DENISE", "GARY"] as const) ok(!BLINKS[who].some((s) => k.f >= s - 1 && k.f <= s + 3), `${who} blinks at key frame "${k.label}" (${k.f})`);
let closedOut = 0, openIn = 0;
for (let f = 0; f < SP_FRAMES; f++) for (const who of ["DENISE", "GARY"] as const) {
  if (!speaking(who, f)) { if (mouthAt(who, f) !== "closed") closedOut++; } else if (mouthAt(who, f) !== "closed") openIn++;
}
ok(closedOut === 0, `${closedOut} frames with an open mouth outside speech`);
console.log(`open-mouth frames while speaking: ${openIn}`);
// moods: Denise neutral -> angry (from "For what?") -> defeated (from "...Okay."); Gary smug; defeated and smug mouths never open wide; heavy lids
const moods: string[] = [];
let wideBad = 0, lidBad = 0;
for (let f = 0; f < SP_FRAMES; f++) {
  const m = moodAt("DENISE", f);
  if (moods[moods.length - 1] !== m) moods.push(m);
  for (const who of ["DENISE", "GARY"] as const) { const p = poseAt(who, f); if ((p.mood === "defeated" || p.mood === "smug") && p.mouth === "wide") wideBad++; }
  if (f >= Math.round(T_PICK * FPS) && poseAt("GARY", f).lid < 0.45 - 1e-9) lidBad++;
}
console.log("Denise moods in order:", moods.join(" > "), " Gary lid at the pickup", poseAt("GARY", Math.round(T_PICK * FPS) + 3).lid.toFixed(2), 'on "I picked up."', poseAt("GARY", Math.round(LINE(13).words[1].t * FPS)).lid.toFixed(2), " Denise lid when defeated", poseAt("DENISE", SP_FRAMES - 1).lid.toFixed(2));
ok(moods.join(">") === "neutral>angry>defeated", "Denise's moods run neutral, angry, defeated");
ok(wideBad === 0, `${wideBad} frames with a wide mouth in a defeated or smug mood`);
ok(lidBad === 0, `${lidBad} frames where Gary's lids are lighter than 45 %`);
ok(poseAt("DENISE", Math.round((LINE(11).start + 0.5) * FPS)).lift > 0.9, "Denise's eyes widen on \"Fifteen hundred.\"");
let maxTilt = 0, maxBob = 0, maxDelta = 0, prev = poseAt("DENISE", 0);
for (let f = 1; f < SP_FRAMES; f++) { const p = poseAt("DENISE", f), g = poseAt("GARY", f); maxTilt = Math.max(maxTilt, Math.abs(p.tilt), Math.abs(g.tilt)); maxBob = Math.max(maxBob, Math.abs(p.bob), Math.abs(g.bob)); maxDelta = Math.max(maxDelta, Math.abs(p.tilt - prev.tilt)); prev = p; }
console.log(`max tilt ${maxTilt.toFixed(2)} deg, max bob ${maxBob.toFixed(2)} px, max tilt change per frame ${maxDelta.toFixed(2)} deg`);
ok(maxTilt <= 4, "tilt stays small");
console.log("blinks DENISE", BLINKS.DENISE.slice(0, 6).join(","), "GARY", BLINKS.GARY.slice(0, 6).join(","));
console.log("key frames", KEY_FRAMES.map((k) => `${k.label}=${k.f}`).join("  "));
console.log(bad ? `${bad} check(s) failed` : "all checks passed");
process.exit(bad ? 1 : 0);
