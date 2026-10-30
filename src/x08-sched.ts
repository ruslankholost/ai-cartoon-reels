// The timeline and the acting of x08 "Just Let Me Pay" (src/X08.tsx, docs/x08-just-let-me-pay.md, "Script v4 and build spec v2"). Pure data and arithmetic, the shape of src/lips8-sched.ts: every number is a function of the frame, of the nine voice takes
// in public/x08/timings.json and of the mouth loudness in src/amp-x08.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the gaps of
// episodes/x08.jsonc carry the silent beats): the cuts and the voices are fixed, every other moment hangs on the frame the build spec names (every sound's measured peak sits on the picture's hit, src/sfx-peaks.json).
// What this episode is: Ross (a puppet of his own: src/x08-rig.json, scripts/x08-prep.py) fights a checkout in the night, a small navy ghost on his shoulder (drawn in code, src/x08-shared.tsx) and the phone's screens drawn in code
// (src/x08-ui.tsx). The shot list is the spec's: 22 shots, 31.0 s; the reel opens on his thumb going for CHECKOUT and ends on it (shots 1 and 21-22 are one composition), and loops into shot 1.
import timings from "../public/x08/timings.json" with { type: "json" };
import amps from "./amp-x08.json" with { type: "json" };
import rig from "./x08-rig.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lidEdge } from "./pen-eyes.ts";
import { pupilAt } from "./sp-eyes.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/lips8-sched.ts): take n of public/x08/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Peak = { f: number; a: number; sign: 1 | -1 };
export type Line = { n: number; who: string; file: string; ofs: number; text: string; words: Word[]; first: number; start: number; end: number; tend: number; amp: number[]; f0: number; peaks: Peak[]; voiced: [number, number][] };
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
export const LINES: Line[] = TK.takes.map((t) => {
  const ofs = P(t.n), amp = AMP[t.file].amp;
  const words = t.words.map((w) => ({ ...w, t: ofs + w.t, e: ofs + w.e }));
  const i0 = amp.findIndex((a) => a >= 0.1);
  const base = { n: t.n, who: t.character, file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
  const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: (j % 2 === 0 ? 1 : -1) as 1 | -1 }));
  return { ...base, peaks };
});
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;

