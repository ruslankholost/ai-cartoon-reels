// The timeline and the acting of x15 "Bleep Fee" (src/X15.tsx, docs/x15-bleep-fee.md, the shot list v3 and the build spec). Pure data and arithmetic, the shape of src/x14-sched.ts: every number is a function of the frame, of the nine voice
// takes in public/x15/timings.json, of the mouth loudness in src/amp-x15.json and of the places of the 1 kHz bleep tones in src/x15-tones.json (scripts/x15-tones.py); nothing reads a clock or a random source. Seconds are the reel's clock =
// the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the gaps of episodes/x15.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's
// measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: only the frames, and only where the voices' own times asked for it. The spec's bleep times are the words' onsets; the tone itself starts 80 ms before its word (scripts/voice-build.py bleep()), and
// the mosaic, the red pop and the counter sit on the TONE: its first and last frame (`frameOn`). So the cuts of shots 4, 8, 17, 18, 19, 20 and 21 are on the tone's first frame (the spec's 1.50, 5.75, 14.80, 16.25, 17.30, 18.35, 19.20 are within
// a frame or three of it), shot 3 starts on the frame before the word "listing" (so that the captioner splits the robot's line between words). 27 shots, none over 2.4 s, the reel 26.40 s (792 frames) and it loops into the ring.
import timings from "../public/x15/timings.json" with { type: "json" };
import amps from "./amp-x15.json" with { type: "json" };
import tones from "./x15-tones.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x14-sched.ts): take n of public/x15/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number; bleep?: boolean };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const TONES = tones as unknown as Record<string, [number, number][]>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "ROSS" | "CHUCK" | "MACHINE";
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

// ── the cuts: frame numbers. The 27 shots. Speech on the reel's clock (first sound .. last word): 1 MACHINE 0.35-1.71 (Your 0.30, business 0.60, listing 0.92, will 1.24, be 1.37, suspe- 1.49), 2 ROSS 1.56-2.36 (the tone 1.495-1.85, OFF 1.85),
// 3 ROSS 2.91-4.33 (tone 3.815-4.149), 4 ROSS 4.68-6.87 (I 4.73, invoices 5.06, tone 5.751-6.110, I never ordered! 6.11), 5 ROSS 8.66-10.60 (This 8.66, guy 8.96), 6 CHUCK 11.50-13.69 (Found 11.64, hair. 11.88, I 12.61), 7 ROSS 14.09-16.00
// (His 14.07, OWN 14.39, tone 14.785-15.425, HAIR! 15.43), 8 ROSS 16.35-19.80 (tones 16.294-16.641, 17.295-17.575, 18.363-18.743, 19.197-19.795), 9 ROSS 21.40-23.31 (I 21.47, never 21.76, ORDERED 22.13, bleeps! 22.78)
const F = (n: number) => n / FPS;
const S = {
  ring: F(0), pickup: F(12), snap: F(28), yell: F(45), slam: F(72), lean: F(86), env: F(134), shit: F(172), door: F(209), buried: F(230), invoice: F(243), lick: F(269), pluck: F(305), slide: F(344), plate: F(377), bulge: F(416),
  hair: F(443), blast1: F(489), blast2: F(519), blast3: F(551), head: F(576), printer: F(605), total: F(633), receipt: F(650), clamp: F(704), steam: F(722), ring2: F(773),
};
export const T_END = F(792);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "ring", "pickup", "snap", "yell", "slam", "lean", "env", "shit", "door", "buried", "invoice", "lick", "pluck", "slide", "plate", "bulge", "hair", "blast1", "blast2", "blast3", "head", "printer", "total", "receipt", "clamp", "steam", "ring2",
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

