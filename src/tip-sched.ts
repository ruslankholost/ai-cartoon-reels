// The timeline and the acting of "Tip?" (src/Tip.tsx, docs/x02-tip.md, script v3). Pure data and arithmetic: every number is a function of the frame, of the voice takes in
// public/tip/timings.json and of the mouth loudness in src/amp-tip.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock
// (take n sits at tableRead.cues[n].at, so the gaps of episodes/tip.jsonc carry the silent beats): every action below is anchored to a take (before or after a word), never to a number of its own.
import timings from "../public/tip/timings.json" with { type: "json" };
import amps from "./amp-tip.json" with { type: "json" };
import peaks from "./sfx-peaks.json" with { type: "json" };
import { hash, lerp, spring } from "./sp-math.ts";

export const FPS = 30;
export const snap = (t: number) => Math.round(t * FPS) / FPS;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)); // smoothstep
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export { hash };
/** where a clip must start so that its measured peak (scripts/sfx-peaks.py, src/sfx-peaks.json) lands on `impact`, the instant the picture hits */
export const onPeak = (name: string, impact: number) => impact - ((peaks as Record<string, number>)[name] ?? 0);
/** piecewise-eased interpolation through [t, value] keys (smoothstep inside each segment) */
export function keys(t: number, k: [number, number][]): number {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t < k[i][0]) return lerp(k[i - 1][1], k[i][1], ease((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  return k[k.length - 1][1];
}

// kyle: the cashier in the red polo (the corner store); kyleJ: the same Kyle as a customer in the coffee shop (a puffy jacket over the polo)
export type Char = "deniseHood" | "kyle" | "kyleJ" | "attendant" | "lineA" | "lineB" | "lineC" | "lineD";
export type MouthShape = "closed" | "small" | "mid" | "wide" | "o";
export type Mood = "neutral" | "angry" | "defeated" | "smug" | "furious" | "impatient" | "resigned" | "flat" | "pitchy" | "polite" | "hiss" | "tight";
export const QUEUE: Char[] = ["lineA", "lineB", "lineC", "lineD"]; // the line behind Denise, nearest first

// ── the voice takes
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;

export type Peak = { f: number; a: number; sign: 1 | -1 };
// first: the take's first sound (a sigh counts), tend: its last sound, both in reel seconds; voiced: the stretches of sound of the built line, in reel seconds
export type Line = { n: number; who: string; char: Char | null; file: string; ofs: number; text: string; words: Word[]; first: number; start: number; end: number; tend: number; amp: number[]; f0: number; peaks: Peak[]; voiced: [number, number][] };
const CHAR_OF: Record<string, Char | null> = { KYLE: "kyle", DENISE: "deniseHood", ATTENDANT: "attendant", MACHINE: null };

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
  return TK.takes.map((t) => { // the takes come in the story's order (episodes/tip.jsonc), which is not the order of their numbers
    const ofs = P(t.n), amp = AMP[t.file].amp;
    const words = t.words.map((w) => ({ ...w, t: ofs + w.t, e: ofs + w.e }));
    const char = t.n === 19 ? "kyleJ" : CHAR_OF[t.character]; // line 19: Kyle is a customer in the coffee shop
    const i0 = amp.findIndex((a) => a >= 0.1);
    const base = { n: t.n, who: t.character, char, file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
    const key = char ?? "-", k = count[key] ?? 0;
    const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: ((k + j) % 2 === 0 ? 1 : -1) as 1 | -1 }));
    count[key] = k + peaks.length;
    return { ...base, peaks };
  });
})();
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;
const L = LINE;
const linesOf = (c: Char) => LINES.filter((l) => l.char === c);

