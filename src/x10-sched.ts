// The timeline and the acting of x10 "My Own Business" (src/X10.tsx, docs/x10-my-own-business.md, the build spec). Pure data and arithmetic, the shape of src/x09-sched.ts: every number is a function of the frame, of the sixteen voice
// takes in public/x10/timings.json and of the mouth loudness in src/amp-x10.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and
// the gaps of episodes/x10.jsonc carry the silent beats). The cuts and the named moments below hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: its times are older than the voices (the built lines run longer: line 16 ends at 28.07 s, the table read is 28.4 s), so the shots keep the spec's order and their relation to the words and
// move to the voices; the reel is 30.5 s, not 27.4 s (the corks, the kettle and the whistle back after "hours!" take 2.4 s). Shot 23 is split in two (no shot over 2.4 s, and "Setting your own hours!" gets Ross's face).
import timings from "../public/x10/timings.json" with { type: "json" };
import amps from "./amp-x10.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x09-sched.ts): take n of public/x10/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "ROSS" | "CHUCK" | "TYLER" | "LANDLORD" | "SUPPLIER" | "ACCOUNTANT" | "GUY";
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

// ── the cuts: frame numbers. The 26 shots (the spec's 25, shot 23 in two)
const F = (n: number) => n / FPS;
const S = {
  padlock: F(0), shutter: F(12), dollars: F(43), boxes: F(99), bell: F(119), pile: F(179), landlord: F(217), supplier: F(245), tipjar: F(276), till: F(306), hire: F(318), fire: F(373), walkout: F(411), phone: F(456), review: F(527),
  night: F(568), quarter: F(589), envelope: F(636), letter: F(658), slot: F(702), clock: F(726), stroll: F(741), wave: F(768), listen: F(806), corks: F(845), whistle: F(876),
};
export const T_END = F(915);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "padlock", "shutter", "dollars", "boxes", "bell", "pile", "landlord", "supplier", "tipjar", "till", "hire", "fire", "walkout", "phone", "review", "night", "quarter", "envelope", "letter", "slot", "clock", "stroll", "wave", "listen", "corks", "whistle",
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

// ── the named moments (seconds, every one on a frame). The words they hang on, from the voices: L1 Finally! 0.47-1.40; L2 My 1.79 own 2.25 business 2.55-3.29; L3 Excuse 4.16 me! 4.69 I've 5.09 been 5.29 waiting 5.49-5.93; L4 Coming! 6.20-6.94;
// L5 Rent. 7.72-8.06; L6 Milk 8.31 went 8.63 up. 8.96-9.18; L7 My 9.24 fee. 9.65-10.03; L8 You're 10.74 hired! 11.06-11.63; L9 Cool. 12.11-12.40; L10 You're 12.76 FIRED! 13.20-13.65; L11 Cool. 13.89-14.62; L12 Ross's 15.53 Coffee 15.97 how 16.61
// can 16.74 I 16.94 help? 17.21-17.50; L13 One 17.68 star. 18.20-18.74; L14 ...Profit. 20.26-21.04; L15 I 22.02 owe 22.40 YOU?! 22.88-23.31; L16 Must 25.78 be 26.07 nice! 26.22-26.77 Setting 26.87 your 27.38 own 27.53 hours! 27.53-28.07
export const LOCK_T = [F(1), F(9)];                     // shot 1: the key's click, the padlock lands
export const SHUTTER_T = F(12), SHUTTER_TOP = F(22);   // shot 2: the shutter flies up (it starts, it hits the top)
export const SPIN_T = F(43), KACHING_T = F(52);        // shot 3: the pupils start to spin, they land on the dollar signs
export const WHUMP_T = F(108);                         // shot 4: the boxes land on Ross
export const BELL_T = [F(120), F(123)];                // shot 5: ding ding
export const POP_T = F(195);                           // shot 6: the hand with the cup pops out of the pile
export const SLAP_T = [F(243), F(275)];                // shots 7 and 8: the cash in the palm
export const BILL_T = F(302);                          // shot 9: the tiny hand takes the last bill out of the tip jar
export const CLUNK_T = F(307), TWITCH_T = F(311);      // shot 10: the empty till, his eye
export const FIRE_T = F(373), VEIN_T = F(378);         // shot 12: the panini press catches fire, the vein pops
export const SPRINK_T = F(439), RING_T = F(450);       // shot 13: the sprinklers burst on; the phone rings
export const NIGHT_CLUNK_T = F(570), MOTH_T = F(573);  // shot 16: the till opens at night, the moth comes out
export const SWISH_T = F(639);                         // shot 18: the envelope slides under the door
export const STING_T = F(659);                         // shot 19: the letter
export const SNATCH_T = F(711), CLINK_T = F(717);      // shot 20: the hand through the mail slot plucks the quarter and pulls back
export const DING_T = F(733);                          // shot 21: the wall clock clicks to 5:00
export const WHISTLE_T = F(737), WIPE_T = [F(745), F(756)];   // shot 22: the guy strolls past, whistling; Ross mops
export const CORK_T = [F(846), F(851)], KETTLE_T = F(852);    // shot 24: POP POP, the kettle
export const WHISTLEBACK_T = F(880);                   // shot 26: he whistles the same note back

