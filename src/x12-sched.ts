// The timeline and the acting of x12 "Speak to the Manager" (src/X12.tsx, docs/x12-speak-to-the-manager.md, the build spec). Pure data and arithmetic, the shape of src/x11-sched.ts: every number is a function of the frame, of the ten voice
// takes in public/x12/timings.json and of the mouth loudness in src/amp-x12.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the
// gaps of episodes/x12.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: its times are older than the voices (line 10 ends at 19.61 s, the table read is 19.91 s), so the shots keep the spec's order and their relation to the words and move to the voices; the reel is
// 21.2 s (1.3 s after the last word: the halo droops, Ross sinks, the camera pushes in on the empty counter and its bell). The spec's shot 2 is cut in three (the face snapping, "to the", the punch-in on MANAGER: each a step closer), shot 10 in two (the head going back,
// then the scream) and the sip gets its own 0.5 s: 20 shots, none over 2.4 s, the same framing never twice in a row, a new picture at least every 0.6 s in the first 3 s.
import timings from "../public/x12/timings.json" with { type: "json" };
import amps from "./amp-x12.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x11-sched.ts): take n of public/x12/timings.json sits at tableRead.cues[n].at
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

// ── the cuts: frame numbers. The 20 shots. Speech on the reel's clock (first sound .. last word): 1 CHUCK 0.45-2.12 (I 0.55, MANAGER! 1.62), 2 ROSS 2.62-3.70 (...Manager. 2.84), 3 CHUCK 3.84-5.07 (OWNER! 4.54), 4 ROSS 5.62-6.31 (...Owner. 5.95),
// 5 CHUCK 6.61-8.15 (SAME 7.19, GUY! 7.59), 6 ROSS 8.35-9.85 (...Small 8.69, business. 8.88), 7 CHUCK 10.20-12.10 (I want to speak 10.30-10.94, to 11.35, GOD! 11.55), 8 ROSS 13.40-14.40 (...Speaking. 13.64),
// 9 CHUCK 14.65-16.26 (...My 14.71, latte's 15.01, cold. 15.64), 10 CHUCK 18.16-19.61 (...Can 18.23, your 18.89, manager? 19.29)
const F = (n: number) => n / FPS;
const S = {
  bell: F(0), snap: F(13), build: F(32), manager: F(49), drop: F(66), tie: F(78), owner: F(113), drop2: F(153), crown: F(165), point: F(197), flat: F(246), wantGod: F(298), scream: F(340), god: F(363), speaking: F(400), latte: F(437),
  steam: F(490), sip: F(528), cantI: F(544), droop: F(591),
};
export const T_END = F(636);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "bell", "snap", "build", "manager", "drop", "tie", "owner", "drop2", "crown", "point", "flat", "wantGod", "scream", "god", "speaking", "latte", "steam", "sip", "cantI", "droop",
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
export const DING_T = [F(2), F(6), F(10)];               // shot 1: the mitten slaps the bell three times (the dings of src/sfx x10-bell)
export const SNAP_T = F(16);                             // shot 2: the face snaps from calm to purple, a frame before "I" (0.55 s)
export const MANAGER_T = S.manager;                      // shot 3: the punch-in on "MANAGER!" (the word starts at 1.62 s)
export const FALL1_T = [F(68), F(72)];                   // shot 4: Ross drops out of sight (the whoosh's peak is the middle of the fall)
export const POP1_T = [F(79), F(81)];                    // shot 5: he pops up in the tie: the spring starts, and first reaches his full height (the pop's peak)
export const FALL2_T = [F(155), F(159)];                 // shot 7: the second drop
export const POP2_T = [F(166), F(168)];                  // shot 8: the crown and the cape (the pop, the fanfare)
export const TWITCH_T = F(176);                          // shot 8: his eye starts to twitch
export const SIGH_T = F(251);                            // shot 10: the flat sigh (his first sound is at 8.35 s)
export const THUNDER_T = F(364);                         // shot 13: the flash and the thunder (the shot starts at 12.10 s, the last word of line 7 ends at 12.10)
export const CRACK_T0 = F(373) - 0.24;                  // the crack's sound starts (0.007 s before frame 366): small cracks 0.05 and 0.17 s later, the big one at 0.24 s (on frame 373), another at 0.29 s, the last split at 0.46-0.55 s
export const ROPE_T = [F(371), F(380)];                  // Ross comes down on the rope: leaves the top of the frame, the rope goes taut (he bounces)
export const CHOIR_T = F(374);                           // the choir comes in
export const CORK_T = [F(492), F(494)], KETTLE_T = F(495);   // shot 16: the plugs flick out, the steam screams
export const CUP_STEAM_T = F(503);                       // the cup in the jet starts to steam
export const SIP_T = [F(528), F(533), F(536), F(540), F(544)];   // shot 17: the cup comes up (528-533), the sip (536 slurp), the cup comes down (540-544)
export const DROOP_T = [F(593), F(606), F(618)];         // shot 19: the halo starts to droop on its wire, its lowest point, still
export const SINK_T = [F(612), F(627)];                  // Ross sinks below the counter