// ── the cuts and the named moments, the spec's (docs/x08-just-let-me-pay.md, "Script v4 and build spec v2"), every one on a frame: `F(n)` is frame n (a half frame of the spec is written as the frame it rounds up to, so that no float
// decides it). The nine voice lines are fixed (speech 0.10-1.70, 3.30-4.795, 5.90-7.77, 8.20-9.875, 10.35-11.79, 14.70-18.255, 20.70-22.205, 23.65-24.97, 28.75-30.795); v1's picture moved 1.45 s later from the slaps on (the new
// opening) and 4.75 s later from the scream on (the password, the captcha and the first beats got longer)
const F = (n: number) => n / FPS;
const S = {
  buy: 0, slaps: F(52), peel: F(95), password: F(146), socks: F(245), captcha: F(297), corks: F(381), kettle: F(399), last: F(417), scream: F(440), screamClose: F(502), robot: F(554),
  tick: F(581), shrug: F(617), soldOut: F(683), red: F(707), launch: F(758), stars: F(791), morning: F(816), notify: F(846), stare: F(876), buyAgain: F(918),
};
export const T_END = F(930);
export const CUTS = S; // the cuts by shot id (seconds): the scenes time their own beats from them
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "buy", "slaps", "peel", "password", "socks", "captcha", "corks", "kettle", "last", "scream", "screamClose", // 1-11
  "robot", "tick", "shrug", "soldOut", "red", "launch", "stars", "morning", "notify", "stare", "buyAgain", // 12-22
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
const START: Record<ShotId, number> = {
  buy: S.buy, slaps: S.slaps, peel: S.peel, password: S.password, socks: S.socks, captcha: S.captcha, corks: S.corks, kettle: S.kettle, last: S.last, scream: S.scream, screamClose: S.screamClose, robot: S.robot,
  tick: S.tick, shrug: S.shrug, soldOut: S.soldOut, red: S.red, launch: S.launch, stars: S.stars, morning: S.morning, notify: S.notify, stare: S.stare, buyAgain: S.buyAgain,
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

// the named moments inside the shots
export const TAP1 = F(47);                                                           // the thumb slams CHECKOUT (shot 1): on the end of "checkout" (speech to 1.54)
export const SLAP_T = [53, 62, 71, 80].map(F);                                       // the four windows land on Ross's face (a whack each): 1.77, 2.07, 2.37, 2.67
export const SLAP_FLY = [0.17, 0.15, 0.15, 0.15];                                    // how long each window is in the air (s); the first one leaves the phone in shot 1, on the tap
export const RIP_T = [96, 101, 106, 110].map(F);                                     // he rips the four windows off his face (shot 3), the top one first: "Just let me pay!"
export const PEEL_T = RIP_T[0];
export const KEY_T = [146, 149, 151, 154, 156, 159, 161, 164, 166, 169].map(F);      // ten keystrokes, from the first frame of the password (shot 4)
export const RULE_T = [149, 156, 164, 173].map(F);                                   // the first three rules turn green as he types; the fourth, red and bigger, pops in (5.77)
export const WEAK_T = F(236);                                                        // "Too weak" and the buzzer
export const TAPS_T = [347, 349, 351, 354, 356, 359, 361, 364, 366].map(F);          // the nine taps on the captcha's faces, 11.57-12.20
export const WRONG_T = F(371);                                                       // "Wrong. No humans found." and the buzzer
export const CORK_T = [384, 389].map(F);                                             // the left plug, then the right one, shoot out
export const KETTLE_T = F(399);                                                      // the steam starts whistling
export const DING_T = F(419);                                                        // "Last step!" pops in
export const HUMAN2_T = F(533);                                                      // the scream's second "HUMAN!" (the shake)
export const ROBOT_T = F(555);                                                       // "Too aggressive. Are you a robot?"
export const GHOST_TICK_T = F(605), GREEN_T = F(606), CHIME_T = F(608);              // the ghost taps the box, the tick turns green, the chime
export const SHRUG_T = F(668);                                                       // the ghost shrugs (just after "alive!")
export const THUD_T = F(684);                                                        // "Sorry! Out of stock"
export const RED_T0 = F(732), RED_T1 = F(756);                                       // the red rises from his chin to the top of his head (24.40-25.20)
export const KETTLE2_T = F(726);                                                     // the whistle comes back as he says "Of course it is."
export const LAUNCH_T = F(759), CRASH_T = F(772);                                    // the column of steam, the ceiling
export const STAR_T = [795, 799, 803, 806, 810].map(F);                              // the ghost taps the five stars, 26.50-27.00
export const BUZZ_T = F(848);                                                        // the phone buzzes in the morning
export const TAP2_T = F(921);                                                        // the loop's tap: the thumb slams CHECKOUT again (30.70)

// ── layout shared by the scenes: Ross on the couch, in plate px (src/x08-rig.json scenes.living); RS = plate px per rig px, which makes the couch three heads wide and the standing Ross (arms up) about 1.9 m in a 2.5 m room
export const RS = 0.46;
export const ROSS_U = 397, ROSS_V = 917; // his neck pivot on the plate
export const HEAD_LEVEL = 4.9;           // degrees: the master's head is painted tilted this much (the right eye lower); +4.9 levels it (three.js turns counter-clockwise for positive angles)

// ── the camera of a shot: the zoom factor about the shot's focus (src/x08-shared.tsx shotX). Pulses on the slaps (4 % each, 1.3 % of it stays), a slow push in the holds, a step on the tap
function slapPunch(f: number): number {
  const t = f / FPS;
  let z = 1;
  SLAP_T.forEach((ts) => { if (t >= ts - 1e-6) z += 0.013 + 0.027 * Math.exp(-(t - ts) / 0.09); });
  return z;
}
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS;
  switch (s.id) {
    case "buy": return 1 + 0.04 * s.u + 0.06 * (t >= TAP1 ? Math.exp(-(t - TAP1) / 0.06) : 0);
    case "buyAgain": return 1.22 * (1 + 0.06 * (t >= TAP2_T ? Math.exp(-(t - TAP2_T) / 0.06) : 0)); // the cut-in on the button: a punch-in, then the pulse of the tap
    case "slaps": return slapPunch(f);
    case "peel": return slapPunch(f - 3) - 0.052 * ease((t - PEEL_T) / 0.5) + 0.04 * s.u;
    case "socks": return 1 + 0.07 * s.u;
    case "scream": return 1 + 0.08 * ease(s.u);
    case "screamClose": return 1 + 0.03 * s.u;
    case "red": return 1 + 0.16 * ease(s.u);
    case "morning": return 1 + 0.025 * s.u;
    case "stare": return 1 + 0.03 * s.u;
    case "launch": return 1;
    default: return 1 + 0.02 * s.u;
  }
};
/** the camera's shake, frame px: the fourth window, the captcha's error, the scream's "HUMAN", the crash; decaying, on every frame */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 95): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, SLAP_T[3], 24, 0.1), shakeOf(t, WRONG_T, 16, 0.09), shakeOf(t, HUMAN2_T, 14, 0.1), shakeOf(t, CRASH_T, 34, 0.17, 70), shakeOf(t, LAUNCH_T, 10, 0.1, 80), shakeOf(t, WEAK_T, 7, 0.08), shakeOf(t, THUD_T, 9, 0.08), shakeOf(t, TAP1, 6, 0.05), shakeOf(t, TAP2_T, 6, 0.05)];
  return [parts.reduce((s, p) => s + p[0], 0), parts.reduce((s, p) => s + p[1], 0)];
}

