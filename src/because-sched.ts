// The timeline and the acting of "Because" (src/Because.tsx, docs/x03-because.md, script v5). Pure data and arithmetic: every number is a function of the frame, of the voice takes in
// public/because/timings.json and of the mouth loudness in src/amp-because.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock
// (take n sits at tableRead.cues[n].at, so the gaps of episodes/because.jsonc carry the silent beats): every action below is anchored to a take (before or after a word, or on a loud
// syllable), never to a number of its own.
import timings from "../public/because/timings.json" with { type: "json" };
import amps from "./amp-because.json" with { type: "json" };
import { FPS, clamp01, ease, easeOut, hash, keys, onPeak, snap } from "./tip-sched.ts";
import { lerp } from "./sp-math.ts";
import type { Mood, MouthShape } from "./sp-puppet";

export { FPS, clamp01, ease, easeOut, hash, keys, onPeak, snap };
export type { Mood, MouthShape };

export type Char = "deniseHood" | "cashier" | "rhonda";

// ── the voice takes
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;

export type Peak = { f: number; a: number; sign: 1 | -1 };
// first: the take's first sound (a sigh counts), tend: its last sound, both in reel seconds; voiced: the stretches of sound of the built line, in reel seconds
export type Line = { n: number; who: string; char: Char; file: string; ofs: number; text: string; words: Word[]; first: number; start: number; end: number; tend: number; amp: number[]; f0: number; peaks: Peak[]; voiced: [number, number][] };
const CHAR_OF: Record<string, Char> = { DENISE: "deniseHood", CASHIER: "cashier", RHONDA: "rhonda" };

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
/** a speaker cut: `d` s before the take's first sound (a sigh counts) or its first word, whichever comes first; the quick exchanges of the ladder cut 0.06 s before (two frames) */
const spk = (n: number, d = 0.06) => snap(Math.min(L(n).first, L(n).start) - d);
/** the middle of the longest silence inside a take (the pause between its two sentences), from the stretches of sound of the built line: a cut that falls there is inside no word */
function pauseMid(n: number): number {
  const v = L(n).voiced;
  let best = 0, at = 0;
  for (let i = 1; i < v.length; i++) if (v[i][0] - v[i - 1][1] > best) { best = v[i][0] - v[i - 1][1]; at = (v[i][0] + v[i - 1][1]) / 2; }
  return at;
}
/** the loud syllable of a take that the picture lands on (the first peak of its mouth), else just after its first word */
const loud = (n: number) => snap(L(n).peaks.length ? L(n).peaks[0].f / FPS : L(n).start + 0.05);

// the ladder
const s2 = spk(2), s3 = spk(3), s4 = spk(4);
const s5 = snap(L(4).tend + 0.05); // the medium: the cup comes down
const slam = snap(s5 + 0.15); // the cup lands on the tray
const s6 = spk(6), s7 = spk(7), s8 = spk(8), s9 = spk(9), s10 = spk(10), s11 = spk(11), s12 = spk(12), s13 = spk(13);
const s14 = snap(L(13).tend + 0.06); // the cashier: his eyes are down
const lookUp = snap(L(14).first - 0.2); // ... and come up, for the first time
const s14b = snap(pauseMid(14)); // the push-in on the cashier, in the pause between his two sentences
const s15 = spk(15, 0.12); // Denise: the last "...Sure." (a sigh comes first)
const s16 = snap(L(15).tend + 0.1); // the screen
const roll = snap(s16 + 0.1); // the total starts to roll
const lock = snap(roll + 0.42); // ... and stops on $2,000,014.99
const s17 = snap(s16 + 0.95); // the cashier takes his hat off
// the hat and the headset change heads, and he walks out through the door
const hatOff = snap(s17 + 0.18), hatLand = snap(hatOff + 0.22);
const hsOff = snap(hatLand + 0.06), hsLand = snap(hsOff + 0.22);
const walk0 = snap(hsOff + 0.06), walk1 = snap(walk0 + 0.72);
const doorOpen = snap(walk1 - 0.2), doorShut = snap(walk1 + 0.12);
const s18 = snap(doorShut + 0.3); // (the leaf takes 0.22 s to close: it is shut 0.08 s before the cut) // the counter from behind: Denise in the hat and the headset, Rhonda walks up
// the ending
const s19 = spk(16, 0.12), s20 = spk(17, 0.1);
const s21 = snap(L(17).tend + 0.1); // her eyes widen
const eyes = snap(s21 + 0.12);
const s22 = spk(18, 0.1);
const share = snap(L(18).tend + 0.04);
// the numbers on the total flip on Denise's "Sure." (the first loud syllable of each)
export const FLIP_N = [3, 5, 7, 9, 11, 13] as const;
const flips = FLIP_N.map(loud);
export const T = {
  s2, s3, s4, s5, slam, s6, s7, s8, s9, s10, s11, s12, s13, s14, lookUp, s14b, s15, s16, roll, lock, s17, hatOff, hatLand, hsOff, hsLand, walk0, walk1, doorOpen, doorShut, s18, s19, s20, s21, eyes, s22, share,
  tray: snap(flips[0] + 0.15), pies: snap(flips[2] + 0.15), flip: flips,
  end: snap(share + 2.5),
};
export const T_END = T.end;
export const FRAMES = Math.round(T_END * FPS);

