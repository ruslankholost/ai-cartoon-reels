// The timeline and the acting of x09 "Habits of the Rich" (src/X09.tsx, docs/x09-habits-of-the-rich.md, the build spec). Pure data and arithmetic, the shape of src/x08-sched.ts: every number is a function of the frame, of the thirteen voice
// takes in public/x09/timings.json and of the mouth loudness in src/amp-x09.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the gaps
// of episodes/x09.jsonc carry the silent beats). The cuts and the named moments below hang on the voices as the build spec has them hang on its words (a shot starts so many frames before a word, a hit lands so many after it); every sound's
// measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's table of speech times: that table is older than the built voices. public/x09/timings.json (and the 30.6 s table read) has line 4 0.3 s longer than the table, so lines 5-13 sit 0.43-1.23 s later than the
// table says (line 6 at 10.29, not 9.79; line 13 at 29.16, not 27.93), and the reel runs to 30.9 s, not 29.6 s. The shots keep the spec's order, its durations and its relation to the words; only their clock moved. Shot 7 is split in two
// (no shot over 2.4 s: the line "DRINK! YOUR OWN! PEE!" is 2.3 s long and the rip, the raised glass and the chug are three beats).
import timings from "../public/x09/timings.json" with { type: "json" };
import amps from "./amp-x09.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x08-sched.ts): take n of public/x09/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "GURU" | "ROSS" | "DENISE";
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
/** line 4 is the guru through the tape: Whisper hears three muffled words that are no words; the caption is the spec's "MMF MMF MMF!" as one piece, from the first sound to the end of the third burst (before the cut to Ross's vein) */
const CAP_WORDS: Record<number, { d: string; t: number; e: number }[]> = { 4: [{ d: "MMF MMF MMF!", t: 4.55, e: 5.85 }] };
export const LINES: Line[] = TK.takes.map((t) => {
  const ofs = P(t.n), amp = AMP[t.file].amp;
  const words = (CAP_WORDS[t.n] ? CAP_WORDS[t.n].map((w) => ({ w: "mmf", d: w.d, t: w.t, e: w.e })) : t.words.map((w) => ({ ...w, t: ofs + w.t, e: ofs + w.e })));
  const i0 = amp.findIndex((a) => a >= 0.1);
  const base = { n: t.n, who: t.character as Who, file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
  const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: (j % 2 === 0 ? 1 : -1) as 1 | -1 }));
  return { ...base, peaks };
});
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;

// ── the cuts: frame numbers (a half frame of the spec is written as the frame it rounds up to). The 28 shots; shot 7 of the spec is 7 and 8 here
const F = (n: number) => n / FPS;
const S = {
  splash: F(0), ice: F(29), clock: F(45), tape: F(90), notebook: F(133), vein: F(176), drink: F(190), chug: F(225), woo: F(263), corks: F(285), snatch: F(308), board1: F(342), pens: F(360), tax: F(391), taxbox: F(453), wash: F(480),
  hit: F(527), dnote: F(575), scribble: F(593), slam: F(609), line11: F(639), turn: F(693), caught: F(722), denise: F(743), cash: F(791), eyes: F(813), headset: F(834), finale: F(872),
};
export const T_END = F(927);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "splash", "ice", "clock", "tape", "notebook", "vein", "drink", "chug", "woo", "corks", "snatch", "board1", "pens", "tax", "taxbox", "wash", "hit", "dnote", "scribble", "slam", "line11", "turn", "caught", "denise", "cash", "eyes", "headset", "finale",
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

