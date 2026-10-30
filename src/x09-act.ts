// The acting of x09 "Habits of the Rich" that the scenes need on top of the timeline (src/x09-sched.ts): Ross's, Denise's and the guru's faces and heads as functions of the frame (mouth and mood come from the voices there), where
// each of them looks, how heavy the lids are, the little moves on the hits. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { lidEdge } from "./pen-eyes.ts";
import { pupilAt } from "./sp-eyes.ts";
import rig from "./x09-rig.json" with { type: "json" };
import {
  FPS, TICK_T, CORK_T, HEADSET_T, ICE_HIT_T, SLAM_T, VEIN_T, blinkOf, clamp01, ease, hash, mouthAt, moodAt, shotId, talkMove, twos,
} from "./x09-sched";

type EyeJ = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
type PupJ = { eyes: EyeJ[]; pupils: number[][] };
const PUP = (rig as unknown as { puppets: Record<"ross" | "rossHeadset" | "denise", PupJ> }).puppets;
export const HEAD_LEVEL = 4.9; // degrees: Ross's master head is painted tilted this much (src/x08-sched.ts); +4.9 levels it

/** no pupil hides under a lid: the eyes look lower, or the lid opens (src/x08-sched.ts fitEyes, for any of this episode's rigs) */
export function fitEyes(who: "ross" | "rossHeadset" | "denise", lid: number, gaze: [number, number], pupil: number): { lid: number; gaze: [number, number] } {
  const R = PUP[who];
  if (lid <= 0 || lid >= 0.9) return { lid, gaze };
  const clear = (l: number, g: [number, number]) => R.eyes.every((e, i) => { const q = R.pupils[i]; const [x, y] = pupilAt(e, [q[0], q[1]], q[2], g, 6); return y - lidEdge(e as never, l, x) - q[2] * pupil >= 2; });
  for (let l = lid; l > 0; l -= 0.02) for (let gy = gaze[1]; gy <= 1.0001; gy += 0.02) if (clear(l, [gaze[0], gy])) return { lid: l, gaze: [gaze[0], Math.min(1, gy)] };
  return { lid: 0, gaze };
}

const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;

// ═════════════════════════════════════════════════════ Ross
export function rossGaze(f: number): [number, number] {
  const id = shotId(f), tt = t(f);
  switch (id) {
    case "ice": return tt < ICE_HIT_T ? [0.2, -0.15] : [0.1, -0.3];       // at the stage, then at where the cube came from
    case "vein": return [0.05, 0.05];
    case "woo": return [0.1, 0];
    case "corks": return tt < CORK_T[0] ? [0, 0.1] : [0, -0.1];
    case "snatch": return [-0.7, 0.05];                                   // at the board (on his left of the picture)
    case "tax": return [-0.85, 0.35];                                     // at what he writes
    case "board1": return [-0.55, 0.1];
    case "scribble": return [-0.7, 0.2];
    case "slam": return [-0.7, 0.15];
    case "eyes": return tt < TICK_T[0] ? [0.75, 0.25] : tt < TICK_T[1] ? [-0.55, -0.55] : [0.75, 0.3]; // the cash, line eleven, the cash
    case "headset": return tt < HEADSET_T[0] ? [0.3, 0.55] : tt < HEADSET_T[1] ? [0, 0.75] : [0.1, 0.1];
    default: return [0, 0.1];
  }
}
export function rossLid(f: number): number {
  const id = shotId(f);
  let b = 0.1;
  switch (id) {
    case "ice": b = 0.12; break;
    case "vein": b = 0.02; break;
    case "woo": b = 0; break;
    case "corks": b = 0; break;
    case "eyes": b = 0.22; break;
    case "headset": b = 0.3; break;
    default: b = 0.1;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on */
export function rossPose9(f: number, body = "chair"): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0.15, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0;
  const breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "ice": {                                                          // the cube smacks his forehead: the head jerks back, the eye twitches after
      const a = tt - ICE_HIT_T;
      if (a >= 0) { bob += -16 * Math.exp(-a / 0.06); tilt += -5 * Math.exp(-a / 0.09); angry = 0.4; pupil = 0.8; } else angry = 0.2;
      break;
    }
    case "vein": angry = 0.5 + 0.35 * ease((tt - VEIN_T) / 0.2); pupil = 0.85; dx += tt > VEIN_T + 0.2 ? shake(f, 1) : 0; break;
    case "woo": angry = 0.65; pupil = 0.8; break;                          // frozen among the cheering crowd
    case "corks": {
      CORK_T.forEach((ts, i) => { const a = tt - ts; if (a >= 0) { bob += -16 * Math.exp(-a / 0.07); tilt += (i ? -6 : 6) * Math.exp(-a / 0.1); } });
      angry = 0.5 + 0.4 * ease((tt - CORK_T[1]) / 0.2); lift = 0.2; pupil = tt >= CORK_T[0] ? 0.7 : 1; dx += tt > CORK_T[1] ? shake(f, 2) : 0; break;
    }
    case "snatch": angry = 0.7; lift = 0.1; break;
    case "tax": angry = 0.7; break;
    case "board1": angry = 0.55; break;
    case "scribble": angry = 0.85; dx += shake(f, 2.5); break;
    case "slam": { angry = 1; pupil = 0.9; const a = tt - SLAM_T; if (a >= 0) bob += -10 * Math.exp(-a / 0.08); break; }
    case "eyes": angry = 0.2; asym = 0.3; break;
    case "headset": sad = 0.35; angry = 0.02; tilt += -1.5; break;
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  return { body, tilt, bob, breath, mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx: 0, mdy: 0 };
}
/** Ross in the headset (shot 27 from the moment he has put it on): his own head, the same acting */
export function rossHeadsetPose(f: number): PuppetPose {
  const m = talkMove("ROSS", f), tt = t(f), lid0 = Math.max(0.28, 0.28 + 0.72 * blinkOf("ross", f)), g: [number, number] = [0.1, 0.1];
  const e = lid0 >= 0.9 ? { lid: lid0, gaze: g } : fitEyes("rossHeadset", lid0, g, 1);
  return { tilt: m.tilt, bob: m.bob, breath: 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7), mouth: mouthAt("ROSS", f), mood: moodAt("ROSS", f), lid: e.lid, angry: 0, sad: 0.35, lift: 0, asym: 0, pupil: 1, gaze: e.gaze, dx: 0 };
}

