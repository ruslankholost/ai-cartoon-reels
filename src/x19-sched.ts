// The timeline and the acting of x19 "Screen Time" (src/X19.tsx, docs/x19-screen-time.md, the shot list v3 on the voices' clock and the build spec). Pure data and arithmetic, the shape of src/x18-sched.ts: every number is a function of the frame, of the
// thirteen voice takes in public/x19/timings.json and of the mouth loudness in src/amp-x19.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the gaps of
// episodes/x19.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: only the frames. A spec time that falls on half a frame goes up to the next frame (1.15 -> frame 35, 3.15 -> 95, 6.25 -> 188, 7.45 -> 224, 11.75 -> 353, 13.95 -> 419, 16.45 -> 494, 17.05 -> 512, 17.65 -> 530,
// 18.85 -> 566, 28.45 -> 854); one cut is moved onto a word: shot 23 starts at 21.63 (frame 649), the spec's 21.45 is 0.15 s inside "See?" (21.17-21.62, said over the munching toddler), so the word is said whole over shot 22 and the caption does not run over the cut; the named moments the same way (0.78 and 1.9 s are not on a frame: 0.78 -> 23, a hit at 4.75, 5.05, 5.35 s -> 143, 152, 161, 10.85 -> 326, 13.35 -> 401, 16.75 -> 503, 18.45 -> 554, 20.65 -> 620, 23.45 -> 704,
// 24.45 -> 734, 27.02 -> 811, 28.85 -> 866, 29.05 -> 872). The reel is 885 frames = 29.50 s and it loops: shot 30's volume overlay slams to MAX, and the cut to shot 1 slams it to MAX again.
import timings from "../public/x19/timings.json" with { type: "json" };
import amps from "./amp-x19.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x18-sched.ts): take n of public/x19/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "MOM" | "ROSS";
const WHO: Record<string, Who> = { MOM: "MOM", ROSS: "ROSS" };
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
  // a take's first word cannot start before its voice does; `first` (the first sound that is speech) is the first frame whose loudness is over 0.3 (a soft breath before the word is not): captions and mouths start there
  const words = t.words.map((w, i) => ({ ...w, t: ofs + (i ? w.t : Math.max(w.t, t.voiced[0][0])), e: ofs + w.e }));
  const i0 = amp.findIndex((a) => a >= 0.3);
  const base = { n: t.n, who: WHO[t.character], file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
  const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: (j % 2 === 0 ? 1 : -1) as 1 | -1 }));
  return { ...base, peaks };
});
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;

