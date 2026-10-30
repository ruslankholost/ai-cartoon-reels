// The acting of x11 "Are You Open?" that the scenes need on top of the timeline (src/x11-sched.ts): Ross's and Chuck's faces and heads as functions of the frame (mouth and mood come from the voices there), where each of them looks, how heavy the lids
// are, the little moves on the hits. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import {
  BULGE_T, DRUM_T, FPS, JAB_T, GREEN_T, RIP_T, SMACK_T, SLIDE_T, VEIN_T, WALLET_T, blinkOf, clamp01, ease, mouthAt, moodAt, shotId, speaking, talkMove, twos, type Who,
} from "./x11-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;

// ═════════════════════════════════════════════════════ Ross
export function rossGaze(f: number): [number, number] {
  const id = shotId(f), tt = t(f);
  switch (id) {
    case "sign": return [0.6, 0.35];                                               // at the sign he flips
    case "twitch": return [0.15, 0.1];
    case "car": return [0, -0.2];                                                  // at the light
    case "vein": case "wait": return [0, 0.1];
    case "floor": return [0, -0.25];
    case "bedsmack": case "bulge": return [0, 0];
    case "rip": return [0, 0.1];
    case "corks": return [0, -0.1];
    case "fine": return [0, 0];
    case "open": return [0, 0];
    case "five": return [0, 0.4];                                                  // at nothing, at the floor
    case "nextday": return tt < 28.5 ? [0.6, 0.35] : [0.6, 0.3];                  // at the sign
    default: return [0, 0.05];
  }
}
export function rossLid(f: number): number {
  const id = shotId(f), tt = t(f);
  let b = 0.08;
  switch (id) {
    case "sign": b = 0.1; break;
    case "twitch": b = 0.15; break;
    case "car": b = 0.15; break;
    case "bed": b = 1; break;
    case "bedsmack": b = tt < SMACK_T[2] ? 1 : 0; break;
    case "bath": case "cukes": b = 1; break;
    case "rip": b = tt < RIP_T + 0.07 ? 1 : 0; break;
    case "vein": case "wait": case "floor": b = 0.04; break;
    case "bulge": case "corks": case "fine": case "open": b = 0; break;
    case "five": b = 0.5; break;
    case "nextday": b = 0.05; break;
    default: b = 0.08;
  }
  if (b >= 0.99) return 1;
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on */
export function rossPose11(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0.1, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0, mouth = mouthAt("ROSS", f);
  let breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "sign": angry = 0; lift = 0.5; break;                                        // pleased: the brows up
    case "twitch": { angry = 0.9; pupil = 0.8; dx += shake(f, 1.0) + JAB_T.reduce((a, j) => a + (tt >= j ? 16 * Math.exp(-(tt - j) / 0.06) : 0), 0); break; }   // the finger jabs the sign: the whole figure lunges at it on each tap
    case "car": {                                                                     // drumming on the wheel: the head nods on every tap
      angry = 0; lift = 0.2;
      const k = DRUM_T.filter((d) => tt >= d).length, last = DRUM_T.filter((d) => tt >= d).pop();
      if (last !== undefined) { const a = tt - last; bob += -5 * Math.exp(-a / 0.07); tilt += (k % 2 ? 1 : -1) * 1.6 * Math.exp(-a / 0.12); }
      break;
    }
    case "carsmack": angry = 0.3; pupil = 0.6; lift = 0.3; break;                    // frozen mid-drum
    case "vein": angry = 1; pupil = 0.8; dx += tt > VEIN_T ? shake(f, 1.6) : 0; break;
    case "wait": angry = 0.8; pupil = 0.8; dx += shake(f, 0.8); break;
    case "floor": { angry = 1; pupil = 0.7; const a = tt - GREEN_T; bob += a >= 0 ? -16 * Math.exp(-a / 0.15) : 0; tilt += a >= 0 ? -6 * Math.exp(-a / 0.25) : 0; dx += shake(f, 1.4); break; }
    case "bed": {                                                                     // asleep: the head droops, the mouth opens on the breath in
      breath = 3 * Math.sin((Math.PI * 2 * tt) / 1.6); tilt += -4; angry = 0; sad = 0.2;
      mouth = Math.sin((Math.PI * 2 * tt) / 1.6) > 0.2 ? "mid" : "small";
      break;
    }
    case "bedsmack": { angry = 0; pupil = 0.4; lift = 1; sad = 0.3; const a = tt - SMACK_T[2]; bob += a >= 0 ? 16 * Math.exp(-a / 0.1) : 0; break; }
    case "bulge": angry = 0.1; pupil = 0.4; lift = 1; sad = 0.5; dx += shake(f, 1.2); break;
    case "bath": case "cukes": angry = 0; sad = 0; lift = 0; tilt += -2; if (!speaking("ROSS", f)) mouth = "closed"; break;
    case "rip": angry = 0; pupil = 0.45; lift = 1; bob += tt >= RIP_T ? 10 * Math.exp(-(tt - RIP_T) / 0.1) : 0; break;
    case "corks": angry = 1; pupil = 0.6; lift = 0.1; dx += shake(f, 2.2); break;
    case "fine": angry = 1; pupil = 0.6; dx += shake(f, 2.6); break;
    case "open": angry = 0; lift = 0.4; pupil = 0.55; dx += shake(f, 0.6); mouth = "closed"; break;                       // the grin is drawn over his mouth
    case "five": angry = 0; sad = 0.7; pupil = 0.9; tilt += 3; breath *= 0.4; break;
    case "nextday": angry = 0; sad = 0.2; lift = 0.2; pupil = 0.8; dx += shake(f, tt < 29.0 ? 1.8 : 1.8 * Math.max(0, (29.1 - tt) / 0.1)); break;
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  return { body, tilt, bob, breath, mouth, mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx: 0, mdy: 0 };
}

// ═════════════════════════════════════════════════════ Chuck: no talking bob (his raised hands are in the head's layer: a tilt would tear them from the arm), a small move of the whole figure instead
export type ChuckKind = "smush" | "curtain" | "wallet" | "x10";
function chuckGaze(f: number): [number, number] {
  const id = shotId(f), tt = t(f);
  switch (id) {
    case "smack": case "shout": return [0, 0.05];
    case "carsmack": case "wait": return [0, 0.15];
    case "bedsmack": case "slide1": return [0, 0.25];
    case "slide2": return [0, 0.25 + 0.6 * clamp01((tt - SLIDE_T) / 0.4)];          // his eyes follow the floor as he goes
    case "chuck": return [0, 0.1];
    case "case": return tt < 23.18 ? [0, 0.1] : tt < WALLET_T[1] / FPS + 0.3 ? [-0.55, 0.75] : [0, 0.15];     // at the camera, down at the muffins, then back
    case "door": return [0, 0.05];
    default: return [0, 0];
  }
}
function chuckLid(f: number): number {
  const id = shotId(f);
  switch (id) {
    case "smack": return 0.08;
    case "carsmack": case "wait": return 0.3;
    case "bedsmack": case "slide1": case "slide2": return 0.3;
    case "case": return 0.3;
    case "chuck": return 0.1;
    default: return 0.05;
  }
}
export function chuckPose(kind: ChuckKind, f: number): PuppetPose {
  const tt = t(f), b = blinkOf("chuck", f), l0 = chuckLid(f), lid = Math.max(l0, l0 + (1 - l0) * b), who: Who = "CHUCK";
  const e = lid >= 0.9 ? { lid, gaze: chuckGaze(f) } : { lid, gaze: chuckGaze(f) };
  return { tilt: 0, bob: 0, breath: kind === "smush" ? 0 : 1.2 * Math.sin((Math.PI * 2 * tt) / 3.2 + 0.4), mouth: mouthAt(who, f), mood: moodAt(who, f), lid: e.lid, angry: 0, sad: 0, lift: 0, asym: 0, pupil: 1, gaze: e.gaze, dx: 0, hdx: 0, mdy: 0 };
}
/** the whole figure's little hop on the voice (Chuck's "...How about now?"): px of the figure's own scale, from the head's dip of the voice */
export const hop = (f: number): number => -talkMove("CHUCK", f).bob * 1.4;
export { clamp01, ease, BULGE_T, WALLET_T };
