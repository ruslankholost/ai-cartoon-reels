import React from "react";
import { Inked, Picture, Poly, ellipsePts, ribbon, roundRect, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { pupilAt } from "./sp-eyes";
import { FR } from "./x13-draw";
import { Flat, PX, PY, RG19, W, type Pic } from "./x19-stage";
import { IRIS_K, coverR } from "./x19-sched";

// The pictures of x19 "Screen Time" that the scenes place (cut by scripts/x19-prep.py, numbers in src/x19-rig.json): the tablet (its screen is a hole in the case: the screen's content is drawn behind the picture), the stroller TV (a TV on a hinge over a
// stroller: the screen is a hole too), the rack of chargers, the charger, the light switch (its rocker is drawn again in code), the muffin on its plate (two layers), the two pointing hands, the four customers (three states each) and the toddler and Ross
// as flat pictures with what the code draws over them (glazed pupils). Frame px: x right, y down, 1080 x 1920; a panel point is PX(x), PY(y); the picture px of a sprite are the painted picture's (src/x19-rig.json ox, oy), y down.
const num = (d: Pic, k: string) => d[k] as unknown as number[];
const UNIT = ellipsePts(0, 0, 1, 1, 28);
const PRP = RG19.props, PPL = RG19.people;

// ═════════════════════════════════════════════════════ the tablet: (x, y) the middle of its screen in the frame, `rot` degrees clockwise, `s` frame px per picture px; the children are the screen's content in its design px (1000 x 620 high, `TAB.wd` wide, y up)
// (a function of the base order they are drawn from, 8 under the case's) and go behind the case, which is drawn over them with the screen as a hole; `flip` mirrors the case and its keys (the screen's content is not mirrored); `press` how far each of the two keys is pushed in (picture px)
const TB = PRP.tablet;
export const TAB = (() => {
  const [x0, y0, x1, y1] = num(TB, "screen"), h = y1 - y0, u = h / 620;
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h, u, wd: (x1 - x0) / u, edge: 1153, keys: [250, 330] as [number, number] };
})();
export function Tablet19({ x, y, rot = 0, s = 1, flip = false, press = [0, 0], order, children }: { x: number; y: number; rot?: number; s?: number; flip?: boolean; press?: [number, number]; order: number; children?: (o: number) => React.ReactNode }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={s} sy={s}>
      <Group x={0} y={0} sx={TAB.u} sy={TAB.u}>{children?.(order - 8)}</Group>
      <Group x={0} y={0} sx={flip ? -1 : 1}>
        {TAB.keys.map((ky, i) => <Group key={i} x={TAB.edge - TAB.cx + 10 - press[i]} y={TAB.cy - ky}><Inked pts={roundRect(34, 62, 9, 4)} color="#d9531a" ink="#5a2208" w={4} order={order - 0.2} /></Group>)}
        <Picture file={TB.file} w={TB.w} h={TB.h} x={TB.w / 2 - (TAB.cx - TB.ox)} y={TAB.cy - TB.oy - TB.h / 2} order={order} alpha />
      </Group>
    </Group>
  );
}
/** a point of the tablet (picture px from the middle of its screen, x right, y UP) as a frame point, for a tablet placed at (cx, cy) turned `rot` degrees clockwise at scale s */
export const tabletPt = (cx: number, cy: number, rot: number, px: number, py: number, s = 1): [number, number] => {
  const a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), dx = px * s, dy = -py * s;
  return [cx + dx * c - dy * sn, cy + dx * sn + dy * c];
};
/** the outer tip of one of the keys (0: the upper, volume up; 1: the lower, volume down) as a frame point; `flip`: the keys are on the left */
export const tabKey = (cx: number, cy: number, rot: number, s: number, which: 0 | 1, flip = false, out = 14): [number, number] => tabletPt(cx, cy, rot, (flip ? -1 : 1) * (TAB.edge - TAB.cx + out), TAB.cy - TAB.keys[which], s);

