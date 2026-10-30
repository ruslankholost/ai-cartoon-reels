// The timeline and the motion of "Nobody Picks Up" v3 (NobodyV3, South Park puppets). Pure data and arithmetic: every number is a function of the
// frame, of the voice takes in public/nobody/timings.json and of the mouth loudness in src/amp-nobody.json; nothing reads a clock or a random source.
// Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at), so the gaps of episodes/nobody.jsonc carry the silent
// beats. Take 9 loses its first 0.8 s (a lip smack and a breath) so that the pickup click lands a quarter second before "Yeah.", as in SpCallTest.
import timings from "../public/nobody/timings.json" with { type: "json" };
import amps from "./amp-nobody.json" with { type: "json" };
import peaks from "./sfx-peaks.json" with { type: "json" };
import { spring } from "./sp-math.ts";

export const FPS = 30;
export const snap = (t: number) => Math.round(t * FPS) / FPS;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)); // smoothstep
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIn = (x: number) => clamp01(x) * clamp01(x);
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** where a clip must start so that its measured peak (scripts/sfx-peaks.py, src/sfx-peaks.json) lands on `impact`, the instant the picture hits */
export const onPeak = (name: string, impact: number) => impact - ((peaks as Record<string, number>)[name] ?? 0);
/** piecewise-eased interpolation through [t, value] keys (smoothstep inside each segment) */
export function keys(t: number, k: [number, number][]): number {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t < k[i][0]) return lerp(k[i - 1][1], k[i][1], ease((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  return k[k.length - 1][1];
}

export type Char = "denise" | "gary" | "marco" | "agency" | "rick" | "wife" | "deniseRobe";
export type MouthShape = "closed" | "small" | "mid" | "wide" | "o";
export type Mood = "neutral" | "angry" | "defeated" | "smug" | "furious" | "impatient" | "resigned" | "flat" | "pitchy" | "polite" | "hiss";

type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
const SKIP9 = 0.8;

export type Peak = { f: number; a: number; sign: 1 | -1 };
export type Line = { n: number; who: string; char: Char | null; file: string; ofs: number; skip: number; text: string; words: Word[]; start: number; end: number; tend: number; amp: number[]; f0: number; peaks: Peak[] }; // tend: where the take's voice ends (its last sound, not its last word), seconds from the clip start
const CHAR_OF: Record<string, Char | null> = { DENISE: "denise", GARY: "gary", MARCO: "marco", "AGENCY GUY": "agency", "RICK'S WIFE": "wife", TONY: null, VOICEMAIL: null };

function peaksOf(l: Omit<Line, "peaks">): { f: number; a: number }[] {
  const out: { f: number; a: number }[] = [];
  for (let f = Math.floor(l.start * FPS) - 1; f <= Math.ceil(l.end * FPS); f++) {
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
  return [...TK.takes].sort((a, b) => a.n - b.n).map((t) => {
    const ofs = P(t.n);
    const words = t.words.map((w) => ({ ...w, t: ofs + w.t, e: ofs + w.e }));
    const char = t.character === "DENISE" && t.n === 16 ? "deniseRobe" : CHAR_OF[t.character];
    const base = { n: t.n, who: t.character, char, file: t.file, ofs, skip: t.n === 9 ? SKIP9 : 0, text: t.text, words, start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp: AMP[t.file].amp, f0: Math.round(ofs * FPS) };
    const key = char ?? "-", k = count[key] ?? 0;
    const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: ((k + j) % 2 === 0 ? 1 : -1) as 1 | -1 }));
    count[key] = k + peaks.length;
    return { ...base, peaks };
  });
})();
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;
const linesOf = (c: Char) => LINES.filter((l) => l.char === c);

