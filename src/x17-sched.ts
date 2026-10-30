// The timeline and the acting of x17 "Seat Swap" (src/X17.tsx, docs/x17-seat-swap.md, the shot list v3 and the build spec). Pure data and arithmetic, the shape of src/x16-sched.ts: every number is a function of the frame, of the fourteen voice
// takes in public/x17/timings.json and of the mouth loudness in src/amp-x17.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the gaps of
// episodes/x17.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: only the frames, and only where the voices' own times asked for it. A spec time that falls on half a frame goes up to the next frame (0.75 -> frame 23, 3.95 -> 119, 9.25 -> 278 ...). Three cuts
// meet a word: shot 2 starts at 0.77 (the spec's 0.75), inside "Window" (0.53-0.97): the pass insert needs its 0.53 s, and the line carries across the cut as "Window seat." does in the spec (shot 1 "Window", shot 2 "seat."); shot 3 starts at 1.30,
// inside the end of "seat." (0.97-1.37): the heads pop on 1.33, three frames after the cut, and the line's last 70 ms run over it; shot 13 starts at 13.23, the end of "We" (12.94-13.23): the spec's 13.15 ran through it (its "We found you" is
// V.O. over the handle, and the voice says "We" 12.94-13.23, "found" 13.23-13.53, "you" 13.53-13.76), so the handle insert keeps "We" and shot 13 has the attendant say the rest. 22 shots, none over 2.4 s, the reel 26.97 s (809 frames) and it loops
// into shot 1 (he drops into 12A again).
import timings from "../public/x17/timings.json" with { type: "json" };
import amps from "./amp-x17.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x16-sched.ts): take n of public/x17/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "ROSS" | "BRIDE" | "GROOM" | "FA" | "PILOT";
const WHO: Record<string, Who> = { ROSS: "ROSS", BRIDE: "BRIDE", GROOM: "GROOM", "FLIGHT ATTENDANT": "FA", PILOT: "PILOT" };
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
  // a take's first word cannot start before its voice does; `first` (the first sound that is speech) is the first frame whose loudness is over 0.3 (a soft breath before the word, as in take 7's "It's a bird.", is not): captions and mouths start there
  const words = t.words.map((w, i) => ({ ...w, t: ofs + (i ? w.t : Math.max(w.t, t.voiced[0][0])), e: ofs + w.e }));
  const i0 = amp.findIndex((a) => a >= 0.3);
  const base = { n: t.n, who: WHO[t.character], file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
  const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: (j % 2 === 0 ? 1 : -1) as 1 | -1 }));
  return { ...base, peaks };
});
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;

// ── the cuts: frame numbers. The 22 shots. Speech on the reel's clock (first sound .. last word): 1 ROSS 0.35-1.37 (Window 0.53, seat 0.97), 2 BRIDE 1.42-2.29 (Hiii 1.68) and 3 GROOM 1.54-2.40 (Hiii 1.64: one "Hiii!" in two voices),
// 4 BRIDE 2.65-5.16 (Would 2.66, us? 3.50-3.97, It's 4.13, honeymoon 4.58), 5 ROSS 5.86-7.11 (Sure 6.34, a long drawn-out one from 5.95), 6 FA 8.01-10.53 (Sir? 8.16, His 8.79, support 9.00, peacock 9.41, needs 9.83, a 10.04, seat 10.29),
// 7 ROSS 11.13-12.39 (a soft breath to 11.5, It's 11.58, a 11.73, bird 11.80), 8 FA 12.94-14.70 (We 12.94, found 13.23, you 13.53, something 13.76, with 13.99, a 14.10, view 14.22), 9 FA 15.70-17.64 (Legroom's 15.86, thirty-nine 16.38, ninety-nine 16.89),
// 10 ROSS 17.84-19.51 (I 17.99, PAID 18.23, FOR 18.63, THAT 18.79, WINDOW 19.03), 11 PILOT 21.11-23.20 (Ahh 21.11-22.34, Legroom 22.34), 12 ROSS 24.20-25.21 (Window 24.20, seat 24.69), 13 BRIDE 25.57-26.58 (Hiii 25.90) and 14 GROOM 25.68-26.46 (Hiii 25.75)
const F = (n: number) => n / FPS;
const S = {
  drop: F(0), pass: F(23), pop: F(39), ask: F(75), slap: F(119), sure: F(156), cram: F(219), fa: F(240), peacock: F(278), scream: F(318), bird: F(333), handle: F(378), present: F(397), suck: F(444), wing: F(464), paid: F(533),
  purple: F(588), pilot: F(614), legroom: F(633), hat: F(701), glass: F(725), hiii: F(764),
};
export const T_END = F(809);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "drop", "pass", "pop", "ask", "slap", "sure", "cram", "fa", "peacock", "scream", "bird", "handle", "present", "suck", "wing", "paid", "purple", "pilot", "legroom", "hat", "glass", "hiii",
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