// ── the named moments (seconds, every one on a frame). The words they hang on, from the voices: L1 ICE 0.04 BATH 0.47; L2 WAKE 1.59 FOUR 2.34; L3 TAPE 3.12 MOUTH 3.93; L4 three muffled bursts 4.55-4.78, 4.95-5.15, 5.28-5.85;
// L5 DRINK 6.46 YOUR 7.11 OWN 7.55 PEE 8.13-8.69; L6 Real 10.29 ... people 11.43, Write 12.07 this 12.31 down 12.67; L7 One 13.25 Tax 14.20 evasion 14.51; L8 Two 16.06 Money 16.71 laundering 17.03; L9 Three 17.61 Hire 18.29 hitman 18.70;
// L10 And 20.56 eleven 20.64, Sell 21.58 ... people 22.75; L11 How 24.96 course 25.68; L12 ...Ice 27.87 bath 28.27; L13 ICE 29.13 BATH 29.57
export const SPLASH1_T = F(16), PYRO1_T = F(17);        // shot 1: the guru lands in the ice on "BATH", the pyro fires a frame later
export const ICE_HIT_T = F(37);                         // shot 2: an ice cube smacks Ross's forehead (the spec's 1.05; 1.23 here, after the guru's "BATH!" is out (voiced to 1.18), so that the whack does not eat its "TH")
export const BURST_T = F(46);                           // shot 3: he bursts out of the ice, dripping
export const ALARM_T = F(46), CLOCK_SMASH_T = F(71);    // the alarm rings from here until he smashes it on "FOUR"
export const TAPE_T = F(119);                           // shot 4: the tape slaps over his mouth, on "MOUTH"
export const NOTE_T = [137, 148, 158].map(F);           // shot 5: Denise writes the three MMFs on the three bursts
export const UNDERLINE_T = [166, 170].map(F);           //         and underlines them twice (a squeak each)
export const VEIN_T = F(179);                           // shot 6: the vein pops up; it throbs again at THROB2_T
export const THROB2_T = F(187);
export const RIP_T = F(191);                            // shot 7: the tape comes off, just before "DRINK"
export const GLASS_UP_T = F(194);                       //         the glass goes up on "DRINK"
export const CHUG_T = F(244);                           // shot 8: he chugs on "PEE"
export const JUMP_T = F(263);                           // shot 9: the crowd jumps up on the cheer (the sound is on this frame)
export const CORK_T = [287, 291].map(F);                // shot 10: POP POP
export const KETTLE_T = F(292);
export const WHOOSH_T = F(310);                         // shot 11: Ross spins the board
export const PENS_T = F(380);                           // shot 13: every pen goes up on "down" (the clicks start a frame before the first pen)
export const BOARD1_T = [F(398), F(424)];               // shot 14: he writes "1." on "One", then "TAX EVASION" on "Tax evasion"
export const THUD_T = F(457);                           // shot 15: the envelope drops into the TAX box
export const WASH_T = F(481);                           // shot 16: the washing machine
export const DNOTE_T = F(576), HEART_T = F(589);        // shot 18: Denise writes HIRE A HITMAN and draws the heart
export const BLUR_T = F(593);                           // shot 19: Ross scribbles lines four to ten in a blur
export const SLAM_T = F(619);                           // shot 20: the marker slams on line eleven, on "eleven"
export const LINE11_T = [21.58, 21.98, 22.28, 22.42, 22.75].map((t) => snap(t - 0.04)); // shot 21: the words of line eleven light up with the words (Sell courses to broke people)
export const CREAK_T = F(694);                          // shot 22: every head turns, slowly
export const BEEP_T = F(723), GULP_T = F(735);          // shot 23: the guru is caught tapping a card: the reader beeps, he gulps
export const RUSTLE_T = F(794);                         // shot 25: every hand shoots up holding cash
export const TICK_T = [819, 827].map(F);                // shot 26: Ross's eyes, cash / line eleven / cash
export const HEADSET_T = [F(840), F(850)];              // shot 27: he picks up the headset (840) and puts it on (850)
export const SPLASH2_T = F(888), PYRO2_T = F(889);      // shot 28: Ross lands in the ice on "BATH", as the guru did

