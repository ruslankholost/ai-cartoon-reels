import React from "react";
import { Fill, G, Stroke, bezier, ell, mirrored, pathPts, rnd, roundPts, rpoly, rrect, scallopPts, shp, Txt, type Pt } from "./flat";
import { Arm, Brows, Eyes, Mitten, Mouth, SKIN, armToward, ellPts } from "./chars";
import { PhoneBack, burst } from "./props";

// The cast of "Nobody Picks Up" (docs/x01-nobody-picks-up.md): Denise (shampoo, cold shower), Tony (AquaPro, under a
// stranger's sink, legs only) and Gary (the worst plumber, in his van). Same cut-out rules as chars.tsx: flat colour,
// black outline, big round head, mitten hands; `mouth` is the mouth prop that later follows the voice.

// ── Denise: a tower of foam, eyes squeezed shut, bare shoulders (the shower curtain is the set's business) ──
const FOAM_TOWER = shp("deniseFoam", () => scallopPts(mirrored(pathPts("M 0 500 C 64 500 104 462 112 410 C 118 372 96 346 124 306 C 150 270 180 246 172 190 C 166 146 150 120 120 104 C 80 94 40 98 0 98", 14)), 8, 26));
const DENISE_HAIR = "#3A2214";
// a square-ish shout, corners pulled down
const SHOUT = shp("deniseShout", () => roundPts([[-62, -4], [-30, 10], [30, 10], [62, -4], [54, -66], [-54, -66]], 12, 5));
const SHOUT_TEETH = shp("deniseShoutTeeth", () => [[-54, 0], [-28, 8], [28, 8], [54, 0], [52, -16], [-52, -16]]);
export type DeniseProps = { x?: number; y?: number; z?: number; s?: number; mouth?: number; slide?: number; goose?: number; hands?: boolean; tilt?: number };
export function Denise({ x = 0, y = 0, z = 0, s = 1, mouth = 1, slide = 0, goose = 1, hands = true, tilt = 0 }: DeniseProps) {
  // goosebumps: small dots on the shoulders and the chest under the chin, never inside the head
  const bumps = Array.from({ length: 8 }, (_, i) => {
    const side = i % 2 ? 1 : -1;
    const wing = true;
    const px = wing ? side * (150 + rnd(i, 1) * 48) : (rnd(i, 1) - 0.5) * 150;
    const py = wing ? -34 + rnd(i, 2) * 70 : -36 + rnd(i, 2) * 40;
    return { p: [px, py] as Pt, show: i < Math.round(goose * 8) };
  });
  return (
    <G x={x} y={y} z={z} sx={s}>
      {/* bare shoulders and chest; wet hair hangs over them */}
      <Fill s={ell(210, 92)} fill={SKIN} ow={5.5} y={-20} />
      {bumps.filter((b) => b.show).map((b, i) => <Fill key={i} s={ell(2.6, 2.6, 10)} fill="#FBE3CC" ow={0} x={b.p[0]} y={b.p[1]} z={0.5} />)}
      {/* the head */}
      <G x={0} y={150} r={tilt} z={12}>
        <Fill s={ell(142, 128)} fill={DENISE_HAIR} ow={5.5} y={6} z={-3} />
        {[-1, 1].map((sd) => <Fill key={sd} s={rrect(50, 150, 24)} fill={DENISE_HAIR} ow={5.5} x={sd * 116} y={-50} z={-3.5} r={sd * 5} />)}
        <Fill s={ell(126, 114)} fill={SKIN} ow={5.5} />
        {[-1, 1].map((sd) => <Fill key={sd} s={ell(22, 13)} fill="#8FC3F0" ow={0} op={0.55} x={sd * 92} y={-34} z={1} />)}
        <Fill s={ell(16, 10)} fill="#8FC3F0" ow={0} op={0.55} y={-18} z={1} />
        {/* eyes squeezed shut: two > < wedges, brows pulled up in the middle */}
        {[-1, 1].map((sd) => <Stroke key={sd} pts={[[sd * 74, 26], [sd * 30, 6], [sd * 74, -14]]} w={9} z={2} />)}
        <Brows y={60} tilt={-1} len={74} inner={6} w={10} />
        {mouth > 0.06 ? (
          <G y={-44} z={2}>
            <Fill s={SHOUT} fill="#000000" ow={0} />
            <Fill s={SHOUT_TEETH} fill="#ffffff" ow={0} z={0.5} />
            <Fill s={ell(30, 14)} fill="#E8737C" ow={0} y={-56} z={0.5} />
          </G>
        ) : <Mouth open={0} w={90} y={-52} z={2} />}
        {/* wet hair plastered on the forehead */}
        {[[-60, 8], [-14, -4], [42, 10]].map(([wx, wk], i) => <Stroke key={i} pts={bezier([[wx, 98], [wx + wk, 80], [wx - wk * 0.5, 62], [wx + wk * 0.4, 50]], 10)} w={9} color={DENISE_HAIR} z={5.8} />)}
        {/* the foam: one tower, drips behind it, a few bubbles */}
        {[[-50, 84, 1], [38, 80, 1.4], [-92, 70, 0.8]].map(([dx, dy, k], i) => <Fill key={i} s={ell(10, 20)} fill="#ffffff" ow={5} x={dx} y={dy - 6 - slide * 0.25 * k} z={5.5} />)}
        <Fill s={FOAM_TOWER} fill="#ffffff" ow={5.5} y={-slide} z={6} />
        {[[-190, 330, 16], [196, 396, 11], [-168, 440, 9], [150, 520, 13]].map(([bx, by, br], i) => <Fill key={i} s={ell(br, br, 20)} fill="#ffffff" ow={4} x={bx} y={by} z={6} />)}
      </G>
      {/* cold: shiver strokes beside the head */}
      {[-1, 1].map((sd) => [0, 1, 2].map((k) => <Stroke key={`${sd}${k}`} pts={[[sd * (212 + k * 4), 150 + k * 34], [sd * (240 + k * 4), 158 + k * 34]]} w={6} z={13} />))}
      {/* her hands hold the curtain up to her shoulders (the set puts the curtain at z 40) */}
      {hands && [-1, 1].map((sd) => <G key={sd} x={sd * 192} y={-48} z={48}><Mitten thumb={(-sd) as 1 | -1} /></G>)}
    </G>
  );
}