// ── Ross: which body, the plugs, the twitching eye
export type RossBody = "apron" | "tie" | "king" | "god";
export const rossBody = (f: number): RossBody => { switch (shotId(f)) { case "drop": return "apron"; case "tie": case "drop2": return "tie"; case "crown": case "flat": return "king"; default: return "god"; } };
/** which head picture: both plugs in, only one gone (between the two flicks), both gone (to the end: he is plugless when he sinks; the next cycle starts with them in) */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** his twitching eye (the lid of his right eye of the picture jumps down and back on twos): from TWITCH_T to the end of the shot, a little before each stressed beat */
export function twitchAt(f: number): number {
  const t = f / FPS;
  if (t < TWITCH_T || !inShot(f, "crown", "point")) return 0;
  const k = twos(f) % 14;
  return k === 0 || k === 6 ? 0.6 : k === 2 || k === 8 ? 0.3 : 0;
}
/** how far down behind the counter Ross is: 0 standing .. 1 out of sight (the scenes turn it into px). The drops fall in ~4 frames (an anticipation: a small rise first), the pops are springs that overshoot */
export function rossDown(f: number): number {
  const t = f / FPS, id = shotId(f);
  const fall = (T: number[]) => (t < T[0] ? 0 : t >= T[1] ? 1 : (t - T[0]) / (T[1] - T[0]));
  switch (id) {
    case "drop": { const u = fall(FALL1_T); return u <= 0 ? 0 : u >= 1 ? 1 : u * u * (1.2 - 0.2 * u) - 0.08 * Math.sin(Math.PI * Math.min(1, u * 2)) * (u < 0.5 ? 1 : 0); }
    case "tie": return 1 - popP(t, POP1_T[0], 0.5, 40);
    case "drop2": { const u = fall(FALL2_T); return u <= 0 ? 0 : u >= 1 ? 1 : u * u * (1.2 - 0.2 * u) - 0.08 * Math.sin(Math.PI * Math.min(1, u * 2)) * (u < 0.5 ? 1 : 0); }
    case "crown": return 1 - popP(t, POP2_T[0], 0.5, 40);
    case "droop": return ease((t - SINK_T[0]) / (SINK_T[1] - SINK_T[0]));
    default: return 0;
  }
}
/** the rope (shot 13): `y` the frame px that Ross hangs above (negative) or below (positive: the rope stretches) his standing place, `taut` 0..1 how much the rope is pulled (it shows its sag before) */
export function ropeAt(f: number): { y: number; taut: number } {
  const t = f / FPS;
  if (t < ROPE_T[0]) return { y: -1500, taut: 0 };
  if (t < ROPE_T[1]) { const u = (t - ROPE_T[0]) / (ROPE_T[1] - ROPE_T[0]); return { y: -1500 * (1 - u * u), taut: u }; }
  const a = t - ROPE_T[1];
  return { y: 70 * Math.exp(-a / 0.16) * Math.sin((Math.PI * 2 * a) / 0.34), taut: 1 };
}
/** the cardboard halo on its wire: its offset above the head in head px (`dy`, `dx`) and its tilt in degrees; it bobs all the time (a spring that ringed on the rope's stop, then a slow nod), and from DROOP_T it droops: it leans, slides down and sideways */
export function haloAt(f: number): { dx: number; dy: number; rot: number; droop: number } {
  const t = f / FPS, a = t - ROPE_T[1];
  const ring = a > 0 ? Math.exp(-a / 0.55) : 0, nod = Math.sin((Math.PI * 2 * t) / 0.9);
  let dx = 7 * Math.sin((Math.PI * 2 * t) / 1.3), dy = 26 * ring * Math.sin((Math.PI * 2 * a) / 0.36) + 6 * nod, rot = 6 * ring * Math.sin((Math.PI * 2 * a) / 0.42 + 1) + 3.2 * Math.sin((Math.PI * 2 * t) / 1.1 + 0.6);
  let droop = 0;
  if (t >= DROOP_T[0]) {
    droop = ease((t - DROOP_T[0]) / (DROOP_T[1] - DROOP_T[0]));
    const still = ease((t - DROOP_T[1]) / (DROOP_T[2] - DROOP_T[1]));
    const wob = Math.sin((Math.PI * 2 * (t - DROOP_T[1])) / 0.3) * Math.exp(-(t - DROOP_T[1]) / 0.25) * (t > DROOP_T[1] ? 1 : 0);
    dx = lerp(dx, 70, droop) * (1 - 0.2 * still); dy = lerp(dy, -62, droop) + 8 * wob; rot = lerp(rot, 34, droop) + 5 * wob;   // (-62: nearly on his hair)
  }
  return { dx, dy, rot, droop };
}
/** the ceiling (shot 13): how far the crack has grown 0..1 in stages on the sound of the clip (its cracks at 0.05, 0.17, 0.24, 0.29 and 0.46 s), how far the light has opened 0..1 (the last split), and the age of the plaster bits */
export function crackAt(f: number): { len: number; open: number; flash: number } {
  const t = f / FPS - CRACK_T0, step = (a: number, b: number, u: number) => ease((u - a) / (b - a));
  const len = t < 0 ? 0 : Math.max(0.28 * step(0.04, 0.07, t), 0.62 * step(0.16, 0.2, t), 1 * step(0.23, 0.28, t));
  const open = t < 0.28 ? 0 : 0.35 * step(0.28, 0.34, t) + 0.65 * step(0.46, 0.58, t);
  const th = f / FPS - THUNDER_T;
  return { len, open, flash: Math.max(th < 0 ? 0 : 0.95 * Math.exp(-th / 0.055), t > 0.23 && t < 0.3 ? 0.5 : 0, t > 0.46 && t < 0.5 ? 0.4 : 0) };
}
/** the steam out of his ear hole: 0 none .. 2.8 thick. The jet starts on the kettle (shot 16) and screams to the end of the shot */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t < KETTLE_T || t > S.sip) return 0;
  return 1.5 + 1.3 * ease((t - KETTLE_T) / 0.3);
}
/** the steam over Chuck's cup: 0 none .. 1, from the moment the jet reaches it; it stays in the next shots (the cup is warm) */
export function cupSteam(f: number): number {
  const t = f / FPS;
  if (t < CUP_STEAM_T) return 0;
  return ease((t - CUP_STEAM_T) / 0.45);
}