// ── the voices: the mouth, on twos, one frame ahead of the sound (src/lips8-sched.ts mouthAt); closed whenever he is not speaking
const lineAt = (f: number, before = 0.1, after = 0.05) => LINES.find((q) => f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (f: number) => !!lineAt(f);
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const SMALL = new Set([1, 4, 8, 9]); // the lines said small: smug, through his teeth, dead calm, a whisper (the mouth is never wider than mid)
export function mouthAt(f: number): MouthShape {
  const l = lineAt(f);
  if (!l) return "closed";
  const fi = twos(f), a = l.amp[fi + 1 - l.f0] ?? 0;
  if (a < 0.1) return "closed";
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (SMALL.has(l.n)) return a >= 0.45 ? "mid" : "small";
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
const LINE_MOOD: Record<number, Mood> = { 1: "smug", 2: "angry", 3: "angry", 4: "hiss", 5: "flat", 6: "furious", 7: "angry", 8: "flat", 9: "tight" };
export function moodAt(f: number): Mood {
  const l = lineAt(f), id = shotId(f);
  if (l) return LINE_MOOD[l.n];
  switch (id) {
    case "buy": return "smug";
    case "peel": return "angry";
    case "socks": return "hiss";
    case "corks": case "kettle": return "angry";
    case "scream": case "screamClose": case "launch": return "furious";
    case "red": return f / FPS < RED_T0 + 0.3 ? "flat" : "furious";
    case "stare": case "buyAgain": return "tight";
    default: return "flat";
  }
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames; it settles after the line (src/lips8-sched.ts talkMove)
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [1.0, 1.6], 2: [2.6, 5], 4: [1.4, 2.5], 6: [3.4, 7], 7: [2.8, 5.5], 8: [0.7, 1.0], 9: [0.8, 1.4] }; // tilt (degrees) and dip (puppet px) of the head on a loud syllable, by line
function talkMove(f: number): { tilt: number; bob: number } {
  const l = LINES.find((q) => f / FPS >= q.first - 0.2 && f / FPS <= q.end + 0.6);
  if (!l) return { tilt: 0, bob: 0 };
  const [TILT, BOB] = TALK[l.n] ?? [1.4, 2.5];
  const done = l.peaks.filter((p) => p.f <= f);
  const target = (j: number) => (j < 0 ? 0 : done[j].sign * TILT * (0.55 + 0.45 * done[j].a));
  const j = done.length - 1;
  let tilt = j < 0 ? 0 : target(j - 1) + (target(j) - target(j - 1)) * ease((f - done[j].f) / 6);
  tilt *= 1 - ease((f - l.end * FPS) / 12);
  let bob = 0;
  for (const p of done.slice(-2)) bob -= BOB * (0.5 + 0.5 * p.a) * pulse(f - p.f);
  return { tilt, bob: bob * (1 - ease((f - l.end * FPS) / 8)) };
}

// ── blinks: every 2.5-4.5 s, 3 frames, at hashed times; none that touches a cut and none in the shots where he is wide-eyed
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3].some((f) => CUT_F.has(f)));
}
const BLINKS = { ross: blinkStarts(7), ghost: blinkStarts(13) };
const NO_BLINK: ShotId[] = ["slaps", "peel", "corks", "kettle", "scream", "screamClose", "red", "launch", "stare", "buyAgain"];
const blinkOf = (who: "ross" | "ghost", f: number) => { for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; } return 0; };
export const rossBlink = (f: number) => (NO_BLINK.includes(shotId(f)) ? 0 : blinkOf("ross", f));
export const ghostBlink = (f: number) => blinkOf("ghost", f);

// ── what Ross's face is doing, by shot. `red`: how red his face is (0 as painted .. 1 furious); `redLine`: the rising edge of the red (0 chin .. 1 top of the head, only in shot 16, else 1)
export function redAt(f: number): number {
  const t = f / FPS, id = shotId(f);
  switch (id) {
    case "corks": return 0.3 * ease((t - CORK_T[1]) / 0.3);
    case "kettle": return 0.3 + 0.2 * s_u(f);
    case "scream": case "screamClose": return 1;
    case "robot": case "tick": return 1 - 0.5 * ease((t - ROBOT_T) / 1.2);
    case "shrug": return 0.5 - 0.5 * ease((t - S.shrug) / 1.2);
    case "soldOut": return 0;
    case "red": return 1;
    case "launch": return 1;
    default: return 0;
  }
}
const s_u = (f: number) => shotAt(f).u;
export const redLine = (f: number) => (shotId(f) === "red" ? ease((f / FPS - RED_T0) / (RED_T1 - RED_T0)) : 1);
/** how big the vein on his forehead is (0 none .. 1): it appears in shot 5, throbs on twos while he is angry, stays through the scream */
export function veinAt(f: number): number {
  const t = f / FPS, id = shotId(f);
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  if (id === "socks") return clamp01((t - (S.socks + 0.3)) / 0.35) * 0.85 * (t > S.socks + 0.65 ? throb : 1);
  if (id === "corks" || id === "kettle") return 0.95 * throb;
  if (id === "scream" || id === "screamClose") return throb;
  if (id === "red") return clamp01((t - (RED_T0 - 0.1)) / 0.4) * throb; // it comes back with the red
  if (id === "launch") return 1;
  return 0;
}
/** the steam out of his ears: 0 none .. 1 thin jets (shot 8) .. 2 thick (the scream) .. 3 huge (shot 16) */
export function steamLevel(f: number): number {
  const t = f / FPS, id = shotId(f);
  switch (id) {
    case "kettle": return 1 + 0.9 * ease((t - KETTLE_T) / 0.6);
    case "last": return 1.9;
    case "scream": return 2;
    case "screamClose": return 2.2;
    case "red": return 3.1 * ease((t - KETTLE2_T) / 1.4); // none while he is calm, thin as he says "it is", thick with the red
    case "launch": return 3.2;
    default: return 0;
  }
}
/** which head picture: both plugs (before the pops), only the left one gone, both gone */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** the soot on his face and the smoke from his hair (the morning) */
export const sootOn = (f: number) => inShot(f, "morning", "notify", "stare", "buyAgain");