// ── layout facts the scenes share: the six crowd members and Ross and Denise in the front rows (indexes 0-5 for the crowd)
export const CROWD_N = 6;
/** the room as a wave, not a block: member i's delay (s) after a cue, spread over `spread` s */
export const stagger = (i: number, spread: number) => spread * ((i * 0.381966 + 0.5 * hash(i * 7.1 + 3)) % 1);
/** a cue played for member i: 0 before it, 1 after `dur` s, eased (a pop-up, a jump, a raised arm) */
export const cueP = (f: number, t0: number, i: number, spread: number, dur: number) => ease((f / FPS - (t0 + stagger(i, spread))) / dur);
/** shot 9: the crowd jumps up (a hop with a spring) and stays up; `up` px at the peak */
export const jumpAt = (i: number, f: number): number => { const a = f / FPS - (JUMP_T + stagger(i, 0.14)); return a < 0 ? 0 : 90 * Math.min(1, a / 0.1) * (a < 0.1 ? 1 : 1 - 0.55 * ease((a - 0.1) / 0.18)); };
/** shot 13: every pen goes up on "down", shot 25: every hand shoots up with cash; shot 22: every head turns, slowly (0 facing the stage .. 1 turned to the guru) */
export const penUp = (i: number, f: number) => cueP(f, PENS_T + 0.02, i, 0.18, 0.1);
export const cashUp = (i: number, f: number) => cueP(f, RUSTLE_T, i, 0.2, 0.1);
export const turnAt = (i: number, f: number) => cueP(f, CREAK_T - 0.1, i, 0.5, 0.55);

// ── his face: the steam out of the ear holes, the plugs, the vein, the twitch
/** the steam out of his ear holes: 0 none .. 1 thin jets .. 2 thick. From the kettle's start (shot 10) it thickens over half a second, holds through "Real habits of rich people", and thins out in "Write this down" (out by 12.8, as the spec's kettle) */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t < KETTLE_T) return 0;
  return t < 11.9 ? 1 + 1.0 * ease((t - KETTLE_T) / 0.5) : 2 * (1 - ease((t - 11.9) / 0.9));
}
/** which head picture: both plugs (before the pops), only the left one gone, both gone */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** the vein on his forehead (0 none .. 1, a little over on the pop): it pops up on VEIN_T with a spring, throbs on twos while he is angry, and goes once he is calm ("...Ice bath?") */
export function veinAt(f: number): number {
  const t = f / FPS;
  if (t < VEIN_T) return 0;
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  return Math.min(1.15, popP(t, VEIN_T, 0.45, 40)) * (t > VEIN_T + 0.4 ? throb : 1) * (1 - ease((t - 24.1) / 0.6));
}
/** his twitching eye (the lid of his left eye of the picture jumps down and back on twos): from the ice cube's hit on, in the shots where he sits and stews (2, 6) */
export function twitchAt(f: number): number {
  const t = f / FPS;
  if (t < ICE_HIT_T + 0.1 || !inShot(f, "ice", "vein")) return 0;
  const k = twos(f) % 12;
  return k === 0 || k === 4 ? 0.55 : k === 2 ? 0.3 : 0;
}

// ── the camera of a shot: the zoom factor about the shot's focus (a slow push in the holds, a pulse on the hits)
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "splash": return 1 + 0.03 * s.u + pulse(SPLASH1_T, 0.05);
    case "ice": return 1 + pulse(ICE_HIT_T, 0.05);
    case "clock": return 1 + 0.03 * s.u + pulse(CLOCK_SMASH_T, 0.05);
    case "tape": return 1 + 0.03 * s.u + pulse(TAPE_T, 0.06);
    case "vein": return 1 + 0.04 * s.u + pulse(VEIN_T, 0.03);
    case "drink": return 1 + 0.05 * s.u;
    case "chug": return 1 + 0.03 * s.u;
    case "corks": return 1 + pulse(CORK_T[0], 0.03) + pulse(CORK_T[1], 0.03);
    case "board1": return 1 + 0.03 * s.u;
    case "slam": return 1 + 0.03 * s.u + pulse(SLAM_T, 0.06);
    case "denise": return 1 + 0.03 * s.u;
    case "headset": return 1 + 0.03 * s.u;
    case "finale": return 1 + pulse(SPLASH2_T, 0.05);
    default: return 1 + 0.02 * s.u;
  }
};
/** the camera's shake, frame px: the splash, the whack, the crash, the slap, the slam, the splash again; decaying, on every frame */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, SPLASH1_T, 26, 0.14), shakeOf(t, ICE_HIT_T, 12, 0.07), shakeOf(t, CLOCK_SMASH_T, 22, 0.1), shakeOf(t, TAPE_T, 14, 0.08), shakeOf(t, VEIN_T, 4, 0.06), shakeOf(t, SLAM_T, 26, 0.1), shakeOf(t, THUD_T, 8, 0.07), shakeOf(t, SPLASH2_T, 26, 0.14)];
  return [parts.reduce((s, p) => s + p[0], 0), parts.reduce((s, p) => s + p[1], 0)];
}
/** the white flash of the pyro (and of the two big hits): 0..1 */
export const flashAt = (f: number): number => { const t = f / FPS; return Math.max(...[PYRO1_T, PYRO2_T].map((t0) => (t >= t0 ? Math.exp(-(t - t0) / 0.05) : 0)), ...[SLAM_T].map((t0) => (t >= t0 ? 0.5 * Math.exp(-(t - t0) / 0.035) : 0))); };