// ═════════════════════════════════════════════════════ the stroller TV: a TV over a stroller (seen from the front), the TV on a hinge at the middle of its bottom edge; (x, y) the hinge in the frame, `k` frame px per picture px, `up` how upright the TV is (0.06 flat on top
// of the stroller .. 1 standing); the children are the screen's content (design px, `TV.wd` wide; a function of the base order they are drawn from) behind the TV's frame
const TVL = PRP.stv_tv, STL = PRP.stv_stroller;
export const TV = (() => {
  const [x0, y0, x1, y1] = num(TVL, "screen"), [hx, hy] = num(TVL, "hinge"), h = y1 - y0, u = h / 620;
  return { hx, hy, u, wd: (x1 - x0) / u, w: x1 - x0, h, dx: (x0 + x1) / 2 - hx, dy: hy - (y0 + y1) / 2, rim: num(TVL, "rim") };
})();
export function StrollerTV({ x, y, k, up = 1, order, stroller = true, tint, children }: { x: number; y: number; k: number; up?: number; order: number; stroller?: boolean; tint?: string; children?: (o: number) => React.ReactNode }) {
  return (
    <>
      {stroller && <Flat d={STL} apx={TV.hx} apy={TV.hy} x={x} y={y} k={k} order={order} tint={tint} />}
      <Group x={PX(x)} y={PY(y)} sx={k} sy={k * up}>
        <Group x={TV.dx} y={TV.dy} sx={TV.u} sy={TV.u}>{children?.(order + 1)}</Group>
        <Picture file={TVL.file} w={TVL.w} h={TVL.h} x={TVL.w / 2 - (TV.hx - TVL.ox)} y={TV.hy - TVL.oy - TVL.h / 2} order={order + 10} alpha tint={tint} />
      </Group>
    </>
  );
}
/** a point of the TV's picture (picture px, y down) as a frame point for a TV placed by StrollerTV at (x, y), scale k, standing */
export const tvPt = (x: number, y: number, k: number, px: number, py: number): [number, number] => [x + (px - TV.hx) * k, y + (py - TV.hy) * k];

// ═════════════════════════════════════════════════════ the rack of chargers: (x, y) the middle of its foot; `rot` degrees clockwise about the foot, `dx` px sideways (the rattle); `gone`: the first charger is off its hook
const RKD = PRP.rack, RKG = RKD.gone as unknown as Pic;
export function Rack19({ x, y, k, rot = 0, dx = 0, gone = false, order }: { x: number; y: number; k: number; rot?: number; dx?: number; gone?: boolean; order: number }) {
  return <Flat d={gone ? RKG : RKD} apx={RKD.ox + RKD.w / 2} apy={RKD.oy + RKD.h} x={x + dx} y={y} k={k} rot={-rot} order={order} />;
}
/** the rack's picture px of the middle of the first (left) hook's brick, for where a charger is taken from: as a frame point for a rack placed by Rack19 at (x, y), scale k */
export const rackPt = (x: number, y: number, k: number, px: number, py: number): [number, number] => [x + (px - (RKD.ox + RKD.w / 2)) * k, y + (py - (RKD.oy + RKD.h)) * k];

// ═════════════════════════════════════════════════════ one charger (a brick with two prongs and a coiled cable, the prongs up): (x, y) the middle of the brick, `rot` degrees clockwise
const CHD = PRP.charger, CHB = num(CHD, "block");
export function Charger19({ x, y, k, rot = 0, order }: { x: number; y: number; k: number; rot?: number; order: number }) {
  return <Flat d={CHD} apx={(CHB[0] + CHB[2]) / 2} apy={(CHB[1] + CHB[3]) / 2} x={x} y={y} k={k} rot={-rot} order={order} />;
}

// ═════════════════════════════════════════════════════ the light switch on its plate: the painted rocker is covered by a rocker drawn in code, so that it can flip: `flip` 1 (the top half is the raised one) .. -1 (the bottom half), 0 between (a flat flash);
// (x, y) the middle of the rocker in the frame
const SWD = PRP.switch, ROCK = num(SWD, "rocker");
export function SwitchWall({ x, y, k, flip, order }: { x: number; y: number; k: number; flip: number; order: number }) {
  const w = ROCK[2] - ROCK[0] + 4, h = ROCK[3] - ROCK[1] + 4, hi = "#fffdf0", lo = "#e2d3a8", sq = flip === 0 ? 0.9 : 1;
  return (
    <Flat d={SWD} apx={(ROCK[0] + ROCK[2]) / 2} apy={(ROCK[1] + ROCK[3]) / 2} x={x} y={y} k={k} order={order}>
      {() => (
        <Group x={0} y={0} sx={1} sy={sq}>
          <Inked pts={roundRect(w, h, 14, 5)} color="#f4ead0" ink="#141414" w={4.5} order={order + 1} />
          <Poly pts={roundRect(w - 14, h / 2 - 8, 8, 4).map(([a, b]) => [a, b + h / 4] as Pt)} color={flip >= 0 ? hi : lo} order={order + 1.2} />
          <Poly pts={roundRect(w - 14, h / 2 - 8, 8, 4).map(([a, b]) => [a, b - h / 4] as Pt)} color={flip > 0 ? lo : hi} order={order + 1.2} />
          <Poly pts={ribbon([[-w / 2 + 6, 0, 3], [w / 2 - 6, 0, 3]])} color="#8a7a50" order={order + 1.3} op={flip === 0 ? 0.25 : 0.7} />
        </Group>
      )}
    </Flat>
  );
}

