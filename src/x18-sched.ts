// The timeline and the acting of x18 "Unattended" (src/X18.tsx, docs/x18-unattended.md, the shot list v3 and the build spec). Pure data and arithmetic, the shape of src/x17-sched.ts: every number is a function of the frame, of the fifteen voice
// takes in public/x18/timings.json and of the mouth loudness in src/amp-x18.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the gaps of
// episodes/x18.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: only the frames. A spec time that falls on half a frame goes up to the next frame (0.65 -> frame 20, 1.15 -> 35, 6.95 -> 209, 7.85 -> 236, 9.45 -> 284, 14.55 -> 437, 17.75 -> 533,
// 20.45 -> 614, 22.20 stays 666, 24.05 -> 722). Two cuts are moved onto a word: shot 11 starts at 10.90 (frame 327), the spec's 10.95 is 0.06 s inside "puppy?" (10.89-11.09), so the cut goes to the start of the word and "...Free" and "puppy?" are one shot each; shot 13 starts at 12.333
// (frame 370, the spec's 12.35 is half a frame and the other way would have put the cut a frame after "Ladies," starts, 12.335: the caption of the first word then falls in the shot before, and a caption never crosses a cut). In shot 5's line the cut of 8 (7.867) falls where "wouldn't" ends (7.64-7.86): "Then you wouldn't" is said over the lick (7) and "understand." over the smug mom (8), the spec had the split after "Then you". Shot 21 has the cut
// the spec names inside it (21.55 -> frame 647), so the contact sheet and the checks count it as two pictures, "blur" and "feet" (21a, 21b); shot 3 is cut in two the same way (3a, 3b): the mom's picture holds from 1.17 s to 1.77 s, the start of "exploring!" (1.75), and the toddler's close-up
// (the grin and the carton: the act of the excuse) holds from there to 2.70, her line running over it, so that no picture in the first 3 s holds over a second (the coordinator's note 10-27); the reel is 837 frames = 27.9 s and it loops into shot 1 (the toddler tips the oat milk again).
import timings from "../public/x18/timings.json" with { type: "json" };
import amps from "./amp-x18.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x17-sched.ts): take n of public/x18/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "MOM" | "ROSS" | "GRANDPA" | "TODDLER" | "KID";
const WHO: Record<string, Who> = { MOM: "MOM", ROSS: "ROSS", GRANDPA: "GRANDPA", TODDLER: "TODDLER", KID: "KID" };
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
  // a take's first word cannot start before its voice does; `first` (the first sound that is speech) is the first frame whose loudness is over 0.3 (a soft breath before the word, as in take 6's "...Free puppy?", is not): captions and mouths start there.
  // The word times of takes 12 and 13 run late against the amplitude (take 13's "Six" is aligned at 0.29 s, the loud syllable is at 0.13 s): the first loud frame wins, as it is the earlier
  const words = t.words.map((w, i) => ({ ...w, t: ofs + (i ? w.t : Math.max(w.t, t.voiced[0][0])), e: ofs + w.e }));
  const i0 = amp.findIndex((a) => a >= 0.3);
  const base = { n: t.n, who: WHO[t.character], file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
  const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: (j % 2 === 0 ? 1 : -1) as 1 | -1 }));
  return { ...base, peaks };
});
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;

