// The acting of x16 "Hiring a Zoomer" that the scenes need on top of the timeline (src/x16-sched.ts): Ross's, Kenzie's and Mom's faces and heads as functions of the frame (mouth and mood come from the voices there), where each of them looks, how
// heavy the lids are, the little moves on the hits. Pure arithmetic: nothing reads a clock or a random source.
import type { PuppetPose } from "./sp-puppet";
import { fitEyes } from "./x09-act";
import type { MomScreen } from "./x16-props";
import { VIEWERS } from "./x16-props";
import { CUTS, FPS, GLASSES_T, blinkOf, bulgeAt, ease, inShot, mouthAt, moodAt, shotId, squintAt, talkMove, twos } from "./x16-sched";

export const HEAD_LEVEL = 4.9; // degrees: Ross's master head (x08's) is painted tilted this much; +4.9 levels it
const t = (f: number) => f / FPS;
const shake = (f: number, a: number) => (Math.floor(twos(f) / 2) % 2 ? 1 : -1) * a;

// ═════════════════════════════════════════════════════ Ross
export function rossGaze(f: number): [number, number] {
  return inShot(f, "thumb") ? [0.1, 0.05] : [0, 0.05];
}
/** how far his lids are down: the squint against the ring light (shots 1 and 4), a heavy dead stare when he is flat (11, 15), wide open the rest of the time; a blink in the shots where he blinks */
export function rossLid(f: number): number {
  const id = shotId(f);
  let b = 0;
  switch (id) {
    case "table": case "live": case "family": b = 0.5 * squintAt(f); break;   // squinting into the light
    case "shop": case "twitch": b = 0.18; break;                         // dead flat: the lids a little heavy
    default: b = 0;                                                      // frozen and furious: the eyes wide
  }
  const k = blinkOf("ross", f);
  return Math.max(b, b + (1 - b) * k);
}
/** Ross's pose of this frame: the head's tilt and dip (his voice, the hits), the face (the mood of his voice, the brows, the lids, where he looks); `body` is the picture's name, passed on */
export function rossPose16(f: number, body: string): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("ROSS", f), sq = squintAt(f);
  let tilt = HEAD_LEVEL + m.tilt, bob = m.bob, angry = 0, sad = 0, lift = 0, asym = 0, pupil = 1, dx = 0;
  let breath = 1.4 * Math.sin((Math.PI * 2 * tt) / 3.4 + 0.7);
  switch (id) {
    case "table": case "live": case "family": lift = 0.55 - 0.3 * sq; pupil = 1 - 0.55 * sq; break;                        // the boss smile, the pupils shrunk by the light
    case "stab": case "wide": lift = 0.3; break;
    case "freeze": angry = 0; lift = 0.45; breath = 0; bob = 0; tilt = HEAD_LEVEL; break;                                 // the smile freezes: nothing on him moves
    case "shop": angry = 0.35; pupil = 0.8; dx += shake(f, 0.5); break;                                                    // dead flat, the eye starts to twitch
    case "twitch": angry = 0.55; pupil = 0.7; dx += shake(f, 0.9); break;
    case "thumb": angry = 1; pupil = 0.55; dx += shake(f, 1.8); break;                                                     // the vein, the shout
    case "arm": angry = 0.9; pupil = 0.55; dx += shake(f, 1.4); break;                                                     // the vein, the arm coming for him
    case "slam": angry = 0.8; pupil = 0.55; dx += shake(f, 1.6); break;                                                    // the pole on his head, the bulging eyes
    case "purple": angry = 1; pupil = 0.5; dx += shake(f, 2.6); break;
    case "storm": angry = 1; pupil = 0.5; dx += shake(f, 2.4); break;
    case "hired": angry = 0.9; pupil = 0.5; dx += shake(f, 1.6); break;                                                    // through his teeth, steaming
    default: break;
  }
  const lid0 = rossLid(f), gaze0 = rossGaze(f), shut = lid0 >= 0.9;
  const e = shut || bulgeAt(f) > 0.02 ? { lid: lid0, gaze: gaze0 } : fitEyes("ross", lid0, gaze0, pupil);
  let mouth = mouthAt("ROSS", f);
  if (id === "freeze" || id === "table" || id === "live" || id === "arm") mouth = "closed";                                                               // the smile stays shut (the voice lines are the other shots)
  if (id === "purple" || id === "storm") mouth = "closed";                                                               // clenched, the steam does the shouting
  return { body, tilt, bob, breath, mouth, mood: moodAt("ROSS", f), lid: e.lid, angry, sad, lift, asym, pupil, gaze: e.gaze, dx, hdx: 0, mdy: 0 };
}
/** the width of his drawn mouth (rig px): the boss smile (100), a clenched grin of hissing teeth in the last shots */
export function rossMouthW(f: number): number {
  switch (shotId(f)) {
    case "table": case "family": case "stab": case "wide": case "freeze": return 118;   // the big fake smile
    case "purple": case "storm": case "hired": return 120;
    default: return 100;
  }
}

// ═════════════════════════════════════════════════════ Kenzie: bored. Half-closed lids as painted, a slow blink, a flat mouth that moves very little, one eyebrow up for "Unpaid?"
export type KenzieKind = "ring" | "sip";
export function kenziePose(kind: KenzieKind, f: number): PuppetPose {
  const tt = t(f), id = shotId(f), m = talkMove("KENZIE", f);
  let angry = 0.2, sad = 0, lift = 0, asym = 0;
  switch (id) {
    case "unpaid": asym = 1; lift = 0.55; angry = 0; break;                                  // one eyebrow up
    case "flag": case "last": angry = 0.3; break;                                            // deadpan
    case "start": lift = 0.25; angry = 0; break;                                             // unbothered, a little hopeful
    default: break;
  }
  const lid = blinkOf("kenzie", f);
  // (the sip picture keeps its painted lips and its rig has mouthW 0, so its code mouth is always the closed line: an open mouth of width 0 is NaN geometry)
  const mouth = kind === "sip" ? "closed" : mouthAt("KENZIE", f);
  return { tilt: m.tilt, bob: m.bob, breath: 1.1 * Math.sin((Math.PI * 2 * tt) / 3.6 + 0.4), mouth, mood: moodAt("KENZIE", f), lid, angry, sad, lift, asym, pupil: 1, gaze: [0, 0], dx: 0, hdx: 0, mdy: 0 };
}

// ═════════════════════════════════════════════════════ Mom: a picture on a phone's screen, not a puppet: her glass shows the picture with the sunglasses on until GLASSES_T (shot 16) and lowered after it, a talking mouth over her smirk, a small bob on every loud syllable
const MOM_T = CUTS.mom;
/** the banner "MOM joined": slides in from above on the cut of shot 14, stays for about a second, slides out (0 .. 1 how far it is in) */
export function bannerP(f: number): number {
  const a = f / FPS - MOM_T;
  return a < 0 ? 0 : a < 0.15 ? ease(a / 0.15) : a < 1.15 ? 1 : a < 1.3 ? 1 - ease((a - 1.15) / 0.15) : 0;
}
export function momScreen(f: number): MomScreen {
  const m = talkMove("MOM", f), lowered = f / FPS >= GLASSES_T;   // (the sunglasses go down on "Or customers." and stay down for the rest of the reel)
  return { pic: lowered ? 1 : 0, bob: m.bob * 3 + 1.2 * Math.sin((Math.PI * 2 * t(f)) / 3.2), mouth: mouthAt("MOM", f), banner: bannerP(f), viewers: VIEWERS };
}
