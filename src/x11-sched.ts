// The timeline and the acting of x11 "Are You Open?" (src/X11.tsx, docs/x11-are-you-open.md, the build spec). Pure data and arithmetic, the shape of src/x10-sched.ts: every number is a function of the frame, of the sixteen voice
// takes in public/x11/timings.json and of the mouth loudness in src/amp-x11.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the
// gaps of episodes/x11.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: its times are older than the voices (line 16 ends at 27.48 s, the table read is 27.78 s), so the shots keep the spec's order and their relation to the words and move to the voices; the reel is
// 29.1 s. Shots 2 and 3 are one picture of the spec cut in two (the smack on the first frame of "closed!", then the shout in a closer frame), the slide (13) is cut in two (the face on the window, the face sliding), the bath (14) is cut in
// two (the tub, his face with the cucumbers) and the spec's shot 17 (the corks) and 18 ("FINE!!") get their own frames: 27 shots, none over 2.4 s.
import timings from "../public/x11/timings.json" with { type: "json" };
import amps from "./amp-x11.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x10-sched.ts): take n of public/x11/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "ROSS" | "CHUCK";
export type Peak = { f: number; a: number; sign: 1 | -1 };
export type Line = { n: number; who: Who; file: string; ofs: number; text: string; words: Word[]; first: number; start: number; end: number; tend: number; amp: number[]; f0: number; peaks: Peak[]; voiced: [number, number][] };
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
  const base = { n: t.n, who: t.character as Who, file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
  const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: (j % 2 === 0 ? 1 : -1) as 1 | -1 }));
  return { ...base, peaks };
});
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;

