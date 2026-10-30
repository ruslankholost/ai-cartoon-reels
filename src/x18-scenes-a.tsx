import React from "react";
import { Inked, Picture, Poly, ellipsePts, ribbon, roundRect, type Pt } from "./sp-puppet";
import { Group, type View } from "./pen-stage";
import { Wash, FR } from "./x13-draw";
import { rect } from "./x09-stage";
import { WindStreaks } from "./x17-draw";
import { ClockHands } from "./x10-draw";
import rig11 from "./x11-rig.json" with { type: "json" };
import { Bill, Bolt, Brow, Coin, KidHand, LookPupils, MILK, MilkDrips, MilkPuddle, MilkSplash, MilkStream, Smear, Tape } from "./x18-draw";
import { NowHiring, OatMilkQuad, PriceTag, SIGN, SignText } from "./x18-props";
import { buzz, doorSwing, momGaze, momLid, pumpAt, rossMouthW, rossPose18 } from "./x18-act";
import { shotX } from "./x18-shared";
import { CounterFront, Flat, PL, PX, PY, PlateM, RG18, RossP, TalkMouth, cam, counterView, hasBody, kid, rossAt, rossPt, type Pic, type RossBody } from "./x18-stage";
import {
  BELL_T, CLOCK_T, COIN_T, CUPS_T, DRIP_T, FLIPMID_T, FLIP_T, FPS, GIGGLE_T, GLUG2_T, GLUG_T, LICK_T, RIP_T, SLAM_T, SLAP_T, THUD_T, TICK_T, WAGON_T, ZAP_T,
  clamp01, ease, hash, inShot, lerp, mouthAt, popP, squashAt, talkMove, twos, type ShotId,
} from "./x18-sched";

// The scenes of x18 "Unattended": one canvas per shot, hard cuts. Each is the art of the shot (the pictures cut by scripts/x18-prep.py, src/x18-rig.json; x10's counter wall with its clock, its wall with the window and the door, its till seen from above and its
// apron body of Ross, x11's pastry case, x16's hand) under the effects and writing drawn in code (src/x18-draw.tsx, src/x18-props.tsx). Plates are seen through a view `m` (src/x09-stage.tsx cam: plate px -> frame px); the flat people (a picture cut out, a
// mouth, lids, brows and pupils drawn over it) are placed by a picture point and a scale (src/x17-stage.tsx Flat); Ross is a puppet placed by the frame point of the middle of his head and a scale. A shot's `m` never moves: the camera's push-in and shake come
// from the canvas (src/x18-shared.tsx). Frame px: x right, y down, 1080 x 1920.
const t = (f: number) => f / FPS;
const W = 1080, H = 1920;
type Box = [number, number, number, number];
const fp = (m: View, u: number, v: number): [number, number] => [W / 2 + m.X(u), H / 2 - m.Y(v)];   // a plate point as a frame point
const pp = (x: number, y: number): Pt => [PX(x), PY(y)];                                           // a frame point as a panel point
const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
const EDGE_SEAT = { top: "#d2b677", bottom: "#7f5c33", side: "#ecd391", sideLow: "#7f5c33", split: 1155 };
const sm = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const P = RG18.people, PRP = RG18.props, PLT = RG18.plates;
const pic = (k: string) => P[k] as Pic;
const HEAD_R = 195;   // Ross's head radius in the rig's px

// ═════════════════════════════════════════════════════ the plates: the counter wall (2, 3b, 4, 6, 9, 17, 18, 22, 23, 25), the wall with the window and the door (13, 14, 15, 16, 19), the seating corner (3a, 5, 8, 11, 12, 24), the till from above (1)
const CounterBg = ({ m }: { m: View }) => <PlateM m={m} file={PL.counter.file} edge={EDGE_COUNTER} />;
const WindowBg = ({ m }: { m: View }) => <PlateM m={m} file={PL.window.file} edge={EDGE_WINDOW} />;
const SeatBg = ({ m }: { m: View }) => <PlateM m={m} file={PLT.seating.file} edge={EDGE_SEAT} />;
/** the café's floor in code, from the frame row `y` down (the seating plate's own is too low for a close shot: a table's foot would stand on the wall): the plate's brown planks and their seams */
function Floor({ y, s, order = 6 }: { y: number; s: number; order?: number }) {
  return (
    <>
      <Poly pts={FR(-40, y, W + 40, H + 60)} color="#7f5c33" order={order} />
      <Poly pts={FR(-40, y - 3, W + 40, y + 3)} color="#5b3d1b" order={order + 0.1} />
      {[1, 2, 3, 4].map((i) => <Poly key={i} pts={FR(-40, y + 36 * s * i - 2, W + 40, y + 36 * s * i + 2)} color="#6a4a22" order={order + 0.1} />)}
    </>
  );
}

