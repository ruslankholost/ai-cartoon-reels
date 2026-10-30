// The timeline and the acting of "I'm Just Not a Sales Person" (src/Pen.tsx, docs/x04-sell-me-this-pen.md, v2: the satire cut, lines 1 and 18-33). Pure data and arithmetic: every number is a function of the frame, of the voice takes in
// public/pen/timings.json and of the mouth loudness in src/amp-pen.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock
// (take n sits at tableRead.cues[n].at, so the gaps of episodes/pen.jsonc carry the silent beats): every cut and action below is anchored to a take (before or after a word, in a pause, or on a loud
// syllable) or to the measured peak of a sound (src/sfx-peaks.json), never to a number of its own.
import timings from "../public/pen/timings.json" with { type: "json" };
import amps from "./amp-pen.json" with { type: "json" };
import { FPS, clamp01, ease, easeOut, hash, keys, onPeak, snap } from "./tip-sched.ts";
import { spring } from "./sp-math.ts";
import { fitEyes } from "./pen-eyes.ts";
import type { Mood, MouthShape } from "./sp-puppet";

export { FPS, clamp01, ease, easeOut, hash, keys, onPeak, snap };
export type { Mood, MouthShape };

export type Char = "denisePen" | "rhondaPen" | "brandon" | "clerk" | "hostess" | "guest1" | "guest2" | "guest3";

// ── the voice takes
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;

export type Peak = { f: number; a: number; sign: 1 | -1 };
// first: the take's first sound (a sigh counts), tend: its last sound, both in reel seconds; voiced: the stretches of sound of the built line, in reel seconds
export type Line = { n: number; who: string; char: Char; file: string; ofs: number; text: string; words: Word[]; first: number; start: number; end: number; tend: number; amp: number[]; f0: number; peaks: Peak[]; voiced: [number, number][] };
const CHAR_OF: Record<string, Char> = { DENISE: "denisePen", RHONDA: "rhondaPen", BRANDON: "brandon", "GUEST 1": "guest1", "GUEST 2": "guest2", "GUEST 3": "guest3" };

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

// ── the cuts and the named moments (seconds). Every one hangs on a take: before its first sound or after its last
/** a speaker cut: `d` s before the take's first sound (a sigh counts) or its first word, whichever comes first */
const spk = (n: number, d = 0.06) => snap(Math.min(L(n).first, L(n).start) - d);
/** `d` s after the take's last sound */
const aft = (n: number, d = 0.05) => snap(L(n).tend + d);
/** `d` s before the take's first sound or word */
const bef = (n: number, d = 0.1) => snap(Math.min(L(n).first, L(n).start) - d);
/** the middle of the longest silence inside a take (the pause between its two sentences, or at its comma), from the stretches of sound of the built line: a cut that falls there is inside no word */
function pauseMid(n: number): number {
  const v = L(n).voiced;
  let best = 0, at = 0;
  for (let i = 1; i < v.length; i++) if (v[i][0] - v[i - 1][1] > best) { best = v[i][0] - v[i - 1][1]; at = (v[i][0] + v[i - 1][1]) / 2; }
  return at;
}
// The satire cut (v2, 10-22): line 1, then lines 18-33. The moment names keep v1's shot numbers (s23 is the third shot now, s24 the fourth ...), so the scenes, the checks and the doc of v1 still line up;
// the story's moments (v1's s3-s22) went to the Tup episode (src/tup-sched.ts, docs/x05).
// the garage: the belief; the phone: SALES REP stands, readable, for a full second, then the thumb swipes it away; the group chat's text sells it back
const s2 = aft(1, 0.02); // her phone: the job ad
const swipe0 = snap(s2 + 1.05), swipe1 = snap(swipe0 + 0.23); // SALES REP is unobstructed for 1.0 s, then the thumb drags the ad off (the whoosh lands in the swipe)
const s23 = snap(swipe1 + 0.1); // the group chat: the phone buzzes (twice), the message pops in on the first buzz and is readable for 1.6 s
const buzz1 = snap(s23 + 0.1), buzz2 = snap(buzz1 + 0.4);
const s24 = bef(18, 0.08);
// the office
const s25 = bef(19, 0.1), penPush = snap(s25 + 0.06), penStop = snap(penPush + 0.5); // the pen slides across the desk and stops short of the camera
const s26 = spk(20, 0.14);
const s27 = aft(20, 0.08), penPull = s27, contractPush = snap(s27 + 0.12), contractStop = snap(contractPush + 0.38);
const s28 = spk(22, 0.07), pat1 = snap(s28 + 0.1), pat2 = snap(pat1 + 0.17); // both pats fall in the hesitation before "You got a pen?"
const s29 = bef(23, 0.08), readerPop = snap(L(23).words[1].t); // the card reader pops up on "bucks"
const s30 = aft(23, 0.07), tap30 = snap(s30 + 0.12);
const s31 = snap(s30 + 0.5); // the pen signs
const s32 = spk(24, 0.12);
const s33 = aft(24, 0.045), boxLand = aft(25, 0.07), beep33 = snap(boxLand + 0.1);
const s34 = spk(26, 0.1), s35 = spk(27, 0.12), s36 = spk(28, 0.03);
const s37 = snap(pauseMid(28)); // "Don't do the math." | "Comes with the yacht." over the poster
const s38 = spk(29, 0.05), beep38 = aft(29, 0.04);
const s39 = aft(29, 0.1), pallet = snap(s39 + 0.3);
const s40 = snap(s39 + 0.9), rip = snap(s40 + 0.08), posterFree = snap(rip + 0.27), posterRolled = snap(posterFree + 0.27), posterLay = snap(posterRolled + 0.22);
// the garage again: nine thousand pens
const s42 = spk(30, 0.06), s41 = snap(s42 - 0.9), door41 = snap(s41 + 0.1);
const s43 = spk(31, 0.13), click = aft(31, 0.03);
const s44 = aft(31, 0.1), wall = snap(s44 + 0.2);
const s46 = snap(spk(32, 0.03) - 0.8); // her eyes, 0.8 s before her line
const s45 = snap(s46 - 2.3), fineIn = snap(s45 + 0.5); // the fine print: a push of 0.5 s that stops dead on `fineIn` (a sting on its frame), then the line is held, centred and legible, for 1.8 s (v2: Ross could not read it in 0.3 s)
const eyes46 = snap(s46 + 0.03), penToss = snap(s46 + 0.3), clatter = snap(penToss + 0.3); // the pen slips out of her fist (off the frame), spins, and hits the front row of boxes
const s47 = snap(clatter - 0.13); // the cut: the pen is in the air, four frames from the box, and she speaks 0.2 s after it has landed
const crack48 = snap(L(33).first - 0.1), s48 = snap(crack48 - 0.13);
const s49 = snap(pauseMid(33)); // "Either you're selling," | "or you're buying."
const share = aft(33, 0.04);
export const T = {
  s2, swipe0, swipe1, s23, buzz1, buzz2, s24, s25, penPush, penStop, s26, s27, penPull, contractPush, contractStop, s28, pat1, pat2, s29, readerPop, s30, tap30, s31, s32, s33, boxLand, beep33, s34, s35, s36, s37, s38, beep38, s39, pallet,
  s40, rip, posterFree, posterRolled, posterLay, s41, door41, s42, s43, click, s44, wall, s45, fineIn, s46, eyes46, penToss, clatter, s47, crack48, s48, s49, share,
  end: snap(share + 2.5),
};
export const T_END = T.end;
export const FRAMES = Math.round(T_END * FPS);

