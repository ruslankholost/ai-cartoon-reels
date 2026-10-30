// node scripts/pen-check.mts  ->  prints the timeline of "I'm Just Not a Sales Person" v2 (the satire cut: lines 1 and 18-33, 29 shots) and checks it: length, which shot every line falls in, no cut inside a word (and none inside
// a stretch of sound), captions that keep every word inside one shot (a line that a cut splits is split in its caption on a word boundary), mouths shut outside speech, blinks away from the key frames, the order of
// the beats, every cue inside the picture, the share line long enough to read, the shot rules (every shot <= 2.4 s except the last one, which runs under the share line; no two shots in a row with the same
// framing), the joke of the first seconds (SALES REP readable 1.0 s before the swipe, the buzz on its measured peak, the message readable 1.6 s), no sepia and no music, and the physics (every hit on the frame
// of its sound's measured peak, falls that land on that frame and squash, slides that stop dead, springs that settle). Exits non-zero when a check fails.
import peaks from "../src/sfx-peaks.json" with { type: "json" };
import { clearance } from "../src/pen-eyes.ts";
import { CARD, ENDVIEW, FINE, OFFD, READER, blankBoxes, boxesOf, captioned, labelRects } from "../src/pen-layout.ts";
import { readFileSync } from "node:fs";
import {
  BLINKS, BOX_FALL, CAPS, CAP_BAND, capBand, cardAt, contractOnDesk, fineP, FPS, FRAMES, HITS, KEY_FRAMES, LINES, PALLET_FALL, SHARE, SHOTS, STORY, T, T_END, TOSS, TOSS_G, TOSS_VIMP, V1_NO,
  boxAt, buzzAt, contractSlide, cues, holdPush, isStory, jiggleAt, mouthAt, palletAt, penSlide, penDropAt, posterAt, readerPopK, popScale, clickK, shakeAt, shotAt, signP, speaking, swipeP, twos,
  walk41P, walk41Step, bodyAt, gazeAt, joltAt, poseAt, type Char, type ShotId,
} from "../src/pen-sched.ts";

let bad = 0;
const ok = (c: boolean, msg: string) => { if (!c) { bad++; console.log("FAIL", msg); } };
console.log(`total ${T_END.toFixed(2)} s, ${FRAMES} frames`);
SHOTS.forEach((s, i) => console.log(`shot ${String(i + 1).padStart(2)} (v1 ${String(V1_NO[s.id]).padStart(2)}) ${s.id.padEnd(13)} ${s.t0.toFixed(2)}-${s.t1.toFixed(2)} (${(s.t1 - s.t0).toFixed(2)} s)${STORY.has(s.id) ? "  sepia" : ""}`));
const num = (id: ShotId) => SHOTS.findIndex((s) => s.id === id) + 1;

// ── the shot rules. Every shot runs 2.4 s at most, except the last one (it runs under the share line). No two shots in a row have the same framing: a framing is the set, the subject and the
// size of the shot (the label, below).
type Cut = { id: string; t0: number; t1: number; framing: string };
const MAX = 2.4;
function shotRules(shots: Cut[]): string[] {
  const out: string[] = [];
  shots.forEach((s, i) => {
    const d = s.t1 - s.t0;
    if (i < shots.length - 1 && d > MAX + 1e-6) out.push(`shot ${i + 1} (${s.id}) runs ${d.toFixed(2)} s, the limit is ${MAX} s`);
    if (i && shots[i - 1].framing === s.framing) out.push(`shots ${i} and ${i + 1} (${shots[i - 1].id}, ${s.id}) have the same framing: ${s.framing}`);
  });
  return out;
}
const FRAMING: Record<ShotId, string> = {
  garageMed: "garage, Denise, medium", phoneAd: "phone, job ad, insert", phoneMsg: "phone, message, insert", denBoss: "garage, Denise, close, smiling", penSlide: "office, Brandon, medium close",
  denResume: "office, Denise, medium close", contract: "office, Brandon, medium, the contract", denPockets: "office, Denise, medium close, the pockets", readerUp: "office, Brandon, medium, the reader", cardTap: "card reader, insert",
  signed: "contract, insert", kitSays: "office, Brandon, medium close, the kit", boxCatch: "office, Denise, medium, the box", diamond: "office, Brandon, medium, the poster", denCount: "office, Denise, close",
  mathCut: "office, Brandon, medium close, the math", posterIns: "yacht poster, insert", denSure: "office, Denise, close, glazed", palletWide: "office, pallet, wide", posterRip: "office, Brandon, medium, the poster comes off",
  garageEnd: "garage with boxes, wide, Rhonda in the door", rhoPens: "garage with boxes, Rhonda, medium close", denClick: "garage with boxes, Denise, close", rhoWall: "garage with boxes, Rhonda, medium close, the wall",
  posterFine: "yacht poster, insert, fine print", denEyes: "garage with boxes, Denise, extreme close", denSwear: "garage with boxes, Denise, medium", rhoCrack2: "garage with boxes, Rhonda, medium close, the second can",
  wideEnd: "garage with boxes, wide, Denise and Rhonda",
};
// the rules must reject a cut list that breaks them, or they check nothing
ok(shotRules([{ id: "a", t0: 0, t1: 2, framing: "x" }, { id: "b", t0: 2, t1: 4, framing: "x" }]).some((m) => m.includes("same framing")), "the framing rule does not reject two equal framings in a row");
ok(shotRules([{ id: "a", t0: 0, t1: 2.5, framing: "x" }, { id: "b", t0: 2.5, t1: 4, framing: "y" }]).some((m) => m.includes("limit")), "the length rule does not reject a 2.5 s shot");
ok(shotRules([{ id: "a", t0: 0, t1: 2.4, framing: "x" }, { id: "b", t0: 2.4, t1: 4, framing: "y" }, { id: "c", t0: 4, t1: 9, framing: "z" }]).length === 0, "the length rule: the last shot may run any length, any other shot 2.4 s");
shotRules(SHOTS.map((s) => ({ ...s, framing: FRAMING[s.id] }))).forEach((m) => ok(false, m));
ok(SHOTS.length === 29, `29 shots (${SHOTS.length})`);
ok(SHOTS.every((s, i) => (i === 0 ? s.t0 === 0 : s.t0 === SHOTS[i - 1].t1)) && SHOTS[SHOTS.length - 1].t1 === T_END, `the ${SHOTS.length} shots tile the reel from 0 to the end`);

