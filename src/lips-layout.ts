// Where the things that matter stand in a shot of "Cold Lips", in frame px (x right, y down): the customer's framings over the cafe-back plate, the line behind her, the counter plate's close-ups of Denise and Todd, the
// wide counter plate's two-shots, the phone's insert, the cards. Pure arithmetic, shared by the scenes (src/lips-scenes.tsx draws what this says) and by scripts/lips-check.mts (which holds every frame to it). A plate is
// 768 x 1344; a view is (s, u0, v0): s frame px per plate px, (u0, v0) the plate point at the frame's top left. A puppet is placed by its neck pivot (frame px) and its scale E (frame px per picture px; a close-up
// stays under 2.2: the hair of the heads shows its flecks past that).
import lipsRig from "./lips-rig.json" with { type: "json" };
import lipsFix from "./lips-fix.json" with { type: "json" };
import tipRig from "./tip-rig.json" with { type: "json" };
import type { ShotId } from "./lips-sched.ts";
import type { Layer, Rig } from "./sp-puppet.tsx";

export const W = 1080, H = 1920;
export type PView = { s: number; u0: number; v0: number };
/** the two profile pieces of the kiss (src/lips-rig.json `side`): each a whole-body cut-out in px of its own png (y down); her `seat` is the rearmost point of her coat, his `lips` the tip of his pucker, her `purse` where the dog goes */
type SideRig = { customer: { file: string; w: number; h: number; feet: number; seat: [number, number]; purse: { x: number; y: number; w: number; inner: number[] } }; todd: { file: string; w: number; h: number; feet: number; lips: [number, number] } };
const LR = lipsRig as unknown as { customer: { pivot: [number, number]; disc: [number, number, number]; layers: { head: { x: number; y: number; w: number; h: number } }; bodies: Record<string, { x: number; y: number; w: number; h: number }>; purse: Record<string, { x: number; y: number; w: number; inner: number[] }> }; todd: { pivot: [number, number]; disc: [number, number, number]; mouth: { cx: number; cy: number; w: number }; mouthW: number; layers: { head: { x: number; y: number; w: number; h: number } }; bodies: Record<string, { x: number; y: number; w: number; h: number }>; badge: Record<string, number[]>; dryer: { tip: [number, number]; box: number[]; waist: number } }; props: { dog: { files: Record<string, string>; w: number; h: number; anchor: [number, number]; paws: [number, number] }; stripBack: { file: string; y0: number } }; scenes: { cafeBack: { frame: number[]; door: number[]; window: number[]; floor: number; counterTop: number; lip: number; file: string } } } & { side: SideRig };
const TR = tipRig as unknown as { deniseHood: { pivot: [number, number]; disc: [number, number, number]; tags: Record<string, { x: number; top: number; w: number }> }; lineA: Rg; lineB: Rg; lineC: Rg; lineD: Rg; props: { counterCafe: { x0: number; y0: number; w: number; h: number } }; scenes: { cafe: { counterTop: number; lip: number; front: number; floor: number; chalk: number[] }; cafeWide: { counter: number[]; frame: number[]; door: number[]; chalk: number[] } } };
type Rg = { pivot: [number, number]; disc: [number, number, number]; layers: { head: { x: number; y: number; w: number; h: number }; body: { x: number; y: number; w: number; h: number } } };
export const CUSTOMER = LR.customer, TODD = LR.todd, DOG = LR.props.dog, BACK = { ...LR.scenes.cafeBack, y0: LR.props.stripBack.y0, strip: LR.props.stripBack.file };
/** the repaired pictures (scripts/lips-fix-art.py writes them and src/lips-fix.json): her collar in the phone and rat poses (the prep's cut left a channel, a slot and a sliver beside her neck), Denise's hood (two holes beside the V of her neck), Todd's body in the dryer pose
 * (without the prep's fill under the head) and his hair dryer, whole, to be drawn over his head, her hand with the phone */
export const FIX = lipsFix as unknown as { customer: { bodies: { stand: Layer; phone: Layer; rat: Layer } }; todd: { bodies: { dryer: Layer }; dryer: Layer & { endX: number; endY: number; endH: number; hdx: number; gap: number } }; denise: { bodies: { apron: Layer } }; hand: { phone: string; fingers: string } };
/** the rigs of the two puppets of this episode with the repaired pictures swapped in (src/sp-puppet.tsx Puppet `rig`) */
const RC = lipsRig.customer as unknown as Rig, RT = lipsRig.todd as unknown as Rig, RD = tipRig.deniseHood as unknown as Rig;
export const RIG_FIXED = { customer: { ...RC, bodies: { ...RC.bodies, ...FIX.customer.bodies } } as Rig, todd: { ...RT, bodies: { ...RT.bodies, ...FIX.todd.bodies } } as Rig, deniseHood: { ...RD, bodies: { ...RD.bodies, ...FIX.denise.bodies } } as Rig };
export const SIDE_RIG = LR.side;
export const CAFE = TR.scenes.cafe, WIDE = TR.scenes.cafeWide, COUNTER_WIDE = TR.props.counterCafe, DENISE = TR.deniseHood;
/** how far a puppet's head middle is above its neck pivot, and the head's radius, in puppet px */
export const UP = { customer: LR.customer.pivot[1] - LR.customer.disc[1], todd: LR.todd.pivot[1] - LR.todd.disc[1], deniseHood: TR.deniseHood.pivot[1] - TR.deniseHood.disc[1] };
export const RAD = { customer: LR.customer.disc[2], todd: LR.todd.disc[2], deniseHood: TR.deniseHood.disc[2] };
/** the line behind her: the head rigs of "Tip?" (their pivots, the discs of their heads and how far their pictures go below the neck) */
export const LINE_RIG = { lineA: TR.lineA, lineB: TR.lineB, lineC: TR.lineC, lineD: TR.lineD };
export const BELOW_LINE = { lineA: 413, lineB: 617, lineC: 484, lineD: 687 } as const; // puppet px from the neck pivot to the feet (measured on the cut-outs, src/tip-scenes.tsx BELOW)

