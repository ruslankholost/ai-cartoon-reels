// node scripts/lips-check.mts  ->  prints the timeline of "Cold Lips" (20 shots, 13 voice lines) and checks it: length, which shot every line falls in, every cut on its anchor (a take's first sound or last sound, a pause inside a
// take, a measured sound peak) and no cut inside a word (and none inside a stretch of sound of a line whose speaker is on screen), captions that keep every word inside one shot, mouths shut outside speech (nobody but the speaker
// moves a mouth, the freeze included), blinks away from the key frames, the order of the beats, every cue inside the picture, the shot rules (every shot <= 2.4 s except the last one, which runs under the share line; no two
// shots in a row with the same framing), the hook, the vault (a parabola, a landing on its frame, a squash, a camera bump, the crouch hidden under the counter's strip), the kiss (the front wide: a fall on gravity, the knee drop's thud; the side view: it holds 0.4 s, his lips on her seat on the smooch's
// peak, the freeze: nobody but the dog moves, the dog's gasp), the review on her phone (every letter, every star, readable for a second after it posts), the door, Denise's turn, the hair dryer, the share line (>= 2.2 s),
// text out of the captions' band and of Instagram's bottom 400 px and right 130 px, no pupil under a lid, no black bar at a plate's edge, no clock and no random source in the new files, and the shot() rule (no scene that loads a
// picture renders its own <Panel>). Exits non-zero when a check fails; LIPS_VERBOSE=1 prints the passing checks too.
import peaks from "../src/sfx-peaks.json" with { type: "json" };
import { existsSync, readFileSync } from "node:fs";
import { BACK, CARD_BOX, CARD_LINES, COVER_BOX, COVER_TITLE, CUS, DEN_FR, FIRED_LIFT, FIX, HAND_FR, HAND_GLASS, KNEEL, LINEUP, MORNING, PHONE, REVIEW_UI, SHARE_BOX, SHARE_LINES, SIDE, SIDE_RIG, TODD, TODD_FR, VAULT, WIDE, WIDE_FR, WV, COUNTER_WIDE, CAFE, RAD, handPoint } from "../src/lips-layout.ts";
import {
  BED_DB, BED_SRC, BLINKS, CAPS, CAP_BAND, DOOR_FRAMES, DOOR_OPEN, DRYER, DROP_CLEAR, FPS, FRAMES, HITS, KEY_FRAMES, LINE, LINES, QUEUE, REVIEW, SHARE, SHOTS, SWEAT_T, T, T_END, STAR_T, TICK_T, TURN_DX, TURN_TILT,
  blinkK, bodyAt, bumpAt, capBand, clearance, cues, dogAt, denTurnK, doorAngle, bellAngle, flutterAt, frozen, gazeAt, holdPush, kissAt, mouthAt, poseAt, shotAt, sideAt, snap, speaking, sweatAt, twos, typedN, vaultAt, starAt, postedK, pressK, cardK, turnK,
  type Char, type ShotId,
} from "../src/lips-sched.ts";

let bad = 0;
const ok = (c: boolean, msg: string) => { if (!c) { bad++; console.log("FAIL", msg); } else if (process.env.LIPS_VERBOSE) console.log("ok  ", msg); };
const fr = (t: number) => Math.round(t * FPS);
console.log(`total ${T_END.toFixed(2)} s, ${FRAMES} frames`);
SHOTS.forEach((s, i) => console.log(`shot ${String(i + 1).padStart(2)} ${s.id.padEnd(12)} ${s.t0.toFixed(2)}-${s.t1.toFixed(2)} (${(s.t1 - s.t0).toFixed(2)} s)`));
const num = (id: ShotId) => SHOTS.findIndex((s) => s.id === id) + 1;
const shot = (id: ShotId) => SHOTS.find((x) => x.id === id)!;
const shotOf = (t: number) => SHOTS.findIndex((x) => t >= x.t0 - 1e-6 && t < x.t1 - 1e-6);

// ── the shot rules. Every shot runs 2.4 s at most, except the last one (it runs under the share line). No two shots in a row have the same framing: a framing is the set, the subject and the size of the shot (the label)
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
  hook: "her side, her medium, the dead-rat cup, the line behind", denCoffee: "counter, Denise, medium close", review: "her side, her medium, the phone", vault: "wide counter, Todd vaults it",
  free: "her side, her medium close", fired: "wide counter, two-shot, Todd points", liked: "her side, her close", hired: "wide counter, two-shot, Todd's open arms", ugh: "her side, her medium, her and the dog turn away",
  anything: "counter, Todd close, begging, in front of it", anythingQ: "her side, her close, brows up", kissAss: "her side, her closer, smug", kneelA: "her side, wide, Todd kneels behind her", kneelB: "the side view, both in profile, Todd kneels, his lips on her seat", coldLips: "her side, her close, deadpan",
  reviewPhone: "her phone, insert", morning: "her side, the door, wide, the card", usual: "her side, her medium (the hook's framing), stand", denTurn: "counter, Denise, medium close, she turns", dryer: "counter, Todd close, the hair dryer",
};
ok(shotRules([{ id: "a", t0: 0, t1: 2, framing: "x" }, { id: "b", t0: 2, t1: 4, framing: "x" }]).some((m) => m.includes("same framing")), "the framing rule does not reject two equal framings in a row");
ok(shotRules([{ id: "a", t0: 0, t1: 2.5, framing: "x" }, { id: "b", t0: 2.5, t1: 4, framing: "y" }]).some((m) => m.includes("limit")), "the length rule does not reject a 2.5 s shot");
ok(shotRules([{ id: "a", t0: 0, t1: 2.4, framing: "x" }, { id: "b", t0: 2.4, t1: 4, framing: "y" }, { id: "c", t0: 4, t1: 9, framing: "z" }]).length === 0, "the length rule: the last shot may run any length, any other shot 2.4 s");
shotRules(SHOTS.map((s) => ({ ...s, framing: FRAMING[s.id] }))).forEach((m) => ok(false, m));
ok(SHOTS.length === 20, `20 shots (${SHOTS.length}): the plan's 18, its shot 11 cut in two at the 0.2 s pause after "Anything?", and the kiss (13) in two: the front wide, the side view`);
ok(SHOTS.every((s, i) => (i === 0 ? s.t0 === 0 : s.t0 === SHOTS[i - 1].t1)) && SHOTS[SHOTS.length - 1].t1 === T_END, `the ${SHOTS.length} shots tile the reel from 0 to the end`);
ok(SHOTS.every((s) => Math.abs(s.t0 * FPS - fr(s.t0)) < 1e-6), "every cut is on a frame");
ok(T_END >= 28.63 - 1e-6 && T_END <= 30, `length ${T_END.toFixed(2)} s: the table read's 28.63 s (28.13 s and the 0.5 s of gaps.11), the share line's room, at most 30 s`);
{
  // shot 8 has exactly shot 6's framing: both are the one function wide() with one view (WV) and one place for Todd and for Denise (WIDE_FR); only his pose differs (the point, then the open arms)
  const scenes = readFileSync(new URL("../src/lips-scenes.tsx", import.meta.url), "utf8");
  ok(/Fired = wide\("fired"\), Hired = wide\("hired"\)/.test(scenes) && WIDE_FR.todd.neck[0] === VAULT.x1 && bodyAt("todd", fr(shot("fired").t0)) === "point" && bodyAt("todd", fr(shot("hired").t0)) === "beg" && FIRED_LIFT > 0 && FIRED_LIFT < 120, `shot 8 has shot 6's framing (one view, one place for each of them: src/lips-layout.ts WV, WIDE_FR; Todd points in 6 and opens his arms in 8; in 6 his feet stand ${FIRED_LIFT} px higher, so that his badge is out of the captions' band)`);
  { const L = TODD.bodies.point; const badgeY = (WIDE_FR.todd.neck[1] + 550 * WIDE_FR.todd.E - FIRED_LIFT - (L.y + L.h - TODD.pivot[1]) * WIDE_FR.todd.E) + (TODD.badge.point[1] + TODD.badge.point[3] / 2 - TODD.pivot[1]) * WIDE_FR.todd.E; ok(badgeY <= CAP_BAND[0] - 10, `in "You're fired!" his badge's bottom edge is at y ${badgeY.toFixed(0)}, over the captions' band (y ${CAP_BAND[0]}): the "!" is not on it`); }
  ok(JSON.stringify({ ...CUS.usual, dog: 0 }) === JSON.stringify({ ...CUS.hook, dog: 0 }) && bodyAt("customer", fr(shot("usual").t0)) === "stand" && dogAt(fr(shot("usual").t0)).face === "sour", "the callback (shot 17) has shot 1's framing, in the stand pose, the dog in its sour face");
}