// ── the bleeps: the 1 kHz tones of the voice files (src/x15-tones.json), then the steam word's. A frame is "on" if its middle lies inside the tone (a few ms of grace), so the mosaic is on the tone's frames and the first of them is the pop.
// price: each bleep costs double the last (4.99 ... 638.72), the steam word 1,277.44; total: the running sum the counter rolls to (the spec's 4.99, 14.97, 34.93, 74.85, 154.69, 314.37, 633.73, 1,272.45, 2,549.89)
export const frameOn = (t: number) => Math.ceil(t * FPS - 0.6);
export type Stage = "mouth" | "half" | "face" | "head" | "word";
export type Bleep = { i: number; line: number; t0: number; t1: number; f0: number; f1: number; price: number; total: number; stage: Stage; shot: ShotId };
const STEAM_B: [number, number] = [F(747), 25.78];
const STAGES: Stage[] = ["mouth", "mouth", "mouth", "half", "face", "face", "head", "head", "word"];
const PRICES = [4.99, 9.98, 19.96, 39.92, 79.84, 159.68, 319.36, 638.72, 1277.44];
const SPANS: { line: number; t0: number; t1: number }[] = [
  ...LINES.flatMap((l) => (TONES[l.file] ?? []).map(([a, b]) => ({ line: l.n, t0: l.ofs + a, t1: l.ofs + b }))),
  { line: 0, t0: STEAM_B[0], t1: STEAM_B[1] },
];
export const BLEEPS: Bleep[] = SPANS.map((s, i) => {
  const f0 = frameOn(s.t0), f1 = frameOn(s.t1), total = Math.round(PRICES.slice(0, i + 1).reduce((a, b) => a + b, 0) * 100) / 100;
  const shot = SHOTS.find((x) => f0 >= Math.round(x.t0 * FPS) && f0 < Math.round(x.t1 * FPS))!.id;
  return { i, ...s, f0, f1, price: PRICES[i], total, stage: STAGES[i], shot };
});
if (BLEEPS.length !== 9) throw new Error(`x15: ${BLEEPS.length} bleeps, the spec has 9`);
/** the bleep that is sounding on this frame (its mosaic is up), if any */
export const bleepAt = (f: number): Bleep | undefined => BLEEPS.find((b) => f >= b.f0 && f < b.f1);
/** the last bleep that has started by this frame (the counter shows its total) */
export const lastBleep = (f: number): Bleep | undefined => [...BLEEPS].reverse().find((b) => f >= b.f0);
export const money = (x: number): string => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── the named moments (seconds, every one on a frame)
export const RING_T = F(0);                                   // shot 1: the phone rings and buzzes on the counter (the first frame)
export const PICK_T = F(12);                                  // shot 2: Ross picks up
export const SNAP_T = F(28);                                  // shot 3: his face snaps purple (the cut is the snap)
export const SLAM_T = F(73), CLINK_T = F(74);                 // shot 5: the phone slams onto the counter, the two cups jump
export const PUNCH_T = F(114);                                // shot 6: the punch-in on the bleep (= bleep 2's first frame)
export const VEIN_T = F(137);                                 // shot 7: the vein pops (spec 4.55)
export const SLOT_T = F(209);                                 // shot 9: the mail slot starts firing
export const THUD_T = F(230);                                 // shot 10: the pile lands on him
export const STAMP_T = F(252);                                // shot 11: the $29.99 is stamped (spec 8.40)
export const LICK_T = F(270);                                 // shot 12: the first lick (spec 9.00)
export const PLUCK_T = F(317), TINK_T = F(333);               // shot 13: the hair comes out (ping, spec 10.55), the hair lands on the plate (tink, spec 11.10)
export const SLIDE_T = F(344);                                // shot 14: the plate slides back
export const BULGE_T = F(416);                                // shot 16: the eyes bulge (spec 13.88)
export const STEP_T = F(463);                                 // shot 17: the step in on HAIR! (15.43)
export const COINS_T = F(581);                                // shot 21: the minuses pay out like a slot machine (spec 19.35)
export const PRINT_T = F(608);                                // shot 22: BRRRT, the receipt shoots out (spec 20.25)
export const STAMP2_T = F(633);                               // shot 23: the end of the receipt lands on the floor
export const TWITCH_T = F(690);                               // shot 24: the eye starts to twitch (an even frame: it runs on twos)
export const GASP_T = F(704), CLAMP_T = F(716);               // shot 25: he opens his mouth for the next one (23.47), he clamps it shut (spec 23.85)
export const CORK_T = [F(723), F(726)], KETTLE_T = F(728);    // shot 26: POP POP, the kettle (spec 24.08, 24.18, 24.25)
export const LETTER_T = [F(733), F(737), F(741), F(745)];     // shot 26: the steam curls into F, U, C, K (each in four frames); the mosaic on 747 catches the K in flight, so the whole word is never up (v1's first cut showed it for 0.2 s)
export const STEAMB_T = F(747);                               // shot 26: the mosaic snaps over the word, the long bleep (= bleep 9's first frame, spec 24.90)
export const RING2_T = F(773);                                // shot 27: the phone rings again (it loops into shot 1)
if (BLEEPS[1].f0 !== Math.round(PUNCH_T * FPS) || BLEEPS[8].f0 !== Math.round(STEAMB_T * FPS)) throw new Error("x15: the punch-in or the steam bleep is off its bleep");