// ── the cuts: frame numbers. Speech on the reel's clock (first sound .. last word): 1 ROSS 1.50-2.93 (Could 1.50, you 1.69, turn 1.91, it 2.06, down 2.31, a 2.50, bit 2.57), 2 MOM 3.23-4.62 (He 3.34, needs 3.63, it 3.78, to 3.89, eat 4.11),
// 3 ROSS 5.07-6.19 (He's 5.16, not 5.42, eating 5.66), 4 MOM 6.44-7.48 (Do 6.56, you 6.79, have 6.95), 5 ROSS 7.48-8.04 (No 7.50), 6 MOM 8.34-9.96 (Then 8.29, you 8.71, wouldn't 8.93, understand 9.15), 7 MOM 11.76-13.16 (No 11.73, no 12.10, no 12.24,
// no 12.39, NO 12.61), 8 ROSS 13.96-14.63 (Headphones 14.16), 9 MOM 14.83-16.34 (He 14.85, HATES 15.18, headphones 15.54), 10 ROSS 19.34-19.91 (Popcorn 19.35), 11 MOM 21.01-22.74 (See 21.17-21.62, He's 21.85, eating 22.18),
// 12 MOM 25.74-26.72 (Charger 25.69), 13 ROSS 27.32-28.38 (Six 27.46, fifty 27.98)
const F = (n: number) => n / FPS;
const S = {
  tablet: F(0), hurricane: F(15), toddler: F(35), rossWind: F(57), momEat: F(95), muffin: F(141), momBrow: F(188), rossNo: F(224), momSmug: F(249), tik: F(303), lip: F(324), momSnap: F(353), bars: F(399), phones: F(419), momHates: F(444),
  canopy: F(494), windows: F(512), turn: F(530), switch: F(552), usher: F(566), cash: F(603), munch: F(618), proud: F(649), battery: F(687), silent: F(711), lip2: F(732), plead: F(771), slide: F(810), six: F(819), plug: F(854),
};
export const T_END = F(885);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "tablet", "hurricane", "toddler", "rossWind", "momEat", "muffin", "momBrow", "rossNo", "momSmug", "tik", "lip", "momSnap", "bars", "phones", "momHates",
  "canopy", "windows", "turn", "switch", "usher", "cash", "munch", "proud", "battery", "silent", "lip2", "plead", "slide", "six", "plug",
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
/** the spec's number of each shot (one picture each) */
export const NO: Record<ShotId, string> = Object.fromEntries(SHOT_IDS.map((id, i) => [id, String(i + 1)])) as Record<ShotId, string>;
export const FRAMING: Record<ShotId, "INSERT" | "CLOSE" | "MEDIUM" | "WIDE"> = {
  tablet: "INSERT", hurricane: "CLOSE", toddler: "CLOSE", rossWind: "CLOSE", momEat: "CLOSE", muffin: "INSERT", momBrow: "CLOSE", rossNo: "CLOSE", momSmug: "CLOSE", tik: "INSERT", lip: "CLOSE", momSnap: "CLOSE", bars: "INSERT", phones: "MEDIUM", momHates: "CLOSE",
  canopy: "MEDIUM", windows: "WIDE", turn: "WIDE", switch: "INSERT", usher: "MEDIUM", cash: "WIDE", munch: "CLOSE", proud: "CLOSE", battery: "INSERT", silent: "WIDE", lip2: "CLOSE", plead: "CLOSE", slide: "INSERT", six: "MEDIUM", plug: "INSERT",
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
export const STAMP_T = F(0);                                  // shot 1: the label POV: YOU OWN A CAFÉ and PART 2 slam on (spec 0.00)
export const BAR_FRAMES = [2, 3, 4, 5, 6, 7, 8];              // shot 1: the volume overlay climbs from three bars to MAX, a bar and a tick on each of these frames (spec ticks 0.05-0.28)
export const BLAST_T = F(9);                                  // shot 1: the blast, and the song starts (spec 0.30)
export const SMASH_T = F(23);                                 // shot 2: the three cups hit the wall and smash (spec 0.78, 23.4: down)
export const PILL_T = F(35);                                  // the label shrinks into its pill at the top (the cut of shot 3, spec 1.15)
export const HOP_T = [F(143), F(152), F(161)];                // shot 6: the muffin's three hops take off (spec 4.75, 5.05, 5.35: half a frame, up); it lands 6 frames later each time
export const RATTLE_T = F(225);                               // shot 8: the rack of chargers rattles in the blast (spec 7.50)
export const TIK_T = F(306);                                  // shot 10: Ross taps the volume down one notch, TIK, one bar goes out (spec 10.20)
export const WHIMPER1_T = F(326);                             // shot 11: the toddler's bottom lip trembles, the first whimper (spec 10.85, 10.867: up)
export const JAM_T = F(399);                                  // shot 13: her finger jams the volume button (the cut's own frame, spec 13.30)
export const ZIP_T = F(401);                                  // shot 13: the bars shoot past MAX and run off the edge (spec 13.35)
export const CANOPY_T = F(495);                               // shot 16: she flips the stroller's canopy up (spec 16.50)
export const THOOM_T = F(503);                                // shot 16: THOOM, the TV in the canopy comes on (spec 16.75, 16.767: up)
export const WINDOWS_T = F(513);                              // shot 17: the front window starts to bulge with the sound (spec 17.10)
export const TURN_T = [F(531), F(537), F(543)];               // shot 18: the customers turn to the screen one by one, a tick each (spec 17.70, 17.90, 18.10)
export const SWITCH_T = F(554);                               // shot 19: the light switch is flipped, CLICK, the café dims (spec 18.45, 18.467: up)
export const POPCORN_T = F(567);                              // shot 20: Ross holds up the popcorn bucket (spec 18.90)
export const CASH_T = F(604);                                 // shot 21: every hand shoots up with cash (spec 20.12, 20.133: up)
export const MUNCH_T = F(620);                                // shot 22: the toddler munches (spec 20.65, 20.667: up)
export const BLIP_T = F(704);                                 // shot 24: BLIP, the giant screen goes black and the song stops dead (spec 23.45, 23.467: up)
export const WHIMPER2_T = F(734);                             // shot 26: the toddler's lip trembles again, the second whimper (spec 24.45, 24.467: up)
export const SLIDE_T = F(811);                                // shot 28: Ross slides a charger across the counter (spec 27.02, 27.033: up)
export const SLAP_T = F(855);                                 // shot 30: her hand slaps the cash on the counter (spec 28.50)
export const PLUG_T = F(866);                                 // shot 30: the plug goes into the stroller TV (spec 28.85, 28.867: up)
export const POWER_T = F(872);                                // shot 30: the screen lights up and the song starts again (spec 29.05, 29.067: up)

// ── the volume overlay (the tablet's in 1, 10 and 13, the stroller TV's in 30): how many of its ten bars are lit, whether it is on screen, how far the bars have run past MAX (0 .. 1 over 14 frames from the zip), the "MAX" flash
export type Vol = { bars: number; show: boolean; past: number; max: boolean };
export function tabletVol(f: number): Vol {
  const id = shotId(f);
  if (id === "tablet") { const k = BAR_FRAMES.filter((b) => f >= b).length; return { bars: 3 + k, show: true, past: 0, max: f >= BAR_FRAMES[BAR_FRAMES.length - 1] }; }
  if (id === "tik") return { bars: f >= Math.round(TIK_T * FPS) ? 9 : 10, show: true, past: 0, max: false };
  if (id === "bars") return { bars: 10, show: true, past: f >= Math.round(ZIP_T * FPS) ? clamp01((f - Math.round(ZIP_T * FPS)) / 14) : 0, max: f >= Math.round(JAM_T * FPS) };
  return { bars: 10, show: false, past: 0, max: false };
}
/** the stroller TV's overlay in shot 30: it comes up with the screen at the power-up and slams from 1 bar to MAX in 6 frames */
export function tvVol(f: number): Vol {
  const p0 = Math.round(POWER_T * FPS) + 2, k = clamp01((f - p0) / 6);
  return { bars: f < p0 ? 0 : Math.max(1, Math.ceil(k * 10)), show: f >= p0, past: 0, max: k >= 1 };
}

// ── the screens: the stroller TV is on from the THOOM to the BLIP, black until the plug, on again from the power-up; `tvOn` 0 .. 1. The lights are dimmed from the switch's click on (`dimAt`: 0 .. 1 over three frames)
export const tvOn = (f: number): number => (f >= Math.round(THOOM_T * FPS) && f < Math.round(BLIP_T * FPS)) || f >= Math.round(POWER_T * FPS) ? 1 : 0;
export const dimAt = (f: number): number => ease((f - Math.round(SWITCH_T * FPS) + 1) / 3);
/** how bright the blue light of the screens is on the faces: the tablet's from the start, the TV's from the THOOM; it flickers on twos (a hashed jitter of 0.12), and it is gone when the screen is black */
export function screenLight(f: number): number {
  const lit = f < Math.round(BLIP_T * FPS) ? 1 : f >= Math.round(POWER_T * FPS) ? 1 : 0;
  return lit * (0.88 + 0.12 * (hash(twos(f) * 1.37 + 3.1) * 2 - 1));
}

// ── the label: POV: YOU OWN A CAFÉ and PART 2 slam on big at the first frame and shrink into a small pill at the top on the cut of shot 3. `big`: the scale of the big one (a stamp: over its size at first, settled in four frames), `pill`: 0 big .. 1 the pill
export const labelBig = (f: number): number => { const a = f / FPS - STAMP_T; return 1 + 0.18 * Math.exp(-a / 0.045) * Math.cos(a * 46); };
export const pillP = (f: number): number => ease((f / FPS - PILL_T) / 0.2);

// ── the shake and the camera
/** a decaying shake of the camera (frame px): the stamp, the blast, the smash, the hops, the rattle, the taps, the zip, the canopy, THOOM, the switch, the cash, the slap, the plug, the power-up; none at all from the BLIP to the plug (the room is dead) */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, STAMP_T, 7, 0.05), shakeOf(t, BLAST_T, 16, 0.12, 80), shakeOf(t, SMASH_T, 9, 0.06), ...HOP_T.map((h) => shakeOf(t, h + 0.2, 3, 0.05)), shakeOf(t, RATTLE_T, 4, 0.06), shakeOf(t, TIK_T, 3, 0.04), shakeOf(t, JAM_T, 5, 0.05), shakeOf(t, ZIP_T, 10, 0.08),
    shakeOf(t, CANOPY_T, 4, 0.05), shakeOf(t, THOOM_T, 20, 0.13, 70), ...TURN_T.map((a) => shakeOf(t, a, 2, 0.04)), shakeOf(t, SWITCH_T, 4, 0.05), shakeOf(t, CASH_T, 3, 0.05), shakeOf(t, SLAP_T, 9, 0.05), shakeOf(t, PLUG_T, 7, 0.05), shakeOf(t, POWER_T, 12, 0.08)];
  // the song's bass keeps the loud shots trembling: the blast's shot and the café while the TV is on (a small shake on twos); the dead room from the BLIP on does not move
  const loud = inShot(f, "hurricane") ? 5 : f >= Math.round(THOOM_T * FPS) && f < Math.round(BLIP_T * FPS) ? 2.4 : 0;
  const bass = loud ? [loud * Math.sin(twos(f) * 2.7 + 0.4), 0.8 * loud * Math.cos(twos(f) * 2.1)] : [0, 0];
  return [parts.reduce((s, p) => s + p[0], bass[0]), parts.reduce((s, p) => s + p[1], bass[1])];
}
/** the camera's zoom about the shot's focus: the shot's own framing is in the scene, this is a slow push in the holds and a pulse on the hits */
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "tablet": return 1 + 0.03 * s.u + pulse(BLAST_T, 0.05, 0.08);
    case "hurricane": return 1 + 0.05 * s.u + pulse(SMASH_T, 0.03, 0.08);
    case "toddler": return 1 + 0.04 * s.u;
    case "rossWind": return 1 + 0.04 * s.u;
    case "momEat": return 1 + 0.04 * s.u;
    case "muffin": return 1 + 0.03 * s.u;
    case "momBrow": return 1 + 0.04 * s.u;
    case "rossNo": return 1 + 0.03 * s.u + pulse(RATTLE_T, 0.01, 0.1);
    case "momSmug": return 1 + 0.04 * s.u;
    case "tik": return 1 + 0.02 * s.u + pulse(TIK_T, 0.02, 0.05);
    case "lip": return 1 + 0.05 * s.u;
    case "momSnap": return 1 + 0.05 * s.u;
    case "bars": return 1 + 0.02 * s.u + pulse(ZIP_T, 0.05, 0.08);
    case "phones": return 1 + 0.03 * s.u;
    case "momHates": return 1 + 0.05 * s.u;
    case "canopy": return 1 + 0.03 * s.u + pulse(THOOM_T, 0.07, 0.1);
    case "windows": return 1 + 0.02 * s.u;
    case "turn": return 1 + 0.03 * s.u;
    case "switch": return 1 + 0.03 * s.u + pulse(SWITCH_T, 0.03, 0.05);
    case "usher": return 1 + 0.03 * s.u;
    case "cash": return 1 + 0.03 * s.u + pulse(CASH_T, 0.02, 0.07);
    case "munch": return 1 + 0.04 * s.u;
    case "proud": return 1 + 0.04 * s.u;
    case "battery": return 1 + (f < Math.round(BLIP_T * FPS) ? 0.03 * s.u : 0);
    case "silent": return 1 + 0.03 * s.u;
    case "lip2": return 1 + 0.06 * s.u;
    case "plead": return 1 + 0.04 * s.u;
    case "slide": return 1;
    case "six": return 1 + 0.03 * s.u;
    case "plug": return 1 + 0.02 * s.u + pulse(SLAP_T, 0.03, 0.06) + pulse(PLUG_T, 0.03, 0.06) + pulse(POWER_T, 0.05, 0.08);
    default: return 1;
  }
};