// ── the cuts: frame numbers. The 27 shots
const F = (n: number) => n / FPS;
const S = {
  sign: F(0), smack: F(34), shout: F(50), twitch: F(84), blind: F(118), car: F(135), carsmack: F(162), vein: F(190), wait: F(238), floor: F(264), bed: F(286), bedsmack: F(309), bulge: F(333), slide1: F(386), slide2: F(418),
  bath: F(452), cukes: F(491), rip: F(514), chuck: F(530), corks: F(559), fine: F(582), lights: F(613), open: F(634), case: F(692), door: F(740), five: F(775), nextday: F(830),
};
export const T_END = F(873);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "sign", "smack", "shout", "twitch", "blind", "car", "carsmack", "vein", "wait", "floor", "bed", "bedsmack", "bulge", "slide1", "slide2", "bath", "cukes", "rip", "chuck", "corks", "fine", "lights", "open", "case", "door", "five", "nextday",
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
export const CUTS: Record<ShotId, number> = S;
export const SHOTS: { id: ShotId; t0: number; t1: number }[] = SHOT_IDS.map((id, i) => ({ id, t0: S[id], t1: i + 1 < SHOT_IDS.length ? S[SHOT_IDS[i + 1]] : T_END }));
export function shotAt(f: number) {
  const t = f / FPS;
  const i = SHOTS.findIndex((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6);
  const s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  return { ...s, i: i < 0 ? SHOTS.length - 1 : i, lt: t - s.t0, d: s.t1 - s.t0, u: clamp01((t - s.t0) / (s.t1 - s.t0)) };
}
export const shotId = (f: number) => shotAt(f).id;
export const inShot = (f: number, ...ids: ShotId[]) => ids.includes(shotId(f));

// ── the named moments (seconds, every one on a frame). The words they hang on, from the voices: L1 Aaand... 0.20-1.00 closed! 1.12-1.65; L2 ARE 1.70 YOU 1.94 OPEN?! 2.26-2.79; L3 We're 2.93 CLOSED! 3.28-3.95; L4 Are 5.46 you 5.68
// open? 5.84-6.24; L5 I'm 6.50 in 6.82 my 7.14 CAR! 7.38-7.94; L6 I'll 8.16 wait. 8.32-8.75; L7 Are 10.35 you 10.48 open? 10.64-11.01; L8 This 11.14 is 11.38 the 11.54 second 11.70 FLOOR! 12.10-12.77; L9 ...So, 13.20-13.93 no? 13.93-14.35;
// L10 Finally. 15.38-16.17 Nobody. 16.52-17.13; L11 ...How 17.79 about 18.05 now? 18.25-18.56; L12 FINE!! 19.47-20.16; L13 WE'RE 21.14 OPEN!! 21.37-22.17 What 22.17 can I get 22.75 you?! 22.75-23.01; L14 ...Just 23.60 looking. 23.88-24.51;
// L15 What 24.76 time 25.00 you 25.16 close? 25.48-25.77; L16 ...Five. 26.60-27.48
export const FLIP_T = [F(3), F(3)];                      // shots 1: the sign is edge-on (the flip's peak); [1] = the same moment, the second flip is FLIP2_T
export const TICK_T = F(9);                              // shot 1: the wall clock clicks to 5:00
export const SMACK_T = [F(34), F(162), F(309)];          // shots 2, 7, 12: Chuck's face on the glass
export const TWITCH_T = F(86);                           // shot 4: his eye
export const JAB_T = [F(98), F(104)];                    // shot 4: the finger on the sign
export const BLIND_T = F(121);                           // shot 5: the blind slams down (it falls over the three frames before, from the top of the glass)
export const DRUM_T = [F(136), F(146), F(149), F(154), F(160)];   // shot 6 and the start of 7: his fingers on the wheel (the taps of the drum clip: 0.04, 0.35, 0.46, 0.62 s from its start at 4.5 s, then the second play's tap at 5.35 s)
export const VEIN_T = F(192);                            // shot 8: the vein
export const GREEN_T = F(264);                           // shot 10: the light turns green, he floors it
export const BULGE_T = [F(309), F(334)];                 // shots 12, 13: the eyes snap open and bulge; they bulge more on the line
export const SLIDE_T = F(419), THUD_T = F(448);          // shot 15: the face slides down the glass; it drops out of frame
export const RIP_T = F(518);                             // shot 18: the curtain is torn aside
export const CORK_T = [F(560), F(565)], KETTLE_T = F(567);   // shot 20: POP POP, the kettle
export const CLUNK_T = [F(614), F(620), F(626)];         // shot 22: the lights come on, row by row
export const FLIP2_T = F(641);                           // shot 23: the sign is edge-on (it reads OPEN on "OPEN!!")
export const BELL_T = [F(693), F(826)];                  // shots 24 and 26: the door's bell
export const WALLET_T = [F(704), F(719)];                // shot 24: the wallet leaves his hand, it is in his pocket
export const WISP_T = F(780);                            // shot 26: the wisp of steam out of one ear
export const TICK2_T = F(834);                           // shot 27: the clock clicks to 4:59

// ── Ross's face: the plugs, the vein, the twitching eye, the bulging eyes
/** which head picture: both plugs, only the left one gone (between the two pops), both gone; the plugs are back the next day (the reel loops: shot 1 has them in) */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] || t >= S.nextday ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** the vein on his forehead (0 none .. 1, a little over on the pop): it pops on VEIN_T with a spring and throbs; it goes with the car (the floor-it keeps it) */
export function veinAt(f: number): number {
  const t = f / FPS;
  if (t < VEIN_T || !inShot(f, "vein", "wait", "floor")) return 0;
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  return Math.min(1.15, popP(t, VEIN_T, 0.45, 40)) * (t > VEIN_T + 0.4 ? throb : 1);
}
/** his twitching eye (the lid of his right eye of the picture jumps down and back on twos): at "We're CLOSED!" (shot 4) */
export function twitchAt(f: number): number {
  const t = f / FPS;
  if (t < TWITCH_T || !inShot(f, "twitch")) return 0;
  const k = twos(f) % 12;
  return k === 0 || k === 4 ? 0.55 : k === 2 ? 0.3 : 0;
}
/** the eyes bulging out of his head (0 none .. 1 big .. 1.3): they snap open on the smack (shot 12) and swell on "This is the second FLOOR!" (13) */
export function bulgeAt(f: number): number {
  const t = f / FPS;
  if (!inShot(f, "bedsmack", "bulge")) return 0;
  const a = popP(t, BULGE_T[0], 0.3, 34), b = t >= BULGE_T[1] ? popP(t, BULGE_T[1], 0.35, 30) : 0;
  return Math.min(1.4, 0.8 * a + 0.5 * b);
}
/** the steam out of his ear holes: 0 none .. 2.8 thick. The kettle (shot 20) and the steam in his face (21), then nothing; shot 26 is the wisp (wispAt) */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t < KETTLE_T || t > S.lights) return 0;
  return t < 19.7 ? 1.4 + 1.4 * ease((t - KETTLE_T) / 0.4) : 2.8;
}
/** one thin thread of steam from one ear in the dead-eyed shot (0 none .. 1) */
export const wispAt = (f: number): number => { const t = f / FPS; return t < WISP_T || !inShot(f, "five") ? 0 : ease((t - WISP_T) / 0.3); };

