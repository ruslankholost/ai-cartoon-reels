// The acting of x20 "One Coffee" that the scenes need on top of the timeline (src/x20-sched.ts): Ross's face and head as a function of the frame (mouth and mood come from the voices there), where he looks, how heavy his lids are and how far he leans in.
// Ross never blows up in this one (Ross 10-29): no vein, no twitch, no purple, no steam, no shout; he is polite (the counter, the foam), flat (at "...At eight." and at the plug) and dry (at the end). Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import { FPS, ease, hash, mouthAt, moodAt, shotId, talkMove, blinkOf } from "./x20-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
/** a jitter on twos: a hashed offset in -1 .. 1 */
export const jit = (f: number, seed = 1, rate = 1): number => hash(Math.floor(f / 2 / rate) * 1.7 + seed * 3.1) * 2 - 1;

/** how far Ross leans in toward the camper's table (0 .. 1): slowly over shot 9 ("Someone else might want that table.": polite, a little closer with every word) */
export function leanK(f: number): number {
  return shotId(f) === "table" ? ease((f - 222) / 46) : 0;
}
/** where he looks (x -1 left .. 1 right, y -1 up .. 1 down, in the picture): toward the camper's table at the left (4, 5, 7, 9), at the plug in his hand (19: down and in), straight at us under the foam (25) and at the end (27) */
export function rossGaze(f: number): [number, number] {
  switch (shotId(f)) {
    case "rossA": case "rossB": return [-0.3, 0.05];
    case "eight": return [-0.25, 0.1];
    case "table": return [-0.35, 0.05];
    case "leaving": return [0.1, 0.3];
    case "soaked": return [0, 0.1];
    case "dry": return [0.05, 0.15];
    default: return [0, 0.05];
  }
}
/** how far his lids are down: flat after "...At eight." (7), half at the plug (19), heavy and dry at the end (27), a slow blink now and then */
export function rossLid(f: number): number {
  let b = 0;
  switch (shotId(f)) {
    case "eight": b = 0.22; break;
    case "leaving": b = 0.12; break;
    case "dry": b = 0.2; break;
    default: b = 0;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, and the lean toward the camper), the face (the mood of his voice, the brows, the lids, where he looks) */
export function rossPose20(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f), lean = leanK(f);
  const tilt = HEAD_LEVEL + m.tilt + 4 * lean, bob = m.bob - 3 * lean, hdx = -14 * lean;
  let angry = 0, sad = 0, lift = 0, asym = 0, pupil = 1;
  const breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "rossA": case "rossB": lift = 0.3; break;                                      // the polite hint
    case "eight": angry = 0.08; sad = 0.12; break;                                      // flat: the smile gone
    case "table": lift = 0.35; break;                                                   // polite, a little closer
    case "leaving": angry = 0.06; sad = 0.1; asym = 0.15; break;                        // calm, the dead plug in his hand
    case "soaked": lift = 0.2; pupil = 0.92; break;                                     // the polite smile under the foam
    case "dry": lift = 0.1; asym = 0.3; sad = 0.04; break;                              // dry: one brow a little higher
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  return { body, tilt, bob, breath, mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx: 0, hdx, mdy: 0 };
}
/** the width of his drawn mouth (rig px): the painted 100 everywhere (his smile stays polite and small, never a strained grin) */
export const rossMouthW = (_f: number): number => 100;
export { ease };