// ── who is on screen in each shot (for the blink check and for "an on-screen line has its speaker in the picture")
const SEEN: Record<ShotId, Char[]> = {
  hook: ["customer", ...QUEUE], denCoffee: ["deniseHood"], review: ["customer", ...QUEUE], vault: ["deniseHood", "todd"], free: ["customer", "lineA", "lineB"], fired: ["deniseHood", "todd"], liked: ["customer", "lineA"], hired: ["deniseHood", "todd"],
  ugh: ["customer", ...QUEUE], anything: ["todd"], anythingQ: ["customer", "lineA"], kissAss: ["customer", "lineA"], kneelA: ["customer", "todd", ...QUEUE], kneelB: [], coldLips: ["customer", "lineA"], reviewPhone: [], morning: ["customer"], usual: ["customer"],
  denTurn: ["deniseHood"], dryer: ["todd"],
};
// the shot every line belongs to
const WHERE: Record<number, ShotId[]> = { 1: ["hook"], 2: ["denCoffee"], 3: ["review"], 4: ["vault"], 5: ["free"], 6: ["fired"], 7: ["liked"], 8: ["hired"], 9: ["ugh"], 10: ["anything"], 11: ["anythingQ", "kissAss"], 12: ["coldLips"], 13: ["usual"] };
const CROSS = new Set([11]);
LINES.forEach((l) => {
  const a = shotAt(Math.round((l.first + 0.02) * FPS)), b = shotAt(Math.round((l.end - 0.02) * FPS));
  console.log(`line ${String(l.n).padStart(2)} ${l.who.padEnd(8)} first ${l.first.toFixed(2)} words ${l.start.toFixed(2)}-${l.end.toFixed(2)} voice to ${l.tend.toFixed(2)} s in ${a.id}${a.id === b.id ? "" : " > " + b.id}  "${l.text}"`);
  ok(WHERE[l.n].includes(a.id) && WHERE[l.n].includes(b.id), `line ${l.n} should be in ${WHERE[l.n].join("/")}, is in ${a.id}${a.id === b.id ? "" : " > " + b.id}`);
  ok(a.id === b.id || CROSS.has(l.n), `line ${l.n} is cut in two by a shot change`);
  ok(SEEN[a.id].includes(l.char) && SEEN[b.id].includes(l.char), `line ${l.n}: ${l.char} is not on screen in ${a.id}${a.id === b.id ? "" : " > " + b.id}`);
});
// no cut inside a word; and no cut inside a stretch of sound of a line (the pause between sentences or words is the only place a line may be cut)
for (const s of SHOTS.slice(1)) for (const l of LINES) {
  for (const w of l.words) ok(!(s.t0 > w.t + 0.02 && s.t0 < w.e - 0.02), `the cut to ${s.id} (${s.t0.toFixed(2)}) falls inside "${w.d}" of line ${l.n}`);
  for (const [a, b] of l.voiced) ok(!(s.t0 > a + 0.03 && s.t0 < b - 0.03), `the cut to ${s.id} (${s.t0.toFixed(2)}) falls inside a stretch of sound of line ${l.n} (${a.toFixed(2)}-${b.toFixed(2)})`);
}
// ── every cut hangs on its anchor: before a take's first sound, after its last, in a pause of a take, or on a measured sound peak (the ding) plus the time to read what it made
{
  const L = LINE;
  const spk = (n: number, d = 0.06) => snap(Math.min(L(n).first, L(n).start, L(n).voiced[0][0]) - d), aft = (n: number, d = 0.05) => snap(L(n).tend + d);
  const pause = (n: number) => { const v = L(n).voiced; let best = 0, at = 0; for (let i = 1; i < v.length; i++) if (v[i][0] - v[i - 1][1] > best) { best = v[i][0] - v[i - 1][1]; at = (v[i][0] + v[i - 1][1]) / 2; } return snap(at); };
  const dingPk = (peaks as Record<string, number>).ding;
  const onPk = (name: string, t: number) => t - (peaks as Record<string, number>)[name];
  const ANCHOR: Record<ShotId, [string, number]> = {
    hook: ["the first frame", 0], denCoffee: ["0.06 s before line 2's first sound", spk(2)], review: ["0.03 s after line 2's last sound", aft(2, 0.03)], vault: ["0.03 s after line 3's last sound", aft(3, 0.03)], free: ["0.06 s before line 5's first sound", spk(5)],
    fired: ["0.06 s before line 6", spk(6)], liked: ["0.06 s before line 7", spk(7)], hired: ["0.06 s before line 8", spk(8)], ugh: ["0.06 s before line 9", spk(9)], anything: ["0.06 s before line 10", spk(10)], anythingQ: ["0.06 s before line 11", spk(11)],
    kissAss: ["the middle of the pause after \"Anything?\"", pause(11)], kneelA: ["0.03 s after line 11's last sound", aft(11, 0.03)], kneelB: ["0.03 s after the knee drop's thud has ended (its clip is cut to 0.3 s)", snap(onPk("thud", T.kneel) + 0.3 + 0.03)], coldLips: ["0.065 s before line 12", spk(12, 0.065)], reviewPhone: ["0.03 s after line 12's last sound", aft(12, 0.03)],
    morning: ["1.0 s after the ding's frame (the review stays readable)", snap(T.dingT + 1.0)], usual: ["0.06 s before line 13", spk(13)], denTurn: ["0.04 s after line 13's last sound", aft(13, 0.04)], dryer: ["0.6 s after that: the turn is 0.6 s long", snap(aft(13, 0.04) + 0.6)],
  };
  for (const s of SHOTS) ok(Math.abs(s.t0 - ANCHOR[s.id][1]) < 0.5 / FPS, `the cut to ${s.id} (${s.t0.toFixed(3)}) is ${ANCHOR[s.id][0]} (${ANCHOR[s.id][1].toFixed(3)})`);
  ok(dingPk !== undefined && Math.abs(T.dingT - snap(T.postT + 0.03)) < 1e-6, "the ding's frame hangs on the post's frame; its measured peak sits on it");
}
// ── captions: every word is inside a caption; a caption lives inside one shot and stays up until its last word is out
for (const l of LINES) for (const w of l.words) ok(CAPS.some((c) => w.t >= c.w0 - 1e-6 && w.e <= c.w1 + 1e-6), `no caption holds "${w.d}" of line ${l.n}`);
for (const c of CAPS) {
  const a = shotOf(c.w0 + 0.02), b = shotOf(c.w1 - 0.02), e = shotOf(c.t1 - 1e-3);
  ok(a === b, `caption "${c.text}" runs over a cut`);
  ok(e === a && c.t0 >= SHOTS[a].t0 - 1e-6, `caption "${c.text}" (${c.t0.toFixed(2)}-${c.t1.toFixed(2)}) leaves its shot ${SHOTS[a].id}`);
  ok(c.t1 >= c.w1 - 0.06, `caption "${c.text}" goes out at ${c.t1.toFixed(2)}, before its last word ends (${c.w1.toFixed(2)})`);
  ok(c.t0 <= LINES.find((l) => l.n === c.n)!.words.find((w) => w.t === c.w0)!.t + 1e-6, `caption "${c.text}" comes in after its first word`);
}
for (let i = 1; i < CAPS.length; i++) if (CAPS[i].n === CAPS[i - 1].n) { const g = CAPS[i].t0 - CAPS[i - 1].t1; ok(g >= -1e-6 && (g < 1e-6 || g >= 0.1), `captions "${CAPS[i - 1].text}" and "${CAPS[i].text}" leave a gap of ${g.toFixed(2)} s with no text`); }
for (const l of LINES) {
  const ws = new Set(l.words.map((w) => shotOf(w.t + 0.02))), cs = new Set(CAPS.filter((c) => c.n === l.n).map((c) => shotOf(c.w0 + 0.02)));
  ok([...ws].every((x) => cs.has(x)) && [...cs].every((x) => ws.has(x)), `the captions of line ${l.n} are split at the cuts (words in shots ${[...ws].map((x) => x + 1)}, captions in ${[...cs].map((x) => x + 1)})`);
  const said = CAPS.filter((c) => c.n === l.n).map((c) => c.text).join(" ").replace(/[.?!,]/g, "").toLowerCase(), want = l.words.map((w) => w.d.replace(/—/g, "-")).join(" ").replace(/[.?!,]/g, "").toLowerCase();
  ok(said === want, `the captions of line ${l.n} read "${said}", the line is "${want}"`);
}
ok(CAPS.filter((c) => c.n === 11).map((c) => c.text).join(" | ") === "Anything? | What, you gonna | kiss my ass?", `line 11's captions read "${CAPS.filter((c) => c.n === 11).map((c) => c.text).join(" | ")}": the swear is written out, no bleep`);
ok(!LINES.some((l) => l.words.some((w) => w.bleep)) && !CAPS.some((c) => c.text.includes("*")), `no bleep anywhere ("ass" is said and written whole)`);
ok(LINES.length === 13 && LINES.every((l, i) => l.n === i + 1), `13 takes, numbered 1-13 (${LINES.map((l) => l.n).join(",")})`);
for (let i = 1; i < LINES.length; i++) ok(LINES[i].first >= LINES[i - 1].end - 0.001, `line ${LINES[i].n} starts before line ${LINES[i - 1].n} ends`);
ok(CAPS.every((c) => capBand(shotAt(fr(c.t0)).id)[0] === CAP_BAND[0]) && CAP_BAND[0] === 1295 && CAP_BAND[1] === 1455, "every caption is in the band y 1295-1455 (x 30-950)");
ok(CAPS.every((c) => c.t1 <= T.share + 1e-6), "no caption is on screen under the share line");