// ── Tony: only what sticks out of the cabinet. Seen from behind: shirt, lower back, jeans, boots, a phone in a pocket ──
const SHIRT = shp("tonyShirt", () => [[-148, 150], [148, 150], [154, 14], [-154, 14]]);
const SKIN_BACK = shp("tonyBack", () => [[-146, 20], [146, 20], [140, -30], [0, -64], [-140, -30]]);
// the waistband has slipped: it dips in the middle
const JEANS = shp("tonyJeans", () => [[-150, -22], [-70, -42], [0, -64], [70, -42], [150, -22], [174, -110], [204, -330], [108, -330], [62, -178], [0, -150], [-62, -178], [-108, -330], [-204, -330], [-174, -110]]);
const POCKET = shp("tonyPocket", () => [[-46, 0], [46, 0], [46, -74], [0, -102], [-46, -74]]);
const JEAN = "#3E64A0", JEAN_D = "#2E4C80";
export type TonyProps = { x?: number; y?: number; z?: number; s?: number; buzz?: number };
export function TonyLegs({ x = 0, y = 0, z = 0, s = 1, buzz = 0 }: TonyProps) {
  // buzz is 0 (quiet) or the time in seconds while the phone rings: it shakes the phone on each buzz
  const shake = buzz > 0 ? Math.sin(buzz * 60) * 3 : 0;
  return (
    <G x={x} y={y} z={z} sx={s}>
      {/* the AquaPro shirt, riding up; its top disappears into the cabinet */}
      <Fill s={SHIRT} fill="#2F9BD1" ow={5.5} />
      <Txt text="AquaPro" size={46} color="#ffffff" stroke="#000000" strokeW={3} y={76} z={1} />
      <Fill s={SKIN_BACK} fill={SKIN} ow={5.5} z={1} />
      <Fill s={ell(30, 16)} fill="#B9774E" ow={0} op={0.35} x={-34} y={-46} z={1.5} />
      <Fill s={ell(30, 16)} fill="#B9774E" ow={0} op={0.35} x={34} y={-46} z={1.5} />
      <Stroke pts={bezier([[2, -62], [-7, -42], [7, -22], [0, 4]], 12)} w={8} z={2} />
      <Fill s={JEANS} fill={JEAN} ow={5.5} z={2} />
      {[-1, 1].map((sd) => <Stroke key={sd} pts={[[sd * 66, -176], [sd * 142, -324]]} w={5} color={JEAN_D} round={false} z={3} />)}
      {/* the phone sticks out of the right back pocket, screen lit, buzzing */}
      <G x={82} y={-34} z={3}>
        <G r={-6 + shake} y={shake}>
          <Fill s={burst(66, 60, 12, 0.72)} fill="#CFE6FF" ow={0} op={0.7} y={20} z={-1} />
          <Fill s={rrect(62, 112, 12)} fill="#1E2330" ow={5.5} y={20} />
          <Fill s={rrect(50, 96, 6)} fill="#BFE8FF" ow={0} y={22} z={0.2} />
          <Fill s={ell(11, 11, 16)} fill="#5B8DB8" ow={0} y={44} z={0.4} />
          <Fill s={rrect(36, 8, 4)} fill="#5B8DB8" ow={0} y={22} z={0.4} />
          <Fill s={rrect(18, 18, 9)} fill="#3FB86B" ow={0} x={-12} y={-10} z={0.4} />
          <Fill s={rrect(18, 18, 9)} fill="#E0483D" ow={0} x={12} y={-10} z={0.4} />
        </G>
        {buzz > 0 && [-1, 1].map((sd) => [0, 1, 2].map((k) => <Stroke key={`${sd}${k}`} pts={[[sd * (50 + k * 14), 34 + k * 14 - 6], [sd * (62 + k * 14), 44 + k * 14]]} w={6} z={4} />))}
        <Fill s={POCKET} fill={JEAN} ow={5.5} y={-30} z={1} />
      </G>
      <G x={-82} y={-62} z={3}>
        <Fill s={POCKET} fill={JEAN} ow={5.5} y={-30} />
      </G>
      {/* work boots, from behind: heel, dark sole */}
      {[-1, 1].map((sd) => (
        <G key={sd} x={sd * 156} y={-352} z={3} r={sd * 8}>
          <Fill s={rrect(110, 110, 30)} fill="#8A5A2B" ow={5.5} y={-8} />
          <Fill s={rrect(116, 26, 8)} fill="#2B2018" ow={5.5} y={-62} z={0.5} />
          <Fill s={rrect(110, 20, 6)} fill="#4C77B5" ow={0} y={42} z={0.2} />
        </G>
      ))}
    </G>
  );
}