export function gazeOf(f: number): [number, number] {
  const id = shotId(f), t = f / FPS;
  switch (id) {
    case "buy": return [0, 0.7];
    case "slaps": return t < SLAP_T[0] ? [0, 0.75] : [0, -0.2];
    case "peel": return [0.1, 0];
    case "socks": return [0, 0.05];
    case "corks": return t < CORK_T[0] ? [0, 0.1] : [0, -0.1];
    case "scream": return [0, -0.85];
    case "screamClose": return [0, 0.05];
    case "tick": return [-0.2, 0.55];
    case "shrug": return [-0.85, 0.2];
    case "red": return [0, 0.1];
    case "stare": case "buyAgain": return [0, 0.7];
    case "morning": return [0.1, 0.6];
    default: return [0, 0.1];
  }
}
export function lidOf(f: number): number {
  const id = shotId(f);
  let b = 0.1;
  switch (id) {
    case "buy": b = 0.25; break;
    case "slaps": b = 0.02; break;
    case "socks": b = 0.3; break;
    case "corks": b = 0; break;
    case "kettle": b = 0.05; break;
    case "scream": case "screamClose": b = 0; break;
    case "tick": b = 0.15; break;
    case "shrug": b = 0.28; break;
    case "red": b = 0.22; break;
    case "morning": b = 0.4; break;
    case "stare": case "buyAgain": b = 0.28; break;
    default: b = 0.1;
  }
  const k = rossBlink(f);
  return Math.max(b, b + (1 - b) * k);
}
/** his twitching eye (the lid of his left eye of the picture jumps down and back on twos): shots peel, stare, and a little in socks */
export function twitchAt(f: number): number {
  const id = shotId(f), t = f / FPS;
  if (id === "peel" && t >= RIP_T[3] + 0.2) { const k = twos(f) % 12; return k === 0 || k === 4 ? 0.55 : k === 2 ? 0.3 : 0; }
  if ((id === "stare" || id === "buyAgain") && t >= S.stare + 0.3) { const k = twos(f) % 14; return k === 2 || k === 6 ? 0.55 : k === 4 ? 0.3 : 0; }
  if (id === "socks" && t >= S.socks + 0.1 && t < S.socks + 1.0) { const k = twos(f) % 16; return k === 0 ? 0.45 : k === 2 ? 0.25 : 0; }
  return 0;
}

// ── no pupil hides under a lid: the eyes look lower, or the lid opens (src/lips8-sched.ts fitEyes, for this rig)
type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
const R8 = rig as unknown as { ross: { eyes: Eye[]; pupils: number[][] }; rossPeel: { eyes: Eye[]; pupils: number[][] } };
export function fitEyes(which: "ross" | "rossPeel", lid: number, gaze: [number, number], pupil: number): { lid: number; gaze: [number, number] } {
  const R = R8[which];
  if (lid <= 0 || lid >= 0.9) return { lid, gaze };
  const clear = (l: number, g: [number, number]) => R.eyes.every((e, i) => { const q = R.pupils[i]; const [x, y] = pupilAt(e, [q[0], q[1]], q[2], g, 6); return y - lidEdge(e, l, x) - q[2] * pupil >= 2; });
  for (let l = lid; l > 0; l -= 0.02) for (let gy = gaze[1]; gy <= 1.0001; gy += 0.02) if (clear(l, [gaze[0], gy])) return { lid: l, gaze: [gaze[0], Math.min(1, gy)] };
  return { lid: 0, gaze };
}