// ── the cuts and the named moments (seconds)
export type ShotId = "bath" | "list" | "tony" | "office" | "crowd" | "scroll" | "van" | "living" | "review" | "premier";
export const T = {
  cold: snap(0.27), // the water stops dead
  s2: snap(2.33), aquaTap: 4.62, aquaCall: 4.82,
  s3: snap(5.37), ringbackA: 5.42, buzz: [5.5, 5.98, 7.1] as number[], hangup: 11.06,
  s4: snap(11.2), dialTap: 11.42, ringbackB: 11.72, marcoRing: [12.05, 13.2] as number[], flipStart: 14.4, thunkM: 14.64,
  s5: snap(16.2), ringbackC: 16.25, flush: 16.55, kill: 17.35,
  s6: snap(19.27), scrollA: 19.5, scrollB: 21.1, gTap: 23.55, ringbackD: 23.85,
  s7: snap(24.47), pick: LINE(9).words[0].t - 0.27,
  s8a: snap(38.47), s8b: snap(39.93), stars: 40.02, s8c: snap(41.87), flipHand: 42.5, thunkP: 42.8, card: snap(43.07), end: snap(44.07),
};
export const T_END = T.end;
export const FRAMES = Math.round(T_END * FPS);
export const SHOTS: { id: ShotId; t0: number; t1: number; split: boolean }[] = [
  { id: "bath", t0: 0, t1: T.s2, split: false },
  { id: "list", t0: T.s2, t1: T.s3, split: false },
  { id: "tony", t0: T.s3, t1: T.s4, split: true },
  { id: "office", t0: T.s4, t1: T.s5, split: true },
  { id: "crowd", t0: T.s5, t1: T.s6, split: true },
  { id: "scroll", t0: T.s6, t1: T.s7, split: false },
  { id: "van", t0: T.s7, t1: T.s8a, split: true },
  { id: "living", t0: T.s8a, t1: T.s8b, split: false },
  { id: "review", t0: T.s8b, t1: T.s8c, split: false },
  { id: "premier", t0: T.s8c, t1: T.end, split: false },
];
export function shotAt(f: number) {
  const t = f / FPS;
  const i = SHOTS.findIndex((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  const s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  return { ...s, i: i < 0 ? SHOTS.length - 1 : i, lt: t - s.t0, d: s.t1 - s.t0 };
}

// ── the mouth: a level per frame from the loudness of the take, on twos, one frame ahead of the sound; closed whenever the character is not speaking
const ROUND = /^(w|tw|o|you|for)|oo|ow/;
const ampAt = (l: Line, f: number) => l.amp[f - l.f0] ?? 0;
const lineAt = (c: Char, f: number, before = 0.1, after = 0.05) => linesOf(c).find((q) => f / FPS >= q.start - before && f / FPS <= Math.max(q.end, q.tend) + after); // up to the take's last sound, not its last word
export const speaking = (c: Char, f: number) => !!lineAt(c, f);

export function moodAt(c: Char, f: number): Mood {
  const t = f / FPS;
  switch (c) {
    case "gary": return "smug";
    case "marco": return "polite";
    case "agency": return "pitchy";
    case "wife": return "hiss";
    case "rick": case "deniseRobe": return "flat";
    default:
      if (t < T.cold) return "polite"; // content under the warm water
      if (t < LINE(1).end + 0.25) return "furious";
      if (t < LINE(8).start - 0.05) return "impatient";
      if (t < T.pick + 0.25) return "resigned";
      if (t < LINE(12).start - 0.15) return "neutral";
      if (t < LINE(14).start - 0.05) return "angry";
      return "defeated";
  }
}
export function mouthAt(c: Char, f: number): MouthShape {
  const l = lineAt(c, f);
  if (!l) return c === "rick" && gasp(f) ? "o" : "closed";
  const fi = f - (f % 2);
  const a = ampAt(l, fi + 1);
  if (a < 0.1) return "closed";
  const mood = moodAt(c, fi);
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (mood !== "angry" && mood !== "furious" && mood !== "hiss" && w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  let s: MouthShape = a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
  if ((mood === "angry" || mood === "furious") && s === "small") s = "mid";
  if (mood === "smug" && s === "wide") s = "mid";
  if (mood === "defeated" || mood === "resigned") s = a >= 0.62 ? "mid" : "small";
  if (mood === "flat" && s === "wide") s = "mid";
  return s;
}
// Rick gasps when the flush goes off in his pocket
function gasp(f: number): boolean {
  const t = f / FPS;
  return t >= T.flush + 0.05 && t < T.flush + 0.5;
}

// ── the head: tilts a little and dips on every syllable, alternating sides, each move eased over 6 frames; it settles after the line
const TILT: Record<Char, number> = { denise: 2.4, gary: 1.5, marco: 1.6, agency: 2.2, rick: 1.2, wife: 1.2, deniseRobe: 1.5 }; // degrees
const BOB: Record<Char, number> = { denise: 3, gary: 3.5, marco: 3, agency: 3.5, rick: 2.5, wife: 2.5, deniseRobe: 3 };
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
function talkMove(c: Char, f: number): { tilt: number; bob: number } {
  const l = linesOf(c).find((q) => f / FPS >= q.start - 0.2 && f / FPS <= q.end + 0.6);
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
// the listener: a slight tilt each time somebody else finishes a line (in the same scene); Denise straightens when the phone is picked up
const PARTNERS: Partial<Record<Char, Char[]>> = { denise: ["gary"], gary: ["denise"] };
function listenTilt(c: Char, f: number): number {
  const others = PARTNERS[c];
  if (!others) return 0;
  const knots: { f: number; v: number }[] = LINES.filter((q) => q.char && others.includes(q.char) && q.n >= 9).map((q, i) => ({ f: Math.round((q.end + 0.35) * FPS), v: (i % 2 === 0 ? 1 : -1) * 1.1 }));
  if (c === "denise") knots.unshift({ f: Math.round((T.pick + 0.25) * FPS), v: 1.3 });
  const done = knots.filter((k) => k.f <= f);
  if (!done.length) return 0;
  const j = done.length - 1, prev = j ? done[j - 1].v : 0;
  return prev + (done[j].v - prev) * ease((f - done[j].f) / 10);
}
const talkWeight = (c: Char, t: number) => Math.max(0, ...linesOf(c).map((q) => ease((t - (q.start - 0.25)) / 0.2) * (1 - ease((t - (q.end + 0.1)) / 0.3))));

// ── blinks: every 2.5-4.5 s, 3 frames (half, shut, half), at hashed times
const SEEDS: Record<Char, number> = { denise: 3, gary: 8, marco: 11, agency: 14, rick: 5, wife: 17, deniseRobe: 2 };
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out;
}
export const BLINKS: Record<Char, number[]> = Object.fromEntries((Object.keys(SEEDS) as Char[]).map((c) => [c, blinkStarts(SEEDS[c])])) as Record<Char, number[]>;
const blinkK = (c: Char, f: number) => { for (const s of BLINKS[c]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; } return 0; };

// ── Denise's face by beat: eyes shut under the warm shower, wide at the cold hit, brows by mood; the others have a fixed look (the lids are heavy for Gary)
function denBeat(f: number) {
  const t = f / FPS;
  const furious = t < LINE(1).end + 0.25;
  const impatient = !furious && t < LINE(8).start - 0.05;
  const resigned = t >= LINE(8).start - 0.05 && t < T.pick + 0.25;
  const hopeful = t >= T.pick + 0.25 && t < LINE(11).start - 0.05;
  const shock = ease((t - (LINE(11).start - 0.05)) / 0.15) * (1 - ease((t - (LINE(11).end + 0.2)) / 0.25));
  const angry = ease((t - (LINE(12).start - 0.15)) / 0.2) * (1 - ease((t - (LINE(14).start - 0.05)) / 0.45));
  const defeated = ease((t - (LINE(14).start - 0.05)) / 0.45);
  let angryK = angry + (furious ? 1 : 0) * 1 + (impatient ? 0.35 : 0);
  if (furious) angryK = ease((t - T.cold) / 0.1);
  let sadK = defeated + (resigned ? 0.75 : 0) + (hopeful ? 0.45 : 0) * (1 - shock);
  const lid = (furious ? 0 : impatient ? 0.16 : resigned ? 0.24 : 0) + 0.4 * defeated;
  const lift = shock * 1 + (hopeful ? 0.3 : 0) + (furious ? 0.2 : 0);
  return { angry: Math.min(1, angryK), sad: Math.min(1, sadK), lift, shock, lid: Math.min(0.5, lid) };
}
const BASE_LID: Partial<Record<Char, number>> = { marco: 0.12, agency: 0.28, wife: 0.12, rick: 0.08, deniseRobe: 0.3 };
function baseLid(c: Char, f: number): number {
  const t = f / FPS;
  if (c === "gary") { const a = LINE(13); return 0.45 + 0.07 * ease((t - (a.start - 0.3)) / 0.3) * (1 - ease((t - (a.end + 0.3)) / 0.5)); }
  if (c === "denise") {
    if (t < T.cold) return 1; // eyes shut under the warm shower
    return Math.max(denBeat(f).lid + 0.18 * phoneU(f), 1 - ease((t - T.cold) / 0.1));
  }
  return BASE_LID[c] ?? 0;
}
export function lidAt(c: Char, f: number): number {
  const b = baseLid(c, f);
  return Math.max(b, b + (1 - b) * blinkK(c, f));
}

// ── gaze: where the pupils look, -1..1 of their travel (x right, y down)
export function gazeAt(c: Char, f: number): [number, number] {
  const t = f / FPS;
  switch (c) {
    case "marco": { // looks down at the phone ringing on the table, glances at the agency guy for "Sorry. Go on."
      const down = ease((t - (T.marcoRing[0] + 0.1)) / 0.2) * (1 - ease((t - (LINE(6).start - 0.15)) / 0.15));
      const glance = ease((t - (LINE(6).start - 0.1)) / 0.15);
      return [glance * 0.8 - down * 0.2, down * 0.9];
    }
    case "agency": return [-0.7 * ease((t - (T.s4 + 0.2)) / 0.2), 0.05]; // at Marco, who is on his left
    case "rick": { // at the stage; down at the phone; sideways at his wife
      const down = ease((t - (T.flush + 0.06)) / 0.12) * (1 - ease((t - (T.kill + 0.35)) / 0.15));
      const side = ease((t - (T.kill + 0.5)) / 0.2);
      return [side * 0.9, down * 0.95];
    }
    case "wife": return [-0.9 * ease((t - (T.kill + 0.55)) / 0.2), 0.1 * ease((t - (T.kill + 0.55)) / 0.2)]; // at Rick
    case "deniseRobe": return [0.1, 0.35]; // tired, a little down
    case "denise": return [0, 0.9 * phoneU(f)];
    default: return [0, 0];
  }
}

// ── small extras per character: Denise's brows/pupils beats, Rick's panic, the wife's turn toward Rick, shivers
function shiverAmp(f: number): number {
  const t = f / FPS;
  return keys(t, [[T.s5 - 0.01, 0], [T.s5 + 0.25, 1], [T.s6 - 0.1, 1], [T.s6, 0]]);
}
export type Pose = { tilt: number; bob: number; breath: number; mouth: MouthShape; mood: Mood; lid: number; angry: number; sad: number; lift: number; asym: number; pupil: number; gaze: [number, number]; dx: number };
export function poseAt(c: Char, f: number): Pose {
  const t = f / FPS;
  const m = talkMove(c, f), w = talkWeight(c, t);
  const phase = { denise: 0.4, gary: 2.1, marco: 1.2, agency: 0.2, rick: 2.7, wife: 1.7, deniseRobe: 0.9 }[c];
  let tilt = listenTilt(c, f) * (1 - w) + m.tilt, lift = 0, sad = 0, angry = 0, asym = 0, pupil = 1, dx = 0;
  if (c === "denise") {
    const b = denBeat(f);
    angry = b.angry; sad = b.sad; lift = b.lift; pupil = 1 - 0.45 * b.shock;
    const A = shiverAmp(f);
    dx = A * (Math.floor(f / 2) % 2 ? 1 : -1) * 1.1;
  }
  if (c === "agency") { asym = 0.9; lift = 0.1; }
  if (c === "marco") { lift = 0.25 * ease((t - (LINE(6).start - 0.2)) / 0.2); sad = 0.3 * ease((t - (LINE(6).start - 0.2)) / 0.2); }
  if (c === "rick") {
    const panic = ease((t - (T.flush + 0.04)) / 0.1) * (1 - ease((t - (T.kill + 0.4)) / 0.2));
    lift = 0.9 * panic; pupil = 1 - 0.5 * panic; sad = 0.5 * ease((t - (T.kill + 0.4)) / 0.3);
  }
  if (c === "wife") {
    const turn = ease((t - (T.kill + 0.55)) / 0.2);
    tilt += -4 * turn; angry = 1;
  }
  return { tilt, bob: m.bob, breath: 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + phase), mouth: mouthAt(c, f), mood: moodAt(c, f), lid: lidAt(c, f), angry, sad, lift, asym, pupil, gaze: gazeAt(c, f), dx };
}

// ── Denise's phone in the split screens: at the ear; lowered out of the bottom of her panel to hang up and dial (she looks down at it), raised
// again for the ringing; lowered when the Flow Bros call dies; in her hand at the ear again for Gary
export function phoneU(f: number): number {
  const t = f / FPS;
  return keys(t, [[0, 0], [T.hangup, 0], [T.hangup + 0.2, 1], [T.s4 + 0.38, 1], [T.s4 + 0.6, 0], [T.kill + 0.25, 0], [T.kill + 0.5, 1], [T.s7 - 0.01, 1], [T.s7, 0], [T.end, 0]]);
}
export function phoneAt(f: number): { dx: number; dy: number; rot: number } {
  const u = phoneU(f);
  return { dx: -60 * u, dy: -400 * u, rot: 14 * u };
}

// ── the camera of the call: one gentle push-in on Gary for "I picked up.", a small cut-in to Denise for "...Okay. Come."
export function zoomGary(f: number): number {
  const t = f / FPS, a = LINE(13), c = LINE(14);
  return 1 + 0.10 * ease((t - (a.start - 0.9)) / (a.end + 0.15 - (a.start - 0.9))) * (1 - ease((t - (c.start - 0.1)) / 0.7));
}
export function zoomDenise(f: number): number {
  const t = f / FPS, c = LINE(14);
  return 1 + 0.42 * ease((t - (c.start - 0.12)) / 0.18) * (1 - ease((t - (c.end + 0.2)) / 0.18));
}
export const garyHere = (f: number) => f >= Math.round(T.pick * FPS);
export const garySettle = (f: number) => 36 * (1 - ease((f - Math.round(T.pick * FPS)) / 5));

// ── shot 1: the shower. Streaks fall from the nozzle until the water stops dead; the steam goes; the icicle grows on the shower head
export const icicleLen = (f: number) => easeOut((f / FPS - (T.cold + 0.12)) / 1.0);

// ── Tony's phone in his back pocket: buzzes in bursts (a glow and a wiggle), stops when the call goes to voicemail
export function buzzAt(f: number): { glow: number; wig: number } {
  const t = f / FPS;
  for (const b of T.buzz) if (t >= b && t < b + 0.38) return { glow: Math.min(1, (t - b) * 20), wig: (Math.floor(f) % 2 ? 1 : -1) * (0.7 + 0.3 * hash(f)) };
  return { glow: 0, wig: 0 };
}

// ── Marco's phone on the table: lit and buzzing while it rings, flipped face down by his hand, a thunk
export function marcoPhoneAt(f: number): { lit: number; buzz: number; flip: number; hand: number } {
  const t = f / FPS;
  const lit = t >= T.marcoRing[0] && t < T.flipStart + 0.13 ? 1 : 0;
  let buzz = 0;
  for (const r of T.marcoRing) if (t >= r && t < r + 0.7) buzz = (Math.floor(f) % 2 ? 1 : -1) * (0.7 + 0.3 * hash(f + 9));
  const flip = ease((t - (T.flipStart + 0.05)) / 0.2); // 0 face up .. 1 face down
  const hand = keys(t, [[T.flipStart - 0.35, 0], [T.flipStart, 1], [T.thunkM + 0.05, 1], [T.thunkM + 0.4, 0]]);
  return { lit, buzz, flip, hand };
}

// ── shot 5: the crowd looks at Rick (a wave, the near ones first); Rick's phone rises, rings, is killed
export const crowdLook = (dist01: number, jitter: number, f: number) => ease((f / FPS - (T.flush + 0.07 + 0.2 * dist01 + 0.1 * jitter)) / 0.1);
export function rickPhoneAt(f: number): { up: number; buzz: number; lit: number } {
  const t = f / FPS;
  const up = keys(t, [[T.flush - 0.12, 0], [T.flush + 0.2, 1], [T.kill + 0.35, 1], [T.kill + 0.7, 0]]);
  const ringing = t >= T.flush && t < T.kill;
  return { up, buzz: ringing ? (Math.floor(f) % 2 ? 1 : -1) * (0.7 + 0.3 * hash(f + 3)) : 0, lit: t < T.kill ? 1 : 0 };
}

// ── shots 2 and 6: the phone list. u = seconds into the shot.
export const listTap = (u: number) => u >= T.aquaTap - T.s2 && u < T.aquaTap - T.s2 + 0.2;
export function scrollY(f: number): number {
  const t = f / FPS;
  return keys(t, [[T.scrollA, 0], [T.scrollB, 1]]);
}

// ── shot 8: the review. Five stars are tapped one by one, the text is typed with the words of take 16, the button is tapped
export const REVIEW = "He picked up.";
export const STAR_TAPS = [0, 1, 2, 3, 4].map((i) => T.stars + i * 0.11);
export const TYPE_TIMES: number[] = (() => {
  const w = LINE(16).words; // He / picked / up.
  const words = REVIEW.split(" ");
  const out: number[] = [];
  words.forEach((word, k) => {
    const a = w[k].t - 0.02, b = Math.max(w[k].e, a + 0.1 * word.length) ;
    for (let i = 0; i < word.length; i++) out.push(a + ((b - a) * i) / Math.max(1, word.length));
    if (k < words.length - 1) out.push(b); // the space
  });
  return out;
})();
export const POST_TAP = LINE(16).end + 0.42;

// ── shot 8c: the phone on the coffee table (painted props in public/sp/fx-*, src/nv3-scenes.tsx PremierTable). Her fingers get under the phone's right edge at T.flipHand and
// lift it; it turns over about its long axis in TURN seconds (its width is cos(pi u)), is bigger and casts a longer, softer shadow while it is in the air, and lands face down at
// T.thunkP, the frame of the thunk. On landing it squashes (wider, flatter) and rebounds on a damped spring; then the hand lets go and goes back out of the frame.
export const TURN = 0.3;
export const PREMIER = { cx: 492, cy: 760, k: 0.84, w: 554 * 0.84, h: 1221 * 0.84 }; // where the phone lies (frame px, y down) and the size it is shown at
export function premierAt(f: number) {
  const t = f / FPS, t0 = T.flipHand, tc = T.thunkP;
  const x = clamp01((t - t0) / TURN);
  const u = lerp(ease(x), x, 0.45); // 0 face up .. 1 face down; the turn is still moving when it lands
  const air = x > 0 && x < 1 ? Math.pow(Math.sin(Math.PI * x), 0.8) : 0;
  const a = t - tc;
  const squash = a >= 0 ? 1 - spring(a, 0.28, 40) : 0; // 1 at the landing, then a rebound below 0 (a stretch), then rest in about 0.4 s
  const ringing = (t >= T.s8c + 0.06 && t < T.s8c + 0.86) || (t >= T.s8c + 0.9 && t < T.s8c + 1.3);
  // the fingers: out of the frame, in under the phone's right edge (hx = 1 is the edge, 0 the middle of the phone), with it while it turns, out again after the landing
  let hx: number;
  if (t < t0) hx = lerp(2.9, 1.0, ease((t - (t0 - 0.5)) / 0.5));
  else if (u < 0.5) hx = Math.cos(Math.PI * u);
  else hx = lerp(0.0, 2.9, ease(a / 0.2)); // the hand goes straight back out; by the time the card comes it is gone
  return { u, air, front: u < 0.5, sx: Math.cos(Math.PI * u), squash, lit: u < 0.5, buzz: ringing && t < t0 ? (Math.floor(f) % 2 ? 1 : -1) * 3 : 0, hx, tilt: 5 * Math.sin(Math.PI * u) };
}

// ── captions: one plain line at a time, the current speaker's words only; split at sentence ends, pauses and ~22 characters; a bleep shows as f***ing
export type Cap = { who: string; text: string; t0: number; t1: number };
const say = (w: Word) => (w.bleep ? w.d.replace(/^(.)(.*?)(ing)?([.,!?]*)$/i, (_m, a, _mid, ing, p) => a + "***" + (ing ?? "") + p) : w.d);
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  for (const l of LINES) {
    let cur: Word[] = [];
    const flush = () => {
      if (!cur.length) return;
      caps.push({ who: l.who, text: cur.map(say).join(" "), t0: cur[0].t - 0.04, t1: cur[cur.length - 1].e + 0.25 });
      cur = [];
    };
    l.words.forEach((w, i) => {
      if (cur.length && [...cur, w].map(say).join(" ").length > 22) flush();
      cur.push(w);
      const nxt = l.words[i + 1];
      if (/[.?!]$/.test(w.d) || (nxt && nxt.t - w.e > 0.3)) flush();
    });
    flush();
  }
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const sh = SHOTS.find((x) => c.t0 >= x.t0 - 1e-6 && c.t0 < x.t1 - 1e-6); if (sh && c.t1 > sh.t1) c.t1 = sh.t1; }); // a caption never runs over a cut
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);

