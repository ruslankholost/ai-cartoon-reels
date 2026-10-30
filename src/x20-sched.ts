// The timeline and the acting of x20 "One Coffee" (src/X20.tsx, docs/x20-one-coffee.md, the shot list v2 on the voices' clock and the build spec). Pure data and arithmetic, the shape of src/x19-sched.ts: every number is a function of the frame, of the
// fifteen voice takes in public/x20/timings.json and of the mouth loudness in src/amp-x20.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the gaps of
// episodes/x20.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound that is not loud from its first sample is put so that its measured peak sits on its picture's hit
// (src/sfx-peaks.json); the others start on their frame.
//
// Where this differs from the spec's shot list: only the frames. A spec time that falls on half a frame goes up to the next frame (1.35 -> frame 41, 1.85 -> frame 56, 2.55 -> 77, 3.25 -> 98, 4.55 -> 137, 5.85 -> 176, 9.65 -> 290, 10.55 -> 317, 13.25 -> 398, 14.15 -> 425,
// 16.85 -> 506, 20.55 -> 617, 21.15 -> 635, 25.25 -> 758) and so does a hit (0.05 -> 2, 0.35 -> 11, 10.95 -> 329, 15.72 -> 472, 16.35 -> 491, 16.65 -> 500, 21.25 -> 638, 21.75 -> 653, 22.95 -> 689, 24.12 -> 724, 27.95 -> 839, 28.95 -> 869). No cut is
// moved onto a word. The reel is 885 frames = 29.50 s and it loops: shot 29's coins slap the counter and the cut to shot 1 slaps them again; the radio, which stopped dead on the gong, starts again on the first frame.
import timings from "../public/x20/timings.json" with { type: "json" };
import amps from "./amp-x20.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x19-sched.ts): take n of public/x20/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "CAMPER" | "ROSS" | "GUY1" | "GUY2" | "GUY3";
const WHO: Record<string, Who> = { CAMPER: "CAMPER", ROSS: "ROSS", "GUY 1": "GUY1", "GUY 2": "GUY2", "GUY 3": "GUY3" };
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