// ── the camera of a shot: the zoom factor about the shot's focus (the shot's own framing, a slow push in the holds, a pulse on the hits)
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "sign": return 1 + 0.045 * s.u;
    case "smack": return 1 + 0.02 * s.u + pulse(SMACK_T[0], 0.07, 0.09);
    case "shout": return 1.45 + 0.04 * s.u;
    case "twitch": return 1.2 + 0.05 * s.u + pulse(TWITCH_T, 0.02) + pulse(JAB_T[0], 0.015, 0.05) + pulse(JAB_T[1], 0.015, 0.05);
    case "blind": return 1 + pulse(BLIND_T, 0.06, 0.08);
    case "car": return 1 + 0.03 * s.u;
    case "carsmack": return 1.25 + 0.02 * s.u + pulse(SMACK_T[1], 0.06, 0.09);
    case "vein": return 1.7 + 0.04 * s.u + pulse(VEIN_T, 0.05, 0.08);
    case "wait": return 1.45 + 0.03 * s.u;
    case "floor": return 1 + pulse(GREEN_T, 0.1, 0.12);
    case "bed": return 1 + 0.03 * s.u;
    case "bedsmack": return 1.3 + 0.02 * s.u + pulse(SMACK_T[2], 0.06, 0.09);
    case "bulge": return 1.75 + 0.06 * s.u + pulse(BULGE_T[1], 0.04, 0.07);
    case "slide1": return 1.9 + 0.04 * s.u;
    case "slide2": return 1.6 + pulse(THUD_T, 0.07, 0.07);
    case "bath": return 1 + 0.03 * s.u;
    case "cukes": return 1.75 + 0.05 * s.u;
    case "rip": return 1 + pulse(RIP_T, 0.05, 0.08);
    case "chuck": return 1 + 0.03 * s.u;
    case "corks": return 1.05 + pulse(CORK_T[0], 0.03) + pulse(CORK_T[1], 0.03);
    case "fine": return 2.0 + 0.05 * s.u;
    case "lights": return 1 + 0.03 * s.u + pulse(CLUNK_T[0], 0.02) + pulse(CLUNK_T[1], 0.02) + pulse(CLUNK_T[2], 0.025);
    case "open": return 1.1 + 0.03 * s.u;
    case "case": return 1 + 0.025 * s.u;
    case "door": return 1.35 + 0.03 * s.u;
    case "five": return 2.28 + 0.05 * s.u;                                       // pushed in so that the raised fist of the pajama body is out of the frame (its left edge is at x 1094 and going)
    case "nextday": return 1;
    default: return 1;
  }
};
/** the camera's shake, frame px: the smacks, the blind, the floor-it, the rip, the corks and the kettle, the thud; decaying, on every frame */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [...SMACK_T.map((t0) => shakeOf(t, t0, 16, 0.09)), shakeOf(t, BLIND_T, 18, 0.1), shakeOf(t, GREEN_T, 12, 0.35, 70), shakeOf(t, RIP_T, 9, 0.07), shakeOf(t, CORK_T[0], 8, 0.07), shakeOf(t, CORK_T[1], 8, 0.07), shakeOf(t, THUD_T, 14, 0.08), ...CLUNK_T.map((t0) => shakeOf(t, t0, 5, 0.06)), shakeOf(t, VEIN_T, 6, 0.06)];
  const kettle = t >= KETTLE_T && inShot(f, "corks", "fine") ? [3 * Math.sin(t * 190), 2 * Math.cos(t * 150)] : [0, 0];
  return [parts.reduce((s, p) => s + p[0], kettle[0]), parts.reduce((s, p) => s + p[1], kettle[1])];
}
/** a white flash on the smack (the glass flares) and on the blind's slam */
export const flashAt = (f: number): number => { const t = f / FPS; return Math.max(...[...SMACK_T, BLIND_T].map((t0) => (t >= t0 ? 0.32 * Math.exp(-(t - t0) / 0.03) : 0))); };

