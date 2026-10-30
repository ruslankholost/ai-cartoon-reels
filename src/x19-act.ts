// The acting of x19 "Screen Time" that the scenes need on top of the timeline (src/x19-sched.ts): Ross's face and head as a function of the frame (mouth and mood come from the voices there), where he looks, how heavy his lids are, the wind that blows him,
// and the small moves of the others (the mom's lids and her shake in the blast, the toddler's glaze). Ross never blows up in this one (Ross 10-29): no vein, no twitch, no purple, no steam, no shout; the hurricane is the song's force, and he keeps a polite smile.
// Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import { FPS, clamp01, ease, hash, inShot, mouthAt, moodAt, shotId, talkMove, twos, blinkOf, BLAST_T } from "./x19-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
/** a jitter on twos: a hashed offset in -1 .. 1 */
export const jit = (f: number, seed = 1, rate = 1): number => hash(Math.floor(f / 2 / rate) * 1.7 + seed * 3.1) * 2 - 1;
export const buzz = (f: number, seed = 1): [number, number] => [jit(f, seed), jit(f, seed + 5.3)];

// ═════════════════════════════════════════════════════ the wind: how hard the blast blows Ross (0 .. 1): the hurricane of shot 2 is the strongest, shot 4 is still in it and it dies down; the next time he is on screen (8) it is a breeze
export function windK(f: number): number {
  const id = shotId(f);
  if (id === "hurricane") return Math.min(1, 0.85 + 0.15 * ease((f - 15) / 4));
  if (id === "rossWind") return 0.72 - 0.25 * ease((f - 57) / 37);
  if (id === "rossNo") return 0.22;
  return 0;
}
/** how far the blast's front has run (0 .. 1) since the song started, for the shock rings and the flash of the first shot */
export const blastAge = (f: number): number => (f / FPS - BLAST_T) / 0.4;

// ═════════════════════════════════════════════════════ Ross
/** where he looks (x -1 left .. 1 right, y -1 up .. 1 down, in the picture): at the tablet and the toddler in the blast (2), at the mom (4, 8), at the tablet's side (14: he offers the headphones), at the room (20), at her (29) */
export function rossGaze(f: number): [number, number] {
  switch (shotId(f)) {
    case "hurricane": return [0.25, 0.1];
    case "rossWind": return [0.2, 0.1];
    case "rossNo": return [-0.2, 0.05];
    case "phones": return [-0.15, 0.2];
    case "usher": return [0.1, 0];
    case "six": return t(f) < 27.6 ? [0, 0.35] : [0.05, 0.05];
    default: return [0, 0.05];
  }
}
/** how far his lids are down: wide in the blast (2, 4), flat after "...No." (8), a slow blink now and then */
export function rossLid(f: number): number {
  let b = 0;
  switch (shotId(f)) {
    case "rossNo": b = 0.22; break;
    case "six": b = 0.1; break;
    default: b = 0;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice) and the wind's push (it leans him downwind: tilt, a slide on the neck, a flutter on twos), the face (the mood of his voice, the brows, the lids, where he looks) */
export function rossPose19(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f), w = windK(f);
  const tilt = HEAD_LEVEL + m.tilt - 9 * w + 3.2 * w * jit(f, 2), bob = m.bob + 3 * w * jit(f, 4), dx = 6 * w * jit(f, 6), hdx = 16 * w + 5 * w * jit(f, 8);
  let angry = 0, sad = 0, lift = 0, asym = 0, pupil = 1;
  const breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "hurricane": case "rossWind": lift = 0.4; pupil = 0.9; break;                  // the polite strained smile: the brows a little up, the eyes a little wide
    case "rossNo": angry = 0.08; lift = 0; sad = 0.12; break;                           // flat: the smile gone
    case "phones": lift = 0.3; break;                                                   // calm and helpful
    case "usher": lift = 0.35; break;                                                   // the usher's polite offer
    case "six": lift = 0.1; asym = 0.3; sad = 0.04; break;                              // dry: one brow a little higher
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  return { body, tilt, bob, breath, mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx, mdy: 0 };
}
/** the width of his drawn mouth (rig px): the strained smile is wide (118), the rest at the painted 100 */
export function rossMouthW(f: number): number {
  return inShot(f, "hurricane", "rossWind") ? 118 : 100;
}

// ═════════════════════════════════════════════════════ the others
/** how far the mom's lids are down: heavy over her phone (5, 7), a smug half (9), a quick blink now and then */
export function momLid(f: number, base = 0): number {
  const k = blinkOf("mom", f);
  return Math.max(base, base + (1 - base) * k);
}
/** the shake of whatever sits in the blast (the mom's bun and sunglasses, the cups on the shelf): a jitter on twos, strongest at the blast's start; `a` the amplitude in px in the loud first seconds, kept at a fifth of it later */
export function blastShake(f: number, a = 3, seed = 1): [number, number] {
  const k = 0.2 + 0.8 * clamp01(1 - (f / FPS - 1.5) / 6);
  return [a * k * jit(f, seed), a * 0.7 * k * jit(f, seed + 2.2)];
}
export { ease, twos };
