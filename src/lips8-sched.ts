// The timeline and the acting of "Cold Lips" v8 (src/Lips8.tsx, docs/x06-cold-lips.md, Script v8). Pure data and arithmetic, the shape of src/lips-sched.ts (v2): every number is a function of the frame, of the voice
// takes in public/lips8/timings.json and of the mouth loudness in src/amp-lips8.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the
// lead and the gaps of episodes/lips8.jsonc carry the silent beats): every cut and action hangs on a take (before its first sound, after its last, in a pause) or on a fixed beat after one, never on a free number.
// What changed from v2: a hook of four pictures in 3.5 s (the throw, Denise soaked with the cup landing on her head, her purple face, the phone jabbed at Denise), more beats in the middle, the foot rub instead of the kiss,
// and an ending that loops into frame one (her arm cocks back to throw), with no share line.
import timings from "../public/lips8/timings.json" with { type: "json" };
import amps from "./amp-lips8.json" with { type: "json" };
import lipsRig from "./lips-rig.json" with { type: "json" };
import tipRig from "./tip-rig.json" with { type: "json" };
import { FPS, bump, clamp01, dropH, ease, hash, keys, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape, type Pose } from "./pen-sched.ts";
import { lidEdge } from "./pen-eyes.ts";
import { pupilAt } from "./sp-eyes.ts";
import { lerp } from "./sp-math.ts";

export { FPS, bump, clamp01, dropH, ease, hash, keys, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape, Pose };
export type LPose = Pose & { hdx: number; mdy: number };

/** customer: the woman with the dog in her purse; todd: the manager; deniseHood: Denise in the apron; lineA-D: the line behind her (the cast of "Tip?") */
export type Char = "customer" | "todd" | "deniseHood" | "lineA" | "lineB" | "lineC" | "lineD";
export const QUEUE: Char[] = ["lineA", "lineB", "lineC", "lineD"];

// ── the voice takes
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Peak = { f: number; a: number; sign: 1 | -1 };
export type Line = { n: number; who: string; char: Char; file: string; ofs: number; text: string; words: Word[]; first: number; start: number; end: number; tend: number; amp: number[]; f0: number; peaks: Peak[]; voiced: [number, number][] };
const CHAR_OF: Record<string, Char> = { CUSTOMER: "customer", TODD: "todd", DENISE: "deniseHood" };
function peaksOf(l: Omit<Line, "peaks">): { f: number; a: number }[] {
  const out: { f: number; a: number }[] = [];
  for (let f = Math.floor(l.first * FPS) - 1; f <= Math.ceil(l.end * FPS); f++) {
    const i = f - l.f0, v = l.amp[i] ?? 0;
    if (v < 0.3 || !(v > (l.amp[i - 1] ?? 0) && v >= (l.amp[i + 1] ?? 0))) continue;
    const valley = Math.min(...[1, 2, 3, 4, 5, 6].map((k) => l.amp[i - k] ?? 0));
    if (v - valley < 0.15) continue;
    if (out.length && f - out[out.length - 1].f < 5) { if (v > out[out.length - 1].a) out[out.length - 1] = { f, a: v }; continue; }
    out.push({ f, a: v });
  }
  return out;
}
export const LINES: Line[] = (() => {
  const count: Record<string, number> = {};
  return TK.takes.map((t) => {
    const ofs = P(t.n), amp = AMP[t.file].amp;
    const words = t.words.map((w) => ({ ...w, t: ofs + w.t, e: ofs + w.e }));
    const char = CHAR_OF[t.character];
    const i0 = amp.findIndex((a) => a >= 0.1);
    const base = { n: t.n, who: t.character, char, file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
    const k = count[char] ?? 0;
    const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: ((k + j) % 2 === 0 ? 1 : -1) as 1 | -1 }));
    count[char] = k + peaks.length;
    return { ...base, peaks };
  });
})();
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;
const L = LINE;
const linesOf = (c: Char) => LINES.filter((l) => l.char === c);

// ── the cuts and the named moments (seconds)
const spk = (n: number, d = 0.06) => snap(Math.min(L(n).first, L(n).start, L(n).voiced[0][0]) - d); // a speaker cut: d s before the take's first sound or its first word
const aft = (n: number, d = 0.05) => snap(L(n).tend + d); // d s after the take's last sound
function pauseMid(n: number): number { // the middle of the longest silence inside a take
  const v = L(n).voiced;
  let best = 0, at = 0;
  for (let i = 1; i < v.length; i++) if (v[i][0] - v[i - 1][1] > best) { best = v[i][0] - v[i - 1][1]; at = (v[i][0] + v[i - 1][1]) / 2; }
  return at;
}
const W = (n: number, i: number) => L(n).words[i];
export const REVIEW = "Cold hands. Never coming back.";

