// The acting of x14 "Four Stars" that the scenes need on top of the timeline (src/x14-sched.ts): Ross's and Chuck's faces and heads as functions of the frame (mouth and mood come from the voices there), where each of them looks, how heavy the
// lids are, the little moves on the hits. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import { BULGE_T, CORK_T, FPS, LINE, SNAP_T, TWITCH_T, VEIN_T, blinkOf, bulgeAt, clamp01, ease, gulpAt, lerp, mouthAt, moodAt, shotAt, shotId, speaking, talkMove, twos } from "./x14-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;

// ═════════════════════════════════════════════════════ Ross
export function rossGaze(f: number): [number, number] {
  const id = shotId(f), tt = t(f);
  switch (id) {
    case "kneel": return [0, -0.3];                                                  // looking up at him, pleading
    case "present": return [0.1, 0.1];
    case "floor": return [0, -0.2];                                                  // up at the phone
    case "grin": return tt < LINE(11).first ? [0, -0.15] : [0.1, 0.45];              // up at his win, then down at the three stars
    default: return [0, 0.05];
  }
}
export function rossLid(f: number): number {
  const id = shotId(f);
  let b = 0.08;
  switch (id) {
    case "snap": b = t(f) < SNAP_T ? 0.1 : 0; break;
    case "shout": case "stab": case "one": b = 0; break;
    case "vein": b = 0.04; break;
    case "present": b = 0; break;
    case "bulge": case "corks": case "dive": b = 0; break;
    case "kneel": b = 0; break;
    case "floor": b = 0; break;
    case "grin": b = t(f) < LINE(11).first ? 0.12 : 0; break;
    default: b = 0.08;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on. His smile is wider and tighter with every step of the blow-up (`mouthW`) */
export function rossPose14(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0.05, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0;
  let breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "snap": if (tt < SNAP_T) { angry = 0; lift = 0.15; breath = 0; bob = 0; tilt = HEAD_LEVEL; } else { angry = 1; pupil = 0.55; dx += shake(f, 1.6); } break;   // the service smile does not move, then the snap
    case "shout": case "stab": case "one": angry = 1; lift = 0; pupil = 0.6; dx += shake(f, 1.4); break;
    case "vein": angry = 0.5; sad = 0; dx += tt >= VEIN_T ? shake(f, 0.7) : 0; break;                    // the vein throbs, the smile is forced back on
    case "present": angry = 0; lift = 0.45; pupil = 1; breath *= 0.3; break;                              // beaming too hard: the brows high, the eyes fixed
    case "bulge": angry = 0.7; lift = 0; pupil = 0.55; dx += shake(f, 1.2); break;                        // the bulging eyes, the clenched grin
    case "kneel": angry = 0; sad = 0.9; lift = 0.2; pupil = 1; dx += shake(f, 3); break;                 // the pleading brows, the whole of him trembles on twos
    case "corks": angry = 1; lift = 0; pupil = 0.55; dx += shake(f, 2.2); break;
    case "dive": angry = 1; lift = 0; pupil = 0.55; break;
    case "floor": angry = 0; lift = 0.5; pupil = 1; break;                                                // the win
    case "grin": {
      const fall = clamp01((tt - (LINE(11).first - 0.1)) / 0.35);
      angry = 0; lift = lerp(0.4, 0.8, fall); sad = lerp(0, 0.9, fall); pupil = lerp(1, 0.55, fall); dx += tt >= TWITCH_T ? shake(f, 0.8) : 0;
      break;
    }
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut || bulgeAt(f) > 0.02 ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  void body; void BULGE_T; void CORK_T;
  return { body, tilt, bob, breath, mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx: 0, mdy: 0 };
}
/** the width of his drawn mouth (rig px): the service smile (100), wider as the blow-up grows, a huge clenched grin in shot 13, the grin that falls apart in the last shot */
export function rossMouthW(f: number): number {
  const tt = t(f);
  switch (shotId(f)) {
    case "vein": return 130;
    case "present": return 135;
    case "bulge": return 150;
    case "corks": return 120;
    case "floor": return 140;
    case "grin": return lerp(150, 84, clamp01((tt - (LINE(11).first - 0.1)) / 0.3));
    default: return 100;
  }
}

// ═════════════════════════════════════════════════════ Chuck: no talking bob (his raised hands are in the head's layer: a tilt would tear them from the arm), a small move of the whole figure instead
export type ChuckKind = "thumbs" | "shrug" | "mug" | "phone" | "star" | "wreck";
function chuckGaze(f: number): [number, number] {
  const id = shotId(f), tt = t(f);
  switch (id) {
    case "thumbs": return [-0.35, 0.1];                                                 // at Ross, on his left of the picture
    case "shrug": return [-0.35, 0.15];
    case "good": return tt < 16.3 ? [-0.8, 0.5] : tt < 16.55 ? [-0.9, 0.3] : [-0.2, 0.25];   // down at the star, at the phone in his raised hand, back up (the lids are heavy: the pupils stay under their line)
    default: return [0, 0];
  }
}
function chuckLid(f: number): number {
  const id = shotId(f);
  switch (id) {
    case "shrug": return 0.12;
    case "good": return 0.14;
    default: return 0;
  }
}
export function chuckPose(kind: ChuckKind, f: number): PuppetPose {
  const tt = t(f), b = blinkOf("chuck", f), l0 = chuckLid(f), lid = Math.max(l0, l0 + (1 - l0) * b), id = shotId(f);
  const g = id === "mug" ? gulpAt(f) : 0;
  let mouth = mouthAt("CHUCK", f);
  if (kind === "star") mouth = "o";                                                            // dazed: a small round open mouth
  if (kind === "wreck" && mouth === "closed") mouth = "small";
  const gaze = chuckGaze(f), eyesMoved = Math.abs(gaze[0]) > 0.001 || Math.abs(gaze[1]) > 0.001;
  return { tilt: -4 * g, bob: -80 * g, breath: 1.2 * Math.sin((Math.PI * 2 * tt) / 3.2 + 0.4), mouth, mood: moodAt("CHUCK", f), lid, angry: 0, sad: 0, lift: 0, asym: 0, pupil: 1, gaze: eyesMoved ? gaze : [0, 0], dx: 0, hdx: 0, mdy: 0 };
}
/** the whole figure's little hop on the voice: px of the figure's own scale, from the head's dip of the voice */
export const hop = (f: number): number => -talkMove("CHUCK", f).bob * 1.4;
export { clamp01, ease, lerp, shotAt, speaking };