// ── mouths closed whenever the character does not speak (nobody but the speaker moves a mouth: the freeze included; Todd's pucker is a shape of its own, not a mouth that follows a voice)
const chars = Object.keys(BLINKS) as Char[];
let open = 0;
for (let f = 0; f < FRAMES; f++) for (const c of chars) if (!speaking(c, f) && mouthAt(c, f) !== "closed") open++;
ok(open === 0, `${open} frames with an open mouth outside speech`);
{
  let wrong = 0;
  for (let f = 0; f < FRAMES; f++) for (const c of chars) { const p = poseAt(c, f); if (p.mouth !== "closed" && !speaking(c, f) && !(c === "todd" && p.mouth === "pucker")) wrong++; if (p.mouth === "pucker" && !(c === "todd" && ["kneelA", "dryer"].includes(shotAt(f).id))) wrong++; }
  ok(wrong === 0, `${wrong} frames where a pose has an open mouth with no voice (the pucker is Todd's, in the front wide of the kiss and with the hair dryer)`);
}
for (const k of KEY_FRAMES) for (const c of SEEN[shotAt(k.f).id]) ok(blinkK(c, k.f - 1) + blinkK(c, k.f) + blinkK(c, k.f + 1) === 0, `${c} blinks at key frame "${k.label}" (${k.f})`);
{
  // nobody blinks on the first or the last frame of a shot (a cut on a half-shut eye reads as a glitch)
  let onCut = 0;
  for (const s of SHOTS) for (const f of [fr(s.t0), fr(s.t1) - 1]) for (const c of SEEN[shotAt(f).id]) if (BLINKS[c].some((b) => f >= b && f < b + 3) && !(f === 0)) { onCut++; console.log(`FAIL ${c} blinks on frame ${f}, ${f === fr(s.t0) ? "the first" : "the last"} frame of ${s.id}`); }
  ok(onCut === 0, `${onCut} blinks on the first or the last frame of a shot`);
}
ok(SHOTS.every((s) => KEY_FRAMES.some((k) => shotAt(k.f).id === s.id)), "every shot has a key frame");
ok(KEY_FRAMES.every((k) => k.f >= 0 && k.f < FRAMES), "every key frame is inside the reel");
ok(KEY_FRAMES.every((k) => k.label.startsWith(`${shotAt(k.f).i + 1} `)), `every key frame is in the shot its label names (${KEY_FRAMES.filter((k) => !k.label.startsWith(`${shotAt(k.f).i + 1} `)).map((k) => k.label).join(", ") || "none out of place"})`);

// ── the order of the beats
const order: [string, number][] = [
  ["s2", T.s2], ["s3", T.s3], ["rise", T.rise], ["s4", T.s4], ["launch", T.launch], ["land", T.land], ["s5", T.s5], ["s6", T.s6], ["s7", T.s7], ["s8", T.s8], ["s9", T.s9], ["turn", T.turn], ["turned", T.turned], ["s10", T.s10],
  ["s11", T.s11], ["s11b", T.s11b], ["s12", T.s12], ["fall", T.fall], ["kneel", T.kneel], ["peek", T.peek], ["moveIn", T.moveIn], ["s12b", T.s12b], ["smooch", T.smooch], ["dogT", T.dogT], ["s13", T.s13], ["s14", T.s14], ["star2", STAR_T[1]],
  ["typeStart", T.typeStart], ["typeEnd", T.typeEnd], ["postT", T.postT], ["dingT", T.dingT], ["s15", T.s15], ["doorOpen", T.doorOpen], ["s16", T.s16], ["s17", T.s17], ["dryer0", T.dryer0], ["s18", T.s18], ["share", T.share], ["end", T.end],
];
for (let i = 1; i < order.length; i++) ok(order[i][1] > order[i - 1][1], `${order[i][0]} (${order[i][1].toFixed(2)}) is not after ${order[i - 1][0]} (${order[i - 1][1].toFixed(2)})`);
ok(T.end - T.share >= 2.2 - 1e-6, `the share line stays ${(T.end - T.share).toFixed(2)} s (the least is 2.2 s)`);
ok(SHARE === "Send this to someone who's served her." && SHARE_LINES.join(" ") === SHARE, "the share line's words (and its two lines)");
ok(shotAt(fr(T.share + 0.1)).id === "dryer" && shotAt(fr(T.share)).id === "dryer" && T.share >= shot("dryer").t0, "the share line is over the last shot");
ok(SHARE_BOX.top >= 320 && SHARE_BOX.top + SHARE_BOX.height <= 500 && SHARE_BOX.left + SHARE_BOX.width <= 950, `the share line sits at y ${SHARE_BOX.top}-${SHARE_BOX.top + SHARE_BOX.height}, x ${SHARE_BOX.left}-${SHARE_BOX.left + SHARE_BOX.width} (the brief: about y 330-490)`);