// The shots (docs/x04-sell-me-this-pen.md, the shot list: 29 shots), one per framing: a speaker cut to whoever speaks, an insert only for a thing the joke needs. pen-check.mts holds the list to the length
// rule (<= 2.4 s except the last shot) and to "no two shots in a row with the same framing".
export const SHOT_IDS = [
  "garageMed", "phoneAd", "phoneMsg", "denBoss", "penSlide", "denResume", "contract", "denPockets", "readerUp", "cardTap", // 1-10 (v1: 1, 2, 23-30)
  "signed", "kitSays", "boxCatch", "diamond", "denCount", "mathCut", "posterIns", "denSure", "palletWide", "posterRip", // 11-20 (v1: 31-40)
  "garageEnd", "rhoPens", "denClick", "rhoWall", "posterFine", "denEyes", "denSwear", "rhoCrack2", "wideEnd", // 21-29 (v1: 41-49)
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
/** the shot numbers of v1 (the 49-shot film): the moments (T.s25 ...), the comments and the scenes still use them, and the stills' labels show both */
export const V1_NO: Record<ShotId, number> = {
  garageMed: 1, phoneAd: 2, phoneMsg: 23, denBoss: 24, penSlide: 25, denResume: 26, contract: 27, denPockets: 28, readerUp: 29, cardTap: 30, signed: 31, kitSays: 32, boxCatch: 33, diamond: 34, denCount: 35, mathCut: 36, posterIns: 37,
  denSure: 38, palletWide: 39, posterRip: 40, garageEnd: 41, rhoPens: 42, denClick: 43, rhoWall: 44, posterFine: 45, denEyes: 46, denSwear: 47, rhoCrack2: 48, wideEnd: 49,
};
const STARTS = [0, ...SHOT_IDS.slice(1).map((id) => (T as Record<string, number>)[`s${V1_NO[id]}`])]; // the cut to a shot is T.s<its v1 number>
export const SHOTS: { id: ShotId; t0: number; t1: number }[] = SHOT_IDS.map((id, i) => ({ id, t0: STARTS[i], t1: i + 1 < STARTS.length ? STARTS[i + 1] : T_END }));
export function shotAt(f: number) {
  const t = f / FPS;
  const i = SHOTS.findIndex((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  const s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  return { ...s, i: i < 0 ? SHOTS.length - 1 : i, lt: t - s.t0, d: s.t1 - s.t0, u: clamp01((t - s.t0) / (s.t1 - s.t0)) };
}
/** the sepia shots (a CSS filter on the shot, grain, a vignette, a flicker): none in v2; the story's are the Tup episode's (src/tup-sched.ts) */
export const STORY: ReadonlySet<ShotId> = new Set<ShotId>();
export const isStory = (f: number) => STORY.has(shotAt(f).id);
/** the slow push of a hold: a zoom factor that grows through the shot (slower in the story) */
export const holdPush = (f: number) => (shotAt(f).id === "posterFine" ? 1 + 0.02 * fineHold(f) : 1 + (isStory(f) ? 0.02 : 0.035) * shotAt(f).u);
/** the camera of shot 45: 0 on the yacht, 1 on the fine print. A push of 0.46 s (after 0.04 s on the yacht) that stops dead on `fineIn`; src/pen-scenes.tsx PosterFine puts the line in the middle of the frame at 1 */
export const fineP = (f: number) => ease((f / FPS - (T.s45 + 0.04)) / (T.fineIn - T.s45 - 0.04));
/** 0..1 over the hold of the fine print (from the camera's arrival to the cut): the slow 2 % push runs on it */
export const fineHold = (f: number) => clamp01((f / FPS - T.fineIn) / (T.s46 - T.fineIn));
/** poses move on twos: the frame a moving pose is computed at */
export const twos = (f: number) => f - (f % 2);

// ── physics. Things fall under constant gravity, land with a squash and a small spring overshoot, and slide to a stop with friction; every landing is on the frame of its sound's measured peak.
/** a body let go at the top: how far above its resting place it is (1 = where it starts, 0 = at rest) when it lands at `tl` after falling for `fall` s; the distance fallen goes with the square of the time */
export const dropH = (t: number, tl: number, fall: number) => (t >= tl ? 0 : t <= tl - fall ? 1 : 1 - ((t - (tl - fall)) / fall) ** 2);
/** the squash of a landing: 1 on the frame it lands, then a damped spring through 0 (a small stretch below it) to rest in about 0.4 s; 0 before */
export const squashAt = (t: number, tl: number, zeta = 0.3, omega = 38) => (t < tl ? 0 : 1 - spring(t - tl, zeta, omega));
/** a pop with a spring overshoot: 0 before `t0`, then up to 1 with an overshoot of about 20 % that rings out in 0.3 s */
export const popP = (t: number, t0: number, zeta = 0.45, omega = 36) => spring(t - t0, zeta, omega);
/** the slide of something shoved over a table: 0 before the push, then it slows at a constant rate and stops dead at `t1` (the distance goes with 1 - (1 - u)^2) */
export const slideP = (t: number, t0: number, t1: number) => { const u = clamp01((t - t0) / (t1 - t0)); return 1 - (1 - u) ** 2; };
/** the wind-up before a hit: 0 until `dur` s before `th`, then a half sine up to 1 and back to 0 on `th` (the arm draws back, the can lifts) */
export const antic = (t: number, th: number, dur = 0.1) => (t <= th - dur || t >= th ? 0 : Math.sin((Math.PI * (t - (th - dur))) / dur));

// the thumb drags the job ad off her phone (shot 2): 0 -> 1, eased
export const swipeP = (f: number) => ease((f / FPS - T.swipe0) / (T.swipe1 - T.swipe0));
// the phone buzzes twice (shot 23): a wiggle in px on every frame of a buzz, and the message pops in on the first one
export function buzzAt(f: number): { wig: number; pop: number } {
  const t = f / FPS;
  return { wig: [T.buzz1, T.buzz2].some((b) => t >= b && t < b + 0.3) ? (f % 2 ? 1 : -1) * (6 + 3 * hash(f + 9)) : 0, pop: popP(t, T.buzz1) };
}
// the pen signs the contract (shot 31): the scribble is drawn from 0 to 1 while the sound runs
export const signP = (f: number) => clamp01((f / FPS - (T.s31 + 0.03)) / (T.s32 - 0.1 - (T.s31 + 0.03)));
// the two cans: a short puff of spray (a few drops with gravity, the Water kit of src/sp-fx.tsx) from the opening on the can's peak
export const sprayAt = (t0: number, seed = 1) => ({ t0, t1: t0 + 0.1, rate: 55, gravity: 2600, flight: 0.2, spread: 10, seed });
// the dust (the Steam and Goo kit, tuned for dust): births around the peak of a hit (the pallet's slam), it drifts and fades inside the shot
export const dustAt = (t0: number) => ({ t0: t0 - 0.04, t1: t0 + 0.08, stop: t0 + 0.2, breakDur: 0.35 });
// the pen and the contract slide across the desk and stop dead: friction
export const penSlide = (f: number) => slideP(f / FPS, T.penPush, T.penStop);
export const contractSlide = (f: number) => slideP(f / FPS, T.contractPush, T.contractStop);
// the card reader pops up in his hand with a spring overshoot
export const readerPopK = (f: number) => popP(f / FPS, T.readerPop);
// the STARTER KIT box falls into Denise's arms; she dips under its weight (2.5 % of her height) and springs back
export const BOX_FALL = 0.3, DIP = 0.025;
export const boxAt = (f: number) => { const t = f / FPS; return { drop: dropH(t, T.boxLand, BOX_FALL), sq: squashAt(t, T.boxLand, 0.35, 30), dip: DIP * squashAt(t, T.boxLand, 0.4, 28) }; };
// the pallet of PENS boxes falls fast from above the frame; the camera shakes, the boxes on it jiggle on springs; a low dust puff runs along the floor (the Steam kit, from `dustAt(T.pallet)`)
export const PALLET_FALL = 0.22;
export const palletAt = (f: number) => { const t = f / FPS; return { drop: dropH(t, T.pallet, PALLET_FALL), sq: squashAt(t, T.pallet, 0.3, 34) }; };
/** the camera shake after the slam, in px of the frame: 22 px at the hit, gone in 0.4 s */
export function shakeAt(f: number): [number, number] {
  const a = f / FPS - T.pallet;
  if (a < 0 || a > 0.6) return [0, 0];
  const k = 22 * Math.exp(-a / 0.12);
  return [k * Math.sin(a * 95), 0.6 * k * Math.cos(a * 83)];
}
/** box i of the pallet: it jumps on its spring, a little later and with a different phase for every box (px, degrees) */
export function jiggleAt(i: number, f: number): { dy: number; rot: number } {
  const a = f / FPS - T.pallet - 0.015 * i;
  if (a < 0) return { dy: 0, rot: 0 };
  const e = Math.exp(-a / 0.1), s = i % 2 ? 1 : -1;
  return { dy: 16 * (0.6 + 0.4 * hash(i * 3.1)) * e * Math.abs(Math.sin(a * 30 + i)), rot: s * 4 * e * Math.sin(a * 36 + i * 1.7) };
}
// the yacht poster: it peels off from its corner like a hinge (the tape lets go on the rip's peak), swings free, and Brandon rolls it up
export function posterAt(f: number): { hinge: number; free: number; roll: number } {
  const t = f / FPS;
  const u = clamp01((t - T.rip) / (T.posterFree - T.rip));
  return { hinge: 58 * u * u, free: easeOut((t - T.posterFree) / 0.25), roll: ease((t - T.posterFree - 0.05) / (T.posterRolled - T.posterFree - 0.05)) };
}
// the pen in shot 46: it is tossed a little way up out of her fist (the fist is at (-260, 0) from her neck pivot, in puppet px), spins over once and lands on the front row of boxes, FLOOR puppet px
// below the fist, on the frame of the clatter; there it hops off the box (e times the speed it came down with), hops again, and rolls a little to a stop. Puppet px, y up from where the fist holds
// it; g is chosen so that the landing is on that frame. The scenes draw it at (fist + (x, -y) * scale).
export const TOSS = { v0: 700, floor: 400, vx: -60, e: 0.35, roll: 150, fist: [-260, 0] as [number, number] };
export const TOSS_TAU = T.clatter - T.penToss;
export const TOSS_G = (2 * (TOSS.floor + TOSS.v0 * TOSS_TAU)) / TOSS_TAU ** 2;
/** how fast the pen comes down on the landing, puppet px/s */
export const TOSS_VIMP = TOSS_G * TOSS_TAU - TOSS.v0;
export function penDropAt(f: number): { on: boolean; x: number; y: number; rot: number; hops: number; moving: boolean } {
  const t = f / FPS, a = t - T.penToss;
  if (a < 0) return { on: false, x: 0, y: 0, rot: -90, hops: 0, moving: false };
  if (t < T.clatter) return { on: true, x: TOSS.vx * a, y: TOSS.v0 * a - 0.5 * TOSS_G * a * a, rot: -90 + 450 * (a / TOSS_TAU), hops: 0, moving: true }; // held button end up (-90), a turn and a quarter later it lies flat (360)
  const d = t - T.clatter;
  let v = TOSS.e * TOSS_VIMP, dt = d, hops = 0, y = -TOSS.floor, air = false;
  while (v > 45) {
    const T2 = (2 * v) / TOSS_G;
    if (dt < T2) { y = -TOSS.floor + v * dt - 0.5 * TOSS_G * dt * dt; air = true; break; }
    dt -= T2; v *= TOSS.e; hops++;
  }
  return { on: true, x: TOSS.vx * TOSS_TAU + TOSS.roll * 0.18 * (1 - Math.exp(-d / 0.07)), y, rot: 360 + 10 * (1 - Math.exp(-d / 0.06)), hops, moving: air || d < 0.25 };
}
/** the pen's button pops on the click of shot 43: 1 on the click frame, 0 two frames either side */
export const clickK = (f: number) => Math.max(0, 1 - Math.abs(f / FPS - T.click) / 0.07);

// every picture hit that has a sound: the sound's measured peak sits on the hit's frame (cues() starts the clip `peak` s earlier)
export type Hit = { id: string; shot: ShotId; t: number; sfx: string; db: number; fall?: number; len?: number; fade?: number };
export const HITS: Hit[] = [
  { id: "swipe", shot: "phoneAd", t: snap(T.swipe0 + 0.08), sfx: "whoosh", db: -8 },
  { id: "buzz1", shot: "phoneMsg", t: T.buzz1, sfx: "buzz", db: -7, len: 0.3, fade: 0.06 },
  { id: "buzz2", shot: "phoneMsg", t: T.buzz2, sfx: "buzz", db: -7, len: 0.3, fade: 0.06 },
  { id: "penPush", shot: "penSlide", t: T.penPush, sfx: "slide", db: -8 },
  { id: "contractPush", shot: "contract", t: T.contractPush, sfx: "slide", db: -8 },
  { id: "pat1", shot: "denPockets", t: T.pat1, sfx: "tap", db: -5 },
  { id: "pat2", shot: "denPockets", t: T.pat2, sfx: "tap", db: -5 },
  { id: "reader", shot: "readerUp", t: T.readerPop, sfx: "pop", db: -8 },
  { id: "tap30", shot: "cardTap", t: T.tap30, sfx: "reader", db: -5 },
  { id: "box", shot: "boxCatch", t: T.boxLand, sfx: "thud", db: -3, fall: BOX_FALL },
  { id: "beep33", shot: "boxCatch", t: T.beep33, sfx: "beep", db: -6 },
  { id: "beep38", shot: "denSure", t: T.beep38, sfx: "beep", db: -6 },
  { id: "pallet", shot: "palletWide", t: T.pallet, sfx: "slam", db: -2, fall: PALLET_FALL },
  { id: "rip", shot: "posterRip", t: T.rip, sfx: "rip", db: -4 },
  { id: "door41", shot: "garageEnd", t: T.door41, sfx: "kdoor", db: -5 },
  { id: "click", shot: "denClick", t: T.click, sfx: "tick", db: -5 },
  { id: "fine", shot: "posterFine", t: T.fineIn, sfx: "sting-b", db: -4, len: 0.9, fade: 0.4 },
  { id: "clatter", shot: "denSwear", t: T.clatter, sfx: "clatter", db: -4 },
  { id: "crack48", shot: "rhoCrack2", t: T.crack48, sfx: "can", db: -4 },
];

// ── small acting that the scenes draw, all hanging on the moments above
export const bump = (t: number, a: number, b: number, c: number, d: number) => ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c))); // 0 .. 1 (from a to b) .. 1 (to c) .. 0 (at d)
/** Brandon's pop scale on the reader's frame: the whole puppet pops from 95 % through a small overshoot to 100 % */
export const popScale = (f: number) => { const a = f / FPS - T.readerPop; return a < -0.1 ? 1 : a < 0 ? 1 - 0.07 * Math.sin((Math.PI / 2) * ((a + 0.1) / 0.1)) : 1 - 0.07 * Math.cos(39 * a) * Math.exp(-a / 0.25); };
/** the pallet's slam throws Denise: a 2-frame hop (70 puppet px) on the impact frame, then she lands with a squash (0..1, a spring) that settles with the shake */
export function joltAt(f: number): { up: number; sq: number } {
  const p = Math.round(T.pallet * FPS), k = f - p; // frames since the impact
  return k < 0 ? { up: 0, sq: 0 } : k < 2 ? { up: 70 * Math.sin((Math.PI * k) / 2), sq: 0 } : { up: 0, sq: squashAt(f / FPS, (p + 2) / FPS, 0.35, 38) };
}
/** where the captions sit in the frame (y px): nothing that carries words may be under them. One band for the whole reel, except the last shot: its line goes on the dark ceiling above the boxes (the floor under them is inside the bottom 400 px that Instagram covers), where the share line comes after it, and the boxes' labels stay as they are */
export const CAP_BAND: [number, number] = [1295, 1455];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { wideEnd: [330, 490] };
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the contract lies on the desk from the shove (shot 27) until the signature is done (the end of shot 31): the scenes draw it at rest wherever the desk is in the frame (27, 28, 29; 30 is the reader's close-up, 31 the contract's own) */
export const contractOnDesk = (f: number) => f / FPS >= T.contractPush && f / FPS < T.s32;
/** the card of shot 30: a hand off the frame holds it. It comes in from the right edge, taps the reader on the beep (p 1: on the reader, held for 0.07 s; press 1 on the tap frame), and goes back out (p 0: off the frame) */
export function cardAt(f: number): { p: number; press: number } {
  const t = f / FPS, a = t - T.tap30;
  return { p: ease((t - (T.tap30 - 0.12)) / 0.12) * (1 - ease((a - 0.07) / 0.14)), press: a >= 0 && a < 0.12 ? Math.exp(-a / 0.05) : 0 };
}

