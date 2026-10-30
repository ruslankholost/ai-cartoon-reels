// Each shot's framing of x19 "Screen Time" as a plate (or the picture it is made of), a scale and a middle point, in plain data so that scripts/x19-check.mts can read it without React: it compares one shot with the next, so that the same framing never
// comes twice in a row (a framing is the same when the plate is the same and the scale is within 20 % and the middle point within 250 frame px). The numbers are the ones src/x19-scenes-a.tsx and src/x19-scenes.tsx cut their views with (the seating plate's
// are seatView of the person's scale and place: the plate's scale is the scale over 0.51; Ross's counter plate's is VIEW_S of his scale: E * 195 / 80, its middle row is the counter's top edge's plate row 795 less (the counter's frame row - 960) / s).
import type { ShotId } from "./x19-sched.ts";
/** each shot's framing as a plate, a scale and a middle point (plate px, or frame px for the art that is not on a plate): scripts/x19-check.mts compares one shot with the next, so that the same framing never comes twice in a row */
export const VIEWS: Record<ShotId, { plate: string; s: number; at: [number, number] }> = {
  tablet: { plate: "tablet-jar", s: 1.43, at: [384, 672] }, hurricane: { plate: "counter-ross-wind", s: 2.44, at: [384, 537] }, toddler: { plate: "seating-toddler", s: 2.55, at: [415, 670] }, rossWind: { plate: "counter-ross", s: 2.44, at: [384, 775] },
  momEat: { plate: "seating-mom", s: 2.2, at: [415, 693] }, muffin: { plate: "muffin-plate", s: 2.0, at: [384, 760] }, momBrow: { plate: "seating-mom", s: 2.94, at: [415, 661] }, rossNo: { plate: "counter-ross-rack", s: 2.8, at: [384, 727] },
  momSmug: { plate: "seating-mirror", s: 2.45, at: [390, 647] }, tik: { plate: "tablet-key", s: 1.43, at: [384, 672] }, lip: { plate: "seating-toddler-lip", s: 2.94, at: [415, 651] }, momSnap: { plate: "seating-panic", s: 2.65, at: [415, 652] },
  bars: { plate: "tablet-bars", s: 1.43, at: [384, 672] }, phones: { plate: "counter-ross-phones", s: 2.07, at: [384, 636] }, momHates: { plate: "seating-shock", s: 2.94, at: [415, 676] }, canopy: { plate: "seating-stroller", s: 2.35, at: [384, 700] },
  windows: { plate: "wide-window", s: 1.43, at: [384, 672] }, turn: { plate: "wide-customers", s: 2.1, at: [560, 780] }, switch: { plate: "wall-switch", s: 2.4, at: [384, 980] }, usher: { plate: "counter-ross-usher", s: 2.24, at: [384, 576] },
  cash: { plate: "wide-cash", s: 1.7, at: [470, 740] }, munch: { plate: "seating-toddler-popcorn", s: 2.55, at: [415, 670] }, proud: { plate: "seating-proud", s: 2.65, at: [415, 652] }, battery: { plate: "tv-screen", s: 1.43, at: [384, 672] },
  silent: { plate: "wide-silent", s: 1.6, at: [384, 700] }, lip2: { plate: "seating-toddler-lip-dark", s: 3.14, at: [415, 642] }, plead: { plate: "seating-plead", s: 2.65, at: [415, 648] }, slide: { plate: "counter-top", s: 3.4, at: [384, 790] },
  six: { plate: "counter-ross-six", s: 2.32, at: [384, 713] }, plug: { plate: "tv-plug", s: 1.0, at: [540, 960] },
};
