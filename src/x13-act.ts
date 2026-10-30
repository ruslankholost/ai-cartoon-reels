// The acting of x13 "Cheaper" that the scenes need on top of the timeline (src/x13-sched.ts): Ross's and Chuck's faces and heads as functions of the frame (mouth and mood come from the voices there), where each of them looks, how heavy the
// lids are, the little moves on the hits. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import { COFFEE_T, EYES_T, FPS, KACHING_T, SIP_T, SNAP2_T, SNAP_T, SPIT_T, STAB_T, VEIN_T, bulgeAt, blinkOf, clamp01, ease, mouthAt, moodAt, shotAt, shotId, speaking, talkMove, twos } from "./x13-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;

// ═════════════════════════════════════════════════════ Ross
export function rossGaze(f: number): [number, number] {
  const id = shotId(f), tt = t(f);
  switch (id) {
    case "splat": return [0, 0.05];                                                 // the frozen smile looks straight ahead
    case "four": return [0.15, 0.1];
    case "free": return [0, -0.1];
    case "bill": return [0.7, 0.25];                                                // at Chuck, who is on his right of the picture, and the bill he holds out
    case "corks": return [0, 0.05];
    case "cup": return tt < KACHING_T[5] ? [0, 0.1] : [0.8, -0.5];                  // over his cup, then up at the display
    case "spit2": return tt < SNAP2_T ? [0, 0] : [0.5, 0.2];
    default: return [0, 0.05];
  }
}
export function rossLid(f: number): number {
  const id = shotId(f);
  let b = 0.1;
  switch (id) {
    case "splat": b = 0.06; break;
    case "four": b = 0.12; break;
    case "vein": b = 0.04; break;
    case "free": b = 0; break;
    case "bill": b = 0.06; break;
    case "corks": b = 0; break;
    case "cup": b = 0.3; break;
    case "spit2": b = 0; break;
    default: b = 0.08;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on. His smile is wider and tighter with every step of the blow-up (`mouthW`) */
export function rossPose13(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0.1, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0;
  let breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "splat": angry = 0; lift = 0.15; breath = 0; bob = 0; tilt = HEAD_LEVEL; break;       // frozen: the service smile and the open eyes do not move at all
    case "four": angry = 0.1; sad = 0.3; lift = 0.1; breath *= 0.3; break;                      // ...Four? through his teeth, one eye twitching
    case "vein": angry = 0.5; sad = 0; dx += tt >= VEIN_T ? shake(f, 0.7) : 0; break;           // the vein throbs, the smile stretches
    case "free": angry = 0.7; lift = 0; pupil = 0.55; dx += shake(f, 1.2); break;               // the bulging eyes, the clenched grin
    case "bill": angry = 0.15; sad = 0.4; pupil = 0.8; dx += shake(f, 5); break;                // a shaking hand and both eyes twitching: the whole of him trembles on twos
    case "corks": { angry = 1; lift = 0; pupil = 0.55; dx += shake(f, 2.2); break; }
    case "cup": angry = 0; lift = 0.1; break;
    case "spit2": { const a = tt - SNAP2_T; angry = a >= 0 ? 1 : 0; lift = a >= 0 ? 0 : 0.9; pupil = a >= 0 ? 0.7 : 0.55; dx += a >= 0 ? shake(f, 1.6) : 0; break; }
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut || bulgeAt(f) > 0.02 ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  void body; void COFFEE_T;
  return { body, tilt, bob, breath, mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx: 0, mdy: 0 };
}
/** the width of his drawn mouth (rig px): the service smile (100), wider as the vein throbs, a huge clenched grin on FREE, tighter again on the bill */
export function rossMouthW(f: number): number {
  switch (shotId(f)) {
    case "vein": return 130;
    case "free": return 150;
    case "bill": return 112;
    case "corks": return 120;
    default: return 100;
  }
}

// ═════════════════════════════════════════════════════ Chuck: no talking bob (his raised hands are in the head's layer: a tilt would tear them from the arm), a small move of the whole figure instead
function chuckGaze(f: number): [number, number] {
  const id = shotId(f), tt = t(f), s = shotAt(f);
  switch (id) {
    case "sip": return tt < EYES_T ? [0, 0.12] : [0.8, -0.6];                         // over the cup, then up at the display above him on the right
    case "spit": return [0, 0];
    case "snap": case "punch": return [-0.7, 0.55];                                 // at the display, mirrored: to the right and down on the screen
    case "cousin": return [-0.5, 0.05];                                             // at Ross, on his left of the picture
    case "phone": return [0, 0.05];
    case "sipSlow": return [0, 0.25];                                               // over the rim
    case "that": return tt < 17.0 ? [-0.65, 0.7] : tt < 17.45 ? [-0.65, 0.7] : [-0.3, 0.05];   // down at the bill, and back up on "it?"
    case "drawer": return [0, 0.5 * (1 - ease(s.u * 1.5))];                          // down at the drawer in his arms, then up
    case "thirteen": return [0, 0.05];
    default: return [0, 0];
  }
}
function chuckLid(f: number): number {
  const id = shotId(f);
  switch (id) {
    case "sip": return t(f) < EYES_T ? 0.3 : 0.08;                                   // calm, heavy lids; wide open when he sees the price
    case "spit": return 0;
    case "snap": return t(f) < SNAP_T ? 0.3 : 0;
    case "punch": return 0;
    case "cousin": return 0.15;
    case "phone": return 0.2;
    case "sipSlow": return 0.3;
    case "that": return 0.2;
    case "drawer": return 0;
    case "thirteen": return 0.28;                                                   // deadpan
    default: return 0;
  }
}
export type ChuckKind = "latte" | "point" | "cup" | "hold" | "phone" | "drawer" | "apron";
export function chuckPose(kind: ChuckKind, f: number): PuppetPose {
  const tt = t(f), b = blinkOf("chuck", f), l0 = chuckLid(f), lid = Math.max(l0, l0 + (1 - l0) * b), id = shotId(f);
  const dx = (id === "snap" || id === "punch") && speaking("CHUCK", f) ? shake(f, 1.6) : 0;
  let mouth = mouthAt("CHUCK", f);
  if (id === "sip") mouth = "closed";
  if (id === "spit") mouth = tt < SPIT_T + 0.07 ? "mid" : "wide";
  if (id === "snap" && tt < SNAP_T) mouth = "closed";                               // calm until the snap
  if (id === "drawer" && !speaking("CHUCK", f)) mouth = "o";                         // surprised, a small round mouth
  const pupil = id === "spit" ? 0.55 : 1, angry = id === "spit" ? 0 : 0, lift = id === "spit" ? 0.9 : id === "drawer" ? 0.7 : 0;
  return { tilt: 0, bob: 0, breath: 1.2 * Math.sin((Math.PI * 2 * tt) / 3.2 + 0.4), mouth, mood: moodAt("CHUCK", f), lid, angry, sad: 0, lift, asym: 0, pupil, gaze: chuckGaze(f), dx, hdx: 0, mdy: 0 };
}
/** the whole figure's little hop on the voice: px of the figure's own scale, from the head's dip of the voice */
export const hop = (f: number): number => -talkMove("CHUCK", f).bob * 1.4;
/** the lunge of the finger and the figure on the stab at BUCKS?! and the step on COFFEE: px toward the pointed side, decaying */
export const lunge = (f: number): number => [STAB_T, COFFEE_T].reduce((a, t0) => a + (t(f) >= t0 ? 22 * Math.exp(-(t(f) - t0) / 0.07) : 0), 0);
/** the sip: how far the cup is up at his lips (0 down .. 1 at his lips) in the slow sip of shot 13: it comes up, tilts at the slurp, comes down */
export function sipUp(f: number): { up: number; tilt: number } {
  const tt = t(f), up = ease((tt - SIP_T[0]) / (SIP_T[1] - SIP_T[0])) * (1 - ease((tt - SIP_T[2]) / (SIP_T[3] - SIP_T[2])));
  return { up, tilt: -14 * ease((tt - SIP_T[1]) / (SIP_T[2] - SIP_T[1])) * (1 - ease((tt - SIP_T[2]) / (SIP_T[3] - SIP_T[2]))) };
}
export { clamp01, ease };
