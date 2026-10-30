// Where the things that matter stand in a shot of "I'm Just Supporting a Friend", in frame px (x right, y down): Denise's and Rhonda's framings in the garage, the bowl on her lap (it has to read, above the captions'
// band), the dive's end, the phone's screen and the text on it, and the cards. Pure arithmetic, shared by the scenes (src/tup-scenes.tsx and src/tup-story.tsx draw what this says) and by scripts/tup-check.mts (which
// holds every frame to it). The views are the garage's plate at the scale and the corner each shot shows (a plate is 768 x 1344; s frame px per plate px, (u0, v0) the plate point at the frame's top left).
import rig from "./pen-rig.json" with { type: "json" };
import props from "./tup-props.json" with { type: "json" };
import type { ShotId } from "./tup-sched.ts";

export const W = 1080, H = 1920;
export type Fr = { head: [number, number]; E: number; s: number; u0: number; v0: number }; // the head's middle in the frame, the puppet's scale, the plate's view
const R = rig as unknown as Record<string, { pivot: [number, number]; disc: [number, number, number] }>;
export const UP = { denisePen: R.denisePen.pivot[1] - R.denisePen.disc[1], rhondaPen: R.rhondaPen.pivot[1] - R.rhondaPen.disc[1] }; // puppet px from the neck pivot up to the head's middle

// ── Denise's framings in the garage: the bowl is on her lap, 300 puppet px wide, its foot 300 puppet px below her neck. Every close-up keeps the bowl above the captions' band (y 1295-1455)
export const DEN: Partial<Record<ShotId, Fr>> = {
  denSupport: { head: [470, 640], E: 1.1, s: 1.5, u0: 0, v0: 40 }, denParty: { head: [470, 620], E: 1.2, s: 1.55, u0: 0, v0: 50 }, dive: { head: [470, 640], E: 1.1, s: 1.5, u0: 0, v0: 40 },
  denChew: { head: [440, 660], E: 1.0, s: 1.5, u0: 0, v0: 30 }, denLooks: { head: [470, 640], E: 1.1, s: 1.5, u0: 0, v0: 40 }, denPhone: { head: [480, 590], E: 1.4, s: 1.7, u0: 0, v0: 150 },
  denStamp: { head: [470, 660], E: 1.0, s: 1.5, u0: 0, v0: 40 }, denMarketing: { head: [440, 640], E: 1.2, s: 1.6, u0: 0, v0: 60 },
};
export const RHO: Partial<Record<ShotId, Fr>> = {
  rhoBrow: { head: [600, 700], E: 1.5, s: 1.6, u0: 90, v0: 60 }, rhoStore: { head: [600, 700], E: 1.3, s: 1.5, u0: 48, v0: 40 }, rhoLook: { head: [620, 720], E: 1.45, s: 1.55, u0: 60, v0: 50 },
  rhoGroup: { head: [600, 700], E: 1.3, s: 1.5, u0: 48, v0: 40 }, rhoSurvey: { head: [590, 680], E: 1.2, s: 1.5, u0: 48, v0: 30 },
};
export const END = { E: 0.82, den: [268, 960] as [number, number], rho: [733, 960] as [number, number], s: 1.5, u0: 20, v0: 60 }; // the last wide (Rhonda's afro, 685 puppet px wide at 0.82, ends 55 px from the right edge with its curls; Denise's chair 50 px from the left)
export const BOWL_PW = 300, BOWL_FOOT = 300; // puppet px
/** the shelf empties (shot 18): the store's wide view, where the clerk stands in it (the plate's x of his neck, his scale, the puppet px of him the counter hides) and how far below his neck the foot of the stack he carries is (puppet px): inside the opening of the bowl in his hands, under his chin */
export const EMPTY = { s: 1.4286, u0: 6, v0: 0, clerk: { u: 384, sc: 0.5, cut: 396 }, carryFoot: 128 };
/** the living room's table and sofa (plate px) for the order forms: the three places where the forms of shot 22 stop (they stay there in the guests' close-ups and under the pile of shot 27), the table's row, the sofa's front row and
 * what its front hides of a guest (puppet px), and the pile's view and scale of the guests; `fall` is how far above its place a form starts to fall in shot 27 (frame px): under the guests' chins (QA: a form crossed a guest's eyes) */
export const LIVING = { table: { u: 394, v: 790 }, rest: [262, 394, 526], sofaFront: 693, guestCut: 300, pile: { s: 1.7, u0: 80, v0: 214.5, gsc: 0.34, fall: 150 } };
/** the living room's wide (shot 14): the view, the guests' scale, and where the hostess stands in it (her neck pivot's u on the plate, her scale, her feet's row). She stands in the foreground at the right: inside the frame
 * with a margin (QA: at the sofa's right end her hair, shoulder and arm were cut by the edge) and with her head under the guests' chins, so all three gasping faces show (she hid the third one's) */