// ── the voices: the mouth, on twos, one frame ahead of the sound; closed whenever that character is not speaking
const lineOf = (who: Who, f: number, before = 0.1, after = 0.05) => LINES.find((q) => q.who === who && f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (who: Who, f: number) => !!lineOf(who, f);
export const speakingLine = (who: Who, f: number) => lineOf(who, f);
const ROUND = /^(w|tw|o|you|for|me|no)|oo|ow/;
export function mouthAt(who: Who, f: number): MouthShape {
  const l = lineOf(who, f);
  if (!l) return "closed";
  const fi = twos(f), a = l.amp[fi + 1 - l.f0] ?? 0;
  if (a < 0.1) return "closed";
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (who === "ROSS") return a >= 0.6 ? "mid" : "small";                               // polite and dry: never a wide mouth
  if (l.n === 12) return a >= 0.55 ? "mid" : "small";                                  // the whisper: never wide
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
const LINE_MOOD: Record<number, Mood> = { 1: "tight", 3: "flat", 5: "flat", 8: "polite", 10: "polite", 13: "flat" };
/** the mood of Ross's mouth and brows: the line's while it is spoken, else the shot's resting one (the polite strained smile in the blast (2, 4), flat at "...No." (8), polite with the headphones (14) and as the usher (20), dry at the register (29)) */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (who === "ROSS") {
    if (l && LINE_MOOD[l.n]) return LINE_MOOD[l.n];
    switch (id) {
      case "hurricane": case "rossWind": return "tight";                              // the polite strained smile
      case "rossNo": case "six": return "flat";
      default: return "polite";
    }
  }
  return "flat";
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x13-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [1.0, 1.6], 2: [1.2, 2.0], 3: [0.6, 1.0], 4: [1.6, 2.4], 5: [0.6, 1.0], 6: [1.8, 2.6], 7: [2.6, 3.8], 8: [0.8, 1.2], 9: [2.4, 3.4], 10: [0.9, 1.4], 11: [2.4, 3.4], 12: [0.8, 1.4], 13: [0.7, 1.2] };
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

// ── blinks: Ross's slow ones come after a line, dead flat; the mom's are quick and often; the toddler's glazed eyes do not blink at all
const BLINK_SHAPE = [0.35, 0.8, 1, 1, 0.8, 0.35];
const BLINKS: Record<"ross" | "mom", number[]> = { ross: [76, 232, 436, 590, 840], mom: [112, 203, 283, 372, 470, 655, 790] };
export const blinkOf = (who: "ross" | "mom", f: number) => { for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < BLINK_SHAPE.length) return BLINK_SHAPE[k]; } return 0; };