// ── the voices: the mouth, on twos, one frame ahead of the sound; closed whenever that character is not speaking. Line 4 is the guru through the tape: his mouth is hidden by it, and the tape bulges with the sound (`tapeBulge`)
const lineOf = (who: Who, f: number, before = 0.1, after = 0.05) => LINES.find((q) => q.who === who && f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (who: Who, f: number) => !!lineOf(who, f);
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const SMALL = new Set([8, 12]);  // said small: Ross's "Two. Money laundering." is punchy but flat, his "...Ice bath?" is unsure (the mouth is never wider than mid)
export function mouthAt(who: Who, f: number): MouthShape {
  const l = lineOf(who, f);
  if (!l || l.n === 4) return "closed";
  const fi = twos(f), a = l.amp[fi + 1 - l.f0] ?? 0;
  if (a < 0.1) return "closed";
  const w = l.words.find((x) => fi / FPS >= x.t - 0.05 && fi / FPS <= x.e + 0.05);
  if (SMALL.has(l.n)) return a >= 0.45 ? "mid" : "small";
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
/** how hard the tape bulges with the muffled voice (shot 4 after the slap, shot 5-6 are not on his face): 0..1 */
export const tapeBulge = (f: number): number => { const l = LINE(4); return Math.max(0, Math.min(1, (l.amp[twos(f) - l.f0] ?? 0) * 1.1)); };
const LINE_MOOD: Record<number, Mood> = { 1: "pitchy", 2: "pitchy", 3: "pitchy", 4: "flat", 5: "pitchy", 6: "angry", 7: "angry", 8: "angry", 9: "angry", 10: "furious", 11: "polite", 12: "defeated", 13: "pitchy" };
/** the mood of a character's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (l) return LINE_MOOD[l.n];
  if (who === "GURU") return "pitchy";
  if (who === "DENISE") return id === "denise" ? "polite" : "flat";
  switch (id) {
    case "ice": case "vein": case "corks": return "angry";
    case "snatch": case "board1": case "scribble": case "slam": return "angry";
    case "cash": case "eyes": return "impatient";
    case "headset": return "defeated";
    default: return "flat";
  }
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames; it settles after the line (src/x08-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [3.4, 7], 2: [3.4, 7], 3: [3.4, 7], 4: [1.5, 3], 5: [3.4, 7], 6: [2.2, 4], 7: [2.8, 5.5], 8: [2.8, 5.5], 9: [3.0, 6], 10: [3.4, 7], 11: [1.6, 3], 12: [0.8, 1.2], 13: [3.4, 7] };
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

// ── what is written, and how far: the notebook (shots 5 and 18), the board (shots 14, 19, 20, 21). Progress 0..1 of a stroke is the share of it drawn; the pen tip is at the end of the drawn part
export const clamp = clamp01;
/** shot 5: the three MMFs (each is written in 0.22 s on its burst), the two underlines (0.1 s each) */
export const noteMmf = (i: number, f: number) => clamp01((f / FPS - NOTE_T[i]) / 0.22);
export const noteUnder = (i: number, f: number) => clamp01((f / FPS - UNDERLINE_T[i]) / 0.1);
/** shot 18: "HIRE A HITMAN" is written from DNOTE_T for 0.4 s, the heart is drawn in 0.12 s from HEART_T */
export const noteHire = (f: number) => clamp01((f / FPS - DNOTE_T) / 0.4);
export const noteHeart = (f: number) => clamp01((f / FPS - HEART_T) / 0.12);
/** shot 14: "1." (0.25 s on "One") then "TAX EVASION" (0.9 s from "Tax") */
export const boardOne = (f: number) => clamp01((f / FPS - BOARD1_T[0]) / 0.25);
export const boardTax = (f: number) => clamp01((f / FPS - BOARD1_T[1]) / 0.9);
/** how many lines of the list are on the board in a wide shot: 0 before shot 14, 1 after "1.", ... ; all eleven from the slam. (The scenes show only the lines written so far, in the wide shots.) */
export const boardLines = (f: number): number => { const t = f / FPS; return t >= SLAM_T ? 11 : t >= BLUR_T ? 3 : t >= BOARD1_T[1] ? 3 : t >= BOARD1_T[0] ? 1 : 0; };
/** shot 19: lines four to ten scribbled in a blur: how many are on the board (0..7) */
export const blurLines = (f: number) => Math.min(7, Math.max(0, Math.floor(((f / FPS - BLUR_T) / 0.5) * 7.99)));
/** shot 21: how much of line eleven is lit: the number of words lit (0..5) */
export const line11Words = (f: number) => LINE11_T.filter((t) => f / FPS >= t - 1e-6).length;

// ── blinks: every 2.5-4.5 s, 3 frames, at hashed times; none that touches a cut
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3].some((f) => CUT_F.has(f)));
}
export const BLINKS = { ross: blinkStarts(7), denise: blinkStarts(17), guru: blinkStarts(29) };
export const blinkOf = (who: keyof typeof BLINKS, f: number) => { for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; } return 0; };

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = a soft onset, the clip starts on the frame; `from` = skip into the clip (s)
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "splash1", t: SPLASH1_T, sfx: "bigsplash", db: -1 },
  { id: "pyro1", t: PYRO1_T, sfx: "pyro", db: -3 },
  { id: "whack", t: ICE_HIT_T, sfx: "whack", db: -2 },
  { id: "burst", t: BURST_T, sfx: "splash", db: -5 },
  { id: "alarm", t: ALARM_T, sfx: "alarm", db: -10, start: true, len: 0.85, fade: 0.05 },
  { id: "crash", t: CLOCK_SMASH_T, sfx: "crash", db: -2 },
  { id: "slap", t: TAPE_T, sfx: "slap", db: -1 },
  ...NOTE_T.map((t, i): Hit => ({ id: `mmf${i + 1}`, t, sfx: "scribble", db: -9, start: true, len: 0.24, fade: 0.04 })),
  ...UNDERLINE_T.map((t, i): Hit => ({ id: `under${i + 1}`, t, sfx: "scribble", db: -8, start: true, from: 0.5, len: 0.12, fade: 0.03 })),
  { id: "throb1", t: VEIN_T, sfx: "throb", db: -3 },
  { id: "throb2", t: THROB2_T, sfx: "throb", db: -5 },
  { id: "rip", t: RIP_T, sfx: "rip", db: -2 },
  { id: "glug", t: CHUG_T, sfx: "glug", db: -5, start: true, len: 0.7, fade: 0.1 },
  { id: "woo", t: JUMP_T, sfx: "woo", db: -5, start: true },
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -1 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -8, start: true, len: 3.0, fade: 0.3 },
  { id: "whoosh", t: WHOOSH_T, sfx: "whoosh", db: -3 },
  { id: "clicks", t: PENS_T, sfx: "clicks", db: -8, start: true },
  { id: "marker1", t: BOARD1_T[0], sfx: "marker", db: -9, start: true, len: 0.3, fade: 0.05 },
  { id: "marker2", t: BOARD1_T[1], sfx: "marker", db: -8, start: true, from: 0.2, len: 0.95, fade: 0.05 },
  { id: "thud", t: THUD_T, sfx: "thud", db: -3 },
  { id: "washer", t: WASH_T, sfx: "washer", db: -11, start: true, len: 1.55, fade: 0.15 },
  { id: "hire", t: DNOTE_T, sfx: "scribble", db: -8, start: true, len: 0.4, fade: 0.05 },
  { id: "heart", t: HEART_T, sfx: "scribble", db: -8, start: true, from: 0.5, len: 0.12, fade: 0.03 },
  { id: "blur", t: BLUR_T, sfx: "marker", db: -7, start: true, from: 0.7, len: 0.52, fade: 0.08 },
  { id: "slam", t: SLAM_T, sfx: "slam", db: -1 },
  { id: "creak", t: CREAK_T, sfx: "creak", db: -6, start: true, len: 0.9, fade: 0.1 },
  { id: "beep", t: BEEP_T, sfx: "beep", db: -4 },
  { id: "gulp", t: GULP_T, sfx: "gulp", db: -4 },
  { id: "rustle", t: RUSTLE_T, sfx: "rustle", db: -4, start: true },
  ...TICK_T.map((t, i): Hit => ({ id: `tick${i + 1}`, t, sfx: "tick", db: -3 })),
  { id: "splash2", t: SPLASH2_T, sfx: "bigsplash", db: -1 },
  { id: "pyro2", t: PYRO2_T, sfx: "pyro", db: -3 },
];

