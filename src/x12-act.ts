// The acting of x12 "Speak to the Manager" that the scenes need on top of the timeline (src/x12-sched.ts): Ross's and Chuck's faces and heads as functions of the frame (mouth and mood come from the voices there), where each of them looks,
// how heavy the lids are, the little moves on the hits. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import { FPS, KETTLE_T, SIGH_T, SNAP_T, TWITCH_T, blinkOf, clamp01, ease, haloAt, mouthAt, moodAt, shotId, shotAt, speaking, talkMove, twos, TWANGS, type RossBody } from "./x12-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;

// ═════════════════════════════════════════════════════ Ross
export function rossGaze(f: number): [number, number] {
  const id = shotId(f);
  switch (id) {
    case "drop": return [0, -0.1];
    case "crown": return [0, 0.1];
    case "flat": return [0, 0.45];                                                  // at the floor, tired
    case "god": return [0, -0.55];                                                  // up, at the ceiling he came through
    case "speaking": return [0, -0.1];
    case "steam": return [0.65, 0.2];                                               // at Chuck's cup, on his right of the picture
    case "droop": return [0, 0.65];                                                 // down
    default: return [0, 0.05];
  }
}
export function rossLid(f: number): number {
  const id = shotId(f);
  let b = 0.08;
  switch (id) {
    case "drop": b = 0.04; break;
    case "tie": case "drop2": b = 0.3; break;
    case "crown": b = 0.14; break;
    case "flat": b = 0.5; break;
    case "god": b = 0.15; break;
    case "speaking": b = 0.36; break;
    case "steam": b = 0; break;
    case "droop": b = 0.55; break;
    default: b = 0.08;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on */
export function rossPose12(f: number, body: RossBody): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0.1, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0;
  let breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "drop": angry = 0; lift = 0.7; pupil = 0.8; break;                           // caught by "MANAGER!": the brows up
    case "tie": angry = 0; sad = 0.15; break;                                         // deadpan
    case "drop2": angry = 0; sad = 0.1; lift = 0.3; break;
    case "crown": angry = 0.5; pupil = 0.85; dx += tt >= TWITCH_T ? shake(f, 0.9) : 0; break;   // the eye twitches, the smile is through his teeth
    case "flat": {                                                                    // the flat sigh: he sags, his head dips, the breath is deep
      angry = 0; sad = 0.7; const a = tt - SIGH_T, s = a >= 0 && a < 0.7 ? Math.sin((a / 0.7) * Math.PI) : 0;
      tilt += -2.5 - 2 * s; bob += -9 * s; breath = -7 * s + 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4);
      break;
    }
    case "god": angry = 0; lift = 0.45; break;
    case "speaking": angry = 0; sad = 0; lift = 0.3; break;                           // God's calm
    case "steam": {                                                                   // the kettle: brows down, pupils small, shaking
      const a = clamp01((tt - KETTLE_T) / 0.3);
      angry = 0.35 + 0.65 * a; pupil = 1 - 0.4 * a; lift = 0.1; dx += shake(f, 0.8 + 1.8 * a); break;
    }
    case "droop": { angry = 0; sad = 0.8; tilt += 3 + 2 * haloAt(f).droop; pupil = 0.9; breath *= 0.4; break; }
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  return { body, tilt, bob, breath, mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx: 0, mdy: 0 };
}

// ═════════════════════════════════════════════════════ Chuck: no talking bob (his raised hands are in the head's layer: a tilt would tear them from the arm), a small move of the whole figure instead
function chuckGaze(f: number): [number, number] {
  const id = shotId(f), s = shotAt(f);
  switch (id) {
    case "point": return [-0.6, 0.05];                                              // at Ross, on his left of the picture
    case "wantGod": return [0, -0.95 * ease(s.u * 1.3)];                            // up, toward the ceiling, as he winds up
    case "steam": return [-0.75, 0.25];                                             // at Ross's ear and the jet
    case "sip": return [0, 0.25];                                                   // over the rim
    default: return [0, 0];
  }
}
function chuckLid(f: number): number {
  const id = shotId(f);
  switch (id) {
    case "bell": return 0.3;                                                        // calm, heavy lids
    case "snap": return t(f) < SNAP_T ? 0.3 : 0;
    case "point": return 0;                                                         // its own flat lids are painted
    case "steam": return 0.22;
    case "sip": return 0.3;
    case "cantI": return 0.3;                                                       // unimpressed
    case "latte": return 0.08;
    default: return 0;
  }
}
export type ChuckKind = "latte" | "point" | "scream" | "cup" | "hold";
export function chuckPose(kind: ChuckKind, f: number): PuppetPose {
  const tt = t(f), b = blinkOf("chuck", f), l0 = chuckLid(f), lid = Math.max(l0, l0 + (1 - l0) * b);
  const loud = shotId(f) === "snap" || shotId(f) === "manager" || shotId(f) === "owner" || shotId(f) === "wantGod" || shotId(f) === "scream" || shotId(f) === "point";
  const dx = loud && speaking("CHUCK", f) ? shake(f, 1.6) : 0;
  const m = mouthAt("CHUCK", f);
  const mouth = kind === "scream" ? (m === "wide" ? "wide" : "mid") : m;   // the screaming head's mouth is never shut
  return { tilt: 0, bob: 0, breath: 1.2 * Math.sin((Math.PI * 2 * tt) / 3.2 + 0.4), mouth, mood: moodAt("CHUCK", f), lid, angry: 0, sad: 0, lift: 0, asym: 0, pupil: 1, gaze: chuckGaze(f), dx, hdx: 0, mdy: 0 };
}
/** the whole figure's little hop on the voice: px of the figure's own scale, from the head's dip of the voice */
export const hop = (f: number): number => -talkMove("CHUCK", f).bob * 1.4;
/** the lunge of the finger and the figure on a stressed word (SAME, GUY, OWNER): px toward the pointed side, decaying */
export const lunge = (f: number): number => TWANGS.reduce((a, t0) => a + (t(f) >= t0 ? 22 * Math.exp(-(t(f) - t0) / 0.07) : 0), 0);
export { clamp01, ease };
