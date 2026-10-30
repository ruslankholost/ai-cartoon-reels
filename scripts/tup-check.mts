// node scripts/tup-check.mts  ->  prints the timeline of "I'm Just Supporting a Friend" (37 shots, 23 voice lines) and checks it: length, which shot every line falls in, no cut inside a word (and none inside a stretch of
// sound of a line whose speaker is on screen), captions that keep every word inside one shot, mouths shut outside speech, blinks away from the key frames, the order of the beats, every cue inside the picture, the share
// line long enough to read, the shot rules (every shot <= 2.4 s except the last one, which runs under the share line; no two shots in a row with the same framing), the hook (the invite readable from frame 0, her
// typing, Denise's face by about 2 s), the look (sepia only on the story, a flicker into the past with no black frame), the dive's match cut, the bowl on her lap above the captions, text out of the captions' band and of
// Instagram's bottom 400 px, and the physics (every hit on the frame of its sound's measured peak, falls that land on that frame and squash, slides that stop dead, springs that settle, the lid with its bounces, the burp,
// the stacks and the clerk who walks out, the gift, the forms, the newspaper, the stamp). Exits non-zero when a check fails; TUP_VERBOSE=1 prints the passing checks too.
import peaks from "../src/sfx-peaks.json" with { type: "json" };
import plates from "../src/tup-plates.json" with { type: "json" };
import rig from "../src/pen-rig.json" with { type: "json" };
import { clearance } from "../src/pen-eyes.ts";
import { existsSync, readFileSync } from "node:fs";
import { BRING_RECT, BROWN_BOX, DEN, DETROIT, DIVE_END_W, DOOR, DUST, EMPTY, END, GASP, GIFT_ON, INVITE_FONT, INVITE_RECT, LIVING, PAGE, RHO, SOURCE_FR, STAMP_FR, detroitY, lapBowl, textPx } from "../src/tup-layout.ts";
import {
  BLINKS, BOUNCES, CAPS, CAP_BAND, CARDFALL, CLERK_WALK, DIVE_Z, FORMS, FORM_FALL, FPS, FRAMES, HITS, KEY_FRAMES, KEY_T, LID, LINES, SHARE, SHOTS, SLIDE, STACKS, STACK_CARRIED, STACK_DIR, STACK_ORDER, STACK_T, STAMPFALL, STORY, T, T_END, TYPED,
  bigStampAt, bodyAt, burpFinger, buzzAt, capBand, chewMouth, cues, diveK, doorCardAt, fingerAt, formAt, gaspAt, gazeAt, giftHop, handK, holdPush, isStory, lidAt, lidSquash, mouthAt, nodAt, paperAt, paperPush, poseAt, projectorAt, pullK, sentK,
  shotAt, shopperK, slideAt, speaking, stackAt, stampAt, stampShake, twos, typedN, walkK, walkStep, yawnK, blowK, blowing, LINE, type Char, type ShotId,
} from "../src/tup-sched.ts";

let bad = 0;
const ok = (c: boolean, msg: string) => { if (!c) { bad++; console.log("FAIL", msg); } else if (process.env.TUP_VERBOSE) console.log("ok  ", msg); };
const fr = (t: number) => Math.round(t * FPS);
console.log(`total ${T_END.toFixed(2)} s, ${FRAMES} frames`);
SHOTS.forEach((s, i) => console.log(`shot ${String(i + 1).padStart(2)} ${s.id.padEnd(15)} ${s.t0.toFixed(2)}-${s.t1.toFixed(2)} (${(s.t1 - s.t0).toFixed(2)} s)${STORY.has(s.id) ? "  sepia" : ""}`));
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
  hook: "phone in her hand, the invite, insert", rhoBrow: "garage, Rhonda, close, the brow", denSupport: "garage, Denise, medium close, the bowl", rhoStore: "garage, Rhonda, medium close", denParty: "garage, Denise, close",
  rhoLook: "garage, Rhonda, close, deadpan", dive: "garage, the bowl, push-in", storeDust: "store, the clerk and the bowl, medium", pileBowls: "store, the stacks, insert", storeWide: "store, wide, the yawn",
  lidPop: "counter, bowl and lid, insert", clerkShrug: "store, the clerk, medium close", burp: "table, bowl and lid, insert", gasp: "living room, wide, guests and hostess", hostessBrownie: "living room, hostess, medium close",
  hostessHolds: "living room, hostess, medium, the lidded bowl", denChew: "garage, Denise, medium, chewing", storeEmpty: "store, wide, the shelf empties", doorCard: "door, the card, insert",
  giftHand: "living room, hostess and the man's hand, medium wide", giftBeam: "living room, hostess, medium close, the gift", formsSlide: "living room, couch and table, wide, forms slide", guest1: "living room, guest 1, close",
  guest2: "living room, guest 2, close", guest3: "living room, guest 3, close", hostessSells: "living room, hostess, medium close, the gift, beaming", formsPile: "living room, couch and table, medium, forms pile up",
  denLooks: "garage, Denise, medium close, the bowl", paperSpin: "newspaper, spinning in, insert", paperClose: "newspaper, the sum, extreme close", rhoGroup: "garage, Rhonda, medium close, colour again",
  phoneBuzz: "phone in her hand, the new text, insert", rhoSurvey: "garage, Rhonda, medium close, the survey", denPhone: "garage, Denise, close, her phone", denStamp: "garage, Denise, medium, the stamp",
  denMarketing: "garage, Denise, medium close, marketing", wideEnd: "garage, wide, both in their chairs",
};
// the rules must reject a cut list that breaks them, or they check nothing
ok(shotRules([{ id: "a", t0: 0, t1: 2, framing: "x" }, { id: "b", t0: 2, t1: 4, framing: "x" }]).some((m) => m.includes("same framing")), "the framing rule does not reject two equal framings in a row");
ok(shotRules([{ id: "a", t0: 0, t1: 2.5, framing: "x" }, { id: "b", t0: 2.5, t1: 4, framing: "y" }]).some((m) => m.includes("limit")), "the length rule does not reject a 2.5 s shot");
ok(shotRules([{ id: "a", t0: 0, t1: 2.4, framing: "x" }, { id: "b", t0: 2.4, t1: 4, framing: "y" }, { id: "c", t0: 4, t1: 9, framing: "z" }]).length === 0, "the length rule: the last shot may run any length, any other shot 2.4 s");
shotRules(SHOTS.map((s) => ({ ...s, framing: FRAMING[s.id] }))).forEach((m) => ok(false, m));
ok(SHOTS.length === 37, `37 shots (${SHOTS.length})`);
ok(SHOTS.every((s, i) => (i === 0 ? s.t0 === 0 : s.t0 === SHOTS[i - 1].t1)) && SHOTS[SHOTS.length - 1].t1 === T_END, `the ${SHOTS.length} shots tile the reel from 0 to the end`);