// ── the cuts: frame numbers. Speech on the reel's clock (first sound .. last word): 1 CAMPER 0.15-1.37 (One 0.21, small 0.54, drip 0.97), 2 ROSS 1.87-3.18 (Can 1.87, I 2.02, get 2.23, you 2.38, anything 2.60, else 2.81), 3 CAMPER 3.33-4.40 (I 3.42,
// bought 3.54, a 3.74, coffee 3.85), 4 ROSS 4.65-5.58 (At 4.82, eight 4.98), 5 CAMPER 5.98-7.28 (Still 6.19, drinking 6.47, it 6.91), 6 ROSS 7.58-9.55 (Someone 7.75, else 8.05, might 8.34, want 8.63, that 8.89, table 9.22), 7 CAMPER 9.80-10.35 (Who 9.85),
// 8 GUY 1 11.85-13.18 (One 11.81, small 12.22, drip 12.62), 9 GUY 2 13.28-14.06 (Small 13.39, drip 13.66), 10 GUY 3 14.21-15.59 (Just 14.49, water 14.99), 11 ROSS 17.69-18.90 (When 17.88, are 18.05, you 18.17, leaving 18.33), 12 CAMPER 19.10-20.43 (When 19.17,
// we 19.39, sell 19.61, the 19.79, company 19.90), 13 CAMPER 21.73-24.02 (SOLD 21.94-22.59, FORTY 22.90, MILLION 23.38), 14 CAMPER 25.32-26.73 (Refills 25.36, are 25.80, free 26.02, right 26.46), 15 ROSS 27.08-28.10 (Forty 27.18, million 27.50)
const F = (n: number) => n / FPS;
const S = {
  coins: F(0), clock: F(18), web: F(41), rossA: F(56), rossB: F(77), bought: F(98), eight: F(137), sip: F(176), table: F(222), who: F(290), empty: F(317), door: F(342), row: F(354), guy2: F(398), guy3: F(425),
  tables: F(471), plug: F(489), steam: F(506), leaving: F(528), call: F(570), offer: F(617), gong: F(635), cheer: F(651), pop: F(687), soaked: F(723), cup: F(758), dry: F(807), freeze: F(849), slap: F(867),
};
export const T_END = F(885);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "coins", "clock", "web", "rossA", "rossB", "bought", "eight", "sip", "table", "who", "empty", "door", "row", "guy2", "guy3",
  "tables", "plug", "steam", "leaving", "call", "offer", "gong", "cheer", "pop", "soaked", "cup", "dry", "freeze", "slap",
] as const;
export type ShotId = (typeof SHOT_IDS)[number];
/** the spec's number of each shot (one picture each) */
export const NO: Record<ShotId, string> = Object.fromEntries(SHOT_IDS.map((id, i) => [id, String(i + 1)])) as Record<ShotId, string>;
export const FRAMING: Record<ShotId, "INSERT" | "CLOSE" | "MEDIUM" | "WIDE"> = {
  coins: "INSERT", clock: "INSERT", web: "CLOSE", rossA: "MEDIUM", rossB: "CLOSE", bought: "CLOSE", eight: "CLOSE", sip: "CLOSE", table: "CLOSE", who: "CLOSE", empty: "WIDE", door: "INSERT", row: "MEDIUM", guy2: "CLOSE", guy3: "CLOSE",
  tables: "WIDE", plug: "INSERT", steam: "CLOSE", leaving: "CLOSE", call: "CLOSE", offer: "INSERT", gong: "MEDIUM", cheer: "MEDIUM", pop: "CLOSE", soaked: "CLOSE", cup: "MEDIUM", dry: "CLOSE", freeze: "CLOSE", slap: "INSERT",
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
export const STAMP_T = F(0);                                  // shot 1: the label POV: YOU OWN A CAFÉ slams on (spec 0.00)
export const COINS_T = F(2);                                  // shot 1: the camper's hand slaps four coins on the counter (spec 0.05: half a frame, up)
export const CUP_T = F(9);                                    // shot 1: Ross's hand sets the tiny cup down (spec 0.30)
export const POP_T = F(11);                                   // shot 1: "$2.50" pops over the cup (spec 0.35: half a frame, up)
export const PILL_T = F(35);                                  // the label shrinks into its pill at the top (spec 1.15: half a frame, up)
export const CLOCK_F = 26, CLOCK_T = F(CLOCK_F);              // shot 2: the wall clock's whirr starts (the coordinator's 0.95 is its first strike, the clip starts 0.10 s = 3 frames before it)
export const WHIRL0 = 29, WHIRL1 = 37;                        // shot 2: frames: the hands whirl from 8:00 to 3:00 (the clip's first strike is 0.10 s in, its second 0.35 s in: the start and the landing); before it the 8:00 AM holds (frames 18-28, the last three with the hands drawn back) and after it the 3:00 PM (37-40) to the cut at 41
export const TYPING_T = F(98);                                // shot 6: the camper types under his line (the shot's own start, spec 3.25)
export const SLURP_T = F(177);                                // shot 8: the long empty slurp (spec 5.90)
export const SNAP_T = F(198);                                 // shot 8: the cobweb strand from the cup to the table snaps (spec 6.60)
export const TUMBLE_T = F(318);                               // shot 11: the tumbleweed rolls in (spec 10.60)
export const CRICKET_T = F(329);                              // shot 11: a cricket chirps (spec 10.95: half a frame, up)
export const BELL_T = F(343);                                 // shot 12: DING-A-LING, the door swings open and the radio comes back (spec 11.42)
export const SCRAPE_T = F(472);                               // shot 16: the tables are shoved together (spec 15.72)
export const PULL_T = F(491);                                 // shot 17: Guy 2 yanks the espresso machine's plug out of the wall (spec 16.35: half a frame, up)
export const PLUGIN_T = F(500);                               // shot 17: and plugs the power strip in (spec 16.65: half a frame, up)
export const SPUTTER_T = F(506);                              // shot 18: the espresso machine sputters (spec 16.87)
export const CHIME_T = F(618);                                // shot 21: OFFER ACCEPTED, the chime (spec 20.60)
export const GONG_T = F(638);                                 // shot 22: the mallet hits the gong, the radio stops dead (spec 21.25: half a frame, up)
export const CHEER_T = F(653);                                // shot 23: the four cheer (spec 21.75: half a frame, up)
export const CHAMP_T = F(689);                                // shot 24: the two bottles pop, the foam bursts up (spec 22.95: half a frame, up)
export const SPRAY_T = F(724);                                // shot 25: the foam lands on Ross (spec 24.12: 723.6, up)
export const DRIP_T = F(839);                                 // shot 27: a drop falls off Ross's chin (spec 27.95: half a frame, up)
export const COINS2_T = F(869);                               // shot 29: the camper's hand slaps coins on the counter (spec 28.95: half a frame, up)
export const BOTTLE2_T = F(692);                              // shot 24: the second bottle, three frames after the first

// ── the clock of shot 2 (the wall clock of the counter plate: its face is blank in the plate, the hands and the digits are code): the minutes the hands have run since 8:00 (a pull back of ANT minutes on frames 26-29: the anticipation; then 420 minutes, seven hours,
// in the eight frames from WHIRL0 to WHIRL1), the hours the digits show (8 .. 3 with a roll between two numbers) and the settle (a small shake of the hands on the landing)
const ANT = 4;
export const clockMinutes = (f: number): number => (f < CLOCK_F ? 0 : f < WHIRL0 ? -ANT * ease((f - CLOCK_F) / (WHIRL0 - CLOCK_F)) : -ANT + (420 + ANT) * ease((f - WHIRL0) / (WHIRL1 - WHIRL0)));
export const clockSettle = (f: number): number => (f >= WHIRL1 ? Math.exp(-(f - WHIRL1) / 2.2) * Math.sin((f - WHIRL1) * 2.4) * 5 : 0);
/** the hours since 8 that the readout shows (0 .. 7, continuous: the digits roll between two numbers) */
export const clockHours = (f: number): number => Math.max(0, Math.min(7, clockMinutes(f) / 60));
/** the readout's text for a whole number of hours since 8: [hour, "AM" | "PM"] */
export const readout = (h: number): [string, "AM" | "PM"] => [String(((8 + h - 1) % 12) + 1), 8 + h >= 12 ? "PM" : "AM"];
/** the light through the café's window swings over the wall (shot 2): its place across the frame (frame x of its middle), its turn (degrees) and how strong it is */
export function lightAt(f: number): { x: number; ang: number; op: number } {
  const u = clamp01((f - CLOCK_F) / (WHIRL1 + 4 - CLOCK_F));
  return { x: lerp(-260, 1340, ease(u)), ang: lerp(16, -16, ease(u)), op: u <= 0 || u >= 1 ? 0 : 0.42 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.5 };
}

// ── the label: POV: YOU OWN A CAFÉ slams on big at the first frame and shrinks into a small pill at the top on the frame before the cut of shot 3 (1.15 s). `big`: the scale of the big one (a stamp: over its size at first, settled in four frames), `pill`: 0 big .. 1 the pill
export const labelBig = (f: number): number => { const a = f / FPS - STAMP_T; return 1 + 0.18 * Math.exp(-a / 0.045) * Math.cos(a * 46); };
export const pillP = (f: number): number => ease((f / FPS - PILL_T) / 0.2);

// ── the shake and the camera
/** a decaying shake of the camera (frame px): the stamp, the coins, the cup, the pop, the bell, the pull and the plug, the sputter, the chime, THE GONG (the big one), the cheer, the two bottles, the foam, the coins again; none in the silences (the empty café, the freeze) */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, STAMP_T, 7, 0.05), shakeOf(t, COINS_T, 4, 0.04), shakeOf(t, CUP_T, 3, 0.04), shakeOf(t, POP_T, 3, 0.04), shakeOf(t, F(WHIRL1), 4, 0.05), shakeOf(t, SNAP_T, 2.5, 0.04), shakeOf(t, BELL_T, 4, 0.05), shakeOf(t, SCRAPE_T, 3, 0.15, 70),
    shakeOf(t, PULL_T, 6, 0.05), shakeOf(t, PLUGIN_T, 5, 0.05), shakeOf(t, SPUTTER_T, 3, 0.06), shakeOf(t, CHIME_T, 3, 0.05), shakeOf(t, GONG_T, 22, 0.16, 62), shakeOf(t, CHEER_T, 6, 0.08), shakeOf(t, CHAMP_T, 8, 0.07), shakeOf(t, BOTTLE2_T, 6, 0.06), shakeOf(t, SPRAY_T, 8, 0.08), shakeOf(t, COINS2_T, 5, 0.05)];
  return [parts.reduce((s, p) => s + p[0], 0), parts.reduce((s, p) => s + p[1], 0)];
}
/** the camera's zoom about the shot's focus: the shot's own framing is in the scene, this is a slow push in the holds and a pulse on the hits */
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "coins": return 1 + 0.03 * s.u + pulse(COINS_T, 0.03, 0.05) + pulse(CUP_T, 0.02, 0.05);
    case "clock": return 1 + 0.03 * s.u;
    case "web": return 1 + 0.04 * s.u;
    case "rossA": return 1 + 0.03 * s.u;
    case "rossB": return 1 + 0.03 * s.u;
    case "bought": return 1 + 0.03 * s.u;
    case "eight": return 1 + 0.03 * s.u;
    case "sip": return 1 + 0.04 * s.u + pulse(SNAP_T, 0.02, 0.05);
    case "table": return 1 + 0.02 * s.u;
    case "who": return 1 + 0.04 * s.u;
    case "empty": return 1 + 0.02 * s.u;
    case "door": return 1 + 0.03 * s.u + pulse(BELL_T, 0.03, 0.05);
    case "row": return 1 + 0.03 * s.u;
    case "guy2": return 1 + 0.04 * s.u;
    case "guy3": return 1 + 0.04 * s.u;
    case "tables": return 1 + 0.03 * s.u + pulse(SCRAPE_T, 0.02, 0.08);
    case "plug": return 1 + 0.02 * s.u + pulse(PULL_T, 0.04, 0.05) + pulse(PLUGIN_T, 0.03, 0.05);
    case "steam": return 1 + 0.03 * s.u + pulse(SPUTTER_T, 0.02, 0.06);
    case "leaving": return 1 + 0.03 * s.u;
    case "call": return 1 + 0.03 * s.u;
    case "offer": return 1 + 0.03 * s.u + pulse(CHIME_T, 0.03, 0.06);
    case "gong": return 1 + 0.02 * s.u + pulse(GONG_T, 0.07, 0.12);
    case "cheer": return 1 + 0.03 * s.u + pulse(CHEER_T, 0.03, 0.08);
    case "pop": return 1 + 0.03 * s.u + pulse(CHAMP_T, 0.05, 0.07);
    case "soaked": return 1 + 0.03 * s.u + pulse(SPRAY_T, 0.05, 0.08);
    case "cup": return 1 + 0.03 * s.u;
    case "dry": return 1 + 0.03 * s.u;
    case "freeze": return 1 + 0.05 * s.u;
    case "slap": return 1 + 0.02 * s.u + pulse(COINS2_T, 0.03, 0.05);
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
  if (l.n === 10) return a >= 0.55 ? "mid" : "small";                                  // "...Just water.": sheepish, never wide
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
const LINE_MOOD: Record<number, Mood> = { 2: "polite", 4: "flat", 6: "polite", 11: "flat", 15: "flat" };
/** the mood of Ross's mouth and brows: the line's while it is spoken, else the shot's resting one (polite at the counter, flat at "...At eight." and at the plug, polite under the foam, dry at the end) */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (who === "ROSS") {
    if (l && LINE_MOOD[l.n]) return LINE_MOOD[l.n];
    switch (id) {
      case "eight": case "leaving": case "dry": return "flat";
      default: return "polite";
    }
  }
  return who === "CAMPER" ? "smug" : "neutral";
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x13-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [1.0, 1.6], 2: [1.0, 1.6], 3: [0.6, 1.0], 4: [0.5, 0.9], 5: [0.8, 1.2], 6: [1.4, 2.0], 7: [1.8, 2.6], 8: [1.2, 2.0], 9: [1.2, 2.0], 10: [0.8, 1.2], 11: [0.6, 1.0], 12: [0.8, 1.4], 13: [2.8, 4.0], 14: [1.8, 2.8], 15: [0.6, 1.0] };
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