// the hook: frame 0 is mid-throw (the reel loops into it from the wind-up of the last shot), the coffee hits Denise on `hit`, the empty cup lands on her head, then her purple face and the phone jabbed at Denise
const hit = snap(0.1), s2 = snap(0.4), cupLand = snap(0.72);
const s3 = spk(1, 0.06); // "TOO": her purple face, the dog snarling in her purse
const s3b = snap(W(1, 1).t); // "HOT!": her face close (the scream has no pause: the cut lands on the word; four test viewers left at 1.6 s while one picture held the whole "TOO HOT!")
const s4 = snap(W(1, 2).t); // "I'm leaving a BAD REVIEW!": the cut lands on the word "I'm" (the scream has no pause), the phone comes at the camera
const badT = snap(W(1, 5).t); // "BAD": the phone's zoom pulse
const s5 = aft(1, 0.04); // the vault: Todd springs up from behind the counter and lands on his knees in the coffee at her feet
const launch = snap(s5 + 0.08), land = snap(launch + 0.3);
const s6 = snap(land + 0.42); // her shoe and its one drop; his "MA'AM!" over it
const s7 = snap(pauseMid(2)); // "Did any get on YOU?!": Todd on his knees, the cut falls in the pause after "MA'AM!"
const s8 = spk(3, 0.06); // "I want my money back.": ice-cold
const s9 = aft(3, 0.03); // the bill slapped into her hand
const slapT = snap(s9 + 0.16);
const s10 = spk(4, 0.06); // "And my tip."
const s11 = spk(5, 0.06); // Denise, dripping, the cup on her head: "You didn't tip."
const s12 = spk(6, 0.06); // "I tipped... in my head.": she leans in until her face fills the frame
const s13 = spk(7, 0.06); // "Take Denise's!": the tip jar shoved into her arms
const jarT = snap(s13 + 0.26);
const s14 = spk(8, 0.06); // "I make better coffee at home.", the jar in her arms
const s15 = aft(8, 0.03); // Denise: the vein throbs, the cup rattles
const throb1 = snap(s15 + 0.08), throb2 = snap(s15 + 0.32);
const s16 = spk(9, 0.06); // Denise explodes
const cork = snap(W(9, 4).t + 0.1); // "HERE": the cup shoots off her head
const s17 = aft(9, 0.03); // she and the dog turn to Denise, slowly, together; the phone comes up with POST
const turn0 = snap(s17 + 0.04), turn1 = snap(turn0 + 0.34);
const s18 = snap(L(10).voiced[0][0] - 0.3); // Todd flies in and claps his hand over Denise's mouth before his shriek
const reach = snap(s18 + 0.2);
const s19 = spk(11, 0.06); // "Anything?"
const s20 = snap(pauseMid(11)); // "Then rub my feet.": the cut falls in the pause
const s21 = aft(11, 0.03); // her bare foot slaps onto the counter by Denise's nose
const footT = snap(s21 + 0.12);
const s22 = snap(footT + 0.38); // Todd rubs it like he is starting a fire; her groan starts over it
const s23 = snap(L(12).first + 0.25); // she melts
const s24 = aft(12, 0.03); // Denise's eye twitches
const s25 = spk(13, 0.06); // "Cold hands."
const s26 = aft(13, 0.03); // her phone: one star, the review typed, Post
const STARS = 5, STAR_GAP = 3 / FPS;
const typeStart = snap(s26 + 0.15), typeEnd = snap(typeStart + Math.ceil(REVIEW.length / 2 - 1) / FPS); // two letters a frame
const postT = snap(typeEnd + 0.1), dingT = snap(postT + 0.03);
const s27 = snap(dingT + 0.8); // the next morning: Denise in swim goggles, Todd blasting his hands with a hair dryer; the door bangs open off screen
const slamT = snap(s27 + 0.25);
const s28 = spk(14, 0.06); // "The usual."
const s29 = aft(14, 0.04); // Denise slides a steaming coffee across
const s30 = snap(s29 + 0.5); // she sips, her face snaps purple
const sipT = snap(s30 + 0.1), snapT = snap(s30 + 0.45);
const s31 = snap(s30 + 0.75); // her arm cocks back to throw: the reel loops into frame one
export const T = {
  hit, s2, cupLand, s3, s3b, s4, badT, s5, launch, land, s6, s7, s8, s9, slapT, s10, s11, s12, s13, jarT, s14, s15, throb1, throb2, s16, cork, s17, turn0, turn1, s18, reach, s19, s20, s21, footT, s22, s23, s24, s25, s26,
  typeStart, typeEnd, postT, dingT, s27, slamT, s28, s29, s30, sipT, snapT, s31,
  end: snap(s31 + 0.7),
};
export const T_END = T.end;
export const FRAMES = Math.round(T_END * FPS);
export const STAR_T: number[] = Array.from({ length: STARS }, (_, i) => snap(s26 + STAR_GAP * i));
export const typedN = (f: number) => Math.max(0, Math.min(REVIEW.length, 2 * (Math.floor(f - typeStart * FPS) + 1)));
export const TICK_T: number[] = Array.from({ length: Math.ceil(REVIEW.length / 4) }, (_, i) => snap(typeStart + (2 * i) / FPS));

