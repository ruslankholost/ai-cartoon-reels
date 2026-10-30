// The timeline and the acting of x13 "Cheaper" (src/X13.tsx, docs/x13-cheaper.md, the build spec). Pure data and arithmetic, the shape of src/x12-sched.ts: every number is a function of the frame, of the twelve voice
// takes in public/x13/timings.json and of the mouth loudness in src/amp-x13.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the
// gaps of episodes/x13.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: its times are the voices' (line 12 ends at 24.81 s, the table read is 25.11 s), so only the two long ones are split: shot 4 is the snap (1.40-2.03, "FIVE") and the punch-in (2.03-3.80,
// "BUCKS?! For COFFEE?!", a second hard step on COFFEE), shot 9 is Chuck with the phone and the phone's screen. The shot of the price flipping to $4.00 (the spec's 5) starts three frames before the flip. 22 shots, none over 2.4 s,
// the same framing never twice in a row, a new picture at least every second in the first 3 s (cuts at 0, 0.47, 0.87, 1.40, 2.03).
import timings from "../public/x13/timings.json" with { type: "json" };
import amps from "./amp-x13.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x12-sched.ts): take n of public/x13/timings.json sits at tableRead.cues[n].at
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

// ── the cuts: frame numbers. The 22 shots. Speech on the reel's clock (first sound .. last word): 1 CHUCK 1.40-3.64 (FIVE 1.52, BUCKS?! 2.04-2.53, For 2.91, COFFEE?! 3.05-3.63), 2 ROSS 4.14-5.18 (...Four? 4.45), 3 CHUCK 5.43-7.00 (My 5.43 cousin 5.68
// sells 6.07 it 6.31 for 6.47 two. 6.63), 4 ROSS 7.40-8.55 (One-fifty! 7.37-8.55), 5 CHUCK 8.90-11.53 (I'll 8.96 post 9.31 about 9.52 you. 9.79 | I 10.28 got 10.35 forty 10.66 followers. 10.91-11.53), 6 ROSS 12.03-12.82 (FREE!! 12.10),
// 7 CHUCK 13.62-14.83 (What 13.64 else do I get? 14.82), 8 ROSS 15.33-16.58 (Five 15.64 bucks? 16.06-16.58), 9 CHUCK 16.98-17.91 (...That's 17.02 it? 17.44-17.90), 10 ROSS 18.51-20.49 (TAKE 18.60 IT!! 18.96-19.13 | TAKE 19.53 IT 19.84 ALL!! 20.07-20.49),
// 11 ROSS 22.49-23.42 (TWELVE?! 22.52), 12 CHUCK 23.92-24.81 (...Thirteen. 24.05)
const F = (n: number) => n / FPS;
const S = {
  sip: F(0), spit: F(14), splat: F(26), snap: F(42), punch: F(61), flip: F(114), four: F(123), cousin: F(159), vein: F(215), phone: F(261), profile: F(306), free: F(351), sipSlow: F(393), bill: F(450), that: F(504), corks: F(543),
  drawer: F(579), sign: F(621), cup: F(642), spit2: F(660), thirteen: F(708), end: F(750),
};
export const T_END = F(768);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "sip", "spit", "splat", "snap", "punch", "flip", "four", "cousin", "vein", "phone", "profile", "free", "sipSlow", "bill", "that", "corks", "drawer", "sign", "cup", "spit2", "thirteen", "end",
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