// ── blinks: Ross's slow ones come after a line, dead flat (every one inside a shot of his); the camper's are quick and rare
const BLINK_SHAPE = [0.35, 0.8, 1, 1, 0.8, 0.35];
const BLINKS: Record<"ross" | "camper", number[]> = { ross: [92, 168, 270, 560, 745, 835], camper: [48, 118, 190, 305, 590, 770] };
export const blinkOf = (who: "ross" | "camper", f: number) => { for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < BLINK_SHAPE.length) return BLINK_SHAPE[k]; } return 0; };

// ── the sounds. HITS: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s)
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number; duck?: number };
export const HITS: Hit[] = [
  { id: "stamp", t: STAMP_T, sfx: "stamp", db: -6 },                                                           // the label slams on (x18's stamp: its hit is 0.044 s in)
  { id: "coins1", t: COINS_T, sfx: "coins", db: -9, start: true, from: 0.15, len: 0.5, fade: 0.1 },            // the camper's hand slaps four coins down (lips8's coins: the soft first rattle at 0.02 s is skipped, the slap is 0.17 s in)
  { id: "cup", t: CUP_T, sfx: "clink", db: -8 },                                                              // the tiny cup lands (x10's clink: its peak is 0.026 s in)
  { id: "pop", t: POP_T, sfx: "pop", db: -10 },                                                                // "$2.50" pops (its peak is 0.063 s in)
  { id: "clock", t: CLOCK_T, sfx: "clockspin", db: -4, start: true },                                         // the wall clock's hands whirl seven hours (x18's whirr: strikes 0.10 s and 0.35 s in = the start and the landing of the whirl)
  { id: "typing", t: TYPING_T, sfx: "taps", db: -10, start: true },                                            // the camper types under "I bought a coffee." (six taps in 1.07 s)
  { id: "slurp", t: SLURP_T, sfx: "slurp", db: -7, start: true },                                             // the long empty slurp
  { id: "snap", t: SNAP_T, sfx: "snap", db: -8 },                                                             // the cobweb strand snaps
  { id: "tumbleweed", t: TUMBLE_T, sfx: "tumbleweed", db: -8, start: true, len: 0.8, fade: 0.2 },             // the tumbleweed rolls over the floor in the silent café
  { id: "cricket", t: CRICKET_T, sfx: "cricket", db: -10, start: true },                                      // a cricket chirps
  { id: "bell", t: BELL_T, sfx: "doorbell", db: -7, start: true, from: 0.1, len: 0.75, fade: 0.2 },           // the door's bell (x11's: the first strike is at 0.15 s, skipped to 0.10 so that it lands on the door's opening, as in x18)
  { id: "scrape", t: SCRAPE_T, sfx: "scrape", db: -6, start: true },                                          // the tables are shoved together
  { id: "pull", t: PULL_T, sfx: "plug", db: -4 },                                                             // the espresso machine's plug yanked out (x19's plug: its click is 0.053 s in)
  { id: "plugin", t: PLUGIN_T, sfx: "plug", db: -5 },                                                         // the power strip plugged in
  { id: "sputter", t: SPUTTER_T, sfx: "sputter", db: -8, start: true },                                       // the espresso machine sputters and dies
  { id: "chime", t: CHIME_T, sfx: "bingbong", db: -10, start: true, len: 0.75, fade: 0.25 },                   // OFFER ACCEPTED (x17's cabin chime: a tone, loud on its first frame; 0.75 s so that it is gone when the gong strikes)
  { id: "gong", t: GONG_T, sfx: "gong", db: -12, start: true, duck: 16 },                                                // the gong
  { id: "cheer", t: CHEER_T, sfx: "cheer", db: -12, start: true, len: 1.0, fade: 0.35, duck: 12 },                                             // the four cheer
  { id: "champagne", t: CHAMP_T, sfx: "champagne", db: -11, start: true },                                     // the foam of the two bottles (a hiss, nothing under 1 kHz)
  { id: "pop1", t: CHAMP_T, sfx: "pop", db: -12 },                                                             // the first bottle's pop: the body the foam's hiss lacks
  { id: "pop2", t: BOTTLE2_T, sfx: "pop", db: -14 },                                                           // the second bottle's
  { id: "spray", t: SPRAY_T, sfx: "spray", db: -7, start: true, len: 1.0, fade: 0.3 },                         // the foam lands all over Ross (the spray can's hiss: loud from 0.05 s in; 1.0 s of it, it ends before the cut to the camper)
  { id: "drip", t: DRIP_T, sfx: "drip", db: -10 },                                                             // a drop falls off Ross's chin
  { id: "coins2", t: COINS2_T, sfx: "coins", db: -7, start: true, from: 0.15 },                                // his hand slaps coins on the counter: the cut to shot 1 loops it
];