// ── who is on screen in each shot (for the blink check and for "an on-screen line has its speaker in the picture"); Rhonda is on screen only from shot 41 (v1's numbers), in the doorway
const SEEN: Record<ShotId, Char[]> = {
  garageMed: ["denisePen"], phoneAd: [], phoneMsg: [], denBoss: ["denisePen"], penSlide: ["brandon"],
  denResume: ["denisePen"], contract: ["brandon"], denPockets: ["denisePen"], readerUp: ["brandon"], cardTap: [], signed: [], kitSays: ["brandon"], boxCatch: ["denisePen"], diamond: ["brandon"], denCount: ["denisePen"],
  mathCut: ["brandon"], posterIns: [], denSure: ["denisePen"], palletWide: ["denisePen", "brandon"], posterRip: ["brandon"], garageEnd: ["denisePen", "rhondaPen"], rhoPens: ["rhondaPen"], denClick: ["denisePen"],
  rhoWall: ["rhondaPen"], posterFine: [], denEyes: ["denisePen"], denSwear: ["denisePen"], rhoCrack2: ["rhondaPen"], wideEnd: ["denisePen", "rhondaPen"],
};

// the shot every line belongs to (the numbers are v1's: the lines are 1 and 18-33); Brandon's "Don't do the math. Comes with the yacht." is cut in its pause (the second sentence is a voice over the poster), and
// "Either you're selling, or you're buying." at its comma
const WHERE: Record<number, ShotId[]> = {
  1: ["garageMed"], 18: ["denBoss"], 19: ["penSlide"], 20: ["denResume"], 21: ["contract"], 22: ["denPockets"], 23: ["readerUp"], 24: ["kitSays"], 25: ["boxCatch"], 26: ["diamond"], 27: ["denCount"], 28: ["mathCut", "posterIns"],
  29: ["denSure"], 30: ["rhoPens"], 31: ["denClick"], 32: ["denSwear"], 33: ["rhoCrack2", "wideEnd"],
};
const CROSS = new Set([28, 33]);
LINES.forEach((l) => {
  const a = shotAt(Math.round((l.first + 0.02) * FPS)), b = shotAt(Math.round((l.end - 0.02) * FPS));
  console.log(`line ${String(l.n).padStart(2)} ${l.who.padEnd(8)} first ${l.first.toFixed(2)} words ${l.start.toFixed(2)}-${l.end.toFixed(2)} voice to ${l.tend.toFixed(2)} s in ${a.id}${a.id === b.id ? "" : " > " + b.id}  "${l.text}"`);
  ok(WHERE[l.n].includes(a.id) && WHERE[l.n].includes(b.id), `line ${l.n} should be in ${WHERE[l.n].join("/")}, is in ${a.id}${a.id === b.id ? "" : " > " + b.id}`);
  ok(a.id === b.id || CROSS.has(l.n), `line ${l.n} is cut in two by a shot change`);
  ok(SEEN[a.id].includes(l.char), `line ${l.n}: ${l.char} is not on screen in ${a.id}`);
  if (!CROSS.has(l.n)) ok(SEEN[b.id].includes(l.char), `line ${l.n}: ${l.char} is not on screen in ${b.id}`);
});
// no cut inside a word, and no cut inside the take's sound: the pause between sentences or words is the only place a line may be cut
for (const s of SHOTS.slice(1)) for (const l of LINES) {
  for (const w of l.words) ok(!(s.t0 > w.t + 0.02 && s.t0 < w.e - 0.02), `the cut to ${s.id} (${s.t0.toFixed(2)}) falls inside "${w.d}" of line ${l.n}`);
  for (const [a, b] of l.voiced) ok(!(s.t0 > a + 0.03 && s.t0 < b - 0.03), `the cut to ${s.id} (${s.t0.toFixed(2)}) falls inside a stretch of sound of line ${l.n} (${a.toFixed(2)}-${b.toFixed(2)})`);
}
// captions: every word is inside a caption; a caption lives inside one shot and stays up until its last word is out (a cut in the middle of a line would drop words)
for (const l of LINES) for (const w of l.words) ok(CAPS.some((c) => w.t >= c.w0 - 1e-6 && w.e <= c.w1 + 1e-6), `no caption holds "${w.d}" of line ${l.n}`);
const shotOf = (t: number) => SHOTS.findIndex((x) => t >= x.t0 - 1e-6 && t < x.t1 - 1e-6);
for (const c of CAPS) {
  const a = shotOf(c.w0 + 0.02), b = shotOf(c.w1 - 0.02), e = shotOf(c.t1 - 1e-3);
  ok(a === b, `caption "${c.text}" runs over a cut`);
  ok(e === a && c.t0 >= SHOTS[a].t0 - 1e-6, `caption "${c.text}" (${c.t0.toFixed(2)}-${c.t1.toFixed(2)}) leaves its shot ${SHOTS[a].id}`);
  ok(c.t1 >= c.w1 - 0.06, `caption "${c.text}" goes out at ${c.t1.toFixed(2)}, before its last word ends (${c.w1.toFixed(2)}); the next caption may take over 0.04 s early`);
}
// two captions of one take run into each other or are 0.1 s apart (never a one-frame flash of no text where a cut split the line)
for (let i = 1; i < CAPS.length; i++) if (CAPS[i].n === CAPS[i - 1].n) { const g = CAPS[i].t0 - CAPS[i - 1].t1; ok(g >= -1e-6 && (g < 1e-6 || g >= 0.1), `captions "${CAPS[i - 1].text}" and "${CAPS[i].text}" leave a gap of ${g.toFixed(2)} s with no text`); }
// the lines that a cut splits are split in their captions at the cut, on a word boundary: the outro at its comma, the yacht line at its full stop
for (const [n, a, b] of [[33, "rhoCrack2", "wideEnd"], [28, "mathCut", "posterIns"]] as [number, ShotId, ShotId][]) {
  const cs = CAPS.filter((c) => c.n === n);
  ok(cs.length >= 2 && cs.some((c) => shotOf(c.w0 + 0.02) === num(a) - 1) && cs.some((c) => shotOf(c.w0 + 0.02) === num(b) - 1), `the captions of line ${n} are split at the cut (${a} / ${b})`);
}
ok(CAPS.filter((c) => c.n === 33).map((c) => c.text).join(" | ") === "Either you're selling, | or you're buying.", `the outro's captions read "${CAPS.filter((c) => c.n === 33).map((c) => c.text).join(" | ")}"`);
// a caption's words are the line's words, in order, and the bleeped word shows as F***ing
for (const l of LINES) {
  const said = CAPS.filter((c) => c.n === l.n).map((c) => c.text).join(" ").replace(/\./g, "").replace(/\?/g, "").toLowerCase();
  const want = l.words.map((w) => (w.bleep ? "f***ing" : w.d.replace(/—/g, "-"))).join(" ").replace(/\./g, "").replace(/\?/g, "").toLowerCase();
  ok(said === want, `the captions of line ${l.n} read "${said}", the line is "${want}"`);
}
ok(CAPS.some((c) => c.n === 32 && c.text === "F***ing marketing."), `line 32's caption reads "F***ing marketing."`);
ok(LINES.length === 17 && LINES[0].n === 1 && LINES[1].n === 18 && LINES[16].n === 33, `17 takes: 1 and 18-33 (${LINES.map((l) => l.n).join(",")})`);
ok(T_END >= 38 && T_END <= 42, `length 38-42 s (${T_END.toFixed(2)})`);
for (let i = 1; i < LINES.length; i++) ok(LINES[i].first >= LINES[i - 1].end - 0.001, `line ${LINES[i].n} starts before line ${LINES[i - 1].n} ends`);
// mouths closed whenever the character does not speak
const chars = Object.keys(BLINKS) as Char[];
let open = 0;
for (let f = 0; f < FRAMES; f++) for (const c of chars) if (!speaking(c, f) && mouthAt(c, f) !== "closed") open++;
ok(open === 0, `${open} frames with an open mouth outside speech`);
// blinks away from the key frames (for whoever is on screen there)
for (const k of KEY_FRAMES) for (const c of SEEN[shotAt(k.f).id]) ok(!BLINKS[c].some((s) => k.f >= s - 1 && k.f <= s + 3), `${c} blinks at key frame "${k.label}" (${k.f})`);
ok(SHOTS.every((s) => KEY_FRAMES.some((k) => shotAt(k.f).id === s.id)), "every shot has a key frame");
ok(KEY_FRAMES.every((k) => k.f >= 0 && k.f < FRAMES), "every key frame is inside the reel");

