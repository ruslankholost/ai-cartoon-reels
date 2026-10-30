import React from "react";
import { Picture, Poly, ellipsePts, grow, roundRect, type Pt } from "./sp-puppet";
import { Group, Squash, type View } from "./pen-stage";
import { Cork, PopBurst } from "./x08-fx";
import { Impact, ShoutLines, Wash, FR, PX, PY } from "./x13-draw";
import { rect } from "./x09-stage";
import { BeltEnds, EarPlumes, Feather, Hand, ScarfTails, Sweat, WindStreaks } from "./x17-draw";
import { CapLetters, Glare, Inside, PASS_BOX, Pass, SeatTag, Sky } from "./x17-props";
import { coupleMove, dropAt, faMove, pilotMove, rossMouthW, rossPose17 } from "./x17-act";
import { shotX } from "./x17-shared";
import { BrideLids, Flat, GrinTalk, HAIR_TOP, PlateM, RG17, ROSS_EARS, RossP, TalkMouth, cam, headFrame, headPt, kid, rossAt, sp, type RossBody } from "./x17-stage";
import {
  BANG_T, CLINK_T, CORK_T, DING_T, DOOR_T, FPS, PASS_T, PLOP_T, POP2_T, POP_T, PRESENT_T, SLAP_T, SCREAM_T, SNAP_T, SQUEAK_T, SUCK_T, TAIL_T, THROB1_T, THROB2_T, YANK_T,
  batOf, clamp01, ease, lerp, mouthAt, popP, squashAt, steamLevel, twos, type ShotId,
} from "./x17-sched";

// The scenes of x17 "Seat Swap": one canvas per shot, hard cuts. Each is the art of the shot (the pictures cut from out/x17-cast by scripts/x17-prep.py, src/x17-rig.json: Ross's four bodies on x08's head, the couple, the attendant, the peacock man and
// his fanned peacock, the pilot, the cap, and the plates of the cabin by window 12A, the seat in front, row 47, the wing and the cockpit) under the effects and writing drawn in code (src/x17-draw.tsx, src/x17-props.tsx). Plates are seen through a view `m`
// (src/x09-stage.tsx cam: plate px -> frame px); people are placed by the frame point of the middle of the head (Ross) or an anchor point of the picture (the flat people) and a scale. A shot's `m` never moves: the camera's zoom (src/x17-sched.ts
// holdPush) is the canvas's (src/x17-shared.tsx). Frame px: x right, y down, 1080 x 1920. Wind blows from the right to the left everywhere (the plane flies to the right), in the cabin and on the wing.
const t = (f: number) => f / FPS;
const W = 1080, H = 1920, D2R = Math.PI / 180;
const fp = (m: View, u: number, v: number): [number, number] => [W / 2 + m.X(u), H / 2 - m.Y(v)];   // a plate point as a frame point
const PlateLayer = ({ m, file, order, op = 1, tint }: { m: View; file: string; order: number; op?: number; tint?: string }) => <Picture file={file} w={768 * m.s} h={1344 * m.s} x={m.X(384)} y={m.Y(672)} order={order} alpha op={op} tint={tint} />;
type D = { file: string; w: number; h: number; ox: number; oy: number };
const P = RG17.people, PL = RG17.plates;
const CAB = PL.cabin, SB = PL.seatback, R47 = PL.row47, WG = PL.wing, CP = PL.cockpit;
const dOf = (p: unknown) => p as D;
/** a frame point turned by `deg` degrees counter-clockwise on the screen about another (what a Flat's rot does to a point of the picture) */
const turn = (p: [number, number], c: [number, number], deg: number): [number, number] => { const a = deg * D2R, dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * Math.cos(a) + dy * Math.sin(a), c[1] - dx * Math.sin(a) + dy * Math.cos(a)]; };

// ═════════════════════════════════════════════════════ Ross in a shot: his head placed at frame (cx, cy) at scale E, his pose of this frame; the places of his ears and of the top of his head for what is put on them
function RossBlock({ f, cx, cy, E, body, order = 40, attach, mouthW }: { f: number; cx: number; cy: number; E: number; body: RossBody; order?: number; attach?: React.ReactNode; mouthW?: number }) {
  const r = rossAt(cx, cy, E), pose = rossPose17(f, body);
  return <RossP f={f} x={r.x} y={r.y} E={E} order={order} body={body} pose={pose} mouthW={mouthW ?? rossMouthW(f)} attach={attach} />;
}
/** the two ear holes of Ross (panel px: where the corks leave from; frame px: where the steam does) */
function earsOf(f: number, cx: number, cy: number, E: number, body: RossBody): { panel: [number, number][]; frame: [number, number][] } {
  const r = rossAt(cx, cy, E), pose = rossPose17(f, body);
  const panel = ROSS_EARS.map(([hx, hy]) => headPt(pose, E, r.x, r.y, hx, hy)) as [number, number][];
  return { panel, frame: panel.map(([x, y]) => [x + W / 2, H / 2 - y] as [number, number]) };
}
/** a picture placed in Ross's head space (head px from the neck pivot, y up): the sprite `d` with its picture point (apx, apy) on the head point (hx, hy), scaled by k and turned by rot degrees */
function OnHead({ d, apx, apy, hx, hy, k, rot = 0, sx = 1, sy = 1, order }: { d: D; apx: number; apy: number; hx: number; hy: number; k: number; rot?: number; sx?: number; sy?: number; order: number }) {
  const [ax, ay] = sp(d, apx, apy);
  return <Group x={hx} y={hy} rot={rot} sx={k * sx} sy={k * sy}><Picture file={d.file} w={d.w} h={d.h} x={d.w / 2 - ax} y={ay - d.h / 2} order={order} alpha /></Group>;
}
const HAT = dOf(P.pilot_hat);
/** the captain's cap on Ross's head, a little askew: its peak is on his hair, above the vein; it squashes on the frame it lands */
const HatOnHead = ({ f, order = 52 }: { f: number; order?: number }) => {
  const a = t(f) - PLOP_T, sq = a >= 0 ? 0.16 * Math.exp(-a / 0.07) * Math.cos(a * 38) : 0;
  return <OnHead d={HAT} apx={525} apy={725} hx={0} hy={366} k={0.56} rot={-7} sx={1 + sq} sy={1 - sq} order={order} />;
};
/** the peacock's feathers in his hair (shot 11): three of them out of the top of his head, fanned out. The quills sit in the hair (it is lower at the sides than at HAIR_TOP); each feather takes 2 orders */
const FeathersInHair = ({ order = 52 }: { order?: number }) => (
  <>
    <Feather x={-52} y={HAIR_TOP[1] - 40} rot={30} k={1.15} order={order} />
    <Feather x={6} y={HAIR_TOP[1] - 30} rot={3} k={1.3} order={order + 2} />
    <Feather x={62} y={HAIR_TOP[1] - 26} rot={-32} k={1.1} order={order + 4} />
  </>
);