// ── the radio: the café's music (public/sfx/radio.mp3, 32 s, 60 bpm, high-passed at 150 Hz: a small radio on a shelf) is low from the first frame, ducks under every line, drops out when the camera sees the empty café (the cut to shot 11: a 0.15 s fade) so that
// the tumbleweed and the cricket sit in silence, comes back with the door's bell (from clip second 15.98: a beat, at 16.05 s, then lands 0.07 s after the bell), and stops dead on the gong (a 6 ms fade). After "...Forty million." there is no music: the loop starts it again.
// RADIO_DB: its level in the room; RADIO_DUCK: how many dB under that it sits while somebody talks (the other sounds are 6 dB under the voices)
export const RADIO_DB = -9, RADIO_DUCK = 12;
export const RADIO_RUNS: { at: number; end: number; from: number; fade: number }[] = [{ at: F(0), end: S.empty, from: 0, fade: 0.15 }, { at: BELL_T, end: GONG_T, from: 15.98, fade: 0.006 }];

// ── sound cues for the mix (scripts/x20-cues.mts): the sounds sit 6 dB lower while somebody talks, the radio RADIO_DUCK
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number; duck?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => {
    let at = h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), from = h.from ?? 0;
    if (at < 0) { from += -at; at = 0; }                           // the peak is before the reel's start: skip into the clip so that the peak still lands on the frame
    c.push({ name: h.sfx, at, db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(from ? { from } : {}), ...(h.duck ? { duck: h.duck } : {}) });
  });
  RADIO_RUNS.forEach((r) => c.push({ name: "radio", at: r.at, db: RADIO_DB, len: r.end - r.at, fade: r.fade, ...(r.from ? { from: r.from } : {}), duck: RADIO_DUCK }));
  return c.sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x19-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A cut that falls within 0.06 s before the end of a word or 0.08 s after the start of the next one is a cut
