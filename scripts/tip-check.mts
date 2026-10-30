// node scripts/tip-check.mts  ->  prints the timeline of "Tip?" and checks it: length, which shot every line falls in, no cut inside a word, captions that keep every word inside one shot, mouths shut
// outside speech, blinks away from the key frames, the order of the beats, every cue inside the picture, the share line long enough to read, and the shot rules (every shot <= 2.4 s, no two
// shots in a row with the same framing; the rule fails on v1's cut list below). Exits non-zero when a check fails.
import { BLINKS, CAPS, FPS, FRAMES, KEY_FRAMES, LINE, LINES, QUEUE, SHARE, SHOTS, T, T_END, cues, mouthAt, shotAt, speaking, type Char, type ShotId } from "../src/tip-sched.ts";

let bad = 0;
const ok = (c: boolean, msg: string) => { if (!c) { bad++; console.log("FAIL", msg); } };
console.log(`total ${T_END.toFixed(2)} s, ${FRAMES} frames`);
SHOTS.forEach((s, i) => console.log(`shot ${String(i + 1).padStart(2)} ${s.id.padEnd(9)} ${s.t0.toFixed(2)}-${s.t1.toFixed(2)} (${(s.t1 - s.t0).toFixed(2)} s)`));

// ── the shot rules. Every shot runs 2.4 s at most, except the hook (the first shot) and its callback (2.8 s) and the last shot, which runs under the share line. No two shots in a row have
// the same framing: a framing is the set, the subject and the size of the shot (the label, below), so that two ids that share one camera (v1's street and stand) count as one.
type Cut = { id: string; t0: number; t1: number; framing: string };
const MAX = 2.4, MAX_HOOK = 2.8;
function shotRules(shots: Cut[]): string[] {
  const out: string[] = [];
  shots.forEach((s, i) => {
    const d = s.t1 - s.t0, max = i === 0 || s.id === "callback" ? MAX_HOOK : MAX;
    if (i < shots.length - 1 && d > max + 1e-6) out.push(`shot ${i + 1} (${s.id}) runs ${d.toFixed(2)} s, the limit is ${max} s`);
    if (i && shots[i - 1].framing === s.framing) out.push(`shots ${i} and ${i + 1} (${shots[i - 1].id}, ${s.id}) have the same framing: ${s.framing}`);
  });
  return out;
}
const FRAMING: Record<ShotId, string> = {
  close: "store counter, close over the terminal", reverse: "fridges, Denise, medium", insert: "terminal screen, insert", store: "store, wide", kyleMc: "store, Kyle, medium close",
  scanWide: "hall, wide", kioskTap: "kiosk screen, insert", kiosk: "hall, kiosk, medium", aisle: "hall, wide and tight", two: "hall, kiosk, two-shot", denKiosk: "hall, Denise, close", attMc: "hall, attendant, close",
  kioskTap2: "kiosk screen, insert", attSag: "hall, attendant, close", callback: "cafe counter, close over the terminal", kyleCafe: "cafe door, Kyle, medium close", insertNo: "terminal screen, insert",
  denCafe: "cafe counter, Denise, medium close", cafeWide: "cafe, wide", denClose: "cafe counter, Denise, close", denJar: "cafe counter, Denise and the jar, medium",
};
// v1's cut list (out/tip-v1.mp4, commit 7d65585): the rules must reject it, or they check nothing
const V1: Cut[] = ([["close", 0, 2.77, "store counter, close over the terminal"], ["reverse", 2.77, 5, "fridges, Denise, medium"], ["insert", 5, 7.33, "terminal screen, insert"], ["store", 7.33, 11.83, "store, wide"], ["scan", 11.83, 15.13, "hall, wide"], ["kiosk", 15.13, 17.17, "hall, kiosk, medium"], ["aisle", 17.17, 19.77, "hall, wide"], ["two", 19.77, 26.93, "hall, kiosk, two-shot"], ["atm", 26.93, 33.53, "atm, Denise, medium"], ["street", 33.53, 34.07, "street, wide"], ["stand", 34.07, 37.33, "street, wide"], ["reader", 37.33, 37.97, "reader, insert"], ["stand", 37.97, 41.57, "street, wide"]] as [string, number, number, string][]).map(([id, t0, t1, framing]) => ({ id, t0, t1, framing }));
const v1Fails = shotRules(V1);
ok(v1Fails.filter((m) => m.includes("runs")).length >= 6 && v1Fails.some((m) => m.includes("same framing")), `the shot rules find ${v1Fails.length} things in v1's cut list (store, scan, aisle, two, atm and the first stand are too long, street and stand are one framing)`);
ok(shotRules([{ id: "a", t0: 0, t1: 2, framing: "x" }, { id: "b", t0: 2, t1: 4, framing: "x" }]).some((m) => m.includes("same framing")), "the framing rule does not reject two equal framings in a row");
ok(shotRules([{ id: "a", t0: 0, t1: 2.7, framing: "x" }, { id: "b", t0: 2.7, t1: 5.1, framing: "y" }, { id: "c", t0: 5.1, t1: 7.5, framing: "z" }, { id: "d", t0: 7.5, t1: 12, framing: "w" }]).length === 0 && shotRules([{ id: "a", t0: 0, t1: 2, framing: "x" }, { id: "b", t0: 2, t1: 5, framing: "y" }, { id: "c", t0: 5, t1: 9, framing: "z" }]).length === 1, "the length rule: the hook may run 2.8 s, the last shot any length, any other shot 2.4 s");
shotRules(SHOTS.map((s) => ({ ...s, framing: FRAMING[s.id] }))).forEach((m) => ok(false, m));
ok(SHOTS.length === 21 && SHOTS.every((s, i) => i === 0 ? s.t0 === 0 : s.t0 === SHOTS[i - 1].t1) && SHOTS[SHOTS.length - 1].t1 === T_END, "the 21 shots tile the reel from 0 to the end");
console.log(`v1's cut list: ${v1Fails.length} findings (${v1Fails.slice(0, 2).join("; ")} ...)`);