// ── the cuts: frame numbers. Speech on the reel's clock (first sound .. last word): 1 MOM 1.15-2.60 (He's 1.24, just 1.53, exploring 1.75), 2 ROSS 2.85-4.26 (That's 2.90, the 3.33, register 3.70), 3 MOM 4.56-5.87 (Do 4.51, you 4.85,
// have 5.00, kids 5.22), 4 ROSS 6.12-6.72 (No 6.08), 5 MOM 7.12-8.66 (Then 7.07, you 7.42, wouldn't 7.64, understand 7.86), 6 MOM 10.26-11.59 (Free 10.46, puppy 10.89), 7 MOM 12.34-13.94 (Ladies 12.33, bring 13.10, the 13.31, kids 13.45),
// 8 GRANDPA 14.84-15.83 (See 14.95, you 15.08, Tuesday 15.24), 9-11 the chant in three voices 16.02-17.57 (Puppy 16.06-16.48 and 16.90-17.52 in the first), 12 ROSS 17.87-18.96, 13 TODDLER 22.99-23.87 (the loud syllables are at 23.09 and
// 23.39), 14 MOM 24.11-25.93 (WHO 24.18, GAVE 24.50, HIM 24.74, ESPRESSO 24.90), 15 ROSS 26.28-27.43 (He 26.34, was 26.58, exploring 26.82)
const F = (n: number) => n / FPS;
const S = {
  till: F(0), pour: F(20), mom1: F(35), grin: F(53), ross1: F(81), mom2: F(132), flat: F(180), lick: F(209), smug: F(236), tape: F(267), sign: F(284), glasses: F(327), darts: F(354), walk: F(370), drop: F(420), wagon: F(437), row: F(480),
  finger: F(533), cups: F(573), zap: F(597), flip: F(614), blur: F(633), feet: F(647), clock: F(666), slam: F(681), shock: F(722), wipe: F(783),
};
export const T_END = F(837);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "till", "pour", "mom1", "grin", "ross1", "mom2", "flat", "lick", "smug", "tape", "sign", "glasses", "darts", "walk", "drop", "wagon", "row", "finger", "cups", "zap", "flip", "blur", "feet", "clock", "slam", "shock", "wipe",
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
/** the spec's number of each shot (21 is two pictures: the blur and Ross with his feet up) and its frame size */
export const NO: Record<ShotId, string> = {
  till: "1", pour: "2", mom1: "3a", grin: "3b", ross1: "4", mom2: "5", flat: "6", lick: "7", smug: "8", tape: "9", sign: "10", glasses: "11", darts: "12", walk: "13", drop: "14", wagon: "15", row: "16", finger: "17", cups: "18", zap: "19", flip: "20",
  blur: "21a", feet: "21b", clock: "22", slam: "23", shock: "24", wipe: "25",
};
export const FRAMING: Record<ShotId, "INSERT" | "CLOSE" | "MEDIUM" | "WIDE"> = {
  till: "INSERT", pour: "MEDIUM", mom1: "CLOSE", grin: "CLOSE", ross1: "CLOSE", mom2: "CLOSE", flat: "CLOSE", lick: "INSERT", smug: "CLOSE", tape: "MEDIUM", sign: "INSERT", glasses: "CLOSE", darts: "CLOSE", walk: "MEDIUM", drop: "MEDIUM", wagon: "MEDIUM", row: "WIDE",
  finger: "CLOSE", cups: "INSERT", zap: "WIDE", flip: "INSERT", blur: "WIDE", feet: "MEDIUM", clock: "INSERT", slam: "MEDIUM", shock: "CLOSE", wipe: "MEDIUM",
};
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