// between the two (the spec's "Can I get you" / "anything else?" cuts a word's last 0.03 s, its "One" / "small drip." the first 0.06 s of "small"); a word that a cut runs through further in is captioned twice: the part up to the cut, and after the cut
// the sentence from that word on. Nothing is emphasised: the words are white
export type Cap = { who: Who; n: number; text: string; t0: number; t1: number; w0: number; w1: number; words: { d: string; t: number; emph: boolean }[] };
const say = (w: Word) => w.d;
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
export const NO_CAP: ShotId[] = [];
const NEAR_END = 0.06, NEAR_START = 0.08;
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
      if (/[.?!]$/.test(w.d) || (nxt && cuts.some((c) => c >= w.e - NEAR_END && c <= nxt.t + NEAR_START)) || (nxt && nxt.t - w.e > 0.3 && len(cur) >= 9)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const mk = (ws: Word[], t0: number, t1: number, w0: number, w1: number): Cap => ({ who: l.who, n: l.n, text: ws.map((w) => say(w)).join(" "), t0, t1, w0, w1, words: ws.map((w) => ({ d: say(w), t: w.t, emph: false })) });
    chunks.forEach((ws) => {
      const first = ws === chunks[0] ? Math.min(l.first, ws[0].t) : ws[0].t;
      const last = stretchEnd(l, ws[ws.length - 1].e);
      const t0 = first - 0.04, t1 = last + 0.25;
      // the shot of the chunk is the one its first word is said in: a cut that sits just before the word (within NEAR_START after its start) is the shot's own start
      const lead = Math.max(...cuts.filter((c) => c <= ws[0].t + NEAR_START), -1), w0 = lead > ws[0].t ? lead : ws[0].t;
      const x = ws.findIndex((w, k) => cuts.some((c) => c > (k ? w.t : w0) + NEAR_START && c < w.e - NEAR_END));
      if (x < 0) { caps.push(mk(ws, t0, t1, w0, ws[ws.length - 1].e)); return; }
      const c = cuts.find((q) => q > (x ? ws[x].t : w0) + NEAR_START && q < ws[x].e - NEAR_END)!;
      caps.push(mk(ws.slice(0, x + 1), t0, c, w0, ws[x].e));
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
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { pop: [1120, 1500] };   // the shout of the bottles' shot: no face in it, so the band is taller and the two words are as big as the mom's shouts of x19
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the biggest size of a caption in the shot (px): the camper's shouts are the biggest */
const CAP_MAX: Partial<Record<ShotId, number>> = { cheer: 150, pop: 150 };
export const capMax = (id: ShotId): number => CAP_MAX[id] ?? 124;
/** the width a caption has to fit on ONE line to be set on one line (px): 88 everywhere; the shout of the bottles is set on two lines (FORTY / MILLION!) at the biggest size */
const CAP_ONE_MIN: Partial<Record<ShotId, number>> = { pop: 200 };
export const capOneMin = (id: ShotId): number => CAP_ONE_MIN[id] ?? 88;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is); SHEET_T is the named moment of each shot for the contact sheet
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${NO[sh.id]} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const SHEET_T: Record<ShotId, number> = {
  coins: F(14), clock: F(33), web: F(46), rossA: F(66), rossB: F(88), bought: F(112), eight: F(150), sip: F(190), table: F(250), who: F(300), empty: F(330), door: F(349), row: F(375), guy2: F(410), guy3: F(445),
  tables: F(480), plug: F(497), steam: F(510), leaving: F(545), call: F(595), offer: F(628), gong: F(642), cheer: F(665), pop: F(700), soaked: F(745), cup: F(780), dry: F(830), freeze: F(858), slap: F(875),
};
export const KEY_FRAMES: { label: string; f: number }[] = [
  ...SHOT_IDS.flatMap((id) => { const s = SHOTS.find((x) => x.id === id)!, f0 = Math.round(s.t0 * FPS), f1 = Math.round(s.t1 * FPS); return [kf("first", f0 / FPS), kf("named moment", SHEET_T[id]), kf("last", (f1 - 1) / FPS)]; }),
];
