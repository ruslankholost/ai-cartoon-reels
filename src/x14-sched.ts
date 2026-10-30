// The timeline and the acting of x14 "Four Stars" (src/X14.tsx, docs/x14-four-stars.md, the build spec). Pure data and arithmetic, the shape of src/x13-sched.ts: every number is a function of the frame, of the eleven voice
// takes in public/x14/timings.json and of the mouth loudness in src/amp-x14.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the
// gaps of episodes/x14.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: only the frames. Its cuts are the voices' (the table read is 25.65 s to the end of line 11); a half second is a frame on one side or the other (shot 4 starts a frame before FOUR, shot 7 on the frame
// before ONE), the shot of the latte is on the 0.5 s after the mug lands, and the reel runs 0.25 s past line 11 (the grin falls apart, the eye twitches) and loops into the DING. 22 shots, none over 2.4 s, the same framing never twice in a row,
// a new picture at least every 0.6 s in the first 3 s (cuts at 0, 0.6, 1.1, 1.43, the two steps of shot 4 at 1.97 and 2.53, the cut at 3.07).
import timings from "../public/x14/timings.json" with { type: "json" };
import amps from "./amp-x14.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x13-sched.ts): take n of public/x14/timings.json sits at tableRead.cues[n].at
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

// ── the cuts: frame numbers. The 22 shots. Speech on the reel's clock (first sound .. last word): 1 ROSS 1.50-2.73 (FOUR 1.46, STARS?! 1.97), 2 CHUCK 3.13-4.74 (Four 3.22, GOOD! 4.22), 3 ROSS 5.04-7.50 (Four 4.98, stars 5.31, is 5.75,
// ONE 6.04, star 6.33, with 6.62, MANNERS! 7.01), 4 CHUCK 7.90-9.18, 5 ROSS 10.18-11.24 (On 10.23), 6 CHUCK 12.34-13.34 (Four. 12.56), 7 ROSS 14.34-15.80 (JUST 14.38, PRESS 14.76, FIVE!! 15.20), 8 CHUCK 16.30-16.94,
// 9 ROSS 19.24-20.51 (FIVE 19.29, STARS!! 19.70), 10 CHUCK 21.11-23.42 (Great 21.10, coffee... 21.39, owner 22.41, tackled 22.70, me. 23.14), 11 ROSS 24.52-25.35 (THREE?! 24.66)
const F = (n: number) => n / FPS;
const S = {
  card: F(0), snap: F(18), slam: F(33), shout: F(43), thumbs: F(92), stab: F(147), one: F(181), shrug: F(232), vein: F(278), present: F(294), latte: F(344), mug: F(361), bulge: F(411), kneel: F(426), good: F(481), corks: F(516),
  dive: F(538), jab: F(558), floor: F(572), wreck: F(624), review: F(669), grin: F(733),
};
export const T_END = F(777);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "card", "snap", "slam", "shout", "thumbs", "stab", "one", "shrug", "vein", "present", "latte", "mug", "bulge", "kneel", "good", "corks", "dive", "jab", "floor", "wreck", "review", "grin",
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
export const DING_T = F(1);                                  // shot 1: the review slides in
export const STAR_T = [F(4), F(7), F(10), F(13)];            // shot 1: the four gold stars pop in, one by one
export const CLUNK_T = F(16);                                // shot 1: the fifth slot stays an empty outline (a dull clunk)
export const SNAP_T = F(22);                                 // shot 2: Ross's face snaps purple (the cut is frame 18: the service smile is up for four frames first)
export const SLAM_T = F(34), CLINK_T = F(35);                // shot 3: the phone slams onto the counter, the two cups jump
export const PUNCH_T = F(59), PUNCH2_T = F(76);              // shot 4: the punch-in on STARS?! (the word starts at 1.97), a second step in on the held scowl (so that the first 3 s change picture at least every 0.6 s)
export const THUMBS_T = F(95);                               // shot 5: the thumbs pop up on "Four"
export const STAB_T = F(181), STEP_T = F(210);               // shots 6-7: the stab on ONE (6.04), the hard step in on MANNERS! (7.01)
export const VEIN_T = F(279);                                // shot 9: the vein pops and throbs
export const LAND_T = F(296);                                // shot 10: the mug lands on the counter top
export const CHIME_T = F(345);                               // shot 11: the sparkle on the foam face
export const SLURP_T = F(363);                               // shot 12: the gulp
export const BULGE_T = F(412);                               // shot 13: the eyes bulge
export const CREAK_T = F(426), CHOIR_T = F(428);             // shot 14: the box opens, the star appears in it with the choir
export const CORK_T = [F(518), F(520)], KETTLE_T = F(522);   // shot 16: the plugs shoot out, the steam screams
export const WHOOSH_T = F(539), CRASH_T = F(554);            // shot 17: the dive, the crash
export const PRESS_T = F(563);                               // shot 18: the thumb lands on the fifth star (DING, "Review updated"); it starts to rise at the cut
export const POPPER_T = F(573);                              // shot 19: the popper and the fanfare, the confetti
export const TAPS_T = [F(625), F(671)];                      // shots 20 and 21: the thumb typing
export const OUT_T = [F(687), F(696)];                       // shot 21: the fifth star goes out, then the fourth (a dull clunk each)
export const DING3_T = F(710);                               // shot 21: "Review updated"
export const TWITCH_T = F(766);                              // shot 22: the eye starts to twitch (an even frame: the twitch runs on twos)