/** Ross's pose of this frame: the body picture, the head's tilt and dip, the face (src/sp-puppet.tsx PuppetPose) */
export type RPose = { body: "sit" | "up" | "fly" | "body"; tilt: number; bob: number; breath: number; mouth: MouthShape; mood: Mood; lid: number; angry: number; sad: number; lift: number; asym: number; pupil: number; gaze: [number, number]; dx: number; hdx: number; mdy: number };
export function bodyOf(f: number): "sit" | "up" | "fly" {
  const id = shotId(f);
  if (id === "scream" || id === "screamClose") return "up";
  if (id === "launch" && f / FPS >= LAUNCH_T) return "fly";
  return "sit";
}
export function rossPose(f: number): RPose {
  const t = f / FPS, ft = twos(f) / FPS, id = shotId(f);
  const m = talkMove(f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0.1, sad = 0, lift = 0, asym = 0, dx = 0, hdx = 0, pupil = 1, jump = 0;
  const breath = 1.4 * Math.sin((Math.PI * 2 * t) / 3.4 + 0.7);
  const shake = (a: number) => (Math.floor(ft * 15) % 2 ? 1 : -1) * a;
  switch (id) {
    case "buy": { angry = 0.05; lift = 0.15; asym = 0.3; break; } // pleased with himself: a brow up, the lids half down, the smirk
    case "slaps": {
      SLAP_T.forEach((ts) => { const a = t - ts; if (a >= 0 && a < 0.25) { bob += -12 * Math.exp(-a / 0.06); tilt += (ts === SLAP_T[3] ? 4 : 2) * Math.exp(-a / 0.08) * (ts === SLAP_T[1] ? -1 : 1); } });
      angry = 0.1; lift = 0.4; break;
    }
    case "peel": { angry = 0.55; lift = 0.2 * (t < RIP_T[3] + 0.2 ? 1 : 0); tilt = 0; bob = 0; break; }
    case "password": break;
    case "socks": { angry = 0.35 + 0.5 * ease((t - (S.socks + 0.25)) / 0.6); asym = 0.3 * ease((t - (S.socks + 0.25)) / 0.6); if (t > S.socks + 0.7) dx += shake(1.2); break; }
    case "corks": {
      CORK_T.forEach((ts, i) => { const a = t - ts; if (a >= 0) { bob += -16 * Math.exp(-a / 0.07); tilt += (i ? -6 : 6) * Math.exp(-a / 0.1); } });
      angry = 0.5 + 0.4 * ease((t - CORK_T[1]) / 0.2); lift = 0.2; pupil = t >= CORK_T[0] ? 0.7 : 1; dx += t > CORK_T[1] ? shake(2) : 0; break;
    }
    case "kettle": { angry = 0.9; pupil = 0.75; dx += shake(1.5 + 1.5 * ease((t - KETTLE_T) / 0.9)); break; }
    case "scream": case "screamClose": { angry = 1; pupil = 0.8; dx += shake(id === "scream" ? 3 : 4.5); if (m.tilt) tilt += 0; break; }
    case "robot": case "tick": angry = 0.45; break;
    case "shrug": { angry = 0.6; asym = 0.5; break; }
    case "soldOut": break;
    case "red": { const k = ease((t - KETTLE2_T) / 1.0); angry = 0.2 + 0.8 * k; dx += t >= RED_T0 - 0.2 ? shake(0.5 + 3.5 * ease((t - RED_T0) / 1.0)) : 0; pupil = 1 - 0.15 * k; break; } // calm, then the red takes him
    case "launch": angry = 1; break;
    case "morning": { angry = 0.15; sad = 0.3; tilt += -1.5; break; }
    case "stare": case "buyAgain": { angry = 0.4 + 0.3 * ease((t - S.stare) / 0.6); asym = 0.4; dx += t > S.stare + 0.4 ? shake(0.8) : 0; break; }
    default: break;
  }
  const lid0 = lidOf(f), gaze0 = gazeOf(f);
  const shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  return { body: bodyOf(f), tilt, bob, breath: breath + jump, mouth: mouthAt(f), mood: moodAt(f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx, mdy: 0 };
}
/** the peel puppet (shot 3: its own head, both hands on his cheeks): the same acting (it shouts line 2 with the mouth of its own head), none of the head's motion */
export function peelPose(f: number): RPose {
  const p = rossPose(f), t = f / FPS;
  const lid0 = 0.02, e = fitEyes("rossPeel", lid0, [0.1, 0], 1);
  return { ...p, body: "body", tilt: 0, bob: 0, lid: e.lid, gaze: e.gaze, angry: 0.55, lift: t < RIP_T[3] + 0.2 ? 0.35 : 0, dx: 0 };
}

// ── the pop-ups (shot 2): where window i is at frame f. `fly` 0..1 the flight from the phone, `land` the squash after it lands (a spring), `on` whether it is in the stack
export function windowAt(i: number, f: number): { on: boolean; fly: number; land: number; hit: boolean } {
  const t = f / FPS, ts = SLAP_T[i], d = SLAP_FLY[i];
  if (t < ts - d - 1e-6) return { on: false, fly: 0, land: 0, hit: false };
  const fly = clamp01((t - (ts - d)) / d);
  return { on: true, fly: fly * fly * (3 - 2 * fly) * 0.35 + fly * 0.65, land: squashAt(t, ts, 0.38, 42), hit: t >= ts - 1e-6 };
}
/** window i (0 the first, the bottom of the stack) comes off his face in shot 3: 0 on his face .. 1.9 (far out of the frame); the top one goes first, one rip every 5 frames (RIP_T) */
export const stackOff = (i: number, f: number) => 1.9 * ease((f / FPS - (RIP_T[3 - i] - 0.04)) / 0.3);

// ── the password screen (shot 4): the rules are on the screen from the first frame (grey); he types, and the first three turn green on a keystroke; the fourth pops in red
export const passRules = (f: number) => RULE_T.map((t0) => popP(f / FPS, t0));
export const typedKeys = (f: number) => KEY_T.filter((t) => f / FPS >= t - 1e-6).length;
export const weakK = (f: number) => popP(f / FPS, WEAK_T, 0.5, 40);
// ── the captcha (shot 6): how many tiles are ticked, how far the last tick has popped, the error banner
export const tilesTicked = (f: number) => TAPS_T.filter((t) => f / FPS >= t - 1e-6).length;
export const tilePop = (i: number, f: number) => (f / FPS >= TAPS_T[i] ? popP(f / FPS, TAPS_T[i], 0.5, 44) : 0);
export const wrongK = (f: number) => popP(f / FPS, WRONG_T, 0.5, 40);

// ── the rest of the pictures' motion: shot pop-ins, the ghost's tick, the stars, the notification
export const popIn = (f: number, t0: number) => popP(f / FPS, t0 - 1 / FPS, 0.5, 40);
export const tickK = (f: number) => popP(f / FPS, GREEN_T, 0.45, 38);
export const starOn = (i: number, f: number) => ({ on: f / FPS >= STAR_T[i] - 1e-6, p: popP(f / FPS, STAR_T[i], 0.4, 40) });
export const notifyK = (f: number) => ease((f / FPS - (BUZZ_T - 0.1)) / 0.25);
export const buzzHop = (f: number) => { const a = f / FPS - BUZZ_T; return a < 0 || a > 0.5 ? 0 : 20 * Math.exp(-a / 0.1) * Math.abs(Math.cos(a * 38)); };
/** the thumb over CHECKOUT: `rise` how far it is up into the frame (0 below the frame .. 1 over the button), `down` how far down it is (0 lifted .. 1 on the glass), `sq` the squash of the tap. Shot 1: it rises on "Aaand...", hovers, slams on the end of
 * "checkout"; shot 21: it trembles over the button; shot 22: the cut-in, the slam */
export function thumbAt(f: number): { rise: number; down: number; sq: number } {
  const t = f / FPS, id = shotId(f);
  if (id === "buy") {
    const slam = ease((t - (TAP1 - 0.1)) / 0.1), wob = ease((t - 0.95) / 0.15) * 0.05 * (1 + Math.sin(twos(f) * 2.1));
    return { rise: ease((t - 0.2) / 0.75), down: Math.max(slam, wob), sq: squashAt(t, TAP1, 0.4, 44) };
  }
  if (id === "buyAgain") return { rise: 1, down: ease((t - (TAP2_T - 0.1)) / 0.1), sq: squashAt(t, TAP2_T, 0.4, 44) };
  if (id === "stare") return { rise: 1, down: 0.18 + 0.08 * Math.sin(twos(f) * 2.3) * ease((t - S.stare) / 0.5), sq: 0 };
  return { rise: 1, down: 0, sq: 0 };
}

// ── the ghost: its place on Ross's shoulder, its pose, and what it does in each shot. Units: ghost px (100 wide, 125 tall); `at` puppet px from Ross's neck pivot (y up) unless the shot floats it on its own
export type GhostPose = { dx: number; dy: number; sx: number; sy: number; rot: number; gaze: [number, number]; lid: number; armL: number; armR: number; lenL: number; lenR: number; cover: number; wave: number; peek: number };
const G0: GhostPose = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, gaze: [0, 0], lid: 0, armL: 18, armR: 18, lenL: 20, lenR: 20, cover: 0, wave: 0, peek: 0 };
export function ghostPose(f: number): GhostPose {
  const t = f / FPS, id = shotId(f);
  const g: GhostPose = { ...G0, wave: t * 5.5 };
  g.dy += 2.2 * Math.sin((Math.PI * 2 * t) / 2.6);
  g.lid = ghostBlink(f);
  switch (id) {
    case "slaps": {
      let fl = 0;
      SLAP_T.forEach((ts, i) => { const a = t - ts; if (a >= 0) fl = Math.max(fl, Math.exp(-a / 0.1) * (i === 3 ? 1.35 : 1)); });
      g.sx = 1 - 0.14 * fl; g.sy = 1 + 0.2 * fl; g.dx = -16 * fl; g.dy += 10 * fl; g.armL = 18 + 110 * fl; g.armR = 18 + 110 * fl; g.rot = -8 * fl; g.gaze = [0.3, 0.2]; g.lid = fl > 0.2 ? 0 : g.lid;
      break;
    }
    case "buy": g.gaze = [0.6, 0.1]; g.lid = Math.max(g.lid, 0.1); break;
    case "peel": g.gaze = [0.3, 0]; g.sy = 1.04; break;
    case "socks": g.gaze = [0.6, 0.1]; break;
    case "corks": {
      const a = t - CORK_T[0];
      if (a >= 0) { const d = ease(a / 0.07); g.dy += -64 * d; g.dx += 8 * d; g.lid = 0; g.peek = d > 0.25 ? 1 : 0; }
      g.gaze = [0.3, a >= 0 ? -0.8 : 0.4];
      break;
    }
    case "kettle": { const d = ease((t - KETTLE_T) / 0.15), up = ease((t - KETTLE_T) / 0.12); g.sy = 1 - 0.14 * d; g.sx = 1 + 0.06 * d; g.dy += -64 * (1 - up) - 8 * d; g.peek = up < 0.9 ? 1 : 0; g.cover = d; g.lid = 0.1 * d; g.gaze = [0.3, -0.7]; break; }
    case "scream": case "screamClose": { g.sy = 0.86; g.sx = 1.05; g.dy += -8; g.cover = 1; g.lid = 0.12; g.gaze = [0.4, -0.5]; break; }
    case "shrug": { // he shouts "He's not even alive!", then, on 22.27, the ghost shrugs and the picture cuts on it (no release)
      const a = ease((t - SHRUG_T) / 0.12);
      g.armL = 18 + 112 * a; g.armR = 18 + 112 * a; g.lenL = 20 + 24 * a; g.lenR = 20 + 24 * a; g.sy = 1 - 0.14 * a; g.sx = 1 + 0.1 * a; g.dx += -6 * a; g.dy += 46 * a; g.lid = 0.55 * a; g.rot = 8 * a; g.gaze = [0.7, 0.1]; // it rises clear of his jaw, so that the shrug is seen
      break;
    }
    case "red": { g.cover = 1; g.sy = 0.86; g.sx = 1.05; g.dy += -8; g.lid = 0.1; g.gaze = [0.3, -0.6]; break; }
    case "morning": case "notify": case "stare": case "buyAgain": g.gaze = [0.5, 0.2]; g.lid = Math.max(g.lid, 0.35); break;
    default: break;
  }
  return g;
}

// ── the floating ghost (shots 13 and 18): the path from the shoulder to the phone and its taps (frame px, set by the scene); u 0 at the shoulder, 1 at the box
export const ghostFloat = (f: number) => ease((f / FPS - (GHOST_TICK_T - 0.75)) / 0.7);
export const ghostPoke = (f: number) => { const a = f / FPS - GHOST_TICK_T; return a < -0.12 ? 0 : a < 0 ? (a + 0.12) / 0.12 : Math.max(0, 1 - a / 0.14); };
export const starPoke = (f: number) => { const t = f / FPS; let k = 0; STAR_T.forEach((ts) => { const a = t - ts; if (a >= -0.1 && a < 0) k = Math.max(k, (a + 0.1) / 0.1); else if (a >= 0) k = Math.max(k, Math.max(0, 1 - a / 0.1)); }); return k; };

// ── the room's lighting: the night, the morning (0 night .. 1 morning)
export const dayAt = (f: number) => (f / FPS >= S.morning ? 1 : 0);

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "tap1", t: TAP1, sfx: "tap", db: -2 },
  ...SLAP_T.map((t, i): Hit => ({ id: `whack${i + 1}`, t, sfx: "whack", db: i === 3 ? 0 : -2 })),
  { id: "rip1", t: RIP_T[0], sfx: "peel", db: -3 },
  ...RIP_T.slice(1).map((t, i): Hit => ({ id: `rip${i + 2}`, t, sfx: "peel", db: -5, from: 0.25, len: 0.3, fade: 0.08 })), // the next three: only the tear of the clip (0.62 s, peak at 0.385 s), so that four of them do not pile up
  ...KEY_T.map((t, i): Hit => ({ id: `key${i + 1}`, t, sfx: "tick", db: -9 })),
  ...RULE_T.map((t, i): Hit => ({ id: `rule${i + 1}`, t, sfx: "pop", db: i === 3 ? -3 : -6 })),
  { id: "weak", t: WEAK_T, sfx: "buzzer", db: -6 },
  ...TAPS_T.map((t, i): Hit => ({ id: `tile${i + 1}`, t, sfx: "tick", db: -5 })),
  { id: "wrong", t: WRONG_T, sfx: "buzzer", db: -3 },
  { id: "cork1", t: CORK_T[0], sfx: "cork", db: -1 },
  { id: "cork2", t: CORK_T[1], sfx: "cork", db: -1 },
  { id: "kettle1", t: KETTLE_T, sfx: "kettle", db: -3, start: true, len: 2.6, fade: 0.3 },
  { id: "ding", t: DING_T, sfx: "ding", db: -4 },
  { id: "robot", t: ROBOT_T, sfx: "robot", db: -2 },
  { id: "ghostTick", t: GHOST_TICK_T, sfx: "tick", db: -2 },
  { id: "chime", t: CHIME_T, sfx: "chime", db: -6, start: true },
  { id: "thud", t: THUD_T, sfx: "thud", db: -2 },
  { id: "kettle2", t: KETTLE2_T, sfx: "kettle", db: -3, start: true, len: 1.5, fade: 0.1 }, // from his calm "Of course it is." to the crash
  { id: "launch", t: LAUNCH_T, sfx: "launch", db: -1 },
  { id: "crash", t: CRASH_T, sfx: "crash", db: 0 },
  ...STAR_T.map((t, i): Hit => ({ id: `star${i + 1}`, t, sfx: "pop", db: -5 })),
  { id: "birds", t: S.morning, sfx: "birds", db: -9, start: true, len: 3.8, fade: 0.3 },
  { id: "buzz", t: BUZZ_T, sfx: "buzz", db: -3 },
  { id: "tap2", t: TAP2_T, sfx: "tap", db: -2 },
];

