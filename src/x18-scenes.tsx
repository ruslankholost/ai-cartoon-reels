import React from "react";
import { Inked, Picture, Poly, ellipsePts, ribbon, roundRect, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Wash, FR, Impact } from "./x13-draw";
import { WindStreaks } from "./x17-draw";
import { ClockHands } from "./x10-draw";
import { Bolt, KidHand, LookPupils, MilkStream } from "./x18-draw";
import { PriceTag } from "./x18-props";
import { buzz, pumpAt, rossMouthW, rossPose18 } from "./x18-act";
import { shotX } from "./x18-shared";
import { CounterFront, Flat, PL, PX, PY, PlateM, RG18, RossP, TalkMouth, cam, counterView, hasBody, kid, rossAt, type Pic } from "./x18-stage";
import {
  CounterBg, DROP_M, DoorWall, EDGE_COUNTER, Floor, H, HEAD_R, Mom, P, PLT, PRP, SeatBg, Sheet, VIEW_S, W, WAGON_M, WindowBg, fp, pic, pp, sm, t,
  DartsShot, FingerShot, PulledDrawer, FlatShot, FlipShot, GlassesShot, GrinShot, LickShot, Mom1Shot, Mom2Shot, PourShot, Ross1Shot, SignShot, SmugShot, TapeShot, TillShot, ToddlerPour, WalkShot, tdPt,
} from "./x18-scenes-a";
import {
  BELL_T, CLOCK_T, CUPS_T, FPS, GLUG2_T, SLAM_T, THUD_T, WAGON_T, ZAP_T,
  clamp01, ease, hash, inShot, lerp, mouthAt, popP, squashAt, talkMove, twos, type ShotId,
} from "./x18-sched";

// The second half of the scenes of x18 "Unattended" (the first is src/x18-scenes-a.tsx, the helpers they share): the drop-off at the door, the grandpa's wagon, the eight kids (row and zap), the cups, the café in a blur and Ross in his chair, the clock,
// the toddler's coffee, the mom's shout and Ross wiping a cup; and the table of the shots. Frame px: x right, y down, 1080 x 1920.
void BELL_T;