// ── Ross's face: the plugs, the vein, the twitching eye
/** which head picture: both plugs (before the pops), only the left one gone, both gone (the reel loops: shot 1 has them in again) */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** the vein on his forehead (0 none .. 1, a little over on the pop): it pops on VEIN_T with a spring, throbs while he shouts at Tyler, and goes down when the phone rings and he has to be sweet */
export function veinAt(f: number): number {
  const t = f / FPS;
  if (t < VEIN_T) return 0;
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  return Math.min(1.15, popP(t, VEIN_T, 0.45, 40)) * (t > VEIN_T + 0.4 ? throb : 1) * (1 - ease((t - 14.5) / 0.5));
}
/** his twitching eye (the lid of his right eye of the picture jumps down and back on twos): at the empty till (shot 10) */
export function twitchAt(f: number): number {
  const t = f / FPS;
  if (t < TWITCH_T || !inShot(f, "till")) return 0;
  const k = twos(f) % 12;
  return k === 0 || k === 4 ? 0.55 : k === 2 ? 0.3 : 0;
}

/** the steam out of his ear holes: 0 none .. 1 thin jets .. 2 thick. From the kettle's start (shot 25) it thickens over 0.4 s, and thins out in the last shot (out by the end) */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t < KETTLE_T) return 0;
  return t < 29.3 ? 1.4 + 1.4 * ease((t - KETTLE_T) / 0.4) : 2.8 * (1 - ease((t - 29.3) / 1.1));
}

// ── the camera of a shot: the zoom factor about the shot's focus (a slow push in the holds, a pulse on the hits)
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "padlock": return 1 + 0.06 * s.u + pulse(LOCK_T[1], 0.04);
    case "shutter": return 1 + 0.03 * s.u + pulse(SHUTTER_TOP, 0.05);
    case "dollars": return 1 + 0.05 * s.u + pulse(KACHING_T, 0.05);
    case "boxes": return 1 + pulse(WHUMP_T, 0.06);
    case "bell": return 1 + 0.02 * s.u + pulse(BELL_T[0], 0.04) + pulse(BELL_T[1], 0.03);
    case "fire": return 1 + 0.03 * s.u + pulse(FIRE_T, 0.04);
    case "review": return 1 + 0.05 * s.u;
    case "letter": return 1 + 0.04 * s.u + pulse(STING_T, 0.04);
    case "corks": return 1 + pulse(CORK_T[0], 0.03) + pulse(CORK_T[1], 0.03);
    default: return 1 + 0.02 * s.u;
  }
};
/** the camera's shake, frame px: the shutter's bang, the boxes, the slaps, the fire, the corks and the kettle; decaying, on every frame */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, SHUTTER_TOP, 18, 0.1), shakeOf(t, WHUMP_T, 24, 0.12), shakeOf(t, BELL_T[0], 4, 0.05), shakeOf(t, SLAP_T[0], 7, 0.06), shakeOf(t, SLAP_T[1], 7, 0.06), shakeOf(t, FIRE_T, 8, 0.1), shakeOf(t, CORK_T[0], 8, 0.07), shakeOf(t, CORK_T[1], 8, 0.07), shakeOf(t, CLUNK_T, 6, 0.06)];
  const kettle = t >= KETTLE_T && inShot(f, "corks") ? [3 * Math.sin(t * 190), 2 * Math.cos(t * 150)] : [0, 0];
  return [parts.reduce((s, p) => s + p[0], kettle[0]), parts.reduce((s, p) => s + p[1], kettle[1])];
}
/** the white flash of the shutter's bang */
export const flashAt = (f: number): number => { const t = f / FPS; return t >= SHUTTER_TOP ? 0.45 * Math.exp(-(t - SHUTTER_TOP) / 0.035) : 0; };