// ── sound cues for the mix (scripts/x08-cues.mts): no bed, the room is quiet
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => c.push({ name: h.sfx, at: h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(h.from ? { from: h.from } : {}) }));
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/lips8-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut); a bleep shows as F***ING. A word that a cut runs through (line 9 starts
// over the notification and goes on over his face) is captioned twice: the part up to the cut, and after the cut the sentence whole again
export type Cap = { who: string; n: number; text: string; t0: number; t1: number; w0: number; w1: number };
const say = (w: Word) => (w.bleep ? w.d.replace(/^(\w)\w{3}(\w*)/, "$1***$2") : w.d.replace(/—/g, "-"));
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
    chunks.forEach((ws) => {
      const t0 = (ws === chunks[0] ? Math.min(l.first, ws[0].t) : ws[0].t) - 0.04, t1 = stretchEnd(l, ws[ws.length - 1].e) + 0.25, x = ws.findIndex((w) => cuts.some((c) => c > w.t + 0.04 && c < w.e - 0.04));
      if (x < 0) { caps.push({ who: l.who, n: l.n, text: ws.map(say).join(" "), t0, t1, w0: ws[0].t, w1: ws[ws.length - 1].e }); return; }
      const c = cuts.find((q) => q > ws[x].t + 0.04 && q < ws[x].e - 0.04)!;
      caps.push({ who: l.who, n: l.n, text: ws.slice(0, x + 1).map(say).join(" "), t0, t1: c, w0: ws[0].t, w1: ws[x].e });
      caps.push({ who: l.who, n: l.n, text: ws.slice(x).map(say).join(" "), t0: c, t1, w0: c, w1: ws[ws.length - 1].e });
    });
  }
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (s) { c.t0 = Math.max(c.t0, s.t0); c.t1 = Math.min(c.t1, s.t1); } });
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
/** where the captions sit (frame y px): one band, except over the composition of shots 1, 21 and 22 (his head above, the phone big in front): its cart page has nothing written under the button, so there the band goes into the glass
 * below the button (still above the bottom 400 px). On every insert the screens keep their words above y 1245, so the one band is clear of them */
