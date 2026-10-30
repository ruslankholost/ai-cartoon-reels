// The timeline and the acting of "Cold Lips" (src/Lips.tsx, docs/x06-cold-lips.md, script v2). Pure data and arithmetic: every number is a function of the frame, of the voice takes in public/lips/timings.json and
// of the mouth loudness in src/amp-lips.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the gaps of
// episodes/lips.jsonc carry the silent beats): every cut and action below hangs on a take (before its first sound, after its last, in a pause) or on the measured peak of a sound (src/sfx-peaks.json), never on a
// number of its own. The model is src/tup-sched.ts (the newest episode); what the episodes share (the physics helpers, the pose type) is imported from src/pen-sched.ts.
import timings from "../public/lips/timings.json" with { type: "json" };
import amps from "./amp-lips.json" with { type: "json" };
import lipsRig from "./lips-rig.json" with { type: "json" };
import lipsFix from "./lips-fix.json" with { type: "json" };
import tipRig from "./tip-rig.json" with { type: "json" };
import { FPS, antic, bump, clamp01, dropH, ease, easeOut, hash, keys, onPeak, popP, slideP, snap, squashAt, twos, type Mood, type MouthShape, type Pose } from "./pen-sched.ts";
import { lidEdge } from "./pen-eyes.ts";
import { pupilAt } from "./sp-eyes.ts";
import { lerp, spring } from "./sp-math.ts";

export { FPS, antic, bump, clamp01, dropH, ease, easeOut, hash, keys, lerp, onPeak, popP, slideP, snap, squashAt, twos };
export type { Mood, MouthShape, Pose };
/** a pose of this episode: the pose of src/pen-sched.ts, the slide of the head on its neck (src/sp-puppet.tsx hdx) and the mouth moved up the face (mdy) */
export type LPose = Pose & { hdx: number; mdy: number };

/** customer: the woman with the dog in her purse; todd: the manager; deniseHood: Denise in the apron; lineA-D: the line behind her (the cast of "Tip?") */
export type Char = "customer" | "todd" | "deniseHood" | "lineA" | "lineB" | "lineC" | "lineD";
export const QUEUE: Char[] = ["lineA", "lineB", "lineC", "lineD"]; // the line behind the customer, nearest first

// ── the voice takes (the shape of tup-sched.ts)
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Peak = { f: number; a: number; sign: 1 | -1 };
// first: the take's first sound (a sigh counts), tend: its last sound, both in reel seconds; voiced: the stretches of sound of the built line, in reel seconds
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

// ── the cuts and the named moments (seconds). Every one hangs on a take: before its first sound or after its last, in a pause of a take, or on a measured sound peak
const spk = (n: number, d = 0.06) => snap(Math.min(L(n).first, L(n).start, L(n).voiced[0][0]) - d); // a speaker cut: d s before the take's first sound (a sigh counts) or its first word
const aft = (n: number, d = 0.05) => snap(L(n).tend + d); // d s after the take's last sound
/** the middle of the longest silence inside a take (the pause between two sentences): a cut that falls there is inside no word */
function pauseMid(n: number): number {
  const v = L(n).voiced;
  let best = 0, at = 0;
  for (let i = 1; i < v.length; i++) if (v[i][0] - v[i - 1][1] > best) { best = v[i][0] - v[i - 1][1]; at = (v[i][0] + v[i - 1][1]) / 2; }
  return at;
}
const W = (n: number, i: number) => L(n).words[i];