// ── the voices: the mouth, on twos, one frame ahead of the sound; closed whenever that character is not speaking
const lineOf = (who: Who, f: number, before = 0.1, after = 0.05) => LINES.find((q) => q.who === who && f / FPS >= q.first - before && f / FPS <= Math.max(q.end, q.tend) + after);
export const speaking = (who: Who, f: number) => !!lineOf(who, f);
const ROUND = /^(w|tw|o|you|for|me)|oo|ow/;
const SMALL = new Set([14, 9, 11]);  // said small: Ross's "...Profit." is hollow, Tyler's "Cool." is bored (the mouth is never wider than mid)
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
const LINE_MOOD: Record<number, Mood> = { 1: "pitchy", 2: "pitchy", 3: "impatient", 4: "tight", 5: "flat", 6: "flat", 7: "flat", 8: "polite", 9: "flat", 10: "furious", 11: "flat", 12: "tight", 13: "smug", 14: "defeated", 15: "furious", 16: "polite" };
/** the mood of a character's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (l) return LINE_MOOD[l.n];
  switch (who) {
    case "ROSS":
      switch (id) {
        case "padlock": case "shutter": case "dollars": return "pitchy";
        case "boxes": return "impatient";
        case "till": return "flat";
        case "fire": return "angry";
        case "phone": return "tight";
        case "quarter": case "night": return "defeated";
        case "letter": case "slot": return "angry";
        case "wave": case "listen": return "tight";
        case "corks": return "furious";
        default: return "flat";
      }
    case "CHUCK": return id === "review" ? "smug" : "impatient";
    case "GUY": return "polite";
    default: return "flat";
  }
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames; it settles after the line (src/x09-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [3.4, 7], 2: [3.4, 7], 3: [3.0, 6], 4: [1.5, 3], 8: [3.0, 6], 9: [0.8, 1.2], 10: [3.4, 7], 11: [0.8, 1.2], 12: [2.2, 4], 13: [1.6, 3], 14: [0.8, 1.2], 15: [3.4, 7], 16: [2.6, 5] };
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
export const BLINKS = { ross: blinkStarts(7), chuck: blinkStarts(17), tyler: blinkStarts(29), guy: blinkStarts(41) };
export const blinkOf = (who: keyof typeof BLINKS, f: number) => { for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; } return 0; };

// ── what moves in the shop, by the clock (the scenes draw it)
/** the shutter's height as a fraction of the opening it covers (1 down .. 0 up), from SHUTTER_T: it flies up in 10 frames and settles at the top with a rattle */
export const shutterAt = (f: number): number => { const t = f / FPS; return t < SHUTTER_T ? 1 : t < SHUTTER_TOP ? 1 - ease((t - SHUTTER_T) / (SHUTTER_TOP - SHUTTER_T)) ** 1.6 : 0; };
/** the padlock: the key turns (0..1 over the first 3 frames), the shackle springs open at LOCK_T[0], the lock drops (px of the lock's own height) and lands at LOCK_T[1] */
export const lockOpenAt = (f: number): number => clamp01((f / FPS - LOCK_T[0]) / 0.06);
export const lockDropAt = (f: number): number => { const a = f / FPS - (LOCK_T[0] + 0.04), d = LOCK_T[1] - (LOCK_T[0] + 0.04); return a < 0 ? 0 : a >= d ? 1 : (a / d) ** 2; };
/** the slot machine of his eyes: the reel's turn (in symbols) from SPIN_T and where it stops (the dollar sign) at KACHING_T */
export const reelAt = (f: number, which: 0 | 1): number => { const t = f / FPS, T0 = SPIN_T / 1 - 0, a = clamp01((t - SPIN_T) / (KACHING_T + 0.03 * which - SPIN_T)); return t < T0 ? 0 : 12 * (1 - (1 - a) ** 2.2) + 0.0; };
/** the boxes drop: 0 up in the air .. 1 landed on him (shot 4, from the shot's first frame) */
export const boxFall = (f: number): number => clamp01(((f / FPS) - (WHUMP_T - 0.28)) / 0.28);
/** a hand's reach (shots 7-9, 20): in from the edge, held, out again; t0 the moment it arrives, t1 the moment it is gone */
export const reach = (f: number, t0: number, t1: number): number => { const t = f / FPS; return ease((t - t0) / 0.12) * (1 - ease((t - (t1 - 0.12)) / 0.12)); };
/** the guy walks past the window (shot 22): 0 at the left edge .. 1 at the right edge of what the window shows */
export const strollAt = (f: number): number => clamp01((f / FPS - S.stroll) / (S.wave - S.stroll));
/** the moth (shot 16): its age in seconds since it came out of the till */
export const mothAge = (f: number): number => f / FPS - MOTH_T;

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = a soft onset or a long bed, the clip starts on the frame; `from` = skip into the clip (s)
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "padlock", t: 0, sfx: "padlock", db: -2, start: true },
  { id: "shutter", t: SHUTTER_T, sfx: "shutter", db: -3, start: true, from: 0.15, len: 0.85, fade: 0.2 },
  { id: "kaching", t: KACHING_T, sfx: "kaching", db: -4 },
  { id: "whump", t: WHUMP_T, sfx: "whump", db: -2 },
  ...BELL_T.map((t, i): Hit => ({ id: `bell${i + 1}`, t, sfx: "bell", db: -4 - 2 * i })),
  { id: "pop", t: POP_T, sfx: "pop", db: -3 },
  ...SLAP_T.map((t, i): Hit => ({ id: `slap${i + 1}`, t, sfx: "slap", db: -3 })),
  { id: "bill", t: BILL_T, sfx: "rustle", db: -4 },
  { id: "clunk", t: CLUNK_T, sfx: "clank", db: -3 },
  { id: "fire", t: FIRE_T, sfx: "fire", db: -3, start: true },   // the whoosh is loudest at once: it starts on the frame the press catches fire (its peak, aligned, put it 3 frames early)
  { id: "throb", t: VEIN_T, sfx: "throb", db: -3 },
  { id: "sprinkler", t: SPRINK_T, sfx: "sprinkler", db: 5, start: true, from: 0.72, len: 2.95, fade: 0.35 },   // the clip's first 0.7 s are a fade-in nobody hears: it starts at its hiss; it stops with the cut to the review (17.57 s)
  { id: "ring", t: RING_T, sfx: "ring", db: -4, start: true },
  { id: "clunk2", t: NIGHT_CLUNK_T, sfx: "clank", db: -4 },
  { id: "moth", t: MOTH_T, sfx: "moth", db: -3, start: true },
  { id: "swish", t: SWISH_T, sfx: "slide", db: -4 },
  { id: "sting", t: STING_T, sfx: "sting-a", db: -4, len: 1.9, fade: 0.5 },
  { id: "snatch", t: SNATCH_T, sfx: "whoosh", db: -5 },
  { id: "clink", t: CLINK_T, sfx: "clink", db: -2 },
  { id: "ding", t: DING_T, sfx: "ding", db: -3 },
  { id: "whistle", t: WHISTLE_T, sfx: "whistle", db: -3, start: true, from: 0.1, len: 1.1, fade: 0.15 },   // from 0.1: the breath before the note is skipped, the note comes in on the frame the notes appear
  { id: "birds", t: WHISTLE_T + 0.03, sfx: "birds", db: -4, start: true, len: 1.0, fade: 0.2 },
  ...WIPE_T.map((t, i): Hit => ({ id: `wipe${i + 1}`, t, sfx: "wipe", db: -5 })),
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -1 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -6, start: true, from: 0.5, len: 1.15, fade: 0.15 },
  { id: "whistleback", t: WHISTLEBACK_T, sfx: "whistleback", db: -3, start: true },
  { id: "birds2", t: WHISTLEBACK_T + 0.05, sfx: "birds", db: -5, start: true, len: 1.0, fade: 0.2 },
];