export const SHOT_IDS = [
  "throw", "soaked", "tooHot", "hotClose", "postJab", "vault", "shoe", "didAny", "money", "bill", // 1-10
  "myTip", "didntTip", "inMyHead", "jar", "betterHome", "vein", "whyHere", "turnPost", "hands", "anythingQ", // 11-20
  "rubFeet", "foot", "rub", "melt", "twitch", "coldHands", "review", "morning", "usual", "slide", "sip", "windup", // 21-32
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
const START: Record<ShotId, number> = {
  throw: 0, soaked: s2, tooHot: s3, hotClose: s3b, postJab: s4, vault: s5, shoe: s6, didAny: s7, money: s8, bill: s9, myTip: s10, didntTip: s11, inMyHead: s12, jar: s13, betterHome: s14, vein: s15, whyHere: s16, turnPost: s17,
  hands: s18, anythingQ: s19, rubFeet: s20, foot: s21, rub: s22, melt: s23, twitch: s24, coldHands: s25, review: s26, morning: s27, usual: s28, slide: s29, sip: s30, windup: s31,
};
export const SHOTS: { id: ShotId; t0: number; t1: number }[] = SHOT_IDS.map((id, i) => ({ id, t0: START[id], t1: i + 1 < SHOT_IDS.length ? START[SHOT_IDS[i + 1]] : T_END }));
export function shotAt(f: number) {
  const t = f / FPS;
  const i = SHOTS.findIndex((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  const s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  return { ...s, i: i < 0 ? SHOTS.length - 1 : i, lt: t - s.t0, d: s.t1 - s.t0, u: clamp01((t - s.t0) / (s.t1 - s.t0)) };
}
const shotId = (f: number) => shotAt(f).id;
const inShot = (f: number, ...ids: ShotId[]) => ids.includes(shotId(f));
/** the push of a shot: a zoom factor that grows through it. Her lean-in (inMyHead) is a big push into her face; the throw, the wind-up, the review and the morning card stand still */
export const holdPush = (f: number) => {
  const s = shotAt(f);
  if (s.id === "inMyHead") return 1 + 0.32 * ease(s.u);
  if (s.id === "throw" || s.id === "windup" || s.id === "review" || s.id === "morning" || s.id === "slide") return 1;
  if (s.id === "postJab") return 1 + 0.05 * popP(f / FPS, badT, 0.35, 40) * Math.max(0, 1 - (f / FPS - badT) / 0.35) + 0.02 * s.u;
  return 1 + 0.03 * s.u;
};

// ── the throw (shot 1) and the wind-up (shot 31): her arm over the shoulder of the camera. `swing` 0 = cocked back (out at the lower right), 1 = whipped forward (the cup at Denise). Frame 0 is mid-swing: the reel loops from the
// wind-up into it. The coffee leaves the cup at `release` and hits Denise on `hit`
export const RELEASE = -0.1; // before frame 0: on the first frame the coffee is already a stream halfway to her face
export function swingAt(f: number): number {
  const t = f / FPS, sh = shotId(f);
  if (sh === "throw") return lerp(0.55, 1, ease(t / 0.06)) - 0.12 * ease((t - 0.12) / 0.25);
  if (sh === "windup") { const a = (t - s31) / (T_END - s31); return 0.45 - 0.45 * ease(a / 0.75); } // she pulls back; the loop's first frame is the start of the forward swing
  return 0;
}
/** the camera's shake on the hit: 18 px, gone in 0.3 s */
export function shakeAt(f: number): [number, number] {
  const a = f / FPS - hit;
  if (shotId(f) !== "throw" || a < 0) return [0, 0];
  const k = 18 * Math.exp(-a / 0.09);
  return [k * Math.sin(a * 95), 0.7 * k * Math.cos(a * 77)];
}
/** how far the coffee has flown (0 at the cup .. 1 at her face), and the splash's age after the hit */
export const flightAt = (f: number) => clamp01((f / FPS - RELEASE) / (hit - RELEASE));
export const splashAge = (f: number) => (shotId(f) === "throw" ? f / FPS - hit : -1);

// ── the cup on Denise's head: it falls from the top of the frame in shot 2 and lands on `cupLand` (a squash), sits on her head, rattles before her explosion and shoots off like a cork on "HERE"
export function cupAt(f: number): { on: boolean; drop: number; sq: number; rattle: number; fly: number } {
  const t = f / FPS, sh = shotId(f);
  if (t < s2 || t >= s17) return { on: false, drop: 0, sq: 0, rattle: 0, fly: 0 };
  const drop = sh === "soaked" ? dropH(t, cupLand, cupLand - s2 - 0.04) : 0;
  const rattle = sh === "vein" ? (twos(f) % 4 === 0 ? 1 : -1) * (0.6 + 0.4 * ease((t - s15) / 0.4)) : 0;
  const fly = t >= cork ? t - cork : 0;
  return { on: true, drop, sq: squashAt(t, cupLand, 0.35, 42), rattle, fly };
}
/** the vein on Denise's forehead (shots vein, whyHere) and on hers (when she is purple): 0..1 how big it is, throbbing */
export function deniseVeinAt(f: number): number {
  const t = f / FPS, sh = shotId(f);
  if (sh === "vein") return 0.55 + 0.45 * Math.max(Math.exp(-Math.max(0, t - throb1) / 0.12) * (t >= throb1 ? 1 : 0), Math.exp(-Math.max(0, t - throb2) / 0.12) * (t >= throb2 ? 1 : 0));
  if (sh === "whyHere") return 1;
  return 0;
}
/** how purple her face is (0 as painted .. 1 furious): she snaps to fury at the hook and on the last sip, goes ice-cold for the money, simmers from the turn, drains as she melts */
export function purpleAt(f: number): number {
  const t = f / FPS, sh = shotId(f);
  switch (sh) {
    case "tooHot": case "hotClose": case "postJab": return 1;
    case "turnPost": return 0.85 * ease((t - turn0) / (turn1 - turn0));
    case "hands": case "anythingQ": case "rubFeet": return 0.85;
    case "melt": return 0.85 * (1 - ease((t - s23 - 0.15) / 0.75));
    case "sip": return t >= snapT ? 1 : 0;
    default: return 0;
  }
}
/** the throb of her vein: a beat every 0.36 s on twos while she is purple */
export const veinBeat = (f: number) => 1 + 0.18 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));

// ── the vault (shot 5): Todd springs up from behind the counter, arcs over it toward the camera (a parabola in time) and lands on his knees in the coffee in front of it, with a squash, a splash and a camera bump
export function vaultAt(f: number): { u: number; h: number; air: boolean; sq: number; crouch: number; skid: number } {
  const t = f / FPS, u = clamp01((t - launch) / (land - launch));
  return { u, h: 4 * u * (1 - u), air: t >= launch && t < land, sq: squashAt(t, land, 0.3, 40), crouch: t < launch ? 1 : clamp01(1 - (t - launch) / (2 / FPS)), skid: t < land ? 0 : 1 - Math.exp(-(t - land) / 0.08) };
}
export function bumpAt(f: number, at: number, k0 = 14): [number, number] {
  const a = f / FPS - at;
  if (a < 0 || a > 0.6) return [0, 0];
  const k = k0 * Math.exp(-a / 0.1);
  return [0.5 * k * Math.sin(a * 80), k * Math.cos(a * 66)];
}
/** the splash of the puddle on the landing, and of her face on the hit: the age of the splash (s), or -1 */
export const puddleAge = (f: number) => (shotId(f) === "vault" ? f / FPS - land : -1);

// ── the scrub (shot 6): his tie goes back and forth over the drop on her shoe, on twos, 7 strokes a second
export const scrubAt = (f: number) => Math.sin((twos(f) / FPS) * Math.PI * 2 * 3.5);
// ── the bill (shot 9): his hand comes down on her open palm on `slapT`
export const billAt = (f: number) => { const t = f / FPS; return { down: ease((t - (slapT - 0.12)) / 0.12), sq: squashAt(t, slapT, 0.3, 50) }; }; // 0 up .. 1 in her palm
// ── the jar (shot 13): shoved into her arms from the right on `jarT`, a bump on the landing
export const jarAt = (f: number) => { const t = f / FPS; return { u: ease((t - (jarT - 0.18)) / 0.18), sq: squashAt(t, jarT, 0.35, 40) }; };
// ── Denise explodes (shot 16): she rises 30 px on "THEN" and shakes on the loud syllables; the cup flies off on `cork`
// ── the turn (shot 17): she and the dog turn their heads to Denise, slowly, together
export const turnK = (f: number) => (shotId(f) === "turnPost" ? ease((twos(f) / FPS - turn0) / (turn1 - turn0)) : 0);
// ── Todd's hand over Denise's mouth (shot 18): he flies in from the right (0.2 s, a little arc) and his reaching hand lands on her mouth on `reach`
export const reachAt = (f: number) => { const t = f / FPS; return { u: ease((t - s18) / (reach - s18)), sq: squashAt(t, reach, 0.3, 45) }; };
// ── the foot (shot 21): it comes up from below the frame and slaps onto the counter on `footT`; the toes wiggle on twos
export const footAt = (f: number) => { const t = f / FPS; return { u: ease((t - (footT - 0.1)) / 0.1), sq: squashAt(t, footT, 0.3, 45), wig: Math.sin((twos(f) / FPS) * 26) }; };
/** Denise's recoil from the foot: 0 .. 1 */
export const recoilK = (f: number) => (shotId(f) === "foot" ? ease((f / FPS - footT) / 0.12) : 0);
// ── the rub (shot 22): his hands go up and down the foot 9 times a second; smoke from the sole
export const rubAt = (f: number) => (f / FPS) * Math.PI * 2 * 9;
// ── the review (shot 26): the thumb presses Post on `postT`, posted on `dingT`
export const postedK = (f: number) => popP(f / FPS, dingT);
export const pressK = (f: number) => Math.max(0, 1 - Math.abs(f / FPS - postT) / (2 / FPS));
export const starAt = (i: number, f: number) => ({ on: f / FPS >= STAR_T[i], p: popP(f / FPS, STAR_T[i]) });
// ── the morning (shot 27): the card pops in on the first frame; the door bangs open off screen on `slamT` and both of them flinch
export const cardK = (f: number) => popP(f / FPS, s27 - 1 / FPS, 0.5, 40);
export const flinchAt = (f: number) => { const a = f / FPS - slamT; return a < 0 ? 0 : 14 * Math.exp(-a / 0.12) * Math.abs(Math.cos(a * 30)); };
// ── the slide (shot 29): the cup slides from Denise's hand across the counter toward her, 0 .. 1, and stops
export const slideAt = (f: number) => ease((f / FPS - (s29 + 0.05)) / 0.35);
// ── the sip (shot 30): the cup comes up to her mouth on `sipT`, goes down on `snapT` as her face snaps purple
export const sipAt = (f: number) => { const t = f / FPS; return { up: ease((t - (sipT - 0.08)) / 0.08) * (1 - ease((t - snapT) / 0.06)), snap: t >= snapT }; };

// ── the dog: its face and how it moves. It snarls (the sour face) with her, turns with her, its back leg kicks while she melts
export function dogAt(f: number): { face: "sour" | "neutral" | "gasp"; up: number; rot: number; dx: number; sx: number; kick: number } {
  const sh = shotId(f), t = f / FPS;
  let up = 1.6 * Math.sin((Math.PI * 2 * (twos(f) / FPS)) / 2.6 + 1.1), rot = 0, dx = 0, kick = 0;
  let face: "sour" | "neutral" | "gasp" = "sour";
  if (sh === "turnPost") { const k = turnK(f); rot = 9 * k; dx = 4 * k; }
  if (sh === "melt") { face = "neutral"; kick = Math.sin((twos(f) / FPS) * 34) * ease((t - s23 - 0.2) / 0.15); }
  return { face, up, rot, dx, sx: 1, kick };
}

// ── the mouth: a level per frame from the loudness of the take, on twos, one frame ahead of the sound; closed whenever the character is not speaking
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const ampAt = (l: Line, f: number) => l.amp[f - l.f0] ?? 0;
const lineAt = (c: Char, f: number, before = 0.1, after = 0.05) => linesOf(c).find((q) => f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (c: Char, f: number) => !!lineAt(c, f);
export function moodAt(c: Char, f: number): Mood {
  const sh = shotId(f), t = f / FPS;
  switch (c) {
    case "customer":
      if (sh === "tooHot" || sh === "hotClose" || sh === "postJab") return "furious";
      if (sh === "turnPost" || sh === "hands") return "angry";
      if (sh === "inMyHead" || sh === "betterHome" || sh === "anythingQ" || sh === "rubFeet") return "smug";
      if (sh === "melt") return "neutral";
      if (sh === "sip") return t >= snapT ? "furious" : "flat";
      return "flat";
    case "todd":
      if (sh === "rub") return "hiss";
      if (sh === "morning") return "flat";
      return "pitchy";
    case "deniseHood":
      if (sh === "whyHere") return "furious";
      if (sh === "vein" || sh === "windup") return "hiss";
      if (sh === "foot") return "angry";
      return "flat";
    default: return "flat";
  }
}
export function mouthAt(c: Char, f: number): MouthShape {
  if (c === "deniseHood" && inShot(f, "hands")) return "closed"; // his hand is over it
  const l = lineAt(c, f);
  if (!l) return "closed";
  const fi = twos(f), a = ampAt(l, fi + 1);
  if (a < 0.1) return "closed";
  if (l.n === 12) return "o"; // the groan
  const mood = moodAt(c, fi), w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (mood !== "angry" && mood !== "furious" && w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  let s: MouthShape = a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
  if (mood === "flat" && s === "wide") s = "mid";
  if (l.n === 6 && s === "wide") s = "mid"; // the whisper
  return s;
}
// ── the head: tilts a little and dips on every syllable, alternating sides, eased over 6 frames; it settles after the line
const TILT: Record<Char, number> = { customer: 1.3, todd: 3.2, deniseHood: 2.6, lineA: 1, lineB: 1, lineC: 1, lineD: 1 };
const BOB: Record<Char, number> = { customer: 2.2, todd: 5, deniseHood: 3.4, lineA: 1, lineB: 1, lineC: 1, lineD: 1 };
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
function talkMove(c: Char, f: number): { tilt: number; bob: number } {
  const l = linesOf(c).find((q) => f / FPS >= q.first - 0.2 && f / FPS <= q.end + 0.6);
  if (!l) return { tilt: 0, bob: 0 };
  const done = l.peaks.filter((p) => p.f <= f);
  const target = (j: number) => (j < 0 ? 0 : done[j].sign * TILT[c] * (0.55 + 0.45 * done[j].a));
  const j = done.length - 1;
  let tilt = j < 0 ? 0 : target(j - 1) + (target(j) - target(j - 1)) * ease((f - done[j].f) / 6);
  tilt *= 1 - ease((f - l.end * FPS) / 12);
  let bob = 0;
  for (const p of done.slice(-2)) bob -= BOB[c] * (0.5 + 0.5 * p.a) * pulse(f - p.f);
  return { tilt, bob: bob * (1 - ease((f - l.end * FPS) / 8)) };
}

// ── blinks: every 2.5-4.5 s, 3 frames, at hashed times; none that touches a cut
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
const SEEDS: Record<Char, number> = { customer: 5, todd: 11, deniseHood: 4, lineA: 6, lineB: 19, lineC: 23, lineD: 27 };
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3].some((f) => CUT_F.has(f)));
}
export const BLINKS: Record<Char, number[]> = Object.fromEntries((Object.keys(SEEDS) as Char[]).map((c) => [c, blinkStarts(SEEDS[c])])) as Record<Char, number[]>;
const NO_BLINK: ShotId[] = ["tooHot", "hotClose", "postJab", "throw", "windup", "whyHere", "hands", "foot", "melt", "coldHands", "rub", "soaked", "twitch"];
export const blinkK = (c: Char, f: number) => {
  if (NO_BLINK.includes(shotId(f))) return 0;
  for (const s of BLINKS[c]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};

// ── faces by beat
export function lidAt(c: Char, f: number): number {
  const sh = shotId(f), t = f / FPS;
  let b = 0.2;
  if (c === "customer") b = ({ tooHot: 0, hotClose: 0, postJab: 0.02, money: 0.42, bill: 0.42, myTip: 0.4, inMyHead: 0.5, jar: 0.4, betterHome: 0.45, turnPost: 0.12, hands: 0.12, anythingQ: 0.22, rubFeet: 0.38, melt: 0.5, coldHands: 0.46, usual: 0.36, sip: t >= snapT ? 0 : 0.3 } as Partial<Record<ShotId, number>>)[sh] ?? 0.3;
  if (c === "todd") b = sh === "morning" ? 0.25 : sh === "rub" ? 0.15 : 0.04;
  if (c === "deniseHood") {
    b = ({ soaked: 0.52, didntTip: 0.36, vein: 0.18, whyHere: 0, hands: 0, foot: 0, twitch: 0.3, morning: 0.22, slide: 0.3 } as Partial<Record<ShotId, number>>)[sh] ?? 0.3;
    if (sh === "throw") b = t >= hit ? 1 : 0.05; // shut on the hit
    if (sh === "windup") b = 1; // braced, eyes shut behind the goggles
  }
  if (QUEUE.includes(c)) b = 0.3;
  return Math.max(b, b + (1 - b) * blinkK(c, f));
}
/** gaze: -1..1 of the pupils' travel (x right, y down). Her shots look from Denise's side of the counter: Denise is the camera, Todd is at her feet (down, to the screen's right) */
export function gazeAt(c: Char, f: number): [number, number] {
  const sh = shotId(f), t = f / FPS;
  switch (c) {
    case "customer":
      switch (sh) {
        case "tooHot": case "hotClose": case "postJab": case "inMyHead": case "coldHands": case "usual": return [0.05, 0];
        case "money": case "bill": case "myTip": return [0.45, 0.55]; // down at Todd
        case "jar": case "betterHome": return [0.1, 0.05];
        case "turnPost": return [lerp(0.6, 0.05, turnK(f)), lerp(0.4, 0, turnK(f))];
        case "anythingQ": case "rubFeet": return [0.1, 0.05];
        case "melt": return [0, -1]; // rolled back
        case "sip": return t >= snapT ? [0.05, 0] : [0, 0.3];
        default: return [0.2, 0.1];
      }
    case "todd":
      switch (sh) {
        case "didAny": return [0.55, -0.75]; // up at her
        case "hands": return [0.15, 0];
        case "rub": return [0, 0.7]; // at the foot
        case "morning": return [0.75, 0]; // the door bangs open
        default: return [0.3, 0.2];
      }
    case "deniseHood":
      switch (sh) {
        case "hands": return [0.65, 0]; // at Todd
        case "foot": return [0, 0.6]; // at the foot
        case "morning": return [0.75, 0];
        default: return [0.02, 0.05];
      }
    default: return [0.5, 0.2];
  }
}
export function bodyAt(c: Char, f: number): string | undefined {
  const sh = shotId(f);
  switch (c) {
    case "customer": return "stand";
    case "todd":
      if (sh === "hands") return "point";
      if (sh === "morning") return "dryer";
      return "kneel";
    case "deniseHood": return "apron";
    default: return undefined;
  }
}
export function poseAt(c: Char, f: number): LPose {
  const t = f / FPS, ft = twos(f) / FPS, sh = shotId(f);
  const m = talkMove(c, f);
  const phase = { customer: 0.8, todd: 2.1, deniseHood: 0.4, lineA: 2.7, lineB: 1.7, lineC: 0.9, lineD: 3.3 }[c];
  let tilt = m.tilt, bob = m.bob, lift = 0, angry = 0, sad = 0, asym = 0, dx = 0, hdx = 0, jump = 0, mouth = mouthAt(c, f), mood = moodAt(c, f), gaze = gazeAt(c, f);
  const pupil = 1;
  let fit = true;
  if (c === "customer") {
    const pk = purpleAt(f);
    angry = 0.25 + 0.75 * pk;
    if (sh === "tooHot" || sh === "hotClose" || sh === "postJab") { lift = 0.2; dx += (Math.floor(ft * 15) % 2 ? 1 : -1) * (sh === "hotClose" ? 4 : 2.5); } // shaking with rage
    if (sh === "money" || sh === "myTip") { angry = 0.15; asym = 0.3; }
    if (sh === "inMyHead") { asym = 0.6; angry = 0.1; tilt += -3 * ease((t - s12) / 0.6); }
    if (sh === "turnPost") { const k = turnK(f); tilt += 6 * k; hdx += 8 * k; }
    if (sh === "anythingQ") { lift = 0.9 * ease((t - s19) / 0.15); asym = 0.5; angry = 0.3; tilt += 4 * ease((t - s19) / 0.2); }
    if (sh === "rubFeet") { asym = 0.9; angry = 0.35; }
    if (sh === "melt") { const k = ease((t - s23) / 0.25); tilt += -9 * k; bob += 6 * k; angry = 0; sad = 0.45 * k; lift = 0.4 * k; fit = false; }
    if (sh === "coldHands" || sh === "usual") { tilt = 0; bob = 0; angry = 0.2; }
    if (sh === "sip" && t >= snapT) { lift = 0.2; dx += (Math.floor(ft * 15) % 2 ? 1 : -1) * 2.5; }
  }
  if (c === "todd") {
    const trembling = sh === "didAny" || sh === "hands" || sh === "rub";
    if (trembling) dx += (Math.floor(ft * 15) % 2 ? 1 : -1) * 2.4;
    sad = sh === "morning" ? 0.2 : 1;
    for (const p of LINE(2).peaks.concat(LINE(7).peaks, LINE(10).peaks)) bob += -7 * bump(ft, p.f / FPS - 0.03, p.f / FPS, p.f / FPS + 0.02, p.f / FPS + 0.12) * 0.5;
    if (sh === "rub") { bob += 4 * Math.sin(rubAt(f)); tilt += 2.5 * Math.sin(rubAt(f) + 1); angry = 0.4; sad = 0.4; }
    if (sh === "morning") { jump += flinchAt(f); tilt = 2; }
  }
  if (c === "deniseHood") {
    if (sh === "throw" && t >= hit) { const k = ease((t - hit) / 0.05); tilt += -8 * k; dx += -10 * k; hdx += -6 * k; }
    if (sh === "soaked") { tilt = 0; bob = 0; }
    if (sh === "vein") { angry = 0.7; bob = 0; tilt = 0; }
    if (sh === "whyHere") { angry = 1; lift = 0; jump += 26 * ease((t - s16) / 0.12) - 8 * Math.max(0, Math.sin((t - s16) * 22)); }
    if (sh === "hands") { lift = 1; }
    if (sh === "foot") { const k = recoilK(f); tilt += -7 * k; dx += -16 * k; hdx += -10 * k; lift = 0.9 * k; angry = 0.3 * k; }
    if (sh === "twitch") { angry = 0.45; tilt = 0; bob = 0; }
    if (sh === "morning") { jump += flinchAt(f); }
    if (sh === "windup") { angry = 0.4; tilt = -3; }
  }
  const lid = lidAt(c, f), shut = blinkK(c, f) > 0 || lid >= 0.9;
  const eyes = shut || !fit ? { lid, gaze } : fitEyes(c, lid, gaze, pupil);
  const breath = 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + phase);
  return { body: bodyAt(c, f), tilt, bob, breath: breath + jump, mouth, mood, ...eyes, angry, sad, lift, asym, pupil, dx, hdx, mdy: 0 };
}

