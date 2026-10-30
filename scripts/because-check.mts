// node scripts/because-check.mts  ->  prints the timeline of "Because" and checks it: length, which shot every line falls in, no cut inside a word, captions that keep every word inside one shot (a line
// that a cut splits is split in its caption on a word boundary), mouths shut outside speech, blinks away from the key frames, the order of the beats, every cue inside the picture, the share line long
// enough to read, and the shot rules (every shot <= 2.4 s except the last one, which runs under the share line; no two shots in a row with the same framing). Exits non-zero when a check fails.
import { BLINKS, CAPS, FPS, FRAMES, KEY_FRAMES, LINE, LINES, SHARE, SHOTS, STAGES, T, T_END, cues, hudAt, mouthAt, shotAt, speaking, type Char, type ShotId } from "../src/because-sched.ts";

let bad = 0;
const ok = (c: boolean, msg: string) => { if (!c) { bad++; console.log("FAIL", msg); } };
console.log(`total ${T_END.toFixed(2)} s, ${FRAMES} frames`);
SHOTS.forEach((s, i) => console.log(`shot ${String(i + 1).padStart(2)} ${s.id.padEnd(9)} ${s.t0.toFixed(2)}-${s.t1.toFixed(2)} (${(s.t1 - s.t0).toFixed(2)} s)`));

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
  denWide: "counter, wide, Denise in front", cash2: "counter, cashier, medium close", den3: "counter from behind, Denise, close", cash4: "counter, cashier, medium close", denTray: "counter from behind, Denise and the tray, medium",
  cash6: "counter, cashier, medium close", den7: "counter from behind, Denise, close", cash8: "counter, cashier, medium close", den9: "counter from behind, Denise, close", cash10: "counter, cashier, medium close",
  den11: "counter from behind, Denise, close", cash12: "counter, cashier, medium close", den13: "counter from behind, Denise, close", cashLook: "counter, cashier, medium close", cashPush: "counter, cashier, close",
  den15: "counter from behind, Denise, close", screen: "screen, insert", swap: "counter, two-shot, medium", backDen: "counter from behind, two-shot, medium", rhonda: "counter from behind, Rhonda, medium close",
  denSay: "counter, Denise in the hat, medium close", denEyes: "counter, Denise in the hat, extreme close", denSwear: "counter, Denise in the hat, medium", wideEnd: "counter, wide, Denise behind it",
};
// the rules must reject a cut list that breaks them, or they check nothing
ok(shotRules([{ id: "a", t0: 0, t1: 2, framing: "x" }, { id: "b", t0: 2, t1: 4, framing: "x" }]).some((m) => m.includes("same framing")), "the framing rule does not reject two equal framings in a row");
ok(shotRules([{ id: "a", t0: 0, t1: 2.5, framing: "x" }, { id: "b", t0: 2.5, t1: 4, framing: "y" }]).some((m) => m.includes("limit")), "the length rule does not reject a 2.5 s shot");
ok(shotRules([{ id: "a", t0: 0, t1: 2.4, framing: "x" }, { id: "b", t0: 2.4, t1: 4, framing: "y" }, { id: "c", t0: 4, t1: 9, framing: "z" }]).length === 0, "the length rule: the last shot may run any length, any other shot 2.4 s");
shotRules(SHOTS.map((s) => ({ ...s, framing: FRAMING[s.id] }))).forEach((m) => ok(false, m));
ok(SHOTS.every((s, i) => (i === 0 ? s.t0 === 0 : s.t0 === SHOTS[i - 1].t1)) && SHOTS[SHOTS.length - 1].t1 === T_END, `the ${SHOTS.length} shots tile the reel from 0 to the end`);