// the hook (shot 1): the dead-rat cup, "This is hot." (the picture is the problem and is on screen from frame 0); then Denise answers (her take starts 0.25 s after his)
const s2 = spk(2, 0.06), s3 = aft(2, 0.03); // Denise's close-up, then her: the phone is still down
const rise = snap(W(3, 3).t - 0.1); // "I'm leaving a" ... the phone comes up on its spring 0.1 s before "review"
const s4 = aft(3, 0.03); // the vault: Denise behind the counter, deadpan, for 0.1 s, then Todd springs up
const launch = snap(s4 + 0.1), land = snap(launch + 0.3), toBeg = land; // the arc is 0.3 s; he lands 0.06 s before his first sound and his arms open on the landing frame (the planted hand of the flight would hang in the air)
const s5 = spk(5, 0.06), s6 = spk(6, 0.06), s7 = spk(7, 0.06), s8 = spk(8, 0.06), s9 = spk(9, 0.06), s10 = spk(10, 0.06); // speaker cuts: her, the two-shot, her, the same two-shot, her, Todd close
const turn = snap(L(9).first), turned = snap(turn + 4 / FPS); // "Ugh.": both heads turn away on the groan's first frame, in 4 frames
const s11 = spk(11, 0.06), s11b = snap(pauseMid(11)); // "Anything?" | "What, you gonna kiss my ass?": the cut falls in the 0.2 s pause between them
const s12 = aft(11, 0.03); // the knee drop (13a, the front wide), the smooch (13b, the side view), the frozen shop, the dog's gasp: the 1.8 s after the line (gaps.11 of episodes/lips.jsonc)
const kneel = snap(s12 + 0.27), fall = snap(kneel - 4 / FPS), peek = snap(kneel + 0.03), moveIn = snap(kneel + 0.1); // thud; his head peeks out at her hip; it moves in behind her
const THUD_LEN = 0.3; // the knee drop's thud is cut to 0.3 s (HITS: its tail would run into the silence after the smooch)
const s12b = snap(onPeak("thud", kneel) + THUD_LEN + 0.03); // the cut to the side view: 0.03 s after the thud's last sound
const smooch = snap(s12b + 0.43), dogT = snap(smooch + 0.4); // the side view holds 0.43 s, then his lips land on her seat on the smooch's peak; the doggasp's peak
const s13 = spk(12, 0.065); // "Cold lips.": her close-up, deadpan
const s14 = aft(12, 0.03); // her phone, big: one star and the review, typed
const STARS = 5, STAR_GAP = 3 / FPS; // the stars pop in one by one, 3 frames apart (the first one filled)
export const REVIEW = "Cold lips. Never coming back.";
const typeStart = snap(s14 + 0.12), typeEnd = snap(typeStart + (REVIEW.length - 1) / FPS); // a letter on every frame, a tick on every second one
const postT = snap(typeEnd + 0.07), dingT = snap(postT + 0.03); // the thumb presses Post, the ding
const s15 = snap(dingT + 1.0); // next morning: the review has been readable for a second after it posted
const doorOpen = snap(s15 + 0.2); // the glass door swings out, the bell rings (the chime's peak)
const s16 = spk(13, 0.06); // "The usual.": her at the counter, the shot-1 framing
const s17 = aft(13, 0.04), s18 = snap(s17 + 0.6); // Denise turns her head (0.6 s), then Todd with the hair dryer
const dryer0 = snap(s17 + 0.08); // the hair dryer's roar starts as she turns: she hears it before she sees it
const share = snap(s18 + 0.2); // the share line pops in once the picture has landed
export const T = {
  s2, s3, rise, s4, launch, land, toBeg, s5, s6, s7, s8, s9, turn, turned, s10, s11, s11b, s12, fall, kneel, peek, moveIn, s12b, smooch, dogT, s13, s14, typeStart, typeEnd, postT, dingT, s15, doorOpen, s16, s17, dryer0, s18, share,
  end: snap(share + 2.3),
};
export const T_END = T.end;
export const FRAMES = Math.round(T_END * FPS);
/** the stars: the time star i pops in (the first is filled) */
export const STAR_T: number[] = Array.from({ length: STARS }, (_, i) => snap(s14 + STAR_GAP * i));
/** the letter count of the review at frame f: one more letter on every frame from typeStart to typeEnd */
export const typedN = (f: number) => Math.max(0, Math.min(REVIEW.length, Math.floor(f - typeStart * FPS) + 1));
/** the frames on which a letter's tick sounds: every second letter */
export const TICK_T: number[] = Array.from({ length: Math.ceil(REVIEW.length / 2) }, (_, i) => snap(typeStart + (2 * i) / FPS));