// ── no pupil hides under a lid: the eyes look lower, or the lid opens
type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
type RigE = { eyes?: Eye[]; pupils: number[][] };
const RIGS = { ...(tipRig as unknown as Record<string, RigE>), ...(lipsRig as unknown as Record<string, RigE>) };
export function clearance(char: string, i: number, lid: number, gaze: [number, number], pupil: number): number {
  const R = RIGS[char], e = R.eyes![i], q = R.pupils[i];
  const [x, y] = pupilAt(e, [q[0], q[1]], q[2], gaze, 6);
  return y - lidEdge(e, lid, x) - q[2] * pupil;
}
export function fitEyes(char: string, lid: number, gaze: [number, number], pupil: number): { lid: number; gaze: [number, number] } {
  const n = RIGS[char]?.eyes?.length ?? 0;
  if (!n || lid <= 0 || lid >= 0.9) return { lid, gaze };
  const clear = (l: number, g: [number, number]) => Array.from({ length: n }, (_, i) => clearance(char, i, l, g, pupil)).every((c) => c >= 2);
  for (let l = lid; l > 0; l -= 0.02) for (let gy = gaze[1]; gy <= 1.0001; gy += 0.02) if (clear(l, [gaze[0], gy])) return { lid: l, gaze: [gaze[0], Math.min(1, gy)] };
  return { lid: 0, gaze };
}
/** Denise's twitching eye (shots didntTip, twitch): the lid of her left eye (the screen's right) jumps down and back on twos, now and then */
export const twitchAt = (f: number) => {
  const sh = shotId(f);
  if (sh !== "didntTip" && sh !== "twitch") return 0;
  const k = twos(f) % 12;
  return k === 0 || k === 4 ? 0.55 : k === 2 ? 0.3 : 0;
};