// The shots, one per framing (docs/x03-because.md): the ladder cuts to whoever speaks (the cashier behind the counter, Denise in front of it), the total flips in the corner of Denise's
// shots; the ending turns the counter round. becuase-check.mts holds the list to the length rule (<= 2.4 s, the last shot excepted) and to "no two shots in a row with the same framing".
export type ShotId = "denWide" | "cash2" | "den3" | "cash4" | "denTray" | "cash6" | "den7" | "cash8" | "den9" | "cash10" | "den11" | "cash12" | "den13" | "cashLook" | "cashPush" | "den15" | "screen" | "swap" | "backDen" | "rhonda" | "denSay" | "denEyes" | "denSwear" | "wideEnd";
export const SHOTS: { id: ShotId; t0: number; t1: number }[] = [
  { id: "denWide", t0: 0, t1: T.s2 },
  { id: "cash2", t0: T.s2, t1: T.s3 },
  { id: "den3", t0: T.s3, t1: T.s4 },
  { id: "cash4", t0: T.s4, t1: T.s5 },
  { id: "denTray", t0: T.s5, t1: T.s6 },
  { id: "cash6", t0: T.s6, t1: T.s7 },
  { id: "den7", t0: T.s7, t1: T.s8 },
  { id: "cash8", t0: T.s8, t1: T.s9 },
  { id: "den9", t0: T.s9, t1: T.s10 },
  { id: "cash10", t0: T.s10, t1: T.s11 },
  { id: "den11", t0: T.s11, t1: T.s12 },
  { id: "cash12", t0: T.s12, t1: T.s13 },
  { id: "den13", t0: T.s13, t1: T.s14 },
  { id: "cashLook", t0: T.s14, t1: T.s14b },
  { id: "cashPush", t0: T.s14b, t1: T.s15 },
  { id: "den15", t0: T.s15, t1: T.s16 },
  { id: "screen", t0: T.s16, t1: T.s17 },
  { id: "swap", t0: T.s17, t1: T.s18 },
  { id: "backDen", t0: T.s18, t1: T.s19 },
  { id: "rhonda", t0: T.s19, t1: T.s20 },
  { id: "denSay", t0: T.s20, t1: T.s21 },
  { id: "denEyes", t0: T.s21, t1: T.s22 },
  { id: "denSwear", t0: T.s22, t1: T.share },
  { id: "wideEnd", t0: T.share, t1: T.end },
];
export function shotAt(f: number) {
  const t = f / FPS;
  const i = SHOTS.findIndex((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  const s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  return { ...s, i: i < 0 ? SHOTS.length - 1 : i, lt: t - s.t0, d: s.t1 - s.t0, u: clamp01((t - s.t0) / (s.t1 - s.t0)) };
}

// ── the total: the number in the corner of the shots flips on every "Sure." (stages 0..6); the screen of shot 16 rolls from the last one to two million
export const STAGES = ["$3.49", "$6.49", "$7.29", "$9.29", "$10.00", "$14.99", "$14.99"] as const;
export const SUB = "then $29.99/mo"; // stage 6: the free month turns into a subscription
export const FINAL = "$2,000,014.99";
export type Hud = { show: boolean; stage: number; prev: number; k: number; pop: number };
/** the corner total: which stage, which stage it flipped from, how far the flip is (0..1 over 0.2 s), and how far the first pop-in is */
export function hudAt(f: number): Hud {
  const t = f / FPS;
  const show = t >= T.s2 && t < T.s16;
  let stage = 0;
  for (let i = 0; i < T.flip.length; i++) if (t >= T.flip[i]) stage = i + 1;
  const flipT = stage > 0 ? T.flip[stage - 1] : T.s2;
  return { show, stage, prev: Math.max(0, stage - 1), k: stage > 0 ? clamp01((t - flipT) / 0.2) : 1, pop: ease((t - T.s2 - 0.04) / 0.17) };
}
export const money = (v: number) => "$" + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** the screen of shot 16: $14.99 until the roll, then a counter that runs up exponentially in 0.45 s, then $2,000,014.99 */
export function screenText(f: number): { text: string; sub: boolean; locked: boolean } {
  const t = f / FPS;
  if (t < T.roll) return { text: STAGES[5], sub: true, locked: false };
  if (t >= T.lock) return { text: FINAL, sub: false, locked: true };
  const u = ease((t - T.roll) / (T.lock - T.roll));
  return { text: money(Math.exp(lerp(Math.log(14.99), Math.log(2000014.99), u))), sub: false, locked: false };
}

// ── the cup, the tray and the pies on the counter (they pile up as Denise says "Sure.")
/** a prop that pops in: 0 before `t0`, then a squash-and-stretch pop over 0.25 s (overshoots 1 and settles) */
export const popK = (t: number, t0: number) => (t < t0 ? 0 : 1 + 0.18 * Math.sin(((t - t0) / 0.25) * Math.PI * 1.5) * Math.exp(-(t - t0) / 0.1) - (1 - Math.min(1, (t - t0) / 0.06)));
export const trayOn = (f: number) => f / FPS >= T.tray;
export const piesOn = (f: number) => f / FPS >= T.pies;
export const cupOn = (f: number) => f / FPS >= T.s5;
/** the cup falls from above the frame and lands on the tray at T.slam: its height above the tray (0 = on it) as a fraction of a screen, and the squash of the landing (sy < 1 <= sx) */
export function cupFall(f: number): { drop: number; sx: number; sy: number; kick: number } {
  const t = f / FPS, u = (t - T.s5) / (T.slam - T.s5);
  if (u < 1) return { drop: Math.max(0, 1 - u * u), sx: 1 + 0.06 * clamp01(u) * clamp01(u), sy: 1 - 0.04 * clamp01(u) * clamp01(u), kick: 0 }; // an accelerating fall; a touch of stretch
  const a = t - T.slam;
  const sq = Math.exp(-a / 0.07) * Math.cos(a * 38); // the landing squash rings out in about 0.2 s
  return { drop: 0, sx: 1 + 0.2 * Math.max(0, sq), sy: 1 - 0.22 * Math.max(0, sq) + 0.06 * Math.max(0, -sq), kick: Math.exp(-a / 0.08) };
}

// ── the hat and the headset: worn by the cashier, in flight, then worn by Denise
export type Wear = { on: "cashier" | "flight" | "denise"; u: number };
const wear = (t: number, off: number, land: number): Wear => (t < off ? { on: "cashier", u: 0 } : t < land ? { on: "flight", u: (t - off) / (land - off) } : { on: "denise", u: 1 });
export const hatWear = (f: number) => wear(f / FPS, T.hatOff, T.hatLand);
export const headsetWear = (f: number) => wear(f / FPS, T.hsOff, T.hsLand);
/** how far the hat has squashed onto a head after landing (0..1..0): a short dip */
export const landDip = (f: number, land: number) => { const a = f / FPS - land; return a < 0 ? 0 : Math.exp(-a / 0.06) * Math.cos(a * 30); };

// ── the cashier walks away to the swing door at the back (smaller and higher as he goes), the door opens as he reaches it and swings shut behind him
export const walkP = (f: number) => ease((f / FPS - T.walk0) / (T.walk1 - T.walk0));
export const walkStep = (f: number) => { const t = f / FPS; return t < T.walk0 || t > T.walk1 + 0.05 ? 0 : Math.sin((Math.PI * 2 * (t - T.walk0)) / 0.38); };
export const doorAngle = (f: number) => { const t = f / FPS; return 78 * ease((t - T.doorOpen) / 0.22) * (1 - ease((t - T.doorShut) / 0.22)); };
/** the cashier has stepped into the doorway: from here on the door's leaf is in front of him, and he is gone behind it */
export const cashierInside = (f: number) => f / FPS >= T.walk1 + 0.02;
/** Rhonda walks up to the counter from the right edge during shot 18 (0 = off the frame, 1 = at her place) */
export const rhondaP = (f: number) => ease((f / FPS - (T.s18 - 0.1)) / (T.s19 - T.s18 - 0.1));
export const rhondaStep = (f: number) => { const t = f / FPS; return t < T.s18 - 0.1 || t > T.s19 ? 0 : Math.sin((Math.PI * 2 * (t - T.s18)) / 0.42) * (1 - rhondaP(f) * 0.6); };

// ── the mouth: a level per frame from the loudness of the take, on twos, one frame ahead of the sound; closed whenever the character is not speaking
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const ampAt = (l: Line, f: number) => l.amp[f - l.f0] ?? 0;
const lineAt = (c: Char, f: number, before = 0.1, after = 0.05) => linesOf(c).find((q) => f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (c: Char, f: number) => !!lineAt(c, f);

export function moodAt(c: Char, f: number): Mood {
  const t = f / FPS;
  switch (c) {
    case "cashier": return "flat";
    case "rhonda": return "flat";
    default: // Denise
      if (t >= T.s20 - 0.1 && t < T.s21 + 0.05) return "polite"; // "...It was only two million more.", said sincerely
      return "flat";
  }
}
export function mouthAt(c: Char, f: number): MouthShape {
  const l = lineAt(c, f);
  if (!l) return "closed";
  const fi = f - (f % 2);
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
const TILT: Record<Char, number> = { deniseHood: 2.6, cashier: 1.2, rhonda: 1.8 }; // degrees
const BOB: Record<Char, number> = { deniseHood: 3.2, cashier: 2.2, rhonda: 2.6 };
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

// ── blinks: every 2.5-4.5 s, 3 frames (half, shut, half), at hashed times
const SEEDS: Record<Char, number> = { deniseHood: 4, cashier: 31, rhonda: 17 };
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out;
}
export const BLINKS: Record<Char, number[]> = Object.fromEntries((Object.keys(SEEDS) as Char[]).map((c) => [c, blinkStarts(SEEDS[c])])) as Record<Char, number[]>;
const blinkK = (c: Char, f: number) => {
  const t = f / FPS;
  if (c === "deniseHood" && t >= T.s20 && t < T.s22 + 0.3) return 0; // she does not blink while she hears herself
  if (c === "cashier" && t >= T.s14 - 0.05 && t < T.lookUp + 0.45) return 0; // nor does he, until he has looked up
  for (const s of BLINKS[c]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};

// ── Denise's face by beat: the more she says "Sure.", the more her lids come down and her pupils shrink; then her eyes widen
const D = (k: [number, number][]) => (t: number) => keys(t, k);
const sure = [...T.flip, loud(15)];
const denLid = D([[0, 0.2], [sure[0], 0.3], [sure[1], 0.36], [sure[2], 0.42], [sure[3], 0.47], [sure[4], 0.5], [sure[5], 0.54], [T.s15, 0.5], [T.s16, 0.42], [T.s18, 0.3], [T.s20 - 0.1, 0.22], [T.s21, 0.12], [T.eyes, 0], [T.s22 - 0.05, 0.04], [T.s22 + 0.2, 0.2], [T.share, 0.28]]);
const denLift = D([[0, 0], [T.s21 - 0.05, 0.1], [T.eyes, 1], [T.s22 - 0.05, 0.9], [T.s22 + 0.15, 0.25], [T.share, 0.1]]);
const denAngry = D([[0, 0.1], [T.s22 - 0.05, 0.05], [T.s22 + 0.1, 0.45], [T.share, 0.5]]);
const denPupil = D([[0, 1], [sure[0], 0.95], [sure[3], 0.85], [sure[5], 0.75], [T.s20 - 0.1, 0.9], [T.s21, 1], [T.eyes, 0.5], [T.s22, 0.55], [T.s22 + 0.4, 0.9]]);

const BASE_LID: Partial<Record<Char, number>> = { cashier: 0.45, rhonda: 0.32 };
export function lidAt(c: Char, f: number): number {
  const t = f / FPS;
  let b = c === "deniseHood" ? denLid(t) : BASE_LID[c] ?? 0;
  if (c === "cashier") b = keys(t, [[0, 0.45], [T.lookUp - 0.05, 0.45], [T.lookUp + 0.08, 0.08], [T.s15, 0.08], [T.s15 + 0.1, 0.45]]); // he looks up for the franchise
  return Math.max(b, b + (1 - b) * blinkK(c, f));
}

// ── gaze: where the pupils look, -1..1 of their travel (x right, y down)
export function gazeAt(c: Char, f: number): [number, number] {
  const t = f / FPS, sh = shotAt(f).id;
  switch (c) {
    case "cashier": return t >= T.lookUp - 0.05 && t < T.s15 ? [0.02, -0.04] : [0.05, 0.9]; // down at his screen, not at her; up for the franchise
    case "rhonda": return sh === "backDen" ? [-0.5, 0.1] : [-0.55, 0.1]; // at Denise
    default: // Denise: a stare straight ahead, drifting a little; then at the screen, at the cashier, at Rhonda
      if (sh === "screen") return [0, 0.3];
      if (sh === "swap") return [0.5, -0.1];
      if (sh === "backDen") return [0.7, 0.05]; // Rhonda walks up on her right
      if (sh === "denSay") return [0.5, 0.05];
      return [0.04 * Math.sin(t * 1.3), 0.02];
  }
}

export type Pose = { body?: string; tilt: number; bob: number; breath: number; mouth: MouthShape; mood: Mood; lid: number; angry: number; sad: number; lift: number; asym: number; pupil: number; gaze: [number, number]; dx: number };
export function poseAt(c: Char, f: number): Pose {
  const t = f / FPS;
  const m = talkMove(c, f);
  const phase = { deniseHood: 0.4, cashier: 2.1, rhonda: 1.2 }[c];
  let tilt = m.tilt, bob = m.bob, lift = 0, angry = 0, pupil = 1, body: string | undefined;
  if (c === "deniseHood") { angry = denAngry(t); lift = denLift(t); pupil = denPupil(t); body = "neutral"; }
  return { body, tilt, bob, breath: 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + phase), mouth: mouthAt(c, f), mood: moodAt(c, f), lid: lidAt(c, f), angry, sad: 0, lift, asym: 0, pupil, gaze: gazeAt(c, f), dx: 0 };
}

// ── captions: one plain line at a time, the current speaker's words only; split at sentence ends, pauses, cuts and ~22 characters; a bleep shows as F***ing.
// A caption lives inside one shot: it is split where a cut falls between two words, and starts no earlier than the cut that brings its first word.
export type Cap = { who: string; n: number; text: string; t0: number; t1: number; w0: number; w1: number }; // n: the take's number
const say = (w: Word) => (w.bleep ? w.d.replace(/^(\w)\w{3}(\w*)/, "$1***$2") : w.d); // Fucking -> F***ing
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
  caps.forEach((c) => { const sh = SHOTS.find((x) => c.w0 + 0.01 >= x.t0 - 1e-6 && c.w0 + 0.01 < x.t1 - 1e-6); if (sh) { c.t0 = Math.max(c.t0, sh.t0); c.t1 = Math.min(c.t1, sh.t1); } }); // a caption never runs over a cut
  caps.forEach((c, i) => { const n = caps[i + 1], sh = SHOTS.find((x) => c.w0 + 0.01 >= x.t0 - 1e-6 && c.w0 + 0.01 < x.t1 - 1e-6); if (n && n.n === c.n && sh && n.t0 > c.t1 && n.t0 - c.t1 < 0.1) { if (c.t1 >= sh.t1 - 1e-6) n.t0 = c.t1; else c.t1 = n.t0; } }); // no flash of an empty frame inside a line: a caption that a cut ended is followed at the cut, a short breath between words is bridged
  caps[caps.length - 1].t1 = Math.min(caps[caps.length - 1].t1, T.share); // the share line takes the place of the last caption
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
export const SHARE = "Send this to the friend who always says 'sure'.";
export const shareK = (f: number) => ease((f / FPS - T.share) / 0.18);

// ── sound cues for the mix (scripts/because-cues.mts): name, time, db or vol, optional length and fade
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  const add = (name: string, at: number, db = 0, o: { len?: number; fade?: number; from?: number } = {}) => c.push({ name, at, db, ...o });
  add("sting-a", 0.0, -5);
  // the total: a click on every flip; the tray, the pies: a pop; the cup: the slam on its impact
  add("pop", T.s2 + 0.05, -14);
  T.flip.forEach((t) => add("tick", onPeak("tick", t + 0.08), -6));
  add("pop", onPeak("pop", T.tray), -9);
  add("slam", Math.max(0, onPeak("slam", T.slam)), -2);
  add("pop", onPeak("pop", T.pies), -9);
  // the screen rolls and the register rings when it stops on two million
  for (let i = 0; i < 6; i++) add("tick", T.roll + 0.05 + i * 0.07, -12);
  add("kaching", onPeak("kaching", T.lock), -4);
  // the hat and the headset change heads; he walks out; the door
  add("rustle", onPeak("rustle", T.hatLand), -8);
  add("pop", onPeak("pop", T.hsLand), -10);
  add("shuffle", T.walk0 + 0.05, -9, { len: T.walk1 - T.walk0 + 0.1, fade: 0.2 });
  add("kdoor", onPeak("kdoor", T.doorOpen + 0.04), -5);
  // Rhonda walks up; Denise's eyes widen; the share line
  add("shuffle", T.s18 - 0.05, -10, { len: T.s19 - T.s18 + 0.1, fade: 0.2 });
  add("gasp", T.eyes - 0.05, -13);
  add("sting-b", T.share, -4);
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── the stills: key frames, at least one per shot, chosen away from blinks (because-check.mts)
const ALL: Char[] = ["deniseHood", "cashier", "rhonda"];
const blinking = (f: number) => ALL.some((c) => BLINKS[c].some((s) => f >= s - 1 && f <= s + 3));
/** a key frame at time t, moved on a few frames if anybody blinks there */
const kf = (label: string, t: number) => { let f = Math.round(t * FPS); for (let d = 0; d < 8 && blinking(f); d++) f++; return { label, f }; };
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 denWide: Denise under the board", 0.5),
  kf("2 cash2: Make it a meal?", L(2).start + 0.4),
  kf("3 den3: the number flips", T.flip[0] + 0.1),
  kf("3 den3: the tray is on the counter", T.flip[0] + 0.45),
  kf("4 cash4: Large is only", L(4).start + 0.3),
  kf("5 denTray: the cup lands", T.slam + 0.05),
  kf("5 denTray: Sure.", L(5).start + 0.1),
  kf("6 cash6: Pies", L(6).start + 0.3),
  kf("7 den7: Sure. and the pies", (T.s7 + T.s8) / 2),
  kf("8 cash8: Round up", L(8).start + 0.2),
  kf("9 den9: Sure.", T.flip[3] + 0.28),
  kf("10 cash10: Extended warranty", L(10).start + 0.4),
  kf("11 den11: Sure.", T.flip[4] + 0.26),
  kf("12 cash12: Burger Plus", L(12).start + 0.3),
  kf("13 den13: Sure. and the subscription", (T.flip[5] + T.s14) / 2),
  kf("14 cashLook: he looks up", T.lookUp + 0.2),
  kf("14 cashLook: Wanna buy", L(14).start + 0.5),
  kf("15 cashPush: only two million more", L(14).words[5].t + 0.2),
  kf("16 den15: ...Sure.", L(15).start),
  kf("17 screen: it rolls", T.roll + 0.25),
  kf("17 screen: $2,000,014.99", T.lock + 0.25),
  kf("18 swap: the hat in the air", (T.hatOff + T.hatLand) / 2),
  kf("18 swap: the headset in the air", (T.hsOff + T.hsLand) / 2),
  kf("18 swap: the door", T.doorOpen + 0.15),
  kf("19 backDen: Rhonda walks up", (T.s18 + T.s19) / 2),
  kf("20 rhonda: Why'd you buy", L(16).start + 0.4),
  kf("21 denSay: ...It was only two million more.", L(17).start + 0.9),
  kf("22 denEyes: her eyes widen", T.eyes + 0.3),
  kf("23 denSwear: marketing", L(18).words[1].t + 0.15),
  kf("24 wideEnd: the share line", T.share + 0.6),
];