// ── the named moments (seconds, every one on a frame; the spec's time in the comment)
export const STAMP_T = F(0);                                  // shot 1: the label POV: YOU OWN A CAFÉ slams on, the till springs open, the register's ka-ching (spec 0.00)
export const SPRING_T = F(0);                                 // shot 1: the till drawer springs open with a jolt (frames 0-4)
export const GLUG_T = F(6);                                   // shot 1: the waterfall of oat milk starts pouring in (spec 0.20)
export const COIN_T = F(8);                                   // shot 1: the coins and bills jump (spec 0.25, half a frame: up)
export const GIGGLE_T = F(20);                                // shot 2: the toddler's giggle; the picture bumps in on its first burst (spec 0.68: the cut's own frame)
export const PILL_T = F(35);                                  // the label shrinks into a pill at the top (the cut of shot 3, spec 1.15)
export const DRIP_T = F(83);                                  // shot 4: the first drop falls off the counter's edge in front of him (spec 2.75)
export const LICK_T = F(210);                                 // shot 7: the girl's tongue starts up the glass of the pastry case, squeak and lick (spec 7.00)
export const RIP_T = F(268);                                  // shot 9: the strip of tape rips off its roll (spec 8.92)
export const SLAP_T = F(279);                                 // shot 9: the sign slapped onto the glass (spec 9.30)
export const TICK_T = [F(355), F(360), F(365)];               // shot 12: her pupils tick to the kids, the sign, the door (spec 11.82, 12.00, 12.18)
export const BELL_T = [F(370), F(420), F(437), F(681)];       // the door's bell: the mom out (13: on the cut), the drop-off (14), the grandpa (15), the mom back (23) (spec 12.36, 14.00, 14.55, 22.70)
export const THUD_T = F(425);                                 // shot 14: the three kids land on the floor (spec 14.15)
export const WAGON_T = F(439);                                // shot 15: the wagon rolls in (spec 14.62)
export const CUPS_T = F(574);                                 // shot 18: the first cup slides in (spec 19.12)
export const GULP_T = F(598);                                 // shot 19: the eight kids gulp together (spec 19.92)
export const ZAP_T = F(605);                                  // shot 19: ZAP, the white flash for two frames, the kids snap wired (spec 20.15)
export const FLIP_T = F(614);                                 // shot 20: the sign is peeled off the glass and flipped (spec 20.48; its edge-on moment is FLIPMID_T)
export const FLIPMID_T = F(618);
export const FRENZY_T = F(633);                               // shot 21: the cleaning blur (spec 21.10)
export const DRYER_T = F(636);                                // shot 21: a kid blow-dries the till (spec 21.20)
export const FEET_T = F(647);                                 // shot 21: the cut to Ross sitting down with his feet up (spec 21.55)
export const CLOCK_T = F(666);                                // shot 22: the wall clock's hands spin an hour (spec 22.20)
export const SLAM_T = F(688);                                 // shot 23: the toddler slams the coffee down and "$6.50" pops up over it (spec 22.92)
export const GLUG2_T = F(828);                                // shot 25: the first stream out of the carton again (spec 27.60)

// ── the door: it swings open on every bell and shuts again; `open` 0 shut .. 1 open (the door shots 13, 14, 15 and 23 read it). Opens in 3 frames, holds, shuts over 5 frames
const DOOR_OPEN: [number, number][] = [[370, 408], [420, 430], [437, 475], [681, 722]];   // [the bell's frame, the frame the door starts to shut]
export function doorAt(f: number): number {
  for (const [a, b] of DOOR_OPEN) {
    if (f >= a && f < b + 5) return f < a + 3 ? ease((f - a + 1) / 3) : f < b ? 1 : 1 - ease((f - b + 1) / 5);
  }
  return 0;
}

// ── the label: POV: YOU OWN A CAFÉ slams on big at the first frame and shrinks into a small pill at the top on the cut of shot 3. `big`: the scale of the big one (a stamp: over its size at first, settled in four frames), `pill`: 0 big .. 1 the pill
export const labelBig = (f: number): number => { const a = f / FPS - STAMP_T; return 1 + 0.18 * Math.exp(-a / 0.045) * Math.cos(a * 46); };
export const pillP = (f: number): number => ease((f / FPS - PILL_T) / 0.2);