export const CAP_BAND: [number, number] = [1295, 1455];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { buy: [1345, 1505], stare: [1345, 1505], buyAgain: [1345, 1505] };
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;

// ── the stills: one or more per shot
const mid = (a: number, b: number) => (a + b) / 2;
const kf = (label: string, t: number) => ({ label, f: Math.min(FRAMES - 1, Math.round(t * FPS)) });
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 buy: first frame", 0), kf("1 buy: thumb up", 0.9), kf("1 buy: the tap", TAP1 + 0.03), kf("1 buy: window out", 1.7),
  kf("2 slaps: window 1", SLAP_T[0] + 0.03), kf("2 slaps: window 2", SLAP_T[1] + 0.03), kf("2 slaps: window 3", SLAP_T[2] + 0.03), kf("2 slaps: window 4", SLAP_T[3] + 0.03), kf("2 slaps: buried", 3.1),
  kf("3 peel: first rip", RIP_T[0] + 0.1), kf("3 peel: last rip", RIP_T[3] + 0.1), kf("3 peel: shout", 4.2), kf("3 peel: twitch", 4.6),
  kf("4 password: start", S.password + 0.03), kf("4 password: green", 5.5), kf("4 password: grandma", 6.5), kf("4 password: weak", WEAK_T + 0.15),
  kf("5 socks: vein", S.socks + 0.5), kf("5 socks: socks", 9.1),
  kf("6 captcha: grid", 10.4), kf("6 captcha: thumb", 11.4), kf("6 captcha: ticks", 11.9), kf("6 captcha: wrong", 12.6),
  kf("7 corks: pop 1", CORK_T[0] + 0.05), kf("7 corks: pop 2", CORK_T[1] + 0.08), kf("8 kettle: jets", mid(S.kettle, S.last)), kf("9 last", 14.3),
  kf("10 scream: AAAAH", 15.2), kf("10 scream: HUMAN", 16.2), kf("11 screamClose: HUMAN", 17.9),
  kf("12 robot", 19.0), kf("13 tick: float", 19.8), kf("13 tick: tap", GHOST_TICK_T + 0.05), kf("14 shrug: shout", 21.4), kf("14 shrug", SHRUG_T + 0.2), kf("15 soldOut", 23.2),
  kf("16 red: calm", 24.1), kf("16 red: half", 24.8), kf("16 red: top", 25.2), kf("17 launch: lift", 25.45), kf("17 launch: smash", CRASH_T + 0.1), kf("17 launch: rain", 26.0),
  kf("18 stars: two", 26.7), kf("18 stars: five", 27.1), kf("19 morning", 27.7), kf("20 notify", 28.7), kf("21 stare", 29.6), kf("21 stare: checkout", 30.4), kf("22 buyAgain", TAP2_T + 0.1),
];