// ═════════════════════════════════════════════════════ 1: the open till seen from above: the drawer springs open with a jolt, a thick waterfall of oat milk pours in from the top of the frame, coins and bills jump and float
const TILL_M = cam(1.4286, 384, 672);
const TILL_SLOT_U = [150, 265, 380, 495, 628], TILL_CUP_U = [150, 305, 460, 615];
/** how far the drawer is off its place (frame px; + is toward the viewer): it is pulled open on the first frames and overshoots */
const drawerDy = (f: number) => [-300, -150, 34, -12, 6][f] ?? 0;
/** the money that the milk throws up: coins and bills lying on the five slots (x by slot), jumping with the shock of the milk's landing, the nearest first; `bill` or coin */
const JUMPERS = Array.from({ length: 15 }, (_, i) => ({ bill: i % 5 === 4, h: (q: number) => hash(i * q + 11.3), slot: i % 5 }));
function TillShot({ f }: { f: number }) {
  const tt = t(f), m = TILL_M, dy = drawerDy(f), reach = ease((f - Math.round(GLUG_T * FPS)) / 2), land: [number, number] = [540, 800];
  return (
    <Group x={0} y={-dy}>
      <PlateM m={m} file={PL.till.file} edge={{ top: "#4a2f19", bottom: "#4a2f19" }} />
      {TILL_SLOT_U.map((u, i) => [0, 1].map((j) => { const [x, y] = fp(m, u, 470 + 68 * j); return <Bill key={`${i}${j}`} x={x} y={y} h={42} rot={(i + j * 3) % 2 ? 3 : -3} order={8 + j * 0.2} />; }))}
      {TILL_CUP_U.map((u, i) => [0, 1, 2].map((j) => { const [x, y] = fp(m, u, 965); return <Coin key={`${i}${j}`} x={x - 26 + 26 * j} y={y - 12 + (j % 2) * 24} r={30} rot={j * 40} order={8 + j * 0.3} />; }))}
      <MilkSplash at={land} t={tt} t0={COIN_T - 0.02} R={210} order={14} />
      {JUMPERS.map((it, i) => {
        const x0 = fp(m, TILL_SLOT_U[it.slot], 0)[0] + (it.h(1.7) - 0.5) * 40, y0 = 560 + 300 * it.h(2.9), dist = Math.hypot(x0 - land[0], y0 - land[1]), tau = tt - COIN_T - dist / 2600;
        if (tau < 0) return it.bill ? <Bill key={i} x={x0} y={y0} h={42} rot={(it.h(3.3) - 0.5) * 12} order={20 + i * 0.01} /> : <Coin key={i} x={x0} y={y0} r={32} rot={it.h(3.3) * 60} order={20 + i * 0.01} />;
        const rise = 150 + 230 * it.h(4.1), v0 = Math.sqrt(2 * 3400 * rise), yy = y0 - v0 * tau + 0.5 * 3400 * tau * tau, floating = yy >= y0, y = floating ? y0 + 5 * Math.sin((tt + it.h(5)) * 9) : yy, x = x0 + (it.h(6.1) - 0.5) * 160 * Math.min(tau, 0.5);
        return it.bill ? <Bill key={i} x={x} y={y} h={42} rot={(it.h(3.3) - 0.5) * 12 + 90 * (it.h(7.2) - 0.5) * Math.min(1, tau * 2)} flip={floating ? 1 : Math.cos(tau * 14 * (0.5 + it.h(8)))} order={20 + i * 0.01} /> : <Coin key={i} x={x} y={y} r={32} spin={floating ? 0 : tau * 2.4 * (0.5 + it.h(8))} order={20 + i * 0.01} />;
      })}
      <MilkStream a={[540, -60]} b={[540, 330]} c={land} w={400} t={tt} reach={reach} order={40} />
    </Group>
  );
}