// ── the glazed eyes (src/x19-art.tsx GlazePupils): the pale-blue iris is this many times as wide as the painted pupil; the customers' pupils tick over in shot 25 through these gazes (x: steps off the painted look, y: the last tick looks a little down): scripts/eyes-check.mts
// holds every one of them inside the eye
export const IRIS_K = 2.1;
export const GAZE_STEPS = [0, 0.7, 1.4, 2.4], GAZE_DY = 0.25;
/** the radius of the disc of the eye's white drawn over a painted pupil `q` (x, y, r) in eye `e`: 3.2 px over the pupil, less where the pupil sits so near the edge of the white (its rig numbers run to the middle of the 3 px outline: the white ends 1.5 px inside) that
 * this would reach past it */
export function coverR(e: { cx: number; cy: number; rx: number; ry: number }, q: number[]): number {
  const out = (r: number) => { let m = -Infinity; for (let k = 0; k < 64; k++) { const u = (k / 64) * Math.PI * 2; m = Math.max(m, (Math.hypot((q[0] + r * Math.cos(u) - e.cx) / (e.rx - 1.5), (q[1] + r * Math.sin(u) - e.cy) / (e.ry - 1.5)) - 1) * Math.min(e.rx, e.ry)); } return m; };
  for (let c = 3.2; c >= 1.4; c -= 0.1) if (out(q[2] + c) <= 0) return q[2] + c;
  return q[2] + 1.4;
}