// ── her shots (the cafe-back plate): the view, the neck pivot of her puppet in the frame and her scale. s is 2.0 at most (the plate is a soft backdrop). `dog`: whether the dog shows (in the close-ups it is under the counter)
export type CusFr = PView & { neck: [number, number]; E: number; dog: boolean };
export const CUS: Partial<Record<ShotId, CusFr>> = {
  hook: { s: 2, u0: 228, v0: 359, neck: [680, 765], E: 1.4, dog: true },
  review: { s: 2, u0: 228, v0: 359, neck: [600, 765], E: 1.4, dog: true },
  free: { s: 2, u0: 228, v0: 384, neck: [560, 924], E: 1.8, dog: false }, // (the close-ups sit 14 px low: the loop of the purse strap, over her hand, would show over the counter's edge)
  liked: { s: 2, u0: 228, v0: 384, neck: [540, 886], E: 2.0, dog: false },
  ugh: { s: 2, u0: 228, v0: 359, neck: [600, 765], E: 1.4, dog: true },
  anythingQ: { s: 2, u0: 228, v0: 384, neck: [540, 886], E: 2.0, dog: false },
  kissAss: { s: 2, u0: 228, v0: 384, neck: [540, 912], E: 2.15, dog: false },
  coldLips: { s: 2, u0: 228, v0: 384, neck: [540, 906], E: 1.9, dog: false },
  usual: { s: 2, u0: 228, v0: 359, neck: [680, 765], E: 1.4, dog: true },
};
/** the line: feet (u, v) on the plate, and the puppet's scale in plate px per puppet px (so a view's s gives its frame scale); the farthest first */
export const LINEUP: { c: "lineA" | "lineB" | "lineC" | "lineD"; u: number; v: number; k: number }[] = [
  { c: "lineD", u: 445, v: 872, k: 0.22 }, { c: "lineC", u: 400, v: 888, k: 0.25 }, { c: "lineB", u: 355, v: 905, k: 0.28 }, { c: "lineA", u: 315, v: 925, k: 0.3 },
];
/** the front wide of the kiss (shot 13a): her whole body, the plate's floor strip under her feet, the counter's strip in front; Todd behind her (his feet on the same strip, one row farther) falls to his knees at her side. His scale is the one of the side view (13b) */
export const KNEEL = { s: 2, u0: 228, v0: 330, neck: [500, 478] as [number, number], E: 1.05, tE: 0.75, tStand: [790, 842] as [number, number], tPeekX: 800, tKissX: 690, seatY: 1010 };
/** the side view of the kiss (shot 13b): her in profile at the left, facing left; Todd on his knees behind her (the right), facing left, his lips on her seat; both on one floor. Her scale is a hair over the front wide's (the pair has to fit the frame
 * with margin), his is the one that puts his lips on her seat with both on the same floor: it comes out the scale of 13a, so his head is the same size across the cut. `gap0`: how far his lips are from her seat at the cut (frame px), he creeps in
 * to the smooch. The plate is the same, shifted so that her feet are on the floor with the counter's strip under them. */
export const SIDE = (() => {
  const c = LR.side.customer, t = LR.side.todd;
  const s = 2, u0 = 228, v0 = 300, E = 1.05, floorY = 1400, gap0 = 44;
  const tE = ((c.feet - c.seat[1]) * E) / (t.feet - t.lips[1]);
  const width = c.seat[0] * E + (t.w - t.lips[0]) * tE;
  const herLeft = Math.round((W - width - gap0) / 2); // centred as he is at the cut, the widest the pair gets
  return { s, u0, v0, E, tE, floorY, herLeft, seatX: herLeft + c.seat[0] * E, seatY: floorY - (c.feet - c.seat[1]) * E, width, gap0 };
})();
/** the door's shot: the cafe-back plate at the doorway, the glass door, her on the sidewalk at the threshold */
export const MORNING = { s: 2, u0: 119, v0: 250, neck: [540, 708] as [number, number], E: 0.78 };