// ── Chuck: the face snaps (calm -> purple), how purple he is, the slaps, the hits
/** how purple his face is (0 as painted .. 1 furious): calm in shot 1 and the first 3 frames of shot 2, then purple through "I want to speak to GOD!"; calm again from "...My latte's cold." */
export function purpleAt(f: number): number {
  const t = f / FPS, id = shotId(f);
  switch (id) {
    case "bell": return 0;
    case "snap": return t < SNAP_T ? 0 : Math.min(1, 0.55 + 0.45 * ease((t - SNAP_T) / 0.1));
    case "build": case "manager": case "owner": case "wantGod": case "scream": return 1;
    case "point": return 0.85;
    default: return 0;
  }
}
/** shot 1: the whole figure goes up on the wind-up and down on each slap (px of the frame, + is down): a cosine at the rhythm of the dings (4 frames), still raised at frame 0 and down on the third slap, then it settles */
export function slapAt(f: number): number {
  const t = f / FPS;
  if (!inShot(f, "bell")) return 0;
  const A = 30, per = DING_T[1] - DING_T[0];
  return t <= DING_T[2] ? A * Math.cos((Math.PI * 2 * (t - DING_T[0])) / per) : A * Math.exp(-(t - DING_T[2]) / 0.06) * Math.cos(((t - DING_T[2]) / 0.06) * 0.6);
}
/** the bell's press (0..1) and its ring (decaying) on each ding */
export const bellPress = (f: number): number => { const t = f / FPS; return DING_T.reduce((s, t0) => Math.max(s, t >= t0 && t < t0 + 0.08 ? 1 : 0), 0); };
export const bellRing = (f: number): number => { const t = f / FPS; return DING_T.reduce((s, t0) => Math.max(s, t >= t0 ? Math.exp(-(t - t0) / 0.1) : 0), 0); };
/** a decaying shake of the camera (frame px): the dings, the snap, the punch-in, the thunder, the rope's stop, the sip, the cups */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [...DING_T.map((t0) => shakeOf(t, t0, 9, 0.05)), shakeOf(t, SNAP_T, 14, 0.07), shakeOf(t, MANAGER_T, 20, 0.08), shakeOf(t, THUNDER_T, 22, 0.14, 70), shakeOf(t, CRACK_T0 + 0.24, 12, 0.1), shakeOf(t, CRACK_T0 + 0.48, 14, 0.12),
    shakeOf(t, ROPE_T[1], 14, 0.1), shakeOf(t, POP1_T[1], 6, 0.06), shakeOf(t, POP2_T[1], 8, 0.07), shakeOf(t, CORK_T[0], 5, 0.05), shakeOf(t, CORK_T[1], 5, 0.05), shakeOf(t, SIP_T[2], 5, 0.06), ...TWANGS.map((t0) => shakeOf(t, t0, 8, 0.06))];
  const kettle = t >= KETTLE_T && inShot(f, "steam") ? [2.2 * Math.sin(t * 190), 1.6 * Math.cos(t * 150)] : [0, 0];
  return [parts.reduce((s, p) => s + p[0], kettle[0]), parts.reduce((s, p) => s + p[1], kettle[1])];
}
/** the stressed syllables of the shouts that shake the camera: OWNER (shot 6), SAME and GUY (shot 9) */
export const TWANGS = [4.54, 7.19, 7.59].map((t) => snap(t));
/** a white flash: the thunder, the crack's big splits, and a small one on the snap */
export const flashAt = (f: number): number => { const t = f / FPS; return Math.max(crackAt(f).flash * 0.9, t >= SNAP_T ? 0.34 * Math.exp(-(t - SNAP_T) / 0.03) : 0); };