// ── the review card on the phone (src/x14-props.tsx draws it): a function of the frame. `slide` how far the card is in (0 above the screen, 1 in place; it overshoots), `stars[i]`: how big star i's gold is (0 none: an outline,
// 1 full, a frame or two above 1 as it pops), `out[i]` how far it has gone out again, `jolt[i]` the outline's dull jolt (px of design), `lines` the review's text (words typed so far), `caret` the blinking cursor, `toast` the pop of
// "Review updated" (0 none .. 1), `flash` the white flash of a star popping, `burst` its rays
export type Card = { slide: number; stars: number[]; out: number[]; jolt: number[]; lines: string[]; caret: boolean; toast: number; burst: number[] };
const REVIEW1 = "Best coffee of my life!", REVIEW2 = ["Great", "coffee.", "Owner", "tackled", "me."];
const starPop = (a: number) => (a < 0 ? 0 : a < 1 / FPS ? 0.55 + 0.95 * (a * FPS) : a < 5 / FPS ? 1.5 - 0.5 * ease((a - 1 / FPS) / (4 / FPS)) + 0.06 * Math.sin((a - 1 / FPS) * 60) * Math.exp(-(a - 1 / FPS) / 0.08) : 1);
const wrap = (words: string[], max: number): string[] => {
  const lines: string[] = [];
  let cur = "";
  for (const w of words) { if (cur && (cur + " " + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
  if (cur) lines.push(cur);
  return lines;
};
const slideP = (t: number) => 1 - Math.pow(1 - clamp01((t + 0.01) / 0.2), 3);   // (the card's rest is the design's y 112; it comes from 380 units above)
export function cardAt(f: number): Card {
  const t = f / FPS, ON = [...STAR_T, PRESS_T], OFF: (number | null)[] = [null, null, null, OUT_T[1], OUT_T[0]];
  const stars = ON.map((t0) => starPop(t - t0)), out = OFF.map((o) => (o === null ? 0 : ease((t - o) / 0.12)));
  const jolt = [0, 1, 2, 3, 4].map((i) => {
    const t0 = i === 4 ? (t >= OUT_T[0] ? OUT_T[0] : CLUNK_T) : i === 3 ? OUT_T[1] : null;
    return t0 !== null && t >= t0 ? 7 * Math.exp(-(t - t0) / 0.07) * Math.cos((t - t0) * 50) : 0;
  });
  const l10 = LINE(10), typed = l10.words.filter((w) => t >= w.t - 1e-6).length;
  const words = typed > 0 ? REVIEW2.slice(0, typed) : REVIEW1.split(" ");
  const toast = Math.max(popP(t, PRESS_T + 0.1, 0.5, 40) * (t < PRESS_T + 0.9 ? 1 : 0), popP(t, DING3_T, 0.5, 40) * (t >= DING3_T ? 1 : 0));
  const burst = ON.map((t0) => (t >= t0 && t < t0 + 0.16 ? (t - t0) / 0.16 : -1));
  return { slide: slideP(t), stars, out, jolt, lines: wrap(words, typed > 0 ? 14 : 13), caret: typed > 0 && Math.floor(t * 3) % 2 === 0, toast: toast > 0.02 ? toast : 0, burst };
}

// ── the shake and the camera
/** a decaying shake of the camera (frame px): the pops, the slam, the stab, the step, the corks, the crash, the thumb */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, DING_T, 4, 0.05), ...STAR_T.map((t0) => shakeOf(t, t0, 4, 0.05)), shakeOf(t, SNAP_T, 14, 0.07), shakeOf(t, SLAM_T, 26, 0.09), shakeOf(t, CLINK_T, 6, 0.05), shakeOf(t, PUNCH_T, 18, 0.08), shakeOf(t, PUNCH2_T, 14, 0.07),
    shakeOf(t, THUMBS_T, 6, 0.06), shakeOf(t, STAB_T, 12, 0.07), shakeOf(t, STEP_T, 20, 0.08), shakeOf(t, VEIN_T, 5, 0.06), shakeOf(t, LAND_T, 8, 0.06), shakeOf(t, BULGE_T, 8, 0.06), shakeOf(t, CORK_T[0], 6, 0.05), shakeOf(t, CORK_T[1], 6, 0.05),
    shakeOf(t, CRASH_T, 30, 0.12), shakeOf(t, PRESS_T, 9, 0.06), shakeOf(t, POPPER_T, 10, 0.07), shakeOf(t, OUT_T[0], 4, 0.05), shakeOf(t, OUT_T[1], 4, 0.05), shakeOf(t, DING3_T, 4, 0.05)];
  const kettle = t >= KETTLE_T && inShot(f, "corks") ? [2.2 * Math.sin(t * 190), 1.6 * Math.cos(t * 150)] : [0, 0];
  return [parts.reduce((s, p) => s + p[0], kettle[0]), parts.reduce((s, p) => s + p[1], kettle[1])];
}
/** the camera's zoom about the shot's focus: the shot's own framing is in the scene, this is a slow push in the holds, a pulse on the hits and the two hard steps in (the punch on STARS?!, the step on MANNERS!) */
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "card": return 1 + 0.03 * s.u;
    case "snap": return 1 + 0.03 * s.u + pulse(SNAP_T, 0.07);
    case "slam": return 1 + 0.02 * s.u + pulse(SLAM_T, 0.06);
    case "shout": return 1 + 0.02 * s.u + pulse(PUNCH_T, 0.07, 0.09) + pulse(PUNCH2_T, 0.05, 0.09);   // (the punch-ins are cuts of framing inside the shot, src/x14-scenes.tsx FR4: the camera only rocks on each)
    case "thumbs": return 1 + 0.03 * s.u + pulse(THUMBS_T, 0.04);
    case "stab": return 1 + 0.03 * s.u;
    case "one": return 1 + 0.03 * s.u + pulse(STAB_T, 0.05, 0.09) + (t >= STEP_T ? 0.16 : 0) + pulse(STEP_T, 0.07, 0.09);
    case "shrug": return 1 + 0.04 * s.u;
    case "vein": return 1 + 0.04 * s.u + pulse(VEIN_T, 0.04);
    case "present": return 1 + 0.03 * s.u + pulse(LAND_T, 0.03);
    case "latte": return 1 + 0.03 * s.u;
    case "mug": return 1 + 0.03 * s.u;
    case "bulge": return 1 + 0.04 * s.u + pulse(BULGE_T, 0.05);
    case "kneel": return 1 + 0.03 * s.u;
    case "good": return 1 + 0.04 * s.u;
    case "corks": return 1 + 0.03 * s.u + pulse(CORK_T[0], 0.03) + pulse(CORK_T[1], 0.03);
    case "dive": return 1;                                          // (no push: the flying Ross is a canvas of its own, src/x14-scenes.tsx)
    case "jab": return 1 + 0.03 * s.u + pulse(PRESS_T, 0.04);
    case "floor": return 1 + 0.03 * s.u + pulse(POPPER_T, 0.04);
    case "wreck": return 1 + 0.03 * s.u;
    case "review": return 1 + 0.02 * s.u;
    case "grin": return 1 + 0.04 * s.u;
    default: return 1;
  }
};