// ── the shake and the camera
/** a decaying shake of the camera (frame px): the stamp, the spring of the drawer, the giggle's bump, the slap, the bells, the thud, the wagon, the zap, the flip, the clock, the slam, the glug */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, STAMP_T, 7, 0.05), shakeOf(t, SPRING_T + 0.1, 9, 0.06), shakeOf(t, GIGGLE_T + 0.05, 5, 0.05), shakeOf(t, SLAP_T, 8, 0.05), shakeOf(t, TICK_T[0], 2, 0.04), shakeOf(t, TICK_T[1], 2, 0.04), shakeOf(t, TICK_T[2], 2, 0.04),
    shakeOf(t, BELL_T[0], 4, 0.05), shakeOf(t, BELL_T[1], 4, 0.05), shakeOf(t, THUD_T, 9, 0.06), shakeOf(t, BELL_T[2], 4, 0.05), shakeOf(t, WAGON_T, 4, 0.06), shakeOf(t, ZAP_T, 14, 0.07), shakeOf(t, FLIPMID_T, 3, 0.04),
    shakeOf(t, CLOCK_T + 0.43, 4, 0.05), shakeOf(t, BELL_T[3], 4, 0.05), shakeOf(t, SLAM_T, 10, 0.06), shakeOf(t, GLUG2_T, 3, 0.05)];
  // the cleaning blur shakes the camera on twos all through it; the mom's shout (24) rattles the frame a little on every loud syllable
  const blur = inShot(f, "blur") ? [5 * Math.sin(twos(f) * 2.9 + 0.4), 4 * Math.cos(twos(f) * 2.3)] : [0, 0];
  return [parts.reduce((s, p) => s + p[0], blur[0]), parts.reduce((s, p) => s + p[1], blur[1])];
}
/** the camera's zoom about the shot's focus: the shot's own framing is in the scene, this is a slow push in the holds (the sign's is the slowest and the biggest: a slow push-in) and a pulse on the hits */
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "till": return 1 + 0.03 * s.u + pulse(SPRING_T + 0.1, 0.04, 0.08);
    case "pour": return 1 + 0.05 * s.u + pulse(GIGGLE_T + 0.05, 0.04, 0.08);
    case "mom1": return 1 + 0.03 * s.u;
    case "grin": return 1 + 0.05 * s.u;
    case "ross1": return 1 + 0.05 * s.u + pulse(DRIP_T, 0.01, 0.1);
    case "mom2": return 1 + 0.06 * s.u;
    case "flat": return 1 + 0.03 * s.u;
    case "lick": return 1 + 0.03 * s.u;
    case "smug": return 1 + 0.04 * s.u;
    case "tape": return 1 + 0.02 * s.u + pulse(SLAP_T, 0.05);
    case "sign": return 1 + 0.1 * s.u;
    case "glasses": return 1 + 0.04 * s.u;
    case "darts": return 1 + 0.03 * s.u + pulse(TICK_T[0], 0.015, 0.05) + pulse(TICK_T[1], 0.015, 0.05) + pulse(TICK_T[2], 0.015, 0.05);
    case "walk": return 1 + 0.02 * s.u;
    case "drop": return 1 + 0.03 * s.u + pulse(THUD_T, 0.04);
    case "wagon": return 1 + 0.02 * s.u;
    case "row": return 1 + 0.04 * s.u;
    case "finger": return 1 + 0.04 * s.u;
    case "cups": return 1 + 0.03 * s.u;
    case "zap": return 1 + 0.02 * s.u + pulse(ZAP_T, 0.06);
    case "flip": return 1 + 0.02 * s.u;
    case "blur": return 1 + 0.06 * s.u;
    case "feet": return 1 + 0.03 * s.u;
    case "clock": return 1 + 0.05 * s.u;
    case "slam": return 1 + 0.03 * s.u + pulse(SLAM_T, 0.05);
    case "shock": return 1 + 0.05 * s.u;
    case "wipe": return 1 + 0.03 * s.u;
    default: return 1;
  }
};