// ── the named moments (seconds, every one on a frame)
/** the display: KA-CHING and the price that appears. The first one pops the display up; the rest flip its digits */
export const KACHING_T = [F(2), F(117), F(219), F(354), F(452), F(645), F(711)];
export const PRICES = ["$5.00", "$4.00", "$1.50", "FREE", "-$5.00", "$12.00", "$13.00"];
export const EYES_T = F(8);                              // shot 1: Chuck's eyes swivel to the display
export const SPIT_T = F(14), SPIT2_T = F(660);           // shots 2 and 20: PFFFT, the spray at the camera
export const SPLAT_T = F(26), SPLAT2_T = F(708);         // shots 3 and 21: the spray lands on Ross, then on Chuck
export const SNAP_T = F(43);                             // shot 4: Chuck's face snaps from calm to purple (the cut is frame 42)
export const STAB_T = F(61), COFFEE_T = F(91);           // shot 5: the finger stabs, the punch-in on BUCKS?!; the second step on COFFEE (the word starts at 3.05)
export const TWITCH_T = F(128);                          // shot 7: his eye starts to twitch
export const VEIN_T = F(216);                            // shot 9: the vein pops and throbs, the smile stretches wider
export const BULGE_T = F(352);                           // shot 12: the eyes bulge, the grin goes huge and clenched
export const SLURP_T = F(404);                           // shot 13: the cup tilts at Chuck's lips (the slurp's peak)
export const SIP_T = [F(397), F(402), F(408), F(414)];   // shot 13: the cup comes up (397-402), tilts at the lips, comes down (408-414)
export const BILL_T = F(452);                            // shot 14: the bill, both eyes twitching
export const CORK_T = [F(544), F(546)], KETTLE_T = F(548), DRAWER_T = F(552);   // shot 16: the plugs shoot out, the steam screams, the drawer is yanked out (coins fly)
export const COINS_T = F(566);                           // the coins land (the peak of the coins clip)
export const THUD_T = F(580), WHOOSH_T = F(594), FLOP_T = F(599);   // shot 17: the drawer hits his arms, the apron flies, the apron lands on it
export const SCRIBBLE_T = F(623);                        // shot 18: the strike and CHUCK'S
export const SNAP2_T = F(672);                           // shot 20: Ross's face snaps purple (the spray has thinned)
/** the frames at which a drop leaves a chin: one after another from `t0` to `t1`, the gap between two growing from p0 to p1 s (the coffee thins out) */
function dripTimes(t0: number, t1: number, p0: number, p1: number): number[] {
  const out: number[] = [];
  for (let t = t0; t < t1; t += p0 + (p1 - p0) * clamp01((t - t0) / (t1 - t0))) out.push(snap(t));
  return out;
}
/** the drops off Ross's chin from shot 3 to the corks (one every 0.22 s at first, one a second by the end), off Chuck's in shot 21; the drip clip's peak sits on the first two of each */
export const DRIPS_ROSS = dripTimes(F(33), S.drawer, 0.22, 1.0), CHUCK_DRIPS = dripTimes(F(716), T_END, 0.5, 0.9);
export const DRIP3_T = DRIPS_ROSS.filter((t) => t < S.snap).slice(0, 2), DRIP21_T = CHUCK_DRIPS.slice(0, 2);

