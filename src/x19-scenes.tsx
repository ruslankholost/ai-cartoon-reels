import React from "react";
import { Inked, Poly, roundRect } from "./sp-puppet";
import { Group, type View } from "./pen-stage";
import { Wash, FR, Impact } from "./x13-draw";
import { Bill, KidHand } from "./x18-draw";
import { PriceTag } from "./x18-props";
import { BAR, Multiply, PaneBulge, PaneGlare, ScreenBattery, ScreenDead, ScreenLight, ScreenSun } from "./x19-draw";
import { Charger19, Customers19, PointHand, Rack19, RossFlat, StrollerTV, SwitchWall, TAB, TV, Tablet19, mulHex, tabKey, tabletPt, tvPt, type CState } from "./x19-art";
import { blastShake } from "./x19-act";
import { shotX } from "./x19-shared";
import { CounterFront, Flat, PX, PY, RG19, TalkMouth, cam, type Pic } from "./x19-stage";
import {
  BLIP_T, CANOPY_T, FPS, PLUG_T, POWER_T, RATTLE_T, SLAP_T, SLIDE_T, SWITCH_T, THOOM_T, TIK_T, TURN_T, WINDOWS_T, ZIP_T, JAM_T,
  GAZE_DY, GAZE_STEPS, clamp01, dimAt, ease, lerp, mouthAt, screenLight, tabletVol, talkMove, tvVol, twos, type ShotId,
} from "./x19-sched";
import {
  CounterBg, Floor, HurricaneShot, LIT, LIT_DARK, Mom, MomBrowShot, MomEatShot, MomSmugShot, MuffinShot, RossCounter, RossWindShot, SeatBg, Table, TabletShot, ToddlerFlat, ToddlerShot, fp, litTint, num, pic, rossView, seatView, t, H, W,
} from "./x19-scenes-a";

// The second half of the scenes of x19 "Screen Time" (the first is src/x19-scenes-a.tsx, which has the helpers they share): Ross at the counter, the tablet's TIK, the toddler's lip, the mom's panic, the bars off the screen, the headphones, the stroller TV, the window,
// the customers, the light switch, the usher, the cash, the munch, the battery and the black, the silence, the charger, "Six fifty." and the plug; and the table of the shots. Frame px: x right, y down, 1080 x 1920.

// ═════════════════════════════════════════════════════ the dim café (19-27): the lights are down but the screen is on. The room (the plate, the floor, the counter) is multiplied by a dark blue, and the people, which are lit by the screen, are drawn over it with a
// bright blue tint, so that the faces stay bright on a phone and the room is dark. A counter's front is drawn over the person, so it is dimmed by a second wash from the counter's top edge down (`y0`)
const DIM = "#6a78c0";
const Dim = ({ f, k = 1, order, y0 }: { f: number; k?: number; order: number; y0?: number }) => <Multiply color={DIM} k={k * dimAt(f)} order={order} y0={y0} />;
const SCREEN_BLUE = "rgba(150,205,255,1)";