// the shot every line belongs to (the machine's line runs across the cut that falls in its pause)
const WHERE: Record<number, ShotId[]> = { 1: ["close"], 2: ["reverse"], 3: ["insert"], 5: ["kyleMc"], 16: ["kiosk", "aisle"], 17: ["two"], 9: ["denKiosk"], 10: ["attMc"], 18: ["callback"], 19: ["kyleCafe"], 20: ["denCafe"], 21: ["denClose"] };
const CROSS = new Set([16]);
LINES.forEach((l) => {
  const a = shotAt(Math.round((l.first + 0.02) * FPS)), b = shotAt(Math.round((l.end - 0.02) * FPS));
  console.log(`line ${String(l.n).padStart(2)} ${l.who.padEnd(9)} first ${l.first.toFixed(2)} words ${l.start.toFixed(2)}-${l.end.toFixed(2)} voice to ${l.tend.toFixed(2)} s in ${a.id}${a.id === b.id ? "" : " > " + b.id}  "${l.text}"`);
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
// a caption's words are the line's words, in order, and the bleeped word shows as a**hole
for (const l of LINES) {
  const said = CAPS.filter((c) => c.n === l.n).map((c) => c.text).join(" ").replace(/\./g, "").replace(/\?/g, "").toLowerCase();
  const want = l.words.map((w) => (w.bleep ? "a**hole" : w.d)).join(" ").replace(/\./g, "").replace(/\?/g, "").toLowerCase();
  ok(said === want, `the captions of line ${l.n} read "${said}", the line is "${want}"`);
}
ok(T_END >= 35 && T_END <= 39, "length 35-39 s");
for (let i = 1; i < LINES.length; i++) ok(LINES[i].first >= LINES[i - 1].end - 0.001, `line ${LINES[i].n} starts before line ${LINES[i - 1].n} ends`);
// mouths closed whenever the character does not speak (the line's gasp excepted)
const chars: Char[] = ["deniseHood", "kyle", "kyleJ", "attendant", ...QUEUE];
let open = 0;
for (let f = 0; f < FRAMES; f++) for (const c of chars) if (!speaking(c, f) && mouthAt(c, f) !== "closed" && !(QUEUE.includes(c) && mouthAt(c, f) === "o")) open++;
ok(open === 0, `${open} frames with an open mouth outside speech`);
// the line gapes only from the buzzer on (each one 2 frames after the one before), for under a second
for (let f = 0; f < FRAMES; f++) for (const c of QUEUE) if (mouthAt(c, f) === "o") ok(f / FPS >= T.heads - 1e-6 && f / FPS < T.heads + 1.0, `${c} gapes at frame ${f}, outside the gasp`);
// blinks away from the key frames (for whoever is on screen there)
const SEEN: Record<ShotId, Char[]> = {
  close: ["deniseHood", "kyle"], reverse: ["deniseHood"], insert: [], store: ["deniseHood", "kyle", ...QUEUE], kyleMc: ["kyle"], scanWide: ["deniseHood"], kioskTap: [], kiosk: ["deniseHood"], aisle: ["deniseHood", "attendant"],
  two: ["deniseHood", "attendant"], denKiosk: ["deniseHood"], attMc: ["attendant"], kioskTap2: [], attSag: ["attendant"], callback: ["deniseHood", "kyleJ"], kyleCafe: ["kyleJ"], insertNo: [],
  denCafe: ["deniseHood"], cafeWide: ["deniseHood", "kyleJ"], denClose: ["deniseHood"], denJar: ["deniseHood"],
};
for (const k of KEY_FRAMES) for (const c of SEEN[shotAt(k.f).id]) ok(!BLINKS[c].some((s) => k.f >= s - 1 && k.f <= s + 3), `${c} blinks at key frame "${k.label}" (${k.f})`);
ok(SHOTS.every((s) => KEY_FRAMES.some((k) => shotAt(k.f).id === s.id)), "every shot has a key frame");
// the order of the beats
const order: [string, number][] = [["tapNo", T.tapNo], ["s4", T.s4], ["heads", T.heads], ["takeWater", T.takeWater], ["s5", T.s5], ["s6", T.s6], ["beep", T.beep], ["s7", T.s7], ["tap1", T.tap1], ["s8", T.s8], ["s9", T.s9], ["s10", T.s10], ["s11", T.s11], ["s12", T.s12], ["thumb", T.thumb], ["s13", T.s13], ["tap2", T.tap2], ["s14", T.s14], ["swing", T.swing], ["s16", T.s16], ["s17", T.s17], ["tapK", T.tapK], ["s18", T.s18], ["s19", T.s19], ["doorOpen", T.doorOpen], ["doorShut", T.doorShut], ["s20", T.s20], ["share", T.share], ["end", T.end]];
for (let i = 1; i < order.length; i++) ok(order[i][1] > order[i - 1][1], `${order[i][0]} (${order[i][1].toFixed(2)}) is not after ${order[i - 1][0]} (${order[i - 1][1].toFixed(2)})`);
ok(T.s2 < T.s3 && T.s3 < T.tapNo, "the reverse, the insert and the tap come in this order");
ok(T.end - T.share >= 2.4, "the share line stays 2.4 s or more");
ok(T.heads - T.tapNo >= 0.4, "the heads snap after the cut to the wide");
// what the shots must show for long enough: the tap and BAD TIP, the gasp and her water, the stare, the thumb with its line, the second tap and the sag, the door, the smile that drops
const TS = (t: number) => shotAt(Math.round(t * FPS)).id;
ok(TS(T.tapNo) === "insert" && T.s4 - T.tapNo >= 0.3, `the first tap and BAD TIP are in the insert (${(T.s4 - T.tapNo).toFixed(2)} s of red)`);
ok(TS(T.heads + 0.1) === "store" && T.s5 - T.takeWater >= 0.4 && TS(T.takeWater + 0.1) === "store", `the gasp and her water are in the wide (${(T.s5 - T.takeWater).toFixed(2)} s after she takes it)`);
ok(TS(T.beep) === "scanWide", "the scanner's beep is inside the short wide");
ok(TS(T.tap1) === "kioskTap" && T.s8 - T.tap1 >= 0.3, "the first kiosk tap is in its insert, with its flash");
ok(T.s12 - LINE(9).end >= 0.6 && TS(LINE(9).end + 0.3) === "denKiosk", "the camera holds on her stare after \"For who?\"");
ok(TS(T.thumb) === "attMc" && TS(LINE(10).tend - 0.02) === "attMc", "the thumb and \"...Me, I guess.\" are in one shot");
ok(TS(T.tap2) === "kioskTap2" && T.s14 - T.tap2 >= 0.3, "her second tap is in the insert");
ok(TS(T.s14 + 0.3) === "attSag" && T.swing - T.s14 >= 0.8, `the sag has ${(T.swing - T.s14).toFixed(2)} s, the least is 0.8 s`);
ok(TS(T.swing + 0.05) === "callback" && LINE(18).first - T.swing >= 0.45, "the callback swings in on its cut, the line starts 0.5 s into it, as in shot 1");
ok(TS(T.tapK) === "insertNo" && T.s18 - T.tapK >= 0.5, `his tap is in the insert and BAD TIP stays up ${(T.s18 - T.tapK).toFixed(2)} s, the least is 0.5 s`);
ok(TS(T.doorOpen) === "cafeWide" && T.s20 - (T.doorShut + 0.3) >= 0.05, "the door opens and shuts inside the wide");
ok(T.s20 + 0.12 < LINE(21).first && TS(LINE(21).words[3].t + 0.05) === "denClose", "the smile has 0.12 s to drop before she speaks, and the bleep is in the close-up");
ok(TS(T.share + 0.1) === "denJar" && T.end - T.share >= 2.5 - 1e-6, "the last shot has the share line's 2.5 s");
const C = cues();
ok(C.every((c) => c.at >= 0 && c.at < T_END), "every cue is inside the picture");
console.log(`captions ${CAPS.length}, cues ${C.length}, share "${SHARE}" ${T.share.toFixed(2)}-${T.end.toFixed(2)}`);
console.log("captions:", CAPS.map((c) => `${c.t0.toFixed(2)}-${c.t1.toFixed(2)} ${c.text}`).join(" | "));
console.log("bleep caption:", CAPS.filter((c) => c.text.includes("*")).map((c) => c.text).join(" | "));
console.log(bad ? `${bad} check(s) failed` : "all checks passed");
process.exit(bad ? 1 : 0);
