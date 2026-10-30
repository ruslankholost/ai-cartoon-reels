// The timeline and the acting of x16 "Hiring a Zoomer" (src/X16.tsx, docs/x16-hiring-a-zoomer.md, the shot list v3 and the build spec). Pure data and arithmetic, the shape of src/x15-sched.ts: every number is a function of the frame, of the fifteen
// voice takes in public/x16/timings.json and of the mouth loudness in src/amp-x16.json; nothing reads a clock or a random source. Seconds are the reel's clock = the table read's clock (take n sits at tableRead.cues[n].at, so the lead and the
// gaps of episodes/x16.jsonc carry the silent beats). The cuts and the named moments hang on the voices as the spec's shot list hangs on its words; every sound's measured peak sits on its picture's hit (src/sfx-peaks.json).
//
// Where this differs from the spec's shot list: only the frames, and only where the voices' own times asked for it. A spec time that falls on half a frame goes up to the next frame (Math.round), except where a word asked for the other: the cut of
// shot 6 is on the boundary of "Red | flag." (4.33, the spec's 4.25 ran through "Red"), the cut of shot 20 is on the end of "honey." (20.50, the spec's 20.45 ran through it: the THUNK is on the cut's first frame). The sip of shot 10 is the picture of
// the sip (the straw in her mouth) for its first 0.2 s and then the master with the talking mouth, on "do" (8.17); the same in shot 24 on "when" (24.07). 28 shots, none over 2.4 s, the reel 28.80 s (864 frames) and it loops into the ring light's click.
import timings from "../public/x16/timings.json" with { type: "json" };
import amps from "./amp-x16.json" with { type: "json" };
import { FPS, clamp01, ease, hash, onPeak, popP, snap, squashAt, twos, type Mood, type MouthShape } from "./pen-sched.ts";
import { lerp } from "./sp-math.ts";

export { FPS, clamp01, ease, hash, lerp, onPeak, popP, snap, squashAt, twos };
export type { Mood, MouthShape };

// ── the voice takes (the shape of src/x15-sched.ts): take n of public/x16/timings.json sits at tableRead.cues[n].at
type Word = { w: string; d: string; t: number; e: number };
type Take = { n: number; file: string; character: string; text: string; end: number; words: Word[]; voiced: [number, number][] };
const TK = timings as unknown as { takes: Take[]; tableRead: { cues: { n: number; at: number }[] } };
const AMP = amps as Record<string, { dur: number; amp: number[] }>;
const P = (n: number) => TK.tableRead.cues.find((c) => c.n === n)!.at;
export type Who = "ROSS" | "KENZIE" | "MOM";
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
  // a take's first word cannot start before its voice does (Whisper stamps "My" 30 ms ahead of the first sound), and the long drawn-out "Sooo..." of take 13 is voiced from 0.06 s but stamped at 0.90 s (where the vowel ends): the first word starts
  // where the voice does, so that its caption comes up with it (the spec: "a long Sooo... from 22.99")
  const words = t.words.map((w, i) => ({ ...w, t: ofs + (i ? w.t : t.n === 13 ? t.voiced[0][0] : Math.max(w.t, t.voiced[0][0])), e: ofs + w.e }));
  const i0 = amp.findIndex((a) => a >= 0.1);
  const base = { n: t.n, who: t.character as Who, file: t.file, ofs, text: t.text, words, first: Math.min(words[0].t, ofs + Math.max(0, i0) / FPS), start: words[0].t, end: words[words.length - 1].e, tend: ofs + t.end, amp, f0: Math.round(ofs * FPS), voiced: t.voiced.map(([a, b]) => [ofs + a, ofs + b] as [number, number]) };
  const peaks = peaksOf(base).map((p, j) => ({ ...p, sign: (j % 2 === 0 ? 1 : -1) as 1 | -1 }));
  return { ...base, peaks };
});
export const LINE = (n: number) => LINES.find((l) => l.n === n)!;