// ── the voices: the mouth, on twos, one frame ahead of the sound; closed whenever that character is not speaking
const lineOf = (who: Who, f: number, before = 0.1, after = 0.05) => LINES.find((q) => q.who === who && f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (who: Who, f: number) => !!lineOf(who, f);
export const speakingLine = (who: Who, f: number) => lineOf(who, f);
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const SMALL = new Set([6, 9, 10, 11, 14, 16]);  // said small: "I'll wait.", "...So, no?", "Finally. Nobody.", "...How about now?", "...Just looking." and "...Five." are quiet (the mouth is never wider than mid)
export function mouthAt(who: Who, f: number): MouthShape {
  const l = lineOf(who, f);
  if (!l) return "closed";
  const fi = twos(f), a = l.amp[fi + 1 - l.f0] ?? 0;
  if (a < 0.1) return "closed";
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (SMALL.has(l.n)) return a >= 0.45 ? "mid" : "small";
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
const LINE_MOOD: Record<number, Mood> = { 1: "pitchy", 2: "angry", 3: "angry", 4: "polite", 5: "furious", 6: "polite", 7: "polite", 8: "furious", 9: "flat", 10: "polite", 11: "polite", 12: "furious", 13: "tight", 14: "flat", 15: "polite", 16: "defeated" };
/** the mood of a character's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (l) return LINE_MOOD[l.n];
  if (who === "ROSS") {
    switch (id) {
      case "sign": return "pitchy";
      case "twitch": case "vein": case "bulge": case "fine": case "corks": return "furious";
      case "car": case "bath": case "cukes": case "rip": return "polite";
      case "carsmack": case "wait": case "floor": return "angry";
      case "open": return "tight";
      case "five": return "defeated";
      case "nextday": return "hiss";
      default: return "flat";
    }
  }
  return id === "chuck" || id === "slide1" || id === "slide2" ? "polite" : id === "smack" || id === "shout" || id === "blind" ? "impatient" : "flat";
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x10-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [3.0, 6], 3: [3.0, 6], 5: [3.4, 7], 8: [3.4, 7], 10: [0.8, 1.2], 12: [3.4, 7], 13: [3.4, 7], 16: [0.8, 1.2] };
export function talkMove(who: Who, f: number): { tilt: number; bob: number } {
  const l = LINES.find((q) => q.who === who && f / FPS >= q.first - 0.2 && f / FPS <= q.end + 0.6);
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

// ── blinks: every 2.5-4.5 s, 3 frames, at hashed times; none that touches a cut
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3].some((f) => CUT_F.has(f)));
}
export const BLINKS = { ross: blinkStarts(7), chuck: blinkStarts(17) };
export const blinkOf = (who: keyof typeof BLINKS, f: number) => { for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; } return 0; };

// ── what moves in the scenes, by the clock (the scenes draw it)
/** the sign on the door (shots 1, 4, 23, 27): its turn about its string, -1 .. 1 (the width goes with |cos|), and the word it shows: OPEN, then CLOSED after FLIP_T; OPEN again after FLIP2_T. Shot 27 shows OPEN (the next day) */
export function signAt(f: number): { turn: number; word: "OPEN" | "CLOSED" } {
  const t = f / FPS, id = shotId(f), d = 0.14;
  if (id === "sign") { const a = clamp01((t - (FLIP_T[0] - d / 2)) / d); return { turn: a, word: a < 0.5 ? "OPEN" : "CLOSED" }; }
  if (id === "twitch") return { turn: 1, word: "CLOSED" };
  if (id === "open") { const a = clamp01((t - (FLIP2_T - d / 2)) / d); return { turn: a, word: a < 0.5 ? "CLOSED" : "OPEN" }; }
  return { turn: 1, word: "OPEN" };   // the next day (27): open again
}
/** the sign's swing after the flip and after each jab (degrees about its string) */
export function swingAt(f: number): number {
  const t = f / FPS, id = shotId(f);
  const ring = (t0: number, k: number) => (t >= t0 ? k * Math.exp(-(t - t0) / 0.25) * Math.sin((t - t0) * 24) : 0);
  if (id === "sign") return ring(FLIP_T[0] + 0.07, 9);
  if (id === "twitch") return ring(JAB_T[0], 6) + ring(JAB_T[1], 6);
  if (id === "open") return ring(FLIP2_T + 0.07, 10);
  return 0;
}
/** the wall clock behind Ross (shot 1: 4:59 -> 5:00 on TICK_T; shot 4: 5:00; shot 23: 4:12; shot 27: 4:58 -> 4:59 on TICK2_T) as hour and minute */
export function wallClock(f: number): { hour: number; minute: number } {
  const t = f / FPS, id = shotId(f);
  if (id === "sign") return t >= TICK_T ? { hour: 5, minute: 0 } : { hour: 4, minute: 59 };
  if (id === "twitch") return { hour: 5, minute: 0 };
  if (id === "open" || id === "lights") return { hour: 4, minute: 12 };
  return t >= TICK2_T ? { hour: 4, minute: 59 } : { hour: 4, minute: 58 };
}
/** the light turned green (shot 10)? and the car's colours: 0 red .. 1 green */
export const greenAt = (f: number): number => clamp01(((f / FPS) - GREEN_T) / 0.12);
/** the street streaking past the rear window (shot 10): 0 standing .. 1 at speed, from the floor-it */
export const speedAt = (f: number): number => (f / FPS < GREEN_T || !inShot(f, "floor") ? 0 : ease(((f / FPS) - GREEN_T) / 0.3));
/** how many of the three light rows have come on (shot 22) */
export const lightsOn = (f: number): number => CLUNK_T.filter((t0) => f / FPS >= t0 - 1e-6).length;
/** the wallet's way from his hand to his pocket (shot 24): 0 in the hand .. 1 in the pocket */
export const walletAt = (f: number): number => clamp01(((f / FPS) - WALLET_T[0]) / (WALLET_T[1] - WALLET_T[0]));
/** the face on the glass: how squashed it is (1 flat on the pane, just hit .. 0 relaxed). popP-like decay from each smack */
export function smush(f: number, t0: number): number { const t = f / FPS; return t < t0 ? 0 : Math.exp(-(t - t0) / 0.09); }
/** the slide of the face down the glass (shot 15): 0 where it was .. 1 off the frame; it starts slowly and speeds up (a heavy face sliding) */
export const slideAt = (f: number): number => { const u = clamp01(((f / FPS) - SLIDE_T) / (THUD_T - SLIDE_T)); return u * u * (1.6 - 0.6 * u); };

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = a soft onset or a long bed, the clip starts on the frame; `from` = skip into the clip (s)
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "flip", t: FLIP_T[0], sfx: "flip", db: -3, from: 0.06 },   // the clip's peak is at 0.14 s: from 0.06, so that it lands on 0.10 s and the clip starts after 0
  { id: "tick", t: TICK_T, sfx: "tick", db: -1 },
  { id: "smack1", t: SMACK_T[0], sfx: "smack", db: -1 },
  { id: "jab1", t: JAB_T[0], sfx: "tap", db: -8 },
  { id: "jab2", t: JAB_T[1], sfx: "tap", db: -8 },
  { id: "blind", t: BLIND_T, sfx: "blind", db: -5 },
  { id: "drum1", t: F(135), sfx: "drum", db: 3, start: true, len: 0.65, fade: 0.08 },
  { id: "drum2", t: F(153), sfx: "drum", db: 3, start: true, len: 0.28, fade: 0.06, from: 0.1 },
  { id: "smack2", t: SMACK_T[1], sfx: "smack", db: -1 },
  { id: "throb", t: VEIN_T, sfx: "throb", db: -4 },
  { id: "screech", t: GREEN_T, sfx: "screech", db: -2, start: true, len: 0.73, fade: 0.12 },
  { id: "kick", t: GREEN_T, sfx: "whoosh", db: -5 },
  { id: "snore", t: S.bed, sfx: "snore", db: -3, start: true, len: 0.75, fade: 0.1 },
  { id: "smack3", t: SMACK_T[2], sfx: "smack", db: -1 },
  { id: "boing", t: BULGE_T[0] + 0.03, sfx: "boing", db: -6 },
  { id: "squeak", t: SLIDE_T, sfx: "squeak", db: -6, start: true, len: 1.0, fade: 0.12 },
  { id: "thud", t: THUD_T, sfx: "thud", db: -2 },
  { id: "blub", t: S.bath, sfx: "blub", db: -6, start: true, len: 0.9, fade: 0.1 },
  { id: "blub2", t: S.cukes + 0.2, sfx: "blub", db: -9, start: true, len: 0.7, fade: 0.1 },
  { id: "rip", t: RIP_T, sfx: "curtain", db: -2 },
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -1 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -6, start: true, from: 0.5, len: 0.55, fade: 0.1 },
  { id: "boil", t: S.corks, sfx: "boil", db: -8, start: true, len: 1.8, fade: 0.25 },
  ...CLUNK_T.map((t, i): Hit => ({ id: `clunk${i + 1}`, t, sfx: "clunk", db: -2 - i, start: true })),
  { id: "flip2", t: FLIP2_T, sfx: "flip", db: -6 },
  { id: "bell1", t: BELL_T[0], sfx: "doorbell", db: -3 },
  { id: "bell2", t: BELL_T[1], sfx: "doorbell", db: -4 },
  { id: "tick2", t: TICK2_T, sfx: "tick", db: -2 },
];