// ── Gary: stained grey hoodie, stubble, heavy lids; answers with his mouth full ──
const GARY_TORSO = shp("garyTorso", () => mirrored(pathPts("M 0 172 C 70 172 118 152 138 102 C 160 50 176 0 166 -30 C 150 -64 90 -70 0 -70", 18)));
const GARY_HAIR = shp("garyHair", () => {
  const top: Pt[] = Array.from({ length: 21 }, (_, i) => { const a = ((10 + i * 8) * Math.PI) / 180; return [Math.cos(a) * 132, Math.sin(a) * 120] as Pt; });
  return [...top, [-118, 52], [-60, 70], [0, 58], [60, 70], [118, 52]];
});
const GARY_STUBBLE = shp("garyStubble", () => ellPts(128, 118, 64).map(([px, py]) => [px, Math.min(py, -34)] as Pt));
const HOOD = "#8E939B", HOOD_D = "#7A7F87";
const BURRITO_ARM = armToward([-120, 140], -1, [-186, 200]);
const PHONE_ARM = armToward([120, 140], 1, [188, 238]);
// half a burrito held at an angle: a fat tortilla roll bitten open at the top, filling showing, the lower half in crumpled foil
const BITE = shp("burritoBite", () => [[-44, 56], [-40, 80], [-26, 70], [-14, 88], [2, 72], [16, 90], [30, 72], [42, 82], [44, 56]]);
const FOIL = shp("burritoFoil", () => [[-52, -78], [-56, -36], [-48, -22], [-56, -6], [-50, 12], [-56, 26], [56, 26], [50, 12], [56, -6], [48, -22], [56, -36], [52, -78]]);
function Burrito() {
  return (
    <G y={58} r={26}>
      <Fill s={rrect(92, 150, 40)} fill="#E6C58A" ow={5.5} />
      <Fill s={BITE} fill="#8A5A3A" ow={5} z={1} />
      <Fill s={ell(12, 8)} fill="#6A8F3A" ow={0} x={-22} y={70} z={2} />
      <Fill s={ell(9, 7)} fill="#C73A2F" ow={0} x={8} y={66} z={2} />
      <Fill s={ell(8, 6)} fill="#F3E3C0" ow={0} x={26} y={72} z={2} />
      <Fill s={ell(9, 6)} fill="#6A8F3A" ow={0} x={-2} y={78} z={2} />
      <Fill s={FOIL} fill="#C9CED6" ow={5.5} y={-8} z={3} />
      {[[-30, -50, -16, -20], [8, -62, 22, -24], [-10, -10, 4, 14]].map(([x0, y0, x1, y1], i) => <Stroke key={i} pts={[[x0, y0], [x1, y1]]} w={4} color="#F1F4F7" z={4} />)}
      <Stroke pts={[[-4, -36], [12, -48]]} w={4} color="#8C95A0" z={4} />
    </G>
  );
}
export type GaryProps = { x?: number; y?: number; z?: number; s?: number; mouth?: number; look?: Pt; lid?: number };
export function Gary({ x = 0, y = 0, z = 0, s = 1, mouth = 0.45, look = [-0.7, -0.5], lid = 0.5 }: GaryProps) {
  // stubble dots on the jaw
  const dots = Array.from({ length: 48 }, (_, i) => [(rnd(i, 7) - 0.5) * 210, -40 - rnd(i, 8) * 70] as Pt).filter(([px, py]) => (px / 122) ** 2 + (py / 112) ** 2 < 0.86);
  return (
    <G x={x} y={y} z={z} sx={s}>
      {/* the hoodie: seat belt across it, a pocket, grease and sauce stains, drawstrings */}
      <G z={3}>
        <Fill s={GARY_TORSO} fill={HOOD} ow={5.5} />
        <Fill s={rpoly("garyPocket", [[-92, 6], [92, 6], [110, -52], [-110, -52]], 12)} fill={HOOD_D} ow={5.5} z={1} />
        <Fill s={ell(36, 22)} fill="#5E4B3A" ow={0} x={-56} y={86} r={-20} z={1} />
        <Fill s={ell(22, 14)} fill="#C73A2F" ow={0} x={44} y={50} r={16} z={1} />
        <Fill s={ell(14, 9)} fill="#5E4B3A" ow={0} x={86} y={112} z={1} />
        <Stroke pts={[[118, 176], [-96, -50]]} w={34} color="#15171C" ow={5.5} round={false} z={2} />
        <Fill s={ell(112, 46)} fill={HOOD_D} ow={5.5} y={166} z={3} />
        {[-1, 1].map((sd) => <Fill key={sd} s={ell(54, 62)} fill={HOOD_D} ow={5.5} x={sd * 96} y={150} z={2.5} r={sd * -20} />)}
        {[-1, 1].map((sd) => <Stroke key={sd} pts={[[sd * 26, 150], [sd * 34, 82]]} w={5} color="#E9ECEF" ow={3.5} round={false} z={4} />)}
      </G>
      {/* left hand (screen left): the burrito, under the chin. */}
      <G x={-120} y={140}><Arm side={-1} a={BURRITO_ARM.a} len={BURRITO_ARM.len} sleeve={HOOD} z={14}><G z={-0.5}><Burrito /></G></Arm></G>
      {/* right hand (screen right, his left): the one phone, against the ear */}
      <G x={120} y={140}><Arm side={1} a={PHONE_ARM.a} len={PHONE_ARM.len} sleeve={HOOD} z={14}><G x={-22} y={34} r={10} z={-0.5}><PhoneBack s={0.85} glow={false} z={-1} /></G></Arm></G>
      {/* the head: thin grey hair, ears, heavy lids, bags, stubble, sauce on the chin */}
      <G x={0} y={266} r={-3} z={12}>
        {[-1, 1].map((sd) => <Fill key={sd} s={ell(18, 28)} fill={SKIN} ow={5.5} x={sd * 126} y={-4} z={-1} />)}
        <Fill s={ell(128, 118)} fill={SKIN} ow={5.5} />
        <Fill s={GARY_STUBBLE} fill="#6B6B6B" ow={0} op={0.35} z={0.5} />
        {dots.map(([px, py], i) => <Fill key={i} s={ell(2.6, 2.6, 8)} fill="#3C3C3C" ow={0} x={px} y={py} z={0.6} />)}
        <Fill s={GARY_HAIR} fill="#9A9DA3" ow={0} op={0.5} z={3} />
        {Array.from({ length: 40 }, (_, i) => [(rnd(i, 11) - 0.5) * 230, 52 + rnd(i, 12) * 62] as Pt).filter(([px, py]) => (px / 124) ** 2 + (py / 114) ** 2 < 0.9 && py > 50 + 12 * Math.abs(px) / 118).map(([px, py], i) => <Fill key={i} s={ell(2.6, 2.6, 8)} fill="#6E6E6E" ow={0} x={px} y={py} z={3.1} />)}
        <Eyes lid={lid} look={look} pupil={7} />
        {[-1, 1].map((sd) => <Stroke key={sd} pts={bezier([[sd * 43 - 36, -42], [sd * 43, -52], [sd * 43 + 36, -42]], 8)} w={5} color="#C9936B" z={2} />)}
        <Brows y={38} len={72} inner={6} tilt={0.1} w={10} color="#6E6E6E" />
        <Mouth open={mouth} w={64} y={-74} z={2} />
        <Fill s={ell(18, 12)} fill="#D03A22" ow={0} x={-40} y={-98} z={2} />
        <Fill s={rpoly("sauceDrip", [[0, 0], [8, 0], [8, -22], [0, -22]], 4)} fill="#D03A22" ow={0} x={-44} y={-104} z={2} />
      </G>
    </G>
  );
}