// ── the sounds. HITS: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s)
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "stamp", t: STAMP_T, sfx: "stamp", db: -3 },                                                           // the label slams on (x18's stamp: its hit is 0.044 s in)
  ...BAR_FRAMES.map((b, i): Hit => ({ id: `bar${i + 1}`, t: F(b), sfx: "tap", db: -8 - (i % 2) * 1.5 })),     // the volume bars tick up, one a frame (the click's peak is 0.018 s in)
  { id: "blast", t: BLAST_T, sfx: "blast", db: 0, start: true },                                              // the speaker's blast, on the frame of the song's first beat (a sub-bass boom, loud from its first sample)
  { id: "whoosh", t: BLAST_T, sfx: "whoosh", db: -3, start: true },                                           // the blast's mid-range partner (x10's whoosh, which swells to its peak 0.10 s in): a phone's speaker plays nothing under about 150 Hz
  { id: "smash", t: SMASH_T, sfx: "smash", db: 0, start: true },                                            // the cups smash behind Ross
  ...HOP_T.map((h, i): Hit => ({ id: `hop${i + 1}`, t: h, sfx: "boing", db: -3.5 - (i ? 1.5 : 0), start: true, len: 0.25, fade: 0.12 })),   // the muffin's three hops (x19-hop is sub-bass: x16's boing instead; the boing's attack is its first sample)
  { id: "rattle", t: RATTLE_T, sfx: "rattle", db: -5 },                                                      // the rack of chargers rattles (x11's rattle: its loudest rattle is 0.187 s in)
  { id: "tik", t: TIK_T, sfx: "tap", db: -2 },                                                               // Ross's finger on the volume key, TIK
  { id: "whimper1", t: WHIMPER1_T, sfx: "whimper1", db: -3, start: true },                                   // the first whimper
  { id: "jam", t: JAM_T, sfx: "tap", db: -3 },                                                               // her finger jams the volume key
  { id: "zip", t: ZIP_T, sfx: "zip", db: -2, start: true },                                                  // the bars shoot off the screen
  { id: "canopy", t: CANOPY_T, sfx: "canopy", db: -2, start: true },                                         // the stroller's canopy flips up
  { id: "thoom", t: THOOM_T, sfx: "thoom", db: -2, start: true },                                            // THOOM
  { id: "whump", t: THOOM_T, sfx: "whump", db: -4 },                                                         // the thoom's mid-bass partner (x10's whump: its thump is 0.072 s in), so that a phone's speaker plays something
  { id: "windows", t: WINDOWS_T, sfx: "windows", db: 0, start: true },                                      // the window bulges with the bass
  { id: "panes", t: WINDOWS_T, sfx: "rattle", db: 2, start: true, len: 0.7, fade: 0.2 },                    // the glass rattling in its frame (x11's rattle), the windows' mid-range partner
  ...TURN_T.map((t, i): Hit => ({ id: `turn${i + 1}`, t, sfx: "tap", db: -3 })),                             // the customers turn, a tick each
  { id: "switch", t: SWITCH_T, sfx: "switch", db: 4 },                                                      // the light switch, CLICK (its click is 0.06 s in)
  { id: "popcorn", t: POPCORN_T, sfx: "popcorn", db: 0, start: true },                                      // the popcorn bucket
  { id: "cash", t: CASH_T, sfx: "cash", db: 2, start: true },                                               // the hands with cash shoot up
  { id: "munch", t: MUNCH_T, sfx: "munch", db: 1, start: true },                                            // the toddler munches
  { id: "blip", t: BLIP_T, sfx: "blip", db: 1 },                                                            // BLIP (its beep's peak is 0.037 s in); the song stops on the same frame
  { id: "whimper2", t: WHIMPER2_T, sfx: "whimper2", db: -3, start: true },                                   // the second whimper, building in the silence
  { id: "slide", t: SLIDE_T, sfx: "slide", db: -4, start: true, len: 0.4, fade: 0.1 },                       // the charger slid across the counter (0.4 s of x11's slide: it ends before "Six fifty.")
  { id: "slap", t: SLAP_T, sfx: "slap", db: -3 },                                                            // her hand slaps the cash down (x15's slap: its smack is 0.064 s in)
  { id: "plug", t: PLUG_T, sfx: "plug", db: -3 },                                                            // the plug goes in (its click is 0.053 s in)
  { id: "power", t: POWER_T, sfx: "power", db: -2, start: true },                                            // the screen powers up
];