// ── who is on screen in each shot (for the blink check and for "an on-screen line has its speaker in the picture"); Rhonda's story lines are a voice over pictures she is not in
const G3: Char[] = ["guest1", "guest2", "guest3"];
const SEEN: Record<ShotId, Char[]> = {
  hook: [], rhoBrow: ["rhondaPen"], denSupport: ["denisePen"], rhoStore: ["rhondaPen"], denParty: ["denisePen"], rhoLook: ["rhondaPen"], dive: ["denisePen"], storeDust: ["clerk"], pileBowls: [], storeWide: ["clerk"], lidPop: [],
  clerkShrug: ["clerk"], burp: [], gasp: [...G3, "hostess"], hostessBrownie: ["hostess"], hostessHolds: ["hostess"], denChew: ["denisePen"], storeEmpty: ["clerk"], doorCard: [], giftHand: ["hostess", "guest1", "guest2"],
  giftBeam: ["hostess"], formsSlide: G3, guest1: ["guest1", "guest2"], guest2: G3, guest3: ["guest2", "guest3"], hostessSells: ["hostess"], formsPile: G3, denLooks: ["denisePen"], paperSpin: [], paperClose: [],
  rhoGroup: ["rhondaPen"], phoneBuzz: [], rhoSurvey: ["rhondaPen"], denPhone: ["denisePen"], denStamp: ["denisePen"], denMarketing: ["denisePen"], wideEnd: ["denisePen", "rhondaPen"],
};
// the shot every line belongs to: the garage's lines are cut at their speakers; Rhonda's story lines are a voice over the pictures (a cut may fall between two of her words inside one breath, never inside a word);
// "A 2018 survey..." starts with her on screen and goes on over Denise and the stamp
const WHERE: Record<number, ShotId[]> = {
  1: ["denSupport"], 2: ["rhoStore"], 3: ["denParty"], 4: ["rhoLook"], 5: ["storeDust", "pileBowls"], 6: ["storeWide"], 7: ["clerkShrug", "burp"], 8: ["gasp", "hostessBrownie"], 9: ["hostessHolds"], 10: ["storeEmpty", "doorCard"],
  11: ["giftHand", "giftBeam"], 12: ["guest1"], 13: ["guest2"], 14: ["guest3"], 15: ["hostessSells"], 16: ["formsPile"], 17: ["denLooks"], 18: ["paperSpin", "paperClose"], 19: ["paperClose"], 20: ["rhoGroup"],
  21: ["rhoSurvey", "denPhone", "denStamp"], 22: ["denMarketing"], 23: ["wideEnd"],
};
const VO = new Set([5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19]), CROSS = new Set([5, 7, 8, 10, 11, 18, 21]);
LINES.forEach((l) => {
  const a = shotAt(Math.round((l.first + 0.02) * FPS)), b = shotAt(Math.round((l.end - 0.02) * FPS));
  console.log(`line ${String(l.n).padStart(2)} ${l.who.padEnd(8)} first ${l.first.toFixed(2)} words ${l.start.toFixed(2)}-${l.end.toFixed(2)} voice to ${l.tend.toFixed(2)} s in ${a.id}${a.id === b.id ? "" : " > " + b.id}  "${l.text}"`);
  ok(WHERE[l.n].includes(a.id) && WHERE[l.n].includes(b.id), `line ${l.n} should be in ${WHERE[l.n].join("/")}, is in ${a.id}${a.id === b.id ? "" : " > " + b.id}`);
  ok(a.id === b.id || CROSS.has(l.n), `line ${l.n} is cut in two by a shot change`);
  if (!VO.has(l.n)) { ok(SEEN[a.id].includes(l.char), `line ${l.n}: ${l.char} is not on screen in ${a.id}`); if (!CROSS.has(l.n)) ok(SEEN[b.id].includes(l.char), `line ${l.n}: ${l.char} is not on screen in ${b.id}`); }
});
// no cut inside a word; and no cut inside a stretch of sound of a line whose speaker is on screen (the pause between sentences or words is the only place such a line may be cut)
for (const s of SHOTS.slice(1)) for (const l of LINES) {
  for (const w of l.words) ok(!(s.t0 > w.t + 0.02 && s.t0 < w.e - 0.02), `the cut to ${s.id} (${s.t0.toFixed(2)}) falls inside "${w.d}" of line ${l.n}`);
  if (!VO.has(l.n) && l.n !== 21) for (const [a, b] of l.voiced) ok(!(s.t0 > a + 0.03 && s.t0 < b - 0.03), `the cut to ${s.id} (${s.t0.toFixed(2)}) falls inside a stretch of sound of line ${l.n} (${a.toFixed(2)}-${b.toFixed(2)}), and ${l.char} is on screen`);
}
// captions: every word is inside a caption; a caption lives inside one shot and stays up until its last word is out
for (const l of LINES) for (const w of l.words) ok(CAPS.some((c) => w.t >= c.w0 - 1e-6 && w.e <= c.w1 + 1e-6), `no caption holds "${w.d}" of line ${l.n}`);
for (const c of CAPS) {
  const a = shotOf(c.w0 + 0.02), b = shotOf(c.w1 - 0.02), e = shotOf(c.t1 - 1e-3);
  ok(a === b, `caption "${c.text}" runs over a cut`);
  ok(e === a && c.t0 >= SHOTS[a].t0 - 1e-6, `caption "${c.text}" (${c.t0.toFixed(2)}-${c.t1.toFixed(2)}) leaves its shot ${SHOTS[a].id}`);
  ok(c.t1 >= c.w1 - 0.06, `caption "${c.text}" goes out at ${c.t1.toFixed(2)}, before its last word ends (${c.w1.toFixed(2)})`);
}
for (let i = 1; i < CAPS.length; i++) if (CAPS[i].n === CAPS[i - 1].n) { const g = CAPS[i].t0 - CAPS[i - 1].t1; ok(g >= -1e-6 && (g < 1e-6 || g >= 0.1), `captions "${CAPS[i - 1].text}" and "${CAPS[i].text}" leave a gap of ${g.toFixed(2)} s with no text`); }
// a line that a cut splits has a caption in every shot it has words in (the captions are split at the cut, on a word boundary)
for (const l of LINES) {
  const ws = new Set(l.words.map((w) => shotOf(w.t + 0.02))), cs = new Set(CAPS.filter((c) => c.n === l.n).map((c) => shotOf(c.w0 + 0.02)));
  ok([...ws].every((x) => cs.has(x)) && [...cs].every((x) => ws.has(x)), `the captions of line ${l.n} are split at the cuts (words in shots ${[...ws].map((x) => x + 1)}, captions in ${[...cs].map((x) => x + 1)})`);
}
for (const l of LINES) {
  const said = CAPS.filter((c) => c.n === l.n).map((c) => c.text).join(" ").replace(/\./g, "").replace(/\?/g, "").toLowerCase();
  const want = l.words.map((w) => (w.bleep ? "f***ing" : w.d.replace(/—/g, "-"))).join(" ").replace(/\./g, "").replace(/\?/g, "").toLowerCase();
  ok(said === want, `the captions of line ${l.n} read "${said}", the line is "${want}"`);
}
ok(CAPS.some((c) => c.n === 22 && c.text === "F***ing marketing."), `line 22's caption reads "F***ing marketing."`);
ok(CAPS.filter((c) => c.n === 23).map((c) => c.text).join(" | ") === "Either you're selling, | or you're buying.", `the outro's captions read "${CAPS.filter((c) => c.n === 23).map((c) => c.text).join(" | ")}"`);
ok(LINES.length === 23 && LINES.every((l, i) => l.n === i + 1), `23 takes, numbered 1-23 (${LINES.map((l) => l.n).join(",")})`);
ok(T_END >= 58 && T_END <= 66, `length 58-66 s (${T_END.toFixed(2)})`);
for (let i = 1; i < LINES.length; i++) ok(LINES[i].first >= LINES[i - 1].end - 0.001, `line ${LINES[i].n} starts before line ${LINES[i - 1].n} ends`);
// mouths closed whenever the character does not speak
const chars = Object.keys(BLINKS) as Char[];
let open = 0;
for (let f = 0; f < FRAMES; f++) for (const c of chars) if (!speaking(c, f) && mouthAt(c, f) !== "closed") open++;
ok(open === 0, `${open} frames with an open mouth outside speech`);
for (const k of KEY_FRAMES) for (const c of SEEN[shotAt(k.f).id]) ok(!BLINKS[c].some((s) => k.f >= s - 1 && k.f <= s + 3), `${c} blinks at key frame "${k.label}" (${k.f})`);
ok(SHOTS.every((s) => KEY_FRAMES.some((k) => shotAt(k.f).id === s.id)), "every shot has a key frame");
ok(KEY_FRAMES.every((k) => k.f >= 0 && k.f < FRAMES), "every key frame is inside the reel");
ok(KEY_FRAMES.every((k) => k.label.startsWith(`${shotAt(k.f).i + 1} `)), `every key frame is in the shot its label names (${KEY_FRAMES.filter((k) => !k.label.startsWith(`${shotAt(k.f).i + 1} `)).map((k) => k.label).join(", ") || "none out of place"})`);

// ── the order of the beats
const order: [string, number][] = [
  ["type0", T.type0], ["sendT", T.sendT], ["s2", T.s2], ["brow", T.brow], ["s3", T.s3], ["s4", T.s4], ["s5", T.s5], ["s6", T.s6], ["s7", T.s7], ["proj0", T.proj0], ["s8", T.s8], ["proj1", T.proj1], ["puff", T.puff], ["stamp", T.stamp],
  ["s9", T.s9], ["s10", T.s10], ["s11", T.s11], ["lidPress", T.lidPress], ["lidPop", T.lidPop], ["lidLand", T.lidLand], ["s12", T.s12], ["shrug", T.shrug], ["s13", T.s13], ["press", T.press], ["burpT", T.burpT], ["ding1", T.ding1],
  ["s14", T.s14], ["gaspT", T.gaspT], ["s15", T.s15], ["s16", T.s16], ["s17", T.s17], ["chipT", T.chipT], ["s18", T.s18], ["stack1", STACK_T[0]], ["stack6", STACK_T[STACKS - 1]], ["s19", T.s19], ["cardDrop", T.cardDrop], ["s20", T.s20],
  ["handover", T.handover], ["s21", T.s21], ["giftPop", T.giftPop], ["s22", T.s22], ["slide1", T.slide1], ["slide2", T.slide2], ["slide3", T.slide3], ["s23", T.s23], ["sign1", T.sign1], ["s24", T.s24], ["sign2", T.sign2], ["s25", T.s25],
  ["sign3", T.sign3], ["s26", T.s26], ["s27", T.s27], ["form1", FORMS[0]], ["form6", FORMS[5]], ["s28", T.s28], ["lookT", T.lookT], ["s29", T.s29], ["paperStop", T.paperStop], ["s30", T.s30], ["s31", T.s31], ["s32", T.s32], ["buzz", T.buzz],
  ["s33", T.s33], ["s34", T.s34], ["s35", T.s35], ["stampT", T.stampT], ["s36", T.s36], ["s37", T.s37], ["crack", T.crack], ["share", T.share], ["end", T.end],
];
for (let i = 1; i < order.length; i++) ok(order[i][1] > order[i - 1][1], `${order[i][0]} (${order[i][1].toFixed(2)}) is not after ${order[i - 1][0]} (${order[i - 1][1].toFixed(2)})`);
ok(T.end - T.share >= 2.5 - 1e-6, `the share line stays ${(T.end - T.share).toFixed(2)} s (the least is 2.5 s)`);
ok(SHARE === "Send this to the friend who always says yes to the candle party.", "the share line's words");
ok(shotAt(Math.round((T.share + 0.1) * FPS)).id === "wideEnd", "the share line is over the last shot");