// ── sound cues for the mix (scripts/x10-cues.mts): no bed, the shop is quiet
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => c.push({ name: h.sfx, at: h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(h.from ? { from: h.from } : {}) }));
  return c.filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x09-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). A word that a cut runs through is captioned twice: the part up to the cut, and after the
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
/** where the captions sit (frame y px): one band, out of the bottom 400 px, except where something is written there (the scenes of the sign, HELP WANTED, the review and the letter set their own) */
export const CAP_BAND: [number, number] = [1295, 1455];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot
const kf = (label: string, t: number) => ({ label, f: Math.min(FRAMES - 1, Math.round(t * FPS)) });
export const KEY_FRAMES: { label: string; f: number }[] = [
  kf("1 padlock: click", 0.06), kf("1 padlock: drop", 0.25), kf("2 shutter: rising", 0.62), kf("2 shutter: Finally", 1.0), kf("3 dollars: spin", 1.55), kf("3 dollars: landed", 2.2), kf("4 boxes: tip", 3.4), kf("4 boxes: buried", 3.85),
  kf("5 bell", 4.6), kf("6 pile: cup", 6.6), kf("7 landlord", 7.9), kf("8 supplier", 8.9), kf("9 tipjar", 9.8), kf("10 till: twitch", 10.4), kf("11 hire: apron", 11.2), kf("12 fire", 13.0), kf("13 walkout", 14.4), kf("13 sprinklers", 14.95),
  kf("14 phone", 16.2), kf("15 review", 18.2), kf("16 night: moth", 19.3), kf("17 quarter", 20.4), kf("18 envelope", 21.6), kf("19 letter", 22.6), kf("20 slot", 23.8), kf("21 clock", 24.5), kf("22 stroll", 25.2), kf("23 wave", 26.2),
  kf("24 listen", 27.4), kf("25 corks: pop 1", 28.25), kf("25 corks: steam", 28.9), kf("26 whistle back", 29.9), kf("26 end", 30.4),
];