// The shots (docs/x06-cold-lips.md, the Picture notes): one per framing. lips-check.mts holds the list to the length rule (<= 2.4 s except the last shot) and to "no two shots in a row with the same framing".
export const SHOT_IDS = [
  "hook", "denCoffee", "review", "vault", "free", "fired", "liked", "hired", "ugh", "anything", // 1-10
  "anythingQ", "kissAss", "kneelA", "kneelB", "coldLips", "reviewPhone", "morning", "usual", "denTurn", "dryer", // 11-20 (the plan's shot 11 is two shots: the cut falls in the 0.2 s pause after "Anything?"; the kiss is two: the front wide, the side view)
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
const START: Record<ShotId, number> = {
  hook: 0, denCoffee: s2, review: s3, vault: s4, free: s5, fired: s6, liked: s7, hired: s8, ugh: s9, anything: s10, anythingQ: s11, kissAss: s11b, kneelA: s12, kneelB: s12b, coldLips: s13, reviewPhone: s14, morning: s15, usual: s16, denTurn: s17, dryer: s18,
};
export const SHOTS: { id: ShotId; t0: number; t1: number }[] = SHOT_IDS.map((id, i) => ({ id, t0: START[id], t1: i + 1 < SHOT_IDS.length ? START[SHOT_IDS[i + 1]] : T_END }));
export function shotAt(f: number) {
  const t = f / FPS;
  const i = SHOTS.findIndex((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  const s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  return { ...s, i: i < 0 ? SHOTS.length - 1 : i, lt: t - s.t0, d: s.t1 - s.t0, u: clamp01((t - s.t0) / (s.t1 - s.t0)) };
}
const shotId = (f: number) => shotAt(f).id;
/** the slow push of a hold: a zoom factor that grows through the shot (calm: 2.5 %; the insert, the card and the door stand still) */
export const holdPush = (f: number) => { const s = shotAt(f); return 1 + (s.id === "reviewPhone" || s.id === "morning" ? 0 : s.id === "dryer" || s.id === "kneelA" || s.id === "kneelB" ? 0.02 : 0.03) * s.u; };

// ── the frozen shop (shot 13b, the side view): on the smooch's peak the murmur cuts to dead silence and everybody stops where they are, faces and all (no reaction: the dog's gasp is the only one); only the dog moves. After the smooch's
// little bump (a spring of a few frames) the two pieces of the side view do not move at all
export const frozen = (f: number) => f / FPS >= smooch && shotId(f) === "kneelB";
/** the clock of a puppet that is part of the freeze: it stops at the smooch's frame */
const clockOf = (f: number) => (frozen(f) ? Math.round(smooch * FPS) : f);

// ── the vault (shot 4): Todd springs up from behind the counter, arcs over it toward the camera (a parabola: gravity), lands in front of it on `land` with a squash and a camera bump, snaps to open arms
/** where he is: `u` 0..1 along the flight (0 behind the counter, 1 on the floor in front of it), `h` the height over the straight line from the start to the landing (0..1, a parabola in time), `air` whether he is in the air, `sq` the squash of the landing (1 on the landing frame, then a damped spring), `crouch` 1 while he waits squashed behind the counter, then 0 two frames after the launch */
export function vaultAt(f: number): { u: number; h: number; air: boolean; sq: number; stretch: number; crouch: number; pose: string } {
  const t = f / FPS, u = clamp01((t - launch) / (land - launch));
  const air = t >= launch && t < land;
  // the flight is his kneeling picture (tucked, his hands on his knees: nothing of him reaches out over Denise); his arms open on the landing's frame
  return { u, h: 4 * u * (1 - u), air, sq: squashAt(t, land, 0.3, 40), stretch: air ? Math.sin(Math.PI * u) : 0, crouch: t < launch ? 1 : clamp01(1 - (t - launch) / (2 / FPS)), pose: t >= toBeg ? "beg" : "kneel" };
}
/** the camera's bump on the landing: 14 px at the hit, gone in 0.4 s */
export function bumpAt(f: number): [number, number] {
  const a = f / FPS - land;
  if (a < 0 || a > 0.6) return [0, 0];
  const k = 14 * Math.exp(-a / 0.1);
  return [0.5 * k * Math.sin(a * 80), k * Math.cos(a * 66)];
}

// ── the kiss, front wide (shot 13a): Todd drops to his knees behind her on `kneel` (a fall of 4 frames and a squash), his head peeks out at her hip, on `moveIn` it goes behind her at seat height: it has arrived on the shot's last frame
/** how far he has dropped (0 standing .. 1 on his knees), his squash on the knee drop, how far his head has moved in behind her (0 beside her hip .. 1 behind her seat) */
export function kissAt(f: number): { drop: number; sq: number; head: number; peeking: boolean } {
  const t = f / FPS;
  return { drop: 1 - dropH(t, kneel, 4 / FPS), sq: squashAt(t, kneel, 0.3, 40), head: ease((t - moveIn) / (s12b - 1 / FPS - moveIn)), peeking: t >= peek };
}
// ── the kiss, side view (shot 13b): the two profile pieces hold still for 0.43 s but for Todd, who creeps in toward her seat on the beat (on twos, slowly and then faster, an ease-in: he is leaning on something), and on the smooch's frame his
// lips are on her seat; the spring of the contact (his face pushes in, he squashes a little against her, her body gets a tiny bump forward) rings out in 0.2 s, then nothing moves but the dog
/** `creep`: how far his lips are from her seat (1 at the cut .. 0 on the smooch's frame, 0 after it); `sq`: the spring of the contact (1 on the smooch's frame, then a damped spring, 0 before it) */
export function sideAt(f: number): { creep: number; sq: number } {
  const ft = f >= Math.round(smooch * FPS) ? f : twos(f);
  const a = clamp01((ft / FPS - s12b) / (smooch - s12b));
  return { creep: f >= Math.round(smooch * FPS) ? 0 : 1 - a * a, sq: f / FPS >= smooch ? squashAt(f / FPS, smooch, 0.5, 50) : 0 };
}
/** the dog's jolt on its gasp: up 22 puppet px (the whole dog, on a spring), settles in 0.4 s; its face is the gasp from `dogT` to the end of the shot */
export function dogAt(f: number): { face: "sour" | "neutral" | "gasp"; up: number; rot: number; dx: number; sx: number } {
  const t = f / FPS, a = t - dogT;
  const kn = shotId(f) === "kneelB";
  let up = 0, rot = 0, dx = 0, sx = 1, face: "sour" | "neutral" | "gasp" = "sour";
  if (!(kn && t >= smooch)) up += 1.6 * Math.sin((Math.PI * 2 * (twos(f) / FPS)) / 2.6 + 1.1); // idle: the dog breathes a little slower than she does, on twos; in the freeze (from the smooch) it holds still until the gasp
  if (kn && a >= 0) { face = "gasp"; up += 22 * Math.exp(-a / 0.13) * Math.abs(Math.cos(a * 22)); sx = 1 + 0.06 * squashAt(t, dogT, 0.3, 40); }
  if (shotId(f) === "ugh") { const k = turnK(f); rot = -10 * k; dx = -5 * k; } // it turns away with her: tilted about its paws, which stay on the purse's rim
  return { face, up, rot, dx, sx };
}
/** the turn away on "Ugh.": 0 .. 1 over 4 frames from the groan's first frame, held to the cut; on twos */
export const turnK = (f: number) => (shotId(f) === "ugh" ? ease((twos(f) - Math.round(turn * FPS)) / 4) : 0);

// ── the review on her phone (shot 14): the thumb presses Post on `postT` (a dip of 2 frames), the review is posted on `dingT`
export const postedK = (f: number) => popP(f / FPS, dingT);
export const pressK = (f: number) => Math.max(0, 1 - Math.abs(f / FPS - postT) / (2 / FPS));
export const starAt = (i: number, f: number) => ({ on: f / FPS >= STAR_T[i], p: popP(f / FPS, STAR_T[i]) });

// ── the door (shot 16): the leaf is hinged on its right side and swings out, away from the camera, 0 = shut .. 84 degrees (nearly edge-on: a thin leaf at the hinge, she stands clear in the doorway) in 4 frames; the bell hangs at its top
// and swings on the door's move. The leaf is in front of her until it is past 35 degrees (its free edge has swung back behind her), then behind her
export const DOOR_OPEN = 84, DOOR_FRAMES = 4;
export function doorAngle(f: number): number {
  const t = f / FPS;
  return DOOR_OPEN * ease((t - doorOpen) / (DOOR_FRAMES / FPS));
}
export function bellAngle(f: number): number {
  const a = f / FPS - doorOpen;
  return a < 0 ? 0 : 16 * Math.exp(-a / 0.3) * Math.sin(2 * Math.PI * 5.5 * a);
}
/** the card NEXT MORNING, 6:00 AM: it pops in on the first frame of the shot (a spring) and stays */
export const cardK = (f: number) => popP(f / FPS, s15 - 1 / FPS, 0.5, 40);

// ── Denise turns her head (shot 18): 0 looking at the camera .. 1 looking behind her; the turn takes 8 frames and starts 0.1 s into the shot, on twos. The head slides and tilts only so far that the hood's neck (a body picture cut
// from under a head of another size) stays covered: TURN_DX puppet px sideways, TURN_TILT degrees
export const TURN_DX = 6, TURN_TILT = 4;
export const denTurnK = (f: number) => ease((twos(f) - Math.round((s17 + 0.1) * FPS)) / 8);

// ── Todd with the hair dryer (shot 20): his head slides into the nozzle's stream (src/lips-fix.json: the nozzle ends DRYER.gap px short of his lips), the hair flutters, hot air streams from the nozzle to his lips
/** the dryer's numbers: how far his head slides toward it (puppet px), how far his mouth is raised so that the pucker is at the nozzle's height (puppet px: the pucker's middle is 0.2 of the mouth's width under its anchor) */
export const DRYER = { hdx: lipsFix.todd.dryer.hdx, mdy: lipsRig.todd.mouth.cy + 0.2 * lipsRig.todd.mouthW - lipsFix.todd.dryer.endY };
/** the flutter of his hair and head: a quick wobble on twos (10 Hz) with a slow drift */
export function flutterAt(f: number): { tilt: number; phase: number } {
  const ft = twos(f) / FPS;
  return { tilt: 1.3 * Math.sin(ft * 62) + 0.6 * Math.sin(ft * 23 + 1.3), phase: ft };
}

// ── the sweat of shot 10: on every loud syllable of "Ma'am, anything!" two drops fly off his head (puppet px from the middle of his head, y up), on gravity, gone in 0.55 s; no two drops ever touch (v1's did: a notched double drop)
export const SWEAT_PER = 2;
export const SWEAT_T: number[] = LINE(10).peaks.flatMap((p) => Array.from({ length: SWEAT_PER }, () => p.f / FPS));
const DROP_T = 0.55, DROP_G = 1500; // a drop is in the air for 0.55 s, on gravity
export const DROP_SIZE = 10, DROP_CLEAR = 36; // a drop is 3.2 x 10 = 32 puppet px long and 20 wide; the middles of two drops in the air together are 36 apart at the least
// two drops fly off on a loud syllable, one to each side: one steep and short, one flat and long; which side has which swaps on every syllable, so that two drops launched 0.2 s apart on one side never take the same way
const STEEP = { deg: 58, v: 540, ax: 100, y0: 175 }, FLAT = { deg: 24, v: 620, ax: 118, y0: 140 };
export function sweatAt(i: number, f: number): { on: boolean; x: number; y: number; rot: number; a: number } {
  const a = f / FPS - SWEAT_T[i];
  if (a < 0 || a > DROP_T) return { on: false, x: 0, y: 0, rot: 0, a: 0 };
  const j = i % SWEAT_PER, k = Math.floor(i / SWEAT_PER), side = j === 0 ? -1 : 1, w = (k + j) % 2 === 0 ? STEEP : FLAT;
  const ang = (w.deg * Math.PI) / 180, vx = side * w.v * Math.sin(ang), vy = w.v * Math.cos(ang);
  return { on: true, x: side * w.ax + vx * a, y: w.y0 + vy * a - 0.5 * DROP_G * a * a, rot: (Math.atan2(vx, vy - DROP_G * a) * 180) / Math.PI, a: 1 - ease((a - 0.4) / 0.15) };
}

// every picture hit that has a sound: the sound's measured peak sits on the hit's frame (cues() starts the clip `peak` s earlier)
export type Hit = { id: string; shot: ShotId; t: number; sfx: string; db: number; fall?: number; len?: number; fade?: number };
export const HITS: Hit[] = [
  { id: "rise", shot: "review", t: rise, sfx: "whoosh", db: -18 },
  { id: "launch", shot: "vault", t: launch, sfx: "whoosh", db: -3 },
  { id: "land", shot: "vault", t: land, sfx: "thud", db: -2, fall: land - launch },
  { id: "knee", shot: "kneelA", t: kneel, sfx: "thud", db: -5, len: THUD_LEN, fade: 0.1 }, // cut short: its tail would run into the dead silence after the smooch
  { id: "smooch", shot: "kneelB", t: smooch, sfx: "smooch", db: -1 },
  { id: "dogGasp", shot: "kneelB", t: dogT, sfx: "doggasp", db: -3 },
  ...STAR_T.map((t, i): Hit => ({ id: `star${i + 1}`, shot: "reviewPhone", t, sfx: "pop", db: -12 })),
  ...TICK_T.map((t, i): Hit => ({ id: `key${i + 1}`, shot: "reviewPhone", t, sfx: "tick", db: -10 })),
  { id: "post", shot: "reviewPhone", t: postT, sfx: "tap", db: -6 },
  { id: "ding", shot: "reviewPhone", t: dingT, sfx: "ding", db: -7 },
  { id: "chime", shot: "morning", t: doorOpen, sfx: "chime", db: -6 },
];

// ── the mouth: a level per frame from the loudness of the take, on twos, one frame ahead of the sound; closed whenever the character is not speaking (and for the dog and the line: nobody but the speaker moves a mouth)
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const ampAt = (l: Line, f: number) => l.amp[f - l.f0] ?? 0;
const lineAt = (c: Char, f: number, before = 0.1, after = 0.05) => linesOf(c).find((q) => f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (c: Char, f: number) => !!lineAt(c, f);
export function moodAt(c: Char, f: number): Mood {
  const t = f / FPS;
  switch (c) {
    case "customer":
      if (t < s3) return "angry"; // "This is hot.": sour
      if (t < s5) return "smug"; // "I'm leaving a review."
      if (t < s7) return "impatient"; // "I didn't ask for free."
      if (t < s9) return "resigned"; // "I liked her." (let down, flat)
      if (t < s11) return "angry"; // "Ugh."
      if (t < s13) return "smug"; // "Anything? What, you gonna kiss my ass?"
      return "flat"; // "Cold lips.", "The usual."
    case "todd":
      if (t < s6) return "polite"; // "On the house!": eager
      if (t < s7) return "angry"; // "You're fired!": barking
      if (t < s10) return "polite"; // "You're hired!"
      return "defeated"; // "Ma'am, anything!": begging
    case "lineA": case "lineB": case "lineC": case "lineD": return "flat";
    default: return "flat"; // Denise
  }
}
export function mouthAt(c: Char, f: number): MouthShape {
  const l = lineAt(c, f);
  if (!l) return "closed";
  const fi = twos(f), a = ampAt(l, fi + 1);
  if (a < 0.1) return "closed";
  const mood = moodAt(c, fi), w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (mood !== "angry" && mood !== "furious" && w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  let s: MouthShape = a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
  if (mood === "flat" && s === "wide") s = "mid";
  return s;
}
// ── the head: tilts a little and dips on every syllable, alternating sides, each move eased over 6 frames; it settles after the line
const TILT: Record<Char, number> = { customer: 1.3, todd: 2.8, deniseHood: 2.2, lineA: 1, lineB: 1, lineC: 1, lineD: 1 }; // degrees
const BOB: Record<Char, number> = { customer: 2.2, todd: 4, deniseHood: 2.8, lineA: 1, lineB: 1, lineC: 1, lineD: 1 };
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

// ── blinks: every 2.5-4.5 s, 3 frames (half, shut, half), at hashed times; a blink that would touch a cut (the first or the last frame of a shot, one frame of margin either side) is dropped: a cut on a half-shut eye reads as a glitch
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
const SEEDS: Record<Char, number> = { customer: 5, todd: 11, deniseHood: 4, lineA: 6, lineB: 19, lineC: 23, lineD: 27 };
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3].some((f) => CUT_F.has(f)));
}
export const BLINKS: Record<Char, number[]> = Object.fromEntries((Object.keys(SEEDS) as Char[]).map((c) => [c, blinkStarts(SEEDS[c])])) as Record<Char, number[]>;
export const blinkK = (c: Char, f: number) => {
  const sh = shotId(f);
  if (frozen(f) || sh === "coldLips" || sh === "fired" || sh === "hired") return 0; // the freeze, her stare, and Denise who does not react: nobody blinks
  if (c === "todd" && (sh === "anything" || sh === "vault")) return 0; // wide-eyed
  for (const s of BLINKS[c]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};

// ── faces by beat: [seconds, value] keys, eased between
const D = (k: [number, number][]) => (t: number) => keys(t, k);
const cusLid = D([[0, 0.3], [s3, 0.3], [rise - 0.05, 0.3], [rise + 0.05, 0.12], [s5 - 0.1, 0.18], [s5, 0.1], [s7, 0.3], [s9, 0.32], [turn, 0.32], [turn + 0.1, 0.5], [s11, 0.45], [s11 + 0.1, 0.06], [s11b, 0.06], [s11b + 0.1, 0.32], [s13, 0.36], [s14, 0.36], [s16, 0.3], [s16 + 0.2, 0.36]]);
const cusAngry = D([[0, 0.35], [s3, 0.2], [s5, 0.05], [s7, 0.1], [s9, 0.2], [turn, 0.2], [turn + 0.1, 0.8], [s11, 0.2], [s11 + 0.1, 0], [s11b, 0.05], [s13, 0.15], [s14, 0.15], [s16, 0.12]]);
const cusLift = D([[0, 0], [s11, 0], [s11 + 0.1, 0.9], [s11b - 0.05, 0.9], [s11b, 0.1], [s11b + 0.2, 0.25]]);
const cusAsym = D([[0, 0], [s3, 0.4], [s5, 0], [s11b - 0.05, 0], [s11b + 0.05, 0.9], [s13 - 0.01, 0.9], [s13, 0]]);
const cusSad = D([[0, 0], [s7, 0.15], [s8, 0.15], [s9, 0]]);
const BASE_LID: Partial<Record<Char, number>> = { todd: 0.05, deniseHood: 0.3, lineA: 0.3, lineB: 0.25, lineC: 0.3, lineD: 0.3 };
export function lidAt(c: Char, f: number): number {
  const t = f / FPS;
  let b = c === "customer" ? cusLid(t) : BASE_LID[c] ?? 0.2;
  if (c === "todd" && shotId(f) === "dryer") b = 0.35; // calm, eyes half shut in the warmth
  if (c === "todd" && shotId(f) === "kneelA" && t >= moveIn) b = 1; // eyes shut tight for the kiss
  return Math.max(b, b + (1 - b) * blinkK(c, f));
}
// ── gaze: where the pupils look, -1..1 of their travel (x right, y down). The customer's shots look from the counter side: Denise and Todd are on her right (the screen's right); in the counter shots the customer is off screen to the right
export function gazeAt(c: Char, f: number): [number, number] {
  const sh = shotId(f), t = f / FPS;
  switch (c) {
    case "customer":
      switch (sh) {
        case "hook": case "review": case "usual": return [0.55, 0.05]; // at Denise
        case "free": case "liked": return [0.5, 0.15]; // at Todd, down: he is short
        case "ugh": return t < turn ? [0.5, 0.15] : [-1, 0.05]; // away from him
        case "anythingQ": case "kissAss": return [0.45, 0.35]; // down at him
        case "kneelA": return [0.1, 0.1];
        case "coldLips": return [0.2, 0.2];
        case "morning": return [0.1, 0.05];
        default: return [0.3, 0.1];
      }
    case "todd":
      switch (sh) {
        case "vault": return [0.7, 0.1]; // at the customer, off screen to the right
        case "fired": return [0.75, 0]; // at her, not at the woman he points at
        case "hired": return t < s8 + 0.25 ? [-0.5, 0] : [0.75, 0]; // a glance at Denise, then back to her
        case "anything": return [0.7, 0.1];
        case "dryer": return [-0.25, 0.15]; // toward Denise (she is on his left), caught
        default: return [0.3, 0.2];
      }
    case "deniseHood":
      switch (sh) {
        case "denCoffee": return [0.55, 0.05]; // the customer, off screen to the right
        case "vault": case "fired": case "hired": return t < land ? [0.55, 0.05] : [0.45, 0.1]; // at her; Todd landed in front
        case "denTurn": return [0.55 - 1.55 * denTurnK(f), 0.05]; // the customer, then over her shoulder
        default: return [0.5, 0.05];
      }
    default: { // the line: down at their phones, at the counter; in the freeze, straight at the camera
      return [0.5, 0.2];
    }
  }
}
// ── the body of a character with several poses (the rig's keys)
export function bodyAt(c: Char, f: number): string | undefined {
  const sh = shotId(f), t = f / FPS;
  switch (c) {
    case "customer": return sh === "hook" ? "rat" : sh === "review" ? (t >= rise ? "phone" : "stand") : sh === "morning" || sh === "usual" ? "stand" : "phone";
    case "todd":
      if (sh === "vault") return vaultAt(f).pose;
      if (sh === "fired") return "point";
      if (sh === "hired" || sh === "anything") return "beg";
      if (sh === "kneelA") return t >= fall ? "kneel" : "beg";
      if (sh === "dryer") return "dryer";
      return "beg";
    case "deniseHood": return "apron";
    default: return undefined;
  }
}
/** the pose of a character on frame f, the way src/sp-puppet.tsx wants it */
export function poseAt(c: Char, f: number): LPose {
  const fc = QUEUE.includes(c) || c === "customer" ? clockOf(f) : f; // the freeze stops the line and her (Todd moves in on his own clock)
  const t = fc / FPS, ft = twos(fc) / FPS, sh = shotId(f);
  const m = talkMove(c, fc);
  const phase = { customer: 0.8, todd: 2.1, deniseHood: 0.4, lineA: 2.7, lineB: 1.7, lineC: 0.9, lineD: 3.3 }[c];
  let tilt = m.tilt, bob = m.bob, lift = 0, angry = 0, sad = 0, asym = 0, pupil = 1, dx = 0, hdx = 0, mdy = 0, jump = 0, mouth = mouthAt(c, fc), mood = moodAt(c, fc), gaze = gazeAt(c, f);
  if (c === "customer") {
    angry = cusAngry(t); lift = cusLift(t); asym = cusAsym(t); sad = cusSad(t);
    if (sh === "review" && t >= rise) { const a = ft - rise; jump += 12 * Math.exp(-a / 0.1) * Math.cos(a * 30); } // the spring of the phone's rise: she pops up 12 puppet px and rings out in 0.3 s, on twos
    if (sh === "anythingQ") tilt += 4 * ease((t - s11) / 0.2); // a question: the head tilts
    if (sh === "ugh") { const k = turnK(f); tilt += -11 * k; hdx += -10 * k; } // "Ugh.": the head turns away on the groan's first frame; the mouth follows the groan
    if (sh === "kissAss") { tilt += -2.5 * ease((t - (s11b + 0.1)) / 0.3); }
    if (sh === "coldLips" || frozen(f)) { tilt = 0; bob = 0; } // deadpan: she does not move
  }
  if (c === "todd") {
    const trembling = sh === "anything" || sh === "fired" || sh === "hired" || (sh === "vault" && f / FPS >= toBeg);
    if (trembling) dx += (Math.floor(ft * 15) % 2 ? 1 : -1) * 2.2; // a nervous shiver, on twos
    sad = sh === "anything" ? 1 : sh === "vault" || sh === "hired" ? 0.35 : 0;
    if (sh === "kneelA") { sad = 0.6; if (t >= moveIn) { mouth = "pucker"; mood = "flat"; tilt = -14 * ease((t - moveIn) / (s12b - 1 / FPS - moveIn)); sad = 1; } } // the kiss: lips pushed out, eyes shut, the head leans in against her coat
    for (const p of LINE(4).peaks.concat(LINE(6).peaks, LINE(8).peaks, LINE(10).peaks)) bob += -6 * bump(ft, p.f / FPS - 0.03, p.f / FPS, p.f / FPS + 0.02, p.f / FPS + 0.12) * 0.5; // he dips on every loud syllable
    if (sh === "dryer") {
      const fl = flutterAt(f);
      tilt = 2 + fl.tilt; hdx = DRYER.hdx; mdy = DRYER.mdy; mouth = "pucker"; mood = "flat"; // the head slides into the stream, the pucker is at the nozzle's height
      sad = 0; asym = 0; angry = 0.15;
    }
    if (sh === "vault") { gaze = gazeAt("todd", f); }
    if (sh === "hired") { tilt += -5 * (ft < s8 + 0.25 ? 1 : 0); } // his head turns toward Denise on the open arms
    if (sh === "fired" || sh === "hired") for (const p of LINE(sh === "fired" ? 6 : 8).peaks) dx += -9 * bump(ft, p.f / FPS - 0.05, p.f / FPS, p.f / FPS + 0.03, p.f / FPS + 0.15); // he lunges toward Denise on every loud syllable: the point jabs, the open arms reach
  }
  if (c === "deniseHood") {
    if (sh === "denTurn") { const k = denTurnK(f); tilt += -TURN_TILT * k; dx += -TURN_DX * k; lift = 0.3 * k; mood = "flat"; }
    if (sh === "fired" || sh === "hired") { tilt = 0; bob = 0; } // she does not react
  }
  const lid = lidAt(c, fc), shut = blinkK(c, fc) > 0 || lid >= 0.9;
  const eyes = shut ? { lid, gaze } : fitEyes(c, lid, gaze, pupil); // a pupil never hides under the lid
  const breath = sh === "coldLips" && c === "customer" ? 0 : 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + phase); // t is the frozen clock in the freeze: the breath stops where it was; in "Cold lips." she does not move at all
  return { body: bodyAt(c, f), tilt, bob, breath: breath + jump, mouth, mood, ...eyes, angry, sad, lift, asym, pupil, dx, hdx, mdy };
}

// ── no pupil hides under a lid: the eyes look lower, or the lid opens (src/pen-eyes.ts does this for the rigs of Pen; this is the same arithmetic on the rigs of this episode)
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
  const clear = (l: number, g: [number, number]) => Array.from({ length: n }, (_, i) => clearance(char, i, l, g, pupil)).every((c) => c >= 2); // 2 px of white between the lid and the pupil
  for (let l = lid; l > 0; l -= 0.02) for (let gy = gaze[1]; gy <= 1.0001; gy += 0.02) if (clear(l, [gaze[0], gy])) return { lid: l, gaze: [gaze[0], Math.min(1, gy)] };
  return { lid: 0, gaze };
}

// ── captions: one plain line at a time, the current speaker's words only; split at sentence ends, pauses, cuts and ~22 characters. A caption lives inside one shot: it is split where a cut falls between two words,
// and starts no earlier than the cut that brings its first word. The band is the usual one (y 1295-1455) in every shot; the last shot has none (its line is the share line, at the top)
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
  caps.forEach((c) => { const s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (s) { c.t0 = Math.max(c.t0, s.t0); c.t1 = Math.min(c.t1, s.t1); } }); // a caption never runs over a cut
  caps.forEach((c, i) => { const n = caps[i + 1], s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (n && n.n === c.n && s && n.t0 > c.t1 && n.t0 - c.t1 < 0.1) { if (n.t0 >= s.t1 - 1e-6) { c.t1 = s.t1; n.t0 = s.t1; } else c.t1 = n.t0; } }); // no flash of an empty frame inside a line
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
/** where the captions sit in the frame (y px): one band for the reel */
export const CAP_BAND: [number, number] = [1295, 1455];
export const capBand = (_id: ShotId): [number, number] => CAP_BAND;
export const SHARE = "Send this to someone who's served her.";
export const shareK = (f: number) => ease((f / FPS - T.share) / 0.18);

// ── sound cues for the mix (scripts/lips-cues.mts): name, time, db, optional length and fade
/** the clink-free stretches of public/sfx/cafebed.mp3 (s of the clip) that the murmur's bed is cut from, in order, and its level: the stretches are noise, so a seam between two of them is not heard; the last one is cut at the smooch */
export const BED_SRC: [number, number][] = [[0, 5.6], [7.64, 9.54], [14.24, 19.98]];
export const BED: [number, number][] = [[0, 5.5], [14.3, 19.9], [0.4, 5.5], [14.3, 19.9]];
export const BED_DB = 6;
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  const add = (name: string, at: number, db = 0, o: { len?: number; fade?: number; from?: number } = {}) => c.push({ name, at, db, ...o });
  HITS.forEach((h) => add(h.sfx, onPeak(h.sfx, h.t), h.db, { ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}) }));
  // the shop's murmur under everything until the smooch's peak, where it cuts to dead silence. The clip's loudest clinks are 36 dB over its body (the one at 5.6 s peaks at -6 dBFS, three more at 6.6-7.6 s, softer ones from 9.8 s
  // to 14.1 s), so it cannot be raised to a level where the body is heard without them: the bed is cut from its clink-free stretches (peaks under -24 dBFS: 0-5.6 s, 7.64-9.54 s, 14.24-19.98 s, BED_SRC) and raised 6 dB
  let at = 0;
  for (const [a, b] of BED) {
    if (at >= smooch - 1e-9) break;
    const len = Math.min(b - a, smooch - at), last = at + len >= smooch - 1e-9;
    add("cafebed", at, BED_DB, { from: a, len, ...(last ? { fade: 0.04 } : {}) });
    at += len;
  }
  // the hair dryer: the roar starts as Denise turns, a second copy takes over 0.1 s before the first one fades (each clip fades in and out over 0.1 s) and runs to the end
  add("hairdryer", dryer0, -3);
  add("hairdryer", snap(dryer0 + 2.4), -3, { len: T_END - snap(dryer0 + 2.4) + 0.3 });
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── the stills: key frames, at least one per shot and one on each hit, chosen away from blinks (lips-check.mts)
const ALL = Object.keys(SEEDS) as Char[];
const blinking = (f: number, who: Char[]) => who.some((c) => blinkK(c, f - 1) + blinkK(c, f) + blinkK(c, f + 1) > 0); // (a blink that is not drawn - the freeze, her stare, Denise's calm - is none)
/** a key frame at time t, moved on a few frames if anybody on screen (`who`: everybody unless told) blinks there, but kept in its own shot */
const kf = (label: string, t: number, who: Char[] = ALL) => { let f = Math.round(t * FPS); const i = shotAt(f).i; for (let d = 0; d < 8 && blinking(f, who) && shotAt(f + 1).i === i; d++) f++; return { label, f }; };
const mid = (a: number, b: number) => (a + b) / 2;
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 hook: the first picture", 0.2), kf("1 hook: This is hot", L(1).words[2].t + 0.1),
  kf("2 denCoffee: It's coffee", L(2).start + 0.3),
  kf("3 review: the phone is down", T.s3 + 0.15), kf("3 review: the phone is up", T.rise + 0.2), kf("3 review: review", L(3).words[3].t + 0.4),
  kf("4 vault: Denise alone", T.s4 + 0.06), kf("4 vault: the launch", T.launch + 0.04), kf("4 vault: the apex", mid(T.launch, T.land)), kf("4 vault: the landing", T.land), kf("4 vault: On the house", L(4).start + 0.3),
  kf("5 free: I didn't ask for free", L(5).start + 0.5),
  kf("6 fired: You're fired", L(6).start + 0.3),
  kf("7 liked: I liked her", L(7).start + 0.4),
  kf("8 hired: You're hired", L(8).start + 0.3),
  kf("9 ugh: before the groan", T.s9 + 0.02), kf("9 ugh: turned away", T.turned + 0.25),
  kf("10 anything: Ma'am", L(10).start + 0.2), kf("10 anything: the sweat", mid(SWEAT_T[3], SWEAT_T[4]) + 0.1), kf("10 anything: anything", L(10).words[1].t + 0.15),
  kf("11 anythingQ: Anything?", L(11).start + 0.3),
  kf("12 kissAss: What, you gonna", L(11).words[2].t + 0.05), kf("12 kissAss: kiss my ass", L(11).words[5].t + 0.1),
  kf("13 kneelA: he stands behind her", T.s12 + 0.05), kf("13 kneelA: the knee drop", T.kneel), kf("13 kneelA: his head peeks out", mid(T.peek, T.moveIn)), kf("13 kneelA: kneeling beside her", T.s12b - 0.07),
  kf("14 kneelB: the side view", T.s12b + 0.07), kf("14 kneelB: the lips about to land", T.smooch - 2 / FPS), kf("14 kneelB: the smooch", T.smooch), kf("14 kneelB: the bump", T.smooch + 2 / FPS), kf("14 kneelB: the freeze", T.smooch + 0.3), kf("14 kneelB: the dog gasps", T.dogT + 0.07),
  kf("15 coldLips: Cold lips", L(12).words[1].t + 0.15),
  kf("16 reviewPhone: the stars", STAR_T[2] + 0.03), kf("16 reviewPhone: typing", mid(T.typeStart, T.typeEnd)), kf("16 reviewPhone: posted, readable", T.dingT + 0.5),
  kf("17 morning: the card, the door shut", T.s15 + 0.1), kf("17 morning: the door swings", T.doorOpen + 2 / FPS, ["customer"]), kf("17 morning: the door is open", T.doorOpen + 0.2, ["customer"]), kf("17 morning: first in line", T.s16 - 0.1),
  kf("18 usual: The usual", L(13).words[1].t + 0.15),
  kf("19 denTurn: she turns", mid(T.s17 + 0.1, T.s18)), kf("19 denTurn: over her shoulder", T.s18 - 0.05),
  kf("20 dryer: the hair dryer", T.s18 + 0.1), kf("20 dryer: the stream", T.s18 + 0.7), kf("20 dryer: the share line", T.share + 0.8),
];