// ── the phone's red call screen (src/x15-props.tsx draws it): `ring` is the pulse of the red rings going out of the glass (0..1, three a second), `glow` how hot the screen is
export type Call = { ring: number; glow: number };
export function callAt(f: number): Call {
  const t = f / FPS, u = (t * 3.4) % 1;
  return { ring: u, glow: 0.55 + 0.45 * Math.max(0, Math.cos(u * Math.PI * 2)) };
}
/** the phone's buzz on the counter (shots 1 and 27): a rattle on twos, a hop on every second pulse; px of the frame and degrees */
export function buzzAt(f: number, t0: number): { dx: number; dy: number; rot: number } {
  const a = (twos(f) - Math.round(t0 * FPS)) / FPS;
  if (a < 0) return { dx: 0, dy: 0, rot: 0 };
  const s = Math.floor(a * FPS / 2) % 2 ? 1 : -1, hop = Math.max(0, Math.sin((a * 5 * Math.PI * 2) % (Math.PI * 2))) ** 2;
  return { dx: 7 * s, dy: -26 * hop, rot: 1.6 * s * (0.5 + 0.5 * hop) };
}

// ── the shake and the camera
/** a decaying shake of the camera (frame px): the pops, the slam, the vein, the thud, the stamp, the step, the corks */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const bl = BLEEPS.map((b) => shakeOf(t, F(b.f0), 8 + 4 * b.i, 0.07));
  const parts = [shakeOf(t, RING_T, 3, 0.05), shakeOf(t, SNAP_T, 14, 0.07), ...bl, shakeOf(t, SLAM_T, 26, 0.09), shakeOf(t, CLINK_T, 6, 0.05), shakeOf(t, VEIN_T, 6, 0.06), shakeOf(t, THUD_T, 14, 0.08), shakeOf(t, STAMP_T, 9, 0.06),
    shakeOf(t, BULGE_T, 8, 0.06), shakeOf(t, STEP_T, 14, 0.07), shakeOf(t, COINS_T, 10, 0.08), shakeOf(t, PRINT_T, 7, 0.07), shakeOf(t, STAMP2_T, 7, 0.06), shakeOf(t, CLAMP_T, 7, 0.06), shakeOf(t, CORK_T[0], 8, 0.05),
    shakeOf(t, CORK_T[1], 8, 0.05), shakeOf(t, RING2_T, 3, 0.05)];
  const kettle = t >= KETTLE_T && inShot(f, "steam") ? [2.2 * Math.sin(t * 190), 1.6 * Math.cos(t * 150)] : [0, 0];
  const quake = inShot(f, "blast1", "blast2", "blast3", "head") ? [2.6 * Math.sin(twos(f) * 2.1), 2.0 * Math.cos(twos(f) * 1.7)] : [0, 0];   // the explosion: he never stops shaking
  return [parts.reduce((s, p) => s + p[0], kettle[0] + quake[0]), parts.reduce((s, p) => s + p[1], kettle[1] + quake[1])];
}
/** the camera's zoom about the shot's focus: the shot's own framing is in the scene, this is a slow push in the holds and a pulse on the hits */
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  const onBleep = (b: Bleep, k = 0.06) => pulse(F(b.f0), k, 0.08);
  switch (s.id) {
    case "ring": return 1 + 0.03 * s.u + pulse(RING_T, 0.03);
    case "pickup": return 1 + 0.03 * s.u + pulse(PICK_T, 0.02);
    case "snap": return 1 + 0.03 * s.u + pulse(SNAP_T, 0.07);
    case "yell": return 1 + 0.02 * s.u + onBleep(BLEEPS[0], 0.07);
    case "slam": return 1 + 0.02 * s.u + pulse(SLAM_T, 0.06);
    case "lean": return 1 + 0.02 * s.u + onBleep(BLEEPS[1], 0.05);
    case "env": return 1 + 0.03 * s.u + pulse(VEIN_T, 0.04);
    case "shit": return 1 + 0.02 * s.u + onBleep(BLEEPS[2], 0.06);
    case "door": return 1 + 0.03 * s.u;
    case "buried": return 1 + 0.03 * s.u + pulse(THUD_T, 0.04);
    case "invoice": return 1 + 0.02 * s.u + pulse(STAMP_T, 0.05);
    case "lick": return 1 + 0.03 * s.u;
    case "pluck": return 1 + 0.03 * s.u + pulse(PLUCK_T, 0.03);
    case "slide": return 1 + 0.03 * s.u;
    case "plate": return 1 + 0.03 * s.u;
    case "bulge": return 1 + 0.04 * s.u + pulse(BULGE_T, 0.05);
    case "hair": return 1 + 0.02 * s.u + onBleep(BLEEPS[3], 0.05) + pulse(STEP_T, 0.07, 0.09);
    case "blast1": return 1 + 0.02 * s.u + onBleep(BLEEPS[4], 0.06);
    case "blast2": return 1 + 0.02 * s.u + onBleep(BLEEPS[5], 0.06);
    case "blast3": return 1 + 0.02 * s.u + onBleep(BLEEPS[6], 0.06);
    case "head": return 1 + 0.02 * s.u + onBleep(BLEEPS[7], 0.07);
    case "printer": return 1 + 0.03 * s.u + pulse(PRINT_T, 0.03);
    case "total": return 1 + 0.03 * s.u + pulse(STAMP2_T, 0.04);
    case "receipt": return 1 + 0.03 * s.u;
    case "clamp": return 1 + 0.03 * s.u + pulse(CLAMP_T, 0.04);
    case "steam": return 1 + 0.02 * s.u + pulse(CORK_T[0], 0.03) + pulse(CORK_T[1], 0.03) + onBleep(BLEEPS[8], 0.05);
    case "ring2": return 1 + 0.03 * s.u + pulse(RING2_T, 0.03);
    default: return 1;
  }
};