// ═════════════════════════════════════════════════════ 8: CLOSE, Ross flat after "...No."; beside him on the counter by the till the little rack of chargers rattles in the blast
export const R8 = { E: 1.15, yc: 1150, cx: 690 };
function RossNoShot({ f }: { f: number }) {
  const m = rossView(R8.E, R8.yc), a = t(f) - RATTLE_T, rat = a >= 0 && a < 0.5 ? Math.exp(-a / 0.15) : 0;
  return (
    <>
      <CounterBg m={m} />
      <RossCounter f={f} m={m} cx={R8.cx} cy={R8.yc - 137 * m.s} E={R8.E} body="apron" />
      <Rack19 x={215} y={R8.yc + 14} k={0.5} rot={5 * rat * Math.sin(a * 55)} dx={4 * rat * Math.sin(a * 80)} order={85} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 10: INSERT, the tablet (mirrored: its keys are on the left) closer on its volume overlay; Ross's hand comes in from the left and taps the lower key down one notch, TIK: one bar goes out
export const TAB10 = { cx: 810, cy: 900, rot: 3.5, s: 1.1 };
function TikShot({ f }: { f: number }) {
  const tt = t(f), vol = tabletVol(f), a = tt - TIK_T, { cx, cy, rot, s } = TAB10;
  const key = tabKey(cx, cy, rot, s, 1, true, 4), pr = a >= 0 && a < 0.2 ? Math.sin((Math.PI * a) / 0.2) : 0, enter = ease((f - 303) / 3);
  const tip: [number, number] = [key[0] - 60 * (1 - enter) + 18 * pr - 4, key[1] + 70 * (1 - enter) + 6];
  return (
    <>
      <SeatBg m={cam(1.43, 384, 672)} />
      <Wash color="#3a2a14" op={0.18} order={4} />
      <Table y={1500} />
      <Tablet19 x={cx} y={cy} rot={rot} s={s} flip order={20} press={[0, pr > 0.3 ? 12 : 0]}>
        {(o) => <ScreenSun t={tt} vol={vol} order={o} W={TAB.wd} />}
      </Tablet19>
      <PointHand who="ross" tip={tip} rot={6 - 6 * enter} k={0.9} order={50} />
      {a >= 0 && a < 0.16 && <Impact cx={key[0] + 20} cy={key[1]} r={60} age={a} order={70} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 11 and 26: CLOSE, the toddler's bottom lip trembles (a code mouth over his face), the eyes still glazed (11: the tablet's light; 26: the room is dark and quiet, the lip builds)
const LipShot = ({ f }: { f: number }) => {
  const v = seatView(1.5, 830);
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      <ToddlerFlat f={f} y={830} k={1.5} lip={clamp01((f - 324) / 26)} lit={1} />
    </>
  );
};
const Lip2Shot = ({ f }: { f: number }) => {
  const v = seatView(1.6, 850);
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      <Dim f={f} k={0.9} order={19} />
      <ToddlerFlat f={f} y={850} k={1.6} lip={clamp01((f - 732) / 38)} lit={0} tint={litTint(f, LIT_DARK)} />
    </>
  );
};

// ═════════════════════════════════════════════════════ 12: CLOSE, the mom's head snaps up from her phone, eyes wide, both hands out (mom-panic)
const MomSnapShot = ({ f }: { f: number }) => {
  const [bx, by] = blastShake(f, 4, 6), snap = ease((f - 353) / 3), v = seatView(1.35, 840);
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      <Mom f={f} who="mom_panic" x={540 + bx} y={840 + by - 46 * (1 - snap)} k={1.35} sy={1 + 0.05 * (1 - snap)} order={20} />
    </>
  );
};

// ═════════════════════════════════════════════════════ 13: INSERT, her finger jams the volume key; the bars shoot past MAX and run off the edge of the screen across the table: a train of white bars, each taller than the one before, one a frame from the zip,
// that comes out of the overlay, leaves the screen and slopes down onto the table as it runs off the frame
export const TAB13 = { cx: 300, cy: 940, rot: -3.5, s: 0.8 };
const TRAIN = 16;
function BarsShot({ f }: { f: number }) {
  const tt = t(f), vol = tabletVol(f), { cx, cy, rot, s } = TAB13, u = TAB.u, key = tabKey(cx, cy, rot, s, 0, false, 6), z = f - Math.round(ZIP_T * FPS), jam = f - Math.round(JAM_T * FPS);
  return (
    <>
      <SeatBg m={cam(1.43, 384, 672)} />
      <Wash color="#3a2a14" op={0.18} order={4} />
      <Table y={1330} />
      <Tablet19 x={cx} y={cy} rot={rot} s={s} order={20} press={[jam >= 0 ? 12 : 0, 0]}>
        {(o) => <ScreenSun t={tt} vol={vol} order={o} W={TAB.wd} />}
      </Tablet19>
      {Array.from({ length: TRAIN }, (_, j) => {
        const age = z - j;
        if (age < 0) return null;
        const xs = BAR.x(9) + 44 + j * 46 + j * j * 1.6, hs = BAR.h(9) + 34 + j * 36, ws = BAR.w + j * 1.6, run = ease(age / 6) * 46;
        const [bx, by] = tabletPt(cx, cy, rot, xs * u, (-205 + BAR.base) * u, s), h = hs * u * s, w = ws * u * s, base = by + j * 9, pop = age < 3 ? 1 + 0.25 * (1 - age / 3) : 1;
        return <Group key={j} x={PX(bx + run)} y={PY(base - h / 2)} sx={pop} sy={pop}><Inked pts={roundRect(w, h, 10, 4)} color="#ffffff" ink="#16171d" w={4} order={60 + j * 0.01} /></Group>;
      })}
      <PointHand who="mom" tip={[key[0] + 4 + (jam >= 0 ? -10 : 26), key[1] - 6]} rot={-4} k={0.62} order={41} />
      {jam >= 0 && jam < 5 && <Impact cx={key[0] + 6} cy={key[1]} r={70} age={jam / FPS} order={70} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 14: MEDIUM, Ross holds out a pair of tiny kids' headphones over the counter, calm (ross-headphones: the headphones are in his hands, painted)
export const R14 = { E: 0.85, yc: 1290, cx: 540, cy: 930 };
function PhonesShot({ f }: { f: number }) {
  const m = rossView(R14.E, R14.yc);
  return (
    <>
      <CounterBg m={m} />
      <RossCounter f={f} m={m} cx={R14.cx} cy={R14.cy} E={R14.E} body="headphones" />
    </>
  );
}

// ═════════════════════════════════════════════════════ 15: CLOSE, the mom snapping at the headphones (mom-shock: standing, both hands at her cheeks)
function MomHatesShot({ f }: { f: number }) {
  const mv = talkMove("MOM", f), k = 1.5;
  return (
    <>
      <SeatBg m={cam(2.94, 415, 676)} />
      <Floor y={1700} s={2.94} />
      <Mom f={f} who="mom_shock" x={540 + 4 * Math.sin(twos(f) * 2.1)} y={800 - mv.bob * k} k={k} rot={mv.tilt * 0.9} sy={1 + 0.006 * mv.bob} order={20} lidBase={0} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 16: MEDIUM, she yanks the stroller over and flips its canopy up: the TV on the stroller swings up from flat to standing on its hinge, a squash on the stop, THOOM and the cartoon sun fills it
const CAN = { k: 0.87, hx: 372, hy: 1090 };
/** how upright the TV is: flat (0.06) until she grabs it, swinging up in 8 frames to the stop on the THOOM's frame, a squash and a settle after it */
const tvUp = (f: number): number => {
  const c = Math.round(CANOPY_T * FPS), th = Math.round(THOOM_T * FPS), a = t(f) - THOOM_T;
  if (f < c) return 0.06;
  if (f < th) return 0.06 + 0.94 * ease((f - c) / (th - c - 1));
  return 1 + 0.07 * Math.exp(-a / 0.06) * Math.cos(a * 46);
};
const MOM_ST = RG19.people.mom_stroller as Pic;
function CanopyShot({ f }: { f: number }) {
  const tt = t(f), c = Math.round(CANOPY_T * FPS), th = Math.round(THOOM_T * FPS), on = f >= th, a = tt - THOOM_T, pop = on ? 1 + 0.05 * Math.exp(-a / 0.1) * Math.cos(a * 40) : 1;
  const yank = 1 - ease((f - c) / 4), up = tvUp(f), { k, hx, hy } = CAN, hand = num(MOM_ST, "hand");
  const rim = tvPt(hx - 190 * yank, hy, k, 913, 478);
  return (
    <>
      <SeatBg m={cam(2.35, 384, 700)} />
      <Floor y={1420} s={2.35} />
      <Group x={PX(540)} y={PY(1000)} sx={pop} sy={pop}>
        <Group x={-PX(540)} y={-PY(1000)}>
          <StrollerTV x={hx - 190 * yank} y={hy} k={k} up={up} order={20}>{(o) => (on ? <ScreenSun t={tt} order={o} W={TV.wd} /> : <ScreenDead order={o} W={TV.wd} />)}</StrollerTV>
          <Flat d={MOM_ST} apx={hand[0]} apy={hand[1]} x={rim[0] + 8 + 10 * yank} y={rim[1]} k={0.89} rot={-5 * yank} order={31} />
        </Group>
      </Group>
      {on && <ScreenLight x={hx} y={hy - 200} rx={620} ry={560} op={0.5 * screenLight(f)} order={210} color={SCREEN_BLUE} />}
      {f >= th && f < th + 2 && <Wash color="#ffffff" op={0.5} order={300} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 17, 18, 21, 25: WIDE, the café from the counter: the stroller TV glowing in front at the left, the customers at their tables behind it, the café's big window behind them. The plate is the backdrop (its
// window is the glass that bulges); the TV and the row of customers are placed in the frame
const PANE_BOX = [80, 180, 690, 745] as const;
const WP = (m: View, u: number, v: number) => fp(m, u, v);
type Wide = { m: View; tv: { x: number; y: number; k: number } | null; row: { x: number; y: number; k: number } };
export const WIDE17: Wide = { m: cam(1.43, 384, 672), tv: { x: 210, y: 1480, k: 0.74 }, row: { x: 730, y: 1180, k: 0.6 } };
export const WIDE18: Wide = { m: cam(2.1, 560, 780), tv: null, row: { x: 540, y: 1290, k: 0.85 } };
export const WIDE21: Wide = { m: cam(1.7, 470, 740), tv: { x: 150, y: 1500, k: 0.72 }, row: { x: 700, y: 1230, k: 0.7 } };
export const WIDE25: Wide = { m: cam(1.6, 384, 700), tv: { x: 140, y: 1570, k: 0.8 }, row: { x: 600, y: 1270, k: 0.78 } };
/** the wide room: the plate, the glass with its bulge, the floor, (the dim over them), the customers, the TV in front; `lit` the tint of the people and the TV where the room is dim (none: the room is bright) */
function WideBase({ f, w, tvAlive, bulge = 0, state, stretch, gaze, lit, dimK = 0, litEyes = 1 }: { f: number; w: Wide; tvAlive: boolean; bulge?: number; state: (i: number) => CState; stretch?: (i: number) => number; gaze?: (i: number) => [number, number]; lit?: string; dimK?: number; litEyes?: number }) {
  const tt = t(f), m = w.m, [a, b] = WP(m, PANE_BOX[0], PANE_BOX[1]), [c, d] = WP(m, PANE_BOX[2], PANE_BOX[3]), box: [number, number, number, number] = [a, b, c, d];
  return (
    <>
      <SeatBg m={m} />
      {bulge > 0 && <PaneBulge box={box} amp={bulge} order={2} />}
      {bulge > 0 && <PaneGlare box={box} amp={bulge} order={3} />}
      <Floor y={w.row.y + 80 * w.row.k} s={m.s} order={6} />
      {dimK > 0 && <Dim f={f} k={dimK} order={15} />}
      <Customers19 x={w.row.x} y={w.row.y} k={w.row.k} state={state} stretch={stretch} gaze={gaze} order={20} lit={litEyes} tint={lit} />
      {w.tv && <StrollerTV x={w.tv.x} y={w.tv.y} k={w.tv.k} up={1} order={40} tint={lit}>{(o) => (tvAlive ? <ScreenSun t={tt} order={o} W={TV.wd} /> : <ScreenDead order={o} W={TV.wd} />)}</StrollerTV>}
    </>
  );
}
function WindowsShot({ f }: { f: number }) {
  const a = t(f) - WINDOWS_T, amp = a < 0 ? 0 : 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(a * Math.PI * 4 - Math.PI / 2)) * Math.exp(-a * 0.4), w = WIDE17;
  return (
    <>
      <WideBase f={f} w={w} tvAlive bulge={amp} state={() => "plain"} />
      <ScreenLight x={w.tv!.x + 150} y={w.tv!.y - 200} rx={640} ry={540} op={0.45 * screenLight(f)} order={210} color={SCREEN_BLUE} />
    </>
  );
}
function TurnShot({ f }: { f: number }) {
  const turned = TURN_T.filter((x) => f >= Math.round(x * FPS)).length, w = WIDE18;
  const stand = (i: number) => { const at = Math.round(TURN_T[Math.min(i, 2)] * FPS), a = f - at, on = a >= 0 && a < 5; return on ? 1 + 0.06 * Math.sin((Math.PI * a) / 5) : 1; };
  return (
    <>
      <WideBase f={f} w={w} tvAlive bulge={0.05} state={(i) => (i < turned + (turned >= 3 ? 1 : 0) ? "glazed" : "plain")} stretch={stand} />
      <ScreenLight x={-60} y={1050} rx={900} ry={760} op={0.3 * screenLight(f)} order={210} color={SCREEN_BLUE} />
    </>
  );
}
function CashShot({ f }: { f: number }) {
  const w = WIDE21, up = f - 604, stand = () => (up >= 0 && up < 5 ? 1 + 0.08 * Math.sin((Math.PI * up) / 5) : 1);
  return (
    <>
      <WideBase f={f} w={w} tvAlive state={() => "cash"} stretch={stand} lit={litTint(f)} dimK={1} />
      <ScreenLight x={W / 2 - 100} y={1150} rx={800} ry={700} op={0.3 * screenLight(f)} order={210} color={SCREEN_BLUE} />
    </>
  );
}
function SilentShot({ f }: { f: number }) {
  const w = WIDE25, blip = Math.round(BLIP_T * FPS), gz = (i: number): [number, number] => { const a = f - (blip + 12 + 3 * i), step = GAZE_STEPS[a < 0 ? 0 : a < 3 ? 1 : a < 6 ? 2 : 3]; return [step, a >= 6 ? GAZE_DY : 0]; };
  return <WideBase f={f} w={w} tvAlive={false} state={() => "glazed"} gaze={gz} lit={litTint(f, LIT_DARK)} dimK={0.9} litEyes={0.4} />;
}

// ═════════════════════════════════════════════════════ 19: INSERT, Ross's hand flips the light switch on the wall, CLICK; the picture dims
function SwitchShot({ f }: { f: number }) {
  const a = f - Math.round(SWITCH_T * FPS), flip = a < 0 ? 1 : a === 0 ? 0 : -1, reach = ease((f - 552) / 2);
  const sx = 600, sy = 930, k = 1.15, tip: [number, number] = [sx - 70 - 90 * (1 - reach), sy - 50 + 10 * (1 - reach) + (a >= 0 ? 44 * ease(a / 2) : 0)];
  return (
    <>
      <SeatBg m={cam(2.4, 384, 980)} />
      <SwitchWall x={sx} y={sy} k={k} flip={flip} order={20} />
      <PointHand who="ross" tip={tip} rot={-14} k={0.85} order={50} />
      <Dim f={f} k={0.8} order={200} />
      <ScreenLight x={-40} y={900} rx={900} ry={800} op={0.55 * dimAt(f) * screenLight(f)} order={210} color={SCREEN_BLUE} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 20: MEDIUM, Ross in the dim café in a paper usher's hat, a striped popcorn bucket held up (ross-usher: the hat and the bucket are painted)
export const R20 = { E: 0.92, yc: 1450, cx: 520, cy: 880 };
function UsherShot({ f }: { f: number }) {
  const m = rossView(R20.E, R20.yc), pop = f >= 567 ? Math.exp(-(f - 567) / 4) : 0, d = pic("ross_usher"), g = d.grin!;
  return (
    <>
      <CounterBg m={m} />
      <Dim f={f} order={39} />
      <RossFlat d={d} cx={R20.cx} cy={R20.cy - 8 * pop} E={R20.E} sx={1 + 0.03 * pop} sy={1 + 0.05 * pop} order={40} tint={litTint(f)}>
        {({ ax, ay }) => <TalkMouth grin={{ ...g, skin: mulHex(g.skin, litTint(f)) }} d={d} ax={ax} ay={ay} shape={mouthAt("ROSS", f)} order={42} />}
      </RossFlat>
      <CounterFront m={m} order={80} />
      <Dim f={f} order={81} y0={R20.yc} />
      <ScreenLight x={520} y={R20.cy + 30} rx={440} ry={440} op={0.22 * screenLight(f)} order={210} color={SCREEN_BLUE} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 22 and 23: CLOSE, the toddler munching popcorn out of the bucket, eyes on the screen; the mom delighted, pointing at him
function MunchShot({ f }: { f: number }) {
  const ch = 6 * Math.abs(Math.sin(twos(f) * 0.9)), v = seatView(1.3, 800);
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      <Dim f={f} order={19} />
      <ToddlerFlat f={f} who="toddler_popcorn" y={800} k={1.3} bob={ch} lit={1} tint={litTint(f)} />
    </>
  );
}
function ProudShot({ f }: { f: number }) {
  const mv = talkMove("MOM", f), v = seatView(1.35, 840);
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      <Dim f={f} order={19} />
      <Mom f={f} who="mom_proud" x={500} y={840 - mv.bob * 1.35} k={1.35} rot={mv.tilt * 0.5} order={20} tint={litTint(f)} />
      <ScreenLight x={500} y={880} rx={480} ry={540} op={0.14 * screenLight(f)} order={210} color={SCREEN_BLUE} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 24: INSERT, the giant screen: a huge red battery fills it, 1%; BLIP, black; the song stops dead (and from here to the plug nothing moves)
function BatteryShot({ f }: { f: number }) {
  const dead = f >= Math.round(BLIP_T * FPS), k = 1.28, hx = 540, hy = 1180;
  return (
    <>
      <SeatBg m={cam(1.43, 384, 672)} />
      <Dim f={f} order={19} />
      <StrollerTV x={hx} y={hy} k={k} up={1} order={20} tint={dead ? LIT_DARK : undefined}>{(o) => (dead ? <ScreenDead order={o} W={TV.wd} /> : <ScreenBattery f={f} order={o} W={TV.wd} />)}</StrollerTV>
      {!dead && <ScreenLight x={hx} y={hy - 240} rx={800} ry={640} op={0.3 * screenLight(f)} order={210} color="rgba(255,120,110,1)" />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 27: CLOSE, the mom terrified, hands clasped under her chin, whispering (mom-plead)
function PleadShot({ f }: { f: number }) {
  const mv = talkMove("MOM", f), v = seatView(1.35, 850);
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      <Dim f={f} k={0.9} order={19} />
      <Mom f={f} who="mom_plead" x={540} y={850 - mv.bob * 1.35} k={1.35} order={20} tint={litTint(f, LIT_DARK)} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 28: INSERT, the counter top: Ross's hand slides a charger off the rack and across the counter
const CTOP_M = cam(3.4, 384, 790);
function SlideShot({ f }: { f: number }) {
  const u = ease((f - Math.round(SLIDE_T * FPS)) / 8), top = fp(CTOP_M, 384, 905)[1], x = lerp(520, 860, u), y = top - 110;
  return (
    <>
      <CounterBg m={CTOP_M} />
      <Rack19 x={230} y={y + 52} k={0.62} gone order={20} />
      <Charger19 x={x} y={y} k={0.5} rot={90} order={30} />
      <PointHand who="ross" tip={[x - 215, y - 4]} rot={0} k={0.8} order={50} />
      <Dim f={f} k={0.6} order={200} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 29: MEDIUM, Ross behind the counter, calm; the charger on the counter and "$6.50" pops over it (code) on "Six"
export const R29 = { E: 0.95, yc: 1150, cx: 520 };
export const PRICE_T = 824 / FPS;
function SixShot({ f }: { f: number }) {
  const m = rossView(R29.E, R29.yc), cy = R29.yc - 137 * m.s, a = t(f) - PRICE_T, sc = a >= 0 ? Math.min(1, 1 - Math.exp(-a / 0.04)) * (1 + 0.14 * Math.exp(-a / 0.12) * Math.cos(a * 34)) : 0, k = 0.6;
  return (
    <>
      <CounterBg m={m} />
      <Dim f={f} k={k} order={39} />
      <RossCounter f={f} m={m} cx={R29.cx} cy={cy} E={R29.E} body="apron" tint={litTint(f, LIT, k)} />
      <Dim f={f} k={k} order={81} y0={R29.yc} />
      <Charger19 x={650} y={R29.yc + 128} k={0.42} rot={90} order={86} />
      {a >= 0 && <PriceTag x={PX(690)} y={PY(R29.yc + 20 - 20 * sc)} s={Math.max(0.01, 0.85 * sc)} rot={-6} order={95} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 30: INSERT, her hand slaps the cash down and jams the plug into the stroller TV; the screen lights up and its volume overlay slams to MAX; the cut to shot 1 loops it
function PlugShot({ f }: { f: number }) {
  const tt = t(f), slap = f >= Math.round(SLAP_T * FPS), plugged = f >= Math.round(PLUG_T * FPS), power = f >= Math.round(POWER_T * FPS), vol = tvVol(f);
  const aS = tt - SLAP_T, aP = tt - PLUG_T, carry = ease((f - (Math.round(SLAP_T * FPS) + 3)) / 8), hx = lerp(700, 930, carry), hy = lerp(1236, 1020, carry) + (plugged ? -8 * Math.exp(-aP / 0.06) : 0);
  const k = 1.2, tvx = 540, tvy = 1060;
  return (
    <>
      <Poly pts={FR(-40, -40, W + 40, H + 40)} color="#14161b" order={0} />
      <StrollerTV x={tvx} y={tvy} k={k} up={1} order={10}>{(o) => (power ? <ScreenSun t={tt} vol={vol} order={o} W={TV.wd} /> : <ScreenDead order={o} W={TV.wd} />)}</StrollerTV>
      <Poly pts={FR(-40, 1290, W + 40, H + 40)} color="#6a4a2c" order={25} />
      <Poly pts={FR(-40, 1290, W + 40, 1316)} color="#a87c47" order={25.1} />
      {slap && [0, 1, 2].map((i) => <Bill key={i} x={470 + i * 8} y={1282 - i * 7} h={50} rot={-4 + i * 4} order={30 + i} />)}
      {slap && aS < 0.16 && <Impact cx={470} cy={1286} r={120} age={aS} order={70} />}
      {slap && f < Math.round(SLAP_T * FPS) + 3 && <KidHand x={560 + 80 * (f - Math.round(SLAP_T * FPS))} y={1250} rot={-30} k={1.3} sleeve="#b9a6e6" cuff="#9d8ad0" order={40} />}
      {f >= Math.round(SLAP_T * FPS) + 3 && <Charger19 x={hx - 40} y={hy + 12} k={0.3} rot={-90} order={44} />}
      {f >= Math.round(SLAP_T * FPS) + 3 && <PointHand who="mom" tip={[hx + 120, hy + 8]} rot={0} k={0.5} order={46} />}
      {plugged && aP < 0.16 && <Impact cx={hx - 110} cy={hy} r={70} age={aP} order={70} />}
      {power && <ScreenLight x={540} y={760} rx={760} ry={620} op={0.4 * screenLight(f)} order={210} color={SCREEN_BLUE} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ the shots
/** the point each shot's camera zooms about (frame px) */
export const FOCUS: Record<ShotId, [number, number]> = {
  tablet: [540, 1000], hurricane: [520, 1000], toddler: [540, 960], rossWind: [560, 800], momEat: [540, 900], muffin: [540, 1100], momBrow: [540, 900], rossNo: [640, 800], momSmug: [600, 900], tik: [540, 1000], lip: [540, 900], momSnap: [540, 900], bars: [540, 1000], phones: [540, 900],
  momHates: [540, 900], canopy: [620, 1000], windows: [540, 1000], turn: [540, 1000], switch: [640, 900], usher: [520, 900], cash: [540, 1000], munch: [540, 900], proud: [540, 900], battery: [540, 960], silent: [540, 1000], lip2: [540, 900], plead: [540, 900], slide: [540, 1000], six: [520, 900], plug: [540, 900],
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = {
  tablet: V("tablet", TabletShot), hurricane: V("hurricane", HurricaneShot), toddler: V("toddler", ToddlerShot), rossWind: V("rossWind", RossWindShot), momEat: V("momEat", MomEatShot), muffin: V("muffin", MuffinShot), momBrow: V("momBrow", MomBrowShot), rossNo: V("rossNo", RossNoShot),
  momSmug: V("momSmug", MomSmugShot), tik: V("tik", TikShot), lip: V("lip", LipShot), momSnap: V("momSnap", MomSnapShot), bars: V("bars", BarsShot), phones: V("phones", PhonesShot), momHates: V("momHates", MomHatesShot), canopy: V("canopy", CanopyShot),
  windows: V("windows", WindowsShot), turn: V("turn", TurnShot), switch: V("switch", SwitchShot), usher: V("usher", UsherShot), cash: V("cash", CashShot), munch: V("munch", MunchShot), proud: V("proud", ProudShot), battery: V("battery", BatteryShot),
  silent: V("silent", SilentShot), lip2: V("lip2", Lip2Shot), plead: V("plead", PleadShot), slide: V("slide", SlideShot), six: V("six", SixShot), plug: V("plug", PlugShot),
};
export const ART: Record<ShotId, string> = {
  tablet: "prop-tablet+(code: sun, overlay, finger, label)", hurricane: "ross-blown+bg-counter+(code: wind, cups)", toddler: "toddler-sit+prop-muffin+(code: blue light, glazed pupils)", rossWind: "ross-apron+bg-counter+(code: wind, hair)",
  momEat: "mom-phone+bg-seating+prop-stroller", muffin: "prop-muffin (hops)", momBrow: "mom-phone+bg-seating+(code: brows)", rossNo: "ross-apron+bg-counter+prop-rack", momSmug: "mom-phone (mirrored)+bg-seating+(code: brows, lids)",
  tik: "prop-tablet (mirrored)+hand-ross-point+(code: screen)", lip: "toddler-sit+(code: lip, light)", momSnap: "mom-panic+bg-seating", bars: "prop-tablet+hand-mom-point+(code: bars)", phones: "ross-headphones+bg-counter", momHates: "mom-shock+bg-seating",
  canopy: "mom-stroller+prop-stroller-tv+(code: TV)", windows: "bg-seating+prop-stroller-tv+customers+(code: window warp)", turn: "customers+customers-glazed", switch: "prop-switch+hand-ross-point+(code: rocker, dim)",
  usher: "ross-usher+bg-counter", cash: "customers-cash+prop-stroller-tv", munch: "toddler-popcorn", proud: "mom-proud", battery: "prop-stroller-tv+(code: battery)", silent: "customers-glazed+prop-stroller-tv+(code: dim, pupils)", lip2: "toddler-sit+(code: lip)",
  plead: "mom-plead", slide: "bg-counter+prop-rack+prop-charger+hand-ross-point", six: "ross-apron+bg-counter+prop-charger+(code: $6.50)", plug: "prop-stroller-tv+prop-charger+hand-mom-point+(code: cash)",
};