// ═════════════════════════════════════════════════════ the cabin by window 12A (shots 1 and 6): the plate at 1.7 times with the window on the left; the sky and the clouds that slide past are drawn through the glass's own mask
const CAB_M = cam(1.7, 401.4, 727);
function CabinBg({ f }: { f: number }) {
  const g = CAB.glass, [fx, fy] = fp(CAB_M, g.ox + g.w / 2, g.oy + g.h / 2);
  return (
    <>
      <PlateM m={CAB_M} file={CAB.file} edge={{ top: "#fdf0c8", bottom: "#16234a" }} />
      <Sky x={PX(fx)} y={PY(fy)} cfg={{ w: g.w * CAB_M.s, h: g.h * CAB_M.s, t: t(f), speed: 190, seed: 3, size: 1.6, shape: "all", top: "#8fd2f8", bottom: "#c3e9fd" }} maskFile={g.file} order={6} />
    </>
  );
}
const SEAT = { cx: 640, cy: 990, E: 1.25 };
/** 1: Ross drops into 12A (the whole seat comes down with him and squashes on the landing), his head goes over to the window, the cheek on the glass, his eyes shut. The label is the DOM's */
function DropShot({ f }: { f: number }) {
  const d = dropAt(f);
  return (
    <>
      <CabinBg f={f} />
      <Squash x={PX(540)} y={PY(1850)} sx={1 + 0.1 * d.sq} sy={1 - 0.14 * d.sq}>
        <RossBlock f={f} cx={SEAT.cx} cy={SEAT.cy - d.dy * SEAT.E} E={SEAT.E} body="seat" />
      </Squash>
    </>
  );
}
/** 6: Ross, still at the window, comes off the glass: the frozen smile, the eye twitching, "...Sure." */
const SureShot = ({ f }: { f: number }) => (
  <>
    <CabinBg f={f} />
    <RossBlock f={f} cx={SEAT.cx} cy={SEAT.cy} E={SEAT.E + 0.05} body="seat" />
  </>
);