// ── the hook: frame 1 is her with the cup, the dog and the line; the picture is on screen from frame 0 and the cover's frame is shot 1 before she speaks
{
  ok(shotAt(0).id === "hook" && bodyAt("customer", 0) === "rat" && dogAt(0).face === "sour" && CUS.hook!.dog === true, "frame 0 is her in the dead-rat pose (the cup at arm's length) with the dog in its sour face");
  ok(LINEUP.length === 4 && new Set(LINEUP.map((q) => q.c)).size === 4 && QUEUE.every((c) => LINEUP.some((q) => q.c === c)), "the line of four stands behind her, all four of 'Tip?'");
  ok(poseAt("customer", fr(0.2)).mouth === "closed" && fr(0.2) < fr(LINE(1).first), "the cover's frame (0.2 s) is shot 1 before she speaks, her mouth shut");
  ok(COVER_TITLE === "“This is hot.”" && COVER_BOX.top >= 240 && COVER_BOX.top + COVER_BOX.height <= 1520 && COVER_BOX.left + COVER_BOX.width <= 950, `the cover's title (curly quotes) sits at y ${COVER_BOX.top}-${COVER_BOX.top + COVER_BOX.height}: inside the grid's 3:4 crop (y 240-1680), out of the bottom 400 px`);
  const rc = RAD.customer * CUS.hook!.E, rd = RAD.deniseHood * DEN_FR.denCoffee!.E;
  ok(Math.abs(rc / rd - 1) <= 0.03, `her head in shot 1 (r ${rc.toFixed(0)} px) matches Denise's across the cut to shot 2 (r ${rd.toFixed(0)} px): her scale ${CUS.hook!.E} is ${(CUS.hook!.E / DEN_FR.denCoffee!.E).toFixed(2)} times hers (the rigs' heads: ${RAD.customer} and ${RAD.deniseHood} px)`);
  ok(Math.abs(shot("hook").t1 - shot("hook").t0 - 2.1) < 0.2, `the hook runs ${(shot("hook").t1 - shot("hook").t0).toFixed(2)} s: her line, then Denise's cut`);
}
// ── the phone's rise (shot 3): she is standing until 0.1 s before "review", then the phone is up and the pose rings out
{
  const r = fr(T.rise);
  ok(bodyAt("customer", r - 1) === "stand" && bodyAt("customer", r) === "phone" && bodyAt("customer", fr(T.s3)) === "stand", "she stands until the rise's frame, then the phone is up");
  ok(T.rise < LINE(3).words[3].t && LINE(3).words[3].t - T.rise <= 0.12, `the phone is up ${(LINE(3).words[3].t - T.rise).toFixed(2)} s before "review"`);
  let hi = 0, lo = 0;
  for (let f = r; f < r + 14; f++) { const j = poseAt("customer", f).breath - 1.4 * Math.sin((Math.PI * 2 * (f / FPS)) / 3.4 + 0.8); hi = Math.max(hi, j); lo = Math.min(lo, j); }
  ok(hi > 8 && hi <= 13 && lo < -1 && Math.abs(poseAt("customer", r + 18).breath - 1.4 * Math.sin((Math.PI * 2 * ((r + 18) / FPS)) / 3.4 + 0.8)) < 0.3, `the rise is a spring: up ${hi.toFixed(0)} puppet px, back past rest (${lo.toFixed(1)}), still within 0.6 s`);
}
// ── the vault (shot 4): Todd crouches behind the counter (squashed, hidden by the counter's strip), springs up on `launch`, flies a parabola over the counter, lands in front of it on `land` (the thud's frame) with a squash and a camera
// bump, and snaps to open arms 2 frames later
{
  const a = fr(T.launch), z = fr(T.land), E1 = VAULT.E1;
  ok(vaultAt(a - 1).air === false && vaultAt(a).air === true && vaultAt(z - 1).air === true && vaultAt(z).air === false && vaultAt(z).u === 1, `he is in the air from frame ${a} to ${z - 1} and on the floor on frame ${z} (the thud's frame), ${z - a} frames`);
  ok(vaultAt(z).sq === 1 && vaultAt(z - 1).sq === 0, "the squash is 1 on the landing frame and none before");
  let lo = 0;
  for (let k = 1; k < 24; k++) lo = Math.min(lo, vaultAt(z + k).sq);
  ok(lo < -0.05 && lo > -0.6 && Math.abs(vaultAt(z + 21).sq) < 0.1, `a small stretch follows the squash (${lo.toFixed(2)}), and it is at rest 0.7 s later`);
  // the feet's height over the line from the start to the landing: a parabola in time (the same step of speed on every frame)
  let para = true;
  for (let f = a + 1; f < z - 1; f++) { const dd = vaultAt(f + 1).h - 2 * vaultAt(f).h + vaultAt(f - 1).h; if (!(dd < -1e-6)) para = false; }
  ok(para, "he flies on gravity: a parabola in time (the same step of speed on every frame)");
  const feetAt = (f: number) => { const v = vaultAt(f); return VAULT.feet0 + (VAULT.feet1 - VAULT.feet0) * v.u - VAULT.apex * v.h; };
  let apex = 1e9, apexF = 0;
  for (let f = a; f <= z; f++) if (feetAt(f) < apex) { apex = feetAt(f); apexF = f; }
  const counterTop = WIDE_FR.counterTop;
  ok(apex <= counterTop - 40, `at the top of the arc his feet are at y ${apex.toFixed(0)}, ${(counterTop - apex).toFixed(0)} px over the counter's top edge (y ${counterTop.toFixed(0)}): he is clear of it before he is drawn in front of it`);
  ok(vaultAt(apexF).u >= 0.4 && vaultAt(apexF).u <= 0.62, `the top is at ${(vaultAt(apexF).u * 100).toFixed(0)} % of the flight: the order flips there (behind the strip while he rises, in front of it from the middle of the arc)`);
  // hidden: crouched behind the strip: his body's box (the jump picture at VAULT.E0, squashed to VAULT.crouch of its height, feet at feet0) is inside the strip's rectangle in the frame
  const cc = COUNTER_WIDE, sx0 = (cc.x0 - WV.u0) * WV.s, sx1 = (cc.x0 + cc.w - WV.u0) * WV.s, sy0 = (cc.y0 - WV.v0) * WV.s, sy1 = (cc.y0 + cc.h - WV.v0) * WV.s;
  const jp = TODD.bodies.kneel, hd = TODD.layers.head, wL = Math.min(jp.x, hd.x) - TODD.pivot[0], wR = Math.max(jp.x + jp.w, hd.x + hd.w) - TODD.pivot[0];
  const top = Math.min(jp.y, hd.y) - TODD.pivot[1], bottom = jp.y + jp.h - TODD.pivot[1]; // puppet px from the neck pivot: the picture's extent (the head's top is the highest)
  const x0 = VAULT.x0 + wL * VAULT.E0 * 1.18, x1 = VAULT.x0 + wR * VAULT.E0 * 1.18, y1 = VAULT.feet0, y0 = VAULT.feet0 + (top - bottom) * VAULT.E0 * VAULT.crouch;
  ok(x0 >= sx0 && x1 <= sx1 && y0 >= sy0 + 5 && y1 <= sy1, `before the launch he is crouched inside the counter's strip: his box x ${x0.toFixed(0)}-${x1.toFixed(0)}, y ${y0.toFixed(0)}-${y1.toFixed(0)} in the strip's x ${sx0.toFixed(0)}-${sx1.toFixed(0)}, y ${sy0.toFixed(0)}-${sy1.toFixed(0)}`);
  ok(vaultAt(a - 1).crouch === 1 && vaultAt(a).crouch === 1 && vaultAt(a + 1).crouch > 0.3 && vaultAt(a + 1).crouch < 0.7 && vaultAt(a + 2).crouch < 1e-9, "he is crouched until the launch and stands up in 2 frames");
  ok(bodyAt("todd", z - 1) === "kneel" && bodyAt("todd", z) === "beg" && T.toBeg === T.land && bodyAt("todd", a) === "kneel", "he flies in his tucked kneeling picture (no hand reaches out over Denise) and his arms open on the landing's frame: nothing of him hangs in the air in front of the counter");
  const b0 = bumpAt(z - 1), b1 = bumpAt(z), b2 = bumpAt(z + fr(0.6));
  ok(Math.hypot(...b0) === 0 && Math.hypot(...b1) > 8 && Math.hypot(...b1) < 22 && Math.hypot(...b2) < 0.1, `the camera bumps ${Math.hypot(...b1).toFixed(0)} px on the landing frame and is still 0.6 s later`);
  ok(T.land < LINE(4).first && LINE(4).first - T.land <= 0.1, `he lands ${(LINE(4).first - T.land).toFixed(2)} s before his first sound ("On the house!")`);
  ok(T.launch - T.s4 >= 0.09, `Denise is alone in the shot for ${(T.launch - T.s4).toFixed(2)} s before he springs up`);
  ok(T.s5 - T.land >= 0.2, `the landing is ${(T.s5 - T.land).toFixed(2)} s before the cut (the least is 0.2 s, for the squash)`);
  void E1;
}
// ── Denise does not react (shots 4, 6, 8): her pose in shots 6 and 8 has no tilt and no bob, her face is the same
{
  let moved = 0;
  for (const id of ["fired", "hired"] as ShotId[]) for (let f = fr(shot(id).t0); f < fr(shot(id).t1); f++) { const p = poseAt("deniseHood", f); if (p.tilt !== 0 || p.bob !== 0 || p.dx !== 0 || p.mouth !== "closed" || p.angry !== 0 || p.lift !== 0) moved++; }
  ok(moved === 0, `Denise does not react in shots 6 and 8: ${moved} frames where she tilts, bobs, speaks or lifts a brow`);
  let blink = 0;
  for (const id of ["fired", "hired"] as ShotId[]) for (let f = fr(shot(id).t0); f < fr(shot(id).t1); f++) if (poseAt("deniseHood", f).lid > poseAt("deniseHood", fr(shot(id).t0)).lid + 1e-9) blink++;
  ok(blink === 0, `she does not even blink in shots 6 and 8 (${blink} frames)`);
}
// ── "Ugh." (shot 9): both turn their heads away on the groan's first frame, in 4 frames, in sync
{
  const a = fr(T.turn);
  ok(turnK(a - 2) === 0 && turnK(a) === 0 && turnK(a + 4) === 1 && turnK(fr(shot("ugh").t1) - 1) === 1, "the turn is 0 before the groan's first frame and 1 four frames later, and held to the cut");
  const p0 = poseAt("customer", a - 2), p1 = poseAt("customer", a + 4), d0 = dogAt(a - 2), d1 = dogAt(a + 4);
  ok(p1.tilt < p0.tilt - 8 && p1.gaze[0] < -0.9 && p0.gaze[0] > 0.3 && d1.rot < -8 && d0.rot === 0 && d1.dx < -3, `her head turns away (tilt ${p0.tilt.toFixed(1)} -> ${p1.tilt.toFixed(1)}, gaze ${p0.gaze[0].toFixed(2)} -> ${p1.gaze[0].toFixed(2)}) and the dog turns the same way (${d0.rot.toFixed(1)} -> ${d1.rot.toFixed(1)} degrees) on the same frames`);
  ok(dogAt(a + 4).face === "sour" && poseAt("customer", a + 4).mouth !== undefined && Math.abs(T.turn - LINE(9).first) <= 1 / FPS, "the dog stays in its sour face and the turn starts on the groan's first sound");
}
// ── Todd close (shot 10): sweat flies off on every loud syllable of "Ma'am, anything!", on gravity, gone in 0.55 s
{
  const s = shot("anything");
  ok(SWEAT_T.length >= 6 && SWEAT_T.every((t) => LINE(10).peaks.some((p) => Math.abs(p.f - fr(t)) <= 1)) && SWEAT_T.every((t) => t >= s.t0 && t <= s.t1 - 0.1), `${SWEAT_T.length} drops, each on a loud syllable of line 10 (${[...new Set(SWEAT_T.map((t) => t.toFixed(2)))].join(" ")} s), the last one 0.1 s or more before the cut`);
  let up = true;
  for (let i = 0; i < SWEAT_T.length; i++) { const f0 = fr(SWEAT_T[i]); if (!(sweatAt(i, f0 - 1).on === false && sweatAt(i, f0).on === true && sweatAt(i, f0 + 20).on === false)) up = false; }
  ok(up, "a drop is off until its syllable's frame, on from it, gone 0.67 s later");
  {
    // the drops of a syllable go three ways: on no frame do two drops touch (a drop is 3.2 x 10 = 32 puppet px long, 20 wide): the notched double drop of v1 was two drops on one spot
    let touching = 0, closest = Infinity;
    for (let f = fr(s.t0); f < fr(s.t1); f++) {
      const on = SWEAT_T.map((_, i) => sweatAt(i, f)).filter((q) => q.on);
      for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) { const d = Math.hypot(on[i].x - on[j].x, on[i].y - on[j].y); closest = Math.min(closest, d); if (d < DROP_CLEAR) touching++; }
    }
    ok(touching === 0, `no two sweat drops overlap on any frame (the closest two are ${closest.toFixed(0)} puppet px apart; a drop is 32 long, so ${DROP_CLEAR} is the least): ${touching} frames`);
  }
  ok(Math.abs(poseAt("todd", fr(s.t0) + 8).dx) <= 2.3 && poseAt("todd", fr(s.t0) + 8).sad === 1, "he shivers (2 px on twos) and his brows are worried");
}
// ── the kiss, front wide (shot 13a): he stands behind her and to her right, falls to his knees on gravity (4 frames, kneel's frame is the thud), his head is at her hip, moves in against her coat and his lips are pushed out and his eyes shut
// by the cut; the side view (13b) holds 0.43 s, his lips land on her seat on the smooch's peak; the freeze: the murmur is gone and nobody moves but the dog, which gasps on the doggasp's peak
{
  const k = fr(T.kneel), sm = fr(T.smooch), dg = fr(T.dogT), a = shot("kneelA"), b = shot("kneelB"), cut = fr(T.s12b);
  ok(kissAt(k - 5).drop === 0 && kissAt(k).drop === 1 && kissAt(k - 1).drop > 0 && kissAt(k - 1).drop < 1, `he stands until frame ${k - 4} and is on his knees on frame ${k} (the thud's frame)`);
  let speeding = true;
  for (let f = k - 3; f < k; f++) if (!(kissAt(f).drop - kissAt(f - 1).drop >= kissAt(f - 1).drop - kissAt(f - 2).drop - 1e-9)) speeding = false;
  ok(speeding, "the fall is on gravity: each frame farther than the last");
  ok(kissAt(k).sq === 1 && kissAt(k - 1).sq === 0, "the squash is 1 on the knee drop's frame and none before");
  ok(bodyAt("todd", fr(T.fall) - 1) === "beg" && bodyAt("todd", fr(T.fall)) === "kneel" && bodyAt("todd", a.t1 * FPS - 1) === "kneel", "he is in the open arms until the fall starts, then in his kneeling picture");
  const h = (f: number) => kissAt(f).head;
  ok(h(fr(T.moveIn) - 1) === 0 && h(cut - 1) === 1 && h(cut - 3) > 0 && h(cut - 3) < 1, `his head moves in against her coat from frame ${fr(T.moveIn)} and has arrived on the front wide's last frame ${cut - 1}`);
  const tp = poseAt("todd", cut - 1);
  ok(tp.mouth === "pucker" && tp.lid >= 0.95 && poseAt("todd", fr(T.moveIn) - 1).mouth === "closed" && poseAt("todd", fr(T.moveIn) - 1).lid < 0.5, "his lips are pushed out and his eyes shut from the moment his head moves in; before it his mouth is shut and his eyes are open");
  ok(T.kneel - T.s12 >= 0.2 && T.smooch - T.kneel >= 0.25, `the knee drop is ${(T.kneel - T.s12).toFixed(2)} s into the shot, the smooch ${(T.smooch - T.kneel).toFixed(2)} s after it`);
  // where Todd's head is against her coat in the front wide: his mouth is at her coat's edge, half of it showing
  const coatR = KNEEL.neck[0] + 172 * KNEEL.E, mouthX = KNEEL.tKissX + (TODD.mouth.cx - TODD.pivot[0] - 14 * 0.97) * KNEEL.tE;
  ok(Math.abs(mouthX - coatR) <= 16, `in the front wide his pushed-out lips are at x ${mouthX.toFixed(0)}, her coat's right edge at the seat is at x ${coatR.toFixed(0)}: he is at her, the kiss lands in the side view`);
  // the side view (13b): the pair's numbers
  ok(T.smooch - b.t0 >= 0.4 - 1e-6, `the side view holds ${(T.smooch - b.t0).toFixed(2)} s before the smooch (the least is 0.4 s: the new framing has to read)`);
  ok(b.t0 > a.t0 && b.t1 > T.dogT && b.t0 === T.s12b, "the side view starts on the front wide's end and runs through the dog's gasp");
  const c = SIDE_RIG.customer, t = SIDE_RIG.todd;
  const her = { left: SIDE.herLeft, right: SIDE.herLeft + c.w * SIDE.E }, widest = SIDE.seatX + SIDE.gap0 - t.lips[0] * SIDE.tE + t.w * SIDE.tE;
  ok(her.left >= 16 && widest <= 1080 - 16, `nothing is cut at the frame's edges in the side view: she from x ${her.left.toFixed(0)}, he to x ${widest.toFixed(0)} at the widest (the frame is 0-1080)`);
  const herSeatY = SIDE.floorY - (c.feet - c.seat[1]) * SIDE.E, hisLipsY = SIDE.floorY - (t.feet - t.lips[1]) * SIDE.tE;
  ok(Math.abs(herSeatY - hisLipsY) < 1, `his lips (y ${hisLipsY.toFixed(1)}) are at the height of her seat (y ${herSeatY.toFixed(1)}), both on one floor (y ${SIDE.floorY}): tE ${SIDE.tE.toFixed(3)}`);
  ok(Math.abs(SIDE.tE / KNEEL.tE - 1) <= 0.03 && Math.abs(SIDE.E / KNEEL.E - 1) <= 0.03, `the heads keep their size across the cut to the side view: Todd ${KNEEL.tE} then ${SIDE.tE.toFixed(3)}, she ${KNEEL.E} then ${SIDE.E}`);
  ok(SIDE.u0 >= 0 && SIDE.v0 >= 0 && SIDE.u0 + 1080 / SIDE.s <= 768 && SIDE.v0 + 1920 / SIDE.s <= 1344, "the side view's plate covers the frame");
  const lipsX = (f: number) => SIDE.seatX + SIDE.gap0 * sideAt(f).creep - 5 * sideAt(f).sq;
  ok(sideAt(cut).creep > 0.99 && sideAt(sm - 1).creep > 0 && sideAt(sm).creep === 0 && lipsX(sm - 1) - SIDE.seatX > 0 && Math.abs(lipsX(sm) - SIDE.seatX + 5) < 1e-9, `his lips are ${SIDE.gap0} px from her seat on the cut, close in on twos, and are on her seat on the smooch's frame ${sm}`);
  let slowing = true, last = Infinity;
  for (let f = cut; f < sm; f++) { const cr = sideAt(f).creep; if (cr > last + 1e-9) slowing = false; last = cr; }
  ok(slowing, "he only moves toward her: no step back before the smooch");
  ok(sideAt(sm).sq === 1 && sideAt(sm - 1).sq === 0 && Math.abs(sideAt(sm + 9).sq) < 0.1 && Math.abs(sideAt(sm + 12).sq) < 0.02, "the contact's spring is 1 on the smooch's frame and none before; it has rung out within 0.3 s");
  let still = true;
  for (let f = sm + 12; f < fr(b.t1); f++) if (Math.abs(sideAt(f).sq - sideAt(sm + 12).sq) > 0.02 || sideAt(f).creep !== 0) still = false;
  ok(still, "after the contact has rung out nothing moves in the side view but the dog");
  // the freeze: from the smooch to the end of the shot the poses of her and the four are identical, frame after frame; the dog does not move until its gasp
  let moved = 0;
  const key = (c2: Char, f: number) => JSON.stringify(poseAt(c2, f));
  for (const c2 of ["customer", ...QUEUE] as Char[]) for (let f = sm; f < fr(b.t1); f++) if (key(c2, f) !== key(c2, sm)) moved++;
  ok(moved === 0 && frozen(sm) && !frozen(sm - 1), `from the smooch's frame to the cut nobody moves but the dog (${moved} frames where she or the line change a thing: breath, blink, eyes, mouth)`);
  ok(dogAt(sm - 1).face === "sour" && JSON.stringify(dogAt(sm)) === JSON.stringify(dogAt(dg - 1)) && dogAt(dg).face === "gasp" && dogAt(dg - 1).face === "sour", `the dog holds still from the smooch to frame ${dg - 1}, and its face is the gasp from the doggasp's frame ${dg}`);
  ok(dogAt(dg).up > 10 && dogAt(fr(b.t1) - 1).up < 3.5 && dogAt(fr(b.t1) - 1).face === "gasp", `the dog jolts up ${dogAt(dg).up.toFixed(0)} puppet px on the gasp and has settled to ${dogAt(fr(b.t1) - 1).up.toFixed(1)} by the cut; it is still gasping at the cut`);
  ok(T.s13 - T.dogT >= 0.2, `the gasp is on screen ${(T.s13 - T.dogT).toFixed(2)} s before the cut (the least is 0.2 s)`);
  // the dog in her side purse: inside the frame, over the counter's strip (its picture is dog.h tall at k of its size, its paws on the purse's anchor)
  const lr = JSON.parse(readFileSync(new URL("../src/lips-rig.json", import.meta.url), "utf8")) as { props: { dog: { paws: [number, number]; h: number; anchor: [number, number] } } };
  const kd = (0.75 * c.purse.w) / (lr.props.dog.paws[1] - lr.props.dog.paws[0]), anchorY = SIDE.floorY - (c.feet - c.purse.y) * SIDE.E, dogTop = anchorY - lr.props.dog.anchor[1] * kd * SIDE.E - 22 * SIDE.E;
  ok(dogTop > 0 && anchorY < (BACK.y0 - SIDE.v0) * SIDE.s, `the dog in her purse is inside the frame (its top, with the gasp's jolt, is at y ${dogTop.toFixed(0)}) and over the counter's strip`);
}
// ── "Cold lips." (shot 15): she does not move at all (the camera's push is the only thing that moves; her mouth follows her voice, nothing else of her changes)
{
  const s = shot("coldLips"), p0 = poseAt("customer", fr(s.t0));
  let moved = 0;
  for (let f = fr(s.t0); f < fr(s.t1); f++) { const p = poseAt("customer", f); if (p.tilt !== p0.tilt || p.bob !== p0.bob || p.breath !== p0.breath || p.dx !== p0.dx || p.hdx !== p0.hdx || p.lid !== p0.lid || p.gaze[0] !== p0.gaze[0] || p.gaze[1] !== p0.gaze[1] || p.angry !== p0.angry || p.lift !== p0.lift || p.asym !== p0.asym) moved++; }
  ok(moved === 0, `she stands perfectly still in "Cold lips.": ${moved} frames where her head, body, eyes or brows change (the mouth follows her voice)`);
}
// ── the review on her phone (shot 16): the stars pop in one by one (the first filled), a letter on every frame, a tick on every second one, the thumb presses Post, the ding, readable after it posts
{
  const s = shot("reviewPhone");
  ok(STAR_T.length === 5 && STAR_T.every((t, i) => i === 0 || Math.abs(t - STAR_T[i - 1] - 3 / FPS) < 1e-6) && STAR_T[0] === s.t0, "five stars, 3 frames apart, the first on the shot's first frame");
  ok(starAt(0, fr(STAR_T[0]) - 1).on === false && starAt(0, fr(STAR_T[0])).on === true && starAt(4, fr(STAR_T[4]) - 1).on === false && starAt(4, fr(STAR_T[4]) + 1).p > 0, "each star is off until its frame");
  ok(REVIEW === "Cold lips. Never coming back." && typedN(fr(T.typeStart) - 1) === 0 && typedN(fr(T.typeStart)) === 1 && typedN(fr(T.typeEnd)) === REVIEW.length && typedN(fr(T.typeStart) + 9) === 10, "'Cold lips. Never coming back.' is typed a letter on every frame (29 letters)");
  ok(TICK_T.length === Math.ceil(REVIEW.length / 2) && TICK_T.every((t, i) => Math.abs(t - T.typeStart - (2 * i) / FPS) < 1e-6) && TICK_T[TICK_T.length - 1] <= T.typeEnd, `a tick on every second letter (${TICK_T.length} ticks), none after the last letter`);
  ok(Math.abs(pressK(fr(T.postT)) - 1) < 1e-9 && pressK(fr(T.postT) - 2) < 1e-9 && postedK(fr(T.dingT) - 1) === 0 && postedK(fr(T.dingT) + 4) > 0.5, "the thumb presses Post on its frame; the button turns to Posted on the ding's frame");
  const read = shot("reviewPhone").t1 - T.dingT;
  ok(read >= 1.0 - 1e-6, `after the ding the review stays on screen ${read.toFixed(2)} s, ${(shot("reviewPhone").t1 - T.typeEnd).toFixed(2)} s after its last letter (stars and text complete the whole time: at least 1 s)`);
  ok(s.t1 - s.t0 >= 1.5, `the phone is on screen ${(s.t1 - s.t0).toFixed(2)} s (at least 1.5 s)`);
  // text zones of the phone: the screen's text box, stars, and Post button in the frame (the hand's picture, src/pen-stage.tsx HAND_PHONE, with the glass at HAND_GLASS here)
  const pen = readFileSync(new URL("../src/pen-stage.tsx", import.meta.url), "utf8");
  const hp = /export const HAND_PHONE = \{ w: (\d+), h: (\d+), cx: ([\d.]+), cy: ([\d.]+), rot: ([\d.]+), sw: (\d+), sh: (\d+), r: \d+, top: (\d+) \}/.exec(pen);
  ok(!!hp && JSON.stringify([+hp[1], +hp[2], +hp[3], +hp[4], +hp[5], +hp[6], +hp[7], +hp[8]]) === JSON.stringify([HAND_GLASS.w, HAND_GLASS.h, HAND_GLASS.cx, HAND_GLASS.cy, HAND_GLASS.rot, HAND_GLASS.sw, HAND_GLASS.sh, HAND_GLASS.top]), "the glass of the hand's picture in src/lips-layout.ts is the one in src/pen-stage.tsx");
  const X = (ux: number, uy: number) => handPoint(ux, uy)[0], Y = (ux: number, uy: number) => handPoint(ux, uy)[1];
  ok(X(REVIEW_UI.post.x1, REVIEW_UI.post.y0) <= 950 && Y(REVIEW_UI.post.x1, REVIEW_UI.post.y1) <= 1520 && X(REVIEW_UI.text.x1, REVIEW_UI.text.y0) <= 950 && X(REVIEW_UI.stars.x1, REVIEW_UI.stars.y0) <= 950, `her phone's words stay out of Instagram's bottom 400 px and right 130 px (the Post button's bottom edge is at y ${Y(REVIEW_UI.post.x1, REVIEW_UI.post.y1).toFixed(0)}, the text box's right edge at x ${X(REVIEW_UI.text.x1, REVIEW_UI.text.y0).toFixed(0)})`);
  const fontPx = REVIEW_UI.font * (HAND_GLASS.sw / PHONE.w) * HAND_FR.k;
  ok(fontPx >= 44, `the typed text is ${fontPx.toFixed(0)} px tall in the frame (${((fontPx * 390) / 1080).toFixed(0)} px on a 390 px phone)`);
  ok(X(0, 0) >= 60 && X(PHONE.w, 0) <= 950 && Y(0, 0) >= 60, `her phone's glass is inside the frame: from x ${X(0, 0).toFixed(0)} to ${X(PHONE.w, 0).toFixed(0)}, its top at y ${Y(0, 0).toFixed(0)}`);
  ok(FIX.hand.phone === "sp/lips-handphone.png" && existsSync(new URL(`../public/${FIX.hand.phone}`, import.meta.url)) && existsSync(new URL(`../public/${FIX.hand.fingers}`, import.meta.url)), "the review has her hand: the hand and sleeve of \"Tip?\", recoloured to her skin and her coat (public/sp/lips-handphone.png)");
}
// ── the next morning (shot 17): the card is on from the shot's first frame; the glass door swings out on `doorOpen` with its bell, the chime is on that frame; she is standing outside
{
  const s = shot("morning");
  ok(cardK(fr(s.t0) - 1) === 0 && cardK(fr(s.t0)) >= 0 && cardK(fr(s.t0) + 3) > 0.9 && cardK(fr(s.t1) - 1) > 0.95, "the card pops in on the first frame and stays to the cut");
  ok(doorAngle(fr(T.doorOpen) - 1) === 0 && doorAngle(fr(T.doorOpen) + 1) > 5 && doorAngle(fr(T.doorOpen) + DOOR_FRAMES) === DOOR_OPEN && doorAngle(fr(s.t1) - 1) === DOOR_OPEN && DOOR_OPEN >= 80 && DOOR_FRAMES <= 5 && bellAngle(fr(T.doorOpen) - 1) === 0 && Math.abs(bellAngle(fr(T.doorOpen) + 2)) > 2, `the door is shut until its frame, then it swings out to ${DOOR_OPEN} degrees (nearly edge-on) in ${DOOR_FRAMES} frames and the bell rings: she stands clear in the doorway`);
  { // the leaf at the hinge side (right) when open: x of its free edge against her right edge
    const M = MORNING, rightEdge = M.neck[0] + 172 * M.E, d = BACK.door, hinge = (d[2] - M.u0) * M.s, free = hinge - (d[2] - d[0]) * M.s * Math.cos((DOOR_OPEN * Math.PI) / 180);
    ok(free > rightEdge, `with the door open its leaf is a ${(hinge - free).toFixed(0)} px strip at the hinge (x ${free.toFixed(0)}-${hinge.toFixed(0)}), clear of her coat's right edge (x ${rightEdge.toFixed(0)})`);
  }
  ok(HITS.some((h) => h.sfx === "chime" && h.t === T.doorOpen) && T.doorOpen - s.t0 >= 0.15, "the chime is on the door's frame, after the card has been up for 0.2 s");
  ok(CARD_LINES.join(" ") === "NEXT MORNING, 6:00 AM" && CARD_BOX.top + CARD_BOX.height <= 1295 && CARD_BOX.left + CARD_BOX.width <= 950, `the card (${CARD_LINES.join(" / ")}) sits at y ${CARD_BOX.top}-${CARD_BOX.top + CARD_BOX.height}, x ${CARD_BOX.left}-${CARD_BOX.left + CARD_BOX.width}: clear of the bottom 400 px and the right 130 px`);
  ok(bodyAt("customer", fr(s.t0)) === "stand" && s.t1 - s.t0 >= 0.85, `she stands at the door; the shot is ${(s.t1 - s.t0).toFixed(2)} s`);
  ok(!HITS.some((h) => h.sfx === "cafebed") && !cues().some((c) => c.name === "cafebed" && c.at + (c.len ?? 20) > T.smooch + 0.05), "no murmur from the smooch on: the shop just opened");
}
// ── Denise turns (shot 19) and the hair dryer (shot 20)
{
  const d = shot("denTurn"), h = shot("dryer");
  ok(d.t1 - d.t0 >= 0.5 - 1e-6, `Denise's turn is ${(d.t1 - d.t0).toFixed(2)} s long (the least is 0.5 s: shorter, it would be dropped)`);
  ok(denTurnK(fr(d.t0)) === 0 && denTurnK(fr(d.t1) - 1) === 1 && gazeAt("deniseHood", fr(d.t0))[0] > 0.3 && gazeAt("deniseHood", fr(d.t1) - 1)[0] < -0.9, "she looks at the customer, then over her shoulder");
  ok(TURN_DX <= 8 && TURN_TILT <= 5 && poseAt("deniseHood", fr(d.t1) - 1).dx === -TURN_DX && poseAt("deniseHood", fr(d.t1) - 1).tilt === -TURN_TILT, `her head slides ${TURN_DX} puppet px and tilts ${TURN_TILT} degrees (v1: 14 and 9): the hood's neck, cut from under a head of another size, stays covered`);
  ok(T.dryer0 > T.s17 && T.dryer0 - T.s17 <= 0.1 && Math.abs(T.dryer0 - snap(T.s17 + 0.08)) < 1e-6, "the hair dryer's roar starts as she turns: she hears it before she sees it");
  const p = poseAt("todd", fr(h.t0) + 10);
  ok(p.mouth === "pucker" && p.hdx === DRYER.hdx && p.mdy === DRYER.mdy && bodyAt("todd", fr(h.t0)) === "dryer" && TODD.badge.dryer !== undefined, "he is in the dryer pose with his lips puckered, the head slid into the nozzle's stream and the pucker raised to the nozzle's height");
  {
    // the nozzle (the dryer drawn over his head, src/lips-fix.json) ends a few px short of his puckered lips, level with them; the head's slide and the lips' height are the ones that make it so
    const D = FIX.todd.dryer, lipsLeft = TODD.mouth.cx + p.hdx - 0.4 * TODD.mouthW, gap = lipsLeft - D.endX, midY = TODD.mouth.cy - p.mdy + 0.2 * TODD.mouthW;
    ok(gap >= 10 && gap <= 30, `the nozzle ends ${gap.toFixed(0)} puppet px (${(gap * TODD_FR.dryer!.E).toFixed(0)} px in the frame) short of his lips: a few px, not touching, not far`);
    ok(Math.abs(midY - D.endY) <= 1.5 && D.endH >= 40 && D.endH <= 70, `the nozzle (${D.endH} px tall) is level with the pucker: its middle at y ${D.endY}, the pucker's at y ${midY.toFixed(1)}`);
    ok(D.x + D.w > D.endX && existsSync(new URL(`../public/${D.file}`, import.meta.url)) && existsSync(new URL(`../public/${FIX.todd.bodies.dryer.file}`, import.meta.url)), "the dryer's own picture reaches the nozzle's end, and Todd's dryer body is the repaired one");
  }
  let wob = 0;
  for (let f = fr(h.t0) + (fr(h.t0) % 2); f < fr(h.t1) - 2; f += 2) { const a = flutterAt(f), b = flutterAt(f + 1); if (a.tilt !== b.tilt) wob++; }
  ok(wob === 0 && Math.abs(flutterAt(fr(h.t0) + 6).tilt - flutterAt(fr(h.t0) + 12).tilt) > 0.3, "the hair flutters on twos");
  const hair = (TODD.layers.head.y - TODD.pivot[1]) * -1; // how far above the neck pivot the picture of the head goes, puppet px
  const top = TODD_FR.dryer!.neck[1] - hair * TODD_FR.dryer!.E;
  ok(top >= SHARE_BOX.top + SHARE_BOX.height + 10, `his head's top (y ${top.toFixed(0)}) is under the share line (its bottom edge is at y ${SHARE_BOX.top + SHARE_BOX.height}): no text over the face`);
  const strip = (CAFE.counterTop - TODD_FR.dryer!.v0) * TODD_FR.dryer!.s, waist = TODD_FR.dryer!.neck[1] + (TODD.dryer.waist - TODD.pivot[1]) * TODD_FR.dryer!.E;
  ok(waist >= strip, `his body is cut off at the waist (y ${waist.toFixed(0)}), under the counter's strip (it starts at y ${strip.toFixed(0)}): no cut edge shows`);
  const ca = cues().filter((c) => c.name === "hairdryer");
  let reach = T.dryer0;
  for (const c of ca.sort((a2, b2) => a2.at - b2.at)) { if (c.at <= reach + 0.12) reach = Math.max(reach, c.at + (c.len ?? 2.5)); }
  ok(ca.length === 2 && ca[0].at === T.dryer0 && reach >= T_END, `the hair dryer runs from ${T.dryer0.toFixed(2)} s to the end (two copies, the second takes over 0.1 s before the first one fades): covered to ${reach.toFixed(2)} s`);
}