// ═════════════════════════════════════════════════════ 14: DING, the door opens and the drop-off mom (in the doorway, behind the leaf) shoves three kids in: they lurch forward and land with a squash on the thud (the pieces of scripts/x18-prep.py dropoff: her upper body,
// her legs, the three kids); she steps back out and the leaf swings shut
const DR_G: [number, number] = [512, 955];   // the picture point between the feet of the group
const DR_KIDS: { name: string; foot: [number, number]; order: number }[] = [{ name: "dropoff_cap", foot: [232, 942], order: 31 }, { name: "dropoff_hood", foot: [794, 940], order: 32 }, { name: "dropoff_girl", foot: [518, 952], order: 33 }];
function DropShot({ f }: { f: number }) {
  const m = DROP_M, tt = t(f), a = f - 420, lurch = ease(a / 4), land = squashAt(tt, THUD_T, 0.32, 36), back = ease((f - 427) / 5), k = 0.9, gx = 540, gy = 1480;
  const at = (px: number, py: number): [number, number] => [gx + (px - DR_G[0]) * k, gy + (py - DR_G[1]) * k];
  const dm = pic("dropoff_mom"), dl = pic("dropoff_legs");
  return (
    <>
      <DoorWall f={f} m={m} />
      <Flat d={dl} apx={DR_G[0]} apy={DR_G[1]} x={gx} y={gy - 28 * back} k={k * (1 - 0.12 * back)} order={1.5} />
      <Flat d={dm} apx={DR_G[0]} apy={DR_G[1]} x={gx} y={gy - 28 * back} k={k * (1 - 0.12 * back)} order={1.6} />
      {DR_KIDS.map((kd, i) => {
        const [x, y] = at(kd.foot[0], kd.foot[1]);
        return <Flat key={kd.name} d={pic(kd.name)} apx={kd.foot[0]} apy={kd.foot[1]} x={x + (i - 1) * 14 * lurch} y={y + (110 + 20 * (i === 1 ? 1 : 0)) * lurch} k={k * (1 + 0.14 * lurch)} sx={1 + 0.1 * land} sy={1 - 0.1 * land} order={kd.order} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ 15: DING, the grandpa (in the doorway, behind the leaf) gives the wagon of triplets a push: it rolls on into the café, its wheels turning; he lets go, waves, says "See you Tuesday!" and steps back out as the leaf swings shut
const WG_A: [number, number] = [509, 800], GP_A: [number, number] = [516, 930];
function Wheel({ cx, cy, r, ang, d, ax, ay, order }: { cx: number; cy: number; r: number; ang: number; d: Pic; ax: number; ay: number; order: number }) {
  const [x, y] = kid(d, ax, ay, cx, cy);
  return (
    <Group x={x} y={y} rot={ang}>
      {[0, 60, 120].map((a) => <Group key={a} x={0} y={0} rot={a}><Poly pts={[[-r * 0.8, -2.6], [r * 0.8, -2.6], [r * 0.8, 2.6], [-r * 0.8, 2.6]]} color="#4a4a52" order={order} /></Group>)}
      <Poly pts={ellipsePts(0, 0, 6, 6, 12)} color="#2b2b30" order={order + 0.1} />
    </Group>
  );
}
function WagonShot({ f }: { f: number }) {
  const tt = t(f), m = WAGON_M, push = ease((f - 439) / 26), wx = lerp(720, 300, push), wy = 1405, dist = (720 - wx) / 0.6, ang = -(dist / 38) * (180 / Math.PI);
  const bumpy = push > 0 && push < 1 ? (twos(f) % 4 < 2 ? 0 : -4) : 0, out = ease((f - 468) / 9), gk = 0.78, gp = lerp(0, 1, ease((f - 437) / 3));
  const g = pic("grandpa"), w = pic("wagon"), wheels = (w.wheels as unknown as number[][]) ?? [];
  const wave = 3.2 * Math.sin(tt * 15) * (f > 444 && f < 468 ? 1 : 0);
  return (
    <>
      <DoorWall f={f} m={m} />
      <Flat d={g} apx={GP_A[0]} apy={GP_A[1]} x={lerp(630, 760, out)} y={lerp(1385, 1330, out)} k={gk * lerp(1, 0.66, out)} rot={wave} order={1.6}>
        {({ ax, ay }) => g.grin && <TalkMouth grin={g.grin} d={g} ax={ax} ay={ay} shape={mouthAt("GRANDPA", f)} order={4} />}
      </Flat>
      <Flat d={w} apx={WG_A[0]} apy={WG_A[1]} x={wx} y={wy + bumpy} k={0.6} rot={0.8 * Math.sin(tt * 30) * (push < 1 ? 1 : 0)} order={30}>
        {({ ax, ay }) => <>{wheels.map((wh, i) => <Wheel key={i} cx={wh[0]} cy={wh[1]} r={wh[2]} ang={ang} d={w} ax={ax} ay={ay} order={31} />)}</>}
      </Flat>
      {gp < 0 && null}
    </>
  );
}

// ═════════════════════════════════════════════════════ 16 and 19: eight kids in a row over the edge of the counter (seen from Ross's side), all pointing up, mouths wide, pumping on each PUP-PY, the sign on the wall over them; 19 they gulp their espresso, ZAP
// (the white flash for two frames), and they snap wired: the picture changes to the same eight with their eyes huge and their hair straight up, buzzing
type KMeta = { kids: { head: [number, number]; mouth: [number, number]; box: number[] }[]; counter_top: number };
const RK = 0.8, RY = 1190;
const rowX = (px: number) => 540 + (px - 672) * RK;
const CUP = PRP.cup as Pic;
function KidsRow({ f, zap = false, gulp = 0 }: { f: number; zap?: boolean; gulp?: number }) {
  const nm = zap ? "kids_zap" : "kids_row", meta = P[`${nm}_meta`] as unknown as KMeta, tt = t(f);
  void tt;
  return (
    <>
      {meta.kids.map((kd, i) => {
        const d = pic(`${nm}_${i + 1}`), hx = kd.head[0], pump = pumpAt(f, i), up = 34 * pump * (0.8 + 0.2 * hash(i * 3.1)), bz = zap ? buzz(f, i + 2) : [0, 0];
        return <Flat key={i} d={d} apx={hx} apy={565} x={rowX(hx) + 5 * bz[0]} y={RY - up + 4 * bz[1]} k={RK} rot={(i % 2 ? 1 : -1) * 2.5 * pump} sy={1 + 0.05 * pump} order={30 + i * 0.1} />;
      })}
      <Flat d={pic(`${nm}_counter`)} apx={672} apy={565} x={540} y={RY} k={RK} order={50} />
      <Poly pts={FR(-40, RY + 40, W + 40, H + 60)} color="#7b4c22" order={51} />
      <Poly pts={FR(-40, RY + 40, W + 40, RY + 46)} color="#4d2f14" order={51.1} />
      {gulp > 0 && meta.kids.map((kd, i) => {
        const [mx, my] = [rowX(kd.mouth[0]), RY + (kd.mouth[1] - 565) * RK];
        return <Flat key={`c${i}`} d={CUP} apx={513} apy={650} x={mx + 8} y={my + 36 - 26 * gulp} k={0.12} rot={-34 * gulp} order={60 + i * 0.1} />;
      })}
    </>
  );
}
function RowWall({ f, order = 0 }: { f: number; order?: number }) {
  void f; void order;
  return (
    <>
      <WindowBg m={cam(1.43, 384, 672)} />
      <Wash color="#f0dca2" op={0.42} order={3} />
    </>
  );
}
const RowShot = ({ f }: { f: number }) => (
  <>
    <RowWall f={f} />
    <Sheet x={540} y={560} w={560} rot={-2} order={10} />
    <KidsRow f={f} />
  </>
);
function ZapShot({ f }: { f: number }) {
  const zf = Math.round(ZAP_T * FPS), zapped = f >= zf, flash = f === zf ? 1 : f === zf + 1 ? 0.6 : 0, g = sm(t(598), t(604), t(f)) * (zapped ? 0 : 1);
  return (
    <>
      <RowWall f={f} />
      <Sheet x={540} y={560} w={560} rot={-2} order={10} />
      <KidsRow f={f} zap={zapped} gulp={g} />
      {zapped && t(f) < ZAP_T + 0.25 && Array.from({ length: 8 }, (_, i) => { const hx = (P.kids_zap_meta as unknown as KMeta).kids[i].head[0]; return <Bolt key={i} x={rowX(hx)} y={RY - 250} len={170 + 40 * (i % 3)} rot={(i - 3.5) * 14} seed={twos(f) / 2 + i} order={80} />; })}
      {flash > 0 && <Wash color="#ffffff" op={flash} order={300} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 18: the counter top: eight tiny espresso cups slide in from the right one after another, each stopping at a small hand
const CUPS_M = cam(3.4, 384, 835);
const CUP_ARRIVE = (i: number) => Math.round(576 + 2.5 * i);
const HAND_COL = ["#62b52d", "#f27aa6", "#3a68b8", "#f4d020", "#1f55c2", "#f4600e", "#f4600e", "#f4600e"];
function CupsShot({ f }: { f: number }) {
  const m = CUPS_M, top = fp(m, 384, 905)[1], y = 1000;
  return (
    <>
      <CounterBg m={m} />
      {HAND_COL.map((c, i) => <KidHand key={i} x={150 + i * 112} y={top - 4 - (52 + 150) * 0.62} rot={(i % 2 ? 1 : -1) * 2} k={0.62} sleeve={c} len={150} order={50 + i} />)}
      {HAND_COL.map((_, i) => {
        const a = CUP_ARRIVE(i), p = ease((f - (a - 5)) / 5), x0 = 150 + i * 112;
        return f < a - 5 ? null : <Flat key={i} d={CUP} apx={513} apy={690} x={lerp(1220, x0, p)} y={y + (f >= a ? 0 : 6 * Math.sin(p * Math.PI))} k={0.17} order={40 + i * 0.1} />;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ 21a: the café in a blur (kids-work: a mop, a rag, the triplets stacking chairs, a kid blow-drying the till): ghost copies of the picture, speed lines, a shake; 21b: Ross in his chair behind the counter
const WORK = PLT.work as unknown as { file: string; front: { file: string; y0: number; w: number; h: number } };
function BlurShot({ f }: { f: number }) {
  const tt = t(f), s = 1.5, m = cam(s, 384, 672), bz = buzz(f, 9);
  const ghost = (dx: number, dy: number, op: number, i: number) => <Picture key={i} file={WORK.file} w={768 * s} h={1344 * s} x={m.X(384) + dx} y={m.Y(672) + dy} order={1 + i * 0.1} op={op} />;
  return (
    <>
      <Picture file={WORK.file} w={768 * s} h={1344 * s} x={m.X(384)} y={m.Y(672)} order={0} />
      {ghost(12 * Math.sign(bz[0] || 1), 0, 0.2, 1)}
      {ghost(-12 * Math.sign(bz[0] || 1), 0, 0.16, 2)}
      <WindStreaks t={tt} box={[0, 280, W, 1500]} n={26} dir={1} speed={3200} len={[260, 700]} thick={9} order={70} op={0.7} seed={2} />
      <WindStreaks t={tt} box={[0, 280, W, 1500]} n={18} dir={-1} speed={2800} len={[220, 600]} thick={7} order={71} op={0.55} seed={5} color="#fff2b0" />
    </>
  );
}
const R21 = { s: 2.2, yc: 1250, u: 420 };
function FeetShot({ f }: { f: number }) {
  const s = R21.s, v0 = 795 - (R21.yc - 960) / s, m = cam(s, R21.u, v0), E = (s * 80) / HEAD_R, cy = R21.yc - 137 * s - 20, r = rossAt(540, cy, E), pose = rossPose18(f, "feetup"), tt = t(f), bz = buzz(f, 6);
  const front = WORK.front;
  return (
    <>
      <PlateM m={m} file={WORK.file} edge={EDGE_COUNTER} />
      <RossP x={r.x} y={r.y} E={E} order={40} body="feetup" pose={{ ...pose, tilt: pose.tilt + 2.5 * Math.sin(tt * 1.6) }} mouthW={rossMouthW(f)} />
      <Flat d={{ file: front.file, w: front.w, h: front.h, ox: 0, oy: 0 }} apx={0} apy={0} x={fp(m, 0, 795)[0] + 7 * bz[0]} y={fp(m, 0, 795)[1] + 4 * bz[1]} k={s} order={80} />
      <WindStreaks t={tt} box={[0, 1100, W, 1900]} n={12} dir={1} speed={3000} len={[220, 560]} thick={8} order={90} op={0.6} seed={4} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 22: the wall clock of the counter plate: its hands spin forward a full hour (3:00 to 4:00) in 13 frames, with two ghost minute hands behind the fast one, and settle with a small shake
const CLOCK_M = cam(5.0, 587, 197);
const HAND_GHOST: Pt[] = ribbon([[0, -0.14, 0.05], [0, 0.1, 0.07], [0, 0.76, 0.028]]);
function ClockShot({ f }: { f: number }) {
  const m = CLOCK_M, [cx, cy, r] = PL.counter.clock, e = ease((f - Math.round(CLOCK_T * FPS)) / 13), minute = 60 * e, settle = f >= Math.round(CLOCK_T * FPS) + 13 ? Math.exp(-(f - Math.round(CLOCK_T * FPS) - 13) / 3) * Math.sin((f - Math.round(CLOCK_T * FPS) - 13) * 2.2) * 5 : 0;
  const x = m.X(cx) + settle, y = m.Y(cy), R = r * m.s;
  return (
    <>
      <CounterBg m={m} />
      <ClockHands x={x} y={y} r={R} hour={3} minute={minute} order={20} />
      {e > 0.02 && e < 0.97 && [1, 2].map((g) => <Group key={g} x={x} y={y} rot={-(minute - g * 5) * 6} sx={R} sy={R}><Poly pts={HAND_GHOST} color="#1b1b20" order={19 + g * 0.1} op={0.34 / g} /></Group>)}
    </>
  );
}

// ═════════════════════════════════════════════════════ 23: DING, the mom is back at the door and freezes; on the counter the toddler in his tiny apron thrusts a coffee at her, "$6.50" pops up over the cup and his eyes buzz
const SLAM_M = cam(2.6, 300, 662);
const TA_A: [number, number] = [516, 925];
function SlamShot({ f }: { f: number }) {
  const m = SLAM_M, tt = t(f), a = tt - SLAM_T, pop = a >= 0 ? popP(tt, SLAM_T, 0.45, 40) : 0, L = a >= 0 ? Math.exp(-a / 0.1) : 0, bz = buzz(f, 3), d = pic("toddler_apron");
  const k = 1.0, x = 650, y = 1500, big = 1 + 0.1 * L, door = ease((f - 681) / 3), cup = [x + (430 - TA_A[0]) * k, y + (600 - TA_A[1]) * k];
  return (
    <>
      <CounterBg m={m} />
      <Poly pts={FR(870, 700, 1100, 1560)} color="#6b4a2a" order={4} />
      <Poly pts={FR(894, 724, 1100, 1536)} color="#cfeaf5" order={4.1} />
      <Group x={PX(1100)} y={0} sx={1 - 0.84 * door}><Poly pts={[[-230, PY(700)], [0, PY(700)], [0, PY(1560)], [-230, PY(1560)]]} color="#7d5a35" order={4.5} /></Group>
      <Mom f={f} who="mom_walk" anchor={[490, 955]} x={968} y={1520} k={0.55} order={5} />
      <Flat d={d} apx={TA_A[0]} apy={TA_A[1]} x={x} y={y} k={k} sx={big * (1 + 0.06 * L)} sy={big * (1 - 0.05 * L)} order={30}>
        {({ ax, ay }) => (
          <>
            <LookPupils apx={TA_A[0]} apy={TA_A[1]} eyes={d.eyes!} pupils={d.pupils!} gaze={[0.9 * bz[0], 0.9 * bz[1]]} pr={6} white="#fdfdfb" order={31} margin={5} />
            {d.grin && <TalkMouth grin={d.grin} d={d} ax={ax} ay={ay} shape={mouthAt("TODDLER", f)} order={32} teeth={false} />}
          </>
        )}
      </Flat>
      {a >= 0 && a < 0.2 && <Impact cx={cup[0]} cy={cup[1] + 40} r={120} age={a} order={40} />}
      {a >= 0 && <PriceTag x={PX(cup[0] - 250)} y={PY(cup[1] - 90 - 24 * pop)} s={Math.max(0.01, pop) * 0.9} rot={-6} order={90} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 24: the mom, outraged (mom-shock: both hands at her cheeks): she rocks and dips on her loud syllables. 25: Ross behind the counter, calm, wiping a cup; on the counter the toddler tips the oat milk
// carton over the register again, the first stream at 27.6 s (it is the first shot's pour: the reel loops)
function ShockShot({ f }: { f: number }) {
  const mv = talkMove("MOM", f), k = 1.5;
  return (
    <>
      <SeatBg m={cam(2.94, 415, 676)} />
      <Floor y={1700} s={2.94} />
      <Mom f={f} who="mom_shock" x={540 + 4 * Math.sin(twos(f) * 2.1)} y={800 - mv.bob * k} k={k} rot={mv.tilt * 0.9} sy={1 + 0.006 * mv.bob} order={20} lidBase={0} />
    </>
  );
}
const R25 = { E: 1.0, yc: 1150, cx: 700 };
function WipeShot({ f }: { f: number }) {
  const m = rossView25(), tt = t(f), cy = R25.yc - 137 * m.s, reach = ease((f - GLUG2_T * FPS) / 3), tx = 235, ty = R25.yc + 180, tk = 0.5, cap = tdPt(tx, ty, tk, 290, 820), land: [number, number] = [cap[0] - 14, fp(m, 150, 892)[1]];
  return (
    <>
      <CounterBg m={m} />
      <RossP x={rossAt(R25.cx, cy, R25.E).x} y={rossAt(R25.cx, cy, R25.E).y} E={R25.E} order={40} body={hasBody("wipe") ? "wipe" : "apron"} pose={rossPose18(f, "wipe")} mouthW={rossMouthW(f)} />
      <CounterFront m={m} order={80} />
      <PulledDrawer m={m} fill={clamp01((f - 828) / 24) * 0.45} order={84} />
      <ToddlerPour x={tx} y={ty} k={tk} rot={-9 * (1 - ease((f - 798) / 28)) + 2.5 * ease((f - 826) / 6)} order={88} />
      {reach > 0 && <MilkStream a={[cap[0], cap[1] + 6]} b={[cap[0] - 8, cap[1] + 40]} c={land} w={30} t={tt} reach={reach} order={92} />}
    </>
  );
}
const rossView25 = () => counterView(VIEW_S(R25.E), R25.yc, 330);

// ═════════════════════════════════════════════════════ the shots
/** the point each shot's camera zooms about (frame px) */
export const FOCUS: Record<ShotId, [number, number]> = {
  till: [540, 960], pour: [540, 1000], mom1: [540, 900], grin: [540, 900], ross1: [540, 760], mom2: [520, 900], flat: [500, 760], lick: [540, 960], smug: [600, 960], tape: [540, 1000], sign: [540, 800], glasses: [540, 960], darts: [540, 960], walk: [540, 1250],
  drop: [540, 1100], wagon: [540, 1200], row: [540, 1000], finger: [590, 700], cups: [540, 1000], zap: [540, 1000], flip: [540, 800], blur: [540, 1000], feet: [540, 1000], clock: [540, 960], slam: [540, 1000], shock: [540, 900], wipe: [440, 1000],
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = {
  till: V("till", TillShot), pour: V("pour", PourShot), mom1: V("mom1", Mom1Shot), grin: V("grin", GrinShot), ross1: V("ross1", Ross1Shot), mom2: V("mom2", Mom2Shot), flat: V("flat", FlatShot), lick: V("lick", LickShot), smug: V("smug", SmugShot), tape: V("tape", TapeShot),
  sign: V("sign", SignShot), glasses: V("glasses", GlassesShot), darts: V("darts", DartsShot), walk: V("walk", WalkShot), drop: V("drop", DropShot), wagon: V("wagon", WagonShot), row: V("row", RowShot), finger: V("finger", FingerShot),
  cups: V("cups", CupsShot), zap: V("zap", ZapShot), flip: V("flip", FlipShot), blur: V("blur", BlurShot), feet: V("feet", FeetShot), clock: V("clock", ClockShot), slam: V("slam", SlamShot), shock: V("shock", ShockShot), wipe: V("wipe", WipeShot),
};
export const ART: Record<ShotId, string> = {
  till: "ins-till+(code: milk, money)", pour: "toddler-pour+bg-counter+(code: OAT MILK, drawer, milk)", mom1: "mom-phone+bg-seating+(code: brows, mouth, lids)", grin: "toddler-pour+bg-counter+(code: OAT MILK, milk)", ross1: "ross-apron+bg-counter+(code: milk)", mom2: "mom-phone+bg-seating+(code: brows)",
  flat: "ross-apron+bg-counter", lick: "prop-case+girl-lick+(code: smear)", smug: "mom-phone (mirrored)+bg-seating+(code: brows, lids)", tape: "ross-tape+bg-seating+(code: tape, smear)", sign: "prop-sign+prop-case+(code: letters)",
  glasses: "mom-phone>mom-glasses+(code: pupils, mouth)", darts: "mom-glasses+(code: pupils)", walk: "bg-window+mom-walk", drop: "bg-window+dropoff (5 pieces)", wagon: "bg-window+grandpa+wagon", row: "kids-row (8 pieces)+bg-window+prop-sign",
  finger: "ross-finger+bg-counter", cups: "bg-counter+prop-cup+(code: hands)", zap: "kids-row>kids-zap+(code: bolts, flash)", flip: "hand-ross+prop-sign+(code: back)", blur: "kids-work+(code: ghosts, speed lines)", feet: "ross-feetup+kids-work",
  clock: "bg-counter clock+(code: hands)", slam: "toddler-apron+mom-walk+bg-counter+(code: $6.50)", shock: "mom-shock+bg-seating", wipe: "ross-wipe+toddler-pour+bg-counter",
};
void CUPS_T; void WAGON_T; void inShot; void pp; void BELL_T; void Inked; void roundRect; void Picture;