// ── the hook (shot 1): the invite is on screen from frame 0 with nothing over it and big enough to read at phone size in under a second (QA: its text was 8 px tall on a 390 px phone), she types "I'm in!! (heart)" key by
// key from 0.8 s and sends it, Rhonda's brow goes up, and Denise's face is there by about 2 s
{
  const h = shot("hook"), b = shot("rhoBrow");
  ok(shotAt(0).id === "hook" && typedN(0) === 0 && sentK(0) === 0 && fingerAt(0).come === 0, "frame 0 is the phone with the invite, nothing typed, her finger not yet on the screen");
  ok(T.type0 >= 0.7 && T.type0 <= 0.9, `the invite is on screen ${T.type0.toFixed(2)} s before the first key (0.7-0.9 s: it has to read in under a second)`);
  ok(KEY_T.length === 10 && TYPED.join("") === "I'm in!! ♥" && KEY_T.every((t, i) => i === 0 || (t - KEY_T[i - 1] >= 0.06 && t - KEY_T[i - 1] <= 0.07)) && KEY_T[9] < T.sendT && typedN(fr(KEY_T[9])) === 10 && typedN(fr(KEY_T[9]) - 1) === 9, `ten keys, one every 2 frames: "${TYPED.join("")}"`);
  ok(T.sendT - KEY_T[9] >= 0.05 && T.sendT < h.t1 - 0.05 && sentK(fr(T.sendT) - 1) === 0 && sentK(fr(h.t1) - 1) > 0.9, `she sends it ${(T.sendT - KEY_T[9]).toFixed(2)} s after the heart, ${(h.t1 - T.sendT).toFixed(2)} s before the cut, and the bubble has popped in by the shot's last frame`);
  ok(h.t1 - h.t0 >= 1.5 && h.t1 - h.t0 <= 1.8 && b.t1 - b.t0 >= 0.45 && b.t1 - b.t0 <= 0.55, `the hook runs ${(h.t1 - h.t0).toFixed(2)} s, Rhonda's brow ${(b.t1 - b.t0).toFixed(2)} s`);
  ok(shot("denSupport").t0 <= 2.2 && LINE(1).first >= 2.0 && LINE(1).first - shot("denSupport").t0 >= 0.05, `Denise's face comes at ${shot("denSupport").t0.toFixed(2)} s, her line at ${LINE(1).first.toFixed(2)} s`);
  ok(INVITE_RECT[0] >= 0 && INVITE_RECT[2] <= 950 && INVITE_RECT[1] >= 0 && INVITE_RECT[3] <= 1520, `the invite's bubble is at x ${INVITE_RECT[0].toFixed(0)}-${INVITE_RECT[2].toFixed(0)}, y ${INVITE_RECT[1].toFixed(0)}-${INVITE_RECT[3].toFixed(0)}: clear of Instagram's right 130 px and bottom 400 px`);
  const px = textPx(INVITE_FONT);
  ok(px >= 56 && INVITE_RECT[1] >= 250 && INVITE_RECT[3] <= 1100, `the invite's text is ${px.toFixed(0)} px tall in the frame (${((px * 390) / 1080).toFixed(0)} px on a 390 px phone; the least is 56 in the frame, the brief asked for about 48), in the upper middle (y ${INVITE_RECT[1].toFixed(0)}-${INVITE_RECT[3].toFixed(0)})`);
  ok(CAPS.every((c) => c.t1 <= h.t0 + 1e-6 || c.t0 >= h.t1 - 1e-6) && CAPS.every((c) => c.t1 <= shot("phoneBuzz").t0 + 1e-6 || c.t0 >= shot("phoneBuzz").t1 - 1e-6), "no caption over the two phones");
  // her finger goes from key to key: it is on each key on the key's frame (a press), and the screen's text is out of its way
  let on = true;
  KEY_T.forEach((t) => { const p = fingerAt(fr(t)); if (!(p.press > 0.95 && p.come > 0.9)) on = false; });
  ok(on, "her finger is on every key on the frame of its tap");
  const s = fingerAt(fr(T.sendT));
  ok(s.press > 0.95 && s.uy < 440, `the send is a tap on the button above the keys (design y ${s.uy.toFixed(0)})`);
  ok(Math.max(...[...Array(fr(KEY_T[9]) + 1).keys()].map((f) => 0 + (fingerAt(f).uy < 330 ? 1 : 0))) === 0, "her finger never goes over the invite while she types");
  const brow = (f: number) => poseAt("rhondaPen", f);
  ok(brow(fr(T.brow) - 3).asym === 0 && brow(fr(T.brow) + 4).asym > 0.9 && brow(fr(T.s3) - 2).asym > 0.5, "Rhonda's brow goes up on its tick and stays up to the cut");
}

