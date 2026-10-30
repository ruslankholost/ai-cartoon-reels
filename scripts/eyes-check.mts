// node scripts/eyes-check.mts  ->  every pupil of every puppet rig (src/sp-rig.json, src/nv3-rig.json, src/tip-rig.json, src/because-rig.json, src/pen-rig.json, src/lips-rig.json) and of the audience stays inside its eye
// white whatever the look (src/sp-eyes.ts), and a puppet's pupil that does not look stays on its drawn spot. Exits non-zero when a check fails.
import a from "../src/sp-rig.json" with { type: "json" };
import b from "../src/nv3-rig.json" with { type: "json" };
import c from "../src/tip-rig.json" with { type: "json" };
import d from "../src/because-rig.json" with { type: "json" };
import e from "../src/pen-rig.json" with { type: "json" };
import g from "../src/lips-rig.json" with { type: "json" };
import { pupilAt, type EyeBox } from "../src/sp-eyes.ts";

type Rig = { eyes?: EyeBox[]; pupils: number[][] };
const puppets = Object.entries({ ...a, ...b, ...c, ...d, ...e, ...g } as unknown as Record<string, Rig>).filter(([, r]) => r?.eyes);
const crowd = (b as unknown as { scenes: { audience: { eyes: (EyeBox & { px: number; py: number; pr: number })[] } } }).scenes.audience.eyes;
let bad = 0;
// how far a pupil of radius r at (x, y) sticks out of the white W x H around the eye's centre, in px (<= 0: inside)
const past = (e: EyeBox, x: number, y: number, r: number, W: number, H: number) => {
  let m = -Infinity;
  for (let k = 0; k < 64; k++) { const u = (k / 64) * Math.PI * 2; m = Math.max(m, (Math.hypot((x + r * Math.cos(u) - e.cx) / W, (y + r * Math.sin(u) - e.cy) / H) - 1) * Math.min(W, H)); }
  return m;
};
const looks: [number, number][] = [[0, 0]];
for (let i = 0; i < 48; i++) for (const s of [0.5, 1, 1.5]) looks.push([s * Math.cos((i / 48) * Math.PI * 2), s * Math.sin((i / 48) * Math.PI * 2)]);
for (const [name, r] of puppets) r.pupils.forEach((q, i) => {
  const e = r.eyes![i];
  // a rig's rx/ry run to the middle of the 3 px outline (scripts/sp-prep.py eyes_of): the white ends 1.5 px inside
  const worst = Math.max(...looks.map((g) => { const [x, y] = pupilAt(e, [q[0], q[1]], q[2], g, 6); return past(e, x, y, q[2], e.rx - 1.5, e.ry - 1.5); }));
  const [x0, y0] = pupilAt(e, [q[0], q[1]], q[2], [0, 0], 6);
  if (worst > 0) { bad++; console.log(`FAIL ${name} eye ${i}: the pupil goes ${worst.toFixed(1)} px past the white`); }
  if (Math.hypot(x0 - q[0], y0 - q[1]) > 1e-6) { bad++; console.log(`FAIL ${name} eye ${i}: a pupil that does not look leaves its drawn spot`); }
});
let crowdWorst = -Infinity;
for (const e of crowd) {
  const r = Math.round(e.pr * 2) / 2; // as src/nv3-scenes.tsx draws it; the audience's rx/ry are the white itself (scripts/nv3-prep.py)
  for (const g of looks) { const [x, y] = pupilAt(e, [e.px, e.py], r, g, 1.2); crowdWorst = Math.max(crowdWorst, past(e, x, y, r, e.rx, e.ry)); }
}
if (crowdWorst > 0) { bad++; console.log(`FAIL audience: a pupil goes ${crowdWorst.toFixed(1)} px past the white`); }
console.log(bad ? `${bad} check(s) failed` : `all pupils stay inside the eyes: ${puppets.length} puppets, ${crowd.length} audience eyes, ${looks.length} looks`);


// x18 "Unattended": the pupils that src/x18-scenes*.tsx draws over the painted faces (LookPupils in src/x18-draw.tsx: a disc of the eye's white over the painted pupil, a dot of radius `pr` that travels from the eye's centre under pupilAt)
// stay inside the whites at every look, and the covering disc is inside the white too
import x18 from "../src/x18-rig.json" with { type: "json" };
type P18 = { eyes?: EyeBox[]; pupils?: number[][] };
const people = (x18 as unknown as { people: Record<string, P18> }).people;
const USED: [string, number, number][] = [["mom_phone", 9, 4], ["mom_glasses", 9, 4], ["mom_glasses", 10, 4], ["toddler_apron", 6, 5]];
let bad18 = 0;
for (const [name, pr, margin] of USED) {
  const d = people[name];
  d.eyes!.forEach((e, i) => {
    const wr = e.rx - 1.5, hr = e.ry - 1.5;
    const worst = Math.max(...looks.map((g) => { const [x, y] = pupilAt(e, [e.cx, e.cy], pr, g, margin); return past(e, x, y, pr, wr, hr); }));
    const q = d.pupils![Math.min(i, d.pupils!.length - 1)], cover = past(e, q[0], q[1], q[2] + 3.2, wr, hr);
    if (worst > 0) { bad18++; console.log(`FAIL x18 ${name} eye ${i}: the code pupil (r ${pr}) goes ${worst.toFixed(1)} px past the white`); }
    if (cover > 0) { bad18++; console.log(`FAIL x18 ${name} eye ${i}: the disc over the painted pupil goes ${cover.toFixed(1)} px past the white`); }
  });
}
console.log(bad18 ? `${bad18} x18 check(s) failed` : `x18: the code pupils of ${USED.length} faces stay inside their eyes`);