// ── sound cues for the mix (scripts/x09-cues.mts): no bed, the room is quiet
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => c.push({ name: h.sfx, at: h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(h.from ? { from: h.from } : {}) }));
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x08-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through (the guru's "BATH!" runs through the cut at 0.97) is
// captioned twice: the part up to the cut, and after the cut the sentence from that word on. The guru's lines are in capitals in the script; the caption of line 4 is "MMF MMF MMF!"
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
/** where the captions sit (frame y px): one band, out of the bottom 400 px, except where something is written there (the scenes of the board and the notebook set their own, src/x09-ui.tsx) */
export const CAP_BAND: [number, number] = [1295, 1455];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons; in "...Ice bath?" the board's "...PEOPLE" fills x 0-300 of the band, so its caption moves right */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { headset: [330, 950] };
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot
const kf = (label: string, t: number) => ({ label, f: Math.min(FRAMES - 1, Math.round(t * FPS)) });
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 splash: air", 0.3), kf("1 splash: landing", SPLASH1_T + 0.03), kf("1 splash: cubes at the lens", 0.8), kf("2 ice: the hit", ICE_HIT_T + 0.03), kf("3 clock: ringing", 2.0), kf("3 clock: smash", CLOCK_SMASH_T + 0.05),
  kf("4 tape: yelling", 3.7), kf("4 tape: slap", TAPE_T + 0.05), kf("5 notebook: mmf 2", 5.1), kf("5 notebook: underlined", 5.8), kf("6 vein", VEIN_T + 0.1), kf("7 drink: rip", RIP_T + 0.05), kf("7 drink: glass up", 7.0), kf("8 chug", 8.3),
  kf("9 woo: up", JUMP_T + 0.2), kf("10 corks: pop 1", CORK_T[0] + 0.05), kf("10 corks: pop 2", CORK_T[1] + 0.08), kf("11 snatch", 10.7), kf("12 board1", 11.7), kf("13 pens: up", PENS_T + 0.3),
  kf("14 tax: one", 13.7), kf("14 tax: written", 14.9), kf("15 taxbox", 15.6), kf("16 wash", 16.8), kf("17 hit", 18.4), kf("18 dnote: heart", 19.6), kf("19 scribble: blur", 20.1), kf("20 slam", SLAM_T + 0.05), kf("21 line11: words", 22.2), kf("21 line11: all", 22.95),
  kf("22 turn: half", 23.6), kf("23 caught: beep", BEEP_T + 0.05), kf("24 denise", 25.4), kf("25 cash", 26.8), kf("26 eyes", 27.4), kf("27 headset: on", 28.5), kf("28 finale: air", 29.3), kf("28 finale: landing", SPLASH2_T + 0.03), kf("28 finale: end", 30.5),
];