// ── the order of the beats
const order: [string, number][] = [
  ["s2", T.s2], ["swipe0", T.swipe0], ["swipe1", T.swipe1], ["s23", T.s23], ["buzz1", T.buzz1], ["buzz2", T.buzz2], ["s24", T.s24], ["s25", T.s25], ["penPush", T.penPush], ["penStop", T.penStop], ["s26", T.s26], ["s27", T.s27],
  ["contractPush", T.contractPush], ["contractStop", T.contractStop], ["s28", T.s28], ["pat1", T.pat1], ["pat2", T.pat2], ["s29", T.s29], ["readerPop", T.readerPop], ["s30", T.s30], ["tap30", T.tap30], ["s31", T.s31], ["s32", T.s32], ["s33", T.s33],
  ["boxLand", T.boxLand], ["beep33", T.beep33], ["s34", T.s34], ["s35", T.s35], ["s36", T.s36], ["s37", T.s37], ["s38", T.s38], ["beep38", T.beep38], ["s39", T.s39], ["pallet", T.pallet], ["s40", T.s40], ["rip", T.rip],
  ["posterFree", T.posterFree], ["posterRolled", T.posterRolled], ["posterLay", T.posterLay], ["s41", T.s41], ["door41", T.door41], ["s42", T.s42], ["s43", T.s43], ["click", T.click], ["s44", T.s44], ["wall", T.wall], ["s45", T.s45], ["fineIn", T.fineIn],
  ["s46", T.s46], ["eyes46", T.eyes46], ["penToss", T.penToss], ["s47", T.s47], ["clatter", T.clatter], ["s48", T.s48], ["crack48", T.crack48], ["s49", T.s49], ["share", T.share], ["end", T.end],
];
for (let i = 1; i < order.length; i++) ok(order[i][1] > order[i - 1][1], `${order[i][0]} (${order[i][1].toFixed(2)}) is not after ${order[i - 1][0]} (${order[i - 1][1].toFixed(2)})`);
ok(T.end - T.share >= 2.5 - 1e-6, `the share line stays ${(T.end - T.share).toFixed(2)} s (the least is 2.5 s)`);
ok(SHARE === "Send this to the friend who just got a 'hey girl' text.", "the share line's words");
ok(shotAt(Math.round((T.share + 0.1) * FPS)).id === "wideEnd", "the share line is over the last shot");

// ── v2 has no sepia shot, no projector's iris and no music: they went with the story (the Tup episode, src/tup-sched.ts); the film grain is the only look
ok(STORY.size === 0 && SHOTS.every((s) => !STORY.has(s.id)) && Array.from({ length: FRAMES }, (_, f) => f).every((f) => !isStory(f)), "no shot is sepia");
// a slow push on every hold
ok(SHOTS.every((s) => { const f0 = Math.round(s.t0 * FPS) + 1, f1 = Math.round(s.t1 * FPS) - 1; return f1 <= f0 || holdPush(f1) > holdPush(f0); }), "every shot has a slow push");
ok(1 - holdPush(0) === 0, "the first frame is not pushed");