// ── the camera of a shot: the zoom factor about the shot's focus (the shot's own framing, a slow push in the holds, a pulse on the hits)
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "bell": return 1 + 0.03 * s.u + DING_T.reduce((a, t0) => a + pulse(t0, 0.02, 0.04), 0);
    case "snap": return 1 + 0.03 * s.u + pulse(SNAP_T, 0.07, 0.07);
    case "build": return 1 + 0.04 * s.u;
    case "manager": return 1.42 + 0.05 * s.u + pulse(MANAGER_T, 0.09, 0.09);   // the punch-in: the shot of the face pushed in 1.42 times about a point under the chin
    case "drop": return 1 + 0.02 * s.u;
    case "tie": return 1 + 0.03 * s.u + pulse(POP1_T[1], 0.04, 0.07);
    case "owner": return 1 + 0.035 * s.u + pulse(TWANGS[0], 0.03, 0.08);
    case "drop2": return 1 + 0.02 * s.u;
    case "crown": return 1 + 0.03 * s.u + pulse(POP2_T[1], 0.05, 0.07);
    case "point": return 1 + 0.05 * s.u + pulse(TWANGS[1], 0.02) + pulse(TWANGS[2], 0.02);
    case "flat": return 1 + 0.045 * s.u;
    case "wantGod": return 1 + 0.07 * s.u;
    case "scream": return 1 + 0.06 * s.u + pulse(11.55, 0.05, 0.1);
    case "god": return 1 + 0.02 * s.u + pulse(THUNDER_T, 0.05, 0.12) + pulse(ROPE_T[1], 0.03, 0.1);
    case "speaking": return 1 + 0.04 * s.u;
    case "latte": return 1 + 0.045 * s.u;
    case "steam": return 1 + 0.03 * s.u + pulse(CORK_T[0], 0.02);
    case "sip": return 1 + 0.03 * s.u;
    case "cantI": return 1 + 0.04 * s.u;
    case "droop": return 1 + 0.5 * ease((f / FPS - S.droop) / (T_END - 1 / FPS - S.droop));   // the camera pushes in on the bell (the zoom is about it): the reel ends on the empty counter, and the loop is a cut to shot 1
    default: return 1;
  }
};