// ── the mouth: a level per frame from the loudness of the take, on twos, one frame ahead of the sound; closed whenever the character is not speaking
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const ampAt = (l: Line, f: number) => l.amp[f - l.f0] ?? 0;
const lineAt = (c: Char, f: number, before = 0.1, after = 0.05) => linesOf(c).find((q) => f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (c: Char, f: number) => !!lineAt(c, f);

export function moodAt(c: Char, f: number): Mood {
  const t = f / FPS;
  switch (c) {
    case "brandon": return t >= T.s29 && t < T.s34 ? "pitchy" : "smug"; // the price list is sung
    case "denisePen":
      if (t >= T.s24 - 0.05 && t < T.s25) return "polite"; // "...I could be my own boss.", hopeful
      if (t >= T.s43 - 0.05 && t < T.s44) return "polite"; // "...I'm in sales now.", proud
      return "flat";
    default: return "flat";
  }
}
export function mouthAt(c: Char, f: number): MouthShape {
  const l = lineAt(c, f);
  if (!l) return "closed";
  const fi = twos(f);
  const a = ampAt(l, fi + 1);
  if (a < 0.1) return "closed";
  const mood = moodAt(c, fi);
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (mood !== "angry" && mood !== "furious" && w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  let s: MouthShape = a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
  if (mood === "flat" && s === "wide") s = "mid";
  return s;
}

// ── the head: tilts a little and dips on every syllable, alternating sides, each move eased over 6 frames; it settles after the line
const TILT: Record<Char, number> = { denisePen: 2.6, rhondaPen: 1.8, brandon: 2.0, clerk: 1, hostess: 1.4, guest1: 1.2, guest2: 1.2, guest3: 1.2 }; // degrees
const BOB: Record<Char, number> = { denisePen: 3.2, rhondaPen: 2.6, brandon: 3.4, clerk: 2, hostess: 2.4, guest1: 2, guest2: 2, guest3: 2 };
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
// ── the walk, on twos: Rhonda steps into the garage's side door (shot 41). p: 0..1 along the walk, step: the bob of a step
export const walk41P = (f: number) => ease((twos(f) / FPS - T.door41) / 0.4);
export const walk41Step = (f: number) => { const t = twos(f) / FPS; return t < T.door41 || t > T.door41 + 0.4 ? 0 : Math.sin((Math.PI * 2 * (t - T.door41)) / 0.4) * (1 - walk41P(f) * 0.6); };

// ── blinks: every 2.5-4.5 s, 3 frames (half, shut, half), at hashed times
const SEEDS: Record<Char, number> = { denisePen: 4, rhondaPen: 17, brandon: 23, clerk: 31, hostess: 8, guest1: 13, guest2: 29, guest3: 37 };
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out;
}
export const BLINKS: Record<Char, number[]> = Object.fromEntries((Object.keys(SEEDS) as Char[]).map((c) => [c, blinkStarts(SEEDS[c])])) as Record<Char, number[]>;
const blinkK = (c: Char, f: number) => {
  const t = f / FPS;
  if (c === "guest1" || c === "guest2" || c === "guest3") return 0; // glazed: a stare
  if (c === "denisePen" && t >= T.s46 && t < T.s47) return 0; // she does not blink while her eyes are wide
  for (const s of BLINKS[c]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};

// ── Denise's face by beat: the more she says "Sure.", the more her lids come down; her brows go up at the bowl, at the pen's "It writes?", at the fine print; angry on the swear
const D = (k: [number, number][]) => (t: number) => keys(t, k);
const denLid = D([[0, 0.25], [T.s2, 0.28], [T.s24, 0.1], [T.s26, 0.2], [T.s33, 0.3], [T.boxLand, 0.38], [T.s35 - 0.04, 0.34], [T.s35 + 0.04, 0.04], [T.s36 - 0.04, 0.04], [T.s36, 0.3], [T.s38, 0.46], [T.s39, 0.5], [T.s41, 0.3], [T.s43, 0.12], [T.s44, 0.2], [T.eyes46, 0], [T.s47 - 0.02, 0.05], [T.s47 + 0.3, 0.2]]);
const denLift = D([[0, 0], [T.s24 - 0.05, 0], [T.s24 + 0.1, 0.3], [T.s26, 0.35], [T.s27, 0.1], [T.s28, 0.3], [T.s29, 0], [T.s35, 0.3], [T.s36, 0], [T.eyes46 - 0.02, 0.1], [T.eyes46 + 0.05, 1], [T.s47 - 0.05, 0.9], [T.s47 + 0.15, 0.25]]);
const denAngry = D([[0, 0.1], [T.s47 - 0.05, 0.05], [T.s47 + 0.1, 0.5], [T.s48, 0.4]]);
const denPupil = D([[0, 1], [T.eyes46 - 0.02, 1], [T.eyes46 + 0.05, 0.5], [T.s47 + 0.3, 0.9]]);

const rhoLid = D([[0, 0.32], [T.wall, 0.32], [T.wall + 0.06, 0.08], [T.s45, 0.08], [T.s45 + 0.04, 0.32]]);
const BASE_LID: Record<Char, number> = { denisePen: 0.2, rhondaPen: 0.32, brandon: 0.2, clerk: 0.45, hostess: 0.05, guest1: 0.5, guest2: 0.5, guest3: 0.5 };
export function lidAt(c: Char, f: number): number {
  const t = f / FPS;
  const b = c === "denisePen" ? denLid(t) : c === "rhondaPen" ? rhoLid(t) : BASE_LID[c];
  return Math.max(b, b + (1 - b) * blinkK(c, f));
}

// ── gaze: where the pupils look, -1..1 of their travel (x right, y down). In the garage Denise sits on the left and Rhonda on the right; in the office Brandon faces the camera and Denise looks at him
export function gazeAt(c: Char, f: number): [number, number] {
  const t = f / FPS, sh = shotAt(f).id;
  switch (c) {
    case "denisePen":
      if (sh === "garageMed") return [0.05, 0.75]; // her phone
      if (sh === "denBoss") return [0, 0.7]; // the phone
      if (sh === "denCount") return [0.2, -0.5]; // up, counting
      if (sh === "denEyes") return [0, 0.1];
      if (sh === "wideEnd" || sh === "denSwear" || sh === "denClick" || sh === "garageEnd") return [0.4, 0.2];
      return [0.5, 0.05]; // Brandon
    case "rhondaPen":
      if (sh === "rhoWall") return t < T.wall ? [-0.3, 0] : [-0.5, -0.4]; // her eyes go to the wall (the poster is on her left in the frame)
      return [-0.55, 0.1]; // at Denise
    case "brandon": return sh === "diamond" ? [-0.3, -0.1] : [0, 0.05];
    default: return [0, 0.05];
  }
}

// ── the body of a character with several poses (the rig's keys)
export function bodyAt(c: Char, f: number): string | undefined {
  const t = f / FPS, ft = twos(f) / FPS; // a pose that is swapped by a cut changes on the cut's frame (a shot never starts in the last shot's pose); one that changes inside a shot, on twos; what lands on a hit, on the hit's frame
  switch (c) {
    case "denisePen": return t < T.s26 ? "chairPhone" : t < T.s28 ? "blazer" : t < T.s29 ? "blazerPat" : t < T.s41 ? "blazer" : "blazerFist";
    case "rhondaPen": return "beers"; // she is in the garage's doorway from shot 41 on
    case "brandon": return t >= T.readerPop && t < T.s34 ? "reader" : t >= T.s34 && t < T.s35 ? "point" : t >= T.s40 && ft < T.posterRolled ? "rip" : "stand";
    default: return undefined;
  }
}

export type Pose = { body?: string; tilt: number; bob: number; breath: number; mouth: MouthShape; mood: Mood; lid: number; angry: number; sad: number; lift: number; asym: number; pupil: number; gaze: [number, number]; dx: number };
export function poseAt(c: Char, f: number): Pose {
  const t = f / FPS;
  const m = talkMove(c, f);
  const phase = { denisePen: 0.4, rhondaPen: 1.2, brandon: 2.1, clerk: 0.7, hostess: 1.8, guest1: 0.3, guest2: 2.4, guest3: 1.1 }[c];
  let tilt = m.tilt, bob = m.bob, lift = 0, angry = 0, pupil = 1, dx = 0, jump = 0, mouth = mouthAt(c, f), mood = moodAt(c, f);
  const ft = twos(f) / FPS; // the small moves below are on twos
  if (c === "denisePen") {
    angry = denAngry(t); lift = denLift(t); pupil = denPupil(t);
    jump = -7 * [T.pat1, T.pat2].reduce((s, k) => s + bump(ft, k - 0.07, k - 0.03, k + 0.03, k + 0.12), 0); // her body dips on each pat
  }
  if (c === "rhondaPen") { // her thumb on the tab: the head dips before the crack and comes up with a jolt after it
    const k = T.crack48; bob += -7 * antic(ft, k, 0.13) + 4 * bump(ft, k, k + 0.05, k + 0.08, k + 0.3); tilt += -2 * bump(ft, k, k + 0.05, k + 0.08, k + 0.3);
  }
  if (c === "brandon") for (const k of [T.penPush, T.contractPush]) { bob += -5 * antic(ft, k, 0.12); tilt += 1.5 * antic(ft, k, 0.12); } // he draws back before each shove
  if (c === "denisePen") jump += joltAt(f).up;
  const shut = blinkK(c, f) > 0, lid = lidAt(c, f), gz = gazeAt(c, f);
  const eyes = shut ? { lid, gaze: gz } : fitEyes(c, lid, gz, pupil); // a pupil never hides under the lid: the eyes look lower, or the lid opens
  const weight = c === "denisePen" ? boxAt(f).dip * 700 : 0; // the weight of the box: her whole body sinks 2.5 % of its height (700 puppet px) and springs back
  return { body: bodyAt(c, f), tilt, bob, breath: 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + phase) - weight + jump, mouth, mood, ...eyes, angry, sad: 0, lift, asym: c === "brandon" ? 0.5 : 0, pupil, dx };
}

// ── captions: one plain line at a time, the current speaker's words only; split at sentence ends, pauses, cuts and ~22 characters; a bleep shows as F***ing.
// A caption lives inside one shot: it is split where a cut falls between two words, and starts no earlier than the cut that brings its first word.
export type Cap = { who: string; n: number; text: string; t0: number; t1: number; w0: number; w1: number }; // n: the take's number
const say = (w: Word) => (w.bleep ? w.d.replace(/^(\w)\w{3}(\w*)/, "$1***$2") : w.d.replace(/—/g, "-")); // Fucking -> F***ing; the cut-off "gr—" shows as "gr-"
/** where the sound of the word that ends at `e` really ends: a micro gap of the built line (under 80 ms) does not end a word */
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  const len = (ws: Word[]) => ws.map(say).join(" ").length;
  const cuts = SHOTS.slice(1).map((s) => s.t0);
  for (const l of LINES) {
    // sentences first (and long pauses once there are enough words, and any cut that falls between two words), then a sentence longer than one line is cut in the most even halves
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
    for (const ws of lines) caps.push({ who: l.who, n: l.n, text: ws.map(say).join(" "), t0: ws[0].t - 0.04, t1: stretchEnd(l, ws[ws.length - 1].e) + 0.25, w0: ws[0].t, w1: ws[ws.length - 1].e });
  }
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const sh = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (sh) { c.t0 = Math.max(c.t0, sh.t0); c.t1 = Math.min(c.t1, sh.t1); } }); // a caption never runs over a cut
  caps.forEach((c, i) => { const n = caps[i + 1], sh = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (n && n.n === c.n && sh && n.t0 > c.t1 && n.t0 - c.t1 < 0.1) { if (c.t1 >= sh.t1 - 1e-6) n.t0 = c.t1; else c.t1 = n.t0; } }); // no flash of an empty frame inside a line: a caption that a cut ended is followed at the cut, a short breath between words is bridged
  caps[caps.length - 1].t1 = Math.min(caps[caps.length - 1].t1, T.share); // the share line takes the place of the last caption
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
export const SHARE = "Send this to the friend who just got a 'hey girl' text.";
export const shareK = (f: number) => ease((f / FPS - T.share) / 0.18);