// ── captions: the shape of v2 (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut)
export type Cap = { who: string; n: number; text: string; t0: number; t1: number; w0: number; w1: number };
const say = (w: Word) => w.d.replace(/—/g, "-");
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  const len = (ws: Word[]) => ws.map(say).join(" ").length;
  const cuts = SHOTS.slice(1).map((s) => s.t0);
  for (const l of LINES) {
    const chunks: Word[][] = [];
    let cur: Word[] = [];
    l.words.forEach((w, i) => {
      cur.push(w);
      const nxt = l.words[i + 1];
      if (/[.?!]$/.test(w.d) || (nxt && cuts.some((c) => c >= w.e - 0.02 && c <= nxt.t + 0.02)) || (nxt && nxt.t - w.e > 0.3 && len(cur) >= 9)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const lines: Word[][] = [];
    for (const ch of chunks) {
      let parts = [ch];
      while (parts.some((p) => len(p) > 22 && p.length > 1)) parts = parts.flatMap((p) => {
        if (len(p) <= 22 || p.length < 2) return [p];
        let best = 1, bestK = Infinity;
        for (let i = 1; i < p.length; i++) { const k = Math.max(len(p.slice(0, i)), len(p.slice(i))); if (k < bestK) { bestK = k; best = i; } }
        return [p.slice(0, best), p.slice(best)];
      });
      lines.push(...parts);
    }
    lines.forEach((ws, i) => caps.push({ who: l.who, n: l.n, text: ws.map(say).join(" "), t0: (i === 0 ? Math.min(l.first, ws[0].t) : ws[0].t) - 0.04, t1: stretchEnd(l, ws[ws.length - 1].e) + 0.25, w0: ws[0].t, w1: ws[ws.length - 1].e }));
  }
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (s) { c.t0 = Math.max(c.t0, s.t0); c.t1 = Math.min(c.t1, s.t1); } });
  caps.forEach((c, i) => { const n = caps[i + 1], s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (n && n.n === c.n && s && n.t0 > c.t1 && n.t0 - c.t1 < 0.1) { if (n.t0 >= s.t1 - 1e-6) { c.t1 = s.t1; n.t0 = s.t1; } else c.t1 = n.t0; } });
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
export const CAP_BAND: [number, number] = [1295, 1455];

// ── every picture hit that has a sound: the sound's measured peak sits on the hit's frame
export type Hit = { id: string; shot: ShotId; t: number; sfx: string; db: number; len?: number; fade?: number };
export const HITS: Hit[] = [
  { id: "swing", shot: "throw", t: snap(0.03), sfx: "whoosh", db: -8 },
  { id: "splash", shot: "throw", t: hit, sfx: "bigsplash", db: 0 },
  { id: "cupLand", shot: "soaked", t: cupLand, sfx: "plop", db: -4 },
  { id: "jab", shot: "postJab", t: s4, sfx: "whoosh", db: -10 },
  { id: "launch", shot: "vault", t: launch, sfx: "whoosh", db: -4 },
  { id: "land", shot: "vault", t: land, sfx: "bellyflop", db: -1 },
  { id: "landThud", shot: "vault", t: land, sfx: "thud", db: -9 },
  { id: "scrub", shot: "shoe", t: snap(s6 + 0.05), sfx: "scrub", db: -6, len: s7 - s6 + 0.05, fade: 0.08 },
  { id: "bill", shot: "bill", t: slapT, sfx: "slap", db: -3 },
  { id: "jar", shot: "jar", t: jarT, sfx: "coins", db: -3 },
  { id: "throb1", shot: "vein", t: throb1, sfx: "throb", db: -3 },
  { id: "throb2", shot: "vein", t: throb2, sfx: "throb", db: -3 },
  { id: "rattle", shot: "vein", t: snap(s15 + 0.2), sfx: "rattle", db: -8 },
  { id: "cork", shot: "whyHere", t: cork, sfx: "pop", db: 0 },
  { id: "sting", shot: "turnPost", t: snap(turn0 + 0.02), sfx: "sting-b", db: -8 },
  { id: "flyIn", shot: "hands", t: snap(s18 + 0.06), sfx: "whoosh", db: -8 },
  { id: "reach", shot: "hands", t: reach, sfx: "slap", db: -3 },
  { id: "footUp", shot: "foot", t: snap(footT - 0.06), sfx: "whoosh", db: -12 },
  { id: "foot", shot: "foot", t: footT, sfx: "slap", db: 0 },
  { id: "footThud", shot: "foot", t: footT, sfx: "thud", db: -10 },
  { id: "rub", shot: "rub", t: snap(s22 + 0.04), sfx: "friction", db: -2, len: 1.45, fade: 0.1 },
  { id: "rub2", shot: "melt", t: snap(s22 + 1.45), sfx: "friction", db: -9, len: Math.max(0.2, s24 - (s22 + 1.45)), fade: 0.2 },
  ...STAR_T.map((t, i): Hit => ({ id: `star${i + 1}`, shot: "review", t, sfx: "pop", db: -12 })),
  ...TICK_T.map((t, i): Hit => ({ id: `key${i + 1}`, shot: "review", t, sfx: "tick", db: -10 })),
  { id: "post", shot: "review", t: postT, sfx: "tap", db: -4 },
  { id: "ding", shot: "review", t: dingT, sfx: "ding", db: -7 },
  { id: "slam", shot: "morning", t: slamT, sfx: "slam", db: -3 },
  { id: "chime", shot: "morning", t: snap(slamT + 0.05), sfx: "chime", db: -6 },
  { id: "slide", shot: "slide", t: snap(s29 + 0.12), sfx: "slide", db: -6 },
  { id: "sip", shot: "sip", t: sipT, sfx: "slurp", db: -4 },
  { id: "snap", shot: "sip", t: snapT, sfx: "snap", db: -2 },
  { id: "windup", shot: "windup", t: snap(T_END - 0.02), sfx: "whoosh", db: -6 },
];

// ── sound cues for the mix (scripts/lips8-cues.mts)
/** the clink-free stretches of public/sfx/cafebed.mp3 (src/lips-sched.ts BED_SRC), laid end to end under the whole reel */
const BED_PIECES: [number, number][] = [[0, 5.5], [14.3, 19.9], [0.4, 5.5], [7.7, 9.5], [14.3, 19.9]];
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  const add = (name: string, at: number, db = 0, o: { len?: number; fade?: number; from?: number } = {}) => c.push({ name, at, db, ...o });
  HITS.forEach((h) => add(h.sfx, onPeak(h.sfx, h.t), h.db, { ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}) }));
  let at = 0;
  for (let i = 0; at < T_END - 1e-9; i++) {
    const [a, b] = BED_PIECES[i % BED_PIECES.length], len = Math.min(b - a, T_END + 0.3 - at);
    add("cafebed", at, 4, { from: a, len, ...(at + len >= T_END ? { fade: 0.2 } : {}) });
    at += len;
  }
  add("hairdryer", snap(s27 + 0.02), -6, { len: s29 - s27 + 0.3, fade: 0.3 }); // Todd's hair dryer: on from the morning card, gone as the coffee slides
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── the stills: one or more per shot, away from blinks
const ALL = Object.keys(SEEDS) as Char[];
const blinking = (f: number, who: Char[]) => who.some((c) => blinkK(c, f - 1) + blinkK(c, f) + blinkK(c, f + 1) > 0);
const kf = (label: string, t: number, who: Char[] = ALL) => { let f = Math.round(t * FPS); const i = shotAt(f).i; for (let d = 0; d < 8 && blinking(f, who) && shotAt(f + 1).i === i; d++) f++; return { label, f }; };
const mid = (a: number, b: number) => (a + b) / 2;
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 throw: frame 0", 0), kf("1 throw: the hit", hit + 0.03), kf("1 throw: the splash", 0.3),
  kf("2 soaked: the cup falls", mid(s2, cupLand)), kf("2 soaked: the cup lands", cupLand + 0.05),
  kf("3 tooHot: TOO", W(1, 0).t + 0.12), kf("4 hotClose: HOT", W(1, 1).t + 0.2),
  kf("4 postJab: BAD REVIEW", badT + 0.08),
  kf("5 vault: the apex", mid(launch, land)), kf("5 vault: the landing", land + 0.03), kf("5 vault: after", land + 0.3),
  kf("6 shoe: the scrub", mid(s6, s7)),
  kf("7 didAny: YOU", W(2, 5).t + 0.1),
  kf("8 money: I want my money back", W(3, 3).t),
  kf("9 bill: the slap", slapT + 0.02),
  kf("10 myTip: And my tip", W(4, 2).t),
  kf("11 didntTip: You didn't tip", W(5, 1).t + 0.05),
  kf("12 inMyHead: I tipped", W(6, 1).t + 0.2), kf("12 inMyHead: in my head", W(6, 4).t + 0.1),
  kf("13 jar: Take Denise's", jarT + 0.05),
  kf("14 betterHome: better coffee", W(8, 3).t),
  kf("15 vein: the throb", throb2 + 0.03),
  kf("16 whyHere: THEN WHY", W(9, 1).t + 0.05), kf("16 whyHere: the cork", cork + 0.1),
  kf("17 turnPost: turned", turn1 + 0.03),
  kf("18 hands: flying in", mid(s18, reach)), kf("18 hands: ANYTHING", W(10, 1).t + 0.15),
  kf("19 anythingQ: Anything?", W(11, 0).t + 0.4),
  kf("20 rubFeet: rub my feet", W(11, 3).t),
  kf("21 foot: the slap", footT + 0.05), kf("21 foot: recoiled", s22 - 0.05),
  kf("22 rub: the rub", mid(s22, s23)),
  kf("23 melt: melted", s23 + 0.6),
  kf("24 twitch", mid(s24, s25)),
  kf("25 coldHands: Cold hands", W(13, 1).t + 0.1),
  kf("26 review: typing", mid(typeStart, typeEnd)), kf("26 review: posted", dingT + 0.4),
  kf("27 morning: goggles, the dryer", s27 + 0.15), kf("27 morning: the flinch", slamT + 0.05),
  kf("28 usual: The usual", W(14, 1).t + 0.1),
  kf("29 slide: the cup slides", s29 + 0.25),
  kf("30 sip: the sip", sipT + 0.15), kf("30 sip: the snap", snapT + 0.05),
  kf("31 windup: cocked back", T_END - 0.05),
];
