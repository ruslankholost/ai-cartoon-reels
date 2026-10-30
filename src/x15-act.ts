// The acting of x15 "Bleep Fee" that the scenes need on top of the timeline (src/x15-sched.ts): Ross's, Chuck's and the Bleep Guy's faces and heads as functions of the frame (mouth and mood come from the voices there), where each of them looks,
// how heavy the lids are, the little moves on the hits. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import { CLAMP_T, FPS, GASP_T, SNAP_T, TWITCH_T, blinkOf, bulgeAt, clamp01, ease, inShot, mouthAt, moodAt, shotAt, shotId, speaking, talkMove, twos } from "./x15-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;

// ═════════════════════════════════════════════════════ Ross
export function rossGaze(f: number): [number, number] {
  return inShot(f, "snap", "yell", "lean", "env", "shit") ? [0, 0.1] : [0, 0.05];
}
export function rossLid(f: number): number {
  const id = shotId(f);
  let b = 0.08;
  switch (id) {
    case "pickup": b = 0.1; break;                                                   // the service smile: the eyes a little heavy
    case "printer": b = 0.12; break;                                                 // panting
    default: b = 0;                                                                  // every other shot is the blow-up: the eyes wide
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on */
export function rossPose15(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0.05, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0;
  let breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "pickup": angry = 0; lift = 0.15; breath = 0; bob = 0; tilt = HEAD_LEVEL; break;                                  // the service smile does not move
    case "snap": case "yell": angry = 1; pupil = 0.55; dx += shake(f, 1.6); break;
    case "lean": case "env": case "shit": case "buried": angry = 1; pupil = 0.6; dx += shake(f, 1.4); break;
    case "bulge": case "hair": angry = 0.8; pupil = 0.55; dx += shake(f, 1.6); break;                                        // the bulging eyes, the grinding teeth
    case "blast1": case "blast2": case "blast3": case "head": angry = 1; pupil = 0.5; dx += shake(f, 2.6); break;           // the explosion
    case "printer": angry = 0.35; sad = 0.25; lift = 0.1; pupil = 0.8; breath = 6 * Math.sin((Math.PI * 2 * tt) / 0.46); bob = 0; break;   // panting
    case "receipt": angry = 0.85; pupil = 0.6; dx += tt >= TWITCH_T ? shake(f, 1.2) : shake(f, 0.8); break;
    case "clamp": angry = tt < CLAMP_T ? 0.5 : 1; pupil = tt < CLAMP_T ? 0.8 : 0.5; dx += tt >= CLAMP_T ? shake(f, 3.4) : shake(f, 0.8); break;   // he opens wide, then clamps it shut, shaking
    case "steam": angry = 1; pupil = 0.55; dx += shake(f, 2.4); break;
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut || bulgeAt(f) > 0.02 ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  void body; void SNAP_T;
  let mouth = mouthAt("ROSS", f);
  if (id === "clamp") mouth = tt < GASP_T + 0.05 ? "closed" : tt < CLAMP_T ? "wide" : "closed";   // he sucks in air, the mouth wide open for the next one, then it snaps shut
  if (id === "steam") mouth = "closed";
  if (id === "printer" && tt >= 20.2) mouth = Math.floor(f / 4) % 2 ? "o" : "small";               // panting: the mouth open and shut on every breath (about four a second)
  return { body, tilt, bob, breath, mouth, mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx: 0, mdy: 0 };
}
/** the width of his drawn mouth (rig px): the service smile (100), a clenched grin of hissing teeth under the steam */
export function rossMouthW(f: number): number {
  switch (shotId(f)) {
    case "steam": return 120;
    default: return 100;
  }
}

// ═════════════════════════════════════════════════════ Chuck: no talking bob (his raised hands are in the head's layer: a tilt would tear them from the arm), a small move of the whole figure instead
export type ChuckKind = "lick" | "pluck" | "plate";
export function chuckPose(kind: ChuckKind, f: number): PuppetPose {
  const tt = t(f), b = blinkOf("chuck", f), lid = b;
  const mouth = mouthAt("CHUCK", f);
  return { tilt: 0, bob: 0, breath: 1.2 * Math.sin((Math.PI * 2 * tt) / 3.2 + 0.4), mouth: kind === "plate" ? mouth : "closed", mood: moodAt("CHUCK", f), lid, angry: 0, sad: 0, lift: 0, asym: 0, pupil: 1, gaze: [0, 0], dx: 0, hdx: 0, mdy: 0 };
}
/** the whole figure's little hop on the voice: px of the figure's own scale, from the head's dip of the voice */
export const hop = (f: number): number => -talkMove("CHUCK", f).bob * 1.4;
// ═════════════════════════════════════════════════════ the Bleep Guy: a blank face, he never speaks; he breathes
export function bleepPose(f: number): PuppetPose {   // (he never blinks: a lid over his eye would cut across the rim of his glasses)
  const tt = t(f);
  return { tilt: 0, bob: 0, breath: 1.0 * Math.sin((Math.PI * 2 * tt) / 3.6 + 1.1), mouth: "closed", mood: "flat", lid: 0, angry: 0, sad: 0, lift: 0, asym: 0, pupil: 1, gaze: [0, 0], dx: 0, hdx: 0, mdy: 0 };
}
export { clamp01, ease, shotAt, speaking };