// ── Denise's and Todd's close-ups (the counter plate of "Tip?", tip-bg-cafe + tip-fg-cafe, looking at the back wall): the view, the neck pivot, the scale
export type PuFr = PView & { neck: [number, number]; E: number };
export const DEN_FR: Partial<Record<ShotId, PuFr>> = {
  denCoffee: { s: 2, u0: 90, v0: 110, neck: [540, 901], E: 1.1 }, // 1.1 against her 1.4 in shot 1: her head is 0.79 of Denise's at one scale, so her scale is 1.27 times Denise's for the two heads to match across the cut
  denTurn: { s: 2, u0: 90, v0: 110, neck: [560, 901], E: 1.1 },
};
export const TODD_FR: Partial<Record<ShotId, PuFr>> = {
  anything: { s: 2, u0: 90, v0: 300, neck: [560, 1050], E: 1.3 }, // in front of the counter: the floor under his feet
  dryer: { s: 2, u0: 70, v0: 40, neck: [600, 1090], E: 1.3 }, // behind the counter: his waist is under the strip
};
// ── the wide counter plate (tip-bg-cafeWide + tip-fg-cafe-counter): Denise behind the counter on the left, Todd in front of it on the right. The same view and places for the vault, the two-shot and the open arms
export const WV: PView = { s: 1.95, u0: 40, v0: 172 };
export const WIDE_FR = { den: { neck: [340, 905] as [number, number], E: 0.8 }, todd: { neck: [675, 1120] as [number, number], E: 1.0 }, counterTop: (WIDE.counter[1] - WV.v0) * WV.s };
/** the vault: from behind the counter (crouched, squashed to `crouch` of his height so that the counter's strip, x -62..755 and y 1168..1554 in the frame, covers him: his feet at `feet0`) over it to the floor in front: where his feet start and land (frame px), his scales, the apex lift of his feet */
export const VAULT = { x0: 470, feet0: 1540, E0: 0.75, x1: WIDE_FR.todd.neck[0], feet1: WIDE_FR.todd.neck[1] + 550 * WIDE_FR.todd.E, E1: WIDE_FR.todd.E, apex: 560, crouch: 0.45 };
// ── the phone's insert (shot 16): her hand with the phone from below, the hand's picture (public/sp/lips-handphone.png, 401 x 1067 px: src/pen-stage.tsx HAND_PHONE says where the glass is in it) at k frame px per picture px with its
// middle at frame (hx, hy); the review's design is 300 x 715 units, drawn on the glass
export const HAND_FR = { k: 2.6, hx: 540, hy: 1553 };
export const PHONE = { w: 300, h: 715 } as const;
/** where the glass is in the hand's picture (a copy of src/pen-stage.tsx HAND_PHONE, which lips-check.mts holds it to) and a point (ux, uy) of the review's 300 x 715 design as a frame point */
export const HAND_GLASS = { w: 401, h: 1067, cx: 181.5, cy: 213.1, rot: 5.87, sw: 182, sh: 389, top: 24 };
export function handPoint(ux: number, uy: number): [number, number] {
  const P = HAND_GLASS, a = (P.rot * Math.PI) / 180, dx = ((ux - PHONE.w / 2) * P.sw) / PHONE.w, dy = -P.sh / 2 + P.top + (uy * (P.sh - P.top)) / PHONE.h;
  return [HAND_FR.hx + (P.cx + dx * Math.cos(a) - dy * Math.sin(a) - P.w / 2) * HAND_FR.k, HAND_FR.hy + (P.cy + dx * Math.sin(a) + dy * Math.cos(a) - P.h / 2) * HAND_FR.k];
}
/** in "You're fired!" (shot 6) he stands this many frame px nearer the counter than he does in the other two-shots (his feet higher on the floor): his pointing picture's badge would sit in the captions' band (y 1295-1455) at the place of the open arms */
export const FIRED_LIFT = 84;
/** the review's design: the typed text box, the stars' row, the Post button, in design units of the 300 x 715 screen (src/lips-ui.tsx drawReview draws them there) */
export const REVIEW_UI = { stars: { y0: 173, y1: 219, x0: 23, x1: 281 }, text: { x0: 18, y0: 292, x1: 282, y1: 542 }, post: { x0: 18, y0: 600, x1: 282, y1: 662 }, font: 30 };
// ── the words that sit over the picture (DOM, src/lips-ui.tsx): the captions' band is src/lips-sched.ts CAP_BAND; the share line over the last shot, the card of the next morning and the cover's title are boxes of text
// (left, width, top, height in frame px, the font size): everything stays out of Instagram's bottom 400 px (y > 1520) and right 130 px (x > 950)
export const SHARE_LINES = ["Send this to someone", "who's served her."];
export const SHARE_BOX = { left: 30, width: 920, top: 330, height: 160, size: 68, lineHeight: 1.18 };
export const CARD_LINES = ["NEXT MORNING,", "6:00 AM"];
export const CARD_BOX = { left: 30, width: 920, top: 95, height: 250, size: 88, lineHeight: 1.12 };
export const COVER_TITLE = "“This is hot.”";
export const COVER_BOX = { left: 30, width: 920, top: 262, height: 170, size: 112 };