// the shot every line belongs to (the franchise line runs across the cut that falls in its pause)
const WHERE: Record<number, ShotId[]> = { 1: ["denWide"], 2: ["cash2"], 3: ["den3"], 4: ["cash4"], 5: ["denTray"], 6: ["cash6"], 7: ["den7"], 8: ["cash8"], 9: ["den9"], 10: ["cash10"], 11: ["den11"], 12: ["cash12"], 13: ["den13"], 14: ["cashLook", "cashPush"], 15: ["den15"], 16: ["rhonda"], 17: ["denSay"], 18: ["denSwear"] };
const CROSS = new Set([14]);
LINES.forEach((l) => {
  const a = shotAt(Math.round((l.first + 0.02) * FPS)), b = shotAt(Math.round((l.end - 0.02) * FPS));
  console.log(`line ${String(l.n).padStart(2)} ${l.who.padEnd(8)} first ${l.first.toFixed(2)} words ${l.start.toFixed(2)}-${l.end.toFixed(2)} voice to ${l.tend.toFixed(2)} s in ${a.id}${a.id === b.id ? "" : " > " + b.id}  "${l.text}"`);
  ok(WHERE[l.n].includes(a.id) && WHERE[l.n].includes(b.id), `line ${l.n} should be in ${WHERE[l.n].join("/")}, is in ${a.id}${a.id === b.id ? "" : " > " + b.id}`);
  ok(a.id === b.id || CROSS.has(l.n), `line ${l.n} is cut in two by a shot change`);
});
// no cut inside a word, and no cut inside the take's sound (the pause between sentences or words is the only place a line may be cut)
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
// the line that a cut splits is split in its caption at the cut, on a word boundary
const c14 = CAPS.filter((c) => c.n === 14);
ok(c14.length >= 2 && c14.some((c) => shotOf(c.w0 + 0.02) === shotOf(T.s14b - 0.1)) && c14.some((c) => shotOf(c.w0 + 0.02) === shotOf(T.s14b + 0.1)), "the franchise line's caption is split at the cut");
// a caption's words are the line's words, in order, and the bleeped word shows as F***ing
for (const l of LINES) {
  const said = CAPS.filter((c) => c.n === l.n).map((c) => c.text).join(" ").replace(/\./g, "").replace(/\?/g, "").toLowerCase();
  const want = l.words.map((w) => (w.bleep ? "f***ing" : w.d)).join(" ").replace(/\./g, "").replace(/\?/g, "").toLowerCase();
  ok(said === want, `the captions of line ${l.n} read "${said}", the line is "${want}"`);
}
ok(T_END >= 26 && T_END <= 33, `length 26-33 s (${T_END.toFixed(2)})`);
for (let i = 1; i < LINES.length; i++) ok(LINES[i].first >= LINES[i - 1].end - 0.001, `line ${LINES[i].n} starts before line ${LINES[i - 1].n} ends`);
// mouths closed whenever the character does not speak
const chars: Char[] = ["deniseHood", "cashier", "rhonda"];
let open = 0;
for (let f = 0; f < FRAMES; f++) for (const c of chars) if (!speaking(c, f) && mouthAt(c, f) !== "closed") open++;
ok(open === 0, `${open} frames with an open mouth outside speech`);
// blinks away from the key frames (for whoever is on screen there)
const SEEN: Record<ShotId, Char[]> = {
  denWide: ["deniseHood", "cashier"], cash2: ["cashier"], den3: ["deniseHood"], cash4: ["cashier"], denTray: ["deniseHood"], cash6: ["cashier"], den7: ["deniseHood"], cash8: ["cashier"], den9: ["deniseHood"], cash10: ["cashier"],
  den11: ["deniseHood"], cash12: ["cashier"], den13: ["deniseHood"], cashLook: ["cashier"], cashPush: ["cashier"], den15: ["deniseHood"], screen: [], swap: ["deniseHood", "cashier"], backDen: ["deniseHood", "rhonda"],
  rhonda: ["rhonda"], denSay: ["deniseHood"], denEyes: ["deniseHood"], denSwear: ["deniseHood"], wideEnd: ["deniseHood", "rhonda"],
};
for (const k of KEY_FRAMES) for (const c of SEEN[shotAt(k.f).id]) ok(!BLINKS[c].some((s) => k.f >= s - 1 && k.f <= s + 3), `${c} blinks at key frame "${k.label}" (${k.f})`);
ok(SHOTS.every((s) => KEY_FRAMES.some((k) => shotAt(k.f).id === s.id)), "every shot has a key frame");
// the order of the beats
const order: [string, number][] = [["s2", T.s2], ["s3", T.s3], ["flip3", T.flip[0]], ["tray", T.tray], ["s4", T.s4], ["s5", T.s5], ["slam", T.slam], ["s6", T.s6], ["s7", T.s7], ["flip7", T.flip[2]], ["pies", T.pies], ["s8", T.s8], ["s9", T.s9], ["s10", T.s10], ["s11", T.s11], ["s12", T.s12], ["s13", T.s13], ["flip13", T.flip[5]], ["s14", T.s14], ["lookUp", T.lookUp], ["s14b", T.s14b], ["s15", T.s15], ["s16", T.s16], ["roll", T.roll], ["lock", T.lock], ["s17", T.s17], ["hatOff", T.hatOff], ["hatLand", T.hatLand], ["hsOff", T.hsOff], ["hsLand", T.hsLand], ["walk1", T.walk1], ["doorShut", T.doorShut], ["s18", T.s18], ["s19", T.s19], ["s20", T.s20], ["s21", T.s21], ["eyes", T.eyes], ["s22", T.s22], ["share", T.share], ["end", T.end]];
for (let i = 1; i < order.length; i++) ok(order[i][1] > order[i - 1][1], `${order[i][0]} (${order[i][1].toFixed(2)}) is not after ${order[i - 1][0]} (${order[i - 1][1].toFixed(2)})`);
ok(T.walk0 < T.doorOpen && T.doorOpen < T.walk1 && T.walk1 < T.doorShut, "he walks, the door opens as he reaches it, he is through, the door shuts");
ok(T.end - T.share >= 2.4, "the share line stays 2.4 s or more");
// what the shots must show for long enough
const TS = (t: number) => shotAt(Math.round(t * FPS)).id;
const FLIP_SHOT: ShotId[] = ["den3", "denTray", "den7", "den9", "den11", "den13"];
T.flip.forEach((t, i) => ok(TS(t) === FLIP_SHOT[i] && TS(t + 0.2) === FLIP_SHOT[i], `the total flips (${t.toFixed(2)}) and finishes inside ${FLIP_SHOT[i]}, in ${TS(t)} / ${TS(t + 0.2)}`));
// the corner total: stage by stage, from the first ask to the last "Sure."; none in the insert and after
const stageAt = (t: number) => hudAt(Math.round(t * FPS));
ok(!stageAt(0.1).show && stageAt(T.s2 + 0.4).show && stageAt(T.s2 + 0.4).stage === 0, "the total pops in with the first ask at stage 0 ($3.49)");
T.flip.forEach((t, i) => ok(stageAt(t + 0.25).stage === i + 1 && stageAt(t + 0.25).k >= 1, `after flip ${i + 1} the total is at stage ${i + 1}, flip done`));
ok(STAGES.join(" ") === "$3.49 $6.49 $7.29 $9.29 $10.00 $14.99 $14.99", `the stages read ${STAGES.join(" ")}`);
ok(!stageAt(T.s16 + 0.2).show, "no total in the corner during the insert");
ok(TS(T.slam) === "denTray" && T.s6 - T.slam >= 0.5 && LINE(5).first - T.slam >= 0.25, `the cup lands in shot 5, and "Sure." follows ${(LINE(5).first - T.slam).toFixed(2)} s later`);
ok(TS(T.tray) === "den3" && TS(T.pies) === "den7", "the tray pops in during the first Sure., the pies during the third");
ok(TS(T.lookUp) === "cashLook" && LINE(14).first - T.lookUp >= 0.15 && T.lookUp - T.s14 >= 0.15, `he looks up ${(LINE(14).first - T.lookUp).toFixed(2)} s before the franchise line, after ${(T.lookUp - T.s14).toFixed(2)} s of looking down`);
ok(TS(T.roll) === "screen" && TS(T.lock) === "screen" && T.s17 - T.lock >= 0.4, `the screen locks on $2,000,014.99 and holds ${(T.s17 - T.lock).toFixed(2)} s (the least is 0.4 s)`);
ok(TS(T.hatLand) === "swap" && TS(T.hsLand) === "swap" && TS(T.doorShut) === "swap" && T.s18 - T.doorShut >= 0.15, "the hat, the headset and the door are all inside the swap shot");
ok(T.s19 - T.s18 >= 0.8, `Denise in the hat is on screen for ${(T.s19 - T.s18).toFixed(2)} s before Rhonda speaks (the least is 0.8 s)`);
ok(T.eyes - T.s21 >= 0.1 && T.s22 - T.eyes >= 0.4, `her eyes widen ${(T.s22 - T.eyes).toFixed(2)} s before the swear (the least is 0.4 s)`);
ok(TS(LINE(18).words[1].t) === "denSwear", "the swear is in the close shot");
ok(TS(T.share + 0.1) === "wideEnd" && T.end - T.share >= 2.5 - 1e-6, "the last shot has the share line's 2.5 s");
const C = cues();
ok(C.every((c) => c.at >= 0 && c.at < T_END), "every cue is inside the picture");
console.log(`captions ${CAPS.length}, cues ${C.length}, share "${SHARE}" ${T.share.toFixed(2)}-${T.end.toFixed(2)}`);
console.log("captions:", CAPS.map((c) => `${c.t0.toFixed(2)}-${c.t1.toFixed(2)} ${c.text}`).join(" | "));
console.log("bleep caption:", CAPS.filter((c) => c.text.includes("*")).map((c) => c.text).join(" | "));
console.log(bad ? `${bad} check(s) failed` : "all checks passed");
process.exit(bad ? 1 : 0);