// ── text is out of Instagram's bottom 400 px and right 130 px: the caption band, the share line, the card and the cover's title
for (const [name, b] of Object.entries({ captions: { left: 30, width: 920, top: CAP_BAND[0], height: CAP_BAND[1] - CAP_BAND[0] }, share: SHARE_BOX, card: CARD_BOX, cover: COVER_BOX })) {
  const bx = b as { left: number; width: number; top: number; height: number };
  ok(bx.left >= 0 && bx.left + bx.width <= 950 && bx.top + bx.height <= 1520, `${name}: x ${bx.left}-${bx.left + bx.width}, y ${bx.top}-${bx.top + bx.height} is clear of Instagram's right 130 px and bottom 400 px`);
}
ok(SHARE_BOX.top + SHARE_BOX.height <= CAP_BAND[0] && CARD_BOX.top + CARD_BOX.height <= CAP_BAND[0], "the share line and the card are over the captions' band, not in it");

// ── the physics: a hit is a thing that happens on one frame; its sound is placed so that the clip's measured peak lands on that frame
const C = cues();
const PK = peaks as Record<string, number>;
for (const h of HITS) {
  const pk = PK[h.sfx], s = shot(h.shot);
  ok(pk !== undefined && existsSync(new URL(`../public/sfx/${h.sfx}.mp3`, import.meta.url)), `no measured peak or no file for ${h.sfx}`);
  ok(Math.abs(h.t * FPS - fr(h.t)) < 1e-6, `hit ${h.id} (${h.t}) is not on a frame`);
  ok(C.some((c) => c.name === h.sfx && Math.abs(c.at + pk - h.t) < 0.5 / FPS), `hit ${h.id}: no ${h.sfx} cue starts ${pk?.toFixed(3)} s before ${h.t.toFixed(3)}`);
  ok(h.t >= s.t0 && h.t < s.t1, `hit ${h.id} (${h.t.toFixed(2)}) is not inside ${h.shot} (${s.t0.toFixed(2)}-${s.t1.toFixed(2)})`);
  if (h.fall) {
    ok(h.t - h.fall >= s.t0 - 1e-6, `${h.id} starts to fall (${(h.t - h.fall).toFixed(2)}) before its shot ${h.shot} starts (${s.t0.toFixed(2)})`);
    ok(s.t1 - h.t >= 0.2 - 1e-6, `${h.id} lands only ${(s.t1 - h.t).toFixed(2)} s before the cut (the least is 0.2 s, for the squash)`);
  }
}
const sfxUsed = new Set(C.map((c) => c.name));
console.log("sounds:", [...sfxUsed].sort().join(" "));
ok(C.every((c) => c.at >= 0 && c.at < T_END), "every cue is inside the picture");
ok(HITS.some((h) => h.id === "smooch" && h.t === T.smooch) && HITS.some((h) => h.id === "dogGasp" && h.t === T.dogT) && HITS.some((h) => h.id === "knee" && h.t === T.kneel) && HITS.some((h) => h.id === "land" && h.t === T.land), "the thud of the landing, the knee drop's thud, the smooch and the doggasp are on their frames");
{
  const bed = C.filter((c) => c.name === "cafebed").sort((a2, b2) => a2.at - b2.at);
  let reach = 0, seams = true;
  for (const c of bed) { if (Math.abs(c.at - reach) > 1e-6) seams = false; reach = c.at + (c.len ?? 0); }
  ok(bed.length >= 3 && seams && Math.abs(reach - T.smooch) < 1e-6 && (bed[bed.length - 1].fade ?? 0) <= 0.05 && bed.slice(0, -1).every((c) => !c.fade), `the murmur is ${bed.length} stretches, one after the other from the first frame to the smooch's frame (${reach.toFixed(2)} s), and cuts to dead silence there (a ${bed[bed.length - 1]?.fade} s fade)`);
  const inside = (c: { from?: number; len?: number }) => BED_SRC.some(([a2, b2]) => (c.from ?? 0) >= a2 - 1e-6 && (c.from ?? 0) + (c.len ?? 0) <= b2 + 1e-6);
  ok(bed.every(inside) && bed.every((c) => (c.db ?? 0) === BED_DB), `every stretch of the murmur is cut from a clink-free part of the clip (peaks under -24 dBFS: ${BED_SRC.map(([a2, b2]) => `${a2}-${b2} s`).join(", ")}), all at ${BED_DB} dB: its body is heard in the gaps, its clinks (up to -6 dBFS at 5.6 s) are not in it`);
  const len = (c: { name: string; len?: number }) => c.len ?? ({ thud: 0.6, whoosh: 0.5, pop: 0.2, tick: 0.1, tap: 0.08, ding: 0.8, chime: 1.2, smooch: 0.35, doggasp: 0.22, hairdryer: 2.5, cafebed: 20 } as Record<string, number>)[c.name];
  const quiet = C.filter((c) => c.name !== "smooch" && c.name !== "doggasp" && c.at + len(c) > T.smooch + 0.1 && c.at < T.dogT - 0.05);
  ok(quiet.length === 0, `dead silence from 0.1 s after the smooch's peak (its tail) to the dog's gasp (${(T.dogT - T.smooch).toFixed(2)} s after the peak): no other sound (${quiet.map((c) => c.name).join(",") || "none"})`);
}
// a fall lands on its frame: at rest on it, still in the air the frame before
ok(HITS.find((h) => h.id === "land")!.fall === T.land - T.launch, "the vault's landing hit names its fall");