// ── Ross: the head picture (plugs in, the left one gone, both gone), the purple snap, the vein, the bulge, the twitching eye, the steam
/** both plugs in (to the pops), only the right one gone (between the two flicks), both gone (from the second cork to the end of the reel; the loop starts with them in) */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** how purple his face is (0 as painted .. 1 furious): from the snap through the statement (shots 2, 4, 6 and 7), as painted again by the vein (shot 9) */
export function purpleAt(f: number): number {
  const t = f / FPS;
  switch (shotId(f)) {
    case "snap": return t < SNAP_T ? 0 : Math.min(1, 0.55 + 0.45 * ease((t - SNAP_T) / 0.1));
    case "shout": case "stab": case "one": return 1;
    default: return 0;
  }
}
/** the vein on his forehead (0 none .. 1.15 popped, throbbing while he talks): from VEIN_T, kept through the blow-up until the dive */
export function veinAt(f: number): number {
  const t = f / FPS;
  if (t < VEIN_T || t >= S.dive) return 0;
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  return Math.min(1.15, popP(t, VEIN_T, 0.45, 40)) * (t > VEIN_T + 0.4 ? throb : 1);
}
/** the bulge of his eyes (0 none .. 1.1): the eyes of the picture grow into round white balls with tiny pupils, in shot 13 (from BULGE_T) and again on the first cork */
export function bulgeAt(f: number): number {
  const t = f / FPS, id = shotId(f);
  if (id === "bulge") return Math.min(1.1, popP(t, BULGE_T, 0.5, 38));
  if (id === "corks") return Math.min(1.1, popP(t, CORK_T[0], 0.5, 38));
  return 0;
}
/** a twitching lid (fraction of the eye): his right eye in the last shot, from TWITCH_T, a quick flick every 0.4 s, the other eye a third of a cycle behind */
export function twitchAt(f: number, eye: 0 | 1): number {
  const t = f / FPS;
  if (!inShot(f, "grin") || t < TWITCH_T - 1e-6) return 0;
  const k = (twos(f) - Math.round(TWITCH_T * FPS) + (eye === 0 ? 0 : 4)) % 12;
  return k === 0 ? 0.7 : k === 2 ? 0.3 : 0;
}
/** the steam out of his ear holes: 0 none .. 2.8 thick. The jet starts on the kettle (shot 16) and screams to the end of the shot */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t < KETTLE_T || t > S.dive) return 0;
  return 1.5 + 1.3 * ease((t - KETTLE_T) / 0.3);
}