// ── Ross: which head picture (plugs in, the left one gone, both gone), how wet he is, the twitching eyes
/** both plugs in (to the pops), only the right one gone (between the two flicks), both gone (to the end of the reel: he is plugless in the next-day shots; the loop starts with them in) */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** how much coffee is on Ross (0 none .. 1 just hit): the spray lands on SPLAT_T and thins out through the shots (the stains lighten, the runs and the drops from his chin get fewer) to a fifth by the bill; the next day he is dry */
export function rossWet(f: number): number {
  const t = f / FPS;
  if (t < SPLAT_T || t >= S.drawer) return 0;
  return 1 - 0.8 * clamp01((t - SPLAT_T) / (S.that - SPLAT_T));
}
/** how much coffee is on Chuck in shot 21 (0 .. 1) */
export const chuckWet = (f: number): number => (f / FPS >= SPLAT2_T ? 1 - 0.3 * clamp01((f / FPS - SPLAT2_T) / (T_END - SPLAT2_T)) : 0);
/** a twitching lid (fraction of the eye): his right eye from TWITCH_T in "...Four?", both eyes in "Five bucks?"; on twos, a little before each stressed beat */
export function twitchAt(f: number, eye: 0 | 1): number {
  const t = f / FPS, id = shotId(f);
  const both = id === "bill";
  if (!(both || (id === "four" && t >= TWITCH_T))) return 0;
  if (eye === 0 && !both) return 0;
  const k = (twos(f) + (eye === 0 ? 6 : 0)) % 18;
  const a = both ? 0.7 : 0.6;
  return k === 0 ? a : k === 2 ? a * 0.45 : 0;   // a quick flick of the lid every 0.6 s, the other eye a third of a cycle behind
}
/** the vein on his forehead (0 none .. 1.15 popped, throbbing while he talks): from VEIN_T, kept through the shots of the blow-up until the corks */
export function veinAt(f: number): number {
  const t = f / FPS;
  if (t < VEIN_T || t >= S.drawer) return 0;
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  return Math.min(1.15, popP(t, VEIN_T, 0.45, 40)) * (t > VEIN_T + 0.4 ? throb : 1);
}
/** the bulge of his eyes (0 none .. 1.1): the eyes of the picture grow into round white balls with tiny pupils, in "FREE!!" (from BULGE_T) and again on the corks */
export function bulgeAt(f: number): number {
  const t = f / FPS, id = shotId(f);
  if (id === "free") return Math.min(1.1, popP(t, BULGE_T, 0.5, 38));
  if (id === "corks") return Math.min(1.1, popP(t, CORK_T[0], 0.5, 38));
  return 0;
}
/** the steam out of his ear hole: 0 none .. 2.8 thick. The jet starts on the kettle (shot 16) and screams to the end of the shot */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t < KETTLE_T || t > S.drawer) return 0;
  return 1.5 + 1.3 * ease((t - KETTLE_T) / 0.3);
}

// ── Chuck: the face snaps (calm -> purple), how purple he is
/** how purple his face is (0 as painted .. 1 furious): calm in the shots before the snap, purple from the snap through "For COFFEE?!"; calm again from the display flip */
export function purpleAt(f: number): number {
  const t = f / FPS, id = shotId(f);
  switch (id) {
    case "snap": return t < SNAP_T ? 0 : Math.min(1, 0.55 + 0.45 * ease((t - SNAP_T) / 0.1));
    case "punch": return 1;
    default: return 0;
  }
}
/** Ross's own purple face (the next-day spit-take): from SNAP2_T to the end of shot 20 */
export function rossPurple(f: number): number {
  const t = f / FPS;
  return inShot(f, "spit2") && t >= SNAP2_T ? Math.min(1, 0.55 + 0.45 * ease((t - SNAP2_T) / 0.1)) : 0;
}

// ── the price on the display
/** the index of the price shown at frame f (-1 before the display pops up) and the age (s) of the last flip */
export function priceAt(f: number): { i: number; age: number } {
  const t = f / FPS;
  let i = -1;
  KACHING_T.forEach((k, j) => { if (t >= k - 1e-6) i = j; });
  return { i, age: i < 0 ? 9 : t - KACHING_T[i] };
}
/** the display's bounce: the first KA-CHING pops it up (a spring from nothing), the others jump it up 0.18 and let it settle; `big` in the inserts */
export function displayScale(f: number): number {
  const { i, age } = priceAt(f);
  if (i < 0) return 0;
  if (i === 0 || i === 5) return Math.max(0.0001, popP(f / FPS, KACHING_T[i], 0.5, 40));
  return 1 + 0.2 * Math.exp(-age / 0.09) * Math.cos(age * 38);
}
/** which shots show the display as a prop beside the people (the inserts draw it on their own, big) */
const DISPLAY_SHOTS: ShotId[] = ["sip", "spit", "splat", "snap", "punch", "four", "cousin", "vein", "phone", "free", "sipSlow", "bill", "that", "cup", "spit2", "thirteen"];
/** the display is on its own price from the shot that shows it; the next day (shots 19 and 20) it is not there before the new KA-CHING pops it up */
export const displayShown = (f: number): boolean => DISPLAY_SHOTS.includes(shotId(f)) && priceAt(f).i >= 0 && !(inShot(f, "cup", "spit2") && f / FPS < KACHING_T[5] - 1e-6);