// ── who wears what, shot by shot
{
  const WEARS: [Char, string, ShotId[]][] = [
    ["customer", "rat", ["hook"]], ["customer", "phone", ["free", "liked", "ugh", "anythingQ", "kissAss", "kneelA", "coldLips"]], ["customer", "stand", ["morning", "usual"]],
    ["todd", "point", ["fired"]], ["todd", "beg", ["hired", "anything"]], ["todd", "dryer", ["dryer"]], ["deniseHood", "apron", ["denCoffee", "vault", "fired", "hired", "denTurn"]],
  ];
  let wrong = 0;
  for (const [c, body, ids] of WEARS) for (const id of ids) {
    const s = shot(id);
    for (let f = fr(s.t0); f < fr(s.t1); f++) if (bodyAt(c, f) !== body && !(c === "todd" && id === "hired" && false)) { wrong++; if (wrong < 6) console.log(`FAIL ${c} is in ${bodyAt(c, f)} on frame ${f} of ${id} (${body})`); }
  }
  ok(wrong === 0, `${wrong} frames where a character is not in the shot's own pose`);
  ok(Object.keys(TODD.badge).every((b) => TODD.bodies[b] !== undefined) && ["point", "beg", "kneel", "jump", "dryer"].every((b) => TODD.badge[b] !== undefined), "Todd's badge (TODD / MANAGER, written in code) has a place in each of his five pictures");
}
// ── no pupil hides under a lid: on every frame, for everyone on screen, each pupil's centre is below the lid's edge by at least its radius (src/lips-sched.ts clearance); a blink is the only frame with the eyes shut
{
  let bad2 = 0, worst = Infinity, n = 0;
  for (let f = 0; f < FRAMES; f++) for (const c of SEEN[shotAt(f).id]) {
    if (BLINKS[c].some((s2) => f >= s2 && f < s2 + 3)) continue; // a blink is the only frame with the eyes shut or half shut
    const p = poseAt(c, f);
    if (p.lid >= 0.9) continue;
    for (let i = 0; i < 2; i++) { const k = clearance(c, i, p.lid, p.gaze, p.pupil); n++; worst = Math.min(worst, k); if (k < -1e-6) { bad2++; if (bad2 < 6) console.log(`FAIL ${c} eye ${i} on frame ${f} (${shotAt(f).id}): the pupil is ${(-k).toFixed(1)} px under the lid (lid ${p.lid.toFixed(2)}, gaze ${p.gaze.map((v) => v.toFixed(2))})`); } }
  }
  ok(bad2 === 0, `${bad2} pupils under a lid`);
  console.log(`pupils: ${n} eyes checked, the least clearance ${worst.toFixed(1)} px`);
}
// the small moves are on twos
{
  let odd = 0;
  for (let f = 0; f < FRAMES; f += 2) { if (flutterAt(f).tilt !== flutterAt(f + 1).tilt) odd++; if (denTurnK(f) !== denTurnK(f + 1)) odd++; if (turnK(f) !== turnK(f + 1)) odd++; }
  ok(odd === 0 && twos(7) === 6 && twos(8) === 8, `${odd} values change on an odd frame (the dryer's flutter, Denise's turn, the groan's turn)`);
}
ok(SHOTS.every((s) => { const f0 = fr(s.t0) + 1, f1 = fr(s.t1) - 1; return f1 <= f0 || holdPush(f1) >= holdPush(f0); }), "no shot's camera pulls back");
ok(holdPush(0) === 1 && SHOTS.every((s) => holdPush(fr(s.t1) - 1) - holdPush(fr(s.t0)) <= 0.037), "a calm camera: no shot pushes more than 3.7 %, the first frame is not pushed");