// ── Chuck: the thumbs pop, the gulp (the head goes back, the foam mustache is there after it), the dizzy stars, the typing
/** the pop of the thumbs: 0 before, a spring after (the whole figure squashes and springs on it) */
export const thumbsPop = (f: number): number => popP(f / FPS, THUMBS_T, 0.4, 42);
/** the gulp of shot 12: 0 .. 1 how far the head is back (it goes back on the slurp's rise and comes forward again) */
export const gulpAt = (f: number): number => { const t = f / FPS; return ease((t - (SLURP_T - 0.12)) / 0.1) * (1 - ease((t - (SLURP_T + 0.06)) / 0.12)); };
/** the foam mustache: it is hidden under a patch of skin until the gulp is over */
export const mustacheOn = (f: number): boolean => f / FPS >= SLURP_T + 0.12 - 1e-6;

// ── the confetti: from POPPER_T on (shots 19, 20 and 22), a burst of the popper first, then the steady fall of the rest of the reel; and the dizzy stars round Chuck's head in 19
export const confettiOn = (f: number): boolean => f / FPS >= POPPER_T - 1e-6 && inShot(f, "floor", "wreck", "grin");

// ── the voices: the mouth, on twos, one frame ahead of the sound; closed whenever that character is not speaking
const lineOf = (who: Who, f: number, before = 0.1, after = 0.05) => LINES.find((q) => q.who === who && f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (who: Who, f: number) => !!lineOf(who, f);
export const speakingLine = (who: Who, f: number) => lineOf(who, f);
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const SMALL = new Set([6, 8, 10]);  // said small: Chuck's flat "...Four.", his polite "...I'm good." and the typed "Great coffee... owner tackled me." (the mouth is never wider than mid)
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
const LINE_MOOD: Record<number, Mood> = { 1: "furious", 2: "neutral", 3: "furious", 4: "tight", 5: "tight", 6: "flat", 7: "impatient", 8: "polite", 9: "neutral", 10: "flat", 11: "impatient" };
/** the mood of a character's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (l) return LINE_MOOD[l.n];
  if (who === "ROSS") {
    switch (id) {
      case "snap": return f / FPS < SNAP_T ? "tight" : "furious";                    // the service smile, then the snap
      case "shout": case "stab": case "one": return "furious";
      case "kneel": return "defeated";                                              // the pleading frown
      case "corks": return "hiss";                                                  // gritted teeth under the steam
      case "dive": return "furious";
      case "floor": return "tight";                                                 // the win: a grin from ear to ear until he shouts
      case "grin": return f / FPS < LINE(11).first - 0.05 ? "tight" : "defeated";   // the grin, then it falls apart
      default: return "tight";                                                      // the service smile (the vein, the mug, the bulge)
    }
  }
  switch (id) {
    case "thumbs": return "polite";
    case "shrug": return "polite";
    case "good": return "polite";
    case "wreck": return "resigned";
    default: return "flat";
  }
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x13-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [3.0, 6], 2: [0.6, 1.0], 3: [2.2, 4], 4: [0.6, 1.0], 5: [1.4, 2], 6: [0.5, 1], 7: [2.6, 5], 8: [0.5, 1], 9: [3.4, 7], 10: [0.5, 1], 11: [3.0, 6] };
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

// ── blinks: every 2.5-4.5 s, 3 frames, at hashed times; none that touches a cut. Ross's service smile does not blink in the snap and the grin, nothing blinks in the shots of the blow-up
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3].some((f) => CUT_F.has(f)));
}
export const BLINKS = { ross: blinkStarts(7), chuck: blinkStarts(17) };
const NO_BLINK_ROSS: ShotId[] = ["snap", "shout", "stab", "one", "vein", "bulge", "kneel", "corks", "dive", "grin"];
const NO_BLINK_CHUCK: ShotId[] = ["floor", "wreck", "good"];
export const blinkOf = (who: keyof typeof BLINKS, f: number) => {
  if (who === "chuck" && inShot(f, ...NO_BLINK_CHUCK)) return 0;
  if (who === "ross" && inShot(f, ...NO_BLINK_ROSS)) return 0;
  for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s). A peak that would
// fall before the reel's start skips into the clip instead of starting early
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "ding", t: DING_T, sfx: "ding", db: -4 },
  ...STAR_T.map((t, i): Hit => ({ id: `pop${i + 1}`, t, sfx: "pop", db: -3 })),
  { id: "clunk", t: CLUNK_T, sfx: "clunk", db: -4 },
  { id: "snap", t: SNAP_T, sfx: "snap", db: -2 },                       // the face snapping purple (the clip of "Cold Lips": its peak on the frame of the pop)
  { id: "slam", t: SLAM_T, sfx: "slam", db: -3 },
  { id: "clink", t: CLINK_T, sfx: "clink", db: -6 },                    // the two cups jumping
  { id: "thumbs", t: THUMBS_T, sfx: "pop", db: -6 },
  { id: "throb", t: VEIN_T, sfx: "throb", db: -4 },                     // the vein
  { id: "land", t: LAND_T, sfx: "clink", db: -6 },                      // the mug on the counter top
  { id: "chime", t: CHIME_T, sfx: "chime", db: -8 },                    // the sparkle on the foam face
  { id: "slurp", t: SLURP_T, sfx: "slurp", db: -5 },
  { id: "boing", t: BULGE_T, sfx: "boing", db: -10 },                   // the eyes bulge
  { id: "creak", t: CREAK_T, sfx: "creak", db: -8, start: true, len: 0.9, fade: 0.3 },
  { id: "choir", t: CHOIR_T, sfx: "choir", db: -13, start: true },
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -8 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -15, start: true, from: 0.75, len: 0.75, fade: 0.25 },
  { id: "whoosh", t: WHOOSH_T, sfx: "whoosh", db: -8 },
  { id: "crash", t: CRASH_T, sfx: "crash", db: -3 },
  { id: "ding2", t: PRESS_T, sfx: "ding", db: -4 },                      // the fifth star filled, "Review updated"
  { id: "popper", t: POPPER_T, sfx: "popper", db: -16, start: true },
  { id: "fanfare", t: POPPER_T, sfx: "fanfare", db: -9 },
  { id: "taps1", t: TAPS_T[0], sfx: "taps", db: -6 },
  { id: "taps2", t: TAPS_T[1], sfx: "taps", db: -11 },
  ...OUT_T.map((t, i): Hit => ({ id: `out${i + 1}`, t, sfx: "clunk", db: -9 })),
  { id: "ding3", t: DING3_T, sfx: "ding", db: -4 },
];

// ── sound cues for the mix (scripts/x14-cues.mts): no bed, the room is quiet
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

// ── captions: the shape of src/x13-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through is captioned twice: the part up to the cut, and after the
// cut the sentence from that word on. `emph`: the words that stand out (the statement's ONE and MANNERS!, STARS?!, FIVE!!)
export type Cap = { who: Who; n: number; text: string; t0: number; t1: number; w0: number; w1: number; words: { d: string; t: number; emph: boolean }[] };
const EMPH: Record<number, number[]> = { 1: [1], 3: [3, 6], 7: [2], 9: [0], 11: [] };   // line n: the indexes of its words that stand out
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
    const mk = (ws: Word[], t0: number, t1: number, w0: number, w1: number): Cap => ({ who: l.who, n: l.n, text: ws.map(say).join(" "), t0, t1, w0, w1, words: ws.map((w) => ({ d: say(w), t: w.t, emph: (EMPH[l.n] ?? []).includes(l.words.indexOf(w)) })) });
    chunks.forEach((ws) => {
      const t0 = (ws === chunks[0] ? Math.min(l.first, ws[0].t) : ws[0].t) - 0.04, t1 = stretchEnd(l, ws[ws.length - 1].e) + 0.25, x = ws.findIndex((w) => cuts.some((c) => c > w.t + 0.04 && c < w.e - 0.04));
      if (x < 0) { caps.push(mk(ws, t0, t1, ws[0].t, ws[ws.length - 1].e)); return; }
      const c = cuts.find((q) => q > ws[x].t + 0.04 && q < ws[x].e - 0.04)!;
      caps.push(mk(ws.slice(0, x + 1), t0, c, ws[0].t, ws[x].e));
      caps.push(mk(ws.slice(x), c, t1, c, ws[ws.length - 1].e));
    });
  }
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (s) { c.t0 = Math.max(c.t0, s.t0); c.t1 = Math.min(c.t1, s.t1); } });
  return caps;
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
/** where the captions sit (frame y px): one band, out of the bottom 400 px (Instagram's), except where something is in it (a face, the phone, the ring box: the shots set their own) */
export const CAP_BAND: [number, number] = [1295, 1455], CAP_BAND_ROSS: [number, number] = [1225, 1485];   // Ross's are bigger (up to 130 px, two lines): a taller band, still above the bottom 400 px (y 1520)
// shout and stab: above the heads (the phone stands on the counter where the caption would be, and in the punch-in the face fills the frame); kneel: under the ring box and his hands (the box's bottom edge is at about y 1258); floor: under Chuck's face; grin: under Ross's chin; review: above the phone, which fills the rest of the frame
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { shout: [200, 440], stab: [200, 440], kneel: [1290, 1495], floor: [1380, 1492], grin: [1290, 1495], review: [240, 440] };
export const capBand = (id: ShotId, ross = false): [number, number] => CAP_ELSEWHERE[id] ?? (ross ? CAP_BAND_ROSS : CAP_BAND);
/** the biggest size of a Ross caption in the shot (px): the boldest in the reel (130) where the band is tall, smaller where the band is */
const CAP_MAX: Partial<Record<ShotId, number>> = { kneel: 96, floor: 118, grin: 120 };
export const capMax = (id: ShotId): number => CAP_MAX[id] ?? 130;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is)
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${sh.i + 1} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("start", 0.0), kf("ding", 0.07), kf("pop", 0.17), kf("pop", 0.27), kf("pop", 0.37), kf("pop", 0.47), kf("clunk", 0.57), kf("", 0.65), kf("calm", 0.7), kf("snap", 0.77), kf("", 0.95), kf("", 1.1), kf("slam", 1.13), kf("", 1.2), kf("", 1.3),
  kf("", 1.45), kf("", 1.8), kf("stars", 2.0), kf("", 2.6), kf("", 3.0), kf("thumbs", 3.07), kf("pop", 3.2), kf("", 3.8), kf("", 4.5), kf("", 4.95), kf("", 5.5), kf("one", 6.0), kf("stab", 6.1), kf("", 6.6), kf("step", 7.05), kf("", 7.5),
  kf("", 7.75), kf("", 8.5), kf("", 9.2), kf("vein", 9.3), kf("", 9.6), kf("", 9.82), kf("land", 9.9), kf("", 10.5), kf("", 11.2), kf("", 11.47), kf("chime", 11.55), kf("", 11.95), kf("", 12.05), kf("gulp", 12.1), kf("", 12.5), kf("", 13.2),
  kf("", 13.7), kf("bulge", 13.8), kf("", 14.1), kf("", 14.2), kf("star", 14.3), kf("", 15.0), kf("", 15.7), kf("", 16.05), kf("", 16.5), kf("", 17.1), kf("", 17.2), kf("cork", 17.3), kf("jet", 17.5), kf("", 17.85), kf("", 17.95),
  kf("whoosh", 18.1), kf("", 18.3), kf("crash", 18.47), kf("", 18.55), kf("", 18.62), kf("hover", 18.68), kf("press", 18.77), kf("updated", 18.9), kf("", 19.05), kf("popper", 19.1), kf("", 19.3), kf("", 19.8), kf("", 20.5), kf("", 20.8),
  kf("", 21.2), kf("", 21.8), kf("", 22.3), kf("", 22.6), kf("", 22.95), kf("out", 23.0), kf("out", 23.25), kf("", 23.5), kf("updated", 23.75), kf("", 24.2), kf("", 24.45), kf("", 24.7), kf("", 25.1), kf("twitch", 25.5), kf("last", 25.89),
];