// ── the shake and the camera
/** a decaying shake of the camera (frame px): the pops, the snap, the stab, the corks, the drawer, the thud */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [...KACHING_T.map((t0) => shakeOf(t, t0, 4, 0.05)), shakeOf(t, SPIT_T, 12, 0.08), shakeOf(t, SPLAT_T, 14, 0.08), shakeOf(t, SNAP_T, 14, 0.07), shakeOf(t, STAB_T, 12, 0.07), shakeOf(t, COFFEE_T, 18, 0.08),
    shakeOf(t, VEIN_T, 5, 0.06), shakeOf(t, CORK_T[0], 6, 0.05), shakeOf(t, CORK_T[1], 6, 0.05), shakeOf(t, DRAWER_T, 14, 0.07), shakeOf(t, THUD_T, 12, 0.08), shakeOf(t, FLOP_T, 6, 0.06), shakeOf(t, SPIT2_T, 12, 0.08), shakeOf(t, SNAP2_T, 14, 0.07),
    shakeOf(t, SPLAT2_T, 14, 0.08)];
  const kettle = t >= KETTLE_T && inShot(f, "corks") ? [2.2 * Math.sin(t * 190), 1.6 * Math.cos(t * 150)] : [0, 0];
  const bill = inShot(f, "bill") ? [1.2 * Math.sin(t * 160), 0.9 * Math.cos(t * 130)] : [0, 0];
  return [parts.reduce((s, p) => s + p[0], kettle[0] + bill[0]), parts.reduce((s, p) => s + p[1], kettle[1] + bill[1])];
}
/** the camera's zoom about the shot's focus: the shot's own framing is in the scene, this is a slow push in the holds and a pulse on the hits */
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "sip": return 1 + 0.03 * s.u;
    case "spit": return 1 + 0.07 * s.u + pulse(SPIT_T, 0.05);
    case "splat": return 1 + 0.03 * s.u + pulse(SPLAT_T, 0.06);
    case "snap": return 1 + 0.03 * s.u + pulse(SNAP_T, 0.07);
    case "punch": return 1 + 0.05 * s.u + pulse(STAB_T, 0.05, 0.09) + (t >= COFFEE_T ? 0.17 : 0) + pulse(COFFEE_T, 0.06, 0.09);   // the punch-in on COFFEE: the face pushed in a step
    case "flip": return 1 + 0.03 * s.u + pulse(KACHING_T[1], 0.06);
    case "four": return 1 + 0.03 * s.u;
    case "cousin": return 1 + 0.04 * s.u;
    case "vein": return 1 + 0.04 * s.u + pulse(VEIN_T, 0.04);
    case "phone": return 1 + 0.03 * s.u;
    case "profile": return 1 + 0.03 * s.u;
    case "free": return 1 + 0.04 * s.u + pulse(BULGE_T, 0.05);
    case "sipSlow": return 1 + 0.03 * s.u;
    case "bill": return 1 + 0.03 * s.u;
    case "that": return 1 + 0.04 * s.u;
    case "corks": return 1 + 0.03 * s.u + pulse(CORK_T[0], 0.03) + pulse(CORK_T[1], 0.03) + pulse(DRAWER_T, 0.05);
    case "drawer": return 1 + 0.03 * s.u + pulse(THUD_T, 0.04);
    case "sign": return 1 + 0.03 * s.u;
    case "cup": return 1 + 0.03 * s.u;
    case "spit2": return 1 + 0.06 * s.u + pulse(SPIT2_T, 0.05);
    case "thirteen": return 1 + 0.04 * s.u + pulse(SPLAT2_T, 0.05);
    case "end": return 1 + 0.12 * ease(s.u);                      // the push-in on the display
    default: return 1;
  }
};