// ═════════════════════════════════════════════════════ Denise
export function deniseGaze(f: number): [number, number] {
  const id = shotId(f);
  switch (id) {
    case "denise": return [-0.7, -0.25];               // up at Ross (on her left of the frame)
    case "cash": return [-0.6, -0.1];
    default: return [0.05, 0.85];                      // down at her notebook
  }
}
export function deniseLid(f: number): number {
  const b = shotId(f) === "denise" ? 0 : 0.18;       // writing: the lids half down; looking up: open
  return Math.max(b, b + (1 - b) * blinkOf("denise", f));
}
export function denisePose9(f: number): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("DENISE", f);
  const writing = id !== "denise" && id !== "cash" && id !== "turn";
  const wr = writing ? (twos(f) % 8 < 4 ? 1 : -1) : 0;                      // the pen moves: her head and shoulders jiggle on twos
  const lid0 = deniseLid(f), gaze0 = deniseGaze(f), pupil = 1;
  const e = lid0 >= 0.9 ? { lid: lid0, gaze: gaze0 } : fitEyes("denise", lid0, gaze0, pupil);
  return { tilt: m.tilt + (writing ? 0.6 * wr : 0), bob: m.bob + (writing ? 0.8 * wr : 0), breath: 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.4), mouth: mouthAt("DENISE", f), mood: moodAt("DENISE", f), lid: e.lid, angry: 0, sad: 0, lift: id === "denise" ? 0.2 : 0, asym: 0, pupil, gaze: e.gaze, dx: 0, hdx: 0, mdy: 0 };
}

// ═════════════════════════════════════════════════════ the guru: the head's tilt and dip on every loud syllable (his painted poses cannot move their faces; the sprite moves with his voice)
export function guruMove(f: number): { tilt: number; bob: number; pulse: number } {
  const m = talkMove("GURU", f), l = Math.abs(m.tilt) / 3.4;
  return { tilt: m.tilt, bob: m.bob, pulse: 1 + 0.02 * l };
}
export const jitter = (f: number, i: number, a: number) => (hash(twos(f) * 1.7 + i * 3.1) - 0.5) * 2 * a;
export { clamp01, ease };
