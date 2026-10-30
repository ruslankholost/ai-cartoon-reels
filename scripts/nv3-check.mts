// node scripts/nv3-check.mts  ->  prints the timeline of "Nobody Picks Up" v3 and checks it: length, which shot every line falls in, mouths closed outside speech,
// blinks away from the key frames, the review typed in time with the words, every cue inside the picture. Exits non-zero when a check fails.
import { BLINKS, CAPS, FPS, FRAMES, KEY_FRAMES, LINES, SHOTS, STAR_TAPS, T, T_END, TYPE_TIMES, POST_TAP, REVIEW, cues, lidAt, mouthAt, shotAt, speaking, type Char } from "../src/nv3-sched.ts";

let bad = 0;
const ok = (c: boolean, msg: string) => { if (!c) { bad++; console.log("FAIL", msg); } };
console.log(`total ${T_END.toFixed(2)} s, ${FRAMES} frames`);
SHOTS.forEach((s, i) => console.log(`shot ${i + 1} ${s.id.padEnd(8)} ${s.t0.toFixed(2)}-${s.t1.toFixed(2)} s${s.split ? "  split" : ""}`));
const WHERE: Record<number, string> = { 1: "bath", 2: "list", 3: "tony", 4: "tony", 5: "office", 6: "office", 7: "crowd", 8: "scroll", 9: "van", 10: "van", 11: "van", 12: "van", 13: "van", 14: "van", 15: "van", 16: "review" };
LINES.forEach((l) => {
  const a = shotAt(Math.round((l.start + 0.02) * FPS)), b = shotAt(Math.round((l.end - 0.02) * FPS));
  console.log(`line ${String(l.n).padStart(2)} ${l.who.padEnd(11)} ${l.start.toFixed(2)}-${l.end.toFixed(2)} s in ${a.id}${a.id === b.id ? "" : " > " + b.id}  "${l.text}"`);
  ok(a.id === b.id, `line ${l.n} is cut in two by a shot change`);
  ok(a.id === WHERE[l.n] || (l.n === 16 && a.id === "review"), `line ${l.n} should be in ${WHERE[l.n]}, is in ${a.id}`);
});
ok(T_END >= 40 && T_END <= 44.1, "length 40-44 s");
for (let i = 1; i < LINES.length; i++) ok(LINES[i].start >= LINES[i - 1].end - 0.001, `line ${LINES[i].n} starts before line ${LINES[i - 1].n} ends`);
// mouths closed whenever the character does not speak (Rick's gasp excepted)
const chars: Char[] = ["denise", "gary", "marco", "agency", "rick", "wife", "deniseRobe"];
let open = 0;
for (let f = 0; f < FRAMES; f++) for (const c of chars) if (!speaking(c, f) && mouthAt(c, f) !== "closed" && !(c === "rick" && f / FPS >= T.flush && f / FPS < T.flush + 0.5)) open++;
ok(open === 0, `${open} frames with an open mouth outside speech`);
const SEEN: Record<string, Char[]> = { bath: ["denise"], tony: ["denise"], office: ["denise", "marco", "agency"], crowd: ["denise", "rick", "wife"], van: ["denise", "gary"], living: ["deniseRobe"] };
for (const k of KEY_FRAMES) for (const c of SEEN[shotAt(k.f).id] ?? []) ok(!BLINKS[c].some((s) => k.f >= s - 1 && k.f <= s + 3), `${c} blinks at key frame "${k.label}" (${k.f})`);
// the review: five stars before the first letter, the text complete before Post
ok(STAR_TAPS[4] < TYPE_TIMES[0], "all five stars are tapped before the first letter");
ok(TYPE_TIMES.length === REVIEW.length, `typed ${TYPE_TIMES.length} letters for "${REVIEW}"`);
ok(TYPE_TIMES[TYPE_TIMES.length - 1] < POST_TAP, "the text is typed before Post is tapped");
ok(POST_TAP < T.s8c, "Post is tapped before the cut to the Premier call");
ok(T.thunkP < T.card && T.card < T.end, "thunk, then the card, then the end");
const C = cues();
ok(C.every((c) => c.at >= 0 && c.at < T_END), "every cue is inside the picture");
console.log(`captions ${CAPS.length}, cues ${C.length}`);
console.log("bleep caption:", CAPS.filter((c) => c.text.includes("*")).map((c) => c.text).join(" | "));
console.log(bad ? `${bad} check(s) failed` : "all checks passed");
process.exit(bad ? 1 : 0);