// ── Ross: the head picture (plugs in, the left one gone, both gone), the purple snap, the vein, the bulge, the twitching eye, the steam
/** both plugs in (to the pops), only the right one gone (between the two flicks), both gone (from the second cork to the end of the reel; the loop starts with them in) */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** how purple his face is (0 as painted .. 1 furious): the snap on the cut of shot 3 (four fifths at once, full in three frames), furious to the end of the reel (he never calms down; the loop starts with the service smile) */
export function purpleAt(f: number): number {
  const t = f / FPS;
  if (t < S.snap - 1e-6) return 0;
  return Math.min(1, 0.8 + 0.2 * ease((t - SNAP_T) / 0.1));
}
/** the vein on his forehead (0 none .. 1.15 popped, throbbing while he talks): from VEIN_T to the end */
export function veinAt(f: number): number {
  const t = f / FPS;
  if (t < VEIN_T) return 0;
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  return Math.min(1.15, popP(t, VEIN_T, 0.45, 40)) * (t > VEIN_T + 0.4 ? throb : 1);
}
/** the bulge of his eyes (0 none .. 1.1): the eyes of the picture grow into round white balls with tiny pupils, in shots 16 and 17 (from BULGE_T; the mosaic of shot 18 covers them) and again on the first cork */
export function bulgeAt(f: number): number {
  const t = f / FPS, id = shotId(f);
  if (id === "bulge" || id === "hair") return Math.min(1.1, popP(t, BULGE_T, 0.5, 38));
  if (id === "steam") return Math.min(1.1, popP(t, CORK_T[0], 0.5, 38));
  return 0;
}
/** a twitching lid (fraction of the eye): his right eye in shots 24 and 25, from TWITCH_T, a quick flick every 0.4 s, the other eye a third of a cycle behind */
export function twitchAt(f: number, eye: 0 | 1): number {
  const t = f / FPS;
  if (!inShot(f, "receipt", "clamp") || t < TWITCH_T - 1e-6) return 0;
  const k = (twos(f) - Math.round(TWITCH_T * FPS) + (eye === 0 ? 0 : 4)) % 12;
  return k === 0 ? 0.7 : k === 2 ? 0.3 : 0;
}
/** the steam out of his ear holes: 0 none .. 2.8 thick. The jet starts on the kettle (shot 26) and screams to the end of the shot */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t < KETTLE_T || t >= S.ring2) return 0;
  return 1.5 + 1.3 * ease((t - KETTLE_T) / 0.3);
}
/** the steam letters (shot 26): how far each of the four has formed (0 none .. 1 whole), and when they are all there. `age` of a letter in seconds since its first frame */
export const letterAge = (i: number, f: number): number => f / FPS - LETTER_T[i];
export const WORD = "FUCK";