// ── the voices: the mouth, on twos, one frame ahead of the sound; closed whenever that character is not speaking
const lineOf = (who: Who, f: number, before = 0.1, after = 0.05) => LINES.find((q) => q.who === who && f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (who: Who, f: number) => !!lineOf(who, f);
export const speakingLine = (who: Who, f: number) => lineOf(who, f);
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const SMALL = new Set([2, 7, 8, 9, 12]);  // said small: Ross's "...Four?" through the frozen smile and "Five bucks?" in a small voice, Chuck's flat "What else do I get?", "...That's it?" and "...Thirteen." (the mouth is never wider than mid)
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
const LINE_MOOD: Record<number, Mood> = { 1: "furious", 2: "tight", 3: "smug", 4: "tight", 5: "smug", 6: "tight", 7: "flat", 8: "tight", 9: "flat", 10: "furious", 11: "furious", 12: "flat" };
/** the mood of a character's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (l) return LINE_MOOD[l.n];
  if (who === "ROSS") {
    switch (id) {
      case "corks": case "drawer": case "spit2": return "furious";
      case "cup": return "polite";
      default: return "tight";                              // the service smile
    }
  }
  switch (id) {
    case "snap": case "punch": return "furious";
    case "cousin": case "phone": return "smug";
    case "spit": return "neutral";
    case "drawer": return "neutral";
    default: return "flat";
  }
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x12-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [3.0, 6], 2: [0.6, 1.0], 3: [1.6, 3], 4: [1.6, 3], 5: [2.4, 5], 6: [3.2, 7], 7: [1.0, 2], 8: [1.0, 2], 9: [0.8, 1.5], 10: [3.4, 7], 11: [3.4, 7], 12: [0.5, 1] };
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

// ── blinks: every 2.5-4.5 s, 3 frames, at hashed times; none that touches a cut. Ross's service smile never blinks in the dripping shots, Chuck's calm face does not blink while he is wet
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3].some((f) => CUT_F.has(f)));
}
export const BLINKS = { ross: blinkStarts(7), chuck: blinkStarts(17) };
const NO_BLINK_ROSS: ShotId[] = ["splat", "four", "cousin", "vein", "free", "bill", "corks", "spit2"];
const NO_BLINK_CHUCK: ShotId[] = ["sip", "spit", "snap", "punch", "thirteen", "drawer"];
export const blinkOf = (who: keyof typeof BLINKS, f: number) => {
  if (who === "chuck" && inShot(f, ...NO_BLINK_CHUCK)) return 0;
  if (who === "ross" && inShot(f, ...NO_BLINK_ROSS)) return 0;
  for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s). A peak that would
// fall before the reel's start (the first KA-CHING) skips into the clip instead of starting early
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  ...KACHING_T.map((t, i): Hit => ({ id: `kaching${i + 1}`, t, sfx: "kaching", db: i === 0 ? -4 : -5 })),
  { id: "spit", t: SPIT_T, sfx: "spit", db: -4, start: true },
  { id: "splat", t: SPLAT_T, sfx: "splat", db: -3, start: true },
  ...DRIP3_T.map((t, i): Hit => ({ id: `drip3${i}`, t, sfx: "drip", db: -12 - i })),
  { id: "snap", t: SNAP_T, sfx: "snap", db: -2 },                     // the face snapping purple (the clip of "Cold Lips": its peak on the frame of the pop)
  { id: "throb", t: VEIN_T, sfx: "throb", db: -4 },                    // the vein
  { id: "slurp", t: SLURP_T, sfx: "slurp", db: -5 },                   // the slow sip (the peak of the clip is at 0.35 s: the clip starts with the shot)
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -8 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -15, start: true, from: 0.75, len: 1.0, fade: 0.35 },
  { id: "drawer", t: DRAWER_T, sfx: "drawer", db: -9 },
  { id: "coins", t: COINS_T, sfx: "coins", db: -12 },                   // the coins land: the clip starts at the yank, its last big clatter is the peak
  { id: "thud", t: THUD_T, sfx: "thud", db: -10 },
  { id: "whoosh", t: WHOOSH_T, sfx: "whoosh", db: -10 },
  { id: "flop", t: FLOP_T, sfx: "thud", db: -12 },
  { id: "scribble", t: SCRIBBLE_T, sfx: "scribble", db: -2, start: true, len: 0.62, fade: 0.15 },
  { id: "spit2", t: SPIT2_T, sfx: "spit", db: -4, start: true },
  { id: "splat2", t: SPLAT2_T, sfx: "splat", db: -3, start: true },
  ...DRIP21_T.map((t, i): Hit => ({ id: `drip21${i}`, t, sfx: "drip", db: -12 - i })),
];

// ── sound cues for the mix (scripts/x13-cues.mts): no bed, the room is quiet
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => {
    let at = h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), from = h.from ?? 0;
    if (at < 0) { from += -at; at = 0; }                           // the peak is before the reel's first frame: skip into the clip so that the peak still lands on the frame
    c.push({ name: h.sfx, at, db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(from ? { from } : {}) });
  });
  return c.sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x12-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through is captioned twice: the part up to the cut, and after the
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
/** where the captions sit (frame y px): one band, out of the bottom 400 px (Instagram's), except where something is in it (a face, the display, the phone: the shots set their own) */
export const CAP_BAND: [number, number] = [1295, 1455];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { sipSlow: [300, 470], spit2: [300, 470] };   // (the face fills the usual band in these two: the caption goes above it)
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { punch: [30, 700], sipSlow: [400, 1050], spit2: [30, 700] };   // (the display is at the right of the band in the punch-in, at the left above the face in 13, at the right above it in 20)
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is)
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${sh.i + 1} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("start", 0.0), kf("pop", 0.1), kf("eyes", 0.3), kf("cup", 0.43), kf("spray", 0.5), kf("spray", 0.6), kf("spray", 0.75), kf("hit", 0.87), kf("", 1.0), kf("", 1.3),
  kf("calm", 1.4), kf("snap", 1.5), kf("", 1.9), kf("", 2.05), kf("stab", 2.1), kf("", 2.7), kf("coffee", 3.1), kf("", 3.6),
  kf("5.00", 3.8), kf("flip", 3.95), kf("", 4.2), kf("twitch", 4.3), kf("", 5.0), kf("", 5.6), kf("", 6.6), kf("", 7.17), kf("vein", 7.3), kf("", 8.2),
  kf("", 8.8), kf("", 9.6), kf("screen", 10.5), kf("", 11.3), kf("ka-ching", 11.75), kf("bulge", 11.9), kf("", 12.5), kf("", 13.12), kf("tilt", 13.45), kf("", 14.2),
  kf("", 15.0), kf("bill", 15.2), kf("", 16.0), kf("", 16.85), kf("", 17.5), kf("cork", 18.15), kf("jet", 18.3), kf("yank", 18.45), kf("coins", 18.7), kf("", 19.2),
  kf("thud", 19.34), kf("", 19.6), kf("apron", 19.85), kf("flop", 20.0), kf("", 20.4), kf("sign", 20.72), kf("strike", 20.95), kf("chuck's", 21.3),
  kf("", 21.42), kf("$12", 21.55), kf("spray", 22.1), kf("spray", 22.3), kf("snap", 22.45), kf("", 22.9), kf("", 23.5), kf("hit", 23.62), kf("$13", 23.75), kf("", 24.3),
  kf("", 24.9), kf("insert", 25.05), kf("last", 25.59),
];