// ── sound cues for the mix (scripts/x11-cues.mts): no bed, the room is quiet
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => c.push({ name: h.sfx, at: h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(h.from ? { from: h.from } : {}) }));
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x10-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through is captioned twice: the part up to the cut, and after the
// cut the sentence from that word on
export type Cap = { who: Who; n: number; text: string; t0: number; t1: number; w0: number; w1: number };
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
/** where the captions sit (frame y px): one band, out of the bottom 400 px, except where something is written there (the clocks, the sign: the scenes of the car and the bedroom set their own) */
export const CAP_BAND: [number, number] = [1295, 1455];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot
const kf = (label: string, t: number) => ({ label, f: Math.min(FRAMES - 1, Math.round(t * FPS)) });
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 sign: start", 0.0), kf("1 sign: flip", 0.1), kf("1 sign: closed", 0.5), kf("2 smack: hit", 1.14), kf("2 smack: settled", 1.5), kf("3 shout", 2.2), kf("4 twitch", 3.0), kf("4 jab", 3.5), kf("5 blind: falling", 3.97), kf("5 blind: hit", 4.04), kf("5 blind", 4.3),
  kf("6 car: red", 4.8), kf("7 carsmack", 5.5), kf("8 vein", 6.9), kf("9 wait", 8.4), kf("10 floor: green", 8.95), kf("10 floor: speed", 9.3), kf("11 bed", 9.9), kf("12 bedsmack", 10.4), kf("13 bulge", 11.8), kf("14 slide1", 13.4), kf("15 slide2: start", 14.2), kf("15 slide2: low", 14.7),
  kf("16 bath", 15.7), kf("17 cukes", 16.8), kf("18 rip: hit", 17.3), kf("18 rip", 17.5), kf("19 chuck", 18.1), kf("20 corks: pop", 18.7), kf("20 corks: boil", 19.1), kf("21 fine", 19.8), kf("22 lights: 1", 20.5), kf("22 lights: 3", 20.95),
  kf("23 open: before", 21.2), kf("23 open: flip", 21.6), kf("23 open: grin", 22.5), kf("24 case: bell", 23.2), kf("24 case: wallet", 23.7), kf("24 case: away", 24.3), kf("25 door", 25.2), kf("26 five", 26.9), kf("27 nextday", 28.4), kf("27 end", 29.05),
];