// ── the look: sepia only on the story (and not on Denise's two cut-backs), one flicker into the past (the colour drains over the dive's last 0.15 s, the cut is hard, the lamp warms up; no iris, no black frame), a slow push on every hold
{
  const colour = new Set<ShotId>(["denChew", "denLooks"]);
  let right = true;
  SHOTS.forEach((s, i) => { const inside = i >= num("storeDust") - 1 && i <= num("paperClose") - 1; if (STORY.has(s.id) !== (inside && !colour.has(s.id))) right = false; });
  ok(right && STORY.size === 21, "the story is sepia from the store to the newspaper's sum, and Denise's two cut-backs stay in colour");
  ok(!isStory(fr(T.s8) - 1) && isStory(fr(T.s8)) && !isStory(fr(T.s17)) && isStory(fr(T.s17) - 1) && isStory(fr(T.s18)) && !isStory(fr(T.s28)) && !isStory(fr(T.s31)) && isStory(fr(T.s31) - 1), "a hard cut into sepia at the store, a hard cut to colour for the chip and again at 'Now it's the group chat'");
  // the projector: the sepia is on exactly the story's frames and the dive's last 0.15 s, where it rises and never falls; the lamp flickers up to 25 % there and 13 % in the store's first 0.3 s, 3 % after; no frame is dark
  {
    const r0 = fr(T.proj0), cut = fr(T.s8), warm = fr(T.proj1);
    let dark = 9, lit = 0, right2 = true, rising = true, prev = 0, fIn = 0, fWarm = 0, fLate = 0;
    for (let f = 0; f < FRAMES; f++) {
      const p = projectorAt(f), d = Math.abs(p.bright - 1);
      dark = Math.min(dark, p.bright); lit = Math.max(lit, p.bright);
      if ((p.sepia > 0) !== (isStory(f) || (f > r0 && f < cut)) || p.sepia > 1 || p.sepia < 0) right2 = false;
      if (f >= r0 && f <= cut) { if (p.sepia < prev - 1e-9) rising = false; prev = p.sepia; }
      if (f >= r0 && f < cut) fIn = Math.max(fIn, d); else if (f >= cut && f < warm) fWarm = Math.max(fWarm, d); else if (isStory(f)) fLate = Math.max(fLate, d);
    }
    ok(right2 && rising && projectorAt(r0 - 1).sepia === 0 && projectorAt(r0).sepia === 0 && projectorAt(cut - 1).sepia > 0.7 && projectorAt(cut).sepia === 1, "the colour drains into sepia over the dive's last 0.15 s (it only rises), the cut onto the store is hard, and the sepia is on nowhere else but the story");
    ok(dark >= 0.7 && lit <= 1.3, `no frame is dark: the lamp stays between ${dark.toFixed(2)} and ${lit.toFixed(2)} of full brightness (the iris that went black is gone)`);
    ok(fIn > 0.05 && fIn <= 0.251 && fWarm <= 0.131 && fLate <= 0.031 && fIn > fLate, `the lamp flickers ${(fIn * 100).toFixed(0)} % while the colour drains, ${(fWarm * 100).toFixed(0)} % while it warms up, ${(fLate * 100).toFixed(0)} % after`);
    ok(T.proj0 > shot("dive").t0 + 0.5 && T.s8 - T.proj0 >= 0.1 && T.s8 - T.proj0 <= 0.2 && T.proj1 - T.s8 <= 0.35 && T.proj1 < shot("storeDust").t0 + 0.4, "the transition is the dive's last 0.15 s and the store's first 0.3 s");
    const tup = readFileSync(new URL("../src/Tup.tsx", import.meta.url), "utf8");
    ok(!/clipPath|irisAt|flickerAt/.test(tup) && /projectorAt/.test(tup), "src/Tup.tsx has no iris (no clip-path) and draws the look from projectorAt");
  }
  ok(SHOTS.every((s) => { const f0 = fr(s.t0) + 1, f1 = fr(s.t1) - 1; return f1 <= f0 || holdPush(f1) > holdPush(f0); }), "every shot has a slow push");
  ok(holdPush(0) === 1, "the first frame is not pushed");
  ok(SHOTS.filter((s) => s.id !== "dive" && s.id !== "storeDust").every((s) => holdPush(fr(s.t1) - 1) - holdPush(fr(s.t0)) <= 0.037), "a calm camera: no shot but the dive pushes more than 3.7 %");
}
// ── the dive and its match cut: the camera goes into the bowl on her lap and ends with the bowl as wide as the frame (a zoom about the bowl), the store opens on the same bowl at the same width and pulls back
{
  const F = DEN.dive!, b = lapBowl(F), d = shot("dive");
  ok(b.w * DIVE_Z >= DIVE_END_W - 1 && DIVE_END_W >= 1100 && Math.abs(Math.pow(DIVE_Z, 1) * b.w - DIVE_END_W) < 1, `the bowl on her lap is ${b.w.toFixed(0)} px wide and ends ${(b.w * DIVE_Z).toFixed(0)} px wide: it fills the frame (${DIVE_END_W} px)`);
  let up = true;
  for (let f = fr(d.t0); f < fr(T.proj0); f++) if (holdPush(f + 1) < holdPush(f)) up = false;
  ok(up && holdPush(fr(d.t0)) === 1 && Math.abs(holdPush(fr(T.proj0)) - DIVE_Z) < 1e-9 && diveK(fr(d.t0)) === 0 && diveK(fr(T.proj0)) === 1, `the zoom grows from 1 to ${DIVE_Z.toFixed(2)} over the dive (${(T.proj0 - d.t0).toFixed(2)} s) and does not turn back`);
  ok(pullK(fr(T.s8)) === 1 && pullK(fr(T.s8) - 1) === 1 && pullK(fr(T.s8) + 15) < 0.001 && T.s8 + 0.5 < T.puff && T.s8 + 0.5 < T.stamp - 0.2, `the store opens on the bowl at the dive's size and has pulled back by ${(T.s8 + 0.5).toFixed(2)} s, before the dust and the card`);
  let down = true;
  for (let f = fr(T.s8); f < fr(T.s8) + 16; f++) if (pullK(f + 1) > pullK(f)) down = false;
  ok(down, "the pull-back never turns round");
  ok(shot("dive").t1 - shot("dive").t0 >= 0.9 && shot("dive").t1 - shot("dive").t0 <= 1.2, `the dive runs ${(shot("dive").t1 - shot("dive").t0).toFixed(2)} s (the silence after "Shut up and look.")`);
  const g = (f: number) => gazeAt("denisePen", f);
  ok(g(fr(d.t0))[1] < 0.2 && g(fr(d.t0) + 8)[1] > 0.8, "she looks down at the bowl as the camera goes in");
}
// ── the bowl has to read: on her lap in every Denise shot, above the captions' band and inside the frame
{
  for (const [id, F] of Object.entries(DEN)) {
    const b = lapBowl(F!), band = capBand(id as ShotId);
    ok(b.foot < band[0] - 20 && b.x - b.w / 2 >= 20 && b.x + b.w / 2 <= 1060 && b.top > 0 && b.w >= 250, `${id}: the bowl (${b.w.toFixed(0)} px wide, y ${b.top.toFixed(0)}-${b.foot.toFixed(0)}) is on screen, above the captions (${band[0]})`);
  }
  const e = lapBowl({ head: END.den, E: END.E, s: END.s, u0: END.u0, v0: END.v0 });
  ok(e.foot < 1500 && e.w >= 240 && capBand("wideEnd")[1] < e.top, `the last wide: the bowl (${e.w.toFixed(0)} px wide, y ${e.top.toFixed(0)}-${e.foot.toFixed(0)}) is under its captions (${capBand("wideEnd")})`);
  for (const id of ["denSupport", "denParty", "denChew", "denLooks", "denPhone", "denStamp", "denMarketing", "dive"] as ShotId[]) ok(DEN[id] !== undefined, `${id} has a framing`);
  const sizes = ["denPhone", "denStamp", "denMarketing"].map((id) => DEN[id as ShotId]!.E);
  ok(new Set(sizes).size === 3, `Denise's last three shots are three sizes (${sizes.join(", ")}), not one framing three times`);
}
// ── text is out of the captions' band and of Instagram's bottom 400 px and right 130 px: the cards, the pages, the stamp and its source
{
  type Box = { id: ShotId; what: string; x0: number; y0: number; x1: number; y1: number };
  const half = (c: { x: number; y: number; w: number; h: number }) => ({ x0: c.x - c.w / 2, x1: c.x + c.w / 2, y0: c.y - c.h / 2, y1: c.y + c.h / 2 });
  const sw = Math.sin((9 * Math.PI) / 180) * DOOR.h; // a swing of 9 degrees moves the bottom corners sideways this far
  const pz = (v: number, z: number, c = 880) => c + (v - c) * z; // a point after a zoom z about the focus (c)
  const boxes: Box[] = [
    { id: "storeDust", what: "the card DETROIT, 1949", ...half(DETROIT) },
    { id: "doorCard", what: "the door's card (its words)", x0: DOOR.x - DOOR.textW / 2 - sw, x1: DOOR.x + DOOR.textW / 2 + sw, y0: DOOR.hinge, y1: DOOR.hinge + DOOR.h },
    // the page (600 x 800 design units at PAGE.s, its text 30 units in from the sides) at the camera's zoom about (540, 880): shot 29's hold ends at zoom0, shot 30's push at zoom1; the whole page stays above the captions' band
    { id: "paperSpin", what: "the page (its columns, its sum)", x0: pz(540 - 270 * PAGE.s, PAGE.zoom0, 540), x1: pz(540 + 270 * PAGE.s, PAGE.zoom0, 540), y0: pz(PAGE.y - 400 * PAGE.s, PAGE.zoom0), y1: pz(PAGE.y + 400 * PAGE.s, PAGE.zoom0) },
    { id: "paperClose", what: "the page (its columns, its sum)", x0: pz(540 - 270 * PAGE.s, PAGE.zoom1, 540), x1: pz(540 + 270 * PAGE.s, PAGE.zoom1, 540), y0: pz(PAGE.y - 400 * PAGE.s, PAGE.zoom1), y1: pz(PAGE.y + 400 * PAGE.s, PAGE.zoom1) },
    { id: "denStamp", what: "the stamp", ...half(STAMP_FR) }, { id: "denStamp", what: "the source line", ...half(SOURCE_FR) },
    { id: "hook", what: "the invite", x0: INVITE_RECT[0], y0: INVITE_RECT[1], x1: INVITE_RECT[2], y1: INVITE_RECT[3] }, { id: "phoneBuzz", what: "the new text", x0: BRING_RECT[0], y0: BRING_RECT[1], x1: BRING_RECT[2], y1: BRING_RECT[3] },
  ];
  for (const b of boxes) {
    const s = shot(b.id), band = capBand(b.id), captioned = CAPS.some((c) => c.t0 < s.t1 - 1e-6 && c.t1 > s.t0 + 1e-6);
    ok(b.x0 >= 0 && b.x1 <= 950 && b.y1 <= 1520, `${b.id}: ${b.what} is at x ${b.x0.toFixed(0)}-${b.x1.toFixed(0)}, y ${b.y0.toFixed(0)}-${b.y1.toFixed(0)}: clear of Instagram's right 130 px and bottom 400 px`);
    if (captioned) ok(b.y1 <= band[0] - 5 || b.y0 >= band[1] + 5, `${b.id}: ${b.what} (y ${b.y0.toFixed(0)}-${b.y1.toFixed(0)}) is under the captions (${band[0]}-${band[1]})`);
  }
  {
    // the card DETROIT, 1949 never gets down to the clerk's head (QA: it sat on his hair and, big, over his glasses): its lowest corner, falling (it grows upward from its bottom edge) and landed, against the top of his head (the rig's disc) in shot 8's view
    const cl = rig.clerk as unknown as { pivot: [number, number]; disc: [number, number, number] }, sc = DUST.k * DUST.s, neckY = (plates.counter - DUST.cut * DUST.k - DUST.v0) * DUST.s, headTop = neckY - (cl.pivot[1] - cl.disc[1] + cl.disc[2]) * sc;
    let low = 0;
    for (let f = fr(T.stamp) - 8; f < fr(shot("pileBowls").t0); f++) {
      const c = stampAt(f); if (!c.on) continue;
      const a = (c.rot * Math.PI) / 180, hw = (DETROIT.w / 2) * c.s * c.sx, hh = (DETROIT.h / 2) * c.s * c.sy;
      low = Math.max(low, detroitY(c.s) + hh * Math.abs(Math.cos(a)) + hw * Math.abs(Math.sin(a)));
    }
    ok(low <= headTop - 15, `the card DETROIT, 1949 comes down to y ${low.toFixed(0)} at the most (rotated, at its biggest), ${(headTop - low).toFixed(0)} px over the top of the clerk's head (y ${headTop.toFixed(0)})`);
  }
  ok(capBand("wideEnd")[0] > 260 && capBand("wideEnd")[1] < 520 && capBand("hook")[0] === CAP_BAND[0], "the last shot's captions are on the ceiling above the chairs, every other shot's in the usual band");
}