// ── Chuck: the plate he licks, the hair he plucks (it falls on the plate on the tink)
/** the grey curl between his fingers and on the plate (shots 13 and 15): 0 in his hand .. 1 fallen; it falls from the pluck's ping to the tink */
export const curlFall = (f: number): number => clamp01((f / FPS - (PLUCK_T + 0.25)) / (TINK_T - (PLUCK_T + 0.25)));

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
  if (who === "CHUCK") return a >= 0.45 ? "mid" : "small";   // said flat and smug: the mouth is never wider than mid
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
const LINE_MOOD: Record<number, Mood> = { 2: "furious", 3: "furious", 4: "furious", 5: "tight", 6: "smug", 7: "furious", 8: "furious", 9: "furious" };
/** the mood of a character's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (l && LINE_MOOD[l.n]) return LINE_MOOD[l.n];
  if (who === "ROSS") {
    switch (id) {
      case "pickup": return "tight";                                               // the service smile
      case "snap": case "yell": case "slam": case "lean": case "env": case "shit": case "buried": return "furious";
      case "bulge": case "hair": case "blast1": case "blast2": case "blast3": case "head": return "furious";
      case "printer": return "impatient";                                         // panting
      case "receipt": return "furious";
      case "clamp": return f / FPS < CLAMP_T ? "furious" : "hiss";                // the mouth open wide for the next one, then clamped shut
      case "steam": return "hiss";                                                // gritted teeth under the steam
      default: return "tight";
    }
  }
  return id === "lick" || id === "pluck" ? "smug" : "flat";
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x13-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 2: [3.0, 6], 3: [3.0, 6], 4: [3.2, 6], 5: [1.4, 2.5], 6: [0.5, 1], 7: [3.4, 7], 8: [3.6, 8], 9: [3.0, 6] };
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

// ── blinks: every 2.5-4.5 s, 3 frames, at hashed times; none that touches a cut. Ross does not blink in the blow-up (only in the panting wide shot), Chuck not while he plucks
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
function blinkStarts(seed: number): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += 2.5 + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3].some((f) => CUT_F.has(f)));
}
export const BLINKS = { ross: blinkStarts(7), chuck: blinkStarts(17) };
const BLINK_ROSS: ShotId[] = ["printer"];
const NO_BLINK_CHUCK: ShotId[] = ["pluck", "lick"];
export const blinkOf = (who: keyof typeof BLINKS, f: number) => {
  if (who === "chuck" && inShot(f, ...NO_BLINK_CHUCK)) return 0;
  if (who === "ross" && !inShot(f, ...BLINK_ROSS)) return 0;
  for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < 3) return [0.5, 1, 0.5][k]; }
  return 0;
};

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s). A peak that would
// fall before the reel's start skips into the clip instead of starting early. The bleeps themselves are in the voice files (the tone), so the only sound that goes with each is the ka-ching of its red pop.
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
export const HITS: Hit[] = [
  { id: "ring", t: RING_T, sfx: "ring", db: -8, start: true, len: PICK_T - RING_T, fade: 0.05 },          // (the ring stops when Ross picks up)
  { id: "buzz", t: RING_T, sfx: "phonebuzz", db: -4, start: true, len: 0.42, fade: 0.05 },
  { id: "pickup", t: PICK_T, sfx: "pickup", db: -4 },
  { id: "snap", t: SNAP_T, sfx: "snap", db: -2 },                          // the face snapping purple (the clip of "Cold Lips": its peak on the frame of the pop)
  ...BLEEPS.map((b): Hit => ({ id: `kaching${b.i + 1}`, t: F(b.f0), sfx: "kaching", db: b.i < 3 ? -9 : -8 })),   // the red minus pops out of the mosaic
  { id: "slam", t: SLAM_T, sfx: "slam", db: -3 },
  { id: "clink", t: CLINK_T, sfx: "clink", db: -6 },                        // the two cups jumping
  { id: "throb", t: VEIN_T, sfx: "throb", db: -4 },                         // the vein
  { id: "mailslot", t: SLOT_T, sfx: "mailslot", db: -5, start: true },
  { id: "whoosh", t: SLOT_T, sfx: "whoosh", db: -9 },
  { id: "paperpile", t: SLOT_T + 0.1, sfx: "paperpile", db: -9 },
  { id: "thud", t: THUD_T, sfx: "thud", db: -4 },                           // the pile lands on Ross
  { id: "stamp", t: STAMP_T, sfx: "stamp", db: -3 },                        // $29.99
  { id: "lick", t: LICK_T, sfx: "lick", db: -6, start: true },
  { id: "pluck", t: PLUCK_T, sfx: "pluck", db: -5 },
  { id: "tink", t: TINK_T, sfx: "clink", db: -14 },                         // the hair on the plate
  { id: "slide", t: SLIDE_T, sfx: "slide", db: -6 },
  { id: "boing", t: BULGE_T, sfx: "boing", db: -10 },                       // the eyes bulge
  { id: "coins", t: COINS_T, sfx: "coins", db: -8 },                        // the minuses pay out
  { id: "printer", t: PRINT_T, sfx: "printer", db: -5, start: true },
  { id: "stamp2", t: STAMP2_T, sfx: "thud", db: -10 },                      // the end of the receipt lands
  { id: "gasp", t: GASP_T, sfx: "gasp", db: -6 },
  { id: "clamp", t: CLAMP_T, sfx: "smack", db: -8 },                        // the mouth clamps shut
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -8 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -14, start: true, from: 0.75, len: STEAMB_T - KETTLE_T + 0.25, fade: 0.3 },   // the kettle's shriek turns into the tone: it fades out under the tone's first 0.25 s
  { id: "tone", t: STEAMB_T, sfx: "tone", db: 0, start: true, len: STEAM_B[1] - STEAMB_T },                                   // the steam word's bleep, on the mosaic's first frame (the line tones are in the voice files)
  { id: "ring2", t: RING2_T, sfx: "ring", db: -8, start: true },
  { id: "buzz2", t: RING2_T, sfx: "phonebuzz", db: -4, start: true, len: 0.42, fade: 0.05 },
];

// ── sound cues for the mix (scripts/x15-cues.mts): no bed, the room is quiet
export type Cue = { name: string; at: number; db?: number; len?: number; fade?: number; from?: number; bp?: [number, number] };
export function cues(): Cue[] {
  const c: Cue[] = [];
  HITS.forEach((h) => {
    let at = h.start ? h.t : onPeak(h.sfx, h.t) + (h.from ?? 0), from = h.from ?? 0;
    if (at < 0) { from += -at; at = 0; }                           // the peak is before the reel's first frame: skip into the clip so that the peak still lands on the frame
    c.push({ name: h.sfx, at, db: h.db, ...(h.len ? { len: h.len } : {}), ...(h.fade ? { fade: h.fade } : {}), ...(from ? { from } : {}) });
  });
  return c.sort((a, b) => a.at - b.at);
}

// ── captions: the shape of src/x14-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). The swears are grawlix (the spec: "#@$% OFF!", "mother#@$%er!"); `emph`: the words that
// are bleeped (red, bigger, popping on the frame their tone starts). A word that a cut runs through is captioned twice: the part up to the cut, and after the cut the sentence from that word on. The shots whose picture is the text (the invoice,
// the receipt's end, the phones) have no caption: a line that starts in one is captioned whole from the next cut ("This guy eats the whole thing...", "I never ORDERED any bleeps!"), with the first words a beat late.
export type Cap = { who: Who; n: number; text: string; t0: number; t1: number; w0: number; w1: number; words: { d: string; t: number; emph: boolean }[] };
const GRAWLIX = (s: string) => s.replace(/mother(f[u*]ck)er/i, "mother#@$%er").replace(/f[u*]ck/i, "#@$%").replace(/sh[i*]t/i, "#@$%");
const say = (w: Word, l?: Line) => (l && l.n === 1 && w.w === "suspended" ? "suspe-" : GRAWLIX(w.d.replace(/—/g, "-")));
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
/** the end of word i of a line as it is heard: a word right before a bleeped one is cut by the tone, which starts 80 ms before that word ("for" in "for SHIT" ends where the tone begins) */
const wEnd = (l: Line, i: number) => { const w = l.words[i], nx = l.words[i + 1], b = nx?.bleep ? BLEEPS.find((q) => q.line === l.n && q.t0 <= nx.t + 1e-6 && q.t0 >= nx.t - 0.15) : undefined; return b ? Math.min(w.e, b.t0) : w.e; };
export const NO_CAP: ShotId[] = ["ring", "invoice", "door", "printer", "total", "ring2"];
const JOIN_AT: Record<number, ShotId> = { 5: "lick", 9: "receipt" };   // line -> the shot its caption starts in (all of the line's words, from that cut)
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  const cuts = SHOTS.slice(1).map((s) => s.t0);
  for (const l of LINES) {
    const len = (ws: Word[]) => ws.map((w) => say(w, l)).join(" ").length;
    const chunks: Word[][] = [];
    let cur: Word[] = [];
    l.words.forEach((w, i) => {
      cur.push(w);
      const nxt = l.words[i + 1];
      const we = wEnd(l, i);
      if (/[.?!]$/.test(w.d) || (nxt && !(l.n === 1 && nxt.w === "suspended") && cuts.some((c) => c >= we - 0.02 && c <= nxt.t + 0.02))   /* (the robot's "suspe-" belongs to the shot before Ross cuts it off) */ || (nxt && nxt.t - we > 0.3 && len(cur) >= 9)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const mk = (ws: Word[], t0: number, t1: number, w0: number, w1: number): Cap => ({ who: l.who, n: l.n, text: ws.map((w) => say(w, l)).join(" "), t0, t1, w0, w1, words: ws.map((w) => ({ d: say(w, l), t: w.bleep ? (BLEEPS.find((b) => b.line === l.n && b.t0 <= w.t + 1e-6 && b.t0 >= w.t - 0.15)?.t0 ?? w.t) : w.t, emph: !!w.bleep })) });
    if (JOIN_AT[l.n]) {
      const c = S[JOIN_AT[l.n]], ws = l.words;
      caps.push(mk(ws, c, stretchEnd(l, ws[ws.length - 1].e) + 0.25, c, ws[ws.length - 1].e));
      continue;
    }
    chunks.forEach((ws) => {
      const t0 = (ws === chunks[0] ? Math.min(l.first, ws[0].t) : ws[0].t) - 0.04, t1 = stretchEnd(l, ws[ws.length - 1].e) + 0.25, x = ws.findIndex((w) => cuts.some((c) => c > w.t + 0.04 && c < wEnd(l, l.words.indexOf(w)) - 0.04));
      if (x < 0) { caps.push(mk(ws, t0, t1, ws[0].t, ws[ws.length - 1].e)); return; }
      const c = cuts.find((q) => q > ws[x].t + 0.04 && q < wEnd(l, l.words.indexOf(ws[x])) - 0.04)!;
      caps.push(mk(ws.slice(0, x + 1), t0, c, ws[0].t, ws[x].e));
      caps.push(mk(ws.slice(x), c, t1, c, ws[ws.length - 1].e));
    });
  }
  caps.sort((a, b) => a.t0 - b.t0);
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (s) { c.t0 = Math.max(c.t0, s.t0); c.t1 = Math.min(c.t1, s.t1); } });
  return caps.filter((c) => c.t1 - c.t0 > 0.12 && !NO_CAP.includes(SHOTS.find((x) => (c.t0 + 0.02) >= x.t0 - 1e-6 && (c.t0 + 0.02) < x.t1 - 1e-6)?.id as ShotId));
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
/** where the captions sit (frame y px): one band, out of the bottom 400 px (Instagram's), except where something is in it (a face, a phone, a receipt: the shots set their own) */
export const CAP_BAND: [number, number] = [1295, 1455], CAP_BAND_ROSS: [number, number] = [1225, 1485];   // Ross's are bigger (up to 130 px, two lines): a taller band, still above the bottom 400 px (y 1520)
// the close-ups of the explosion: the head fills the frame and its chin is at about y 1250, so the captions go under it, on his shirt (out of Instagram's bottom 400 px); the receipt shot's go over his head
const CLOSE_BAND: [number, number] = [1262, 1486];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { snap: [1326, 1486], yell: [1340, 1486], shit: CLOSE_BAND, bulge: CLOSE_BAND, hair: CLOSE_BAND, blast1: CLOSE_BAND, blast2: CLOSE_BAND, blast3: CLOSE_BAND, head: CLOSE_BAND, receipt: [350, 570] };
export const capBand = (id: ShotId, ross = false): [number, number] => CAP_ELSEWHERE[id] ?? (ross ? CAP_BAND_ROSS : CAP_BAND);
/** the biggest size of a Ross caption in the shot (px) */
const CAP_MAX: Partial<Record<ShotId, number>> = {};
export const capMax = (id: ShotId): number => CAP_MAX[id] ?? 130;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is); SHEET_T is the named moment of each shot for the contact sheet
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${sh.i + 1} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const SHEET_T: Record<ShotId, number> = {
  ring: F(5), pickup: F(16), snap: F(31), yell: F(48), slam: F(76), lean: F(117), env: F(140), shit: F(176), door: F(218), buried: F(236), invoice: F(256), lick: F(275), pluck: F(318), slide: F(350), plate: F(390), bulge: F(420),
  hair: F(447), blast1: F(492), blast2: F(522), blast3: F(554), head: F(582), printer: F(612), total: F(642), receipt: F(692), clamp: F(716), steam: F(750), ring2: F(777),
};
export const KEY_FRAMES: { label: string; f: number }[] = [
  ...SHOT_IDS.flatMap((id) => { const s = SHOTS.find((x) => x.id === id)!, f0 = Math.round(s.t0 * FPS), f1 = Math.round(s.t1 * FPS); return [kf("first", f0 / FPS), kf("named moment", SHEET_T[id]), kf("last", (f1 - 1) / FPS)]; }),
];