// ═════════════════════════════════════════════════════ 2 and 3b: the toddler on the counter tips the carton (OAT MILK on its blank side, in code) into the register's drawer, pulled out in front of him and filling up; a bump-in on his giggle (2), then the close-up of his grin and the carton (3b)
const TD_A: [number, number] = [500, 920];                                // his picture point between the feet: the anchor
const CARTON_QUAD: [number, number][] = [[316, 505], [458, 546], [376, 772], [229, 728]];   // the carton's blank front face in his picture (px: its four corners, top left, top right, bottom right, bottom left)
const CARTON_CAP: [number, number] = [290, 820];                          // the round cap at the lower end of the carton
const tdPt = (x: number, y: number, k: number, px: number, py: number): [number, number] => [x + (px - TD_A[0]) * k, y + (py - TD_A[1]) * k];
function ToddlerPour({ x, y, k, order, rot = 0, sx = 1, sy = 1 }: { x: number; y: number; k: number; order: number; rot?: number; sx?: number; sy?: number }) {
  const d = pic("toddler_pour");
  return (
    <Flat d={d} apx={TD_A[0]} apy={TD_A[1]} x={x} y={y} k={k} rot={rot} sx={sx} sy={sy} order={order}>
      {({ ax, ay }) => <OatMilkQuad quad={CARTON_QUAD.map(([px, py]) => kid(d, ax, ay, px, py))} order={order + 1} />}
    </Flat>
  );
}
/** the register's drawer pulled out toward the viewer (plate px, the counter wall's): its open top with the five slots of bills and the coin cups, its front panel with a handle, and the milk in it, filling up (`fill` 0 .. 1) */
function PulledDrawer({ m, fill, order }: { m: View; fill: number; order: number }) {
  const q = (u: number, v: number): Pt => { const [x, y] = fp(m, u, v); return pp(x, y); };
  const B = [62, 850, 250, 850], F = [38, 930, 274, 930];
  const top = [q(B[0], B[1]), q(B[2], B[3]), q(F[2], F[3]), q(F[0], F[1])], lip = [q(F[0], F[1]), q(F[2], F[3]), q(F[2] + 5, F[3] + 26), q(F[0] - 5, F[1] + 26)];
  const along = (u: number, v: number): [number, number] => [B[0] + (F[0] - B[0]) * v + (B[2] - B[0] + (F[2] - F[0] - (B[2] - B[0])) * v) * u, B[1] + (F[1] - B[1]) * v];   // a point of the open top: u across (0 .. 1), v from the back to the front
  const mid = fp(m, ...along(0.5, 0.55));
  return (
    <>
      <Inked pts={lip} color="#a5abb3" ink="#2d333b" w={5} order={order + 1} />
      <Inked pts={top} color="#3a4049" ink="#2d333b" w={5} order={order} />
      {[1, 2, 3, 4].map((i) => <Poly key={i} pts={ribbon([[...q(...along(i / 5, 0.02)), 2.2], [...q(...along(i / 5, 0.98)), 2.2]])} color="#656d77" order={order + 0.6} />)}
      {[0, 1, 3, 4].map((i) => { const [x, y] = fp(m, ...along((i + 0.5) / 5, 0.16)); return <Bill key={i} x={x} y={y} h={46} rot={(i - 2) * 4} order={order + 0.7} />; })}
      {[0, 1, 2, 3].map((i) => { const [x, y] = fp(m, ...along((i + 1) / 5, 0.72)); return <Coin key={i} x={x} y={y} r={26} rot={i * 40} order={order + 0.7} />; })}
      {fill > 0.02 && <MilkPuddle x={mid[0]} y={mid[1]} w={430 * fill} h={170 * fill} order={order + 0.9} seed={4} />}
      <Poly pts={[q(122, 940), q(190, 940), q(190, 946), q(122, 946)]} color="#2d333b" order={order + 1.6} />
    </>
  );
}
const POUR_M = cam(3.0, 240, 707);
const POUR = { x: 700, y: 1400, k: 0.95 };
function PourShot({ f }: { f: number }) {
  const tt = t(f), m = POUR_M, a = tt - GIGGLE_T - 0.04, bump = a >= 0 ? 1 + 0.08 * Math.exp(-a / 0.07) * Math.cos(a * 40) : 1;
  const giggle = f < 42 ? (twos(f) % 4 < 2 ? 0 : -9) : 0, tilt = 1.2 * Math.sin(twos(f) * 0.9);
  const cap = tdPt(POUR.x, POUR.y + giggle, POUR.k, CARTON_CAP[0], CARTON_CAP[1]), land: [number, number] = [cap[0] - 14, 1498];
  return (
    <>
      <CounterBg m={m} />
      <Group x={PX(540)} y={PY(1400)} sx={bump} sy={bump}><Group x={-PX(540)} y={-PY(1400)}>
        <ToddlerPour x={POUR.x} y={POUR.y + giggle} k={POUR.k} rot={tilt} order={30} />
        <PulledDrawer m={m} fill={clamp01(0.5 + (f - 20) / 36)} order={46} />
        <MilkStream a={[cap[0], cap[1] + 10]} b={[cap[0] - 14, cap[1] + 60]} c={land} w={58} t={tt} reach={1} order={60} />
        <MilkSplash at={land} t={tt} t0={GLUG_T} R={90} pool={0} order={62} />
      </Group></Group>
    </>
  );
}
const GRIN_M = cam(3.0, 470, 560);
const GR = { x: 520, y: 1530, k: 1.35 };
function GrinShot({ f }: { f: number }) {
  const tt = t(f), m = GRIN_M, bob = 5 * Math.sin(tt * 17), cap = tdPt(GR.x, GR.y + bob, GR.k, CARTON_CAP[0], CARTON_CAP[1]);
  return (
    <>
      <CounterBg m={m} />
      <ToddlerPour x={GR.x} y={GR.y + bob} k={GR.k} rot={1.4 * Math.sin(tt * 13)} order={30} />
      <MilkStream a={[cap[0], cap[1] + 14]} b={[cap[0] - 12, cap[1] + 120]} c={[cap[0] - 24, 2060]} w={74} t={tt} reach={1} order={60} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the mom at her table by the window (3a, 5, 8, 11, 12), standing (13, 23, 24). A flat cut-out: her painted face is a flat line; her mouth, lids, brows (she has none painted in mom-phone) and pupils are drawn over it.
// Her table is in the picture: the seating plate has none (scripts/x18-prep.py clear_seating); a floor in code carries its foot
type Eye = { cx: number; cy: number; rx: number; ry: number };
/** the mom's lids: over each big round white eye the skin comes down from the top by `c` (0 open .. 1 shut): the upper part of the eye's own ellipse, a little bigger than the white so that its outline is covered, in her skin colour, with a dark line on its lower edge */
function EyeLids({ eyes, d, ax, ay, skin, c, order }: { eyes: Eye[]; d: Pic; ax: number; ay: number; skin: string; c: number; order: number }) {
  if (c <= 0.02) return null;
  return (
    <>
      {eyes.map((e, i) => {
        const [x, y] = kid(d, ax, ay, e.cx, e.cy), rx = e.rx + 3.5, ry = e.ry + 3.5, yl = y + ry - 2 * ry * Math.min(1, c), a0 = Math.asin(Math.max(-1, Math.min(1, (yl - y) / ry)));
        const arc: Pt[] = Array.from({ length: 29 }, (_, j) => { const a = a0 + ((Math.PI - 2 * a0) * j) / 28; return [x + rx * Math.cos(a), y + ry * Math.sin(a)] as Pt; });
        const xr = x + rx * Math.cos(a0), xl = x - rx * Math.cos(a0), line = Array.from({ length: 9 }, (_, j) => { const u = j / 8; return [xl + (xr - xl) * u, yl - 0.09 * ry * Math.sin(Math.PI * u), 4.2] as number[]; });
        return (
          <React.Fragment key={i}>
            <Poly pts={arc} color={skin} order={order} />
            <Poly pts={ribbon(line)} color="#2a1a0a" order={order + 0.1} />
          </React.Fragment>
        );
      })}
    </>
  );
}
const MOM_A: Record<string, [number, number]> = { mom_phone: [485, 360], mom_glasses: [486, 351], mom_walk: [493, 286], mom_shock: [487, 345] };
const BROW_COL = "#8c5f20";
type BrowSet = "none" | "flat" | "one" | "smug";
const BROWS: Record<Exclude<BrowSet, "none">, { dy: number; rot: number; arch: number }[]> = {
  flat: [{ dy: 0, rot: 3, arch: 5 }, { dy: 0, rot: -3, arch: 5 }],
  one: [{ dy: 0, rot: 4, arch: 6 }, { dy: 28, rot: -9, arch: 17 }],
  smug: [{ dy: -3, rot: 0, arch: 5 }, { dy: 16, rot: -6, arch: 12 }],
};
function Mom({ f, who, x, y, k, flip = false, rot = 0, sx = 1, sy = 1, order, brows = "none", lidBase = 0, gaze, talk = false, pr, anchor }: { f: number; who: "mom_phone" | "mom_glasses" | "mom_walk" | "mom_shock"; x: number; y: number; k: number; flip?: boolean; rot?: number; sx?: number; sy?: number; order: number; brows?: BrowSet; lidBase?: number; gaze?: [number, number]; talk?: boolean; pr?: number; anchor?: [number, number] }) {
  const d = pic(who), [apx, apy] = anchor ?? MOM_A[who], eyes = d.eyes!, skin = pic("mom_phone").skin ?? "#ffdca2", lid = momLid(f, lidBase);
  return (
    <Flat d={d} apx={apx} apy={apy} x={x} y={y} k={k} rot={rot} sx={sx} sy={sy} flip={flip} order={order}>
      {({ ax, ay }) => (
        <>
          {gaze && d.pupils && <LookPupils apx={apx} apy={apy} eyes={eyes} pupils={d.pupils} gaze={gaze} pr={pr} white={(d.white as string) ?? "#fdfdfb"} order={order + 1} />}
          {talk && d.grin && <TalkMouth grin={{ ...d.grin, skin }} d={d} ax={ax} ay={ay} shape={mouthAt("MOM", f)} order={order + 2} />}
          {lid > 0.02 && <EyeLids eyes={eyes} d={d} ax={ax} ay={ay} skin={skin} c={lid} order={order + 3} />}
          {brows !== "none" && eyes.map((e, i) => { const [bx, by] = kid(d, ax, ay, e.cx, e.cy - e.ry - 18), b = BROWS[brows][i]; return <Brow key={i} x={bx} y={by + b.dy} w={e.rx * 1.55} th={11} rot={b.rot} arch={b.arch} color={BROW_COL} order={order + 4} />; })}
        </>
      )}
    </Flat>
  );
}
/** the seating plate's view for her at scale k: the plate's scale s is her scale over 0.51 (her table as wide as the plate's own was), the window's sill (row 775) a little under her anchor and above her table; also where the floor starts (her table's foot) */
function seatView(k: number, ay: number, ax = 540): { m: View; s: number; floor: number } {
  const s = k / 0.51, sill = ay + 330 * k, v0 = 775 - (sill - 960) / s;
  return { m: cam(s, 415 + (540 - ax) / s, v0), s, floor: ay + (960 - 360) * k };
}
const wob = (f: number, who: "MOM") => talkMove(who, f);
function SeatScene({ f, k, ay, flip = false, ax = 540, who = "mom_phone", brows = "none", lidBase = 0, gaze, talk = true, pr, ox = 0 }: { f: number; k: number; ay: number; flip?: boolean; ax?: number; who?: "mom_phone" | "mom_glasses"; brows?: BrowSet; lidBase?: number; gaze?: [number, number]; talk?: boolean; pr?: number; ox?: number }) {
  const v = seatView(k, ay, ax), mv = wob(f, "MOM");
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      <Mom f={f} who={who} x={ax + ox} y={ay - mv.bob * k} k={k} rot={mv.tilt * 0.35} flip={flip} order={20} brows={brows} lidBase={lidBase} gaze={gaze} talk={talk} pr={pr} />
    </>
  );
}
const Mom1Shot = ({ f }: { f: number }) => <SeatScene f={f} k={1.12} ay={770} brows="flat" />;
const Mom2Shot = ({ f }: { f: number }) => <SeatScene f={f} k={1.5} ay={800} brows="one" />;
const SmugShot = ({ f }: { f: number }) => <SeatScene f={f} k={1.25} ay={860} flip ax={600} brows="smug" lidBase={0.42} />;
/** 11: three frames of the phone picture, her eyes coming up, then the sunglasses are down on her nose (a pop on the swap) and she looks at us; 12: tighter, her pupils tick (code pupils over the painted low ones) */
function GlassesShot({ f }: { f: number }) {
  const swap = f >= 330, pop = swap ? 1 + 0.035 * Math.exp(-(f - 330) / 2.5) : 1, g: [number, number] = f < 330 ? [0.1, 0.2 - 0.35 * (f - 327)] : [0.1, -0.55];
  return <SeatScene f={f} k={1.3 * pop} ay={850} who={swap ? "mom_glasses" : "mom_phone"} gaze={g} brows={swap ? "none" : "flat"} pr={9} />;
}
const DartsShot = ({ f }: { f: number }) => <SeatScene f={f} k={2.0} ay={880} who="mom_glasses" gaze={momGaze(f)} talk={false} pr={10} />;

// ═════════════════════════════════════════════════════ 4, 6 and 17: Ross behind the counter in his apron (x10's apron body: he holds its straps), finger up (17); seen from the customers' side; the counter's own front layer hides what is below its top.
// The view puts the counter's top edge (plate row 795) on frame row `yc`; Ross's head is placed by its middle and its radius so that the shot says how big he is; E = frame px per rig px
function RossCounter({ f, m, cx, cy, E, body }: { f: number; m: View; cx: number; cy: number; E: number; body: RossBody }) {
  const r = rossAt(cx, cy, E), pose = rossPose18(f, body);
  return (
    <>
      <RossP x={r.x} y={r.y} E={E} order={40} body={body} pose={pose} mouthW={rossMouthW(f)} />
      <CounterFront m={m} order={80} />
    </>
  );
}
const VIEW_S = (E: number) => (E * HEAD_R) / 80;
/** the view of the counter plate at the scale that makes Ross's head `E` big (x10 puts a head of radius 80 on the plate at that scale) with the counter's top edge on frame row `yc` */
const rossView = (E: number, yc: number, u = 384) => counterView(VIEW_S(E), yc, u);
const R4 = { E: 1.0, yc: 968, cx: 540 }, R6 = { E: 1.55, yc: 1290, cx: 500 }, R17 = { E: 1.0, yc: 1010, cx: 590 };
// 4: the oat milk on the counter: a thin flat sheet along the counter's front edge (its back edge gently wavy, 34-58 px deep, tapering to nothing at both ends), four runs down the counter's front (the milk hangs fat over the edge, a drop at the end of each) and a drop that
// lets go from three of them (the first on its sound, DRIP_T). The sheet lies above the caption's box (the words are at y 1279-1478, x 198-786 in this shot) and the runs and drops keep out of that x range: nothing white is behind the words
const SHEET_X: [number, number] = [34, 1046];
const SHEET_BACK = (x: number) => 46 + 9 * Math.sin(x * 0.019 + 0.8) + 5 * Math.sin(x * 0.043 + 2.1);
const RUNS: { x: number; len: number; w: number; sway: number; k: number; drop?: { at: number; period: number } }[] = [
  { x: 70, len: 74, w: 14, sway: 3, k: 15 },
  { x: 152, len: 150, w: 17, sway: -4, k: 19, drop: { at: DRIP_T + 0.2, period: 1.3 } },
  { x: 866, len: 172, w: 20, sway: 4, k: 22, drop: { at: DRIP_T, period: 1.1 } },
  { x: 962, len: 104, w: 16, sway: -3, k: 16, drop: { at: DRIP_T + 0.55, period: 1.5 } },
];
function MilkOnCounter({ f, yE }: { f: number; yE: number }) {
  const tt = t(f), [x0, x1] = SHEET_X, n = 48, taper = (x: number) => sm(x0, x0 + 120, x) * sm(x1, x1 - 120, x);
  const line = (k: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / n; return pp(x, yE - SHEET_BACK(x) * taper(x) * k); });
  const sheet: Pt[] = [...line(1), pp(x1, yE), pp(x0, yE)], shade: Pt[] = [...line(0.5), pp(x1, yE - 3), pp(x0, yE - 3)];
  return (
    <>
      <Inked pts={sheet} color={MILK.fill} ink={MILK.ink} w={4} order={84} />
      <Poly pts={shade} color={MILK.shade} order={84.7} op={0.7} />
      {[[300, 0.56, 90], [700, 0.5, 70]].map(([x, k, w], i) => <Poly key={i} pts={ellipsePts(PX(x), PY(yE - SHEET_BACK(x) * k - 4), w, 4, 14)} color={MILK.shine} order={84.8} op={0.95} />)}
      {RUNS.map((r, i) => {
        const pts = [[r.x, yE - 8, r.w * 1.55], [r.x + r.sway * 0.4, yE + r.len * 0.18, r.w * 1.15], [r.x + r.sway * 0.8, yE + r.len * 0.6, r.w * 0.95], [r.x + r.sway, yE + r.len, r.w * 0.85]].map(([x, y, w]) => [PX(x), PY(y), w]);
        const end = pp(r.x + r.sway, yE + r.len);
        return (
          <React.Fragment key={i}>
            <Poly pts={ribbon(pts.map(([x, y, w]) => [x, y, w + 6]))} color={MILK.ink} order={85} />
            <Poly pts={ellipsePts(end[0], end[1] - 1, r.w * 0.72 + 3, r.w * 0.72 + 3, 16)} color={MILK.ink} order={85} />
            <Poly pts={ribbon(pts)} color={MILK.fill} order={85.3} />
            <Poly pts={ellipsePts(end[0], end[1] - 1, r.w * 0.72, r.w * 0.72, 16)} color={MILK.fill} order={85.3} />
            <Poly pts={ribbon(pts.map(([x, y, w]) => [x - w * 0.22, y + 4, w * 0.16]))} color={MILK.shine} order={85.5} op={0.9} />
            {r.drop && <MilkDrips t={tt} at={[r.x + r.sway, yE + r.len + r.k * 0.6]} k={r.k} fall={300} period={r.drop.period} count={1} spread={1} order={85.6} fallAt={[r.drop.at]} />}
          </React.Fragment>
        );
      })}
    </>
  );
}
function Ross1Shot({ f }: { f: number }) {
  const m = rossView(R4.E, R4.yc), yE = R4.yc + (906 - 795) * m.s;
  return (
    <>
      <CounterBg m={m} />
      <RossCounter f={f} m={m} cx={R4.cx} cy={R4.yc - 137 * m.s} E={R4.E} body="apron" />
      <MilkOnCounter f={f} yE={yE} />
    </>
  );
}
function FlatShot({ f }: { f: number }) {
  const m = rossView(R6.E, R6.yc);
  return (
    <>
      <CounterBg m={m} />
      <RossCounter f={f} m={m} cx={R6.cx} cy={R6.yc - 137 * m.s} E={R6.E} body="apron" />
    </>
  );
}
function FingerShot({ f }: { f: number }) {
  const m = rossView(R17.E, R17.yc, 420);
  return (
    <>
      <CounterBg m={m} />
      <RossCounter f={f} m={m} cx={R17.cx} cy={R17.yc - 137 * m.s} E={R17.E} body={hasBody("finger") ? "finger" : "apron"} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 7: the pastry case (x11's) seen from the front; her daughter's face squashed on the glass, tongue out, licks it from the top to the bottom and a wet smear follows the tongue
const CASE = rig11.props.case as { file: string; w: number; h: number; ox: number; oy: number };
const CASE_M = cam(1.8, 384, 700), CASE_K = 0.8;
const CASE_C: [number, number] = [540, 1000];   // the middle of the case in the frame
const PastryCase = ({ k = CASE_K, c = CASE_C, order = 20 }: { k?: number; c?: [number, number]; order?: number }) => <Picture file={CASE.file} w={CASE.w * k} h={CASE.h * k} x={PX(c[0])} y={PY(c[1])} order={order} alpha />;
const LICK_PATH: [number, number][] = [[360, 900], [720, 950], [330, 1000], [750, 1055], [350, 1105], [740, 1160], [370, 1205], [640, 1240]];
const GIRL_TIP: [number, number] = [530, 745];   // the tip of her tongue in her picture
function LickShot({ f }: { f: number }) {
  const m = CASE_M, p = sm(LICK_T, LICK_T + 0.62, t(f)), seg = LICK_PATH.length - 1, s = p * seg, i = Math.min(seg - 1, Math.floor(s)), u = s - i, d = pic("girl_lick");
  const tip: [number, number] = [lerp(LICK_PATH[i][0], LICK_PATH[i + 1][0], u), lerp(LICK_PATH[i][1], LICK_PATH[i + 1][1], u)], dir = LICK_PATH[i + 1][0] - LICK_PATH[i][0];
  return (
    <>
      <CounterBg m={m} />
      <PastryCase />
      <Smear path={LICK_PATH} progress={p} w={70} order={30} />
      <Smear path={LICK_PATH} progress={Math.max(0, p - 0.04)} w={46} order={45} op={0.13} />
      <Flat d={d} apx={GIRL_TIP[0]} apy={GIRL_TIP[1]} x={tip[0]} y={tip[1]} k={0.6} rot={-Math.sign(dir) * 5 * Math.sin(u * Math.PI)} order={40}>
        {/* her picture is cut at her chest: her dress goes on down in its own pink (picture px: the cut is at row 1023, the dress spans x 288-721) */}
        {() => {
          const K = (px: number, py: number): Pt => [px - GIRL_TIP[0], GIRL_TIP[1] - py];
          return (
            <>
              <Poly pts={[K(288, 1020), K(721, 1020), K(735, 2000), K(274, 2000)]} color="#f76e93" order={39.9} />
              <Poly pts={ribbon([[...K(288, 1020), 3.5], [...K(274, 2000), 3.5]])} color="#2a1a1a" order={39.95} />
              <Poly pts={ribbon([[...K(721, 1020), 3.5], [...K(735, 2000), 3.5]])} color="#2a1a1a" order={39.95} />
            </>
          );
        }}
      </Flat>
      {/* the counter's front edge (plate row 905: frame row 1329 in this view) hides her down there: she stands behind the counter's edge, her face on the case's glass */}
      <Poly pts={FR(-40, 1329, W + 40, 1336)} color="#7f5c34" order={50} />
      <Poly pts={FR(-40, 1336, W + 40, 1342)} color="#341f0c" order={50.1} />
      <Poly pts={FR(-40, 1342, W + 40, H + 60)} color="#4a3016" order={50} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 9: Ross (the picture holds a sheet in both hands) rips a strip of tape and slaps the sign onto the glass (the lens: the licked smear is on it): he lunges at the camera; a small calm smile.
// 10: the sign, big and level, UNATTENDED CHILDREN WILL BE GIVEN AN / ESPRESSO / AND A / FREE PUPPY (code letters, ESPRESSO and FREE PUPPY the biggest) on the painted sheet with its cup and puppy; a slow push-in. 20: Ross's hand peels it off and flips it to NOW HIRING
const SHEET_C: [number, number] = [(127 + 1240) / 2, (18 + 741) / 2];   // the middle of the painted sheet in prop-sign's picture
/** the sign: its front is the painted sheet with the words over it, its back (code) is plain with NOW HIRING; (x, y) its middle in frame px, `w` its width, `sx` squeezed across (a flip) */
function Sheet({ x, y, w, rot = 0, order, face = "front", sx = 1, sy = 1 }: { x: number; y: number; w: number; rot?: number; order: number; face?: "front" | "back"; sx?: number; sy?: number }) {
  const k = w / SIGN.w, d = PRP.sign as Pic, h = w * SIGN.h / SIGN.w;
  if (face === "front") {
    return (
      <Flat d={d} apx={SHEET_C[0]} apy={SHEET_C[1]} x={x} y={y} k={k} rot={rot} sx={sx} sy={sy} order={order}>
        {() => <SignText x={0} y={0} w={SIGN.w} h={SIGN.h} order={order + 2} />}
      </Flat>
    );
  }
  return (
    <Group x={PX(x)} y={PY(y)} rot={rot} sx={sx} sy={sy}>
      <Poly pts={roundRect(w + 22, h + 22, 14, 5).map(([a, b]) => [a + 10, b - 12] as Pt)} color="#000000" order={order - 0.2} op={0.25} />
      <Inked pts={roundRect(w, h, 10, 5)} color="#fdfdfb" ink="#16110d" w={9} order={order} />
      <NowHiring x={0} y={0} w={w} h={h} order={order + 2} />
    </Group>
  );
}
const CASE_SMEAR: [number, number][] = [[180, 600], [900, 690], [200, 800], [920, 890], [180, 990], [900, 1080], [200, 1190], [880, 1280]];   // the wet smear on the case's glass in the sign's insert (the lick of shot 7, larger)
const R9 = { E: 1.15, cx: 540, cy: 740 };
function TapeShot({ f }: { f: number }) {
  const tt = t(f), a = f - Math.round(SLAP_T * FPS), lunge = a < 0 ? 0 : 0.07 * ease(a / 2) + 0.1 * Math.max(0, 1 - a / 4), E = R9.E * (1 + lunge), cx = R9.cx, cy = R9.cy + 60 * lunge;
  const r = rossAt(cx, cy, E), pose = rossPose18(f, "tape"), pt = (X: number, Y: number) => rossPt(cx, cy, E, X, Y);
  const tl = pt(715, 838), tr = pt(930, 838), bl = pt(715, 1048), br = pt(930, 1048), rip = tt >= RIP_T ? clamp01((tt - RIP_T) / 0.25) : 0, ripEnd = f >= 276;
  const v = seatView(1.9, 900);
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={1545} s={v.s} />
      <RossP x={r.x} y={r.y} E={E} order={40} body="tape" pose={pose} mouthW={rossMouthW(f)} />
      {rip > 0 && !ripEnd && <Tape x={lerp(tl[0] + 20, (tl[0] + tr[0]) / 2, rip)} y={tl[1] - 6 - 10 * rip} w={lerp(30, tr[0] - tl[0], rip)} h={24 * E} rot={-5 * rip} order={50} />}
      {a >= 0 && [tl, tr, bl, br].map((c, i) => <Tape key={i} x={c[0] + (i % 2 ? -14 : 14)} y={c[1] + (i < 2 ? 12 : -12)} w={76 * E} h={30 * E} rot={(i === 0 || i === 3 ? 1 : -1) * 36} order={52} op={0.9} />)}
    </>
  );
}
function SignShot({ f }: { f: number }) {
  const m = cam(1.4286, 384, 700);
  return (
    <>
      <CounterBg m={m} />
      <PastryCase k={1.5} c={[540, 1010]} order={10} />
      <Smear path={CASE_SMEAR} progress={1} w={80} order={22} op={0.34} />
      <Wash color="#16110d" op={0.4} order={25} />
      <Sheet x={540} y={880} w={860} rot={1} order={30} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Tape key={i} x={540 + a * 432} y={880 + b * 276} w={120} h={44} rot={a * b * 40} order={46} />)}
    </>
  );
}
/** x16's hand of Ross with its stick taken out (scripts/x18-prep.py hand): the gap between its thumb and finger is open, the sheet's right edge goes through it */
const HAND_R = PRP.hand_ross as unknown as { file: string; w: number; h: number; ox: number; oy: number; gap: [number, number] };
function FlipShot({ f }: { f: number }) {
  const tt = t(f), W0 = 640, G: [number, number] = [826, 1196], p = clamp01((tt - FLIP_T) / (FLIPMID_T - FLIP_T) / 2), ang = Math.PI * ease(p), cs = Math.cos(ang), back = cs < 0, sx = Math.max(0.12, Math.abs(cs));
  const peel = ease((f - Math.round(FLIP_T * FPS)) / 4), pk = 0.9 + 0.1 * peel, w = W0 * pk, h = (w * SIGN.h) / SIGN.w, edge = G[0] - 8, cx = edge - (w / 2) * sx, cy = G[1] + 70 - h / 2, kh = 1.0, tug = 18 * (1 - peel);
  const fall = clamp01((f - Math.round(FLIP_T * FPS)) / 6);
  return (
    <>
      <CounterBg m={cam(1.6, 384, 800)} />
      <PastryCase k={1.25} c={[540, 760]} order={10} />
      <Wash color="#16110d" op={0.5} order={25} />
      <Sheet x={cx} y={cy + tug} w={w} rot={5 * Math.sin(ang) - 2 * (1 - peel)} order={30} face={back ? "back" : "front"} sx={sx} sy={1} />
      {fall < 1 && [[-1, -1], [1, -1], [-1, 1]].map(([a, b], i) => <Tape key={i} x={cx + a * (w / 2 - 20) * sx + 40 * fall * a} y={cy + tug + b * (h / 2 - 14) + 520 * fall * fall} w={90} h={34} rot={a * b * 38 + 120 * fall * a} order={46} op={0.82 * (1 - fall * 0.6)} />)}
      <Picture file={HAND_R.file} w={HAND_R.w * kh} h={HAND_R.h * kh} x={PX(G[0] + (HAND_R.w / 2 - HAND_R.gap[0]) * kh)} y={PY(G[1] + tug + (HAND_R.h / 2 - HAND_R.gap[1]) * kh)} order={36} alpha />
    </>
  );
}

// ═════════════════════════════════════════════════════ 13, 14, 15: the café's front wall with its window and its door (x10's plate); the door swings open on every bell (the leaf of the plate, squeezed about its hinge, the street in the doorway)
const DOOR = PLT.door as unknown as { file: string; w: number; h: number; leaf: Box; hinge: number; street: { y0: number; y1: number; color: string }[] };
function DoorWall({ f, m }: { f: number; m: View }) {
  const open = doorSwing(f), [x0, y0, x1, y1] = DOOR.leaf;
  return (
    <>
      <WindowBg m={m} />
      {open > 0.01 && DOOR.street.map((b, i) => <Poly key={i} pts={rect(m, x0, b.y0, x1, b.y1)} color={b.color} order={1 + i * 0.01} />)}
      <Group x={m.X(x1)} y={0} sx={1 - 0.84 * open}>
        <Picture file={DOOR.file} w={(x1 - x0) * m.s} h={(y1 - y0) * m.s} x={-((x1 - x0) * m.s) / 2} y={m.Y((y0 + y1) / 2)} order={2} alpha tint={open > 0.02 ? "#d8d2c6" : undefined} />
      </Group>
    </>
  );
}
const WALK_M = cam(1.4286, 384, 672), DROP_M = cam(2.2, 600, 840), WAGON_M = cam(1.8, 540, 900);
/** 13: she is at the door with her phone at her mouth; the bell and the door opens; she goes out (smaller and further up the street) and the leaf swings shut behind her */
function WalkShot({ f }: { f: number }) {
  const m = WALK_M, p = clamp01((f - 372) / 34), bob = 9 * Math.abs(Math.sin(p * Math.PI * 5)) * (p > 0 && p < 1 ? 1 : 0), x = lerp(520, 860, ease(p)), sc = lerp(1.0, 0.62, sm(0.25, 1, p)), feet = lerp(1760, 1585, sm(0.2, 1, p));
  return (
    <>
      <DoorWall f={f} m={m} />
      <Mom f={f} who="mom_walk" anchor={[490, 955]} x={x} y={feet - bob * sc} k={0.98 * sc} rot={4 * Math.sin(p * Math.PI * 5) * (p < 1 ? 1 : 0)} order={p > 0.8 ? 1.5 : 40} />
    </>
  );
}

export { PulledDrawer, tdPt, ToddlerPour, t, W, H, fp, pp, sm, EDGE_COUNTER, EDGE_WINDOW, P, PRP, PLT, pic, HEAD_R, CounterBg, WindowBg, SeatBg, Floor, Mom, seatView, RossCounter, rossView, VIEW_S, PastryCase, Sheet, DoorWall, DOOR, WALK_M, DROP_M, WAGON_M, TillShot, PourShot, GrinShot, Mom1Shot, Mom2Shot, SmugShot, GlassesShot, DartsShot, Ross1Shot, FlatShot, FingerShot, LickShot, TapeShot, SignShot, FlipShot, WalkShot };
export type { Box };