// ── the voices: the mouth, on twos, one frame ahead of the sound; closed whenever that character is not speaking
const lineOf = (who: Who, f: number, before = 0.1, after = 0.05) => LINES.find((q) => q.who === who && f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (who: Who, f: number) => !!lineOf(who, f);
export const speakingLine = (who: Who, f: number) => lineOf(who, f);
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
export function mouthAt(who: Who, f: number): MouthShape {
  const l = lineOf(who, f);
  if (!l) return "closed";
  const fi = twos(f), a = l.amp[fi + 1 - l.f0] ?? 0;
  if (a < 0.1) return "closed";
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (who === "ROSS") return a >= 0.6 ? "mid" : "small";                               // polite and dry: never a wide mouth
  if (who === "TODDLER" && l.n === 13) return a >= 0.55 ? "mid" : "small";            // flat and businesslike
  if (who === "GRANDPA") return a >= 0.6 ? "wide" : "mid";                             // jolly
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
const LINE_MOOD: Record<number, Mood> = { 2: "tight", 4: "flat", 12: "polite", 15: "polite" };
/** the mood of Ross's mouth and brows: the line's while it is spoken, else the shot's resting one (a polite frozen smile at the register (4), flat at "No." (6), a small calm smile with the sign (9), polite after) */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (who === "ROSS") {
    if (l && LINE_MOOD[l.n]) return LINE_MOOD[l.n];
    switch (id) {
      case "ross1": return "tight";                                              // the polite frozen smile
      case "flat": return "flat";
      default: return "polite";
    }
  }
  return "flat";
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x13-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [1.4, 2.2], 2: [1.0, 1.6], 3: [1.8, 2.6], 4: [0.6, 1.0], 5: [1.6, 2.4], 6: [1.0, 1.6], 7: [2.4, 3.4], 8: [2.0, 3.0], 9: [2.0, 3.0], 10: [2.0, 3.0], 11: [2.0, 3.0], 12: [0.8, 1.2], 13: [1.6, 2.4], 14: [3.0, 4.6], 15: [0.7, 1.2] };
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
/** how loud the kids' chant is at frame f (0 .. 1): the loudest of its three voices; the eight kids pump on it (the whole row bobs up and down on every syllable) */
export const CHANT = [9, 10, 11];
export function chantAt(f: number): number {
  return Math.max(...CHANT.map((n) => { const l = LINE(n); return l.amp[f - l.f0 + 1] ?? 0; }));
}

// ── blinks: Ross's slow ones come after a line, dead flat (after "No.", in his chair, after "He was exploring."), never in the frozen smile; the mom and the toddler blink quick and often
const BLINK_SHAPE = [0.35, 0.8, 1, 1, 0.8, 0.35];
const BLINKS: Record<"ross" | "mom" | "toddler", number[]> = { ross: [203, 652, 830], mom: [150, 244, 344, 760], toddler: [70, 700, 716] };
export const blinkOf = (who: "ross" | "mom" | "toddler", f: number) => { for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < BLINK_SHAPE.length) return BLINK_SHAPE[k]; } return 0; };

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s). A peak that would
// fall before the reel's start skips into the clip instead of starting early.
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "stamp", t: STAMP_T, sfx: "stamp", db: -3 },                                                           // the label slams on
  { id: "kaching", t: STAMP_T, sfx: "kaching", db: -4, start: true },                                         // the till springs open: the register's ka-ching (its ching is 0.1 s in: the drawer's jolt)
  { id: "glug", t: GLUG_T, sfx: "glug", db: -6, start: true, len: 1.0, fade: 0.3 },                           // the waterfall of oat milk pours in (to the mom's first word)
  { id: "coins", t: COIN_T, sfx: "coins", db: -8, start: true },                                              // the coins and bills jump (the jingles are 0.17-0.57 s in)
  { id: "giggle", t: GIGGLE_T, sfx: "giggle", db: -3, start: true, len: 0.7, fade: 0.15 },                    // the toddler's giggle (on his cut frame)
  { id: "drip", t: DRIP_T, sfx: "drip", db: -8, from: 0.13 },                                                 // a drop off the counter's edge (the clip's first 0.13 s are skipped: they would be before the cut)
  { id: "squeak", t: LICK_T, sfx: "squeak", db: -9, start: true, len: 0.8, fade: 0.2 },                       // her palm and tongue on the glass
  { id: "lick", t: LICK_T, sfx: "lick", db: -4, start: true },                                                // the licks
  { id: "rip", t: RIP_T, sfx: "rip", db: -6, start: true, from: 0.12 },                                // the strip of tape ripped off (the clip's tear is 0.15-0.30 s in)
  { id: "slap", t: SLAP_T, sfx: "slap", db: -4 },                                                             // the sign slapped onto the glass
  ...TICK_T.map((t, i): Hit => ({ id: `tick${i + 1}`, t, sfx: "tap", db: -9 })),                              // her pupils tick: kids, sign, door
  ...BELL_T.map((t, i): Hit => ({ id: `bell${i + 1}`, t, sfx: "doorbell", db: -8, start: true, from: 0.1, len: 0.75, fade: 0.2 })),   // the door's bell (the first strike is at 0.15 s: skipped to 0.10 so that it lands on the door's opening)
  { id: "thud", t: THUD_T, sfx: "thud", db: -4 },                                                             // three kids on the floor
  { id: "wagon", t: WAGON_T, sfx: "wagon", db: -10, start: true, len: 1.3, fade: 0.2 },                       // the wagon rolls in (it rumbles loud from its first frame: a bed under the grandpa's line)
  { id: "cups", t: CUPS_T, sfx: "cups", db: -5, start: true },                                                // the first cups slide in and clink
  ...[F(581), F(584), F(586), F(589), F(591), F(594)].map((t, i): Hit => ({ id: `clink${i + 3}`, t, sfx: "clink", db: -6 - (i % 2) * 2 })),   // cups 3-8 stop at their hands
  { id: "gulp", t: GULP_T, sfx: "gulp", db: -4 },                                                             // eight kids gulp together
  { id: "zap", t: ZAP_T, sfx: "zap", db: -5, start: true },                                                   // ZAP
  { id: "flip", t: FLIP_T, sfx: "flip", db: -6, start: true },                                                // the sign peeled off and flipped (its main hit is 0.14 s in: the flip's edge-on moment)
  { id: "frenzy", t: FRENZY_T, sfx: "frenzy", db: -6, start: true, len: 1.1, fade: 0.15 },                    // the cleaning blur (to the cut to the clock)
  { id: "dryer", t: DRYER_T, sfx: "hairdryer", db: -4, start: true, len: 1.0, fade: 0.2 },                    // a kid blow-dries the till
  { id: "clock", t: CLOCK_T, sfx: "clockspin", db: -3, start: true },                                         // the wall clock's hands spin an hour
  { id: "slam", t: SLAM_T, sfx: "slam", db: -5 },                                                             // the toddler's coffee slammed down
  { id: "glug2", t: GLUG2_T, sfx: "glug", db: -8, start: true, len: 0.4, fade: 0.15 },                         // the first stream out of the carton again
];