// ═════════════════════════════════════════════════════ 2: the pass on the tray table, from above (the seat in front is the blue behind it); 5: her pass slapped up into the frame
function TrayBg() {
  return (
    <>
      <Wash color="#34507a" op={1} order={0} />
      <Poly pts={FR(-60, 740, 1140, 2000)} color="#bbc2cb" order={4} />
      <Poly pts={FR(-60, 740, 1140, 764)} color="#7b8594" order={5} />
      <Poly pts={FR(-60, 764, 1140, 782)} color="#dbe0e6" order={5} />
      <Poly pts={FR(-60, 782, 1140, 790)} color="#a3abb7" order={5} />
    </>
  );
}
function PassShot({ f }: { f: number }) {
  const t0 = t(23), u = clamp01((t(f) - t0) / 0.12), e = ease(u), s = squashAt(t(f), t0 + 0.12, 0.3, 34), x = lerp(860, 540, e), y = lerp(380, 960, e);
  return (
    <>
      <TrayBg />
      <Poly pts={roundRect(PASS_BOX.w * 1.05, PASS_BOX.h * 1.05, 34).map(([a, b]) => [a + PX(x) + 16, b + PY(y) - 22] as Pt)} color="#000000" order={28} op={0.28} />
      <Pass x={PX(x)} y={PY(y)} k={1.05} kind="mine" rot={-3 - 9 * (1 - e)} order={30} sx={1 + 0.05 * s} sy={1 - 0.08 * s} />
    </>
  );
}
const SB_M3 = cam(1.5, 384, 655);   // the plate's seat top (row 715) at frame y 1050
function SlapShot({ f }: { f: number }) {
  const a = t(f) - SLAP_T, u = clamp01((a + 0.1) / 0.1), py = lerp(1560, 960, ease(u)) + (a >= 0 ? 60 * Math.exp(-a / 0.08) * Math.cos(a * 36) : 0);
  return (
    <>
      <PlateM m={SB_M3} file={SB.file} edge={{ top: "#efe6cc", bottom: "#4f6b92" }} />
      <Wash color="#0a1426" op={0.5} order={3} />
      <Pass x={PX(560)} y={PY(py)} k={1.12} kind="hers" rot={2 + 5 * (1 - ease(u))} order={30} />
      <Hand x={800} y={py + 225} rot={-18} k={1.45} sleeve="#fbf9f2" cuff="#e4e0d2" order={34} grip={1} len={700} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 3 and 4: the couple over the seat in front. The plate's seat top is the line they rise from (their picture's row 752 is its top: everything under it is cut off, and the plate's seat in front of
// them hides what is not); their grins' mouths, the bride's lashes and the lettering on their caps are drawn on the sprite
const CP_ = P.couple_pop, CPD = dOf(CP_);
const CAP_BOXES = CP_.caps as ([number, number, number, number] | null)[];
function CoupleSprite({ f, x, y, k, rot = 0, order = 20, lids = false }: { f: number; x: number; y: number; k: number; rot?: number; order?: number; lids?: boolean }) {
  const gb = CP_.grin.bride, gg = CP_.grin.groom;
  return (
    <Flat d={CPD} apx={512} apy={752} x={x} y={y} k={k} rot={rot} order={order}>
      {({ ax, ay }) => (
        <>
          {CAP_BOXES.map((c, i) => {
            if (!c) return null;
            const w = c[2] - c[0], h = c[3] - c[1], [px, py] = kid(CPD, ax, ay, (c[0] + c[2]) / 2, c[1] + 0.62 * h);
            return <CapLetters key={i} x={px} y={py} w={0.78 * w} h={0.5 * h} order={order + 4} />;
          })}
          <TalkMouth grin={gb} d={CPD} ax={ax} ay={ay} shape={mouthAt("BRIDE", f)} order={order + 2} />
          <TalkMouth grin={gg} d={CPD} ax={ax} ay={ay} shape={mouthAt("GROOM", f)} order={order + 2} />
          {lids && <BrideLids eyes={CP_.eyes!.bride} d={CPD} ax={ax} ay={ay} skin={gb.skin} c={batOf(f)} order={order + 3} />}
        </>
      )}
    </Flat>
  );
}
function CoupleScene({ f, m, k, seatY, lean = 0, lids = false }: { f: number; m: View; k: number; seatY: number; lean?: number; lids?: boolean }) {
  const a = t(f) - POP_T, rise = 760 * (1 - popP(t(f), POP_T, 0.5, 34)), mv = coupleMove(f);
  return (
    <>
      <PlateM m={m} file={SB.file} edge={{ top: "#efe6cc", bottom: "#4f6b92" }} />
      <CoupleSprite f={f} x={540} y={seatY + rise - mv.bob * k} k={k * (1 + lean)} rot={-mv.tilt * 0.6 - 30 * lean} lids={lids} />
      <PlateLayer m={m} file={SB.front.file} order={200} />
      {a >= 0 && a < 0.14 && <PopBurst at={[PX(540), PY(seatY - 250)]} t={t(f)} t0={POP_T} R={150} order={210} />}
    </>
  );
}
const PopShot = ({ f }: { f: number }) => <CoupleScene f={f} m={SB_M3} k={1.02} seatY={1050} />;
const SB_M4 = cam(2.1, 384, 715 - (1250 - 960) / 2.1);   // the seat top at frame y 1250
const AskShot = ({ f }: { f: number }) => <CoupleScene f={f} m={SB_M4} k={1.38} seatY={1250} lean={0.09 * ease((f - 75) / 40)} lids />;

// ═════════════════════════════════════════════════════ row 47 (shots 7, 11, 12, 14): the plate as painted, its two doors cut out of it as sprites: the toilet's swings open on the bang; the exit's panel is thrown out on its pop and the sky is behind its
// doorway from then on (the plate lies over the sky and has a hole where the door was)
const R47_M = cam(1.43, 384, 672);
function SweatMen({ m, f }: { m: View; f: number }) {
  const s = m.s, k = 11 * s, fall = 95 * s, at = (u: number, v: number) => fp(m, u, v);
  return (
    <>
      <Sweat t={t(f)} at={at(126, 668)} k={k} fall={fall} order={30} seed={1} />
      <Sweat t={t(f)} at={at(218, 664)} k={k} fall={fall} order={30} seed={2} />
      <Sweat t={t(f) + 0.4} at={at(562, 676)} k={k} fall={fall} order={30} seed={3} />
      <Sweat t={t(f) + 0.7} at={at(652, 672)} k={k} fall={fall} order={30} seed={4} />
    </>
  );
}
const DOOR_F = Math.round(DOOR_T * FPS);
const SKY_DOOR = { top: "#7fc0ee", bottom: "#c4e8ff" };
function RowBase({ f, m, sweat = true }: { f: number; m: View; sweat?: boolean }) {
  const [ex0, ey0, ex1, ey1] = R47.exitRect, [tx0, ty0, tx1, ty1] = R47.toiRect, open = f >= DOOR_F, swing = t(f) < BANG_T ? 0 : Math.min(1.1, popP(t(f), BANG_T, 0.38, 46));
  const [sx0, sy0] = fp(m, ex0, ey0), [sx1, sy1] = fp(m, ex1, ey1);
  return (
    <>
      <Wash color="#fdf1c9" op={1} order={-3} />
      <Poly pts={rect(m, tx0, ty0, tx1, ty1)} color="#222b36" order={1} />
      {open && <Sky x={PX((sx0 + sx1) / 2)} y={PY((sy0 + sy1) / 2)} cfg={{ w: sx1 - sx0, h: sy1 - sy0, t: t(f), speed: 1500, seed: 5, size: 1.1 * m.s, shape: "all", top: SKY_DOOR.top, bottom: SKY_DOOR.bottom }} order={2} />}
      <PlateLayer m={m} file={R47.noDoors.file} order={5} />
      <Group x={m.X(tx0)} y={0} sx={1 - 0.84 * swing}><Picture file={R47.toiPanel.file} w={768 * m.s} h={1344 * m.s} x={m.X(384) - m.X(tx0)} y={m.Y(672)} order={6} alpha tint={swing > 0.02 ? "#cfc9b4" : undefined} /></Group>
      {!open && <PlateLayer m={m} file={R47.exitPanel.file} order={7} />}
      {sweat && <SweatMen m={m} f={f} />}
    </>
  );
}
/** the wind that howls in at the open exit: streaks flying across the whole frame to the left, from the door's pop */
const CabinWind = ({ f, n = 26, op = 0.65 }: { f: number; n?: number; op?: number }) => (f >= DOOR_F ? <WindStreaks t={t(f)} box={[0, 200, W, 1500]} n={n} dir={-1} speed={2300} len={[220, 640]} thick={7} order={25} op={op} seed={3} /> : null);

// 7: row 47: Ross crammed in the middle seat between the two huge men; the toilet door bangs open
const CRAM = { cx: 540, cy: 1157, E: 0.8 };
function CramShot({ f }: { f: number }) {
  return (
    <>
      <RowBase f={f} m={R47_M} />
      <RossBlock f={f} cx={CRAM.cx} cy={CRAM.cy} E={CRAM.E} body="cram" />
    </>
  );
}

// ═════════════════════════════════════════════════════ 8 and 9: the attendant leans into the row, the peacock man behind her; the peacock fans its tail. A plain aisle: the plate's wall with its two doors at the edges, a flat wall below and the carpet
const AISLE_M = cam(1.9, 384, 700 - (1400 - 960) / 1.9);
function AisleBg() {
  return (
    <>
      <Wash color="#fcf1c8" op={1} order={-3} />
      <PlateM m={AISLE_M} file={R47.file} edge={{ top: "#fdf1c9", bottom: "#14224a" }} order={-2} />
      <Poly pts={FR(-40, 1330, W + 40, 1700)} color="#fcf1c8" order={0.5} />
      <Poly pts={FR(-40, 1700, W + 40, 2000)} color="#14224a" order={0.6} />
      <Poly pts={FR(-40, 1694, W + 40, 1706)} color="#0b1330" order={0.7} />
    </>
  );
}
const FA_ = P.fa, FAP = P.fa_present, MAN = dOf(P.peacock_man), FAN = dOf(P.peacock_fan);
const FAD = dOf(FA_), FAPD = dOf(FAP);
/** the attendant (a picture with a red-lipped grin that her voice opens a little): `pres` swaps to the picture with her arm out; her head's middle (or, `foot`, her feet) is the anchor */
function Attendant({ f, x, y, k, rot = 0, pres = false, order = 30, sx = 1, sy = 1, foot = false }: { f: number; x: number; y: number; k: number; rot?: number; pres?: boolean; order?: number; sx?: number; sy?: number; foot?: boolean }) {
  const d = pres ? FAPD : FAD, g = (pres ? FAP : FA_).grin!, mv = faMove(f);
  return (
    <Flat d={d} apx={508} apy={foot ? 950 : 335} x={x} y={y - mv.bob * k} k={k} rot={rot + mv.tilt * 0.6} sx={sx} sy={sy} order={order}>
      {({ ax, ay }) => <GrinTalk grin={g} d={d} ax={ax} ay={ay} open={{ closed: 0, small: 0.4, mid: 0.8, wide: 1, o: 0.6, pucker: 0.3 }[mouthAt("FA", f)]} order={order + 2} />}
    </Flat>
  );
}
/** 8: the attendant leans in (a bow toward Ross at the right of the frame) with her frozen smile; behind her the peacock man with his peacock; the ding */
function FaShot({ f }: { f: number }) {
  const a = t(f) - DING_T, lean = ease(a / 0.18), pop = a >= 0 ? 1 + 0.06 * Math.exp(-a / 0.1) * Math.cos(a * 30) : 1;
  return (
    <>
      <AisleBg />
      <Flat d={MAN} apx={510} apy={235} x={830} y={650} k={0.95} order={20} />
      <Attendant f={f} x={380 - 30 * (1 - lean)} y={790} k={1.38 * pop} rot={-9 * lean} order={30} />
    </>
  );
}
/** 9: the peacock man with his peacock on his shoulder, its closed tail hanging at his side, look at Ross; the tail stays shut here (it bursts open on the cut into 10) */
const FAN_BIRD = { u: 511, v: 620 };      // the fanned bird's head in its picture
const PeacockShot = () => (
  <>
    <AisleBg />
    <Flat d={MAN} apx={510} apy={235} x={540} y={700} k={1.15} order={20} />
  </>
);
/** 10: the fan bursts open round Ross on the cut (BURST: its scale on the shot's first five frames, a burst and a rebound, then settled at 2.2), the peacock screams in it from SCREAM_T, the vein pops. The fan is the backdrop (its bird at the right of the frame, beak at his
 *  cheek), Ross in front of it in his seat; on the first frame it is small beside him on the cabin's cream and the green comes in with it */
const BURST = [0.55, 1.35, 2.45, 2.1, 2.3];
function ScreamShot({ f }: { f: number }) {
  const a = t(f) - THROB1_T, g = f - Math.round(TAIL_T * FPS), jit = twos(f) % 4 < 2 ? 1 : -1, birdX = 815 + 6 * jit, birdY = 975 + 4 * jit * (twos(f) % 8 < 4 ? 1 : -1);
  return (
    <>
      <Wash color="#fdf1c9" op={1} order={-3} />
      <Wash color="#1b5d33" op={Math.min(1, g / 2)} order={0} />
      <Flat d={FAN} apx={FAN_BIRD.u} apy={FAN_BIRD.v} x={birdX} y={birdY} k={BURST[g] ?? 2.2} sx={0.85 + 0.15 * Math.min(1, g / 2)} order={10} />
      <RossBlock f={f} cx={400} cy={990} E={1.4} body="cram" />
      <PopBurst at={[PX(birdX), PY(birdY - 150)]} t={t(f)} t0={TAIL_T} R={230} order={65} />
      {t(f) >= SCREAM_T && <ShoutLines cx={birdX - 30} cy={birdY + 10} r0={110} r1={330} f={f} order={60} n={14} />}
      {a >= 0 && <Impact cx={380} cy={760} r={120} age={a} order={170} />}
    </>
  );
}

/** 11: Ross, flat, the vein popped and the peacock's feathers in his hair, the plate's middle seat behind him */
const BIRD_M = cam(2.9, 384, 900);
function BirdShot({ f }: { f: number }) {
  return (
    <>
      <PlateM m={BIRD_M} file={R47.file} edge={{ top: "#fdf1c9", bottom: "#14224a" }} order={-2} />
      <RossBlock f={f} cx={540} cy={1000} E={1.55} body="cram" attach={<FeathersInHair />} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 12: the exit door close up: the attendant's hand yanks the red handle down (its clunk), then the door pops out and the wind howls in
const HANDLE_M = cam(4, 622, 480);
function HandleShot({ f }: { f: number }) {
  const [ex0, ey0, ex1, ey1] = R47.exitRect, [sx0, sy0] = fp(HANDLE_M, ex0, ey0), [sx1, sy1] = fp(HANDLE_M, ex1, ey1), cx = (sx0 + sx1) / 2, cy = (sy0 + sy1) / 2;
  const yank = ease((t(f) - YANK_T) / 0.17), a = t(f) - DOOR_T, open = a >= 0;
  const pivot = fp(HANDLE_M, 703, 465), L = 162 * HANDLE_M.s * 0.5, ang = 84 * yank;
  const tip: [number, number] = [pivot[0] - L * Math.cos(ang * D2R), pivot[1] + L * Math.sin(ang * D2R)];
  const u = clamp01(a / 0.2), e = u * u * (3 - 2 * u);   // the panel when it pops: toward the lens, up and to the left, turning, gone in six frames
  return (
    <>
      <Wash color="#fdf1c9" op={1} order={-3} />
      <Sky x={PX(cx)} y={PY(cy)} cfg={{ w: sx1 - sx0, h: sy1 - sy0, t: t(f), speed: 1600, seed: 5, size: 3.2, shape: "all", top: SKY_DOOR.top, bottom: SKY_DOOR.bottom }} order={1} />
      <PlateLayer m={HANDLE_M} file={R47.noDoors.file} order={5} />
      <Group x={PX(cx) - 230 * e} y={PY(cy) + 380 * e} rot={25 * e} sx={1 + 0.9 * e} sy={1 + 0.9 * e}>
        <Picture file={R47.exitPanel.file} w={768 * HANDLE_M.s} h={1344 * HANDLE_M.s} x={HANDLE_M.X(384) - PX(cx)} y={HANDLE_M.Y(672) - PY(cy)} order={7} alpha op={open ? 1 - clamp01((a - 0.1) / 0.1) : 1} />
      </Group>
      {!open || a < 0.14 ? (
        <Group x={PX(pivot[0])} y={PY(pivot[1])} rot={ang}>
          <Group x={-L * 2 + 8} y={0}><Poly pts={roundRect(30, 100, 8)} color="#8d0c14" order={20} /></Group>
          <Group x={0} y={0}><Poly pts={roundRect(30, 100, 8)} color="#8d0c14" order={20} /></Group>
          <Group x={-L} y={0}>
            <Poly pts={grow(roundRect(L * 2 + 44, 38, 15), 3)} color="#4a060b" order={21} />
            <Poly pts={roundRect(L * 2 + 44, 38, 15)} color="#d3121c" order={21.5} />
            <Poly pts={roundRect(L * 2 + 10, 10, 5).map(([x, y]) => [x, y + 8] as Pt)} color="#ff6a6a" order={21.8} op={0.7} />
          </Group>
        </Group>
      ) : null}
      <Hand x={tip[0]} y={tip[1]} rot={128} k={1.5} order={30} grip={0.6} len={780} />
      {open && <WindStreaks t={t(f)} box={[0, 100, W, 1800]} n={30} dir={-1} speed={2600} len={[260, 700]} thick={8} order={150} op={0.7} seed={7} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 13: the attendant by the open exit presents it like a waiter; the wind whips her scarf. The plate at 2.3 times with the doorway at the right
const PRES_M = cam(3.0, 560, 440);
function PresentShot({ f }: { f: number }) {
  const [ex0, ey0, ex1, ey1] = R47.exitRect, [sx0, sy0] = fp(PRES_M, ex0, ey0), [sx1, sy1] = fp(PRES_M, ex1, ey1), pres = t(f) >= PRESENT_T, a = t(f) - PRESENT_T, smear = a >= 0 && a < 0.07 ? 1.1 : 1;
  const AX = 300, AY = 700, AK = 1.2;
  return (
    <>
      <Wash color="#fdf1c9" op={1} order={-3} />
      <Sky x={PX((sx0 + sx1) / 2)} y={PY((sy0 + sy1) / 2)} cfg={{ w: sx1 - sx0, h: sy1 - sy0, t: t(f), speed: 1500, seed: 5, size: 3.0, shape: "all", top: SKY_DOOR.top, bottom: SKY_DOOR.bottom }} order={2} />
      <PlateLayer m={PRES_M} file={R47.noDoors.file} order={5} />
      <Attendant f={f} x={AX} y={AY} k={AK} pres={pres} sx={smear} order={30} />
      <ScarfTails x={AX + (523 - 508) * AK} y={AY + (543 - 335) * AK} t={t(f)} dir={-1} k={1.3} amp={1.1} order={44} />
      <CabinWind f={f} n={32} op={0.75} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 14: WHOOSH: Ross stretches toward the open exit like taffy and is gone; the belt snaps open (row 47 again, the exit's doorway full of sky)
function Taffy({ px, py, ang, k, slide, children }: { px: number; py: number; ang: number; k: number; slide: number; children: React.ReactNode }) {
  const c = Math.cos(ang * D2R), s = Math.sin(ang * D2R);
  return (
    <group position={[slide * c, slide * s, 0]}>
      <group position={[px, py, 0]} rotation={[0, 0, ang * D2R]}>
        <group scale={[k, 1 / Math.sqrt(k), 1]}>
          <group rotation={[0, 0, -ang * D2R]}>
            <group position={[-px, -py, 0]}>{children}</group>
          </group>
        </group>
      </group>
    </group>
  );
}
function SuckShot({ f }: { f: number }) {
  const a = t(f) - SUCK_T, k = 1 + 2.6 * ease(a / 0.17), slide = a > 0.17 ? 2400 * ((a - 0.17) / 0.2) ** 2 : 0, gone = a > 0.37;
  return (
    <>
      <RowBase f={f} m={R47_M} sweat={false} />
      {!gone && (
        <Taffy px={PX(CRAM.cx)} py={PY(1300)} ang={58} k={k} slide={slide}>
          <RossBlock f={f} cx={CRAM.cx} cy={CRAM.cy} E={CRAM.E} body="cram" />
        </Taffy>
      )}
      <BeltEnds x={CRAM.cx} y={1380} age={a - 0.03} order={44} />
      <CabinWind f={f} n={36} op={0.8} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the wing (15-20): the sky is drawn in code behind the plate's wing and fuselage (the clouds race by to the left); the exit is a doorway drawn on the fuselage at the right of window 12A
const WingSky = ({ f, speed = 1200 }: { f: number; speed?: number }) => <Sky x={0} y={0} cfg={{ w: W, h: H, t: t(f), speed, seed: 9, size: 2.6, n: 15, shape: "all", top: WG.skyTop, bottom: WG.skyBottom }} order={0} />;
const WingPlate = ({ m }: { m: View }) => <PlateLayer m={m} file={WG.front.file} order={5} />;
const BIG = WG.big;   // window 12A on the wing's plate: its outer box
const WING_M = cam(2.0, 400, 780);
/** the couple kissing behind the glass of window 12A: the plate's big window filled with the cabin's cream, the couple in it and a glare over all */
function WindowCouple({ m, order = 8 }: { m: View; order?: number }) {
  const [x0, y0, x1, y1] = BIG, [fx0, fy0] = fp(m, x0 + 6, y0 + 6), [fx1, fy1] = fp(m, x1 - 6, y1 - 6), w = fx1 - fx0, h = fy1 - fy0, K = dOf(P.couple_kiss), cx = PX((fx0 + fx1) / 2), cy = PY((fy0 + fy1) / 2);
  return (
    <>
      <Inside x={cx} y={cy} w={w} h={h} file={K.file} ax={525 - K.ox} ay={540 - K.oy} k={w / 820} dy={h * 0.12} radius={w * 0.24} order={order} />
      <Glare x={cx} y={cy} w={w} h={h} a={0.3} order={order + 1} />
    </>
  );
}
/** the open exit on the fuselage (plate px 440-580 x 440-700): a dark doorway with a pale frame; `inside` is what stands in it, then the sill of the fuselage over its feet */
const EXIT_W = [452, 432, 568, 622] as const;
function ExitOnWing({ m, inside }: { m: View; inside?: React.ReactNode }) {
  const [x0, y0, x1, y1] = EXIT_W;
  return (
    <>
      <Poly pts={grow(rect(m, x0, y0, x1, y1), 7)} color="#8f969f" order={9} />
      <Poly pts={rect(m, x0, y0, x1, y1)} color="#2b3140" order={9.5} />
      <Poly pts={rect(m, x0 + 8, y0 + 8, x0 + 52, y1 - 6)} color="#3a4254" order={9.6} />
      {inside}
      <Poly pts={rect(m, x0 - 9, y1 - 4, x1 + 9, y1 + 9)} color="#fbfaf6" order={12} />
      <Poly pts={rect(m, x0 - 9, y1 - 4, x1 + 9, y1 + 1)} color="#2b3140" order={12.1} />
    </>
  );
}
const Flap = ({ f, px, py, amp, children }: { f: number; px: number; py: number; amp: number; children: React.ReactNode }) => (
  <Group x={px} y={py} rot={amp * Math.sin(twos(f) * 2.3)}><Group x={-px} y={-py}>{children}</Group></Group>
);
const WING_ROSS = { cx: 520, cy: 1010, E: 0.78 };
const WingWind = ({ f, n = 20, op = 0.5, seed = 2 }: { f: number; n?: number; op?: number; seed?: number }) => <WindStreaks t={t(f)} box={[0, 120, W, 1700]} n={n} dir={-1} speed={2000} len={[200, 560]} thick={6} order={25} op={op} seed={seed} />;
/** 15: WIDE: Ross clings to the wing, his shirt flapping; window 12A with the couple kissing in it and its small "12A"; the attendant leans out of the open exit with her scarf whipping */
function WingShot({ f }: { f: number }) {
  const m = WING_M, feet = fp(m, 510, 622), LEAN = 22, AK = 0.43;
  const knot = turn([feet[0] + (523 - 508) * AK, feet[1] + (543 - 950) * AK], feet, LEAN);
  const tag = fp(m, 362, 604);
  return (
    <>
      <WingSky f={f} />
      <WingPlate m={m} />
      <WindowCouple m={m} />
      <SeatTag x={PX(tag[0])} y={PY(tag[1])} w={118} h={52} text="12A" order={26.5} />
      <ExitOnWing m={m} inside={<Attendant f={f} x={feet[0]} y={feet[1]} k={AK} rot={LEAN} order={10} foot />} />
      <ScarfTails x={knot[0]} y={knot[1]} t={t(f)} dir={-1} k={0.7} amp={1.2} order={13} />
      <Flap f={f} px={PX(WING_ROSS.cx)} py={PY(WING_ROSS.cy)} amp={1.6}>
        <RossBlock f={f} cx={WING_ROSS.cx} cy={WING_ROSS.cy} E={WING_ROSS.E} body="cling" />
      </Flap>
      <WingWind f={f} n={22} op={0.55} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 16: I PAID FOR THAT WINDOW!: Ross on the wing, pointing and yelling at window 12A (up and to the left, the couple kissing in it), the vein, the shout lines, a push-in on the window
const PAID_M = cam(3.0, 465.3, 583.3);
const PAID_ROSS = { cx: 700, cy: 985, E: 1.05, rot: -26 };
function PaidShot({ f }: { f: number }) {
  const m = PAID_M, a = t(f) - THROB2_T, r = rossAt(PAID_ROSS.cx, PAID_ROSS.cy, PAID_ROSS.E), tag = fp(m, 362, 606);
  return (
    <>
      <WingSky f={f} speed={1300} />
      <WingPlate m={m} />
      <WindowCouple m={m} />
      <SeatTag x={PX(tag[0])} y={PY(tag[1])} w={150} h={66} text="12A" order={26.5} />
      <Group x={r.x} y={r.y} rot={PAID_ROSS.rot}>
        <Group x={-r.x} y={-r.y}>
          <RossBlock f={f} cx={PAID_ROSS.cx} cy={PAID_ROSS.cy} E={PAID_ROSS.E} body="point" />
        </Group>
      </Group>
      <ShoutLines cx={PAID_ROSS.cx - 20} cy={PAID_ROSS.cy + 70} r0={PAID_ROSS.E * 230} r1={PAID_ROSS.E * 380} f={f} order={30} n={18} />
      {a >= 0 && <Impact cx={PAID_ROSS.cx - 30} cy={PAID_ROSS.cy - 200} r={110} age={a} order={170} />}
      <WindStreaks t={t(f)} box={[0, 300, W, 1700]} n={22} dir={-1} speed={2200} len={[240, 620]} thick={7} order={25} op={0.6} seed={4} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 17: his face snaps purple; POP POP, the plugs shoot out of his earlobes like corks and the kettle screams (the sky and its clouds behind him, racing)
const PUR = { cx: 540, cy: 1010, E: 1.5 };
function PurpleShot({ f }: { f: number }) {
  const tt = t(f), a = tt - SNAP_T, ears = earsOf(f, PUR.cx, PUR.cy, PUR.E, "cling"), r = 34 * PUR.E / 1.7;
  return (
    <>
      <WingSky f={f} speed={1300} />
      <RossBlock f={f} cx={PUR.cx} cy={PUR.cy} E={PUR.E} body="cling" />
      {a >= 0 && <Impact cx={PUR.cx} cy={PUR.cy - 40} r={PUR.E * 190} age={a} order={170} />}
      {steamLevel(f) > 0 && <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={tt} k={PUR.E / 1.7 * 1.5} lvk={0.55} order={170} />}
      <Cork at={ears.panel[0]} dir={-1} t={tt} t0={CORK_T[0]} r={r} order={175} />
      <Cork at={ears.panel[1]} dir={1} t={tt} t0={CORK_T[1]} r={r} order={175} up={0.8} />
      <PopBurst at={ears.panel[0]} t={tt} t0={CORK_T[0]} R={70 * PUR.E / 1.7} order={174} />
      <PopBurst at={ears.panel[1]} t={tt} t0={CORK_T[1]} R={70 * PUR.E / 1.7} order={174} />
      <WindStreaks t={tt} box={[0, 200, W, 1700]} n={20} dir={-1} speed={2200} len={[240, 620]} thick={7} order={25} op={0.5} seed={6} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 18 to 20: the pilot steps out of the exit onto the wing with a drink, walks over, sits down next to Ross and stretches his legs out; he drops his cap on Ross's head without looking
const PIL = { stand: P.pilot_stand, sit: P.pilot_sit, bare: P.pilot_sit_bare } as const;
function Pilot({ f, kind, x, y, k, rot = 0, sx = 1, sy = 1, order = 30 }: { f: number; kind: "stand" | "sit" | "bare"; x: number; y: number; k: number; rot?: number; sx?: number; sy?: number; order?: number }) {
  const d = dOf(PIL[kind]), g = PIL[kind].grin!, mv = pilotMove(f), shape = mouthAt("PILOT", f);
  return (
    <Flat d={d} apx={508} apy={335} x={x} y={y - mv.bob * k} k={k} rot={rot + mv.tilt * 0.5} sx={sx} sy={sy} order={order}>
      {({ ax, ay }) => <TalkMouth grin={{ ...g, box: [488, 446, 540, 478] }} d={d} ax={ax} ay={ay} shape={shape} order={order + 2} teeth={false} patch={1.05} />}
    </Flat>
  );
}
const ROSS_W2 = { cx: 400, cy: 1010, E: 0.78 };
/** 18: WIDE: the pilot steps out of the exit (the doorway at the right), walks down to the wing and sits next to Ross (the clink); Ross steams */
function PilotShot({ f }: { f: number }) {
  const m = WING_M, t0 = t(614), a = t(f) - t0, u = clamp01(a / (CLINK_T - t0)), sat = t(f) >= CLINK_T, tag = fp(m, 362, 604);
  const from = fp(m, 510, 612), to: [number, number] = [790, 1090], hop = Math.abs(Math.sin(a * 22)) * 20 * (1 - u * 0.4);
  const x = lerp(from[0], to[0], ease(u)), y = lerp(from[1] + 20, to[1], ease(u)) - (sat ? 0 : hop), kk = lerp(0.3, 0.6, ease(u)), sq = squashAt(t(f), CLINK_T, 0.3, 34);
  const ears = earsOf(f, ROSS_W2.cx, ROSS_W2.cy, ROSS_W2.E, "cling");
  return (
    <>
      <WingSky f={f} />
      <WingPlate m={m} />
      <WindowCouple m={m} />
      <SeatTag x={PX(tag[0])} y={PY(tag[1])} w={118} h={52} text="12A" order={26.5} />
      <ExitOnWing m={m} />
      <Flap f={f} px={PX(ROSS_W2.cx)} py={PY(ROSS_W2.cy)} amp={1.2}><RossBlock f={f} cx={ROSS_W2.cx} cy={ROSS_W2.cy} E={ROSS_W2.E} body="cling" /></Flap>
      <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={t(f)} k={0.6} lvk={0.5} order={170} />
      {!sat ? <Pilot f={f} kind="stand" x={x} y={y} k={kk} order={30} /> : <Pilot f={f} kind="sit" x={x} y={y + 60} k={0.6} sx={1 + 0.1 * sq} sy={1 - 0.14 * sq} order={30} />}
      <WingWind f={f} n={18} op={0.5} seed={8} />
    </>
  );
}
const MED_M = cam(2.6, 420, 840);
const MED_ROSS = { cx: 330, cy: 1000, E: 0.95 }, MED_PILOT = { x: 760, y: 920, k: 0.95 };
/** 19: MEDIUM: the pilot sits on the wing, legs stretched out, the drink, "Ahh. Legroom."; Ross steams beside him */
function LegroomShot({ f }: { f: number }) {
  const ears = earsOf(f, MED_ROSS.cx, MED_ROSS.cy, MED_ROSS.E, "cling");
  return (
    <>
      <WingSky f={f} />
      <WingPlate m={MED_M} />
      <Flap f={f} px={PX(MED_ROSS.cx)} py={PY(MED_ROSS.cy)} amp={0.9}><RossBlock f={f} cx={MED_ROSS.cx} cy={MED_ROSS.cy} E={MED_ROSS.E} body="cling" /></Flap>
      <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={t(f)} k={0.95} lvk={0.7} order={170} />
      <Pilot f={f} kind="sit" x={MED_PILOT.x} y={MED_PILOT.y} k={MED_PILOT.k} order={30} />
      <WingWind f={f} n={14} op={0.45} seed={9} />
    </>
  );
}
/** 20: without looking, the pilot drops his cap on Ross's head (it flies over in six frames, lands with a squash and a plop and stays there) */
function HatShot({ f }: { f: number }) {
  const tt = t(f), a = tt - t(701), landed = tt >= PLOP_T, u = clamp01(a / (PLOP_T - t(701))), ears = earsOf(f, MED_ROSS.cx, MED_ROSS.cy, MED_ROSS.E, "cling");
  const from: [number, number] = [MED_PILOT.x + 20, MED_PILOT.y - 260], land = headFrame(rossPose17(f, "cling"), MED_ROSS.cx, MED_ROSS.cy, MED_ROSS.E, [0, 396]);
  const x = lerp(from[0], land[0], ease(u)), y = lerp(from[1], land[1], u) - 220 * Math.sin(Math.PI * u), rot = lerp(-40, -7, ease(u));
  return (
    <>
      <WingSky f={f} />
      <WingPlate m={MED_M} />
      <Flap f={f} px={PX(MED_ROSS.cx)} py={PY(MED_ROSS.cy)} amp={0.6}><RossBlock f={f} cx={MED_ROSS.cx} cy={MED_ROSS.cy} E={MED_ROSS.E} body="cling" attach={landed ? <HatOnHead f={f} /> : undefined} /></Flap>
      <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={t(f)} k={0.95} lvk={0.6} order={170} />
      <Pilot f={f} kind="bare" x={MED_PILOT.x} y={MED_PILOT.y} k={MED_PILOT.k} order={30} />
      {!landed && <Flat d={HAT} apx={525} apy={725} x={x} y={y} k={0.56 * MED_ROSS.E} rot={rot} order={60} />}
      <WingWind f={f} n={12} op={0.4} seed={10} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 21 and 22: the cockpit seen from outside through its windshield: Ross in the captain's seat, the cap on, steam curling from his ears; he leans his cheek on the glass and it squashes; the couple pops up
// behind him. The windshield is code: a thick dark frame, the glare of the glass, the cheek's squash
const CK_M = cam(1.43, 384, 672);
const CK_ROSS = { cx: 537, cy: 860, E: 1.15 };
function CheekPress({ f, order = 53 }: { f: number; order?: number }) {
  if (t(f) < SQUEAK_T) return null;
  const k = Math.min(1.1, popP(t(f), SQUEAK_T, 0.4, 36));
  return (
    <Group x={-142} y={128} rot={18} sx={k} sy={k}>
      <Poly pts={ellipsePts(0, 0, 84, 62, 28)} color="#ffffff" order={order} op={0.3} />
      <Poly pts={ellipsePts(-4, 2, 50, 36, 24)} color="#ffffff" order={order + 0.1} op={0.22} />
      {[-0.5, 0.1, 0.7].map((u, i) => <Poly key={i} pts={[[-96 + 20 * u, 70 + 28 * u], [-80 + 20 * u, 78 + 28 * u], [-86 + 20 * u, 100 + 28 * u]]} color="#ffffff" order={order + 0.2} op={0.7} />)}
    </Group>
  );
}
function Windshield({ f }: { f: number }) {
  const shift = 40 * Math.sin(t(f) * 0.6);
  return (
    <>
      <Poly pts={FR(-40, -40, W + 40, 210)} color="#0e1014" order={190} />
      <Poly pts={FR(-40, 1650, W + 40, 2000)} color="#0e1014" order={190} />
      <Poly pts={FR(-40, 190, 70, 1670)} color="#0e1014" order={190} />
      <Poly pts={FR(W - 70, 190, W + 40, 1670)} color="#0e1014" order={190} />
      <Poly pts={FR(-40, 205, W + 40, 218)} color="#3a3f48" order={190.5} />
      <Poly pts={FR(-40, 1637, W + 40, 1650)} color="#3a3f48" order={190.5} />
      <Poly pts={FR(66, 190, 78, 1670)} color="#3a3f48" order={190.5} />
      <Poly pts={FR(W - 78, 190, W - 66, 1670)} color="#3a3f48" order={190.5} />
      {[[34, 120], [W - 34, 120], [34, 1730], [W - 34, 1730], [34, 925], [W - 34, 925]].map(([x, y], i) => <Poly key={i} pts={ellipsePts(PX(x), PY(y), 11, 11, 14)} color="#4a505b" order={191} />)}
      <Glare x={0} y={PY(930)} w={940} h={1440} a={0.2} shift={shift} order={192} />
      <Poly pts={ellipsePts(PX(250), PY(430), 60, 28, 20)} color="#ffffff" order={193} op={0.28} />
    </>
  );
}
const CockpitBase = ({ m }: { m: View }) => <PlateM m={m} file={CP.file} edge={{ top: "#3b3b3d", bottom: "#202226" }} order={-2} />;
function GlassShot({ f }: { f: number }) {
  const tt = t(f), ears = earsOf(f, CK_ROSS.cx, CK_ROSS.cy, CK_ROSS.E, "seat"), press = Math.min(1, popP(tt, SQUEAK_T, 0.4, 36));
  return (
    <>
      <CockpitBase m={CK_M} />
      <Squash x={PX(CK_ROSS.cx)} y={PY(CK_ROSS.cy + 260)} sx={1 + 0.08 * press} sy={1 - 0.05 * press}>
        <RossBlock f={f} cx={CK_ROSS.cx - 14 * press} cy={CK_ROSS.cy} E={CK_ROSS.E} body="seat" attach={<><HatOnHead f={f} /><CheekPress f={f} /></>} />
      </Squash>
      <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={tt} k={1.0} lvk={0.45} order={170} />
      <Windshield f={f} />
    </>
  );
}
const CK2_M = cam(1.1, 384, 672);
const CK2_ROSS = { cx: 540, cy: 790, E: 1.0 };
function HiiiShot({ f }: { f: number }) {
  const tt = t(f), ears = earsOf(f, CK2_ROSS.cx, CK2_ROSS.cy, CK2_ROSS.E, "seat"), rise = 1300 * (1 - popP(tt, POP2_T, 0.6, 30)), mv = coupleMove(f);
  return (
    <>
      <CockpitBase m={CK2_M} />
      <CoupleSprite f={f} x={540} y={1100 + rise - mv.bob} k={1.16} rot={-mv.tilt * 0.4} order={20} />
      <Squash x={PX(CK2_ROSS.cx)} y={PY(CK2_ROSS.cy + 230)} sx={1.08} sy={0.95}>
        <RossBlock f={f} cx={CK2_ROSS.cx - 14} cy={CK2_ROSS.cy} E={CK2_ROSS.E} body="seat" attach={<><HatOnHead f={f} /><CheekPress f={f} /></>} />
      </Squash>
      <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={tt} k={0.9} lvk={0.45} order={170} />
      <Windshield f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the 22 shots
export const FOCUS: Record<ShotId, [number, number]> = {
  drop: [540, 1000], pass: [540, 960], pop: [540, 800], ask: [540, 800], slap: [540, 960], sure: [600, 960], cram: [540, 1100], fa: [500, 900], peacock: [540, 800], scream: [500, 980], bird: [540, 1000], handle: [540, 960], present: [540, 900],
  suck: [540, 1100], wing: [500, 1000], paid: [230, 830], purple: [540, 1000], pilot: [540, 1000], legroom: [540, 960], hat: [540, 960], glass: [540, 700], hiii: [540, 800],
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = {
  drop: V("drop", DropShot), pass: V("pass", PassShot), pop: V("pop", PopShot), ask: V("ask", AskShot), slap: V("slap", SlapShot), sure: V("sure", SureShot), cram: V("cram", CramShot), fa: V("fa", FaShot), peacock: V("peacock", PeacockShot),
  scream: V("scream", ScreamShot), bird: V("bird", BirdShot), handle: V("handle", HandleShot), present: V("present", PresentShot), suck: V("suck", SuckShot), wing: V("wing", WingShot), paid: V("paid", PaidShot), purple: V("purple", PurpleShot),
  pilot: V("pilot", PilotShot), legroom: V("legroom", LegroomShot), hat: V("hat", HatShot), glass: V("glass", GlassShot), hiii: V("hiii", HiiiShot),
};
export const ART: Record<ShotId, string> = {
  drop: "ross-seat+bg-cabin", pass: "(code: tray, pass)", pop: "couple-pop+bg-seatback", ask: "couple-pop+bg-seatback", slap: "bg-seatback+(code: pass)", sure: "ross-seat+bg-cabin", cram: "ross-cram+bg-row47", fa: "fa+peacock-man", peacock: "peacock-man>peacock-fan",
  scream: "peacock-fan+ross-cram", bird: "ross-cram+bg-row47", handle: "bg-row47 exit panel", present: "fa>fa-present+bg-row47", suck: "ross-cram+bg-row47", wing: "bg-wing+ross-cling+couple-kiss+fa", paid: "bg-wing+ross-point+couple-kiss",
  purple: "ross-cling", pilot: "bg-wing+pilot-stand>pilot-sit+ross-cling", legroom: "bg-wing+pilot-sit+ross-cling", hat: "bg-wing+pilot-sit-bare+pilot-hat+ross-cling", glass: "bg-cockpit+ross-seat+pilot-hat", hiii: "bg-cockpit+ross-seat+couple-pop",
};
void DING_T; void THROB1_T; void SLAP_T; void kid;