// ── the song: the tablet's kids' song (public/sfx/song.mp3, 32 s, 120 bpm) starts on the blast, ducks under every line, dips on Ross's TIK, jumps on the bars past MAX, is bigger and boomier through the stroller TV, stops dead on the BLIP (true silence
// from there to the plug) and starts again on the power-up, into the loop. SONG_ENV: its level in dB over the clip's own level, [time s, dB] breakpoints on the reel's clock, linear in dB (two breakpoints a millisecond apart are a step); SONG_DUCK: how many
// dB under the voices it sits while somebody talks (the global duck of the other sounds is 6 dB; the song is 22 so that the voices stay over it by at least x18's margin, scripts/x19-voice-over.py); SONG_BOOM: 0 .. 1, how much of the octave-down bass layer
// is under it (scripts/sp-mix.py `boom`)
export const SONG_DUCK = 22;
export const SONG_ENV: [number, number][] = [[BLAST_T, 0], [TIK_T - 0.001, 0], [TIK_T + 0.04, -4], [ZIP_T - 0.001, -4], [ZIP_T + 0.03, 1.5], [THOOM_T - 0.001, 1.5], [THOOM_T + 0.05, 3.5]];
export const SONG_BOOM: [number, number][] = [[THOOM_T - 0.001, 0], [THOOM_T + 0.12, 1]];