// ── sound cues for the mix (scripts/x18-cues.mts): the sounds sit 6 dB lower while somebody talks
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => {
    let at = h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), from = h.from ?? 0;
    if (at < 0) { from += -at; at = 0; }                           // the peak is before the reel's start: skip into the clip so that the peak still lands on the frame
    c.push({ name: h.sfx, at, db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(from ? { from } : {}) });
  });
  return c.sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x17-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through is captioned twice: the part up to the cut, and after the cut the
// sentence from that word on. The kids' chant (9, 10, 11: three voices on each other) is one caption per "Puppy!", from the first voice to the end of the last, written PUP-PY! as the screenplay has it. Nothing is emphasised: the words are white
export type Cap = { who: Who; n: number; text: string; t0: number; t1: number; w0: number; w1: number; words: { d: string; t: number; emph: boolean }[] };
const say = (w: Word, n: number) => (CHANT.includes(n) ? w.d.toUpperCase().replace("PUPPY", "PUP-PY") : w.d.replace(/—/g, "-"));
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
const TOGETHER: Record<number, number[]> = { 9: [10, 11] };   // the voices that are on a take: one caption for all of them
export const NO_CAP: ShotId[] = [];
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  const cuts = SHOTS.slice(1).map((s) => s.t0);
  const skip = Object.values(TOGETHER).flat();
  for (const l of LINES) {
    if (skip.includes(l.n)) continue;
    const mates = (TOGETHER[l.n] ?? []).map(LINE);
    const len = (ws: Word[]) => ws.map((w) => say(w, l.n)).join(" ").length;
    const chunks: Word[][] = [];
    let cur: Word[] = [];
    l.words.forEach((w, i) => {
      cur.push(w);
      const nxt = l.words[i + 1];
      if (/[.?!]$/.test(w.d) || (nxt && cuts.some((c) => c >= w.e - 0.02 && c <= nxt.t + 0.02)) || (nxt && nxt.t - w.e > 0.3 && len(cur) >= 9)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const mk = (ws: Word[], t0: number, t1: number, w0: number, w1: number): Cap => ({ who: l.who, n: l.n, text: ws.map((w) => say(w, l.n)).join(" "), t0, t1, w0, w1, words: ws.map((w) => ({ d: say(w, l.n), t: w.t, emph: false })) });
    chunks.forEach((ws) => {
      const first = ws === chunks[0] ? Math.min(l.first, ...mates.map((m) => m.first), ws[0].t) : ws[0].t;
      const lastOf = ws === chunks[chunks.length - 1];
      const last = lastOf && mates.length ? Math.max(stretchEnd(l, ws[ws.length - 1].e), ...mates.map((m) => stretchEnd(m, m.words[m.words.length - 1].e))) : stretchEnd(l, ws[ws.length - 1].e);
      const t0 = first - 0.04, t1 = last + 0.25;
      const x = ws.findIndex((w) => cuts.some((c) => c > w.t + 0.04 && c < w.e - 0.04));
      if (x < 0) { caps.push(mk(ws, t0, t1, ws[0].t, ws[ws.length - 1].e)); return; }
      const c = cuts.find((q) => q > ws[x].t + 0.04 && q < ws[x].e - 0.04)!;
      caps.push(mk(ws.slice(0, x + 1), t0, c, ws[0].t, ws[x].e));
      caps.push(mk(ws.slice(x), c, t1, c, ws[ws.length - 1].e));
    });
  }
  caps.sort((a, b) => a.t0 - b.t0);
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (s) { c.t0 = Math.max(c.t0, s.t0); c.t1 = Math.min(c.t1, s.t1); } });
  caps.forEach((c, i) => { const n = caps[i + 1]; if (n && n.n === c.n && n.t0 > c.t1 && n.t0 - c.t1 < 0.12 && !cuts.some((q) => q >= c.t1 - 1e-6 && q < n.t0 - 1e-6)) c.t1 = n.t0; });   // (two captions of one line that follow each other leave no blank frames between them, unless the first would then run over a cut: it ends on its cut)
  return caps.filter((c) => c.t1 - c.t0 > 0.12 && !NO_CAP.includes(SHOTS.find((x) => (c.t0 + 0.02) >= x.t0 - 1e-6 && (c.t0 + 0.02) < x.t1 - 1e-6)?.id as ShotId));
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
/** where the captions sit (frame y px): one band, out of the bottom 400 px (Instagram's, y 1520 and down). The shots set their own where a face, a hand or a prop is in it */
export const CAP_BAND: [number, number] = [1255, 1480];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the biggest size of a caption in the shot (px): the mom's shout and the kids' chant are the biggest */
const CAP_MAX: Partial<Record<ShotId, number>> = { shock: 150, row: 150 };
export const capMax = (id: ShotId): number => CAP_MAX[id] ?? 124;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is); SHEET_T is the named moment of each shot for the contact sheet
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${NO[sh.id]} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const SHEET_T: Record<ShotId, number> = {
  till: F(12), pour: F(26), mom1: F(46), grin: F(66), ross1: F(100), mom2: F(150), flat: F(196), lick: F(222), smug: F(255), tape: F(281), sign: F(310), glasses: F(344), darts: F(362), walk: F(392), drop: F(428), wagon: F(458), row: F(504),
  finger: F(550), cups: F(588), zap: F(608), flip: F(626), blur: F(640), feet: F(656), clock: F(672), slam: F(700), shock: F(752), wipe: F(805),
};
export const KEY_FRAMES: { label: string; f: number }[] = [
  ...SHOT_IDS.flatMap((id) => { const s = SHOTS.find((x) => x.id === id)!, f0 = Math.round(s.t0 * FPS), f1 = Math.round(s.t1 * FPS); return [kf("first", f0 / FPS), kf("named moment", SHEET_T[id]), kf("last", (f1 - 1) / FPS)]; }),
];