// ── the voices: the mouth, on twos, one frame ahead of the sound; closed whenever that character is not speaking
const lineOf = (who: Who, f: number, before = 0.1, after = 0.05) => LINES.find((q) => q.who === who && f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (who: Who, f: number) => !!lineOf(who, f);
export const speakingLine = (who: Who, f: number) => lineOf(who, f);
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const SMALL = new Set([2, 4, 6, 9, 10]);  // said small: Ross's deadpan lines, "...My latte's cold." and "...Can I speak to your manager?" (the mouth is never wider than mid)
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
const LINE_MOOD: Record<number, Mood> = { 1: "furious", 2: "flat", 3: "furious", 4: "tight", 5: "angry", 6: "resigned", 7: "furious", 8: "polite", 9: "flat", 10: "polite" };
/** the mood of a character's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (l) return LINE_MOOD[l.n];
  if (who === "ROSS") {
    switch (id) {
      case "crown": return "tight";
      case "flat": case "droop": return "resigned";
      case "god": case "speaking": return "polite";
      case "steam": return "furious";
      default: return "flat";
    }
  }
  switch (id) {
    case "snap": case "build": case "manager": case "owner": case "wantGod": case "scream": return "furious";
    case "point": return "angry";
    case "cantI": case "sip": return "polite";
    default: return "flat";
  }
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x11-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [3.0, 6], 2: [0.8, 1.2], 3: [3.0, 6], 4: [0.8, 1.2], 5: [3.4, 7], 6: [0.8, 1.2], 7: [3.4, 7], 8: [1.2, 2.4], 9: [1.4, 2.5], 10: [0.8, 1.2] };
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
/** nobody blinks in the middle of a shout (Chuck's face snapping, the punch-in, "Then the OWNER!", the wind-up and the scream) */
export const blinkOf = (who: keyof typeof BLINKS, f: number) => { if (who === "chuck" && inShot(f, "snap", "build", "manager", "owner", "wantGod", "scream")) return 0; for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; } return 0; };

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s)
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  ...DING_T.map((t, i): Hit => ({ id: `ding${i + 1}`, t, sfx: "bell", db: -4 - i * 0.5, len: 0.5, fade: 0.2 })),
  { id: "snap", t: SNAP_T, sfx: "snap", db: -2 },                  // the face snapping purple (the clip of "Cold Lips": its peak on the frame of the pop)
  { id: "whoosh1", t: F(70), sfx: "whoosh", db: -3 },
  { id: "pop1", t: POP1_T[1], sfx: "pop", db: -2 },
  { id: "whoosh2", t: F(157), sfx: "whoosh", db: -3 },
  { id: "pop2", t: POP2_T[1], sfx: "pop", db: -2 },
  { id: "fanfare", t: POP2_T[1], sfx: "fanfare", db: -8, start: true, len: 0.32, fade: 0.14 },
  { id: "thunder", t: THUNDER_T, sfx: "thunder", db: -2, start: true, len: 1.2, fade: 0.4 },
  { id: "crack", t: CRACK_T0 + 0.24, sfx: "crack", db: -3 },
  { id: "whoosh3", t: F(377), sfx: "whoosh", db: -6 },
  { id: "creak0", t: F(386), sfx: "creak", db: -14, len: 0.9, fade: 0.3 },        // the rope takes his weight
  { id: "choir", t: CHOIR_T, sfx: "choir", db: -9, start: true, len: 0.85, fade: 0.4 },
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -8 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -7, start: true, from: 0.75, len: 1.1, fade: 0.25 },
  { id: "slurp", t: SIP_T[2], sfx: "slurp", db: -5 },
  { id: "creak", t: DROOP_T[1], sfx: "creak", db: -4 },
  { id: "whoosh4", t: F(619), sfx: "whoosh", db: -16 },
];

// ── sound cues for the mix (scripts/x12-cues.mts): no bed, the room is quiet
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => c.push({ name: h.sfx, at: h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(h.from ? { from: h.from } : {}) }));
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x11-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through is captioned twice: the part up to the cut, and after the
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
/** where the captions sit (frame y px): one band, out of the bottom 400 px (Instagram's), except where something is in it (a face, the tag, the cup: the shots set their own) */
export const CAP_BAND: [number, number] = [1295, 1455];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { snap: [30, 800], wantGod: [30, 790] };   // (the raised cup of the picture is at the right of the band in these two)
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is)
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${sh.i + 1} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("start", 0.0), kf("slap 1", 0.07), kf("slap 3", 0.34), kf("calm", 0.47), kf("hit", 0.55), kf("settled", 0.93), kf("", 1.3), kf("", 1.8), kf("standing", 2.23), kf("falling", 2.3), kf("gone", 2.5),
  kf("up", 2.7), kf("settled", 3.2), kf("", 4.6), kf("falling", 5.2), kf("up", 5.6), kf("twitch", 5.9), kf("", 7.3), kf("sigh", 8.5), kf("", 9.4),
  kf("", 10.8), kf("", 11.7), kf("thunder", 12.15), kf("crack", 12.4), kf("light", 12.6), kf("rope", 12.8), kf("settled", 13.2), kf("", 13.9),
  kf("", 15.5), kf("flick", 16.4), kf("jet", 16.8), kf("cup", 17.4), kf("up", 17.7), kf("slurp", 17.87), kf("", 19.0), kf("start", 19.8),
  kf("low", 20.2), kf("sinking", 20.7), kf("gone", 21.0), kf("last", 21.19),
];