// ── the cuts: frame numbers. The 28 shots. Speech on the reel's clock (first sound .. last word): 1 KENZIE 0.50-1.67 (Hi 0.59, chat 1.00), 2 ROSS 1.87-3.61 (So 1.99, family 3.00, here 3.33), 3 KENZIE 3.91-4.92 (Red 3.97, flag 4.32),
// 4 ROSS 5.22-6.35 (free 5.78, trial 5.99), 5 KENZIE 6.45-7.41 (Unpaid? 6.46), 6 KENZIE 7.76-8.93 (Can 7.82, I 7.97, do 8.18, remote 8.39), 7 ROSS 9.18-10.55 (coffee 9.64, shop 10.06), 8 KENZIE 11.00-12.25 (mom 11.29, money 11.86),
// 9 MOM 12.65-15.68 (thirty 13.36, hour 13.74, And 14.32, mornings 15.15), 10 MOM 15.93-17.02 (customers 16.20), 11 ROSS 17.27-18.77 (COFFEE 17.78, SHOP 18.34), 12 MOM 19.27-21.69 (No 19.26, honey 19.67-20.54, YOU'RE 20.54, red 21.01, flag 21.21),
// 13 KENZIE 22.99-25.03 (Sooo 22.99, when 24.06, start 24.53), 14 ROSS 25.58-26.90 (hired 26.14), 15 KENZIE 27.40-28.44 (Red 27.35, flag 27.70)
const F = (n: number) => n / FPS;
const S = {
  table: F(0), ring: F(15), live: F(38), family: F(57), stab: F(114), flag: F(130), wide: F(153), unpaid: F(192), freeze: F(224), sip: F(239), shop: F(273), tumbler: F(318), spin: F(330), mom: F(374), twitch: F(428),
  glasses: F(473), thumb: F(515), screen: F(569), arm: F(582), slam: F(615), purple: F(654), storm: F(672), drift: F(690), start: F(705), sign: F(753), hired: F(768), last: F(812), click: F(855),
};
export const T_END = F(864);
export const FRAMES = Math.round(T_END * FPS);
export const SHOT_IDS = [
  "table", "ring", "live", "family", "stab", "flag", "wide", "unpaid", "freeze", "sip", "shop", "tumbler", "spin", "mom", "twitch", "glasses", "thumb", "screen", "arm", "slam", "purple", "storm", "drift", "start", "sign", "hired", "last", "click",
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
export const STAMP_T = F(0);                                   // the label POV: HIRING A ZOOMER slams on (the first frame)
export const CLICK_T = F(4);                                   // shot 1: the ring light blazes on in his face (spec 0.12)
export const HEART_T = [F(40), F(43), F(47), F(50), F(53), F(55)];   // shot 3: the hearts leave the bottom of her phone's screen (a pop for each of the last two, after "chat": a pop on its t made Whisper hear "chap")
export const PILL_T = F(57);                                   // the label shrinks into a pill at the top (the cut of shot 4, spec 1.90)
export const FAMILY_T = F(90);                                 // shot 4: a step in on "family" (spec 3.00)
export const STAB1_T = F(115);                                 // shot 5: the toothpick flag into his coffee, DING (spec 3.84)
export const STAB2_T = F(225);                                 // shot 9: the pencil-size flag into his hair, DING (spec 7.50)
export const SIP_T = F(240);                                   // shot 10: she sips from the straw, the slurp (spec 8.00)
export const SWAP10_T = F(245), SWAP24_T = F(722);             // shots 10 and 24: the sip is over, she lowers the tumbler and talks: the sip picture gives way to the master (8.17 on "do", 24.07 on "when")
export const TWITCH_T = F(310);                                // shot 11: his eye starts to twitch (spec 10.30; an even frame: it runs on twos)
export const STAB3_T = F(320);                                 // shot 12: the desk flag into her tumbler, DING (spec 10.65)
export const SPIN_T = F(369);                                  // shot 13: she spins the phone round on the ring light (spec 12.30)
export const GLASSES_T = F(480);                               // shot 16: Mom lowers her sunglasses an inch (the shot starts 15.77, "Or customers." 15.89; she lowers them on "Or")
export const THROB_T = F(516);                                 // shot 17: the vein pops (spec 17.20)
export const STAB4_T = F(570);                                 // shot 18: the desk flag onto the screen, onto Mom's face, DING (spec 19.00)
export const DRAW_T = F(592);                                  // shot 19: her arm comes out of the screen and draws the flagpole out of it like a sword (spec 19.75)
export const THUNK_T = F(615);                                 // shot 20: the pole slams down on his head, he bulges (spec 20.50: the cut's first frame)
export const SNAP_T = F(655);                                  // shot 21: his face snaps purple (spec 21.82)
export const CORK_T = [F(659), F(662)], KETTLE_T = F(664);     // shot 21: POP POP, the kettle (spec 21.95, 22.05, 22.10)
export const STORM_T = F(672);                                 // shot 22: the steam blasts every flag across the café (spec 22.40)
export const SILENCE_T = F(690);                               // shot 23: silence
export const DROP_T = F(704);                                  // shot 23: one little flag lands in his coffee (spec 23.45)
export const GULP_T = F(764);                                  // shot 25: he swallows (spec 25.45)
export const LAST_T = F(815);                                  // shot 27: the last flag, DING (spec 27.15)
export const CLICK2_T = F(855);                                // shot 28: the ring light blazes again, the frame blooms white (spec 28.50)

/** which picture of Kenzie is up: the sip (the straw in her mouth: shots 10 and 24 up to the swap) or the master (the tumbler at her chest, the talking mouth) */
export const kenzieKind = (f: number): "ring" | "sip" => (inShot(f, "sip") && f < Math.round(SWAP10_T * FPS)) || (inShot(f, "start") && f < Math.round(SWAP24_T * FPS)) ? "sip" : "ring";

// ── the red flags: a stick and a red triangle of cloth that waves. Each is stabbed in with a thwip and a DING and they grow with every rung: a toothpick in his coffee, a pencil-size one in his hair, a desk flag in her tumbler and one on the
// screen, the full flagpole on his head, one little one into his coffee, the last one at the lens. They stay where they went in until the steam storm blows them away (the pole stays: it is stuck in his head)
export type FlagId = "coffee" | "hair" | "tumbler" | "screen" | "pole" | "drift" | "last";
export const FLAG_T: Record<FlagId, number> = { coffee: STAB1_T, hair: STAB2_T, tumbler: STAB3_T, screen: STAB4_T, pole: THUNK_T, drift: DROP_T, last: LAST_T };
const BLOWN: FlagId[] = ["coffee", "hair", "tumbler", "screen"];
/** is the flag in (planted by this frame, and not yet blown away by the steam)? */
export const flagIn = (id: FlagId, f: number): boolean => f >= Math.round(FLAG_T[id] * FPS) && !(BLOWN.includes(id) && f >= Math.round(STORM_T * FPS));
/** seconds since the flag was planted (negative before) */
export const flagAge = (id: FlagId, f: number): number => f / FPS - FLAG_T[id];

// ── the label: POV: HIRING A ZOOMER slams on big at the first frame and shrinks into a small pill at the top on the cut of shot 4. `big`: the scale of the big one (a stamp: over its size at first, settled in four frames), `pill`: 0 big .. 1 the pill
export const labelBig = (f: number): number => { const a = f / FPS - STAMP_T; return 1 + 0.18 * Math.exp(-a / 0.045) * Math.cos(a * 46); };
export const pillP = (f: number): number => ease((f / FPS - PILL_T) / 0.2);

// ── the ring light and its light on Ross (shots 1 and 4): `ringlit` how hard it blazes in his face: 0 off .. 1 the flash of the click, settling to a steady glare. The flash of the last shot is shot 28's (`flashAt`)
export function ringlit(f: number): number {
  const t = f / FPS;
  if (t < CLICK_T - 1e-6) return 0;
  return t < PILL_T - 1e-6 ? 0.42 + 0.58 * Math.exp(-(t - CLICK_T) / 0.1) : 0.34 + 0.14 * Math.exp(-(t - PILL_T) / 0.25);
}
/** the white bloom of the last shot: the click on CLICK2_T, then the frame whitens to the last frame (it hides the cut back to shot 1) */
export const flashAt = (f: number): number => { const a = f / FPS - CLICK2_T; return a < 0 ? 0 : Math.min(1, 0.45 + 0.55 * ease(a / 0.24)); };
/** the glare of her ring light on Ross: shots 1, 3 (on her screen) and 4 only (the other close-ups of him are lit normally) */
export const glareAt = (f: number): number => (inShot(f, "table", "live", "family") ? ringlit(f) : 0);
/** how narrow his eyes are against the light (0 none .. 1 a squint): shut down hard on the click, easing in shot 4 */
export function squintAt(f: number): number {
  const t = f / FPS;
  if (t < CLICK_T - 1e-6) return 0;
  if (t < PILL_T - 1e-6) return 0.72 * ease((t - CLICK_T) / 0.07);
  return t < S.stab ? 0.72 - 0.3 * ease((t - PILL_T) / 0.8) : 0;
}

// ── her phone's screen (shot 3): the hearts that leave its bottom. Each has a start, a lane, a sway and a size, from the frame
export const HEARTS = HEART_T.map((t0, i) => ({ t0, x: [0.78, 0.66, 0.84, 0.72, 0.9, 0.6][i], sway: [26, 34, 22, 30, 24, 28][i], size: [64, 52, 72, 58, 48, 66][i], rise: [900, 860, 940, 880, 920, 840][i] }));

// ── the shake and the camera
/** a decaying shake of the camera (frame px): the stamp, the click, the stabs, the spin, the throb, the thunk, the snap, the corks, the click */
function shakeOf(t: number, t0: number, amp: number, tau: number, hz = 90): [number, number] {
  const a = t - t0;
  if (a < 0 || a > tau * 6) return [0, 0];
  const k = amp * Math.exp(-a / tau);
  return [k * Math.sin(a * hz), 0.7 * k * Math.cos(a * (hz * 0.81))];
}
const STABS = [STAB1_T, STAB2_T, STAB3_T, STAB4_T, LAST_T];
export function shakeAt(f: number): [number, number] {
  const t = f / FPS;
  const parts = [shakeOf(t, STAMP_T, 6, 0.05), shakeOf(t, CLICK_T, 9, 0.06), ...STABS.map((s) => shakeOf(t, s, 6, 0.05)), shakeOf(t, SPIN_T, 5, 0.06), shakeOf(t, THROB_T, 7, 0.06), shakeOf(t, THUNK_T, 22, 0.09), shakeOf(t, SNAP_T, 14, 0.07),
    shakeOf(t, CORK_T[0], 9, 0.05), shakeOf(t, CORK_T[1], 9, 0.05), shakeOf(t, DROP_T, 2, 0.05), shakeOf(t, GULP_T, 3, 0.05), shakeOf(t, CLICK2_T, 9, 0.06)];
  const kettle = t >= KETTLE_T && t < SILENCE_T && inShot(f, "storm", "purple") ? [2.4 * Math.sin(t * 190), 1.8 * Math.cos(t * 150)] : [0, 0];
  const quake = t >= STORM_T && t < SILENCE_T ? [5 * Math.sin(twos(f) * 2.1), 4 * Math.cos(twos(f) * 1.7)] : [0, 0];   // the storm: the whole café shakes
  return [parts.reduce((s, p) => s + p[0], kettle[0] + quake[0]), parts.reduce((s, p) => s + p[1], kettle[1] + quake[1])];
}
/** the camera's zoom about the shot's focus: the shot's own framing is in the scene, this is a slow push in the holds and a pulse on the hits */
export const holdPush = (f: number): number => {
  const s = shotAt(f), t = f / FPS, pulse = (t0: number, k: number, tau = 0.07) => (t >= t0 ? k * Math.exp(-(t - t0) / tau) : 0);
  switch (s.id) {
    case "table": return 1 + 0.03 * s.u + pulse(CLICK_T, 0.05, 0.08);
    case "ring": return 1 + 0.03 * s.u;
    case "live": return 1 + 0.02 * s.u;
    case "family": return 1 + 0.02 * s.u + pulse(FAMILY_T, 0.07, 0.09);
    case "stab": return 1 + 0.03 * s.u + pulse(STAB1_T, 0.03);
    case "flag": return 1 + 0.03 * s.u;
    case "wide": return 1 + 0.02 * s.u;
    case "unpaid": return 1 + 0.03 * s.u;
    case "freeze": return 1 + 0.02 * s.u + pulse(STAB2_T, 0.03);
    case "sip": return 1 + 0.03 * s.u;
    case "shop": return 1 + 0.03 * s.u;
    case "tumbler": return 1 + 0.03 * s.u + pulse(STAB3_T, 0.03);
    case "spin": return 1 + 0.02 * s.u + pulse(SPIN_T, 0.04);
    case "mom": return 1 + 0.02 * s.u;
    case "twitch": return 1 + 0.04 * s.u;
    case "glasses": return 1 + 0.03 * s.u;
    case "thumb": return 1 + 0.02 * s.u + pulse(THROB_T, 0.05);
    case "screen": return 1 + 0.03 * s.u + pulse(STAB4_T, 0.03);
    case "arm": return 1 + 0.03 * s.u;
    case "slam": return 1 + 0.02 * s.u + pulse(THUNK_T, 0.07, 0.09);
    case "purple": return 1 + 0.02 * s.u + pulse(SNAP_T, 0.05) + pulse(CORK_T[0], 0.03) + pulse(CORK_T[1], 0.03);
    case "storm": return 1 + 0.03 * s.u;
    case "drift": return 1 + 0.03 * s.u + pulse(DROP_T, 0.02);
    case "start": return 1 + 0.03 * s.u;
    case "sign": return 1 + 0.03 * s.u + pulse(GULP_T, 0.02);
    case "hired": return 1 + 0.03 * s.u;
    case "last": return 1 + 0.03 * s.u + pulse(LAST_T, 0.04);
    case "click": return 1 + 0.03 * s.u + pulse(CLICK2_T, 0.05, 0.08);
    default: return 1;
  }
};

// ── Ross: the head picture (plugs in, the left one gone, both gone), the purple snap, the vein, the bulge, the twitching eye, the steam
/** both plugs in (to the pops), only the right one gone (between the two flicks), both gone (from the second cork to the end of the reel; the loop starts with them in) */
export function plugState(f: number): "both" | "l" | "none" {
  const t = f / FPS;
  return t < CORK_T[0] ? "both" : t < CORK_T[1] ? "l" : "none";
}
/** how purple his face is (0 as painted .. 1 furious): the snap on SNAP_T (four fifths at once, full in three frames), furious to the end of the reel (the loop starts with the boss smile) */
export function purpleAt(f: number): number {
  const t = f / FPS;
  if (t < SNAP_T - 1e-6) return 0;
  return Math.min(1, 0.8 + 0.2 * ease((t - SNAP_T) / 0.1));
}
/** the vein on his forehead (0 none .. 1.15 popped, throbbing while he talks): from THROB_T to the end */
export function veinAt(f: number): number {
  const t = f / FPS;
  if (t < THROB_T) return 0;
  const throb = 1 + 0.2 * Math.max(0, Math.sin((Math.PI * 2 * twos(f)) / FPS / 0.36));
  return Math.min(1.15, popP(t, THROB_T, 0.45, 40)) * (t > THROB_T + 0.4 ? throb : 1);
}
/** the bulge of his eyes (0 none .. 1.1): the eyes of the picture grow into round white balls with tiny pupils on the THUNK, in the close-ups of 20 and 21 (and the wide of 22, where he is small) */
export function bulgeAt(f: number): number {
  const t = f / FPS;
  if (!inShot(f, "slam", "purple", "storm")) return 0;
  return Math.min(1.1, popP(t, THUNK_T, 0.5, 38));
}
/** a twitching lid (fraction of the eye): his right eye from TWITCH_T, a quick flick every 0.4 s, the other eye a third of a cycle behind; harder (both eyes, twice as often) in shot 15 */
export function twitchAt(f: number, eye: 0 | 1): number {
  const t = f / FPS;
  if (t < TWITCH_T - 1e-6 || t >= THROB_T) return 0;
  if (!inShot(f, "shop", "twitch", "tumbler", "spin", "mom", "glasses")) return 0;
  const hard = t >= S.twitch;
  const k = (twos(f) - Math.round(TWITCH_T * FPS) + (eye === 0 ? 0 : 4)) % (hard ? 6 : 12);
  return k === 0 ? (hard ? 0.85 : 0.7) : k === 2 ? 0.3 : 0;
}
/** the steam out of his ear holes: 0 none .. 2.8 thick. The jet starts on the kettle, screams through the storm and dies down at the silence; a thin seethe comes back for shot 26 */
export function steamLevel(f: number): number {
  const t = f / FPS;
  if (t >= KETTLE_T && t < SILENCE_T) return 1.5 + 1.3 * ease((t - KETTLE_T) / 0.3);
  if (t >= S.hired && t < S.last) return 1.15;
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
  if (who === "KENZIE") return a >= 0.5 ? "mid" : "small";   // said flat and bored: the mouth is never wider than mid
  if (who === "MOM") return a >= 0.55 ? "mid" : "small";     // crisp: small neat shapes
  if (w && ROUND.test(w.w) && a >= 0.22 && a < 0.85) return "o";
  return a >= 0.62 ? "wide" : a >= 0.3 ? "mid" : "small";
}
const LINE_MOOD: Record<number, Mood> = { 2: "tight", 4: "tight", 7: "flat", 11: "furious", 14: "hiss" };
/** the mood of a character's mouth and brows: the line's while it is spoken, else the shot's resting one */
export function moodAt(who: Who, f: number): Mood {
  const l = lineOf(who, f), id = shotId(f);
  if (who === "ROSS") {
    if (l && LINE_MOOD[l.n]) return LINE_MOOD[l.n];
    switch (id) {
      case "table": case "family": case "stab": case "wide": case "freeze": return "tight";            // the boss smile
      case "shop": case "twitch": return "flat";                                                    // dead flat
      case "thumb": case "arm": case "slam": case "purple": case "storm": return "furious";
      case "hired": return "hiss";
      default: return "tight";
    }
  }
  return "flat";
}
// the head: tilts a little and dips on every loud syllable, alternating sides, eased over 6 frames (src/x13-sched.ts talkMove). By line: [tilt degrees, dip puppet px]
const pulse = (x: number) => (x < 0 ? 0 : x < 2 ? x / 2 : Math.exp(-(x - 2) / 3.5));
const TALK: Record<number, [number, number]> = { 1: [1.2, 2], 2: [2.4, 5], 3: [1.2, 2], 4: [1.8, 3], 5: [1.5, 2.5], 6: [1.4, 2.4], 7: [0.7, 1.4], 8: [1.6, 2.6], 9: [1.0, 1.6], 10: [0.6, 1], 11: [4.2, 9], 12: [1.2, 2], 13: [1.5, 2.5], 14: [0.7, 1.4], 15: [1.0, 1.8] };
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

// ── blinks: every 2.5-4.5 s, 3 frames, at hashed times; none that touches a cut. Ross does not blink when he is frozen, twitching or furious; Kenzie blinks slowly (5 frames), never while she sips
const CUT_F = new Set(SHOTS.flatMap((s) => [Math.round(s.t0 * FPS), Math.round(s.t1 * FPS) - 1]));
function blinkStarts(seed: number, every = 2.5): number[] {
  const out: number[] = [];
  let t = 0.9 + 1.3 * hash(seed);
  while (t < T_END + 1) { out.push(Math.round(t * FPS)); t += every + 2.0 * hash(seed * 13.7 + out.length * 5.3); }
  return out.filter((s) => ![s - 1, s, s + 1, s + 2, s + 3, s + 4].some((f) => CUT_F.has(f)));
}
export const BLINKS = { ross: blinkStarts(7), kenzie: blinkStarts(23, 2.2) };
const BLINK_ROSS: ShotId[] = ["family", "wide"];
const NO_BLINK_KENZIE: ShotId[] = ["sip", "start"];
export const blinkOf = (who: keyof typeof BLINKS, f: number) => {
  if (who === "kenzie" && inShot(f, ...NO_BLINK_KENZIE)) return 0;
  if (who === "ross" && !inShot(f, ...BLINK_ROSS)) return 0;
  const shape = who === "ross" ? [0.5, 1, 0.5] : [0.4, 0.85, 1, 0.85, 0.4];
  for (const s of BLINKS[who]) { const k = f - s; if (k >= 0 && k < shape.length) return shape[k]; }
  return 0;
};

// ── hits: every picture hit that has a sound: the sound's measured peak sits on the hit's frame; `start` = the clip is loud from its first frame or is a bed: it starts on the frame; `from` = skip into the clip (s). A peak that would
// fall before the reel's start skips into the clip instead of starting early. The flags' DING comes with a stab (a thwip-tock) under it.
export type Hit = { id: string; t: number; sfx: string; db: number; len?: number; fade?: number; start?: boolean; from?: number };
const flagHits = (id: string, t: number, big = 0): Hit[] => [{ id: `stab-${id}`, t, sfx: "stab", db: -9 + big }, { id: `ding-${id}`, t, sfx: "ding", db: -6 + big }];
export const HITS: Hit[] = [
  { id: "stamp", t: STAMP_T, sfx: "stamp", db: -3 },                                                      // the label slams on
  { id: "click", t: CLICK_T, sfx: "ringlight", db: -5, start: true },                                      // the ring light's switch and its hum
  ...HEART_T.slice(4, 6).map((t, i): Hit => ({ id: `heart${i + 5}`, t, sfx: "pop", db: -15 })),
  { id: "grumble1", t: S.wide, sfx: "line", db: -4, start: true, from: 0.2, len: 1.3, fade: 0.3 },        // the line behind him
  ...flagHits("coffee", STAB1_T),
  ...flagHits("hair", STAB2_T, 1),
  { id: "slurp", t: SIP_T, sfx: "slurp", db: -13, start: true, from: 0.2, len: 0.3, fade: 0.1 },          // she sips
  ...flagHits("tumbler", STAB3_T, 2),
  { id: "spin", t: SPIN_T, sfx: "whoosh", db: -8 },                                                       // she spins the phone round
  { id: "grumble2", t: S.thumb, sfx: "line", db: -3, start: true, from: 0.9, len: 1.8, fade: 0.25 },      // the line behind him gets louder
  { id: "throb", t: THROB_T, sfx: "throb", db: -4 },                                                      // the vein
  ...flagHits("screen", STAB4_T, 2),
  { id: "draw", t: DRAW_T, sfx: "unsheathe", db: -5, start: true, len: 0.5, fade: 0.06 },                  // the pole drawn out of the screen like a sword
  { id: "thunk", t: THUNK_T, sfx: "thunk", db: -2 },                                                      // the pole slammed down on his head
  { id: "snap", t: SNAP_T, sfx: "snap", db: -3 },                                                         // his face snapping purple
  ...CORK_T.map((t, i): Hit => ({ id: `cork${i + 1}`, t, sfx: "cork", db: -8 })),
  { id: "kettle", t: KETTLE_T, sfx: "kettle", db: -12, start: true, from: 0.75, len: SILENCE_T - KETTLE_T - 0.02, fade: 0.15 },   // the kettle screams to the silence
  { id: "storm", t: STORM_T, sfx: "flagstorm", db: -5, start: true, len: SILENCE_T - STORM_T, fade: 0.15 },   // the gust of a hundred little flags
  { id: "plip", t: DROP_T, sfx: "drip", db: -12 },                                                        // one flag lands in his coffee
  { id: "gulp", t: GULP_T, sfx: "gulp", db: -6 },                                                         // he swallows
  { id: "grumble3", t: S.sign, sfx: "line", db: -2, start: true, from: 2.15, len: 0.6, fade: 0.15 },     // the line glaring: the foot stamps on his look
  ...flagHits("last", LAST_T, 1),
  { id: "click2", t: CLICK2_T, sfx: "ringlight", db: -5, start: true },
];

// ── sound cues for the mix (scripts/x16-cues.mts): no bed, the room is quiet
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

// ── captions: the shape of src/x15-sched.ts (one plain line at a time, split at sentence ends, pauses, cuts and ~22 characters, never over a cut). `emph`: the words "red" and "flag" (red, a little bigger, popping on their frame). A word
// that a cut runs through is captioned twice: the part up to the cut, and after the cut the sentence from that word on. The shots whose picture is the whole phone screen (her live, the flag jammed on it) have no caption: a line that starts in
// one is captioned from the next cut (L12's "No," is Mom's voice over the insert).
export type Cap = { who: Who; n: number; text: string; t0: number; t1: number; w0: number; w1: number; words: { d: string; t: number; emph: boolean }[] };
const say = (w: Word) => w.d.replace(/—/g, "-");
const isFlag = (w: Word) => /^\W*(red|flag)\W*$/i.test(w.d);
const stretchEnd = (l: Line, e: number) => { let end = e; for (const [a, b] of l.voiced) if (a <= end + 0.08 && b > end) end = b; return end; };
export const NO_CAP: ShotId[] = ["live", "screen", "click"];
export const CAPS: Cap[] = (() => {
  const caps: Cap[] = [];
  const cuts = SHOTS.slice(1).map((s) => s.t0);
  for (const l of LINES) {
    const len = (ws: Word[]) => ws.map(say).join(" ").length;
    const chunks: Word[][] = [];
    let cur: Word[] = [];
    l.words.forEach((w, i) => {
      cur.push(w);
      const nxt = l.words[i + 1];
      if (/[.?!]$/.test(w.d) || (nxt && cuts.some((c) => c >= w.e - 0.02 && c <= nxt.t + 0.02)) || (nxt && nxt.t - w.e > 0.3 && len(cur) >= 9)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const mk = (ws: Word[], t0: number, t1: number, w0: number, w1: number): Cap => ({ who: l.who, n: l.n, text: ws.map(say).join(" "), t0, t1, w0, w1, words: ws.map((w) => ({ d: say(w), t: w.t, emph: isFlag(w) })) });
    chunks.forEach((ws) => {
      const t0 = (ws === chunks[0] ? Math.min(l.first, ws[0].t) : ws[0].t) - 0.04, t1 = stretchEnd(l, ws[ws.length - 1].e) + 0.25, x = ws.findIndex((w) => cuts.some((c) => c > w.t + 0.04 && c < w.e - 0.04));
      if (x < 0) { caps.push(mk(ws, t0, t1, ws[0].t, ws[ws.length - 1].e)); return; }
      const c = cuts.find((q) => q > ws[x].t + 0.04 && q < ws[x].e - 0.04)!;
      caps.push(mk(ws.slice(0, x + 1), t0, c, ws[0].t, ws[x].e));
      caps.push(mk(ws.slice(x), c, t1, c, ws[ws.length - 1].e));
    });
  }
  caps.sort((a, b) => a.t0 - b.t0);
  caps.forEach((c, i) => { if (caps[i + 1] && c.t1 > caps[i + 1].t0) c.t1 = Math.max(c.t0 + 0.2, caps[i + 1].t0); });
  caps.forEach((c) => { const s = SHOTS.find((x) => c.w0 + 0.02 >= x.t0 - 1e-6 && c.w0 + 0.02 < x.t1 - 1e-6); if (s) { c.t0 = Math.max(c.t0, s.t0); c.t1 = Math.min(c.t1, s.t1); } });
  caps.forEach((c, i) => { const n = caps[i + 1]; if (n && n.n === c.n && n.t0 > c.t1 && n.t0 - c.t1 < 0.12) c.t1 = n.t0; });   // (two captions of one line that follow each other leave no blank frames between them)
  return caps.filter((c) => c.t1 - c.t0 > 0.12 && !NO_CAP.includes(SHOTS.find((x) => (c.t0 + 0.02) >= x.t0 - 1e-6 && (c.t0 + 0.02) < x.t1 - 1e-6)?.id as ShotId));
})();
export const capAt = (f: number) => CAPS.find((c) => f / FPS >= c.t0 - 1e-6 && f / FPS < c.t1 - 1e-6);
/** where the captions sit (frame y px): one band, out of the bottom 400 px (Instagram's, y 1520 and down). The shots set their own where a face, a phone or the sign is in it */
export const CAP_BAND: [number, number] = [1255, 1480];
const CAP_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = { flag: [1325, 1495] };   // (shot 6 is closer: her chin is at y 1320, the caption starts under it and ends above y 1500)
export const capBand = (id: ShotId): [number, number] => CAP_ELSEWHERE[id] ?? CAP_BAND;
/** the biggest size of a caption in the shot (px): Ross's shout is the biggest */
const CAP_MAX: Partial<Record<ShotId, number>> = { thumb: 150 };
export const capMax = (id: ShotId): number => CAP_MAX[id] ?? 124;
/** the captions' box across (frame x px, left and right): x 30-950, the right 130 px clear of the platform's buttons */
const CAP_X_ELSEWHERE: Partial<Record<ShotId, [number, number]>> = {};
export const capX = (id: ShotId): [number, number] => CAP_X_ELSEWHERE[id] ?? [30, 950];

// ── the stills: one or more per shot (the label is the shot's number and name and what the moment is); SHEET_T is the named moment of each shot for the contact sheet
const kf = (what: string, t: number) => { const f = Math.min(FRAMES - 1, Math.round(t * FPS)), sh = shotAt(f); return { label: `${sh.i + 1} ${sh.id}${what ? ": " + what : ""}`, f }; };
export const SHEET_T: Record<ShotId, number> = {
  table: F(8), ring: F(26), live: F(48), family: F(92), stab: F(117), flag: F(140), wide: F(165), unpaid: F(215), freeze: F(232), sip: F(256), shop: F(314), tumbler: F(323), spin: F(372), mom: F(396), twitch: F(450), glasses: F(492),
  thumb: F(522), screen: F(573), arm: F(603), slam: F(617), purple: F(662), storm: F(678), drift: F(702), start: F(730), sign: F(760), hired: F(790), last: F(820), click: F(860),
};
export const KEY_FRAMES: { label: string; f: number }[] = [
  ...SHOT_IDS.flatMap((id) => { const s = SHOTS.find((x) => x.id === id)!, f0 = Math.round(s.t0 * FPS), f1 = Math.round(s.t1 * FPS); return [kf("first", f0 / FPS), kf("named moment", SHEET_T[id]), kf("last", (f1 - 1) / FPS)]; }),
];