// ── the named moments (seconds, every one on a frame; the spec's time in the comment)
export const STAMP_T = F(0);                                   // shot 1: the label POV: SEAT SWAP slams on with the cabin's chime (the first frame)
export const LAND_T = F(4);                                    // shot 1: Ross lands in 12A, the squash
export const BELT_T = F(5);                                    // shot 1: the seatbelt's CLICK (spec 0.18)
export const LEAN_T = F(10);                                   // shot 1: his head goes over to the window, the cheek on the glass, the eyes close (to F(18))
export const PASS_T = F(25);                                   // shot 2: the pass lands on the tray table (the cut is 0.77, the pass drops in over two frames)
export const PILL_T = F(39);                                   // the label shrinks into a pill at the top (the cut of shot 3, spec 1.30)
export const POP_T = F(40);                                    // shot 3: the couple pops up over the seat in front (spec 1.33)
export const LASH_T = [F(86), F(98), F(108)];                  // shot 4: the bride bats her lashes (three quick blinks while she asks)
export const SLAP_T = F(119);                                  // shot 5: her boarding pass is slapped up into the frame (spec 3.97)
export const TWITCH_T = F(160);                                // shot 6: his eye starts to twitch (spec 5.30; an even frame: it runs on twos)
export const BANG_T = F(222);                                  // shot 7: the toilet door bangs open (spec 7.40)
export const FLUSH_T = F(224);                                 // shot 7: and the FLUSH, two frames after the bang
export const DING_T = F(240);                                  // shot 8: the attendant leans into the row, the ding (the cut's own frame: spec 8.02, her voice is on from 8.01)
export const TAIL_T = F(318);                                  // shot 10, its first frame: the fan bursts open round Ross on the cut (spec 10.35, in shot 9; moved so that no fan opens over the man or his closed tail)
export const SCREAM_T = F(321);                                // shot 10: the peacock screams in his face, the fan open (spec 10.62; three frames after the burst starts)
export const THROB1_T = F(329);                                // shot 10: the vein pops (spec 10.95)
export const YANK_T = F(379);                                  // shot 12: the attendant yanks the exit's red handle (spec 12.62)
export const DOOR_T = F(389);                                  // shot 12: the door pops out and the wind howls in (spec 12.95)
export const PRESENT_T = F(413);                               // shot 13: her open palm goes out like a waiter's, on "something" (13.76)
export const SUCK_T = F(445);                                  // shot 14: WHOOSH, he stretches out of the seat (spec 14.82)
export const THROB2_T = F(534);                                // shot 16: the vein throbs and the shout starts (spec 17.80)
export const SNAP_T = F(589);                                  // shot 17: his face snaps purple (spec 19.62)
export const CORK_T = [F(593), F(596)], KETTLE_T = F(599);     // shot 17: POP POP, the kettle (spec 19.78, 19.88, 19.95)
export const CLINK_T = F(627);                                 // shot 18: the pilot sits down, the clink of his drink (spec 20.90)
export const PLOP_T = F(707);                                  // shot 20: the captain's hat lands on Ross's head (spec 23.55)
export const SQUEAK_T = F(726);                                // shot 21: his cheek squashes on the glass (spec 24.20)
export const BLINK_T = F(744);                                 // shot 21: one slow blink, dead flat
export const POP2_T = F(765);                                  // shot 22: the couple pops up behind his headrest (spec 25.50)
export const WIND_END = F(725);                                // the wind stops on the cut to the cockpit

// ── the label: POV: SEAT SWAP slams on big at the first frame and shrinks into a small pill at the top on the cut of shot 3. `big`: the scale of the big one (a stamp: over its size at first, settled in four frames), `pill`: 0 big .. 1 the pill
export const labelBig = (f: number): number => { const a = f / FPS - STAMP_T; return 1 + 0.18 * Math.exp(-a / 0.045) * Math.cos(a * 46); };
export const pillP = (f: number): number => ease((f / FPS - PILL_T) / 0.2);