// ═════════════════════════════════════════════════════ the muffin on its plate: both are the one picture's, cut apart; (x, y) the frame point of the plate's middle (picture (504, 697)); the muffin stands where it stood in the picture and is moved by (dx, dy)
// px, squashed (sx, sy) about its foot and turned `rot` degrees (counter-clockwise); `plate: false` draws the muffin alone
const MUD = PRP.muffin, MPD = PRP.muffin_plate, MFOOT = num(MUD, "foot"), PMID: [number, number] = [504, 697];
export function MuffinPlate({ x, y, k, dx = 0, dy = 0, sx = 1, sy = 1, rot = 0, plate = true, order }: { x: number; y: number; k: number; dx?: number; dy?: number; sx?: number; sy?: number; rot?: number; plate?: boolean; order: number }) {
  const fx = x + (MFOOT[0] - PMID[0]) * k + dx, fy = y + (MFOOT[1] - PMID[1]) * k + dy;
  return (
    <>
      {plate && <Flat d={MPD} apx={PMID[0]} apy={PMID[1]} x={x} y={y} k={k} order={order} />}
      <Flat d={MUD} apx={MFOOT[0]} apy={MFOOT[1]} x={fx} y={fy} k={k} sx={sx} sy={sy} rot={rot} order={order + 1} />
    </>
  );
}
export const MUFFIN_W = MUD.w, PLATE_W = MPD.w;

// ═════════════════════════════════════════════════════ the pointing hands: Ross's (his tattooed forearm and watch come in from the left, the finger points right) and the mom's (her lavender sleeve from the right, the finger points left);
// the fingertip on the frame point `tip`, `rot` degrees counter-clockwise, `k` frame px per picture px
export function PointHand({ who, tip, rot = 0, k = 0.9, order = 50, tint }: { who: "ross" | "mom"; tip: [number, number]; rot?: number; k?: number; order?: number; tint?: string }) {
  const d = who === "ross" ? PPL.hand_ross_point : PPL.hand_mom_point, t = num(d, "tip");
  return <Flat d={d} apx={t[0]} apy={t[1]} x={tip[0]} y={tip[1]} k={k} rot={rot} order={order} tint={tint} />;
}

