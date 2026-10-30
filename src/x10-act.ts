// The acting of x10 "My Own Business" that the scenes need on top of the timeline (src/x10-sched.ts): Ross's, Chuck's, Tyler's and the guy's faces and heads as functions of the frame (mouth and mood come from the voices there), where each of them
// looks, how heavy the lids are, the little moves on the hits. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import {
  FPS, KETTLE_T, POP_T, SHUTTER_TOP, WHUMP_T, blinkOf, clamp01, ease, mouthAt, moodAt, shotId, talkMove, twos, type Who,
} from "./x10-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;

// ═════════════════════════════════════════════════════ Ross
export function rossGaze(f: number): [number, number] {
  const id = shotId(f), tt = t(f);
  switch (id) {
    case "shutter": return [0, 0.05];
    case "boxes": return tt < WHUMP_T ? [0.35, -0.85] : [0, 0.5];                  // up at the boxes, then down
    case "pile": return [0, 0.2];
    case "landlord": case "supplier": case "tipjar": return [0.2, 0.6];            // at the money
    case "till": return [0, 0.85];                                                  // down into the empty drawer
    case "hire": return [0.5, 0.3];
    case "fire": return [0.6, 0.1];                                                 // at Tyler
    case "phone": return [-0.3, 0.1];
    case "quarter": return [0.5, 0.7];                                              // at the coin
    case "letter": case "slot": return [0.2, 0.2];
    case "stroll": case "wave": return [-0.6, 0.2];                                 // at the window
    case "listen": return [-0.85, 0.1];
    case "corks": return tt < POP_T ? [0, 0.1] : [-0.4, 0];
    default: return [0, 0.1];
  }
}
export function rossLid(f: number): number {
  const id = shotId(f);
  let b = 0.08;
  switch (id) {
    case "shutter": b = 0; break;
    case "till": b = 0.3; break;
    case "quarter": b = 0.5; break;
    case "stroll": case "wave": b = 0.3; break;
    case "listen": b = 0.2; break;
    case "corks": b = 0; break;
    case "phone": b = 0.12; break;
    default: b = 0.08;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on */
export function rossPose10(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0.1, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0;
  const breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "shutter": angry = 0; lift = 0.5; break;                                     // delighted: the brows up
    case "boxes": { angry = 0; lift = 0.6; pupil = 0.7; const a = tt - WHUMP_T; if (a >= 0) { bob += -14 * Math.exp(-a / 0.08); } break; }
    case "pile": angry = 0.2; break;
    case "landlord": case "supplier": case "tipjar": angry = 0.2; sad = 0.3; break;
    case "till": angry = 0.3; sad = 0.4; break;
    case "hire": angry = 0; sad = 0.1; lift = 0.25; break;                           // relieved, eager
    case "fire": angry = 1; pupil = 0.85; dx += shake(f, 1.2); break;
    case "phone": angry = 0.55; lift = 0.1; asym = 0.3; tilt += 14; break;           // sweet mouth, murderous brows; the head on the phone, which is clamped on his shoulder
    case "quarter": angry = 0; sad = 0.6; tilt += 5; break;
    case "letter": case "slot": angry = 0.9; pupil = 0.85; break;
    case "stroll": case "wave": angry = 0.1; sad = 0.3; tilt += -1.5; break;
    case "listen": angry = 0.5; sad = 0; dx += shake(f, 1.5); break;
    case "corks": {
      angry = 0.9; lift = 0.1; pupil = 0.7; dx += tt > POP_T ? shake(f, 2) : shake(f, 1.2);
      break;
    }
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  return { body, tilt, bob, breath, mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx: 0, mdy: 0 };
}

// ═════════════════════════════════════════════════════ the others: no talking bob (their raised hands are in the head's layer: a tilt would tear them from the arm), a small move of the whole figure instead
export function otherPose(who: Who, f: number, lidBase = 0): PuppetPose {
  const tt = t(f), key = who === "CHUCK" ? "chuck" : who === "TYLER" ? "tyler" : "guy", b = blinkOf(key as "chuck" | "tyler" | "guy", f);
  const lid = Math.max(lidBase, lidBase + (1 - lidBase) * b);
  return { tilt: 0, bob: 0, breath: 1.2 * Math.sin((Math.PI * 2 * tt) / 3.2 + (who === "CHUCK" ? 0.4 : who === "TYLER" ? 1.6 : 2.4)), mouth: mouthAt(who, f), mood: moodAt(who, f), lid, angry: 0, sad: 0, lift: 0, asym: 0, pupil: 1, gaze: [0, 0], dx: 0, hdx: 0, mdy: 0 };
}
/** the whole figure's little hop on the voice (Chuck's lunge at the bell, the guy's nod): px of the figure's own scale, from the head's dip of the voice */
export const hop = (who: Who, f: number): number => -talkMove(who, f).bob * 1.4;
export { clamp01, ease, KETTLE_T, SHUTTER_TOP };