// ── sound cues for the mix (scripts/x19-cues.mts): the sounds sit 6 dB lower while somebody talks, the song 22
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number; duck?: number; env?: [number, number][]; boom?: [number, number][] };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => {
    let at = h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), from = h.from ?? 0;
    if (at < 0) { from += -at; at = 0; }                           // the peak is before the reel's start: skip into the clip so that the peak still lands on the frame
    c.push({ name: h.sfx, at, db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(from ? { from } : {}) });
  });
  // the song: the first run ends on the BLIP's frame (a 6 ms fade so that it does not click: it stops dead), the second starts on the power-up and plays to the end of the reel
  c.push({ name: "song", at: BLAST_T, db: 0, len: BLIP_T - BLAST_T, fade: 0.006, duck: SONG_DUCK, env: SONG_ENV, boom: SONG_BOOM });
  c.push({ name: "song", at: POWER_T, db: 0, duck: SONG_DUCK, env: [[POWER_T, 0]] });
  return c.sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x18-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through is captioned twice: the part up to the cut, and after the cut the
// sentence from that word on. Nothing is emphasised: the words are white
export type Cap = { who: Who; n: number; text: string; t0: number; t1: number; w0: number; w1: number; words: { d: string; t: number; emph: boolean }[] };
const say = (w: Word) => w.d;
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
export const NO_CAP: ShotId[] = [];
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  const cuts = SHOTS.slice(1).map((s) => s.t0);
  for (const l of LINES) {
    const len = (ws: Word[]) => ws.map((w) => say(w)).join(" ").length;
    const chunks: Word[][] = [];
    let cur: Word[] = [];
    l.words.forEach((w, i) => {
      cur.push(w);
      const nxt = l.words[i + 1];
      if (/[.?!]$/.test(w.d) || (nxt && cuts.some((c) => c >= w.e - 0.02 && c <= nxt.t + 0.02)) || (nxt && nxt.t - w.e > 0.3 && len(cur) >= 9)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const mk = (ws: Word[], t0: number, t1: number, w0: number, w1: number): Cap => ({ who: l.who, n: l.n, text: ws.map((w) => say(w)).join(" "), t0, t1, w0, w1, words: ws.map((w) => ({ d: say(w), t: w.t, emph: false })) });
    chunks.forEach((ws) => {
      const first = ws === chunks[0] ? Math.min(l.first, ws[0].t) : ws[0].t;
      const last = stretchEnd(l, ws[ws.length - 1].e);
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
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { six: [1340, 1500] };
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the biggest size of a caption in the shot (px): the mom's shouts are the biggest */
const CAP_MAX: Partial<Record<ShotId, number>> = { momSnap: 150, momHates: 150, proud: 140 };
export const capMax = (id: ShotId): number => CAP_MAX[id] ?? 124;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is); SHEET_T is the named moment of each shot for the contact sheet
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${NO[sh.id]} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const SHEET_T: Record<ShotId, number> = {
  tablet: F(10), hurricane: F(21), toddler: F(46), rossWind: F(75), momEat: F(115), muffin: F(147), momBrow: F(205), rossNo: F(228), momSmug: F(275), tik: F(308), lip: F(340), momSnap: F(372), bars: F(406), phones: F(432), momHates: F(470),
  canopy: F(506), windows: F(521), turn: F(538), switch: F(556), usher: F(585), cash: F(610), munch: F(632), proud: F(660), battery: F(700), silent: F(720), lip2: F(755), plead: F(785), slide: F(814), six: F(836), plug: F(876),
};
export const KEY_FRAMES: { label: string; f: number }[] = [
  ...SHOT_IDS.flatMap((id) => { const s = SHOTS.find((x) => x.id === id)!, f0 = Math.round(s.t0 * FPS), f1 = Math.round(s.t1 * FPS); return [kf("first", f0 / FPS), kf("named moment", SHEET_T[id]), kf("last", (f1 - 1) / FPS)]; }),
];