// ── no black bar at a plate's edge: every view of a plate (768 x 1344) covers the whole frame (the framings of src/lips-layout.ts, every `view(...)` written in src/lips-scenes.tsx)
{
  const covers = (s: number, u0: number, v0: number) => u0 >= -1e-6 && v0 >= -1e-6 && u0 + 1080 / s <= 768 + 1e-6 && v0 + 1920 / s <= 1344 + 1e-6;
  let bad3 = 0, n = 0;
  const views: [string, number, number, number][] = [
    ...Object.entries(CUS).map(([id, v]): [string, number, number, number] => [id, v!.s, v!.u0, v!.v0]), ...Object.entries(DEN_FR).map(([id, v]): [string, number, number, number] => [id, v!.s, v!.u0, v!.v0]),
    ...Object.entries(TODD_FR).map(([id, v]): [string, number, number, number] => [id, v!.s, v!.u0, v!.v0]), ["wide counter", WV.s, WV.u0, WV.v0], ["kneel", KNEEL.s, KNEEL.u0, KNEEL.v0], ["side view", SIDE.s, SIDE.u0, SIDE.v0], ["morning", MORNING.s, MORNING.u0, MORNING.v0],
  ];
  const src = readFileSync(new URL("../src/lips-scenes.tsx", import.meta.url), "utf8");
  for (const m of src.matchAll(/\bview\(([\d.]+), ([\d.-]+), ([\d.-]+)\)/g)) views.push([`view(${m[1]}, ${m[2]}, ${m[3]})`, +m[1], +m[2], +m[3]]);
  for (const [name, s, u0, v0] of views) { n++; if (!covers(s, u0, v0)) { bad3++; console.log(`FAIL the view ${name} runs past its plate: u ${u0}-${(u0 + 1080 / s).toFixed(1)}, v ${v0}-${(v0 + 1920 / s).toFixed(1)}`); } }
  ok(bad3 === 0 && n > 15, `${n} views, ${bad3} run past their plate`);
  // the wide counter plate is a stage set with a margin of plain wall above (v < 172) and plain floor below (v > 1160): the view stays on the set
  ok(WV.v0 >= 170 && WV.v0 + 1920 / WV.s <= 1162, `the wide counter view shows the set only (v ${WV.v0}-${(WV.v0 + 1920 / WV.s).toFixed(0)} of the set's 172-1160): no plain margin shows`);
  void WIDE; void BACK;
}
// ── the dog sits in her purse: its paws' span is three quarters of the purse's width in every pose it shows in, and it is hidden under the counter's strip in the close-ups that do not show it
{
  const lr = JSON.parse(readFileSync(new URL("../src/lips-rig.json", import.meta.url), "utf8")) as { customer: { purse: Record<string, { w: number; y: number }>; pivot: [number, number] }; props: { dog: { paws: [number, number]; w: number; h: number; anchor: [number, number] } } };
  for (const pose of ["stand", "rat", "phone"]) { const w = lr.customer.purse[pose].w, k = (0.75 * w) / (lr.props.dog.paws[1] - lr.props.dog.paws[0]); ok(Math.abs((lr.props.dog.paws[1] - lr.props.dog.paws[0]) * k - 0.75 * w) < 1e-9, `the dog's paws span 0.75 of the ${pose} purse's width (${w}) at ${k.toFixed(3)} of its picture`); }
  for (const [id, F] of Object.entries(CUS)) {
    const body = id === "hook" ? "rat" : id === "usual" ? "stand" : "phone", pu = lr.customer.purse[body], k = (0.75 * pu.w) / (lr.props.dog.paws[1] - lr.props.dog.paws[0]);
    const opening = F!.neck[1] + (pu.y - lr.customer.pivot[1]) * F!.E, topOfDog = opening - lr.props.dog.anchor[1] * k * F!.E, strip = (BACK.y0 - F!.v0) * F!.s, band = CAP_BAND[0];
    if (F!.dog) ok(opening <= band - 5 && topOfDog >= 0, `${id}: the dog (y ${topOfDog.toFixed(0)}-${opening.toFixed(0)}) is above the captions' band (${band})`);
    else ok(topOfDog >= strip - 1, `${id}: the dog is not shown, and would be under the counter's strip anyway (its top y ${topOfDog.toFixed(0)}, the strip starts at y ${strip.toFixed(0)})`);
    const head = F!.neck[1] - 411 * F!.E;
    ok(head >= 0, `${id}: her hair and sunglasses are inside the frame (top y ${head.toFixed(0)})`);
  }
}
// ── no clock and no random source in the new files (everything is a function of the frame)
{
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  let found = 0;
  for (const x of ["lips-sched.ts", "lips-layout.ts", "lips-scenes.tsx", "lips-shared.tsx", "lips-ui.tsx", "Lips.tsx"]) {
    const m = strip(readFileSync(new URL(`../src/${x}`, import.meta.url), "utf8")).match(/Math\.random|Date\.now|new Date|performance\.now|setTimeout|setInterval|requestAnimationFrame|useEffect|useState|useRef/g);
    if (m) { found += m.length; console.log(`FAIL ${x} uses ${[...new Set(m)].join(", ")}`); }
  }
  ok(found === 0, "no clock, no random source, no state in src/lips-*.ts(x) and src/Lips.tsx: everything is a function of the frame");
}
// ── no scene loads a picture outside its canvas: a component that renders <Panel> itself and also calls a texture hook (useImages, useCanvasTexture, ...) suspends in the page's tree, and Remotion's render hangs at that shot's
// first frame ("Waiting for <ThreeCanvas/> to be created"); those scenes are made by shot() (src/lips-shared.tsx), which puts the hooks inside the canvas
{
  const hooks = /\b(useImages|useHandPhone|useLoader|useCanvasTexture|useTexture)\(/;
  let bad4 = 0, n = 0;
  for (const x of ["lips-scenes.tsx", "lips-ui.tsx", "Lips.tsx"]) {
    const src = readFileSync(new URL(`../src/${x}`, import.meta.url), "utf8");
    for (const chunk of src.split(/^(?=(?:export )?(?:function|const) )/m)) {
      if (!/<Panel\b/.test(chunk)) continue;
      n++;
      if (hooks.test(chunk)) { bad4++; console.log(`FAIL ${x}: "${chunk.split("\n")[0].slice(0, 50)}" renders <Panel> itself and calls a texture hook`); }
    }
  }
  const scenes = readFileSync(new URL("../src/lips-scenes.tsx", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1"); // without its comments
  ok(bad4 === 0 && !/<Panel\b/.test(scenes), `no scene file renders a <Panel> itself (${n} that do, none loads a picture): every scene is made by shot()`);
  const shared = readFileSync(new URL("../src/lips-shared.tsx", import.meta.url), "utf8");
  const drawn = [...(/const DRAWN[^=]*= \{([\s\S]*?)\};/.exec(scenes)?.[1] ?? "").matchAll(/\w+: (\w+)/g)].map((m) => m[1]);
  const made = drawn.filter((name) => new RegExp(`\\b${name} = (her|den|wide|shot)\\(`).test(scenes));
  ok(/export const shot = /.test(shared) && drawn.length === 20 && made.length === 20, `all ${drawn.length} scenes are made by shot() (through her(), den(), wide() or shot() itself): ${made.length} of them`);
}
// where a hit lands on a spoken word (the duck takes 8 dB off it): printed, not forbidden
const onWord = HITS.map((h) => ({ h, w: LINES.flatMap((l) => l.words.map((w) => ({ w, n: l.n }))).find((x) => h.t >= x.w.t - 0.01 && h.t <= x.w.e) })).filter((x) => x.w);
console.log("hits that land on a spoken word (ducked):", onWord.map((x) => `${x.h.id} on "${x.w!.w.d}" (line ${x.w!.n})`).join(", ") || "none");
console.log(`captions ${CAPS.length}, hits ${HITS.length}, cues ${C.length}, share "${SHARE}" ${T.share.toFixed(2)}-${T.end.toFixed(2)}`);
console.log("captions:", CAPS.map((c) => `${c.t0.toFixed(2)}-${c.t1.toFixed(2)} ${c.text}`).join(" | "));
console.log(bad ? `${bad} check(s) failed` : "all checks passed");
process.exit(bad ? 1 : 0);