// ── sound cues for the mix (scripts/pen-cues.mts): name, time, db or vol, optional length and fade
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  const add = (name: string, at: number, db = 0, o: { len?: number; fade?: number; from?: number } = {}) => c.push({ name, at, db, ...o });
  // every hit starts its clip so that the clip's measured peak lands on the hit's frame
  HITS.forEach((h) => add(h.sfx, onPeak(h.sfx, h.t), h.db, { ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}) }));
  // the pen signs the contract (shot 31); there is no music and no bed in v2: the story's are the Tup episode's (src/tup-sched.ts)
  add("scribble", T.s31, -8, { from: 0.55, len: T.s32 - T.s31 + 0.04, fade: 0.08 });
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── the stills: key frames, at least one per shot, chosen away from blinks (pen-check.mts)
const ALL = Object.keys(SEEDS) as Char[];
const blinking = (f: number) => ALL.some((c) => BLINKS[c].some((s) => f >= s - 1 && f <= s + 3));
/** a key frame at time t, moved on a few frames if anybody blinks there */
const kf = (label: string, t: number) => { let f = Math.round(t * FPS); for (let d = 0; d < 8 && blinking(f); d++) f++; return { label, f }; };
const mid = (a: number, b: number) => (a + b) / 2;
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 garageMed: Denise in the chair", L(1).start + 0.5),
  kf("2 phoneAd: SALES REP, readable", T.s2 + 0.5),
  kf("2 phoneAd: SALES REP, mid swipe", mid(T.swipe0, T.swipe1)),
  kf("23 phoneMsg: the buzz", T.buzz1 + 0.1),
  kf("23 phoneMsg: the text, readable", T.buzz1 + 1.0),
  kf("24 denBoss: I could be my own boss", L(18).start + 0.5),
  kf("25 penSlide: the pen slides", mid(T.penPush, T.penStop)),
  kf("26 denResume: It writes?", L(20).start),
  kf("27 contract: the contract slides", mid(T.contractPush, T.contractStop)),
  kf("28 denPockets: the pats", T.pat1 + 0.05),
  kf("29 readerUp: the reader pops", T.readerPop + 0.1),
  kf("30 cardTap: $20.00 APPROVED", T.tap30 + 0.1),
  kf("31 signed: the pen signs", mid(T.s31, T.s32)),
  kf("32 kitSays: Starter kit's", L(24).start + 0.4),
  kf("33 boxCatch: the box lands", T.boxLand + 0.07),
  kf("34 diamond: Diamond's twenty grand", L(26).start + 0.3),
  kf("35 denCount: Twenty gr", L(27).start + 0.15),
  kf("36 mathCut: Don't do the math", L(28).start + 0.3),
  kf("37 posterIns: the yacht poster", L(28).words[5].t + 0.2),
  kf("38 denSure: Sure.", L(29).start + 0.1),
  kf("39 palletWide: the pallet lands", T.pallet + 0.07),
  kf("40 posterRip: the poster peels", mid(T.rip, T.posterFree)),
  kf("41 garageEnd: the boxes, Rhonda in the door", T.door41 + 0.3),
  kf("42 rhoPens: nine thousand pens", L(30).words[4].t + 0.2),
  kf("43 denClick: I'm in sales now", L(31).start + 0.3),
  kf("44 rhoWall: her eyes on the wall", T.wall + 0.2),
  kf("45 posterFine: the push", T.s45 + 0.25),
  kf("45 posterFine: the fine print arrives", T.fineIn + 0.05),
  kf("45 posterFine: the hold", mid(T.fineIn, T.s46)),
  kf("45 posterFine: the end of the hold", T.s46 - 0.1),
  kf("46 denEyes: her eyes go wide", T.eyes46 + 0.2),
  kf("47 denSwear: the pen has landed", T.clatter + 0.25),
  kf("47 denSwear: marketing", L(32).words[1].t + 0.15),
  kf("48 rhoCrack2: the second can", T.crack48 + 0.07),
  kf("49 wideEnd: the share line", T.share + 0.6),
];
