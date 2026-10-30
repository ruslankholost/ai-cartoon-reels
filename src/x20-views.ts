// Each shot's framing of x20 "One Coffee" as a plate (or the picture it is made of), a scale and a middle point, in plain data so that scripts/x20-check.mts can read it without React: it compares one shot with the next, so that the same framing never
// comes twice in a row (a framing is the same when the plate is the same and the scale is within 20 % and the middle point within 250 frame px). The numbers are the ones src/x20-scenes-a.tsx and src/x20-scenes.tsx cut their views with: Ross's counter plate is
// VIEW_S of his scale (E * 195 / 80) with the counter's top edge (plate row 795) on a frame row, the seating plate's scale is the person's scale over 0.51 (src/x20-scenes-a.tsx SeatWall). `at` is the plate point in the middle of the frame.
import type { ShotId } from "./x20-sched.ts";
type View = { plate: string; s: number; at: [number, number] };
/** Ross's counter plate at head scale E with the counter's top edge on frame row yc and plate column u in the middle */
const counter = (plate: string, E: number, yc: number, u = 384): View => { const s = (E * 195) / 80; return { plate, s, at: [u, 795 - (yc - 960) / s] }; };
/** the seating plate for a person at scale k whose anchor is on frame row ay (the window's sill, plate row 775, is 330 k under it) */
const seat = (plate: string, k: number, ay: number): View => { const s = k / 0.51; return { plate, s, at: [415, 775 - (ay + 330 * k - 960) / s] }; };
/** each shot's framing as a plate, a scale and a middle point: scripts/x20-check.mts compares one shot with the next */
export const VIEWS: Record<ShotId, View> = {
  coins: { plate: "counter-top", s: 3.4, at: [384, 790] }, clock: { plate: "counter-clock", s: 2.6, at: [668, 236] }, web: seat("seating-camper", 1.1, 905), rossA: counter("counter-ross", 0.85, 1290), rossB: counter("counter-ross", 1.3, 1370),
  bought: seat("seating-camper-close", 1.25, 690), eight: counter("counter-ross-clock", 1.0, 1180), sip: seat("seating-camper-sip", 1.3, 800), table: counter("counter-ross-lean", 1.2, 1330), who: seat("seating-camper-wave", 1.3, 800),
  empty: { plate: "seating-wide", s: 1.43, at: [384, 880] }, door: { plate: "window-door", s: 2.0, at: [580, 740] }, row: seat("seating-row", 1.0, 760), guy2: seat("seating-guy2", 1.3, 800), guy3: seat("seating-guy3", 1.5, 820),
  tables: { plate: "seating-wide-table", s: 1.43, at: [384, 880] }, plug: { plate: "counter-wall-socket", s: 3.2, at: [330, 540] }, steam: { plate: "counter-machine", s: 4.4, at: [113, 520] }, leaving: counter("counter-ross-plug", 1.1, 1337),
  call: seat("seating-camper-call", 1.2, 800), offer: { plate: "laptop", s: 0.98, at: [540, 900] }, gong: seat("seating-gong", 1.1, 780), cheer: seat("seating-cheer", 1.2, 892), pop: seat("seating-bottles", 1.1, 780),
  soaked: counter("counter-ross-foam", 1.15, 1340), cup: seat("seating-camper-cup", 1.0, 760), dry: counter("counter-ross-dry", 1.3, 1380), freeze: seat("seating-freeze", 1.4, 800), slap: { plate: "counter-top", s: 3.4, at: [384, 790] },
};