// ── the physics. A hit is a thing that happens on one frame; its sound is placed so that the clip's measured peak lands on that frame
const C = cues();
const PK = peaks as Record<string, number>;
for (const h of HITS) {
  const pk = PK[h.sfx], s = shot(h.shot);
  ok(pk !== undefined && existsSync(new URL(`../public/sfx/${h.sfx}.mp3`, import.meta.url)), `no measured peak or no file for ${h.sfx}`);
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
ok(C.every((c) => c.at >= 0 && c.at < T_END), "every cue is inside the picture");
ok(!C.some((c) => c.name === "typewriter"), "no typewriter: the keys are ticks");
// the projector's bed and the jazz: under the sepia shots only, and gone at the cut back to colour
{
  const bed = C.filter((c) => c.name === "filmbed"), jazz = C.filter((c) => c.name === "penstory");
  ok(bed.length >= 1 && Math.abs(bed[0].at - T.s8) < 1e-6 && jazz.length >= 1 && Math.abs(jazz[0].at - T.s14) < 1e-6, "the projector starts with the store and the jazz with the living room");
  const endOf = (cs: typeof bed) => Math.max(...cs.map((c) => c.at + (c.len ?? 10)));
  ok(endOf(bed) <= T.s31 + 0.6 && endOf(jazz) <= T.s31 + 1.4 && endOf(bed) >= T.s31 && endOf(jazz) >= T.s31 - 0.1, `the beds end with the story (projector ${endOf(bed).toFixed(2)}, jazz ${endOf(jazz).toFixed(2)}, the cut ${T.s31.toFixed(2)})`);
}
// a fall lands on its frame: at rest on it, still in the air the frame before; the squash is at its full size on the landing frame and none before, and it is at rest 0.7 s later
type Fall = { name: string; t: number; fall: number; h: (f: number) => number; sq: (f: number) => number };
const falls: Fall[] = [
  ...FORMS.map((t, i): Fall => ({ name: `form ${i + 1}`, t, fall: FORM_FALL, h: (f) => formAt(i, f).drop, sq: (f) => formAt(i, f).sq })),
  { name: "the card of the door", t: T.cardDrop, fall: CARDFALL, h: (f) => doorCardAt(f).drop, sq: (f) => doorCardAt(f).sq },
];
for (const x of falls) {
  const f = fr(x.t);
  ok(x.h(f) === 0 && x.h(f - 1) > 0, `${x.name}: at rest on frame ${f} (${x.h(f)}), in the air on ${f - 1} (${x.h(f - 1)})`);
  ok(Math.abs(x.sq(f) - 1) < 1e-9 && x.sq(f - 1) === 0, `${x.name}: the squash is 1 on the landing frame (${x.sq(f).toFixed(2)}) and none before (${x.sq(f - 1)})`);
  let lo = 0;
  for (let k = 1; k < 24; k++) lo = Math.min(lo, x.sq(f + k));
  ok(lo < -0.05 && lo > -0.6, `${x.name}: a small stretch follows the squash (${lo.toFixed(2)})`);
  ok(Math.abs(x.sq(f + 21)) < 0.1, `${x.name}: not at rest 0.7 s after the landing (${x.sq(f + 21).toFixed(2)})`);
  const f0 = f - Math.round(x.fall * FPS);
  let speeding = true;
  for (let k = f0 + 1; k < f; k++) if (!(x.h(k - 1) - x.h(k) >= x.h(k - 2) - x.h(k - 1) - 1e-9)) speeding = false;
  ok(speeding && x.h(f0 - 1) === 1 && x.h(f0) > 0.9, `${x.name} falls with gravity (each frame farther than the last) from frame ${f0} to ${f}`);
}
// the slides stop dead: the first frame is the fastest, no frame is faster than the one before it, and the last position is exactly 1
const slideRule = (name: string, p: (f: number) => number, t0: number, t1: number, shotEnd: number, steps = 5) => {
  let ok1 = p(fr(t0) - 1) === 0 && p(fr(t1)) === 1 && p(fr(t1) + 3) === 1, n = 0, prev = Infinity;
  for (let f = fr(t0); f < fr(t1); f++) { const d = p(f + 1) - p(f); if (d > prev + 1e-9) ok1 = false; prev = d; n++; }
  ok(ok1 && n >= steps, `${name} slows with friction (${n} frames) and stops dead on frame ${fr(t1)}`);
  ok(shotEnd - t1 >= 0.2 - 1e-6, `${name} stops ${(shotEnd - t1).toFixed(2)} s before the cut (the least is 0.2 s, to read it)`);
};
[0, 1, 2].forEach((i) => { const t0 = [T.slide1, T.slide2, T.slide3][i]; slideRule(`order form ${i + 1}`, (f) => slideAt(i, f).p, t0, t0 + SLIDE, shot("formsSlide").t1); });
ok(Math.abs(SLIDE * FPS - Math.round(SLIDE * FPS)) < 1e-9 && SLIDE * FPS >= 6 && SLIDE * FPS <= 8 && slideAt(0, fr(T.slide1) + 2).p <= 0.5, `a form slides for ${(SLIDE * FPS).toFixed(0)} frames (6-8) and has gone ${(slideAt(0, fr(T.slide1) + 2).p * 100).toFixed(0)} % of its way after 2 frames (QA: a 6-frame slide went 56 %, 475 px)`);
{
  // the forms on the table: the three of shot 22 stay there in the guests' close-ups and under the pile of shot 27 (QA: they vanished); a form of the pile starts to fall under the guests' chins (QA: one crossed a guest's eyes)
  const L = LIVING, P = L.pile, sc = P.gsc, story = readFileSync(new URL("../src/tup-story.tsx", import.meta.url), "utf8");
  const chinV = (c: "guest1" | "guest2" | "guest3") => { const g = rig[c]; return L.sofaFront - L.guestCut * sc - (g.pivot[1] - g.disc[1] - g.disc[2]) * sc; }; // the plate row of the guest's chin (the head disc's lower edge)
  const chinF = (Math.max(chinV("guest1"), chinV("guest2"), chinV("guest3")) - P.v0) * P.s;
  let top = 1e9;
  FORMS.forEach((_, i) => { top = Math.min(top, (L.table.v - 4 * i - P.v0) * P.s - P.fall - 90); }); // a form's middle at the start of its fall, less its half-diagonal (at most 90 px, turned)
  ok(top >= chinF + 20, `a form starts to fall ${P.fall} px over its place, its top edge ${(top - chinF).toFixed(0)} px under the lowest guest's chin (y ${chinF.toFixed(0)}): it never crosses a face`);
  ok((story.match(/<RestForms m=\{m\} \/>/g) ?? []).length === 2 && /const guestShot = [^\n]*<RestForms/.test(story) && /const FormsPile[^]*?<RestForms/.test(story) && L.rest.length === 3, "the three forms of shot 22 stay on the table in the guests' close-ups (shots 23-25) and under the pile of shot 27");
}
ok(slideAt(0, fr(T.slide1) - 1).on === false && slideAt(0, fr(T.slide1)).on === true && slideAt(1, fr(T.slide2) - 1).on === false && slideAt(2, fr(T.slide3) - 1).on === false, "each form is off the table until its own slide");
{
  // the gift: the man's hand (the box is in its palm, one picture) comes in from off the frame, slows at a constant rate and stops dead on the ding; the cut is 0.2 s later; in the next shot the gift lies over her brown box
  const t0 = T.s20 + 0.15;
  slideRule("the man's hand", handK, t0, T.handover, T.s21, 15);
  ok(handK(fr(T.s20)) === 0 && handK(fr(T.handover)) === 1, "the hand is off the frame when the shot opens and has stopped on the ding's frame");
  const bx = BROWN_BOX, g = GIFT_ON, gx0 = g.at[0] - (g.bodyW * g.k) / 2, gx1 = g.at[0] + (g.bodyW * g.k) / 2, gy1 = g.at[1], gy0 = g.at[1] - g.bodyH * g.k;
  ok(gx0 <= bx[0] && gx1 >= bx[2] && gy0 <= bx[1] && gy1 >= bx[3], `the gift's body (x ${gx0.toFixed(0)}..${gx1.toFixed(0)}, y ${gy0.toFixed(0)}..${gy1.toFixed(0)}) covers the brown box of her pose (x ${bx[0]}..${bx[2]}, y ${bx[1]}..${bx[3]}): the box is in her hands, never in the air`);
  ok(giftHop(fr(T.giftPop) - 1) === 0 && giftHop(fr(T.giftPop) + 2) > 6 && giftHop(fr(T.giftPop) + 2) <= 16 && giftHop(fr(T.giftPop) + 20) < 1, "the gift pops up in her hands on a spring (16 puppet px at most) and settles");
  ok(bodyAt("hostess", fr(T.s21)) === "box" && bodyAt("hostess", fr(T.s21) - 1) === "stand" && bodyAt("hostess", fr(shot("giftHand").t0)) === "stand", "she is in her box pose from the cut to the gift, standing in the shot before");
}
{
  // the shelf empties (shot 18; QA: stacks and a bowl floated across the clerk's face): the clerk, in his bowl pose, carries one stack on the bowl in his hands and walks out to the left; the other six leave on the loud
  // syllables of "In '51 they pulled 'em off the", one by one, along the counter, never up past his chin
  const s = shot("storeEmpty"), STK = plates.stacks, m = { s: EMPTY.s, u0: EMPTY.u0, v0: EMPTY.v0 };
  ok(STACK_T.length === STACKS && STACKS === 6 && STACK_ORDER.length === 6 && STACK_DIR.length === 6, "six stacks leave, six thuds");
  ok(new Set<number>([...STACK_ORDER, STACK_CARRIED]).size === 7 && [...STACK_ORDER, STACK_CARRIED].every((j) => j >= 0 && j < 7), "the six that leave and the one he carries are the seven of the shelf");
  ok(STACK_T.every((t, i) => (i === 0 || t - STACK_T[i - 1] >= 0.12) && t >= s.t0 + 0.15 && t <= s.t1 - 0.12 && Math.abs(t * FPS - fr(t)) < 1e-6), `the thuds are 0.12 s apart or more, inside the shot, on frames (${STACK_T.map((t) => t.toFixed(2)).join(" ")})`);
  ok(STACK_T.every((t) => LINE(10).peaks.some((p) => Math.abs(p.f - fr(t)) <= 1)), "each thud is on a loud syllable of the line (a peak of its loudness)");
  let all = true;
  STACK_T.forEach((t, i) => {
    const f = fr(t), a = stackAt(i, f - 3), b0 = stackAt(i, f - 1), c = stackAt(i, f), d = stackAt(i, f + 3);
    if (!(a.gone === false && a.dy === 0 && a.dx === 0 && b0.sy < 1 && c.dy === 0 && c.dx === 0 && !c.gone && Math.abs(d.dx) > 20 && d.dy > 4 && Math.sign(d.dx) === STACK_DIR[i] && stackAt(i, f + fr(0.5) + 1).gone)) all = false;
    for (let j = i + 1; j < STACKS; j++) if (Math.abs(stackAt(j, f + 3).dx) > 1e-9 || stackAt(j, f + 3).dy > 1e-9 || stackAt(j, f + 3).gone) all = false; // the later stacks have not moved yet (the next one may be in its 2-frame squash)
  });
  ok(all, "each stack sits still, squashes for 2 frames, hops and slides off on its thud's frame to its own side, and is gone 0.5 s later; the next ones have not moved");
  ok(stackAt(STACKS - 1, fr(s.t1) - 1).gone && STACK_T[STACKS - 1] + 0.5 <= s.t1 - 0.05, "the shelf is bare 0.05 s before the cut");
  // nothing crosses his face: the clerk's head (the rig's disc, puppet px from his neck pivot) at his scale on the plate, walking left; each stack, with its hop and its 6 degrees of tilt, is either under the head's lower edge or beside it
  {
    const cl = rig.clerk as unknown as { pivot: [number, number]; disc: [number, number, number] }, sc = EMPTY.clerk.sc, neckV = plates.counter - EMPTY.clerk.cut * sc;
    const headR = cl.disc[2] * sc, headBottom = neckV - (cl.pivot[1] - cl.disc[1] - cl.disc[2]) * sc, headTop = headBottom - 2 * headR;
    let cross = 0, near = 1e9, carryTop = 1e9;
    const walkU = (f: number) => EMPTY.clerk.u + CLERK_WALK.dx * walkK(f), C = plates.carry;
    for (let f = fr(s.t0); f < fr(s.t1); f++) {
      const hx0 = walkU(f) - headR, hx1 = walkU(f) + headR;
      STACK_ORDER.forEach((j, i) => {
        const q = stackAt(i, f); if (q.gone) return;
        const k = STK[j], top = k.top - q.dy / m.s - 5 /* tilt */, x0 = k.x0 + q.dx / m.s - 11, x1 = k.x0 + k.w + q.dx / m.s + 11;
        if (x1 > hx0 && x0 < hx1) { near = Math.min(near, top - headBottom); if (top < headBottom + 2) cross++; }
      });
      carryTop = Math.min(carryTop, neckV + EMPTY.carryFoot * sc - C.h - walkStep(f) * sc); // the foot of his stack is carryFoot puppet px under his neck; it is C.h plate px tall; the bob lifts it
    }
    ok(cross === 0, `no stack reaches the clerk's head (the nearest is ${near > 1e8 ? "never beside it" : near.toFixed(0) + " plate px under his chin"}); ${cross} frames where one does`);
    ok(carryTop >= headBottom + 4, `the stack he carries stays ${(carryTop - headBottom).toFixed(0)} plate px under his chin (his bob included)`);
    ok(walkK(fr(s.t0)) === 0 && walkK(fr(s.t1) - 1) > 0.99 && walkU(fr(s.t1) - 1) + headR < EMPTY.u0 && CLERK_WALK.t0 >= s.t0 + 0.1 && CLERK_WALK.t1 <= s.t1 - 0.1 && CLERK_WALK.dx < 0, `he walks out to the left over ${(CLERK_WALK.t1 - CLERK_WALK.t0).toFixed(2)} s and is off the frame (his head's right edge at plate x ${(walkU(fr(s.t1) - 1) + headR).toFixed(0)}, the frame starts at ${EMPTY.u0}) 0.1 s before the cut`);
    let bob = 0, oddStep = 0;
    for (let f = fr(s.t0); f < fr(s.t1) - 1; f++) { bob = Math.max(bob, walkStep(f)); if (f % 2 === 0 && walkStep(f) !== walkStep(f + 1)) oddStep++; }
    ok(bob > 8 && bob <= 14 && oddStep === 0 && walkStep(fr(s.t0)) === 0 && walkStep(fr(CLERK_WALK.t1) + 2) === 0, `his steps bob him up to ${bob.toFixed(0)} puppet px on twos while he walks, and he stands still before and after`);
  }
}
// the lid (shot 11): the fingertip presses its edge on lidPress, on lidPop it pops off the bowl and goes 330 px up, spins over once, comes down on the counter beside the bowl on lidLand (on the frame of the clatter),
// bounces three times (QA: it used to land flat), rocks to a rest in a puff of dust; gravity makes the parabola
{
  const a = fr(T.lidPop), z = fr(T.lidLand);
  let apex = -1e9, tApex = 0, para = true, strobe = 0, below = 0;
  for (let f = a; f < z; f++) { const y = lidAt(f).y; if (y > apex) { apex = y; tApex = f; } below = Math.min(below, y); strobe = Math.max(strobe, Math.abs(Math.acos(Math.max(-1, Math.min(1, lidAt(f + 1).sy))) - Math.acos(Math.max(-1, Math.min(1, lidAt(f).sy)))) * (180 / Math.PI)); }
  for (let f = tApex + 1; f < z - 1; f++) { const dd = lidAt(f + 1).y - 2 * lidAt(f).y + lidAt(f - 1).y; if (!(dd < -1)) para = false; }
  ok(lidAt(fr(T.lidPress) - 1).on === false && lidAt(fr(T.lidPress) - 1).rot === 0 && lidAt(a - 1).on === false && lidAt(a - 1).rot > 3 && lidAt(a - 1).y < -2 && lidAt(a).on, "the lid sits, the pressed edge dips, and on the pop frame it is in the air");
  ok(apex > 280 && apex < 380 && tApex - a >= 3 && tApex - a <= 10, `it goes ${apex.toFixed(0)} px up and peaks after ${tApex - a} frames`);
  ok(para, "it falls with gravity (a parabola: the same step of speed on every frame)");
  ok(Math.abs(lidAt(z).y - LID.floor) < 1e-6 && lidAt(z - 1).y > LID.floor + 8 && Math.abs(lidAt(z).x - LID.dx) < 1e-6 && Math.abs(lidAt(z).sy - 1) < 0.02 && below >= LID.floor - 1e-6, `it lands on the counter (${LID.floor} px) on frame ${z}, in the air the frame before, flat and ${LID.dx} px to the left`);
  const ys: number[] = [];
  for (let f = z; f < z + fr(0.8); f++) ys.push(lidAt(f).y - LID.floor);
  const tops = ys.filter((y, i) => i > 0 && i < ys.length - 1 && y > ys[i - 1] && y >= ys[i + 1] && y > 1);
  let rock = 0, still = 0;
  for (let f = z; f < z + fr(0.3); f++) rock = Math.max(rock, Math.abs(lidAt(f).rot));
  for (let f = z + fr(0.7); f < z + fr(0.8); f++) still = Math.max(still, Math.abs(lidAt(f).rot), Math.abs(lidAt(f).y - LID.floor));
  ok(tops.length >= 2 && tops[0] >= 45 && tops[0] <= 65 && tops[1] >= 12 && tops[1] <= 30 && tops.every((a, i) => !i || a < tops[i - 1]) && ys.slice(fr(0.5)).every((y) => y < 1e-9), `it bounces ${tops.map((a) => a.toFixed(0)).join(", ")} px (each lower than the last) and has stopped bouncing after 0.5 s`);
  ok(rock > 5 && rock <= 12 && still < 0.5 && lidAt(z).sq === 1 && lidAt(z - 1).sq === 0, `it rocks ${rock.toFixed(0)} degrees after the landing and lies still 0.7 s later (${still.toFixed(2)}), with the squash on the landing frame`);
  ok(BOUNCES.length === 3 && BOUNCES.every((b, i) => !i || (b.h < BOUNCES[i - 1].h && b.T < BOUNCES[i - 1].T)) && BOUNCES.every((b) => Math.abs((8 * b.h) / (b.T * b.T) - 8950) < 300), "the three bounces are shorter and quicker each time, on the same gravity (about 8950 px/s2)");
  const storySrc = readFileSync(new URL("../src/tup-story.tsx", import.meta.url), "utf8");
  ok(HITS.some((h) => h.id === "clatter" && h.sfx === "clatter" && h.t === T.lidLand) && /t0: T\.lidLand - 0\.02/.test(storySrc) && /<DustCloud[^>]*cfg=\{dust\}/.test(storySrc), "the clatter is on the landing frame and a puff of dust comes off the counter with it");
  ok(strobe <= 60, `it turns over at most ${strobe.toFixed(0)} degrees a frame`);
  ok(T.s12 - T.lidLand >= 0.2 - 1e-6, `it has settled ${(T.s12 - T.lidLand).toFixed(2)} s before the cut`);
  ok(shopperK(fr(T.lidPress)) > 0.99 && shopperK(fr(T.lidPress) - 8) < 0.5 && shopperK(fr(T.lidPop) + 8) < 0.3 && shopperK(fr(T.lidPress) - 1) < 1, "the shopper's finger comes down and is on the lid's edge on the press's frame, and lifts away after the pop");
}
// the burp (shot 13): her fingertip is on the lid's middle from "burp", the lid squashes about 5 % until burpT, then springs back past rest and rings out; the puff, the burp and the ding; then the guests gasp
{
  const b = fr(T.burpT);
  let hi = 0, lo = 0, mono = true;
  for (let f = fr(T.press); f < b; f++) { hi = Math.max(hi, lidSquash(f)); if (lidSquash(f + 1) < lidSquash(f)) mono = false; }
  for (let f = b; f < b + 20; f++) lo = Math.min(lo, lidSquash(f));
  ok(lidSquash(fr(T.press) - 1) === 0 && mono && hi > 0.04 && hi < 0.06 && lo < -0.01 && lo > -0.1 && Math.abs(lidSquash(b + 21)) < 0.005, `the lid squashes ${(hi * 100).toFixed(1)} % under the finger, springs ${(-lo * 100).toFixed(1)} % past rest and settles`);
  ok(burpFinger(fr(T.press)) > 0.99 && burpFinger(b - 1) > 0.99 && burpFinger(b + 8) < 0.2 && burpFinger(fr(T.press) - 12) < 0.3, "the finger is on the lid from 'burp' to the burp, and lifts after it");
  ok(T.ding1 > T.burpT && T.s14 - T.ding1 >= 0.05 && T.press > LINE(7).words[7].t - 0.02 && T.press < LINE(7).words[7].t + 0.02 && T.burpT >= LINE(7).tend && T.gaspT > T.s14, "the burp comes after the line, the ding after the burp, the gasp after the cut");
  const gp = fr(T.gaspT);
  ok(gaspAt(gp - 1).up === 0 && gaspAt(gp).up > 15 && gaspAt(gp).o && gaspAt(gp + fr(0.7)).up < 1 && !gaspAt(gp + fr(0.7)).o, "the guests jolt up on the gasp's frame and settle");
  ok(poseAt("guest2", gp + 2).mouth === "o" && poseAt("guest1", gp - 2).mouth === "closed", "their mouths are an 'o' on the gasp");
  ok(T.gaspT < LINE(8).first - 0.1, `the gasp (${T.gaspT.toFixed(2)}) comes before the line (${LINE(8).first.toFixed(2)})`);
}
// the clerk: he leans in and blows on the puff's peak (an "o" mouth), the dust is on the puff, the card lands on "1949."; he yawns in "Nobody buys 'em in stores." and shrugs on "lid."
{
  const p = fr(T.puff);
  ok(blowK(p) === 1 && blowK(p - 8) < 0.9 && blowK(p + 10) < 0.5 && blowing(p) && !blowing(p - 6) && poseAt("clerk", p).mouth === "o" && poseAt("clerk", p - 8).mouth !== "o", "the clerk leans in, blows on the puff's frame with an 'o', and straightens");
  const s = stampAt(fr(T.stamp));
  ok(stampAt(fr(T.stamp) - fr(0.4)).on === false && stampAt(fr(T.stamp) - 7).on && stampAt(fr(T.stamp) - 1).s > 1.1 && Math.abs(s.s - 1) < 0.01 && s.sx > 1.05 && Math.abs(T.stamp - LINE(5).words[1].t) < 0.5 / FPS, "the card falls from big and stamps in on '1949.' with a squash");
  ok(yawnK(fr(T.s10 + 0.65)) > 0.99 && yawnK(fr(T.s10)) === 0 && yawnK(fr(T.s10 + 1.6)) === 0 && T.s10 + 1.55 < shot("storeWide").t1, "the yawn peaks inside 'Nobody buys 'em in stores.' and is over before the cut");
}
// the dust and the puff are in the picture: the puff's frame is inside its shot
// the newspaper (29): it spins in over the dark hall (a turn of 360 degrees, slowing at a constant rate, at most 60 degrees a frame), and stops dead on the thud with a small wobble that dies in 0.5 s
{
  const a = fr(T.s29), z = fr(T.paperStop);
  let strobe = 0, slows = true, prev = Infinity;
  for (let f = a; f < z; f++) { const d = Math.abs(paperAt(f + 1).rot - paperAt(f).rot); strobe = Math.max(strobe, d); if (d > prev + 0.5) slows = false; prev = d; }
  ok(paperAt(a - 1).on === false && paperAt(a).on && strobe <= 60 && slows, `the newspaper turns at most ${strobe.toFixed(0)} degrees a frame and slows down (a turn of 360)`);
  const p0 = paperAt(z), late = paperAt(z + fr(0.55));
  ok(Math.abs(p0.s - 1) < 0.05 && Math.abs(late.rot - -2) < 0.3 && Math.abs(late.s - 1) < 0.005 && Math.abs(paperAt(z - 1).rot - p0.rot) < 40, `it stops on frame ${z} (size ${p0.s.toFixed(2)}), the wobble is gone after 0.55 s`);
  ok(T.s30 - T.paperStop >= 1.5, `the page stands still and readable for ${(T.s30 - T.paperStop).toFixed(2)} s (at least 1.5 s) before the sum's close-up`);
  ok(paperPush(fr(T.s30)) === 0 && paperPush(fr(T.s30) + fr(0.7)) === 1 && T.s30 + 0.6 < LINE(19).start, "the page slides up to the sum while 'company.' is said and has stopped before 'Sixteen million.'");
}
// the phone buzzes (shot 32): a buzz shake, the bubble pops in on it, and the text is readable for at least 1.7 s
{
  const b = (t: number) => buzzAt(fr(t));
  ok(b(T.buzz - 0.05).wig === 0 && b(T.buzz + 0.1).wig !== 0 && b(T.buzz + 0.35).wig === 0 && b(T.buzz - 0.05).pop === 0 && Math.abs(b(T.buzz + 0.6).pop - 1) < 0.03 && T.buzz - T.s32 >= 0.1, "the phone buzzes in her hand and the bubble pops in on the buzz");
  let pop = 0;
  for (let f = fr(T.buzz); f < fr(T.s33); f++) if (buzzAt(f).pop >= 0.95) { pop = f; break; }
  ok(pop > 0 && T.s33 - pop / FPS >= 1.7, `the text is readable ${(T.s33 - pop / FPS).toFixed(2)} s from the frame its bubble has popped to the cut (at least 1.7 s)`);
}
// the stamp (shot 35): 47% LOST MONEY falls from 1.4 times its size, below her face all the way (QA: from 2.5 times its red lines crossed her eyes), slams on `stampT`, rebounds to 0.95 of its size and settles, with a squash,
// a thud and a small shake of the frame; it sits on a paper patch (the red letters read over a hoodie, a phone, chips); it stays; its source line is under it, readable 1.2 s
{
  const t = fr(T.stampT), s0 = bigStampAt(t);
  let hi = 0, lo = 9;
  for (let k = 0; k < 24; k++) { lo = Math.min(lo, bigStampAt(t + k).s); if (k) hi = Math.max(hi, bigStampAt(t + k).s); }
  ok(!bigStampAt(t - 6).on && bigStampAt(t - 5).on && Math.abs(bigStampAt(t - 5).s - 1.4) < 0.02 && bigStampAt(t - 1).s > 1.05 && bigStampAt(t - 1).s < bigStampAt(t - 2).s && bigStampAt(t - 2).s < bigStampAt(t - 3).s, "the stamp is off the frame, then falls in from 1.4 times its size (5 frames, speeding up)");
  ok(Math.abs(s0.s - 0.95) < 0.011 && lo >= 0.945 && hi > 1.005 && hi <= 1.03 && Math.abs(bigStampAt(t + 21).s - 1) < 0.01 && s0.sx > 1.05 && s0.sy < 0.95 && Math.abs(bigStampAt(t - 1).sx - 1) < 1e-9, `it lands at ${s0.s.toFixed(2)} of its size, rebounds to ${hi.toFixed(2)}, settles at 1 and squashes on the landing frame`);
  {
    // below her face the whole way: the stamp's rotated rectangle (the frame, falling and rebounding) against her chin (the rig's head disc at the framing of the shot), over the width of her face
    const F = DEN.denStamp!, dd = (rig.denisePen as unknown as { disc: [number, number, number] }).disc, R = dd[2] * F.E, chin = F.head[1] + R;
    let gap = 1e9, tAt = 0;
    for (let f = t - 5; f < t + 24; f++) {
      const q = bigStampAt(f), a = (q.rot * Math.PI) / 180, hw = (STAMP_FR.w / 2) * q.s * q.sx, hh = (STAMP_FR.h / 2) * q.s * q.sy, cy = STAMP_FR.y + q.dy;
      const cs: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([ox, oy]) => [STAMP_FR.x + ox * Math.cos(a) + oy * Math.sin(a), cy - ox * Math.sin(a) + oy * Math.cos(a)]);
      for (let e = 0; e < 4; e++) for (let k = 0; k <= 80; k++) {
        const x = cs[e][0] + ((cs[(e + 1) % 4][0] - cs[e][0]) * k) / 80, y = cs[e][1] + ((cs[(e + 1) % 4][1] - cs[e][1]) * k) / 80, dx = x - F.head[0];
        if (Math.abs(dx) < R * 0.98 && y - (F.head[1] + Math.sqrt(R * R - dx * dx)) < gap) { gap = y - (F.head[1] + Math.sqrt(R * R - dx * dx)); tAt = f; } // the stamp's edge against the lower arc of her head
      }
    }
    ok(gap >= 4, `the stamp's top edge stays ${gap.toFixed(0)} px under the lower arc of her head (the chin is at y ${chin.toFixed(0)}) the whole way, the least on frame ${tAt}`);
    ok(SOURCE_FR.y - SOURCE_FR.h / 2 >= STAMP_FR.y + (STAMP_FR.h / 2) * hi + 20, `the source line (top y ${(SOURCE_FR.y - SOURCE_FR.h / 2).toFixed(0)}) is clear of the stamp's bottom edge (y ${(STAMP_FR.y + (STAMP_FR.h / 2) * hi).toFixed(0)} at its largest)`);
    const ui = readFileSync(new URL("../src/tup-ui.tsx", import.meta.url), "utf8");
    const lum = (hex: string) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const red = /const red = "(#[0-9a-fA-F]{6})"/.exec(ui)?.[1], patch = /destination-over[^\n]*\n\s*g\.fillStyle = "(#[0-9a-fA-F]{6})"/.exec(ui)?.[1];
    const ratio = red && patch ? (lum(patch) + 0.05) / (lum(red) + 0.05) : 0;
    ok(ratio >= 4.5, `the red of "47%" on its paper patch has a contrast of ${ratio.toFixed(1)}:1 (the least is 4.5:1; over the hoodie it was about 2:1)`);
  }
  let sh = 0;
  for (let k = 0; k < 6; k++) sh = Math.max(sh, Math.hypot(...stampShake(t + k)));
  ok(Math.hypot(...stampShake(t - 1)) === 0 && sh > 8 && sh < 22 && Math.hypot(...stampShake(t + fr(0.55))) === 0, `the frame shakes ${sh.toFixed(0)} px on the slam and is still 0.5 s later`);
  const full = (() => { for (let f = t; f < fr(T.s36); f++) if (bigStampAt(f).src >= 0.99) return f; return -1; })();
  ok(full > 0 && T.s36 - full / FPS >= 1.2 && bigStampAt(fr(T.s36) - 1).on, `the source line is readable ${(T.s36 - full / FPS).toFixed(2)} s (at least 1.2 s), under the stamp, which stays`);
  ok(Math.abs(T.stampT - LINE(21).words[9].t) < 0.5 / FPS && T.stampT > T.s35 + STAMPFALL, "the stamp lands on 'Almost' (the first word after the pause) and 'half lost money' is said over it");
}
// who wears what, shot by shot: Denise in the lawn chair with her phone, Rhonda in her chair with the can, the clerk standing, the hostess standing / the lidded bowl / the box
{
  const WEARS: [Char, string, ShotId[]][] = [
    ["denisePen", "chairPhone", ["denSupport", "denParty", "dive", "denChew", "denLooks", "denPhone", "denStamp", "denMarketing", "wideEnd"]], ["rhondaPen", "chair", ["rhoBrow", "rhoStore", "rhoLook", "rhoGroup", "rhoSurvey", "wideEnd"]],
    ["clerk", "stand", ["storeDust", "storeWide", "clerkShrug"]], ["clerk", "bowl", ["storeEmpty"]], ["hostess", "stand", ["gasp", "hostessBrownie", "giftHand"]], ["hostess", "bowl", ["hostessHolds"]], ["hostess", "box", ["giftBeam", "hostessSells", "formsPile"]],
  ];
  let wrong = 0;
  for (const [c, body, ids] of WEARS) for (const id of ids) {
    const s = shot(id);
    for (let f = fr(s.t0); f < fr(s.t1); f++) if (bodyAt(c, f) !== body) { wrong++; if (wrong < 6) console.log(`FAIL ${c} is in ${bodyAt(c, f)} on frame ${f} of ${id} (${body}): ${f === fr(s.t0) ? "the first frame" : f === fr(s.t1) - 1 ? "the last frame" : "inside the shot"}`); }
  }
  ok(wrong === 0, `${wrong} frames where a character is not in the shot's own pose`);
}
// no pupil hides under a lid: on every frame, for everyone on screen, each pupil's centre is below the lid's edge by at least its radius (src/pen-eyes.ts); a blink is the only frame with the eyes shut
{
  let bad2 = 0, worst = Infinity, n = 0;
  for (let f = 0; f < FRAMES; f++) for (const c of SEEN[shotAt(f).id]) {
    if (BLINKS[c].some((s) => f >= s && f < s + 3)) continue;
    if (c === "clerk" && yawnK(f) > 0.02) continue; // his eyes close for the yawn
    const p = poseAt(c, f);
    if (p.lid >= 0.9) continue;
    for (let i = 0; i < 2; i++) { const k = clearance(c, i, p.lid, p.gaze, p.pupil); n++; worst = Math.min(worst, k); if (k < -1e-6) { bad2++; if (bad2 < 6) console.log(`FAIL ${c} eye ${i} on frame ${f} (${shotAt(f).id}): the pupil is ${(-k).toFixed(1)} px under the lid (lid ${p.lid.toFixed(2)}, gaze ${p.gaze.map((v) => v.toFixed(2))})`); } }
  }
  ok(bad2 === 0, `${bad2} pupils under a lid`);
  console.log(`pupils: ${n} eyes checked, the least clearance ${worst.toFixed(1)} px`);
}
// every shot is in its own poses on its first and its last frame too (done above); the small moves are on twos
{
  let odd = 0;
  for (let f = 0; f < FRAMES; f += 2) { if (chewMouth(f) !== chewMouth(f + 1)) odd++; if (nodAt(f) !== nodAt(f + 1)) odd++; }
  ok(odd === 0 && twos(7) === 6 && twos(8) === 8, `${odd} values change on an odd frame`);
}
// nobody is cut by the frame's edge (QA: the hostess of the gasp lost her hair and arm at the right; Rhonda's afro touched the right edge in the last wide and on the cover): the widest picture of each character (the rig's
// layers, puppet px from the neck pivot) at its scale keeps a margin of 40 px
{
  type Rig = { pivot: [number, number]; layers: { head: { x: number; w: number } }; bodies?: Record<string, { x: number; w: number }> };
  const reach = (c: "hostess" | "rhondaPen" | "denisePen", bodies: string[]) => {
    const r = rig[c] as unknown as Rig, ls = [r.layers.head, ...bodies.map((b) => r.bodies![b])];
    return [Math.max(...ls.map((l) => r.pivot[0] - l.x)), Math.max(...ls.map((l) => l.x + l.w - r.pivot[0]))] as const; // how far the character reaches left and right of its neck pivot
  };
  const [hl, hr] = reach("hostess", ["stand"]), gx = (GASP.hostess.u - GASP.u0) * GASP.s, gk = GASP.hostess.sc * GASP.s;
  ok(gx - hl * gk >= 40 && gx + hr * gk <= 1040, `the hostess of the gasp (shot 14) reaches x ${(gx - hl * gk).toFixed(0)}-${(gx + hr * gk).toFixed(0)}, ${(1080 - gx - hr * gk).toFixed(0)} px from the right edge (the least is 40)`);
  {
    // her head is under the guests' chins: the top of her hair against the lowest chin of the three (the rig's head discs), in frame px
    const hs = rig.hostess as unknown as { pivot: [number, number]; layers: { head: { y: number } }; bodies: Record<string, { y: number; h: number }> };
    const up = hs.pivot[1] - hs.layers.head.y, down = hs.bodies.stand.y + hs.bodies.stand.h - hs.pivot[1], k = GASP.hostess.sc * GASP.s;
    const top = GASP.hostess.feet * GASP.s - (up + down) * k;
    const chin = Math.max(...(["guest1", "guest2", "guest3"] as const).map((c) => { const g = rig[c]; return (LIVING.sofaFront - LIVING.guestCut * GASP.gsc - (g.pivot[1] - g.disc[1] - g.disc[2]) * GASP.gsc - GASP.v0) * GASP.s; }));
    ok(top >= chin + 10 && GASP.hostess.feet * GASP.s <= 1800, `the hostess of the gasp stands with the top of her hair at y ${top.toFixed(0)}, ${(top - chin).toFixed(0)} px under the guests' chins (y ${chin.toFixed(0)}), so no gasping face is hidden; her feet are at y ${(GASP.hostess.feet * GASP.s).toFixed(0)}`);
  }
  const [rl, rt] = reach("rhondaPen", ["chair", "beers"]), [dl] = reach("denisePen", ["chairPhone"]);
  ok(END.rho[0] + rt * END.E <= 1040 && END.rho[0] - rl * END.E >= 0 && END.den[0] - dl * END.E >= 40 , `the last wide and the cover: Rhonda's hair reaches x ${(END.rho[0] + rt * END.E).toFixed(0)} (${(1080 - END.rho[0] - rt * END.E).toFixed(0)} px from the right edge, the least is 40), Denise's x ${(END.den[0] - dl * END.E).toFixed(0)} from the left`);
}
// no black bar at a plate's edge: every view of a plate (768 x 1344) covers the whole frame (the garage's framings of src/tup-layout.ts, every `view(...)` written in src/tup-scenes.tsx and src/tup-story.tsx)
{
  const covers = (s: number, u0: number, v0: number) => u0 >= -1e-6 && v0 >= -1e-6 && u0 + 1080 / s <= 768 + 1e-6 && v0 + 1920 / s <= 1344 + 1e-6;
  let bad3 = 0, n = 0;
  const views: [string, number, number, number][] = [
    ["formsPile", LIVING.pile.s, LIVING.pile.u0, LIVING.pile.v0], ["storeEmpty", EMPTY.s, EMPTY.u0, EMPTY.v0], ["gasp", GASP.s, GASP.u0, GASP.v0],
    ...Object.entries(DEN).map(([id, v]): [string, number, number, number] => [id, v!.s, v!.u0, v!.v0]), ...Object.entries(RHO).map(([id, v]): [string, number, number, number] => [id, v!.s, v!.u0, v!.v0]), ["wideEnd", END.s, END.u0, END.v0],
  ];
  const src = ["tup-scenes.tsx", "tup-story.tsx"].map((x) => readFileSync(new URL(`../src/${x}`, import.meta.url), "utf8")).join("\n");
  for (const m of src.matchAll(/\bview\(([\d.]+), ([\d.-]+), ([\d.-]+)\)/g)) views.push([`view(${m[1]}, ${m[2]}, ${m[3]})`, +m[1], +m[2], +m[3]]);
  for (const [name, s, u0, v0] of views) { n++; if (!covers(s, u0, v0)) { bad3++; console.log(`FAIL the view ${name} runs past its plate: u ${u0}-${(u0 + 1080 / s).toFixed(1)}, v ${v0}-${(v0 + 1920 / s).toFixed(1)}`); } }
  ok(bad3 === 0 && n > 25, `${n} views, ${bad3} run past their plate`);
}
// no scene loads a picture outside its canvas: a component that renders <Panel> itself and also calls a texture hook (useImages, useHandPhone, ...) suspends in the page's tree, and Remotion's render hangs at that shot's first
// frame ("Waiting for <ThreeCanvas/> to be created", the lid shot); those scenes are made by shot() (src/tup-shared.tsx), which puts the hooks inside the canvas
{
  const hooks = /\b(useImages|useHandPhone|useLoader|useCanvasTexture|useTexture)\(/;
  let bad4 = 0, n = 0;
  for (const x of ["tup-scenes.tsx", "tup-story.tsx"]) {
    const src = readFileSync(new URL(`../src/${x}`, import.meta.url), "utf8");
    for (const chunk of src.split(/^(?=(?:export )?(?:function|const) )/m)) {
      if (!/<Panel\b/.test(chunk)) continue;
      n++;
      if (hooks.test(chunk)) { bad4++; console.log(`FAIL ${x}: "${chunk.split("\n")[0].slice(0, 50)}" renders <Panel> itself and calls a texture hook`); }
    }
  }
  ok(bad4 === 0 && n >= 3, `${n} components render a <Panel> themselves and none of them loads a picture (the others are made by shot(), which keeps the loads inside the canvas)`);
}
// where a hit lands on a spoken word (the duck takes 8 dB off it): printed, not forbidden
const onWord = HITS.map((h) => ({ h, w: LINES.flatMap((l) => l.words.map((w) => ({ w, n: l.n }))).find((x) => h.t >= x.w.t - 0.01 && h.t <= x.w.e) })).filter((x) => x.w);
console.log("hits that land on a spoken word (ducked):", onWord.map((x) => `${x.h.id} on "${x.w!.w.d}" (line ${x.w!.n})`).join(", ") || "none");
console.log(`captions ${CAPS.length}, hits ${HITS.length}, cues ${C.length}, share "${SHARE}" ${T.share.toFixed(2)}-${T.end.toFixed(2)}`);
console.log("captions:", CAPS.map((c) => `${c.t0.toFixed(2)}-${c.t1.toFixed(2)} ${c.text}`).join(" | "));
console.log("bleep caption:", CAPS.filter((c) => c.text.includes("*")).map((c) => c.text).join(" | "));
console.log(bad ? `${bad} check(s) failed` : "all checks passed");
process.exit(bad ? 1 : 0);