// ═════════════════════════════════════════════════════ glazed eyes over a painted face: over each painted pupil a disc of the eye's white, then a pale-blue iris with the dark pupil in it and the screen's reflection; `gaze` (-1 .. 1, x right, y down) moves
// them inside the eye (src/sp-eyes.ts pupilAt, keeping the iris in the white). Drawn in the children of a Flat, about the picture point (apx, apy) (picture px, y up in the children); `eyes` and `pupils` are the picture's (scripts/x19-prep.py)
export function GlazePupils({ apx, apy, eyes, pupils, white, gaze = [0, 0], order, margin = 3, lit = 1, tint }: { apx: number; apy: number; eyes: { cx: number; cy: number; rx: number; ry: number }[]; pupils: number[][]; white: string; gaze?: [number, number]; order: number; margin?: number; lit?: number; tint?: string }) {
  const K = (px: number, py: number): [number, number] => [px - apx, apy - py];
  return (
    <>
      {eyes.map((e, i) => {
        const q = pupils[Math.min(i, pupils.length - 1)] ?? [e.cx, e.cy, 8], r = q[2], R = r * IRIS_K, home = K(q[0], q[1]), [nx, ny] = pupilAt(e, [q[0], q[1]], R, gaze, margin), to = K(nx, ny);
        return (
          <React.Fragment key={i}>
            <Poly pts={ellipsePts(home[0], home[1], coverR(e, q), coverR(e, q), 20)} color={mulHex(white, tint)} order={order} />
            <Poly pts={ellipsePts(to[0], to[1], R, R, 24)} color={mulHex("#8cc8ff", tint)} order={order + 0.1} op={0.55 + 0.4 * lit} />
            <Poly pts={ellipsePts(to[0], to[1], r * 1.05, r * 1.05, 20)} color={mulHex("#0a0d14", tint)} order={order + 0.2} />
            <Poly pts={roundRect(r * 0.9, r * 0.55, r * 0.2, 4).map(([a, b]) => [a + to[0] - r * 0.36, b + to[1] + r * 0.42] as Pt)} color={mulHex("#eaf7ff", tint)} order={order + 0.3} op={0.35 + 0.6 * lit} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the four customers (a row of heads and shoulders over their table's edge, each two layers: the person and the strip of table in front of him with what lies over it, a laptop, a hand): (x, y) the frame point of
// the table's top edge in the middle of the row, `k` frame px per picture px; `state` of each (plain, glazed, cash); `stretch` how far each stands up (the person grows about the table's edge, the table stays), `gaze` where the glazed ones look; the table is
// carried on to the frame's edges in code
export type CState = "plain" | "glazed" | "cash";
const CP = (st: CState, i: number) => PPL[`cust_${st}_${i + 1}`], CT = (st: CState, i: number) => PPL[`cust_${st}_${i + 1}_tab`];
export const CUST_A: [number, number] = [672, 677];
/** a hex colour times a tint (each channel, 0 .. 255): the colour of code-drawn patches on a person drawn with a tint */
export const mulHex = (c: string, t?: string) => {
  if (!t) return c;
  const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], a = p(c), b = p(t);
  return "#" + a.map((v, i) => Math.round((v * b[i]) / 255).toString(16).padStart(2, "0")).join("");
};
export function TableBand({ y, k, order, tint }: { y: number; k: number; order: number; tint?: string }) {
  const Y = (r: number) => y + (r - CUST_A[1]) * k;
  return (
    <>
      <Poly pts={FR(-40, Y(677), W + 40, Y(754))} color={mulHex("#382c12", tint)} order={order} />
      <Poly pts={FR(-40, Y(679), W + 40, Y(731))} color={mulHex("#d8b16e", tint)} order={order + 0.01} />
      <Poly pts={FR(-40, Y(731), W + 40, Y(735))} color={mulHex("#2f1300", tint)} order={order + 0.01} />
      <Poly pts={FR(-40, Y(735), W + 40, Y(752))} color={mulHex("#967032", tint)} order={order + 0.01} />
    </>
  );
}
export function Customers19({ x, y, k, state, order, stretch, gaze, lit = 1, tint }: { x: number; y: number; k: number; state: (i: number) => CState; order: number; stretch?: (i: number) => number; gaze?: (i: number) => [number, number]; lit?: number; tint?: string }) {
  return (
    <>
      <TableBand y={y} k={k} order={order - 0.5} tint={tint} />
      {[0, 1, 2, 3].map((i) => {
        const st = state(i), d = CP(st, i), tb = CT(st, i);
        return (
          <React.Fragment key={i}>
            <Flat d={d} apx={CUST_A[0]} apy={CUST_A[1]} x={x} y={y} k={k} sy={stretch?.(i) ?? 1} order={order + i * 0.1} tint={tint}>
              {() => st === "glazed" && d.eyes && d.pupils ? <GlazePupils apx={CUST_A[0]} apy={CUST_A[1]} eyes={d.eyes} pupils={d.pupils} white={(d.white as string) ?? "#fdfdfb"} gaze={gaze?.(i) ?? [0, 0]} order={order + i * 0.1 + 0.05} lit={lit} tint={tint} /> : null}
            </Flat>
            <Flat d={tb} apx={CUST_A[0]} apy={CUST_A[1]} x={x} y={y} k={k} order={order + i * 0.1 + 0.07} tint={tint} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ Ross as a flat picture (his own painted head, scaled so that his eyes are the master's size: `ek`), placed by the middle of his head like the puppet: (cx, cy) the head's middle in the frame, `E` the puppet's
// scale (frame px per rig px); the middle of the eyes of the master is 8.2 rig px under the middle of his head's disc
export function RossFlat({ d, cx, cy, E, rot = 0, sx = 1, sy = 1, order, tint, children }: { d: Pic; cx: number; cy: number; E: number; rot?: number; sx?: number; sy?: number; order: number; tint?: string; children?: (g: { ax: number; ay: number }) => React.ReactNode }) {
  const a = num(d, "anchor"), ek = d.ek as unknown as number;
  return <Flat d={d} apx={a[0]} apy={a[1]} x={cx} y={cy + 8.2 * E} k={E * ek} rot={rot} sx={sx} sy={sy} order={order} tint={tint}>{children}</Flat>;
}
void UNIT;
