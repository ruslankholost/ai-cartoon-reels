// The acting of x17 "Seat Swap" that the scenes need on top of the timeline (src/x17-sched.ts): Ross's face and head as a function of the frame (mouth and mood come from the voices there), where he looks, how heavy his lids are, the lean to the window,
// and the small moves of the others (the couple's bob, the attendant's lean, the pilot's sigh). Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import { FPS, LAND_T, LEAN_T, blinkOf, ease, inShot, mouthAt, moodAt, shotId, squashAt, talkMove, twos } from "./x17-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;
const F0 = (T: number) => Math.round(T * FPS);

// ═════════════════════════════════════════════════════ Ross
/** how far his head is over at the window (0 upright .. 1 the cheek on the glass): it goes over in shot 1 (frames 10-18) and, the next time we see him (shot 6), comes back off it in the first frames */
export function leanAt(f: number): number {
  if (inShot(f, "drop")) return ease((f - F0(LEAN_T)) / 8);
  if (inShot(f, "sure")) return 1 - ease((f - 156) / 7);
  return 0;
}
/** where he drops in shot 1: his offset (puppet px, up is +) from where he sits: he falls in from above on the first frames and lands on LAND_T with a squash (0 .. 1 how far down the squash is) */
export function dropAt(f: number): { dy: number; sq: number } {
  if (!inShot(f, "drop")) return { dy: 0, sq: 0 };
  const L = F0(LAND_T), a = f - L;
  if (a < 0) { const u = (L - f) / L; return { dy: 520 * u * u, sq: 0 }; }
  return { dy: 0, sq: squashAt(t(f), LAND_T, 0.32, 32) };
}
export function rossGaze(f: number): [number, number] {
  switch (shotId(f)) {
    case "paid": return [-0.35, -0.3];             // at window 12A, up and to the left
    case "wing": return [-0.1, 0.15];
    case "glass": case "hiii": return [0, 0];
    default: return [0, 0.05];
  }
}
/** how far his lids are down: shut in bliss (shot 1), wide open when the couple has asked (6), a squint in the peacock's face (10), a heavy dead stare when he is flat (11, 21, 22), a blink in the cockpit */
export function rossLid(f: number): number {
  const id = shotId(f), L = F0(LEAN_T);
  let b = 0;
  switch (id) {
    case "drop": b = f < L + 2 ? 0 : ease((f - L - 2) / 5); break;
    case "scream": b = 0.45; break;
    case "bird": b = 0.18; break;
    case "glass": case "hiii": b = 0.2; break;
    default: b = 0;
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits, the lean), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on */
export function rossPose17(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f), lean = leanAt(f);
  let tilt = HEAD_LEVEL + m.tilt + 9 * lean, bob = m.bob, angry = 0, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0, hdx = -46 * lean;
  let breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "drop": lift = 0.5 * lean; break;                                                    // blissful
    case "sure": angry = 0.1; lift = 0.4; pupil = 0.9; break;                                // the smile frozen
    case "cram": angry = 0.45; pupil = 0.8; dx += shake(f, 0.6); break;                      // crammed, the eye twitching
    case "scream": angry = 0.7; pupil = 0.55; tilt += 5; hdx = -14; dx += shake(f, 2.4); break;   // the peacock in his face
    case "bird": angry = 0.7; pupil = 0.7; dx += shake(f, 0.6); break;                       // dead flat, the vein
    case "suck": angry = 0.9; pupil = 0.55; dx += shake(f, 1.6); break;
    case "wing": angry = 0.7; pupil = 0.6; dx += shake(f, 2.2); tilt += 3 * Math.sin(twos(f) * 1.7); break;   // clinging, his hair blown back
    case "paid": angry = 1; pupil = 0.55; dx += shake(f, 1.8); tilt += -4; break;            // the shout
    case "purple": angry = 1; pupil = 0.5; dx += shake(f, 2.6); break;
    case "pilot": case "legroom": case "hat": angry = 0.9; pupil = 0.5; dx += shake(f, 1.4); break;   // steaming
    case "glass": case "hiii": angry = 0.35; pupil = 0.8; lift = 0; breath *= 0.6; break;    // dead flat
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  let mouth = mouthAt("ROSS", f);
  if (id === "purple" || id === "scream" || id === "cram" || id === "suck" || id === "pilot" || id === "legroom" || id === "hat") mouth = "closed";   // clenched: the steam and the vein do the shouting
  return { body, tilt, bob, breath, mouth, mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx, mdy: 0 };
}
/** the width of his drawn mouth (rig px): the fake smile (118), a clenched grin of hissing teeth in the last shots */
export function rossMouthW(f: number): number {
  switch (shotId(f)) {
    case "sure": return 118;
    case "purple": case "pilot": case "legroom": case "hat": return 120;
    default: return 100;
  }
}

// ═════════════════════════════════════════════════════ the others: small moves on the voices (src/x17-sched.ts talkMove) and on the hits
/** the couple's bob and tilt (shot 3: both say "Hiii!" at once, 4: the bride speaks, 22: both again): a bounce on every loud syllable, a breath when they hold */
export function coupleMove(f: number): { tilt: number; bob: number } {
  const b = talkMove("BRIDE", f), g = talkMove("GROOM", f);
  return { tilt: (b.tilt + g.tilt) / 2, bob: (b.bob + g.bob) / 2 + 2.2 * Math.sin((Math.PI * 2 * t(f)) / 1.9) };
}
/** the attendant's lean and bob: she leans in to the row at the ding (shot 8) and rocks a little on every word */
export function faMove(f: number): { tilt: number; bob: number } {
  const m = talkMove("FA", f);
  return { tilt: m.tilt, bob: m.bob + 1.5 * Math.sin((Math.PI * 2 * t(f)) / 1.7) };
}
export function pilotMove(f: number): { tilt: number; bob: number } {
  const m = talkMove("PILOT", f);
  return { tilt: m.tilt, bob: m.bob + 2.4 * Math.sin((Math.PI * 2 * t(f)) / 2.6) };
}