// ── the physics. A hit is a thing that happens on one frame; its sound is placed so that the clip's measured peak lands on that frame
const C = cues();
const PK = peaks as Record<string, number>;
const fr = (t: number) => Math.round(t * FPS);
for (const h of HITS) {
  const pk = PK[h.sfx], s = SHOTS.find((x) => x.id === h.shot)!;
  ok(pk !== undefined, `no measured peak for ${h.sfx}`);
  ok(Math.abs(h.t * FPS - fr(h.t)) < 1e-6, `hit ${h.id} (${h.t}) is not on a frame`);
  ok(C.some((c) => c.name === h.sfx && Math.abs(c.at + pk - h.t) < 0.5 / FPS), `hit ${h.id}: no ${h.sfx} cue starts ${pk?.toFixed(3)} s before ${h.t.toFixed(3)}`);
  ok(h.t >= s.t0 + 0.02 && h.t < s.t1, `hit ${h.id} (${h.t.toFixed(2)}) is not inside ${h.shot} (${s.t0.toFixed(2)}-${s.t1.toFixed(2)})`);
  if (h.fall) {
    ok(h.t - h.fall >= s.t0 - 1e-6, `${h.id} starts to fall (${(h.t - h.fall).toFixed(2)}) before its shot ${h.shot} starts (${s.t0.toFixed(2)})`);
    ok(s.t1 - h.t >= 0.2 - 1e-6, `${h.id} lands only ${(s.t1 - h.t).toFixed(2)} s before the cut (the least is 0.2 s, for the squash)`);
  }
}
const sfxUsed = new Set(C.map((c) => c.name));
console.log("sounds:", [...sfxUsed].sort().join(" "));
// a fall lands on its frame: at rest on it, still in the air the frame before; the squash is at its full size on the landing frame and none before, a small stretch follows, and it is at rest 0.7 s later
type Fall = { name: string; t: number; h: (f: number) => number; sq: (f: number) => number };
const falls: Fall[] = [
  { name: "the box", t: T.boxLand, h: (f) => boxAt(f).drop, sq: (f) => boxAt(f).sq },
  { name: "the pallet", t: T.pallet, h: (f) => palletAt(f).drop, sq: (f) => palletAt(f).sq },
];
for (const x of falls) {
  const f = fr(x.t);
  ok(x.h(f) === 0 && x.h(f - 1) > 0, `${x.name}: at rest on frame ${f} (${x.h(f)}), in the air on ${f - 1} (${x.h(f - 1)})`);
  ok(Math.abs(x.sq(f) - 1) < 1e-9 && x.sq(f - 1) === 0, `${x.name}: the squash is 1 on the landing frame (${x.sq(f).toFixed(2)}) and none before (${x.sq(f - 1)})`);
  let lo = 0;
  for (let k = 1; k < 24; k++) lo = Math.min(lo, x.sq(f + k));
  ok(lo < -0.05 && lo > -0.6, `${x.name}: a small stretch follows the squash (${lo.toFixed(2)})`);
  ok(Math.abs(x.sq(f + 21)) < 0.1, `${x.name}: not at rest 0.7 s after the landing (${x.sq(f + 21).toFixed(2)})`);
  ok(x.h(f + 3) === 0, `${x.name}: it stays down`);
}
// the falls speed up (gravity): each frame covers more ground than the one before
for (const [name, t, fall] of [["the box", T.boxLand, BOX_FALL], ["the pallet", T.pallet, PALLET_FALL]] as [string, number, number][]) {
  const g = (f: number) => (name === "the box" ? boxAt(f).drop : palletAt(f).drop);
  const f1 = fr(t), f0 = f1 - Math.round(fall * FPS);
  let speeding = true;
  for (let f = f0 + 1; f < f1; f++) if (!(g(f - 1) - g(f) >= g(f - 2) - g(f - 1) - 1e-9)) speeding = false;
  ok(speeding && g(f0 - 1) === 1 && g(f0) > 0.9, `${name} falls with gravity (each frame farther than the last) from frame ${f0} to ${f1}`);
}
// the slides stop dead: the first frame is the fastest, no frame is faster than the one before it, and the last position is exactly 1
for (const [name, p, t0, t1] of [["the pen", penSlide, T.penPush, T.penStop], ["the contract", contractSlide, T.contractPush, T.contractStop]] as [string, (f: number) => number, number, number][]) {
  let ok1 = p(fr(t0) - 1) === 0 && p(fr(t1)) === 1 && p(fr(t1) + 3) === 1, steps = 0, prev = Infinity;
  for (let f = fr(t0); f < fr(t1); f++) { const d = p(f + 1) - p(f); if (d > prev + 1e-9) ok1 = false; prev = d; steps++; }
  ok(ok1 && steps >= 8, `${name} slows with friction (${steps} frames) and stops dead on frame ${fr(t1)}`);
  const s = SHOTS.find((x) => x.t0 <= t0 && t1 < x.t1)!;
  ok(!!s && s.t1 - t1 >= 0.2 - 1e-6, `${name} stops ${s ? (s.t1 - t1).toFixed(2) : "?"} s before the cut (the least is 0.2 s, to read it)`);
}
// the reader pops up with a spring overshoot of 5-35 % and rings out
{
  const f = fr(T.readerPop);
  let hi = 0;
  for (let k = 0; k < 30; k++) hi = Math.max(hi, readerPopK(f + k));
  ok(readerPopK(f - 1) === 0 && hi > 1.05 && hi < 1.35 && Math.abs(readerPopK(f + 24) - 1) < 0.03, `the reader pops with an overshoot of ${((hi - 1) * 100).toFixed(0)} % and settles`);
}
// Denise dips 2-3 % under the box and springs back
{
  let hi = 0;
  for (let f = fr(T.boxLand) - 3; f < fr(T.boxLand) + 30; f++) hi = Math.max(hi, boxAt(f).dip);
  ok(hi >= 0.02 && hi <= 0.03 && boxAt(fr(T.boxLand) - 1).dip === 0 && Math.abs(boxAt(fr(T.boxLand) + 24).dip) < 0.003, `Denise dips ${(hi * 100).toFixed(1)} % under the box and springs back`);
}
// the pallet: the camera shakes at the hit and is still 0.5 s later; the boxes jiggle on springs and settle
{
  const f = fr(T.pallet);
  const m = (k: number) => Math.hypot(...shakeAt(f + k));
  let jolt = 0;
  for (let k = 0; k < 8; k++) jolt = Math.max(jolt, m(k));
  ok(m(-1) === 0 && jolt > 12 && jolt < 30 && m(15) < 1, `the camera shakes on the slam (${jolt.toFixed(0)} px) and is still after 0.5 s (${m(15).toFixed(1)} px)`);
  let worst = 0, late = 0;
  for (let i = 0; i < 6; i++) { for (let k = 0; k < 20; k++) worst = Math.max(worst, jiggleAt(i, f + k).dy); late = Math.max(late, Math.abs(jiggleAt(i, f + 24).dy), Math.abs(jiggleAt(i, f + 24).rot)); }
  ok(worst > 3 && worst < 22 && late < 1.2 && jiggleAt(0, f - 1).dy === 0, `the pallet's boxes jiggle (${worst.toFixed(0)} px) and settle (${late.toFixed(1)})`);
}
// the poster peels from its corner like a hinge, then comes free and is rolled up before the cut
{
  const h = (k: number) => posterAt(fr(T.rip) + k).hinge;
  let up = true;
  for (let f = fr(T.rip); f < fr(T.posterFree); f++) if (posterAt(f + 1).hinge < posterAt(f).hinge) up = false;
  ok(h(-1) === 0 && h(0) === 0 && up && Math.abs(posterAt(fr(T.posterFree)).hinge - 58) < 1e-9, "the poster's hinge opens from the rip to the frame it comes free");
  ok(posterAt(fr(T.posterFree) - 1).free === 0 && posterAt(fr(T.posterFree) + 9).free > 0.99 && posterAt(fr(T.posterRolled)).roll > 0.99 && posterAt(fr(T.posterFree)).roll === 0, "the poster comes free, then is rolled");
  ok(T.s41 - T.posterLay >= 0.15, `the poster lies on her box ${(T.s41 - T.posterLay).toFixed(2)} s before the cut`);
}
// the pen in shot 46: a small toss up out of her fist (an apex of 15-60 puppet px), it spins over once and lands on the front row of boxes (FLOOR below the fist) on the frame of the clatter, hops off it
// at 35 % of its landing speed, hops again and rolls a little to a stop in shot 47 (puppet px; the scenes draw them at her scale)
{
  const a = fr(T.penToss), z = fr(T.clatter);
  let apex = 0, tApex = 0, below = 0;
  for (let f = a; f < z; f++) { const y = penDropAt(f).y; if (y > apex) { apex = y; tApex = f; } below = Math.min(below, y); }
  ok(penDropAt(a - 1).on === false && penDropAt(a).on === true && Math.abs(penDropAt(a).y) < 1e-9 && Math.abs(penDropAt(z).y + TOSS.floor) < 1e-6 && penDropAt(z - 1).y > -TOSS.floor + 20, `the pen is in the air until the clatter's frame ${z} and on the boxes (${TOSS.floor} puppet px below her fist) on it`);
  ok(apex >= 15 && apex <= 60 && tApex - a >= 2, `the pen is tossed ${apex.toFixed(0)} puppet px up and peaks after ${tApex - a} frames`);
  let hop = 0, hopF = 0;
  for (let f = z; f < z + 15; f++) { const h = penDropAt(f).y + TOSS.floor; if (h > hop) { hop = h; hopF = f; } }
  const e = hop / ((TOSS_VIMP * TOSS_VIMP) / (2 * TOSS_G)); // the hop's height against the height the pen fell with: e squared
  ok(hop > 30 && hop < 80 && Math.abs(e - TOSS.e * TOSS.e) < 0.08 && hopF - z >= 2, `it hops ${hop.toFixed(0)} puppet px off the box after the landing (${(e / TOSS.e / TOSS.e * 100).toFixed(0)} % of e squared), peaking ${hopF - z} frames later`);
  const rest = fr(T.clatter + 0.25);
  ok(penDropAt(rest).moving === false && penDropAt(rest).hops >= 2 && Math.abs(penDropAt(rest + 30).x - penDropAt(rest).x) < 1 && Math.abs(penDropAt(rest).rot - penDropAt(rest + 30).rot) < 0.5 && T.clatter + 0.25 <= LINES.find((l) => l.n === 32)!.first + 0.1, `it lies still 0.25 s after the clatter, before her line (${LINES.find((l) => l.n === 32)!.first.toFixed(2)} s; hops ${penDropAt(rest).hops})`);
  let strobe = 0;
  for (let f = a; f < z; f++) strobe = Math.max(strobe, Math.abs(penDropAt(f + 1).rot - penDropAt(f).rot));
  ok(strobe <= 60, `the pen turns at most ${strobe.toFixed(0)} degrees a frame`);
  ok(T.penToss - T.s46 >= 0.25 && T.s47 - T.penToss >= 0.1 && T.clatter - T.s47 >= 0.1 && T.clatter - T.s47 <= 0.2, `the pen slips out of her fist ${(T.penToss - T.s46).toFixed(2)} s into shot 46, the cut is ${(T.clatter - T.s47).toFixed(2)} s before the clatter: the landing is in shot 47`);
  ok(penDropAt(fr(T.s47)).on && penDropAt(fr(T.s47)).y > -TOSS.floor + 150 && penDropAt(fr(T.s47)).y < 0, "shot 47 opens on the pen in the air, falling toward the boxes");
  ok(clickK(fr(T.click)) === 1 && clickK(fr(T.click) - 3) === 0 && clickK(fr(T.click) + 3) === 0 && T.click < T.s44, "the pen's button pops on the click frame");
}
// the small acting: Brandon winds up before the reader's pop and overshoots after it
{
  const p = fr(T.readerPop);
  let lo = 1, hi = 1;
  for (let k = -6; k < 12; k++) { lo = Math.min(lo, popScale(p + k)); hi = Math.max(hi, popScale(p + k)); }
  ok(popScale(p - 4) === 1 && popScale(p - 1) < popScale(p - 2) && popScale(p - 2) < 1 && popScale(p) < 0.95 && popScale(p + 2) > 1.03 && hi < 1.08 && Math.abs(popScale(p + 30) - 1) < 0.005, `Brandon winds up over 3 frames (${((1 - lo) * 100).toFixed(0)} % down), pops on the reader's frame, overshoots by ${((hi - 1) * 100).toFixed(0)} % and settles`);
}
// the joke of the first seconds: SALES REP is readable, unobstructed, for at least 1.0 s before the thumb swipes it away, the swipe lands on a sound; the phone buzzes twice on the buzz's measured peak, and the
// message "Hey girl!! Wanna be your own boss?" is readable for at least 1.6 s (from the frame its bubble has popped to the cut); the signature's scribble runs inside its shot
{
  const f0 = fr(T.swipe0), f1 = fr(T.swipe1);
  let up = true;
  for (let f = f0; f < f1; f++) if (swipeP(f + 1) < swipeP(f)) up = false;
  ok(swipeP(f0) === 0 && swipeP(f1) === 1 && up && T.swipe1 < T.s23 - 0.05, `the swipe runs ${(T.swipe1 - T.swipe0).toFixed(2)} s and is over ${(T.s23 - T.swipe1).toFixed(2)} s before the cut`);
  ok(T.s2 === SHOTS[1].t0 && T.swipe0 - T.s2 >= 1.0 && swipeP(fr(T.swipe0) - 1) === 0, `SALES REP stands, readable and unobstructed, for ${(T.swipe0 - T.s2).toFixed(2)} s before the swipe (at least 1.0 s)`);
  const sw = HITS.find((h) => h.id === "swipe")!;
  ok(!!sw && sw.sfx === "whoosh" && sw.t >= T.swipe0 && sw.t <= T.swipe1, "the swipe lands on a sound: a whoosh with its measured peak inside the swipe");
  const b = (t: number) => buzzAt(fr(t)), bz = HITS.filter((h) => h.sfx === "buzz");
  ok(b(T.buzz1 - 0.05).wig === 0 && b(T.buzz1 + 0.1).wig !== 0 && b(T.buzz1 + 0.35).wig === 0 && b(T.buzz2 + 0.1).wig !== 0 && T.buzz2 + 0.3 <= T.s24 && T.buzz1 >= T.s23 && b(T.buzz1 - 0.05).pop === 0 && Math.abs(b(T.buzz1 + 0.6).pop - 1) < 0.03, "the phone buzzes twice inside the chat's shot and the message pops in on the first buzz");
  ok(bz.length === 2 && bz[0].t === T.buzz1 && bz[1].t === T.buzz2 && bz.every((h) => C.some((c) => c.name === "buzz" && Math.abs(c.at + PK.buzz - h.t) < 0.5 / FPS)), "the phone buzzes on the buzz's measured peak, both times (a hit, not a guess)");
  let pop = 0;
  for (let f = fr(T.buzz1); f < fr(T.s24); f++) if (buzzAt(f).pop >= 0.95) { pop = f; break; }
  ok(pop > 0 && T.s24 - pop / FPS >= 1.6, `the message is readable ${(T.s24 - pop / FPS).toFixed(2)} s from the frame its bubble has popped to the cut (at least 1.6 s)`);
  ok(pop / FPS <= 4.5, `the hey-girl text has popped in ${(pop / FPS).toFixed(1)} s into the film: the joke (she rejects sales, then says yes to "be your own boss") reads in the first 5 s`);
  ok(signP(fr(T.s31)) === 0 && signP(fr(T.s32 - 0.1)) === 1 && signP(fr(T.s31 + 0.3)) > 0 && signP(fr(T.s31 + 0.3)) < 1, "the signature is drawn from the start of shot 31 and is done 0.1 s before the cut");
}
// who wears what, shot by shot (the staging rules of the build): Denise in the lawn chair with her phone (1, 24), in the blazer in the office, with the pat of her pockets in 28, and with the pen in her fist from
// the garage's return (41-49); Rhonda with the two beers in the doorway; Brandon with the reader from the pop to the point, the point in 34, the rip in 40 until the poster is rolled
{
  const mid = (id: ShotId) => { const s = SHOTS.find((x) => x.id === id)!; return Math.round(((s.t0 + s.t1) / 2) * FPS) - 1; };
  const den: Record<string, ShotId[]> = { chairPhone: ["garageMed", "denBoss"], blazer: ["denResume", "boxCatch", "denCount", "denSure", "palletWide"], blazerPat: ["denPockets"], blazerFist: ["garageEnd", "denClick", "denEyes", "denSwear", "wideEnd"] };
  for (const [b, ids] of Object.entries(den)) for (const id of ids) ok(bodyAt("denisePen", mid(id)) === b, `Denise wears ${b} in ${id} (${bodyAt("denisePen", mid(id))})`);
  for (const id of ["rhoPens", "rhoWall", "rhoCrack2", "garageEnd", "wideEnd"] as ShotId[]) ok(bodyAt("rhondaPen", mid(id)) === "beers", `Rhonda holds the beers in ${id}`);
  ok(bodyAt("brandon", mid("penSlide")) === "stand" && bodyAt("brandon", mid("kitSays")) === "reader" && bodyAt("brandon", mid("diamond")) === "point" && bodyAt("brandon", mid("mathCut")) === "stand", "Brandon: stand, the reader in 32, the point in 34, stand in 36");
  ok(bodyAt("brandon", fr(T.s40)) === "rip" && bodyAt("brandon", fr(T.posterRolled) - 2) === "rip" && bodyAt("brandon", fr(T.posterRolled) + 2) === "stand" && bodyAt("brandon", fr(T.readerPop) - 2) === "stand" && bodyAt("brandon", fr(T.readerPop) + 2) === "reader", "Brandon's fist holds the poster from the rip's shot until it is rolled; the reader is in his hand from the pop");
  for (const k of [T.pat1, T.pat2]) ok(poseAt("denisePen", fr(k)).breath < poseAt("denisePen", fr(T.pat1) - 8).breath - 3, `her body dips on the pat at ${k.toFixed(2)} s`);
  ok(Math.abs(poseAt("denisePen", fr(T.pat2) + 14).breath - poseAt("denisePen", fr(T.pat1) - 8).breath) < 2.5, "and it is back after the second pat");
  ok(gazeAt("rhondaPen", fr(T.wall) + 3)[0] < -0.3 && gazeAt("rhondaPen", fr(T.wall) + 3)[1] < 0, "in shot 44 her eyes go to the poster, left and up in the frame");
}
// every shot is in its own poses on every frame, its first and its last included (a pose swapped by a cut changes on the cut's frame, not a frame later): who wears what in which shot
{
  const WEARS: [Char, string[], ShotId[]][] = [
    ["denisePen", ["chairPhone"], ["garageMed", "denBoss"]], ["denisePen", ["blazer"], ["denResume", "boxCatch", "denCount", "denSure", "palletWide"]],
    ["denisePen", ["blazerPat"], ["denPockets"]], ["denisePen", ["blazerFist"], ["garageEnd", "denClick", "denEyes", "denSwear", "wideEnd"]],
    ["rhondaPen", ["beers"], ["garageEnd", "rhoPens", "rhoWall", "rhoCrack2", "wideEnd"]],
    ["brandon", ["stand"], ["penSlide", "contract", "mathCut"]], ["brandon", ["stand", "reader"], ["readerUp"]], ["brandon", ["reader"], ["kitSays"]], ["brandon", ["point"], ["diamond"]], ["brandon", ["rip", "stand"], ["posterRip"]],
  ];
  let wrong = 0;
  for (const [c, bodies, ids] of WEARS) for (const id of ids) {
    const s = SHOTS.find((x) => x.id === id)!;
    for (let f = fr(s.t0); f < fr(s.t1); f++) if (!bodies.includes(bodyAt(c, f) ?? "")) { wrong++; if (wrong < 6) console.log(`FAIL ${c} is in ${bodyAt(c, f)} on frame ${f} of ${id} (${bodies.join("/")}): ${f === fr(s.t0) ? "the first frame" : f === fr(s.t1) - 1 ? "the last frame" : "inside the shot"}`); }
  }
  ok(wrong === 0, `${wrong} frames where a character is not in the shot's own pose`);
}
// no pupil hides under a lid: on every frame, for everyone on screen, each pupil's centre is below the lid's edge by at least its radius (src/pen-eyes.ts); a blink is the only frame with the eyes shut
{
  let bad2 = 0, worst = Infinity, n = 0;
  for (let f = 0; f < FRAMES; f++) for (const c of SEEN[shotAt(f).id]) {
    if (BLINKS[c].some((s) => f >= s && f < s + 3)) continue;
    const p = poseAt(c, f);
    if (p.lid >= 0.9) continue;
    for (let i = 0; i < 2; i++) { const k = clearance(c, i, p.lid, p.gaze, p.pupil); n++; worst = Math.min(worst, k); if (k < -1e-6) { bad2++; if (bad2 < 6) console.log(`FAIL ${c} eye ${i} on frame ${f} (${shotAt(f).id}): the pupil is ${(-k).toFixed(1)} px under the lid (lid ${p.lid.toFixed(2)}, gaze ${p.gaze.map((v) => v.toFixed(2))})`); } }
  }
  ok(bad2 === 0, `${bad2} pupils under a lid`);
  console.log(`pupils: ${n} eyes checked, the least clearance ${worst.toFixed(1)} px`);
}
// the slam throws Denise: a 2-frame hop on the impact frame, a squash on the landing that settles; nothing before it, nothing after 0.5 s
{
  const p = fr(T.pallet), up = (k: number) => joltAt(p + k).up, sq = (k: number) => joltAt(p + k).sq, br = (k: number) => poseAt("denisePen", p + k).breath;
  ok(up(-1) === 0 && sq(-1) === 0 && up(0) === 0 && up(1) > 60 && up(2) === 0 && Math.abs(sq(2) - 1) < 1e-9 && Math.abs(sq(20)) < 0.08, "Denise hops for 2 frames on the slam and lands with a squash that settles");
  ok(br(1) > br(-3) + 30 && Math.abs(br(20) - br(-3)) < 3, `her body jumps ${(br(1) - br(-3)).toFixed(0)} puppet px on the slam and is back`);
}
// nothing that carries words is under a caption, and no box is blank: the labels of the boxes (PENS, STARTER KIT) stay on their boxes and are moved on the face (higher, lower) out of the captions' band of their
// shot (src/pen-layout.ts; the last shot's band is the floor under the boxes), on every frame of every shot. The newspaper and the résumé are placed clear of the band by hand (pen-layout.ts OFFD, pen-scenes.tsx)
{
  let hit = 0, blank = 0, labels = 0, would = 0, shots = 0, boxes = 0;
  for (const s of SHOTS) {
    const band = capBand(s.id);
    let any = false;
    for (let f = fr(s.t0); f < fr(s.t1); f++) {
      for (const b of blankBoxes(s.id, f)) { blank++; if (blank < 6) console.log(`FAIL a box has no label on frame ${f} of ${s.id}: y ${(b.y - 615 * b.k).toFixed(0)}-${b.y.toFixed(0)}`); }
      boxes += boxesOf(s.id, f).filter((b) => b.x + 328 * b.k > 0 && b.x - 328 * b.k < 1080).length;
      if (!captioned(s.id)) continue;
      for (const r of labelRects(s.id, f)) { labels++; if (r[3] > band[0] && r[1] < band[1]) { hit++; if (hit < 6) console.log(`FAIL a label is under the captions on frame ${f} of ${s.id}: y ${r[1].toFixed(0)}-${r[3].toFixed(0)}`); } }
      for (const r of labelRects(s.id, f, false)) if (r[3] > band[0] && r[1] < band[1]) { would++; any = true; }
    }
    if (any) shots++;
  }
  ok(hit === 0, `${hit} label frames under the captions`);
  ok(blank === 0 && boxes > 1000, `${blank} frames with a blank box in the frame (${boxes} box frames looked at)`);
  ok(would > 0 && shots >= 5, `the rule is not idle: left where they sit, labels would be under the captions in ${shots} shots`);
  ok(capBand("wideEnd")[0] > 260 && capBand("wideEnd")[1] < 520 && capBand("garageMed")[0] === CAP_BAND[0], "the last shot's captions are on the ceiling above the boxes and the bulb (out of Instagram's bottom 400 px), every other shot's in the usual band");
  console.log(`labels: ${labels} label frames in captioned shots, none under the captions (${shots} shots needed them moved), no box blank`);
}
// no black bar at a plate's edge: every view of a plate (768 x 1344) covers the whole frame, the garage ending's and the office's (src/pen-layout.ts) and every `view(...)` and `garage(...)` written in src/pen-scenes.tsx
{
  const covers = (s: number, u0: number, v0: number) => u0 >= -1e-6 && v0 >= -1e-6 && u0 + 1080 / s <= 768 + 1e-6 && v0 + 1920 / s <= 1344 + 1e-6;
  let bad3 = 0, n = 0;
  const views: [string, number, number, number][] = [
    ...Object.entries(ENDVIEW).map(([id, v]): [string, number, number, number] => [id, v!.s, v!.u0, v!.v0]), ...Object.entries(OFFD).map(([id, d]): [string, number, number, number] => [id, d!.m.s, d!.m.u0, d!.m.v0]),
  ];
  const src = ["pen-scenes.tsx"].map((n) => readFileSync(new URL(`../src/${n}`, import.meta.url), "utf8")).join("\n");
  for (const m of src.matchAll(/\bview\(([\d.]+), ([\d.-]+), ([\d.-]+)\)/g)) views.push([`view(${m[1]}, ${m[2]}, ${m[3]})`, +m[1], +m[2], +m[3]]);
  for (const m of src.matchAll(/[gG]arage\("\w+", \[[^\]]*\], [\d.]+, ([\d.]+), ([\d.-]+), ([\d.-]+)/g)) views.push([`garage(... ${m[1]}, ${m[2]}, ${m[3]})`, +m[1], +m[2], +m[3]]);
  for (const [name, s, u0, v0] of views) { n++; if (!covers(s, u0, v0)) { bad3++; console.log(`FAIL the view ${name} runs past its plate: u ${u0}-${(u0 + 1080 / s).toFixed(1)}, v ${v0}-${(v0 + 1920 / s).toFixed(1)}`); } }
  ok(bad3 === 0 && n > 20, `${n} views, ${bad3} run past their plate`);
}
// the contract lies on the desk from the shove (27) to the end of the signing (31): every frame of 28 and 29 has it, 27 from the shove on, and it is not there before
{
  const shot = (id: ShotId) => SHOTS.find((x) => x.id === id)!;
  const all = (id: ShotId, from = shot(id).t0) => { for (let f = fr(from); f < fr(shot(id).t1); f++) if (!contractOnDesk(f)) return false; return true; };
  ok(all("contract", T.contractPush) && all("denPockets") && all("readerUp") && all("cardTap") && all("signed"), "the contract is on the desk on every frame from the shove (27) to the end of the signing (31)");
  ok(!contractOnDesk(fr(T.contractPush) - 1) && !contractOnDesk(fr(T.s32)) && !contractOnDesk(fr(shot("penSlide").t0)), "it is not on the desk before the shove, nor after the signing");
}
// shot 30: the card comes in from the right edge of the frame (a hand off it holds it), is on the reader on the beep with its far end on the frame's edge, and goes back out; it is never still in the air
{
  const s30 = SHOTS.find((x) => x.id === "cardTap")!, a = fr(s30.t0), z = fr(s30.t1) - 1, tap = fr(T.tap30);
  let peak = 0, up = true, down = true;
  for (let f = a; f < tap; f++) if (cardAt(f + 1).p < cardAt(f).p) up = false;
  for (let f = tap + 3; f < z; f++) if (cardAt(f + 1).p > cardAt(f).p) down = false;
  for (let f = a; f <= z; f++) peak = Math.max(peak, cardAt(f).p);
  ok(cardAt(a).p === 0 && cardAt(z).p === 0 && cardAt(tap).p === 1 && Math.abs(peak - 1) < 1e-9 && up && down, `the card is off the frame on the first and last frames of shot 30, on the reader on the tap frame ${tap}, and moves in and out`);
  ok(cardAt(tap).press === 1 && cardAt(tap - 1).press === 0 && cardAt(tap + 0.0).p === 1 && cardAt(fr(T.tap30 + 0.07)).p > 0.99, "it presses on the beep and stays on the reader for 0.07 s");
  ok(CARD.tapX + CARD.w / 2 >= 1080 - 4 && CARD.offX - CARD.w / 2 >= 1080 && CARD.tapX - CARD.w / 2 < READER.x + READER.w / 2 - 100 && READER.x + READER.w / 2 < 1080 - 130 && READER.x - READER.w / 2 > 0, "the card's far end is on the frame's edge at the tap, and it is over the reader's top");
  ok(T.tap30 + 0.07 + 0.14 < s30.t1 - 0.05, `the card is out again ${(s30.t1 - (T.tap30 + 0.21)).toFixed(2)} s before the cut`);
}
// the fine print (shot 45, v2: Ross could not read it in 0.3 s): rhoWall 0.6 s, then the poster 2.3 s: a push of about 0.5 s from the yacht to the line, which stops dead on the sting's frame, then the line is held, centred
// and legible, for at least 1.8 s with only a slow 2 % push, in silence; her eyes about 0.5 s; the pen lands before her line
{
  const sh = (id: ShotId) => SHOTS.find((x) => x.id === id)!, p = sh("posterFine"), fin = fr(T.fineIn), end = fr(T.s46);
  ok(Math.abs(sh("rhoWall").t1 - sh("rhoWall").t0 - 0.6) < 0.05 && p.t1 - p.t0 >= 2.2 && p.t1 - p.t0 <= 2.4 && Math.abs(sh("denEyes").t1 - sh("denEyes").t0 - 0.5) < 0.06, `rhoWall ${(sh("rhoWall").t1 - sh("rhoWall").t0).toFixed(2)} s, the fine print ${(p.t1 - p.t0).toFixed(2)} s, her eyes ${(sh("denEyes").t1 - sh("denEyes").t0).toFixed(2)} s`);
  ok(T.fineIn - T.s45 >= 0.4 && T.fineIn - T.s45 <= 0.6 && T.s46 - T.fineIn >= 1.75, `a push of ${(T.fineIn - T.s45).toFixed(2)} s, then the line is held for ${(T.s46 - T.fineIn).toFixed(2)} s (at least 1.75)`);
  let soft = true;
  for (let f = fr(T.s45); f < fin; f++) if (fineP(f + 1) < fineP(f)) soft = false;
  ok(fineP(fr(T.s45)) === 0 && fineP(fin) === 1 && fineP(fin - 1) < 1 && fineP(fin) - fineP(fin - 1) < 0.15 && soft, "the camera starts on the yacht, comes to the line, and stops dead on the sting's frame (the last step is a soft one)");
  let still = true;
  for (let f = fin; f < end; f++) if (fineP(f) !== 1) still = false;
  const z0 = holdPush(fin), z1 = holdPush(end - 1);
  ok(still && holdPush(fin - 1) === 1 && z1 - z0 > 0.015 && z1 - z0 < 0.021, `in the hold the camera is at the line and only pushes ${((z1 - z0) * 100).toFixed(1)} % (a slow 2 %)`);
  ok(FINE.w >= 800 && FINE.w <= 960 && FINE.y === 960 && FINE.w * (1 + (z1 - 1)) <= 1000 && (14 * FINE.w) / (21 * 14 * 0.62) >= 60, `the line is ${FINE.w} px wide (letters of about ${Math.round((14 * FINE.w) / (21 * 14 * 0.62))} px) in the middle of the frame (y ${FINE.y}), clear of Instagram's bottom 400 px and its right 130`);
  const hit = HITS.find((h) => h.id === "fine")!, k = C.filter((c) => c.name === hit.sfx && Math.abs(c.at + PK[hit.sfx] - T.fineIn) < 0.5 / FPS);
  ok(!!hit && hit.t === T.fineIn && k.length === 1 && (k[0].len ?? 3) + k[0].at <= T.fineIn + 1.0 && (k[0].fade ?? 0) >= 0.3, "a sting lands on the frame the camera arrives, on its measured peak, and has died away well inside the hold");
  ok(C.filter((c) => c.at > T.fineIn - 0.5 && c.at < T.s46 && c !== k[0]).length === 0, "no other sound starts from the sting to the end of the hold: silence under the line");
  const l32 = LINES.find((l) => l.n === 32)!;
  ok(T.clatter < l32.first - 0.1 && T.clatter > T.s47 && T.s47 > T.s46, `the pen lands ${(l32.first - T.clatter).toFixed(2)} s before her line, in shot 47`);
}
// poses move on twos
let odd = 0;
for (let f = 0; f < FRAMES; f += 2) for (const g of [walk41P, walk41Step]) if (g(f) !== g(f + 1)) odd++;
ok(odd === 0 && twos(7) === 6 && twos(8) === 8, `${odd} walk values change on an odd frame`);
// the sounds: no music and no bed in v2 (the projector and the 1950s jazz went with the story); every cue is inside the picture
ok(!C.some((c) => c.name === "filmbed" || c.name === "penstory"), "no projector bed and no jazz: v2 has no story");
ok(C.every((c) => c.at >= 0 && c.at < T_END), "every cue is inside the picture");
// where a hit lands on a spoken word (the duck takes 8 dB off it): printed, not forbidden
const onWord = HITS.map((h) => ({ h, w: LINES.flatMap((l) => l.words.map((w) => ({ w, n: l.n }))).find((x) => h.t >= x.w.t - 0.01 && h.t <= x.w.e) })).filter((x) => x.w);
console.log("hits that land on a spoken word (ducked):", onWord.map((x) => `${x.h.id} on "${x.w!.w.d}" (line ${x.w!.n})`).join(", ") || "none");
console.log(`captions ${CAPS.length}, hits ${HITS.length}, cues ${C.length}, share "${SHARE}" ${T.share.toFixed(2)}-${T.end.toFixed(2)}`);
console.log("captions:", CAPS.map((c) => `${c.t0.toFixed(2)}-${c.t1.toFixed(2)} ${c.text}`).join(" | "));
console.log("bleep caption:", CAPS.filter((c) => c.text.includes("*")).map((c) => c.text).join(" | "));
console.log(bad ? `${bad} check(s) failed` : "all checks passed");
process.exit(bad ? 1 : 0);