// ── the cuts and the named moments (seconds). Every one hangs on a take: before its first sound or after its last
/** a speaker cut: `d` s before the take's first sound (a sigh counts) or its first word, whichever comes first */
const spk = (n: number, d = 0.12) => snap(Math.min(L(n).first, L(n).start) - d);
/** the middle of the longest silence inside a take (the pause between its two sentences), from the stretches of sound of the built line: a cut that falls there is inside no word */
function pauseMid(n: number): number {
  const v = L(n).voiced;
  let best = 0, at = 0;
  for (let i = 1; i < v.length; i++) if (v[i][0] - v[i - 1][1] > best) { best = v[i][0] - v[i - 1][1]; at = (v[i][0] + v[i - 1][1]) / 2; }
  return at;
}
// scene 1, the corner store
const s2 = snap(L(2).start - 0.12); // reverse on Denise
const s3 = snap(L(2).end + 0.1); // insert on the terminal's screen
const tapNo = snap(L(3).end + 0.2); // her finger lands on "no tip", straight, without a look
const s4 = snap(tapNo + 0.33); // wide: the line behind her
const heads = snap(tapNo + 0.45); // every head snaps to her
const takeWater = snap(heads + 0.7); // she takes her water off the counter, unbothered
const s5 = spk(5); // medium close on Kyle: "Have a good one."
// scene 2, the self-checkout
const s6 = snap(L(5).end + 0.1); // the hall, wide
const beep = snap(s6 + 0.3); // the scanner's last beep
const tap1 = snap(L(16).first - 0.5); // her first tap on "no tip"
const s7 = snap(tap1 - 0.8); // insert on the kiosk's screen
const s8 = spk(16); // the kiosk, medium: "No tip selected."
const s9 = snap(pauseMid(16)); // the aisle, wide: "Help is on the way." and the attendant's shuffle
const s10 = spk(17); // two-shot: he arrives and sighs at the screen
const s11 = spk(9); // Denise: "For who?" and her stare
const s12 = spk(10); // the attendant: thumb and "...Me, I guess."
const thumb = snap(L(10).words[0].t - 0.05); // his thumb comes up
const s13 = snap(L(10).tend + 0.1); // insert on the kiosk's screen again
const tap2 = snap(s13 + 0.4); // her second tap on "no tip"
const s14 = snap(tap2 + 0.35); // the attendant: his shoulders drop
// scene 3, the coffee shop
const swing = snap(L(18).first - 0.5); // the callback: the terminal swings in, as in shot 1 (the line starts 0.5 s into the shot)
const s16 = spk(19); // Kyle: "I got it out of the fridge myself."
const s17 = snap(L(19).tend + 0.1); // insert on the terminal's screen
const tapK = snap(s17 + 0.4); // his finger lands on "no tip", straight, without a look
const s18 = spk(20); // Denise: the tight smile, "Have a good one."
const s19 = snap(L(20).tend + 0.15); // the coffee shop, wide: Kyle walks out
const doorOpen = snap(s19 + 0.5); // he pushes the door: the leaf swings out and the bell rings
const doorShut = snap(s19 + 1.0); // he is out: the door swings back
const s20 = snap(L(21).first - 0.3); // close on Denise: the smile drops
const share = snap(L(21).tend + 0.04); // the share line, and the last shot
export const T = {
  s2, s3, tapNo, s4, heads, takeWater, s5, s6, beep, s7, tap1, s8, s9, s10, s11, s12, thumb, s13, tap2, s14, swing, s16, s17, tapK, s18, s19, doorOpen, doorShut, s20, share,
  end: snap(share + 2.5),
};
export const T_END = T.end;
export const FRAMES = Math.round(T_END * FPS);