// ── the shake and the camera
/** a decaying shake of the camera (frame px): the stamp, the landing, the pops, the slap, the bang, the tail, the scream, the vein, the yank, the door, the suck, the throb, the snap, the corks, the clink, the plop, the squeak */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
/** the rumble of the open door and the wind on the wing: a small shake on twos from the door's pop to the cut to the cockpit (the wing's is the bigger) */
function gust(f: number): [number, number] {
  if (f < Math.round(DOOR_T * FPS) || f >= Math.round(WIND_END * FPS)) return [0, 0];
  const k = f >= Math.round(S.wing * FPS) ? 3.4 : 1.8, q = twos(f);
  return [k * Math.sin(q * 2.9 + 1.3), 0.8 * k * Math.cos(q * 2.3)];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, STAMP_T, 6, 0.05), shakeOf(t, LAND_T, 9, 0.06), shakeOf(t, POP_T, 6, 0.05), shakeOf(t, SLAP_T, 7, 0.05), shakeOf(t, BANG_T, 10, 0.06), shakeOf(t, TAIL_T, 4, 0.05), shakeOf(t, SCREAM_T, 9, 0.07), shakeOf(t, THROB1_T, 5, 0.05),
    shakeOf(t, YANK_T, 6, 0.05), shakeOf(t, DOOR_T, 12, 0.08), shakeOf(t, SUCK_T, 8, 0.06), shakeOf(t, THROB2_T, 7, 0.06), shakeOf(t, SNAP_T, 14, 0.07), shakeOf(t, CORK_T[0], 9, 0.05), shakeOf(t, CORK_T[1], 9, 0.05), shakeOf(t, CLINK_T, 3, 0.05),
    shakeOf(t, PLOP_T, 7, 0.06), shakeOf(t, SQUEAK_T, 4, 0.05), shakeOf(t, POP2_T, 6, 0.05)];
  const kettle = t >= KETTLE_T && t < S.pilot + 0.6 && inShot(f, "purple", "pilot") ? [2.4 * Math.sin(t * 190), 1.8 * Math.cos(t * 150)] : [0, 0];
  const g = gust(f);
  return [parts.reduce((s, p) => s + p[0], kettle[0] + g[0]), parts.reduce((s, p) => s + p[1], kettle[1] + g[1])];
}
/** the camera's zoom about the shot's focus: the shot's own framing is in the scene, this is a slow push in the holds and a pulse on the hits */
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "drop": return 1 + 0.03 * s.u + pulse(LAND_T, 0.05, 0.08);
    case "pass": return 1 + 0.05 * s.u + pulse(PASS_T, 0.03);
    case "pop": return 1 + 0.07 * s.u + pulse(POP_T, 0.04, 0.08);
    case "ask": return 1 + 0.06 * s.u;
    case "slap": return 1 + 0.02 * s.u + pulse(SLAP_T, 0.05);
    case "sure": return 1 + 0.05 * s.u;
    case "cram": return 1 + 0.02 * s.u + pulse(BANG_T, 0.04);
    case "fa": return 1 + 0.03 * s.u + pulse(DING_T, 0.03);
    case "peacock": return 1 + 0.03 * s.u;
    case "scream": return 1 + 0.04 * s.u + pulse(TAIL_T, 0.05) + pulse(SCREAM_T, 0.07) + pulse(THROB1_T, 0.04);
    case "bird": return 1 + 0.03 * s.u;
    case "handle": return 1 + 0.05 * s.u + pulse(YANK_T, 0.03) + pulse(DOOR_T, 0.07, 0.09);
    case "present": return 1 + 0.03 * s.u + pulse(PRESENT_T, 0.02);
    case "suck": return 1 + 0.02 * s.u + pulse(SUCK_T, 0.05);
    case "wing": return 1 + 0.02 * s.u;
    case "paid": return 1 + 0.04 * s.u + pulse(THROB2_T, 0.05);
    case "purple": return 1 + 0.02 * s.u + pulse(SNAP_T, 0.05) + pulse(CORK_T[0], 0.03) + pulse(CORK_T[1], 0.03);
    case "pilot": return 1 + 0.02 * s.u + pulse(CLINK_T, 0.02);
    case "legroom": return 1 + 0.03 * s.u;
    case "hat": return 1 + 0.02 * s.u + pulse(PLOP_T, 0.05);
    case "glass": return 1 + 0.03 * s.u + pulse(SQUEAK_T, 0.03);
    case "hiii": return 1 + 0.03 * s.u + pulse(POP2_T, 0.05);
    default: return 1;
  }
};

