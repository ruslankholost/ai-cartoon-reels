import React from "react";
import { Glow, Inked, Panel, Picture, Poly, Puppet, SCENES, ellipsePts, grow, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { pupilAt } from "./sp-eyes";
import { Plane, ShadowOf, Steam, Vignette, Water, inkAt, useCanvasTexture, useImages, type SteamCfg, type WaterCfg } from "./sp-fx";
import { FPS, T, buzzAt, clamp01, crowdLook, ease, easeIn, hash, icicleLen, marcoPhoneAt, phoneAt, poseAt, premierAt, PREMIER, rickPhoneAt, garyHere, garySettle, zoomDenise, zoomGary } from "./nv3-sched";

// The three.js scenes of "Nobody Picks Up" v3. Every scene is one or two ortho canvases (Panel) showing a picture of out/sp-cast2 (public/sp), the
// puppets cut from the pictures (src/sp-puppet.tsx) and a few shapes drawn in code (water, steam, the icicle, a laptop, phones, hands). The split
// screens are Denise on top (1080 x 854) and the other end of the call below (1080 x 1054), a 12 px black bar between them.
export const W = 1080, TOP_H = 854, DIV = 12, BOT_H = 1054;
const SB = W / 768;
const STEAM_FILL = "#eef6f9", STEAM_INK = "#34414b"; // flat white with a cool tint (so a cloud never reads as more foam, and 255 stays the foam's) and the ink of a cloud
const RIG_MOUTH: [number, number] = [389, 544.5], RIG_PIVOT: [number, number] = [389, 604]; // Denise's mouth and neck pivot in her picture (src/sp-rig.json)
const INK = "#2a1d12";
const SKIN = "#f9d9a4";

// a view maps px of a 768x1344 picture to the panel: s = panel px per picture px, (u0, v0) = the picture point at the panel's top-left corner
type View = { s: number; X: (u: number) => number; Y: (v: number) => number };
const view = (Wp: number, Hp: number, s: number, u0: number, v0: number): View => ({ s, X: (u) => -Wp / 2 + (u - u0) * s, Y: (v) => Hp / 2 - (v - v0) * s });
const P = (m: View, pts: [number, number][]): Pt[] => pts.map(([u, v]) => [m.X(u), m.Y(v)] as Pt);
const bg = (m: View, file: string, order = 0, extra: { alpha?: boolean; dx?: number; tint?: string } = {}) => <Picture file={file} w={768 * m.s} h={1344 * m.s} x={m.X(384) + (extra.dx ?? 0) * m.s} y={m.Y(672)} order={order} alpha={extra.alpha} tint={extra.tint} />;
const strip = (m: View, file: string, y0: number, order = 100) => <Picture file={file} w={768 * m.s} h={(1344 - y0) * m.s} x={m.X(384)} y={m.Y((1344 + y0) / 2)} order={order} alpha />;
const fract = (x: number) => x - Math.floor(x);

// ── shapes drawn in code
// the icicle on the shower head: grows downward from the lowest edge of the shower head's face (picture px 566, 204)
function Icicle({ m, k, ink, order = 4 }: { m: View; k: number; ink: number; order?: number }) {
  if (k <= 0.02) return null;
  const L = 96 * k, x = 566, y0 = 204, INKC = "#4e9bc9";
  const big: [number, number][] = [[x - 10, y0 - 3], [x + 10, y0 - 3], [x + 7, y0 + 0.42 * L], [x + 3.4, y0 + 0.8 * L], [x + 0.6, y0 + L], [x - 2.2, y0 + 0.78 * L], [x - 6, y0 + 0.4 * L]];
  const small: [number, number][] = [[x + 12, y0 - 2], [x + 23, y0 - 2], [x + 20, y0 + 0.2 * L], [x + 17, y0 + 0.44 * L], [x + 14, y0 + 0.2 * L]];
  const shine: [number, number][] = [[x - 7, y0], [x - 4, y0], [x - 3, y0 + 0.5 * L], [x - 5, y0 + 0.4 * L]];
  return (
    <>
      <Inked pts={P(m, big)} color="#d9f4ff" ink={INKC} w={ink} order={order} />
      <Inked pts={P(m, small)} color="#d9f4ff" ink={INKC} w={ink} order={order} />
      <Poly pts={P(m, shine)} color="#ffffff" order={order + 1} />
    </>
  );
}
// ── shot 1: the bathroom, wide
// Shot 1 (effects test, kit in src/sp-fx.tsx). Water: drops from the shower head (picture px 560, 192) to the foam (394, 262), each on its own parabola, stretched along
// its velocity, with a splash and a thin film running down the foam; turned off at T.cold, the tail lets go and the last drops land. Steam: particles rising on noise
// from the stream, the foam, the tub and her shoulders, drawn through the goo pass; at T.cold it tears apart and is gone in 0.6 s. A breath puff on her shout.
const WATER: WaterCfg = { from: [556, 191], to: [394, 262], t0: -0.6, t1: T.cold, rate: 95, flight: 0.3, gravity: 3200, spread: 16, seed: 5, film: [[0, 0], [12, 8], [24, 20], [30, 34]] };
const STEAM: SteamCfg = {
  t0: -1.8, t1: T.cold, stop: T.cold, breakDur: 0.6, seed: 3,
  emitters: [ // born behind something (her, the foam, the tub's front) wherever it can be, so that nothing pops into the open
    { seg: [548, 196, 400, 258, 10], n: 10, r: [16, 32], rise: [55, 100], life: [1.0, 1.6], strength: 0.85, drift: 12 }, // along the stream
    { box: [236, 215, 292, 262], n: 5, r: [18, 34], rise: [50, 80], life: [1.2, 1.9], strength: 0.85, drift: 14 }, // off the foam's left flank
    { box: [408, 215, 464, 262], n: 5, r: [18, 34], rise: [50, 80], life: [1.2, 1.9], strength: 0.85, drift: 14 }, // and its right
    { box: [90, 975, 670, 1030], n: 16, r: [22, 44], rise: [62, 115], life: [1.8, 2.8], strength: 0.88, drift: 18 }, // out of the tub, behind its front
    { box: [225, 520, 420, 690], n: 8, r: [18, 38], rise: [34, 56], life: [1.4, 2.1], strength: 0.8, drift: 26 }, // off her shoulders, behind her
  ],
};
const BREATH_AT = 0.3; // her shout starts (words of take 1)
export function BathWide({ f }: { f: number }) {
  const m = view(W, 1920, 1920 / 1344, 6, 0);
  const t = f / FPS;
  const pd = poseAt("denise", f);
  const ps = 0.75 * m.s, PX = 305, PY = 529; // Denise's neck pivot in picture px
  const ink = inkAt(ps); // the painted art's ink line at the scale Denise is shown at
  const mouth: [number, number] = [PX + 0.75 * (RIG_MOUTH[0] - RIG_PIVOT[0]), PY - 0.75 * (RIG_PIVOT[1] - RIG_MOUTH[1])];
  // a breath puff on the shout: a small cloud at each corner of her mouth on the pushes of air ("Oh", "fucking", "kidding"), thrown outwards, clear of the mouth itself
  // a puff of breath on each push of air ("Oh", "fucking", "kidding"): an opaque cloud born at the right corner of her mouth, thrown up and out across her cheek in
  // about 8 frames, so it leaves the mouth clear almost at once
  const breath: SteamCfg = { t0: 0, t1: 3, stop: 9, seed: 11, emitters: [{ box: [mouth[0] + 20, mouth[1] - 4, mouth[0] + 26, mouth[1] + 4], n: 3, at: [BREATH_AT, 1.03, 1.51], r: [8, 22], rise: [55, 110], life: [0.26, 0.34], strength: 0.95, drift: 400, dir: 1, burst: 4, lobes: 3 }] };
  return (
    <Panel w={W} h={1920}>
      {bg(m, "sp/bg-bathroom.jpg", 0)}
      <Icicle m={m} k={icicleLen(f)} ink={ink} />
      <Steam m={m} t={t} cfg={STEAM} order={5} ow={ink} th={0.4} ink={STEAM_INK} fill={STEAM_FILL} opacity={0.96} />
      <Puppet char="denise" pose={pd} x={m.X(PX)} y={m.Y(PY)} scale={ps} phone={null} order={10} />
      <Water m={m} t={t} cfg={WATER} ink={ink} order={60} />
      <Steam m={m} t={t} cfg={breath} order={70} ow={ink} th={0.4} ink={STEAM_INK} fill={STEAM_FILL} maxN={32} blur={1} res={1} />
      {strip(m, "sp/fg-bathroom-tub.png", SCENES.bathroom.tubY)}
    </Panel>
  );
}

// ── the top half of every split: Denise in her bathroom with the phone at her ear (the icicle still hangs on the shower head)
export function TopDenise({ f }: { f: number }) {
  const m = view(W, TOP_H, SB, 0, 29);
  const pd = poseAt("denise", f);
  return (
    <Panel w={W} h={TOP_H} zoom={zoomDenise(f)} focus={[0, -120]}>
      {bg(m, "sp/bg-bathroom.jpg", 0)}
      <Icicle m={m} k={1} ink={inkAt(1.35)} />
      <Puppet char="denise" pose={pd} x={0} y={-300} scale={1.35} phone={phoneAt(f)} />
    </Panel>
  );
}

// ── shot 3: Tony under the sink, his phone buzzing in the back pocket
export function TonyPanel({ f }: { f: number }) {
  const m = view(W, BOT_H, SB, 0, 350);
  const { glow, wig } = buzzAt(f);
  const q = SCENES.tony.phone as [number, number][];
  const box = SCENES.tony.box as number[];
  const cx = q.reduce((a, p) => a + p[0], 0) / 4, cy = q.reduce((a, p) => a + p[1], 0) / 4;
  const sx = wig * 2.4;
  return (
    <Panel w={W} h={BOT_H}>
      {bg(m, "sp/bg-tony.jpg", 0)}
      <group position={[sx * SB, 0, 0]}>
        <Picture file="sp/tony-phone.png" w={box[2] * m.s} h={box[3] * m.s} x={m.X(box[0] + box[2] / 2)} y={m.Y(box[1] + box[3] / 2)} order={5} alpha rot={wig * 1.3} />
        {glow > 0 && <Poly pts={P(m, [[q[0][0] + 3, q[0][1] + 4], [q[1][0] - 3, q[1][1] + 4], [q[2][0] - 3, q[2][1] - 3], [q[3][0] + 3, q[3][1] - 3]])} color="#dff6ff" op={0.92 * glow} order={6} />}
        {glow > 0 && <Poly pts={P(m, [[q[0][0] + 7, q[0][1] + 9], [q[1][0] - 8, q[1][1] + 9], [q[1][0] - 8, q[1][1] + 14], [q[0][0] + 7, q[0][1] + 14]])} color="#8fd0ff" op={glow} order={6.5} />}
        {glow > 0 && <Poly pts={P(m, [[q[0][0] + 7, q[0][1] + 22], [q[1][0] - 16, q[1][1] + 22], [q[1][0] - 16, q[1][1] + 25], [q[0][0] + 7, q[0][1] + 25]])} color="#a9b8c4" op={0.8 * glow} order={6.5} />}
        <Glow x={m.X(cx)} y={m.Y(cy)} rx={120 * m.s} ry={96 * m.s} op={0.95 * glow} order={7} />
      </group>
    </Panel>
  );
}

// ── shot 4: the Premier office. Marco and the agency guy stand behind the table (the table is a strip over their legs); a laptop with a chart, Marco's phone
const OFFICE = view(W, BOT_H, 1.895, 100, 333);
function Laptop({ x, y, g }: { x: number; y: number; g: number }) {
  const at = (pts: [number, number][]): Pt[] => pts.map(([a, b]) => [x + a, y + b] as Pt);
  const scr = { tl: [-100, 102], tr: [98, 92], br: [100, -16], bl: [-106, -20] };
  const inner = (u: number, v: number): [number, number] => { // u across (0 left .. 1 right), v up (0 bottom edge .. 1 top edge) of the screen, bilinear
    const top = [scr.tl[0] + (scr.tr[0] - scr.tl[0]) * u, scr.tl[1] + (scr.tr[1] - scr.tl[1]) * u];
    const bot = [scr.bl[0] + (scr.br[0] - scr.bl[0]) * u, scr.bl[1] + (scr.br[1] - scr.bl[1]) * u];
    return [x + bot[0] + (top[0] - bot[0]) * v, y + bot[1] + (top[1] - bot[1]) * v];
  };
  const innerQuad: Pt[] = [inner(0.05, 0.9), inner(0.95, 0.9), inner(0.95, 0.1), inner(0.05, 0.1)];
  const line: [number, number][] = [[0.1, 0.16], [0.26, 0.3], [0.4, 0.26], [0.56, 0.5], [0.7, 0.54], [0.88, 0.8]];
  const seg = Math.max(1, Math.round(g * (line.length - 1) * 100) / 100);
  const pts: [number, number][] = [];
  for (let i = 0; i < line.length - 1; i++) {
    if (i >= seg) break;
    pts.push(line[i]);
    if (i + 1 > seg) { const u = seg - i; pts.push([line[i][0] + (line[i + 1][0] - line[i][0]) * u, line[i][1] + (line[i + 1][1] - line[i][1]) * u]); }
  }
  if (seg >= line.length - 1) pts.push(line[line.length - 1]);
  const pl = pts.map(([u, v]) => { const p = inner(0.05 + 0.9 * u, 0.1 + 0.8 * v); return [p[0], p[1], 7] as number[]; });
  const tip = pts.length ? pts[pts.length - 1] : null;
  const tp = tip ? inner(0.05 + 0.9 * tip[0], 0.1 + 0.8 * tip[1]) : null;
  return (
    <>
      <Inked pts={at([[-112, -22], [100, -16], [116, -50], [-128, -58]])} color="#cfd2d7" ink={INK} w={2} order={130} />
      <Inked pts={at([[scr.tl[0], scr.tl[1]], [scr.tr[0], scr.tr[1]], [scr.br[0], scr.br[1]], [scr.bl[0], scr.bl[1]]])} color="#2a2c31" ink={INK} w={2.2} order={131} />
      <Poly pts={innerQuad.map(([a, b]) => [a, b] as Pt)} color="#f7fbff" order={132} />
      <Poly pts={[inner(0.05, 0.9), inner(0.05, 0.1), inner(0.075, 0.1), inner(0.075, 0.9)].map(([a, b]) => [a, b] as Pt)} color="#c9d1d8" order={132.2} />
      <Poly pts={[inner(0.05, 0.1), inner(0.95, 0.1), inner(0.95, 0.125), inner(0.05, 0.125)].map(([a, b]) => [a, b] as Pt)} color="#c9d1d8" order={132.2} />
      {pl.length > 1 && <Poly pts={ribbon(pl)} color="#2fa84f" order={133} />}
      {tp && pl.length > 1 && <Poly pts={[[tp[0] + 15, tp[1] + 4], [tp[0] - 8, tp[1] + 14], [tp[0] - 3, tp[1] - 12]] as Pt[]} color="#2fa84f" order={133} />}
    </>
  );
}
// Marco's phone lying on the table (seen at a low angle, so a flat parallelogram): lit and buzzing, then turned over about its long edge
function MarcoPhone({ x, y, s }: { x: number; y: number; s: ReturnType<typeof marcoPhoneAt> }) {
  const flipY = Math.cos(Math.PI * s.flip); // 1 face up .. -1 face down
  const lift = 26 * Math.sin(Math.PI * s.flip);
  const px = x + s.buzz * 3, py = y + lift;
  const sy = Math.abs(flipY) < 0.06 ? 0.06 : flipY;
  const up = flipY >= 0;
  const W0 = 168, H0 = 74;
  return (
    <>
      {s.lit > 0 && up && <Glow x={px} y={py + 10} rx={190} ry={96} op={0.8} order={134} />}
      <Inked pts={xf(roundRect(W0, H0, 16), px, py, 4, 1, sy)} color={up ? "#25252b" : "#3a3a42"} ink="#0c0c0e" w={2.4} order={135} />
      {up && <Poly pts={xf(roundRect(W0 - 16, H0 - 16, 10), px, py, 4, 1, sy)} color={s.lit ? "#d9f1ff" : "#34343c"} order={136} />}
      {up && s.lit > 0 && <Poly pts={xf(roundRect(W0 - 60, 14, 6), px - 6, py + 14 * sy, 4, 1, sy)} color="#6fb4ee" order={137} />}
      {!up && <Inked pts={xf(roundRect(36, 28, 8), px - W0 / 2 + 30, py + (H0 / 2 - 22) * sy, 4, 1, sy)} color="#1c1c20" ink="#0c0c0e" w={1.6} order={136} />}
    </>
  );
}
// Marco's hand and forearm: from his side of the table, over the tabletop, to the phone; `k` 0..1 is how far it has come
function MitHand({ from, to, k, order }: { from: [number, number]; to: [number, number]; k: number; order: number }) {
  if (k <= 0.01) return null;
  const p: [number, number] = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
  return (
    <>
      <Inked pts={ribbon([[from[0], from[1], 34], [(from[0] + p[0]) / 2, (from[1] + p[1]) / 2 + 4, 33], [p[0], p[1], 30]])} color={SKIN} ink={INK} w={2.2} order={order} />
      <Inked pts={xf(roundRect(66, 48, 22), p[0] + 14, p[1] + 2, 6)} color={SKIN} ink={INK} w={2.2} order={order + 2} />
      <Inked pts={xf(ellipsePts(0, 0, 15, 10, 16), p[0] + 44, p[1] - 4, 6)} color={SKIN} ink={INK} w={1.8} order={order + 3} />
    </>
  );
}
export function OfficePanel({ f }: { f: number }) {
  const m = OFFICE;
  const t = f / FPS;
  const tY = m.Y(SCENES.office.tableY); // the tabletop's far edge
  const ps = 0.6;
  const pm = poseAt("marco", f), pa = poseAt("agency", f);
  const mp = marcoPhoneAt(f);
  const g = ease((t - (T.s4 + 0.1)) / 2.4);
  const hand = mp.hand;
  return (
    <Panel w={W} h={BOT_H}>
      {bg(m, "sp/bg-office.jpg", 0)}
      <Puppet char="marco" pose={pm} x={m.X(255)} y={tY + ps * (945 - 606) - 14} scale={ps} phone={null} order={10} />
      <Puppet char="agency" pose={pa} x={m.X(497)} y={tY + ps * (985 - 704) - 14} scale={ps} phone={null} order={40} />
      {strip(m, "sp/fg-office.png", SCENES.office.tableY, 100)}
      <Laptop x={m.X(385) + 30} y={tY - 46} g={g} />
      <MarcoPhone x={m.X(385) - 150} y={tY + 38} s={mp} />
      <MitHand from={[m.X(222), tY + 6]} to={[m.X(385) - 190, tY + 38]} k={hand} order={140} />
    </Panel>
  );
}

// ── shot 5: the school show, seen from the stage. Rick and his wife sit in the front row, on the seats of the old man and the woman in red, whom their
// heads and shoulders cover; the chair seats are a strip over their laps. Everybody looks at Rick: the pupils of the whole crowd slide towards him
const CROWD = view(W, BOT_H, SB, 0, 290);
export function CrowdPanel({ f }: { f: number }) {
  const m = CROWD;
  const rick = { u: 388, v: 786, ps: 0.4 }, wife = { u: 575, v: 776, ps: 0.4 }; // 0.4: smaller leaves the old man's jacket and the woman's shirt showing
  const pr = poseAt("rick", f), pw = poseAt("wife", f);
  const ph = rickPhoneAt(f);
  const eyes = SCENES.audience.eyes as { cx: number; cy: number; rx: number; ry: number; px: number; py: number; pr: number }[];
  const tx = 388, ty = 760;
  const bz = ph.buzz * 1.8;
  const pv = 1110 + (830 - 1110) * ph.up; // the phone rises from behind the seats to Rick's chest
  const pq: [number, number][] = [[362 + bz, pv + 46], [414 + bz, pv + 46], [414 + bz, pv - 46], [362 + bz, pv - 46]];
  return (
    <Panel w={W} h={BOT_H}>
      {bg(m, "sp/bg-audience-np.jpg", 0)}
      {eyes.map((e, i) => {
        const d = clamp01(Math.hypot(e.cx - tx, e.cy - ty) / 420);
        const k = crowdLook(d, hash(i * 3.7), f);
        const pr = Math.round(e.pr * 2) / 2;
        const [qx, qy] = pupilAt(e, [e.px, e.py], pr, [Math.max(-1, Math.min(1, (tx - e.cx) / 60)) * k, Math.max(-0.6, Math.min(0.9, (ty - e.cy) / 120)) * k], 1.2);
        return (
          <group key={i} position={[m.X(qx), m.Y(qy), 0]}>
            <Poly pts={ellipsePts(0, 0, pr * m.s, pr * m.s, 14)} color="#0c0c0c" order={2} />
          </group>
        );
      })}
      <Puppet char="rick" pose={pr} x={m.X(rick.u)} y={m.Y(rick.v)} scale={rick.ps * m.s} phone={null} order={10} />
      <Puppet char="wife" pose={pw} x={m.X(wife.u)} y={m.Y(wife.v)} scale={wife.ps * m.s} phone={null} order={40} />
      {ph.up > 0.01 && (
        <>
          {ph.lit > 0 && <Glow x={m.X(388 + bz)} y={m.Y(pv)} rx={95} ry={110} op={0.85} order={118} />}
          <Inked pts={P(m, pq)} color="#25252b" ink="#0c0c0e" w={2.4} order={120} />
          <Inked pts={xf(roundRect(30, 30, 8), m.X(374 + bz), m.Y(pv - 28), 0)} color="#16161a" ink="#0c0c0e" w={1.6} order={121} />
          {[-1, 1].map((sd) => <Inked key={sd} pts={xf(ellipsePts(0, 0, 25, 17, 20), m.X(388 + sd * 34 + bz), m.Y(pv + 6), 0)} color={SKIN} ink={INK} w={2.2} order={122} />)}
        </>
      )}
      {strip(m, "sp/fg-audience.png", SCENES.audience.seatY, 130)}
    </Panel>
  );
}

// ── shot 7: Gary in his van (the approved test, unchanged)
export function VanPanel({ f }: { f: number }) {
  const pg = poseAt("gary", f);
  return (
    <Panel w={W} h={BOT_H} zoom={zoomGary(f)} focus={[0, 60]}>
      <Picture file="sp/bg-van.jpg" w={768 * SB} h={1344 * SB} y={BOT_H / 2 - 70 - (672 - 300) * SB} order={0} />
      <Puppet char="gary" pose={pg} x={0} y={-101 - garySettle(f)} scale={0.92} visible={garyHere(f)} />
    </Panel>
  );
}

// ── shot 8: the living room in the evening. The van drives away past the window (the far scenery drifts the other way); steam from the bathroom door and
// from the mug. The receipt on the coffee table is DOM (NobodyV3.tsx), placed with LIVING.
export const LIVING = view(W, 1920, (1920 / 1344) * 1.18, 60, 206);
export const RECEIPT = { u: 428, v: 884, w: 112, h: 92 }; // picture px: where the receipt lies on the coffee table
export function LivingWide({ f }: { f: number }) {
  const m = LIVING;
  const t = f / FPS;
  const pd = poseAt("deniseRobe", f);
  const p = clamp01((t - T.s8a - 0.1) / 1.4);
  const vs = 0.26, vanW = 1151 * vs, vanH = 527 * vs;
  const vx = 262 - 420 * easeIn(p);
  const ps = 0.46 * m.s, PX = 452, PY = 672;
  const mug: [number, number] = [PX + 0.46 * (388 - 393), PY + 0.46 * (722 - 618)];
  const doorSteam = [0, 1, 2, 3].map((i) => { const s = fract(f * 0.011 + i / 4); return { s, u: 640 - 90 * s + i * 6, v: 760 - 150 * s, r: 24 + 30 * s }; });
  return (
    <Panel w={W} h={1920}>
      {bg(m, "sp/bg-living.jpg", 0, { dx: 16 * p })}
      <Picture file="sp/van-side.png" w={vanW * m.s} h={vanH * m.s} x={m.X(vx)} y={m.Y(548 - vanH / 2)} order={2} alpha tint="#7384ad" />
      {bg(m, "sp/bg-living-frame.png", 3, { alpha: true })}
      {doorSteam.map((d, i) => [[0, 0, 1], [d.r * 0.7, d.r * 0.2, 0.75], [-d.r * 0.6, d.r * 0.3, 0.7]].map(([ox, oy, k2], j) => <Poly key={`${i}-${j}`} pts={P(m, ellipsePts(d.u + ox, d.v + oy, d.r * k2, d.r * k2 * 0.8, 24))} color="#ffffff" op={0.55 * Math.sin(Math.PI * d.s)} order={6} />))}
      <Puppet char="deniseRobe" pose={pd} x={m.X(PX)} y={m.Y(PY)} scale={ps} phone={null} order={10} />
      {strip(m, "sp/fg-living.png", SCENES.living.seatY, 100)}
      {[0, 1, 2].map((i) => {
        const pl: number[][] = [];
        for (let j = 0; j < 9; j++) pl.push([mug[0] + (i - 1) * 9 + Math.sin(j * 0.8 + f * 0.09 + i * 2) * 4, mug[1] - j * 6.5, 3.4 - j * 0.28]);
        return <Poly key={i} pts={P(m, ribbon(pl) as [number, number][])} color="#ffffff" op={0.62} order={110} />;
      })}
    </Panel>
  );
}

// ── shot 8c (effects test): the phone on the coffee table, seen from above. Painted props (Qwen, scripts/sp-props-gen.py; cut by scripts/fx-prep.py): the table, Denise's hand in the
// robe's sleeve, the phone (screen side and back) and the receipt slip. Code draws only what a picture cannot hold: the call screen, the receipt's print, the shadows and the light.
const SCREEN = { x: 32, y: 34, w: 486, h: 1159 }; // the glass of the phone picture (px of fx-phone-front.png, from fx-rig.json)
function drawCall(g: CanvasRenderingContext2D) {
  const { x, y, w, h } = SCREEN, cx = x + w / 2;
  g.fillStyle = "#23394a"; g.fillRect(x, y, w, h);
  g.textAlign = "center"; g.fillStyle = "#ffffff"; g.font = "700 46px Arial, Helvetica, sans-serif";
  g.fillText("6:47 PM", cx, y + 150);
  g.fillStyle = "#b9d3e6"; g.font = "700 44px Arial, Helvetica, sans-serif";
  g.fillText("calling...", cx, y + 372);
  g.fillStyle = "#ffffff"; g.font = "900 86px Arial, Helvetica, sans-serif";
  g.fillText("Premier", cx, y + 480); g.fillText("Plumbing", cx, y + 576);
  for (const [bx, col] of [[x + 128, "#e23d3d"], [x + w - 128, "#34a853"]] as [number, string][]) {
    g.beginPath(); g.arc(bx, y + h - 150, 68, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 7; g.strokeStyle = "#16120e"; g.stroke();
  }
}
function drawReceipt(g: CanvasRenderingContext2D) {
  g.textAlign = "center"; g.fillStyle = "#2a1d12";
  g.font = "900 46px Arial, Helvetica, sans-serif"; g.fillText("GARY'S", 183, 128); g.fillText("PLUMBING", 183, 184);
  const dash = (yy: number) => { g.lineWidth = 5; g.strokeStyle = "#8d8570"; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(46, yy); g.lineTo(322, yy); g.stroke(); g.setLineDash([]); };
  dash(226);
  g.textAlign = "left"; g.font = "700 38px Arial, Helvetica, sans-serif"; g.fillText("Water heater", 48, 296);
  g.textAlign = "center"; g.fillStyle = "#b3261e"; g.font = "900 80px Arial, Helvetica, sans-serif"; g.fillText("$1,500", 183, 432);
  g.fillStyle = "#2a1d12"; g.font = "900 64px Arial, Helvetica, sans-serif"; g.fillText("CASH", 183, 530);
  dash(598);
}
export function PremierTable({ f }: { f: number }) {
  const [table, front, back, screen, hand, receipt] = useImages(["sp/fx-table.jpg", "sp/fx-phone-front.png", "sp/fx-phone-back.png", "sp/fx-phone-screen.png", "sp/fx-hand.png", "sp/fx-receipt.png"]);
  const call = useCanvasTexture(554, 1221, (g) => {
    g.drawImage(front.image as CanvasImageSource, 0, 0);
    const ui = document.createElement("canvas"); ui.width = 554; ui.height = 1221;
    const ug = ui.getContext("2d")!; drawCall(ug);
    ug.globalCompositeOperation = "destination-in"; ug.drawImage(screen.image as CanvasImageSource, 0, 0); // only where the glass is
    g.drawImage(ui, 0, 0);
  }, [front, screen]);
  const slip = useCanvasTexture(366, 816, (g) => { g.drawImage(receipt.image as CanvasImageSource, 0, 0); drawReceipt(g); }, [receipt]);
  const p = premierAt(f);
  const { cx, cy, w: PW, h: PH } = PREMIER;
  const X = (u: number) => u - W / 2, Y = (v: number) => 960 - v; // frame px (y down) -> panel px (y up)
  const lift = 1 + 0.08 * p.air;
  const sq = p.squash;
  const sx = Math.max(0.025, Math.abs(p.sx)) * lift * (1 + 0.07 * sq), sy = lift * (1 - 0.05 * sq);
  const px = X(cx + p.buzz - 16 * Math.sin(Math.PI * p.u)), py = Y(cy);
  const rot = -6 + p.tilt;
  // the hand: its fingertips at hx of the phone's half width from the middle; the picture's tip is at (5, 238) of 1031 x 506
  const HK = 0.72, tipX = cx + p.hx * (PW / 2) - 22, tipY = cy + 70;
  const HR = 9; // the arm comes in from below the right edge, so the hand is turned a little about its fingertips
  const hrad = (HR * Math.PI) / 180, hdx = (1031 / 2 - 5) * HK, hdy = -(253 - 238) * HK;
  const hx = X(tipX) + hdx * Math.cos(hrad) - hdy * Math.sin(hrad), hy = Y(tipY) + hdx * Math.sin(hrad) + hdy * Math.cos(hrad);
  const handVisible = p.hx < 2.8;
  const shadowOp = 0.64 - 0.2 * p.air;
  return (
    <Panel w={W} h={1920}>
      <Plane tex={table} x={0} y={0} w={740 * 1.4595} h={1316 * 1.4595} order={0} />
      <Glow x={X(cx)} y={Y(cy - 120)} rx={820} ry={980} op={0.5} order={1} color="rgba(255,206,140,1)" />
      {p.lit && <Glow x={px} y={py} rx={PW * 0.9} ry={PH * 0.72} op={0.34} order={1.5} color="rgba(120,190,255,1)" />} {/* the screen lights the table round the phone, under everything that lies on it */}
      {/* the receipt, under the phone's left edge */}
      <ShadowOf tex={receipt} x={X(138)} y={Y(540)} w={366 * 0.58} h={816 * 0.58} rot={7} dx={6} dy={-8} blur={6} op={0.5} order={2} />
      <ShadowOf tex={receipt} x={X(138)} y={Y(540)} w={366 * 0.58} h={816 * 0.58} rot={7} dx={14} dy={-20} blur={22} op={0.3} order={2.1} />
      <Plane tex={slip} x={X(138)} y={Y(540)} w={366 * 0.58} h={816 * 0.58} rot={7} order={3} />
      {/* the hand, under the phone's edge */}
      {handVisible && <>
        <ShadowOf tex={hand} x={hx} y={hy} w={1031 * HK} h={506 * HK} rot={-HR} dx={16} dy={-26} blur={16} op={0.34} order={4} />
        <Plane tex={hand} x={hx} y={hy} w={1031 * HK} h={506 * HK} rot={-HR} order={6} />
      </>}
      {/* the phone: a tight shadow where it lies, a long soft one while it is in the air */}
      <ShadowOf tex={back} x={px} y={py} w={PW} h={PH} rot={rot} sx={sx} sy={sy} dx={(7 + 34 * p.air) * sx} dy={-11 - 58 * p.air} blur={6 + 22 * p.air} op={shadowOp} order={7} />
      <ShadowOf tex={back} x={px} y={py} w={PW} h={PH} rot={rot} sx={sx} sy={sy} dx={(18 + 56 * p.air) * sx} dy={-26 - 88 * p.air} blur={28 + 16 * p.air} op={0.42 - 0.1 * p.air} order={7.1} />
      <Plane tex={p.front ? call : back} x={px} y={py} w={PW} h={PH} rot={rot} sx={sx} sy={sy} order={8} />
      <Vignette w={W} h={1920} op={0.5} order={30} />
    </Panel>
  );
}
