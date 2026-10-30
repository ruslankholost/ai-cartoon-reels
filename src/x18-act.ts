// The acting of x18 "Unattended" that the scenes need on top of the timeline (src/x18-sched.ts): Ross's face and head as a function of the frame (mouth and mood come from the voices there), where he looks, how heavy his lids are, and the small
// moves of the others (the mom's bob, the kids' pump, the toddler's buzz). Ross never blows up in this one (Ross 10-27): no vein, no twitch, no purple, no steam, no shout; he stays polite and dry. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import { FPS, TICK_T, blinkOf, chantAt, clamp01, doorAt, ease, hash, inShot, mouthAt, moodAt, shotId, talkMove, twos } from "./x18-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;

// ═════════════════════════════════════════════════════ Ross
/** where he looks (x -1 left .. 1 right, y -1 up .. 1 down, in the picture): at the milk dripping in front of him (4), at the mom (6), at the sign he presses to the glass (9), at the kids (17), at nothing in his chair (21), at his cup (25) */
export function rossGaze(f: number): [number, number] {
  switch (shotId(f)) {
    case "ross1": return t(f) < 4.4 ? [0.15, 0.5] : [0, 0.1];     // down at the till's milk, then at the mom
    case "flat": return [-0.1, 0.05];
    case "tape": return [0.2, 0.2];
    case "finger": return [0, 0.15];                               // at the kids over the counter
    case "feet": return [-0.15, -0.1];
    case "wipe": return t(f) < 26.9 ? [0.1, 0.55] : [0, 0.1];     // at the cup, then at the mom on "exploring"
    default: return [0, 0.05];
  }
}
/** his slow sip in his chair (21b, frames 649-664): 0 .. 1 .. 0, slow in and out: the head dips toward the cup, the eyes go heavy */
export const sipAt = (f: number): number => Math.sin(Math.PI * clamp01((f - 649) / 15)) ** 2;
/** how far his lids are down: wide open and a little startled in the frozen smile (4), heavy and flat (6), half down in his chair (21b), a slow blink after a line */
export function rossLid(f: number): number {
  let b = 0;
  switch (shotId(f)) {
    case "flat": b = 0.22; break;
    case "feet": b = 0.28 + 0.32 * sipAt(f); break;
    case "wipe": b = 0.08; break;
    default: b = 0;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on */
export function rossPose18(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0, hdx = 0;
  const breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "ross1": lift = 0.3; pupil = 0.92; break;                                   // the polite frozen smile: the brows a little up, the eyes a little wide
    case "flat": angry = 0.08; lift = 0; sad = 0.12; break;                          // flat: the smile gone
    case "tape": lift = 0.2; break;                                                  // a small calm smile
    case "finger": lift = 0.35; break;                                               // a waiter taking an order
    case "feet": lift = 0.05; tilt += 3 + 4 * sipAt(f); bob -= 13 * sipAt(f); break;   // leaned back, content; the sip: the head rolls and dips toward the cup
    case "wipe": lift = 0.15; asym = 0.3; break;                                     // dry: one brow a little higher
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  return { body, tilt, bob, breath, mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx, mdy: 0 };
}
/** the width of his drawn mouth (rig px): the frozen smile is wide (118), the rest at the painted 100 */
export function rossMouthW(f: number): number {
  return shotId(f) === "ross1" ? 118 : 100;
}

// ═════════════════════════════════════════════════════ the others: small moves on the voices and on the hits
/** the eight kids' pump on the chant (shots 16 and 19): kid i bobs up on every syllable (0 .. 1) and settles, each two frames behind the one before (a wave along the row) */
export const pumpAt = (f: number, i = 0): number => (inShot(f, "row", "zap") ? Math.min(1, chantAt(f - Math.round(i * 1.5)) * 1.1) : 0);
/** where the mom looks in the glasses picture: at the viewer (11), then the three ticks of 12: the kids (left), the sign (up), the door (right); her painted pupils are low in the whites, the code pupils start up from there */
export function momGaze(f: number): [number, number] {
  if (f < TICK_T[0] * FPS - 0.5) return [0.1, -0.3];
  if (f < TICK_T[1] * FPS - 0.5) return [-1, 0.05];
  if (f < TICK_T[2] * FPS - 0.5) return [0.1, -1];
  return [1, 0.05];
}
/** how far the mom's lids are down: heavy over her phone (3, 5), a smug half (8), a quick blink now and then */
export function momLid(f: number, base = 0): number {
  const k = blinkOf("mom", f);
  return Math.max(base, base + (1 - base) * k);
}
/** the door's leaf: how far it has swung (0 shut .. 1 open) */
export const doorSwing = doorAt;
/** a buzz: a quick jitter on twos (the toddler's eyes, the wired kids): a hashed offset in -1..1 */
export const buzz = (f: number, seed = 1): [number, number] => [hash(twos(f) * 1.7 + seed) * 2 - 1, hash(twos(f) * 2.9 + seed * 3.1) * 2 - 1];
export { ease };