// ── Ross: the head picture (plugs in, the left one gone, both gone), the purple snap, the vein, the twitching eye, the steam
/** both plugs in (to the pops), only the right one gone (between the two flicks), both gone (from the second cork to the end of the reel; the loop starts with them in) */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** how purple his face is (0 as painted .. 1 furious): the snap on SNAP_T (four fifths at once, full in three frames), furious to the hat's plop, then cooling to a third by the cockpit (steaming, not boiling) */
export function purpleAt(f: number): number {
  const t = f / FPS;
  if (t < SNAP_T - 1e-6) return 0;
  const snapP = Math.min(1, 0.8 + 0.2 * ease((t - SNAP_T) / 0.1));
  return t < PLOP_T ? snapP : snapP * (1 - 0.65 * ease((t - PLOP_T) / 0.5));
}
/** the vein on his forehead (0 none .. 1.5): pops on THROB1_T (the peacock), throbs to the end; on THROB2_T (the shout) it pops again, bigger; in the cockpit it is down to a smaller one */
export function veinAt(f: number): number {
  const t = f / FPS;
  if (t < THROB1_T) return 0;
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  const base = Math.min(1.15, popP(t, THROB1_T, 0.45, 40)) + (t >= THROB2_T ? 0.3 * Math.min(1.15, popP(t, THROB2_T, 0.45, 40)) : 0);
  const cool = t >= PLOP_T ? 1 - 0.35 * ease((t - PLOP_T) / 0.5) : 1;
  return base * cool * (t > THROB1_T + 0.4 ? throb : 1);
}
/** a twitching lid (fraction of the eye): his right eye from TWITCH_T, a quick flick every 0.4 s, the other eye a third of a cycle behind; harder (both eyes, twice as often) from the toilet's bang, until the vein pops */
export function twitchAt(f: number, eye: 0 | 1): number {
  const t = f / FPS;
  if (t < TWITCH_T - 1e-6 || t >= THROB1_T) return 0;
  const hard = t >= BANG_T;
  const k = (twos(f) - Math.round(TWITCH_T * FPS) + (eye === 0 ? 0 : 4)) % (hard ? 6 : 12);
  return k === 0 ? (hard ? 0.85 : 0.7) : k === 2 ? 0.3 : 0;
}
/** the steam out of his ear holes: 0 none .. 2.8 thick. The jet starts on the kettle, screams through the purple and the pilot's arrival, eases off while the pilot talks and curls thin in the cockpit */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t >= KETTLE_T && t < S.legroom) return 1.5 + 1.3 * ease((t - KETTLE_T) / 0.3);
  if (t >= S.legroom && t < S.glass) return 2.8 - 1.6 * ease((t - S.legroom) / 2.4);
  if (t >= S.glass) return 1.15;
  return 0;
}

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
  if (who === "FA") return a >= 0.55 ? "mid" : "small";            // the airline smile never breaks: a small neat mouth through it
  if (who === "PILOT") return a >= 0.62 && w?.w === "ahh" ? "wide" : a >= 0.4 ? "mid" : "small";   // lazy: only the sigh opens wide
  if (who === "ROSS" && l.n === 7) return a >= 0.55 ? "mid" : "small";   // flat and deadpan
  if (who === "ROSS" && l.n === 12) return a >= 0.55 ? "mid" : "small";
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
const LINE_MOOD: Record<number, Mood> = { 1: "polite", 5: "tight", 7: "flat", 10: "furious", 12: "flat" };
/** the mood of Ross's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (who === "ROSS") {
    if (l && LINE_MOOD[l.n]) return LINE_MOOD[l.n];
    switch (id) {
      case "drop": case "pass": return "polite";                               // blissful at the window
      case "sure": return "tight";                                             // the frozen smile
      case "cram": case "scream": return "hiss";                               // crammed: clenched
      case "bird": case "glass": case "hiii": return "flat";                    // dead flat
      case "suck": case "wing": case "paid": case "purple": return "furious";
      case "pilot": case "legroom": case "hat": return "hiss";                  // steaming through his teeth
      default: return "tight";
    }
  }
  return "flat";
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x13-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [1.2, 2], 2: [2.0, 3], 3: [1.6, 2.5], 4: [2.4, 4], 5: [1.5, 2.5], 6: [1.4, 2.4], 7: [0.7, 1.4], 8: [1.6, 2.6], 9: [2.0, 3.4], 10: [4.2, 9], 11: [0.8, 1.2], 12: [0.7, 1.4], 13: [2.0, 3], 14: [1.6, 2.5] };
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

// ── blinks: Ross's slow one in the cockpit (dead flat); the bride's three quick bats of her lashes (shot 4) are LASH_T
const BLINK_SHAPE = [0.35, 0.8, 1, 1, 0.8, 0.35];
export const blinkOf = (who: "ross", f: number) => { const k = f - Math.round(BLINK_T * FPS); return who === "ross" && k >= 0 && k < BLINK_SHAPE.length ? BLINK_SHAPE[k] : 0; };
const BAT_SHAPE = [0.5, 1, 1, 0.5];
/** how far the bride's lids are down (0 .. 1): three quick bats while she asks */
export const batOf = (f: number): number => { for (const s of LASH_T) { const k = f - Math.round(s * FPS); if (k >= 0 && k < BAT_SHAPE.length) return BAT_SHAPE[k]; } return 0; };

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s). A peak that would
// fall before the reel's start skips into the clip instead of starting early.
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "stamp", t: STAMP_T, sfx: "stamp", db: -3 },                                                          // the label slams on
  { id: "chime", t: STAMP_T, sfx: "bingbong", db: -3, start: true },                                          // and the cabin's chime with it
  { id: "belt", t: BELT_T, sfx: "seatbelt", db: -4 },                                                         // the buckle's clack
  { id: "pass", t: PASS_T, sfx: "tap", db: -5 },                                                              // the pass lands on the tray
  { id: "pop1", t: POP_T, sfx: "pop", db: -4 },                                                               // the heads pop up
  { id: "slap", t: SLAP_T, sfx: "slap", db: -4 },                                                             // her pass slapped up into the frame
  { id: "bang", t: BANG_T, sfx: "slam", db: -5 },                                                             // the toilet door bangs open
  { id: "flush", t: FLUSH_T, sfx: "flush", db: -7, start: true, len: 0.9, fade: 0.35 },                       // and flushes
  { id: "ding", t: DING_T, sfx: "ding", db: -7 },                                                             // the attendant's ding
  { id: "tail", t: TAIL_T, sfx: "tailfan", db: -5, start: true },                                              // the tail fans out on the cut (the clip is loud from its first frame; its peak, 0.10 s in, is the fan full)
  { id: "scream", t: SCREAM_T, sfx: "squawk", db: -6, start: true },                                          // the peacock screams in his face
  { id: "throb1", t: THROB1_T, sfx: "throb", db: -5 },                                                        // the vein pops
  { id: "hatch", t: DOOR_T, sfx: "hatch", db: -4 },                                                           // the latch (0.35 s before its peak: the yank) and the air on the pop
  { id: "wind", t: DOOR_T, sfx: "windbed", db: -2, start: true, len: WIND_END - DOOR_T, fade: 0.35 },        // the wind: a bed from the door's pop to the cockpit cut, easing out over its last 0.35 s (a 0.1 s fade left a tail in line 12's window and Whisper heard "Windows Seat." through the AAC)
  { id: "present", t: PRESENT_T, sfx: "whoosh", db: -14 },                                                    // her palm out like a waiter's
  { id: "suck", t: SUCK_T, sfx: "suck", db: -5, start: true },                                                // WHOOSH
  { id: "throb2", t: THROB2_T, sfx: "throb", db: -3 },                                                        // the shout's vein
  { id: "snap", t: SNAP_T, sfx: "snap", db: -3 },                                                             // his face snapping purple
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -8 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -12, start: true, from: 0.75, len: S.legroom - KETTLE_T - 0.02, fade: 0.25 },   // the kettle screams to the pilot's line
  { id: "clink", t: CLINK_T, sfx: "clink", db: -6 },                                                          // the pilot sits down, ice in his glass
  { id: "plop", t: PLOP_T, sfx: "plop", db: -5 },                                                             // the hat lands
  { id: "squeak", t: SQUEAK_T, sfx: "squeak", db: -14, start: true, len: 0.5, fade: 0.2 },                   // his cheek slides on the glass
  { id: "pop2", t: POP2_T, sfx: "pop", db: -4 },                                                              // the couple pops up behind his headrest
];