export const GASP = { s: 1.4286, u0: 6, v0: 0, gsc: 0.3, hostess: { u: 630, sc: 0.5, feet: 1230 } };
/** the bowl on Denise's lap in the frame: its middle, its width, and the top of its heap of chips (the bowl's picture is 975 x 589, the heap rises about 110 bowl px above its rim) */
export function lapBowl(fr: Fr) {
  const neck = fr.head[1] + UP.denisePen * fr.E, foot = neck + BOWL_FOOT * fr.E, w = BOWL_PW * fr.E, k = w / props.props.bowl.w;
  return { x: fr.head[0] - 6 * fr.E, w, foot, top: foot - (props.props.bowl.pivot[1] + 110) * k, k };
}
/** the dive ends with the bowl this wide (frame px): its zoom is whatever makes the bowl on her lap that wide, and the store's first frame has the same bowl at the same width */
export const DIVE_END_W = 1155;
export const DIVE_Z = DIVE_END_W / (BOWL_PW * DEN.dive!.E);

// ── the phone in her hand (the hook and the buzz): the hand's picture (public/sp/tip-handPhone.png, 401 x 1067) at scale k centred at (hx, hy), the screen on it turned by 5.87 degrees; a point of the 300 x 715
// screen design as a frame point (the same arithmetic as src/pen-stage.tsx handScreen)
export const HANDPH = { hx: 590, hy: 2066, k: 3.7, w: 401, h: 1067, cx: 181.5, cy: 213.1, rot: 5.87, sw: 182, sh: 389, top: 24 };
export function screenAt(ux: number, uy: number, wig = 0): [number, number] {
  const P = HANDPH, a = (P.rot * Math.PI) / 180, dx = ((ux - 150) * P.sw) / 300, dy = -P.sh / 2 + P.top + (uy * (P.sh - P.top)) / 715;
  return [P.hx + wig + (P.cx + dx * Math.cos(a) - dy * Math.sin(a) - P.w / 2) * P.k, P.hy + (P.cy + dx * Math.sin(a) + dy * Math.cos(a) - P.h / 2) * P.k];
}
/** the frame rect (x0, y0, x1, y1) that a screen-design rect covers */
export function screenRect(x: number, y: number, w: number, h: number): [number, number, number, number] {
  const pts = [screenAt(x, y), screenAt(x + w, y), screenAt(x, y + h), screenAt(x + w, y + h)];
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}
/** the size of the chat's text in design units; on the hand's screen (the picture at 3.7, the screen 182 of its px wide for 300 design units) that is about 60 frame px, the size of the captions: the invite reads at a glance at phone size (QA: it was 33 px, 12 px on a 390 px phone) */
export const INVITE_FONT = 27;
export const textPx = (design: number) => (design * HANDPH.k * HANDPH.sw) / 300;
export const INVITE_RECT = screenRect(44, 110, 210, 198); // the invite's bubble (design units: left 44, bottom 308, five lines, the widest 200 wide)
export const BRING_RECT = screenRect(44, 384, 210, 126); // the new text of the later screen (three lines)
// ── the gift on the hostess: the brown box of her `box` pose (puppet px from her neck pivot: x0, y0, x1, y1; measured on public/sp/pen-hostess-body-box.png) and the picture of the gift box laid over it (scale in puppet
// px per gift px, its foot's place, the gift's body below its bow: 553 x 420 gift px)
export const BROWN_BOX = [-106, 180, 104, 360] as const;
export const GIFT_ON = { k: 0.45, at: [-1, 363] as [number, number], bodyW: 553, bodyH: 420 };
// ── the cards (frame px, the middle and the size): the card DETROIT, 1949 over the store, the door's card (hinged at the top of its rect, on the hall plate's door seen at 2.4: plate (381.5, 583) -> frame), the stamp
// and its source line, the 1958 page
/** shot 8, the store's first view: the view, the scale of the store's pictures (k) and how much of the clerk the counter hides (cut, puppet px) */
export const DUST = { s: 1.9, u0: 136, v0: 106, k: 0.684, cut: 247 };
/** the card DETROIT, 1949 over the store: `k` is its size at rest (design units to frame px); it falls from big with its bottom edge fixed at y + h/2 (it grows upward), so it stays in the clear band above the clerk's head (QA: it sat on his
 * hair and, big, over his glasses) */
export const DETROIT = { x: 540, y: 165, k: 0.72, w: 640 * 0.72, h: 210 * 0.72 };
export const detroitY = (s: number) => DETROIT.y - (DETROIT.h / 2) * (s - 1); // the card's middle when it is s times its size
export const DOOR = { x: (381.5 - 120) * 2.4, hinge: (583 - 330) * 2.4, w: 520 * 1.15, h: 230 * 1.15, textW: 430 * 1.15 }; // textW: the words are 430 of the card's 520 design units wide
export const STAMP_FR = { x: 540, y: 1010, w: 760 * 0.95, h: 330 * 0.95 }, SOURCE_FR = { x: 540, y: 1262, w: 900 * 0.8, h: 70 * 0.8 }; // under her face (her chin is at about 830), the source under the stamp, above the captions' band
export const PAGE = { x: 540, y: 690, s: 1.4, zoom0: 1.02, zoom1: 1.055 }; // the page's bottom edge (690 + 560 = 1250) stays above the captions' band (y 1295) in both shots, whatever the push; shot 30 starts where shot 29's hold ends (zoom 1.02 about (540, 880))