// ── sound cues for the mix (scripts/nv3-cues.mts): name, time, db or vol, optional length and fade
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  const add = (name: string, at: number, db = 0, o: { len?: number; fade?: number; from?: number } = {}) => c.push({ name, at, db, ...o });
  add("sting-a", 0.0, -4);
  add("shower", 0.0, -3, { from: 0.25, len: T.cold, fade: 0.02 }); // the water stops dead
  add("ice", T.cold + 0.1, -6, { len: 1.3, fade: 0.25 });
  add("tap", T.aquaTap, -4);
  [T.aquaCall + 0.05, T.aquaCall + 2.05].forEach((r) => add("ringback", r, -5)); // AquaPro rings
  T.buzz.forEach((b) => add("buzz", b, -7, { len: 0.38, fade: 0.06 }));
  add("pickup", LINE(4).start - 0.07, -12); // the voicemail answers
  add("tap", T.hangup + 0.12, -5);
  add("tap", T.dialTap, -4);
  [T.ringbackB, T.ringbackB + 2.0].forEach((r) => add("ringback", r, -6)); // Premier rings: in her ear and on Marco's table
  T.marcoRing.forEach((r, i) => add("ring", r, -7 - i * 2, { len: 0.7, fade: 0.1 }));
  add("flip", T.flipStart + 0.1, -7);
  add("thud", T.thunkM, -3);
  add("ringback", T.ringbackC, -5, { len: 0.3, fade: 0.05 }); // Flow Bros: a moment of ringing, then the flush in the gym
  add("flush", T.flush, -4, { len: T.kill - T.flush, fade: 0.05 });
  add("tap", T.kill, -6);
  for (let t = T.scrollA + 0.05; t < T.scrollB; t += 0.075 + 0.02 * (t - T.scrollA)) add("tick", t, -13);
  add("tap", T.gTap, -4);
  add("ringback", T.ringbackD, -6, { len: T.pick - T.ringbackD, fade: 0.03 });
  add("pickup", T.pick, -6);
  add("engine", LINE(15).end + 0.05, -9, { len: 0.9, fade: 0.3 });
  add("drive", T.s8a + 0.25, -7, { len: 1.6, fade: 0.4 });
  STAR_TAPS.forEach((t, i) => add("tap", t, -5 - (4 - i) * 0.3));
  TYPE_TIMES.forEach((t) => add("tap", t, -12));
  add("tap", POST_TAP, -4);
  add("ring", T.s8c + 0.06, -6, { len: 0.8, fade: 0.1 });
  add("buzz", T.s8c + 0.9, -9, { len: 0.4, fade: 0.06 });
  add("flip", onPeak("flip", T.flipHand + TURN / 2), -7); // the whoosh peaks as the phone is edge-on
  add("thud", onPeak("thud", T.thunkP), -3); // the thunk peaks on the frame the phone lands
  add("sting-b", T.card, -3);
  return c.sort((a, b) => a.at - b.at);
}

// ── the stills: one key frame per shot, chosen away from blinks
export const KEY_FRAMES: { label: string; f: number }[] = [
  { label: "1 bath: the icicle, mid-shout", f: 50 },
  { label: "2 list", f: Math.round(3.6 * FPS) },
  { label: "3 tony", f: Math.round(6.2 * FPS) },
  { label: "4 office", f: Math.round(13.0 * FPS) },
  { label: "5 crowd", f: Math.round(18.0 * FPS) },
  { label: "6 scroll", f: Math.round(22.0 * FPS) },
  { label: "7 van", f: Math.round((LINE(11).words[0].t + 0.3) * FPS) },
  { label: "8 living", f: Math.round(38.9 * FPS) },
  { label: "9 review", f: Math.round(40.9 * FPS) },
  { label: "10 premier", f: Math.round(43.0 * FPS) },
];