// ── sound cues for the mix (scripts/x17-cues.mts): the wind is a bed from the door to the cockpit cut; the sounds sit 6 dB lower while somebody talks
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

// ── captions: the shape of src/x16-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through is captioned twice: the part up to the cut, and after the
// cut the sentence from that word on. The couple's "Hiii!" in two voices (2 and 3, 13 and 14) is one caption, from the first voice to the end of the last. Nothing is emphasised: the words are white, and his shout is bigger.
export type Cap = { who: Who; n: number; text: string; t0: number; t1: number; w0: number; w1: number; words: { d: string; t: number; emph: boolean }[] };
const say = (w: Word) => w.d.replace(/—/g, "-");
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
const TOGETHER: Record<number, number> = { 2: 3, 13: 14 };   // the groom's take is on the bride's: one caption for both
export const NO_CAP: ShotId[] = [];
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  const cuts = SHOTS.slice(1).map((s) => s.t0);
  for (const l of LINES) {
    if (Object.values(TOGETHER).includes(l.n)) continue;
    const mate = TOGETHER[l.n] ? LINE(TOGETHER[l.n]) : null;
    const len = (ws: Word[]) => ws.map(say).join(" ").length;
    const chunks: Word[][] = [];
    let cur: Word[] = [];
    l.words.forEach((w, i) => {
      cur.push(w);
      const nxt = l.words[i + 1];
      if (/[.?!]$/.test(w.d) || (nxt && cuts.some((c) => c >= w.e - 0.02 && c <= nxt.t + 0.02)) || (nxt && nxt.t - w.e > 0.3 && len(cur) >= 9)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const mk = (ws: Word[], t0: number, t1: number, w0: number, w1: number): Cap => ({ who: l.who, n: l.n, text: ws.map(say).join(" "), t0, t1, w0, w1, words: ws.map((w) => ({ d: say(w), t: w.t, emph: false })) });
    chunks.forEach((ws) => {
      const first = ws === chunks[0] ? Math.min(l.first, mate?.first ?? 9e9, ws[0].t) : ws[0].t;
      const t0 = first - 0.04, last = ws === chunks[chunks.length - 1] && mate ? Math.max(stretchEnd(l, ws[ws.length - 1].e), stretchEnd(mate, mate.words[mate.words.length - 1].e)) : stretchEnd(l, ws[ws.length - 1].e), t1 = last + 0.25;
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
/** where the captions sit (frame y px): one band, out of the bottom 400 px (Instagram's, y 1520 and down). The shots set their own where a face, a pass or a hand is in it */
export const CAP_BAND: [number, number] = [1255, 1480];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the biggest size of a caption in the shot (px): Ross's shout is the biggest */
const CAP_MAX: Partial<Record<ShotId, number>> = { paid: 150 };
export const capMax = (id: ShotId): number => CAP_MAX[id] ?? 124;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is); SHEET_T is the named moment of each shot for the contact sheet
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${sh.i + 1} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const SHEET_T: Record<ShotId, number> = {
  drop: F(16), pass: F(33), pop: F(52), ask: F(92), slap: F(126), sure: F(190), cram: F(232), fa: F(258), peacock: F(300), scream: F(327), bird: F(360), handle: F(385), present: F(420), suck: F(453), wing: F(500), paid: F(545),
  purple: F(604), pilot: F(622), legroom: F(670), hat: F(712), glass: F(750), hiii: F(785),
};
export const KEY_FRAMES: { label: string; f: number }[] = [
  ...SHOT_IDS.flatMap((id) => { const s = SHOTS.find((x) => x.id === id)!, f0 = Math.round(s.t0 * FPS), f1 = Math.round(s.t1 * FPS); return [kf("first", f0 / FPS), kf("named moment", SHEET_T[id]), kf("last", (f1 - 1) / FPS)]; }),
];