// The shots, one per framing (docs/x02-tip.md): cut to whoever speaks, an insert only for an action the joke needs. tip-check.mts holds the list to the length rule
// (<= 2.4 s; the hook, its callback and the last shot are the exceptions) and to "no two shots in a row with the same framing". A framing used twice (the terminal's screen, the kiosk's
// screen, the attendant in close-up) has two ids, one per use.
export type ShotId = "close" | "reverse" | "insert" | "store" | "kyleMc" | "scanWide" | "kioskTap" | "kiosk" | "aisle" | "two" | "denKiosk" | "attMc" | "kioskTap2" | "attSag" | "callback" | "kyleCafe" | "insertNo" | "denCafe" | "cafeWide" | "denClose" | "denJar";
export const SHOTS: { id: ShotId; t0: number; t1: number }[] = [
  { id: "close", t0: 0, t1: T.s2 },
  { id: "reverse", t0: T.s2, t1: T.s3 },
  { id: "insert", t0: T.s3, t1: T.s4 },
  { id: "store", t0: T.s4, t1: T.s5 },
  { id: "kyleMc", t0: T.s5, t1: T.s6 },
  { id: "scanWide", t0: T.s6, t1: T.s7 },
  { id: "kioskTap", t0: T.s7, t1: T.s8 },
  { id: "kiosk", t0: T.s8, t1: T.s9 },
  { id: "aisle", t0: T.s9, t1: T.s10 },
  { id: "two", t0: T.s10, t1: T.s11 },
  { id: "denKiosk", t0: T.s11, t1: T.s12 },
  { id: "attMc", t0: T.s12, t1: T.s13 },
  { id: "kioskTap2", t0: T.s13, t1: T.s14 },
  { id: "attSag", t0: T.s14, t1: T.swing },
  { id: "callback", t0: T.swing, t1: T.s16 },
  { id: "kyleCafe", t0: T.s16, t1: T.s17 },
  { id: "insertNo", t0: T.s17, t1: T.s18 },
  { id: "denCafe", t0: T.s18, t1: T.s19 },
  { id: "cafeWide", t0: T.s19, t1: T.s20 },
  { id: "denClose", t0: T.s20, t1: T.share },
  { id: "denJar", t0: T.share, t1: T.end },
];
export function shotAt(f: number) {
  const t = f / FPS;
  const i = SHOTS.findIndex((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  const s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  return { ...s, i: i < 0 ? SHOTS.length - 1 : i, lt: t - s.t0, d: s.t1 - s.t0, u: clamp01((t - s.t0) / (s.t1 - s.t0)) };
}

// ── the mouth: a level per frame from the loudness of the take, on twos, one frame ahead of the sound; closed whenever the character is not speaking
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const ampAt = (l: Line, f: number) => l.amp[f - l.f0] ?? 0;
const lineAt = (c: Char, f: number, before = 0.1, after = 0.05) => linesOf(c).find((q) => f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (c: Char, f: number) => !!lineAt(c, f);

/** how loud the machine's voice is (line 16): the glow of the screen that speaks */
export const machineAmp = (f: number) => ampAt(L(16), f - (f % 2) + 1);
// the line's puppets gasp when the buzzer goes (staggered by 2 frames, the nearest first) and keep staring
export const gaspStart = (c: Char) => T.heads + 2 * Math.max(0, QUEUE.indexOf(c)) / FPS;
export const gaspK = (c: Char, f: number) => ease((f / FPS - gaspStart(c)) / 0.1);
const gasping = (c: Char, f: number) => QUEUE.includes(c) && gaspK(c, f) > 0.5 && f / FPS < gaspStart(c) + 0.75;

export function moodAt(c: Char, f: number): Mood {
  const t = f / FPS;
  switch (c) {
    case "kyle": case "kyleJ": return "flat";
    case "attendant": return "resigned";
    case "lineA": case "lineB": case "lineC": case "lineD": return gasping(c, f) ? "neutral" : "flat";
    default: // Denise
      if (t < L(2).start - 0.05) return "flat";
      if (t < L(2).end + 0.3) return "impatient"; // "I got it out of the fridge myself."
      if (t < L(9).start - 0.1) return "flat"; // she never caves: a flat face at the tap, at the gasp, at the kiosk
      if (t < L(10).start) return "neutral"; // "For who?"
      if (t < T.s18 - 0.4) return "flat"; // the second tap; in the coffee shop she copies Kyle's flat voice
      if (t < T.s20 + 0.1) return "tight"; // the fake smile and "Have a good one."; it holds until she is alone
      if (t < L(21).start - 0.05) return "flat"; // the smile has dropped
      return "angry"; // "What kind of a**hole doesn't tip?"
  }
}
export function mouthAt(c: Char, f: number): MouthShape {
  const l = lineAt(c, f);
  if (!l) return gasping(c, f) ? "o" : "closed";
  const fi = f - (f % 2);
  const a = ampAt(l, fi + 1);
  if (a < 0.1) return "closed";
  const mood = moodAt(c, fi);
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (mood !== "angry" && mood !== "furious" && w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  let s: MouthShape = a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
  if ((mood === "angry" || mood === "furious") && s === "small") s = "mid";
  if (mood === "defeated" || mood === "resigned") s = a >= 0.62 ? "mid" : "small";
  if (mood === "flat" && s === "wide") s = "mid";
  return s;
}

// ── the head: tilts a little and dips on every syllable, alternating sides, each move eased over 6 frames; it settles after the line
const TILT: Record<Char, number> = { deniseHood: 2.6, kyle: 1.2, kyleJ: 1.2, attendant: 1.6, lineA: 1, lineB: 1, lineC: 1, lineD: 1 }; // degrees
const BOB: Record<Char, number> = { deniseHood: 3.2, kyle: 2.2, kyleJ: 2.2, attendant: 2.4, lineA: 1, lineB: 1, lineC: 1, lineD: 1 };
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

// ── blinks: every 2.5-4.5 s, 3 frames (half, shut, half), at hashed times; the gaping line does not blink in its gasp, and Denise does not blink from the tap to the cut to Kyle
const SEEDS: Record<Char, number> = { deniseHood: 4, kyle: 9, kyleJ: 15, attendant: 12, lineA: 6, lineB: 19, lineC: 23, lineD: 27 };
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out;
}
export const BLINKS: Record<Char, number[]> = Object.fromEntries((Object.keys(SEEDS) as Char[]).map((c) => [c, blinkStarts(SEEDS[c])])) as Record<Char, number[]>;
const blinkK = (c: Char, f: number) => {
  if (c === "lineC") return 0;
  if (c === "deniseHood" && f / FPS >= T.tapNo - 0.3 && f / FPS < T.s5) return 0;
  for (const s of BLINKS[c]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};

// ── Denise's face by beat (angry brows, raised brows, heavy lids, small pupils): [seconds, value] keys, eased between
const D = (k: [number, number][]) => (t: number) => keys(t, k);
const denAngry = D([[0, 0.1], [L(2).start - 0.1, 0.1], [L(2).start + 0.2, 0.45], [L(2).end + 0.3, 0.1], [T.tapNo - 0.1, 0.1], [T.tapNo + 0.08, 0], [L(9).start - 0.1, 0], [L(9).start, 0.1], [T.s20 + 0.1, 0.1], [L(21).start - 0.1, 0.1], [L(21).start + 0.1, 1], [L(21).tend, 0.6]]);
const denLift = D([[0, 0], [L(9).start - 0.15, 0], [L(9).start + 0.05, 0.8], [L(9).end + 0.2, 0], [T.s18 - 0.1, 0], [T.s18 + 0.1, 0.8], [T.s20 + 0.1, 0.8], [T.s20 + 0.22, 0], [L(21).start - 0.05, 0.3], [L(21).start + 0.1, 0.1]]);
const denLid = D([[0, 0.2], [L(2).start, 0.12], [L(2).end + 0.2, 0.25], [T.s6, 0.32], [L(9).start, 0.1], [L(9).end + 0.3, 0.3], [T.swing, 0.35], [T.s18 - 0.3, 0.3], [T.s18, 0.1], [T.s20 + 0.1, 0.1], [T.s20 + 0.3, 0.4], [L(21).start, 0.1], [L(21).tend, 0.15]]);
const denPupil = D([[0, 1], [L(21).start - 0.02, 1], [L(21).start + 0.04, 0.7], [L(21).start + 0.6, 1]]);

const BASE_LID: Partial<Record<Char, number>> = { kyle: 0.42, kyleJ: 0.42, attendant: 0.2, lineA: 0.3, lineB: 0.25, lineC: 0.3, lineD: 0.3 };
export function lidAt(c: Char, f: number): number {
  const t = f / FPS;
  let b = c === "deniseHood" ? denLid(t) : BASE_LID[c] ?? 0;
  if (QUEUE.includes(c)) b = b * (1 - gaspK(c, f));
  if (c === "attendant") b += 0.25 * sagK(f); // the sigh: the lids come down with his shoulders
  return Math.max(b, b + (1 - b) * blinkK(c, f));
}

// ── Denise's pose: the bottle in her hand until she puts it on the counter (while she taps) and takes it back; no bottle in the supermarket; the apron in the coffee shop (one arm out
// toward the terminal in the callback)
export function denisePose(f: number): string {
  const t = f / FPS;
  if (t < T.s3) return "bottle";
  if (t < T.takeWater) return "neutral"; // the bottle is on the counter
  if (t < T.s5) return "bottle"; // she takes her water
  if (t < T.swing) return "neutral";
  if (t < T.s16) return "apronOut";
  return "apron";
}
export const attendantPose = (f: number) => (f / FPS >= T.thumb && f / FPS < T.s14 ? "me" : "stand");
/** the attendant's shoulders drop after her second tap: 0 -> 1 over 0.3 s, from 0.08 s into shot 14 */
export const sagK = (f: number) => ease((f / FPS - (T.s14 + 0.08)) / 0.3);

// ── gaze: where the pupils look, -1..1 of their travel (x right, y down)
export function gazeAt(c: Char, f: number): [number, number] {
  const sh = shotAt(f).id;
  switch (c) {
    case "kyle": return [-0.9, 0.05]; // off to the side, the way cashiers do
    case "kyleJ": return sh === "callback" ? [-0.5, 0.3] : sh === "cafeWide" ? [0.6, 0.05] : [-0.55, 0.15]; // the terminal; the door; Denise, off-screen
    case "attendant": return sh === "two" ? [-0.55, 0.3] : sh === "attMc" ? [0.55, 0.45] : sh === "attSag" ? [0.3, 0.7] : [0.3, 0.2]; // at the screen he sighs at; then, embarrassed, down and away from her
    case "deniseHood": {
      switch (sh) {
        case "close": return [-0.5, 0.3]; // the terminal
        case "reverse": return [-0.55, 0.15]; // Kyle, off-screen
        case "store": return [0.0, 0.15]; // unbothered: straight ahead, not at the line behind her
        case "scanWide": return [0.1, 0.5];
        case "kiosk": return [-0.95, -0.1]; // away, bored, she taps without looking
        case "aisle": return [-0.85, -0.05]; // him, far off
        case "two": return [0.4, 0.3]; // the screen
        case "denKiosk": return [0.8, -0.05]; // her stare: at him
        case "callback": return [-0.9, 0.05]; // eyes to the side, exactly like Kyle in shot 1
        case "denCafe": return [-0.5, 0.05]; // at the customer, off-screen, with the smile
        case "cafeWide": return [0.8, 0]; // the door
        case "denClose": return [0.65, 0]; // the door he left by, and the jar
        case "denJar": return [0.5, 0.35];
        default: return [-0.5, 0.45];
      }
    }
    default: { // the line: down at their things; at Denise from the gasp (she is on their left), then back to the front
      const k = gaspK(c, f);
      return [-1 * k + 0.1 * (1 - k), 0.35 * (1 - k)];
    }
  }
}

export type Pose = { body?: string; tilt: number; bob: number; breath: number; mouth: MouthShape; mood: Mood; lid: number; angry: number; sad: number; lift: number; asym: number; pupil: number; gaze: [number, number]; dx: number };
export function poseAt(c: Char, f: number): Pose {
  const t = f / FPS;
  const m = talkMove(c, f);
  const phase = { deniseHood: 0.4, kyle: 2.1, kyleJ: 0.2, attendant: 1.2, lineA: 2.7, lineB: 1.7, lineC: 0.9, lineD: 3.3 }[c];
  let tilt = m.tilt, bob = m.bob, lift = 0, angry = 0, pupil = 1, sag = 0, body: string | undefined;
  if (c === "deniseHood") { angry = denAngry(t); lift = denLift(t); pupil = denPupil(t); body = denisePose(f); }
  if (c === "attendant") { body = attendantPose(f); const k = sagK(f); sag = 9 * k; bob -= 8 * k; } // (no tilt with the sag: a tilted head shows the vest's collar tip under the chin)
  if (QUEUE.includes(c)) { const k = gaspK(c, f); tilt += 5 * k * (1 + 0.15 * QUEUE.indexOf(c)); pupil = 1 - 0.45 * k; lift = k; }
  return { body, tilt, bob, breath: 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + phase) - sag, mouth: mouthAt(c, f), mood: moodAt(c, f), lid: lidAt(c, f), angry, sad: c === "attendant" ? 0.25 : 0, lift, asym: 0, pupil, gaze: gazeAt(c, f), dx: 0 };
}

// ── the terminal: it swings in about its coil base with an overshoot and a wobble; it is already mid-swing at the first frame of the shot (the first picture is the problem).
// The coffee shop's terminal swings with exactly the same move (the callback), `lead` seconds into it when the shot begins.
export const SWING = { A: 20, zeta: 0.52, omega: 12, lead: 0.13, wobble: 1.7, hz: 4.2 }; // degrees, 1/s; the wobble is a second, faster ring-down on top of the first overshoot
export const swingAngle = (t: number, t0: number) => {
  const u = t - t0 + SWING.lead;
  return -SWING.A * (1 - spring(u, SWING.zeta, SWING.omega)) - (u > 0 ? SWING.wobble * Math.exp(-u / 0.35) * Math.sin(2 * Math.PI * SWING.hz * u) : 0);
};
/** the swing is also a move toward the camera: it grows from `from` of its size to its size, with the same overshoot */
export const swingGrow = (t: number, t0: number, from = 0.74) => from + (1 - from) * spring(t - t0 + SWING.lead, SWING.zeta, SWING.omega);
/** the screen of the card terminal by time: ask, a press on "no tip" at `tap`, the red BAD TIP (flashing for 8 frames, then steady) */
export type Screen = "ask" | "askNo" | "bad" | "badDark";
export function terminalScreen(f: number, tap: number): Screen {
  const t = f / FPS;
  if (t < tap) return "ask";
  if (t < tap + 0.02) return "askNo";
  const k = Math.floor((t - tap - 0.02) * FPS);
  return k < 8 && k % 2 === 1 ? "badDark" : "bad";
}
/** a finger in an insert: where it is on the screen (design units of src/tip-screens.ts), how deep it presses, and whether it is there at all. It goes eased through the
 * waypoints [t, x, y], presses around `tap` and goes back down (`away` units, 260 unless it must leave the frame) from `tap + 0.12` */
export type Finger = { x: number; y: number; press: number; on: boolean };
function finger(f: number, way: [number, number, number][], tap: number, on: [number, number], away = 260): Finger {
  const t = f / FPS;
  let x = way[0][1], y = way[0][2];
  for (let i = 1; i < way.length; i++) if (t >= way[i - 1][0] && t < way[i][0]) { const u = ease((t - way[i - 1][0]) / (way[i][0] - way[i - 1][0])); x = lerp(way[i - 1][1], way[i][1], u); y = lerp(way[i - 1][2], way[i][2], u); }
  if (t >= way[way.length - 1][0]) { x = way[way.length - 1][1]; y = way[way.length - 1][2]; }
  const press = Math.max(0, 1 - Math.abs(t - tap - 0.03) / 0.1);
  const out = ease((t - (tap + 0.12)) / 0.2); // the hand goes back down after the tap
  return { x, y: y + away * out, press, on: t >= on[0] && t < on[1] };
}
/** the finger of the terminal inserts (shots 3 and 17; the terminal's screen, design 300 x 520): up from below, straight and fast, onto the tiny "no tip"; it never hunts */
export const fingerNoAt = (f: number, tap: number) => finger(f, [[tap - 0.42, 150, 800], [tap - 0.04, 150, 492]], tap, [tap - 0.45, 1e9], 300);
/** the finger of the kiosk inserts (shots 7 and 13; design 400 x 344): "no tip" is tiny in the bottom left corner */
export const fingerKioskAt = (f: number, tap: number) => finger(f, [[tap - 0.4, 70, 760], [tap - 0.04, 40, 318]], tap, [tap - 0.45, 1e9], 620);

// ── the kiosk
export type KioskScreen = "ask" | "askNo";
export const kioskScreen = (f: number): KioskScreen => { const t = f / FPS; return [T.tap1, T.tap2].some((a) => t >= a && t < a + 0.12) ? "askNo" : "ask"; };
/** the beacon on the pole: red and flashing from the first tap until the attendant is there, and for a moment at the second tap */
export function beaconRed(f: number): number {
  const t = f / FPS;
  const from = t >= T.tap1 + 0.02 && t < T.s10 ? T.tap1 + 0.02 : t >= T.tap2 + 0.02 && t < T.tap2 + 0.5 ? T.tap2 + 0.02 : -1;
  if (from < 0) return 0;
  return Math.floor((t - from) / 0.16) % 2 === 0 ? 1 : 0.15;
}
/** the scanner: one beep, a dip of the body on it (two frames) */
export function scanDip(f: number): number { const t = f / FPS; return t >= T.beep && t < T.beep + 2 / FPS ? 1 : 0; }
/** the attendant walks the aisle from the far end to the kiosk: where his feet are (picture px of bg-selfcheck), 0..1 */
export const walkP = (t: number) => clamp01((t - T.s9) / 3.6);
export function walkFrame(f: number): { u: number; v: number; ps: number; bob: number; tilt: number; dx: number } {
  const t = f / FPS, p = walkP(t);
  const u = lerp(372, 478, p), v = lerp(664, 804, p);
  const step = Math.sin((Math.PI * 2 * (t - T.s9)) / 0.55); // a shuffle: one step every 0.55 s
  const ps = 0.00182 * (v - 640);
  return { u, v, ps, bob: -Math.abs(step) * 90 * ps, tilt: 3.2 * step, dx: 40 * ps * Math.sin((Math.PI * 2 * (t - T.s9)) / 1.24) };
}

// ── the coffee shop's door: the leaf is hinged on its right side and swings out (away from the camera), 0 = shut .. 72 degrees; the bell hangs at its top and swings on the door's moves
export function doorAngle(f: number): number {
  const t = f / FPS;
  return 72 * ease((t - T.doorOpen) / 0.28) * (1 - ease((t - T.doorShut) / 0.3));
}
export function bellAngle(f: number): number {
  const t = f / FPS, a = t - T.doorOpen, b = t - T.doorShut;
  const ring = (x: number) => (x < 0 ? 0 : 16 * Math.exp(-x / 0.3) * Math.sin(2 * Math.PI * 5.5 * x));
  return ring(a) + 0.6 * ring(b);
}
/** Kyle walks out: picture px of bg-cafe-wide, his feet (u, v), the scale of the puppet, the step of his walk, and whether he is through the door */
export function kyleOut(f: number): { u: number; v: number; s: number; bob: number; tilt: number; out: boolean } {
  const t = f / FPS;
  const a = ease((t - T.s19) / (T.doorOpen + 0.2 - T.s19)), b = ease((t - (T.doorOpen + 0.2)) / (T.doorShut + 0.1 - (T.doorOpen + 0.2)));
  const u = lerp(375, 512, a), v = lerp(1010, 928, a) - 86 * b, s = lerp(0.47, 0.40, a) - 0.1 * b;
  const step = Math.sin((Math.PI * 2 * (t - T.s19)) / 0.5) * (1 - ease((t - T.doorShut) / 0.1));
  return { u, v, s, bob: -Math.abs(step) * 16 * s, tilt: 3 * step, out: b > 0.05 }; // out: he has stepped through the doorway, so the door's leaf is in front of him from now on
}

// ── captions: one plain line at a time, the current speaker's words only; split at sentence ends, pauses, cuts and ~22 characters; a bleep shows as a**hole.
// A caption lives inside one shot: it is split where a cut falls between two words, and starts no earlier than the cut that brings its first word.
export type Cap = { who: string; n: number; text: string; t0: number; t1: number; w0: number; w1: number }; // n: the take's number
const say = (w: Word) => (w.bleep ? w.d.replace(/^a..(hole)/i, "a**$1") : w.d);
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
  caps.forEach((c, i) => { const n = caps[i + 1], sh = SHOTS.find((x) => c.w0 + 0.01 >= x.t0 - 1e-6 && c.w0 + 0.01 < x.t1 - 1e-6); if (n && n.n === c.n && sh && n.t0 > c.t1 && n.t0 - c.t1 < 0.1) c.t1 = Math.min(n.t0, sh.t1); }); // no flash of an empty frame inside a line (one that a cut split, or a short breath between its words)
  caps[caps.length - 1].t1 = Math.min(caps[caps.length - 1].t1, T.share); // the share line takes the place of the last caption
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
export const SHARE = "Send this to someone who's been on both sides of the counter.";
export const shareK = (f: number) => ease((f / FPS - T.share) / 0.18);

// ── sound cues for the mix (scripts/tip-cues.mts): name, time, db or vol, optional length and fade
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  const add = (name: string, at: number, db = 0, o: { len?: number; fade?: number; from?: number } = {}) => c.push({ name, at, db, ...o });
  const swingLand = (t0: number) => t0 - SWING.lead + 0.17; // the first moment the swing reaches its place: the whoosh peaks there
  add("sting-a", 0.0, -5);
  add("whoosh", Math.max(0, onPeak("whoosh", swingLand(0))), -3);
  add("boing", Math.max(0, onPeak("boing", swingLand(0) + 0.1)), -9);
  // shots 3 and 4: the finger, the tap, the buzzer, the gasp; she takes her water
  add("tap", onPeak("tap", T.tapNo), -4);
  add("buzzer", onPeak("buzzer", T.tapNo + 0.04), -5);
  add("gasp", onPeak("gasp", T.heads + 0.1), -4);
  add("tap", onPeak("tap", T.takeWater), -16);
  // shot 6: the scanner's last beep; shot 7: the tap and the ding-ding
  add("beep", onPeak("beep", T.beep), -7);
  add("tap", onPeak("tap", T.tap1), -2);
  add("ding", onPeak("ding", T.tap1 + 0.02), -8);
  add("ding", onPeak("ding", T.tap1 + 0.2), -8);
  // shot 9: a shuffle, until he is at the kiosk
  add("shuffle", T.s9 + 0.05, -8, { len: snap(L(17).first - 0.25) - T.s9 + 0.2, fade: 0.3 });
  // shot 13: the second tap; shot 14: the sigh
  add("tap", onPeak("tap", T.tap2), -4);
  add("ding", onPeak("ding", T.tap2 + 0.02), -13);
  add("exhale", T.s14 + 0.05, -9);
  // shot 15: the callback, the terminal swings in with the same whoosh and boing as in shot 1
  add("whoosh", Math.max(0, onPeak("whoosh", swingLand(T.swing))), -3);
  add("boing", Math.max(0, onPeak("boing", swingLand(T.swing) + 0.1)), -9);
  // shot 17: his tap and the buzzer
  add("tap", onPeak("tap", T.tapK), -4);
  add("buzzer", onPeak("buzzer", T.tapK + 0.04), -5);
  // shot 19: the door's bell
  add("chime", onPeak("chime", T.doorOpen + 0.03), -6);
  add("sting-b", T.share, -4);
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── the stills: key frames, at least one per shot, chosen away from blinks (tip-check.mts)
const kf = (label: string, t: number) => ({ label, f: Math.round(t * FPS) });
export const KEY_FRAMES: { label: string; f: number }[] = [
  { label: "1 close: the terminal in her face", f: 0 },
  { label: "1 close: wobble, Kyle talks", f: Math.round(1.4 * FPS) },
  { label: "2 reverse", f: Math.round(3.7 * FPS) },
  kf("3 insert: the finger comes in", T.tapNo - 0.2),
  kf("3 insert: BAD TIP", T.tapNo + 0.12),
  kf("4 store: the line stares", T.heads + 0.3),
  kf("4 store: she takes her water", T.takeWater + 0.15),
  kf("5 kyleMc: Have a good one.", L(5).start + 0.5),
  kf("6 scanWide: the beep", T.beep + 0.05),
  kf("7 kioskTap: the tap", T.tap1 + 0.1),
  kf("8 kiosk: No tip selected.", L(16).words[1].t + 0.07),
  kf("9 aisle: he shuffles over", (T.s9 + T.s10) / 2),
  kf("10 two: he sighs at the screen", L(17).first + 0.3),
  kf("10 two: It wants a tip.", L(17).words[2].t + 0.1),
  kf("11 denKiosk: For who?", L(9).start + 0.3),
  kf("11 denKiosk: the stare", L(9).end + 0.4),
  kf("12 attMc: his thumb", L(10).words[0].t + 0.4),
  kf("13 kioskTap2: again", T.tap2 + 0.1),
  kf("14 attSag: his shoulders drop", T.s14 + 0.5),
  kf("15 callback: the swing", T.swing + 0.1),
  kf("15 callback: Denise talks", T.swing + 1.55),
  kf("16 kyleCafe: I got it out of the fridge", L(19).start + 0.5),
  kf("17 insertNo: BAD TIP", T.tapK + 0.12),
  kf("18 denCafe: Have a good one.", L(20).start + 0.3),
  kf("19 cafeWide: he walks", T.s19 + 0.3),
  kf("19 cafeWide: the door", T.doorOpen + 0.3),
  kf("20 denClose: the smile drops", T.s20 + 0.15),
  kf("20 denClose: a**hole", L(21).words[3].t + 0.1),
  kf("21 denJar: the share line", T.share + 0.6),
];
