// Each shot's framing of x18 "Unattended" as a plate (or the picture it is made of), a scale and a middle point, in plain data so that scripts/x18-check.mts can read it without React: it compares one shot with the next, so that the same
// framing never comes twice in a row (a framing is the same when the plate is the same and the scale is within 20 % and the middle point within 250 frame px). The numbers are the ones src/x18-scenes-a.tsx and src/x18-scenes.tsx cut their views with
// (the seating plate's are seatView of the mom's scale and place: the plate's scale is her scale over 0.51).
import type { ShotId } from "./x18-sched.ts";
/** each shot's framing as a plate, a scale and a middle point (plate px, or frame px for the art that is not on a plate): scripts/x18-check.mts compares one shot with the next, so that the same framing never comes twice in a row */
export const VIEWS: Record<ShotId, { plate: string; s: number; at: [number, number] }> = {
  till: { plate: "till", s: 1.43, at: [384, 672] }, pour: { plate: "counter", s: 2.2, at: [250, 737] }, mom1: { plate: "seating", s: 2.2, at: [415, 693] }, grin: { plate: "counter", s: 3.0, at: [470, 560] }, ross1: { plate: "counter-ross", s: 2.44, at: [384, 792] },
  mom2: { plate: "seating", s: 2.94, at: [415, 661] }, flat: { plate: "counter-ross", s: 3.8, at: [384, 700] }, lick: { plate: "case", s: 1.8, at: [384, 700] }, smug: { plate: "seating-mirror", s: 2.45, at: [390, 647] }, tape: { plate: "seating-ross", s: 3.7, at: [415, 623] },
  sign: { plate: "sign", s: 1.43, at: [384, 700] }, glasses: { plate: "seating-glasses", s: 2.55, at: [415, 650] }, darts: { plate: "seating-glasses", s: 3.9, at: [415, 627] }, walk: { plate: "window", s: 1.43, at: [384, 672] }, drop: { plate: "window", s: 2.2, at: [600, 840] },
  wagon: { plate: "window", s: 1.8, at: [540, 900] }, row: { plate: "window-kids", s: 1.43, at: [384, 672] }, finger: { plate: "counter-ross", s: 2.6, at: [420, 750] }, cups: { plate: "counter-top", s: 3.4, at: [384, 835] }, zap: { plate: "window-kids", s: 1.43, at: [384, 672] },
  flip: { plate: "sign-hand", s: 1.6, at: [384, 800] }, blur: { plate: "kids-work", s: 1.5, at: [384, 672] }, feet: { plate: "kids-work", s: 2.2, at: [420, 663] }, clock: { plate: "clock", s: 5.0, at: [587, 197] }, slam: { plate: "counter-toddler", s: 2.2, at: [384, 702] },
  shock: { plate: "seating-shock", s: 2.94, at: [415, 676] }, wipe: { plate: "counter-ross-wide", s: 2.44, at: [330, 790] },
};