// x19 "Screen Time": the glazed eyes that src/x19-art.tsx GlazePupils draws over the painted faces (the toddler's, and the four customers': a disc of the eye's white over the painted pupil, a pale iris IRIS_K times as wide as the painted pupil with the pupil in it, kept
// inside the eye by pupilAt with a margin of 3) stay inside the whites at every gaze the scenes use: the toddler's does not look (his painted spot), the customers' tick over in shot 25 through GAZE_STEPS and GAZE_DY (src/x19-sched.ts)
import x19 from "../src/x19-rig.json" with { type: "json" };
import { GAZE_DY, GAZE_STEPS, IRIS_K, coverR } from "../src/x19-sched.ts";
const people19 = (x19 as unknown as { people: Record<string, P18> }).people;
const looks19: [number, number][] = [[0, 0], ...GAZE_STEPS.flatMap((x) => [[x, 0], [x, GAZE_DY]] as [number, number][])];
let bad19 = 0, used19 = 0;
for (const name of ["toddler_sit", "toddler_popcorn", "cust_glazed_1", "cust_glazed_2", "cust_glazed_3", "cust_glazed_4"]) {
  const d = people19[name], gazes = name.startsWith("cust") ? looks19 : [[0, 0] as [number, number]];
  d.eyes!.forEach((e, i) => {
    const q = d.pupils![Math.min(i, d.pupils!.length - 1)], wr = e.rx - 1.5, hr = e.ry - 1.5, R = q[2] * IRIS_K;
    const worst = Math.max(...gazes.map((g) => { const [x, y] = pupilAt(e, [q[0], q[1]], R, g, 3); return past(e, x, y, R, wr, hr); }));
    const cover = past(e, q[0], q[1], coverR(e, q), wr, hr);
    used19++;
    if (worst > 0) { bad19++; console.log(`FAIL x19 ${name} eye ${i}: the iris (r ${R.toFixed(1)}) goes ${worst.toFixed(1)} px past the white`); }
    if (cover > 0) { bad19++; console.log(`FAIL x19 ${name} eye ${i}: the disc over the painted pupil goes ${cover.toFixed(1)} px past the white`); }
  });
}
console.log(bad19 ? `${bad19} x19 check(s) failed` : `x19: the glazed pupils of 6 faces (${used19} eyes, ${looks19.length} looks) stay inside their eyes`);
// x20 "One Coffee": the pupils that src/x20-cast.tsx EyeDots draws over the painted faces (src/x20-eyes.ts: the dot of the painted pupil's size travels from its painted spot to a look, the covering disc is the painted pupil's disc cut to the eye's oval): the camper's wave looks up and out at the
// room (shot 10) and comes back to his screen, the third guy looks down and aside (shot 15). At every look and every mix between the painted spot and the look the dot and its cover stay inside the white, and at mix 0 the dot is on the painted spot
import x20 from "../src/x20-rig.json" with { type: "json" };
import { coverPts, dotAt } from "../src/x20-eyes.ts";
const people20 = (x20 as unknown as { people: Record<string, P18> }).people;
const USED20: [string, [number, number][]][] = [["camper_wave_body", [[-0.95, -0.85]]], ["row_3", [[-0.55, 0.7]]]];
let bad20 = 0, n20 = 0;
for (const [name, used] of USED20) {
  const d = people20[name];
  d.eyes!.forEach((e, i) => {
    const q = d.pupils![Math.min(i, d.pupils!.length - 1)], wr = e.rx - 1.5, hr = e.ry - 1.5;
    for (const g of [...used, ...looks]) for (let m = 0; m <= 20; m++) {
      const [x, y] = dotAt(e, q, g, m / 20, q[2]), w = past(e, x, y, q[2], wr, hr); n20++;
      if (w > 1e-9) { bad20++; console.log(`FAIL x20 ${name} eye ${i}: the dot goes ${w.toFixed(2)} px past the white (look ${g}, mix ${m / 20})`); }
    }
    const [x0, y0] = dotAt(e, q, used[0], 0, q[2]);
    if (Math.hypot(x0 - q[0], y0 - q[1]) > 1e-9) { bad20++; console.log(`FAIL x20 ${name} eye ${i}: at mix 0 the dot is not on the painted pupil`); }
    for (const [x, y] of coverPts(e, q)) if (Math.hypot((x - e.cx) / wr, (y - e.cy) / hr) > 1 + 1e-9) { bad20++; console.log(`FAIL x20 ${name} eye ${i}: the cover of the painted pupil goes past the white`); break; }
    const covered = past(e, q[0], q[1], q[2], wr, hr);
    if (covered > 0) { bad20++; console.log(`FAIL x20 ${name} eye ${i}: the painted pupil itself sticks ${covered.toFixed(1)} px out of the white (the cover cannot hide it)`); }
  });
}
console.log(bad20 ? `${bad20} x20 check(s) failed` : `x20: the code pupils of ${USED20.length} faces stay inside their eyes (${n20} dot positions)`);

process.exit(bad + bad18 + bad19 + bad20 ? 1 : 0);
