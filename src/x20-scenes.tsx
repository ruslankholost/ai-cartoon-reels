import React from "react";
import { Glow, Poly, ellipsePts } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Wash } from "./x13-draw";
import { CoffeeStream, Cord, Drop, FoamBurst, FoamDrip, FoamFall, FoamRun, Outlet, PlugProp, Puffs, Ring, ScreenOffer, Spark, cordPts } from "./x20-draw";
import { shotX } from "./x20-shared";
import { CounterFront, Flat, PX, PY, cam } from "./x20-stage";
import { Person, P } from "./x20-cast";
import {
  BOTTLE2_T, CHAMP_T, COINS2_T, CHEER_T, DRIP_T, FPS, GONG_T, PLUGIN_T, PULL_T, SPRAY_T, SPUTTER_T, blinkOf, clamp01, ease, lerp, popP, talkMove, type ShotId, type Who,
} from "./x20-sched";
import { jit, rossLid } from "./x20-act";
import {
  BoughtShot, Counter, CounterBg, CounterTopShot, DoorShot, EMPTY_M, EightShot, EmptyShot, Floor, RossAShot, RossBShot, RossCounter, SeatBg, SeatWall, SipShot, TBL_A, TableShot, WebShot, num2, num3, WhoShot, ClockShot, fp, rossView, type V,
} from "./x20-scenes-a";

// The second half of the scenes of x20 "One Coffee" (the first is src/x20-scenes-a.tsx, which has the helpers they share): the three guys at the counter, the long table, the plug yanked out of the wall, the espresso machine dying, Ross holding the dead plug, the camper on
// his call, the laptop's OFFER ACCEPTED, the gong, the cheer, the champagne, Ross under the foam, the camper with his cup, Ross dry, the frozen smile and the coins; and the table of the shots. The people and props are the painted pictures (scripts/x20-prep.py, src/x20-rig.json),
// the effects are code (src/x20-draw.tsx). Frame px: x right, y down, 1080 x 1920.
type Box = [number, number, number, number];

// ═════════════════════════════════════════════════════ 13, 14, 15: the three guys of his startup at the counter, in a row, then Guy 2 and Guy 3 each alone (team-row): seen from Ross's side, the counter between us and them, the café's corner with its window behind them
/** one of the guys of the row by his picture: placed by the middle between his eyes; his voice tilts and dips his head (src/x20-sched.ts talkMove) and, when he talks, draws his mouth over the painted level line */
function Guy({ f, name, who, x, y, k, talk = false, look, mix }: { f: number; name: string; who: Who; x: number; y: number; k: number; talk?: boolean; look?: V; mix?: number }) {
  const m = talkMove(who, f);
  return <Person f={f} name={name} who={who} x={x} y={y - 0.7 * m.bob} k={k} rot={0.5 * m.tilt} talk={talk} look={look} mix={mix} order={30} />;
}
export const RowShot = ({ f }: { f: number }) => (
  <>
    <SeatWall k={1.0} ay={760} />
    <Guy f={f} name="row_1" who="GUY1" x={190} y={800 + 4 * jit(f, 1)} k={1.05} talk />
    <Guy f={f} name="row_2" who="GUY2" x={540} y={800 + 4 * jit(f, 2)} k={1.05} />
    <Guy f={f} name="row_3" who="GUY3" x={890} y={800 + 4 * jit(f, 3)} k={1.05} />
    <Counter y={1250} />
  </>
);
export const Guy2Shot = ({ f }: { f: number }) => (
  <>
    <SeatWall k={1.3} ay={800} />
    <Guy f={f} name="row_2" who="GUY2" x={540} y={760 + 3 * jit(f, 2)} k={1.7} talk />
    <Counter y={1390} />
  </>
);
/** 15: Guy 3, sheepish: he looks down and to the side while he says it (his pupils are two small dots in big whites), then up at us on the last word */
export const Guy3Shot = ({ f }: { f: number }) => {
  const a = f - 425, down = ease(a / 5) * (1 - ease((a - 30) / 6));
  return (
    <>
      <SeatWall k={1.3} ay={800} />
      <Guy f={f} name="row_3" who="GUY3" x={600} y={770 + 3 * jit(f, 3)} k={1.7} talk look={[-0.55, 0.7]} mix={down} />
      <Counter y={1400} />
    </>
  );
};

// ═════════════════════════════════════════════════════ 16 and 23: the café from the counter: the tables are one long table now (16, WIDE: the left table and the right table, with his man and the gong, slide in against the two in the middle on the SCRAPE; the four of them at it with their
// laptops, the power strip on the joint of the two middle tables, the gong at the head of the table at the right) and, in 23, a MEDIUM on three of them cheering with their arms up (team-cheer: the camper in the middle, the blond with his bottle on his left and the man with the bun on his right; the red-haired man
// and the gong are out of the frame). The camper is the second from the left in both
const TT = { k: 0.82, px: 676, py: 683, fx: 540, fy: 1420 };   // the picture point (676, 683), the middle of the long table at its feet, is on this frame point; k frame px per picture px
const TC = { k: 1.6, px: 443, py: 683, fx: 540, fy: 1612 };   // the same for 23: the three faces (the blond at x 175, the camper at 443, the man with the bun at 706 in the picture) sit 424 px apart, the outer two just inside the frame, each about 160 px wide
function TeamTable({ f, s0 }: { f: number; s0: number }) {
  const slide = ease((f - s0) / 9);
  const A = P("table_A"), B = P("table_B"), C = P("table_C");
  const at = (dx: number) => TT.fx + dx * TT.k;
  return (
    <>
      <SeatBg m={EMPTY_M} />
      <Floor y={1353} s={1.43} />
      <Flat d={A} apx={TT.px} apy={TT.py} x={at(-70 * (1 - slide))} y={TT.fy} k={TT.k} order={30} />
      <Flat d={B} apx={TT.px} apy={TT.py} x={TT.fx} y={TT.fy} k={TT.k} order={31} />
      <Flat d={C} apx={TT.px} apy={TT.py} x={at(70 * (1 - slide))} y={TT.fy} k={TT.k} order={32} />
    </>
  );
}
function CheerTable({ f }: { f: number }) {
  const up = ease((f - Math.round(CHEER_T * FPS)) / 3), hop = 1 + 0.02 * up * Math.abs(Math.sin(f * 0.32));
  return (
    <>
      <SeatWall k={1.2} ay={892} />
      <Flat d={P("team_cheer")} apx={TC.px} apy={TC.py} x={TC.fx} y={TC.fy} k={TC.k} sy={hop} order={30} />
    </>
  );
}
export const TablesShot = ({ f }: { f: number }) => <TeamTable f={f} s0={471} />;
export const CheerShot = ({ f }: { f: number }) => <CheerTable f={f} />;

// ═════════════════════════════════════════════════════ 17: INSERT, behind the counter: the espresso machine's plug in the wall socket; Guy 2's arm (hand-dev: a light-blue sleeve and a fist round a plug, flipped so that it comes in from the right) takes the plug out of the wall
// (it holds the machine's plug: PULL, the cord goes taut), carries it off and lets go (the plug drops and swings on its cord), then comes back with the power strip's plug and puts it in the same socket (a spark). The socket, the cords and the dropped plug are code; the strip is painted
export const PLUG_M = cam(3.2, 330, 540);
const OUT_AT: V = [560, 960], MACH_AT: V = [150, 1120];
const KH = 1.15, SOCK: V = [OUT_AT[0] + 14, OUT_AT[1] + 6];   // the hand's scale; where the tip of the plug that the hand holds is when the plug is in the socket
export function PlugShot({ f }: { f: number }) {
  const pull = Math.round(PULL_T * FPS), plug = Math.round(PLUGIN_T * FPS), b = (f - plug) / FPS;
  const HD = P("hand_dev"), tip = num2(HD, "tip"), cf = num2(HD, "cord_from"), ST = P("strip"), sp = num2(ST, "plug");
  // the hand's tip: first pass 487-490 in from the right onto the machine's plug, the yank on PULL and out to the right; second pass 495-499 in again with the strip's plug, into the socket on PLUGIN
  const arrive = ease((f - 487) / 3), carry = ease((f - pull) / 3), come = ease((f - 495) / 5);
  let hand: V | null = null;
  if (f >= 487 && f < pull) hand = [lerp(1700, SOCK[0], arrive), lerp(SOCK[1] - 30, SOCK[1], arrive)];
  else if (f >= pull && f < pull + 4) hand = [lerp(SOCK[0], 1700, carry), SOCK[1] + 40 * carry];
  else if (f >= 495) hand = [lerp(1700, SOCK[0] - 12, come), lerp(SOCK[1] + 60, SOCK[1], come)];
  const carried = f >= pull && f < pull + 3, dropped = f >= pull + 3, swing = dropped ? Math.exp(-(f - pull - 3) / 10) * Math.cos((f - pull - 3) * 0.7) * 0.9 : 0;
  const L = 900, hang: V = [MACH_AT[0] + L * Math.sin(0.5 + swing), MACH_AT[1] + L * Math.cos(0.5 + swing)];
  const cff = (h: V): V => [h[0] + (tip[0] - cf[0]) * KH, h[1] + (cf[1] - tip[1]) * KH];   // where the cord leaves the fist: the picture is flipped, so the fist is to the right of the tip
  const cordEnd: V = f < pull ? [OUT_AT[0] - 10, OUT_AT[1] + 60] : carried && hand ? cff(hand) : hang;
  return (
    <>
      <SeatBg m={cam(1.43, 384, 672)} />
      <CounterBg m={PLUG_M} />
      <Outlet x={OUT_AT[0]} y={OUT_AT[1]} k={1.25} order={10} />
      <Cord pts={cordPts(MACH_AT, cordEnd, f < pull ? 90 : carried ? 6 : 0)} w={16} order={14} />
      {f < pull && <PlugProp x={OUT_AT[0]} y={OUT_AT[1]} rot={0} k={1.1} order={16} />}
      {dropped && <PlugProp x={hang[0]} y={hang[1]} rot={-90 + 40 * swing} k={1.1} order={16} />}
      {hand && <Flat d={HD} apx={tip[0]} apy={tip[1]} x={hand[0]} y={hand[1]} k={KH} flip order={30} />}
      {hand && f >= 495 && (
        <>
          <Cord pts={cordPts(cff(hand), [cff(hand)[0] + 60, cff(hand)[1] + 130], 30)} w={14} order={19} />
          <Flat d={ST} apx={sp[0]} apy={sp[1]} x={cff(hand)[0] + 70} y={cff(hand)[1] + 130} k={0.44} rot={4} flip order={22} />
        </>
      )}
      {b >= 0 && <Spark x={OUT_AT[0]} y={OUT_AT[1]} age={b} order={70} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 18: CLOSE, the espresso machine of the counter plate mid-pour (the right group head over the little cup): the stream thins, sputters and stops (a stream, a stutter of short bursts, a dribble, two drops), spit flies,
// steam puffs out of the wand and the group head and stops; the machine is dead
export const STEAM_M = cam(4.4, 113, 520);
export function SteamShot({ f }: { f: number }) {
  const m = STEAM_M, a = f - Math.round(SPUTTER_T * FPS), [gx, gy] = fp(m, 146, 510), cupTop = fp(m, 146, 548)[1], [wx, wy] = fp(m, 183, 545), [hx, hy] = fp(m, 146, 470), full = cupTop - gy - 8;
  const on = a < 4 ? 1 : a < 11 ? ([0, 1, 0, 1, 0, 1, 0][a - 4]) * (0.8 - 0.06 * (a - 4)) : 0, w = a < 4 ? 24 : lerp(18, 8, clamp01((a - 4) / 7));
  const dribble = a >= 11 && a < 16 ? 0.45 * (1 - (a - 11) / 5) : 0;
  const spit = [4, 7, 9].map((s0, i) => ({ age: (a - s0) / FPS, dir: i % 2 ? 1 : -1, i }));
  return (
    <>
      <CounterBg m={m} />
      <Group x={PX(gx)} y={PY(cupTop + 6)} sx={96} sy={26}><Poly pts={ellipsePts(0, 0, 1, 1, 24)} color="#3a1f0e" order={9} /></Group>
      {on > 0 && <CoffeeStream x={gx} y0={gy} y1={gy + full * on} w={w} order={10} />}
      {dribble > 0 && <CoffeeStream x={gx} y0={gy} y1={gy + full * dribble} w={5} order={10} />}
      {[12, 15].map((d, i) => { const age = (a - d) / FPS; return age >= 0 && age < 0.3 ? <Drop key={i} x={gx} y={gy + 40 + age * age * 0.5 * 2600} s={9} stretch={1.7} order={11} /> : null; })}
      {spit.map(({ age, dir, i }) => age >= 0 && age < 0.25 ? <Drop key={i} x={gx + dir * (60 + 500 * age)} y={gy + 20 + 260 * age + 0.5 * 2600 * age * age} s={7} stretch={1.2} order={11} /> : null)}
      <Puffs at={[wx, wy - 20]} f={f} f0={506} f1={517} n={9} life={15} rise={330} drift={60} r0={34} r1={96} order={30} seed={2} />
      <Puffs at={[hx - 30, hy + 40]} f={f} f0={506} f1={514} n={7} life={14} rise={300} drift={70} r0={34} r1={100} order={31} seed={5} />
      <Puffs at={[gx - 330, gy - 30]} f={f} f0={507} f1={513} n={5} life={13} rise={260} drift={50} r0={30} r1={86} order={31} seed={7} />
      <Puffs at={[gx + 10, gy - 70]} f={f} f0={518} f1={519} n={2} life={10} rise={160} drift={26} r0={20} r1={52} order={32} seed={9} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 19: CLOSE, Ross behind the counter holds up the espresso machine's dead plug, calm (ross-plug: the plug and its cord are painted in his hand)
export const R19 = { E: 1.1, yc: 1337, cx: 500, cy: 870 };   // (his head is high and the counter's edge low, so that the fist with the plug stays over the caption: 25 px past the usual 137 plate px)
export function LeavingShot({ f }: { f: number }) {
  const m = rossView(R19.E, R19.yc), cy = R19.cy;
  return (
    <>
      <CounterBg m={m} />
      <RossCounter f={f} m={m} cx={R19.cx} cy={cy} E={R19.E} body="plug" />
    </>
  );
}

// ═════════════════════════════════════════════════════ 20 and 28: the camper at the long table, headset on, mid-call (20: camper-call; the tables of his neighbours run on to both sides of the frame); his smile frozen stiff (28: camper-freeze, at the counter)
export const CALL_AT = { x: 540, y: 800, k: 1.2 };
/** a round table top seen from the front, as the camper's own (the picture's top surface #d4a86b, its edge #976c39), the middle of its top at frame (x, y), `rx` half its width: the tables of his neighbours at the long table, run off the frame's sides */
function TableTop({ x, y, rx, k, order }: { x: number; y: number; rx: number; k: number; order: number }) {
  return (
    <>
      <Poly pts={ellipsePts(PX(x), PY(y + 14 * k), rx, 30 * k, 48)} color="#976c39" order={order} />
      <Poly pts={ellipsePts(PX(x), PY(y), rx, 28 * k, 48)} color="#d4a86b" order={order + 0.1} />
    </>
  );
}
export const CallShot = ({ f }: { f: number }) => {
  const mv = talkMove("CAMPER", f), k = CALL_AT.k, X = CALL_AT.x, Y = CALL_AT.y - 0.6 * mv.bob, top = Y + (770 - TBL_A[1]) * k, rx = 301 * k;
  return (
    <>
      <SeatWall k={k} ay={CALL_AT.y} />
      <TableTop x={X + (208 - TBL_A[0]) * k - rx + 2} y={top} rx={rx} k={k} order={31} />
      <TableTop x={X + (811 - TBL_A[0]) * k + rx - 2} y={top} rx={rx} k={k} order={31} />
      <Person f={f} name="camper_call" x={X} y={Y} k={k} rot={0.4 * mv.tilt} at={TBL_A} who="CAMPER" talk lid={blinkOf("camper", f)} order={32} />
    </>
  );
};
export function FreezeShot({ f }: { f: number }) {
  const a = f - 849, sweat = ease(a / 14), k = 1.15;
  return (
    <>
      <SeatWall k={1.4} ay={800} />
      <Person f={f} name="camper_freeze" x={540} y={770} k={k} order={30} />
      <Drop x={540 + 128 * k} y={770 - 120 * k + 150 * sweat} s={12} stretch={1.5} fill="#bfe6ff" ink="#3a78a8" order={40} />
      <Counter y={1420} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 21: INSERT, his laptop's screen: OFFER ACCEPTED on a green banner (it pops on the chime), $40,000,000 counting up under it and flashing, confetti (prop-laptop: its screen is a hole, the content is drawn behind the picture)
export function OfferShot({ f }: { f: number }) {
  const L = P("laptop"), sc = L.screen as unknown as Box, ax = (sc[0] + sc[2]) / 2, ay = (sc[1] + sc[3]) / 2, k = 1.3, s = ((sc[2] - sc[0]) * k) / 1020;
  return (
    <>
      <SeatBg m={cam(1.43, 384, 672)} />
      <Wash color="#0a1226" op={0.5} order={5} />
      <Group x={0} y={PY(900)} sx={s} sy={s}><ScreenOffer f={f} order={10} /></Group>
      <Flat d={L} apx={ax} apy={ay} x={540} y={900} k={k} order={20} />
      <Glow x={0} y={PY(900)} rx={900} ry={700} op={0.35} order={12} color="rgba(150,205,255,1)" />
    </>
  );
}

// ═════════════════════════════════════════════════════ 22: MEDIUM, the camper swings the padded mallet into the gong (camper-gong without its painted gong; prop-gong, painted as the long table's gong, stands in its place): from the wind-up he is pulled back for three frames, then the mallet hits the disc on GONG_T,
// the disc is thrown sideways and rattles back on its cords (a damped swing), rings run out of it and the picture shakes (src/x20-sched.ts shakeAt: 22 px)
const GONG_AT = { x: 735, y: 960, kg: 0.62, km: 0.85 };   // the disc's middle on the frame; the stand's scale, the man's scale
export function GongShot({ f }: { f: number }) {
  const g = Math.round(GONG_T * FPS), a = (f - g) / FPS, swing = a >= 0 ? 34 * Math.exp(-a / 0.12) * Math.cos(a * 2 * Math.PI * 13) : 0;
  const wind = f < g ? 1 - ease((f - 635) / 3) : 0, recoil = a >= 0 ? Math.exp(-a / 0.1) * Math.sin(a * 60) : 0;
  const stand = P("gong_stand"), disc = P("gong_disc"), man = P("camper_gong_man"), dc = num3(disc, "c"), hang = num2(disc, "hang"), head = num2(man, "head");
  const { x, y, kg, km } = GONG_AT, hangFrame: V = [x, y - (dc[1] - hang[1]) * kg];
  return (
    <>
      <SeatWall k={1.1} ay={780} />
      <Flat d={stand} apx={dc[0]} apy={dc[1]} x={x} y={y} k={kg} order={34} />
      <Flat d={disc} apx={hang[0]} apy={hang[1]} x={hangFrame[0]} y={hangFrame[1]} k={kg} rot={-(swing / 230) * (180 / Math.PI)} order={36} />
      <Flat d={man} apx={head[0]} apy={head[1]} x={x - 150 * wind - 7 * recoil} y={y + 10 * wind} k={km} rot={14 * wind} order={44} />
      {[0, 0.07, 0.14].map((d, i) => <Ring key={i} cx={x} cy={y} r0={dc[2] * kg + 6} r1={520} u={(a - d) / 0.42} order={37 + 0.1 * i} color="#fff3b8" op={0.8} />)}
      {a >= 0 && a < 0.05 && <Wash color="#ffffff" op={0.3} order={300} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 24: CLOSE, two champagne bottles (prop-champagne) pop and the foam bursts up out of both necks, the second three frames after the first; the painted foam cloud bursts from each neck, code foam flies off it and runs down the glass
export function PopShot({ f }: { f: number }) {
  const c1 = Math.round(CHAMP_T * FPS), c2 = Math.round(BOTTLE2_T * FPS), a1 = (f - c1) / FPS, a2 = (f - c2) / FPS;
  const B1 = { x: 350, y: 1340, rot: -10 }, B2 = { x: 730, y: 1370, rot: 9 }, k = 1.0;
  const bottle = P("champagne_bottle"), foam = P("champagne_foam"), neckP = num2(bottle, "neck"), baseP = num2(foam, "base"), centreP: V = [507, 685];
  const neck = (b: { x: number; y: number; rot: number }): V => { const r = (b.rot * Math.PI) / 180, dx = (neckP[0] - centreP[0]) * k, dy = (neckP[1] - centreP[1]) * k; return [b.x + dx * Math.cos(r) - dy * Math.sin(r), b.y + dx * Math.sin(r) + dy * Math.cos(r)]; };
  const n1 = neck(B1), n2 = neck(B2);
  const cloud = (n: V, age: number, rot: number, i: number) => {
    if (age < 0) return null;
    const burst = popP(age, 0, 0.3, 40), settle = 1 - 0.25 * ease((age - 0.25) / 0.7), s = Math.max(0.02, burst * settle) * 1.15 * k;
    return <Flat key={i} d={foam} apx={baseP[0]} apy={baseP[1]} x={n[0]} y={n[1] - 20 * ease(age / 0.5)} k={s} rot={-rot + 6 * Math.sin(age * 9 + i)} order={50 + i} />;
  };
  return (
    <>
      <SeatWall k={1.1} ay={780} />
      <Flat d={bottle} apx={centreP[0]} apy={centreP[1]} x={B1.x + 6 * jit(f, 1) * (f >= c1 ? 1 : 0)} y={B1.y} k={k} rot={-B1.rot} order={30} />
      <Flat d={bottle} apx={centreP[0]} apy={centreP[1]} x={B2.x + 6 * jit(f, 2) * (f >= c2 ? 1 : 0)} y={B2.y} k={k} rot={-B2.rot} order={30} />
      {cloud(n1, a1, B1.rot, 0)}
      {cloud(n2, a2, B2.rot, 1)}
      <FoamBurst at={n1} age={a1} k={0.75} n={7} order={60} seed={1} />
      <FoamBurst at={n2} age={a2} k={0.75} n={7} order={70} seed={2} />
      <FoamRun x={B1.x - 40} y={n1[1] + 30} len={220} w={26} p={clamp01((a1 - 0.2) / 0.5)} order={46} />
      <FoamRun x={B2.x + 40} y={n2[1] + 30} len={230} w={26} p={clamp01((a2 - 0.2) / 0.5)} order={46} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 25 and 27: Ross behind the counter under the foam (ross-drip: soaked, white foam on his hair and shoulders, drips running down, the polite smile kept: a flat picture with his own painted head, scaled so that his eyes are the master's size and
// placed by the middle between his eyes). 25: the apron Ross is hit on SPRAY_T, the foam falls on him from above and, hidden under it, he becomes the soaked one; 27 close, dry and flat, one drop falls off his chin on DRIP_T
const R25 = { E: 1.15, yc: 1340, cx: 540 }, R27 = { E: 1.3, yc: 1380, cx: 540 };
const SWAP_F = 728;   // the frame the soaked picture takes the dry one's place, under the falling foam
/** the soaked Ross as a flat picture: placed like the puppet, by the middle of his head (cx, cy) at the puppet's scale E (the middle of the master's eyes is 8.2 rig px under the middle of the disc); his voice tilts and dips him, lids and the mouth are drawn over the painted ones */
function DripRoss({ f, cx, cy, E, lid }: { f: number; cx: number; cy: number; E: number; lid: number }) {
  const d = P("ross_drip"), m = talkMove("ROSS", f), ek = d.ek as unknown as number;
  return <Person f={f} name="ross_drip" x={cx} y={cy + 8.2 * E - 0.9 * m.bob * E} k={E * ek} rot={0.6 * m.tilt} who="ROSS" talk lid={lid} order={40} />;
}
/** the picture points of the five clumps of foam that are painted on him (the two on his hair, the two on his shoulders, the one on his apron's tie): where the foam of shot 25 lands, so that when it settles it is the picture's own */
const CLUMPS: V[] = [[472, 46], [602, 50], [367, 425], [660, 428], [512, 662]];
/** the white that washes the picture over the frames after the spray starts (index: frames since SPRAY_T): the first flash as the foam is thrown, and the bigger one that covers the swap to the soaked Ross, each two frames wide so that no frame stands alone */
const WASH: Record<number, number> = { 0: 0.4, 1: 0.4, 3: 0.25, 4: 0.5, 5: 0.5, 6: 0.25 };
export function SoakedShot({ f }: { f: number }) {
  const m = rossView(R25.E, R25.yc), cy = R25.yc - 137 * m.s, E = R25.E, R = 195 * E, d = P("ross_drip"), a = num2(d, "anchor"), ek = d.ek as unknown as number, k = E * ek;
  const spray = Math.round(SPRAY_T * FPS), age = (f - spray) / FPS, fx = (p: V): V => [R25.cx + (p[0] - a[0]) * k, cy + 8.2 * E + (p[1] - a[1]) * k];
  // the foam comes down on the five places where the picture has foam and on the air round his head and shoulders, never on his face
  const to: [number, number, number][] = [...CLUMPS.map((p, i) => [...fx(p), (i < 2 ? 0.2 : i < 4 ? 0.21 : 0.12) * R] as [number, number, number]), ...[[-1.0, 0.8, 0.2], [1.0, 0.8, 0.2], [-0.45, -1.15, 0.2], [0.45, -1.15, 0.2], [-0.7, 1.7, 0.22], [0.7, 1.7, 0.22], [0, 1.95, 0.2]].map(([x, y, r]) => [R25.cx + x * R, cy + y * R, r * R] as [number, number, number])];
  const swapped = f >= SWAP_F, since = (f - SWAP_F) / FPS;
  return (
    <>
      <CounterBg m={m} />
      {swapped ? <DripRoss f={f} cx={R25.cx} cy={cy} E={E} lid={blinkOf("ross", f)} /> : <RossCounter f={f} m={m} cx={R25.cx} cy={cy} E={E} body="apron" />}
      {swapped && <CounterFront m={m} order={80} />}
      {f >= spray && f < SWAP_F + 3 && <FoamFall age={age} to={to} over={0.1} order={92} seed={3} />}
      {since >= 0 && since < 0.4 && <FoamBurst at={[R25.cx, cy - 0.95 * R]} age={since} k={0.5} n={9} spread={300} order={93} seed={4} />}
      {WASH[f - spray] > 0 && <Wash color="#ffffff" op={WASH[f - spray]} order={200} />}
    </>
  );
}
export function DryShot({ f }: { f: number }) {
  const m = rossView(R27.E, R27.yc), cy = R27.yc - 137 * m.s, R = 195 * R27.E, dripF = Math.round(DRIP_T * FPS);
  return (
    <>
      <CounterBg m={m} />
      <DripRoss f={f} cx={R27.cx} cy={cy} E={R27.E} lid={Math.max(0.2, rossLid(f))} />
      <CounterFront m={m} order={80} />
      <FoamDrip x={R27.cx + 0.08 * R} y={cy + 1.0 * R} f={f} f0={807} fall={dripF} s={0.1 * R} order={97} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 26: MEDIUM, the camper at the counter, beaming, the tiny cup held out to us (camper-cup: the cup is in his fist, painted), his smile talks
export const CupShot = ({ f }: { f: number }) => {
  const mv = talkMove("CAMPER", f);
  return (
    <>
      <SeatWall k={1.0} ay={760} />
      <Person f={f} name="camper_cup" who="CAMPER" x={540 + 3 * jit(f, 6)} y={760 - 0.6 * mv.bob} k={1.15} rot={0.5 * mv.tilt} talk patch={1.24} lid={blinkOf("camper", f)} order={30} />
      <Counter y={1420} />
    </>
  );
};

// ═════════════════════════════════════════════════════ 29: INSERT, his hand slaps coins down on the counter (hand-camper, prop-coins); the cut to shot 1 loops it
export const SlapShot = ({ f }: { f: number }) => <CounterTopShot f={f} s0={867} hitF={Math.round(COINS2_T * FPS)} first={false} />;
export const CoinsShot = ({ f }: { f: number }) => <CounterTopShot f={f} s0={0} hitF={2} first />;

// ═════════════════════════════════════════════════════ the shots
/** the point each shot's camera zooms about (frame px) */
export const FOCUS: Record<ShotId, [number, number]> = {
  coins: [540, 1100], clock: [330, 860], web: [540, 900], rossA: [540, 1000], rossB: [540, 900], bought: [500, 900], eight: [430, 1000], sip: [540, 900], table: [560, 950], who: [540, 900], empty: [540, 1400], door: [640, 1000], row: [540, 1100], guy2: [540, 900], guy3: [640, 900],
  tables: [540, 1300], plug: [560, 980], steam: [685, 1000], leaving: [500, 950], call: [540, 950], offer: [540, 900], gong: [540, 1000], cheer: [540, 1300], pop: [540, 1100], soaked: [540, 950], cup: [540, 1000], dry: [540, 950], freeze: [540, 900], slap: [540, 1100],
};
const V_ = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = {
  coins: V_("coins", CoinsShot), clock: V_("clock", ClockShot), web: V_("web", WebShot), rossA: V_("rossA", RossAShot), rossB: V_("rossB", RossBShot), bought: V_("bought", BoughtShot), eight: V_("eight", EightShot), sip: V_("sip", SipShot), table: V_("table", TableShot),
  who: V_("who", WhoShot), empty: V_("empty", EmptyShot), door: V_("door", DoorShot), row: V_("row", RowShot), guy2: V_("guy2", Guy2Shot), guy3: V_("guy3", Guy3Shot), tables: V_("tables", TablesShot), plug: V_("plug", PlugShot), steam: V_("steam", SteamShot),
  leaving: V_("leaving", LeavingShot), call: V_("call", CallShot), offer: V_("offer", OfferShot), gong: V_("gong", GongShot), cheer: V_("cheer", CheerShot), pop: V_("pop", PopShot), soaked: V_("soaked", SoakedShot), cup: V_("cup", CupShot), dry: V_("dry", DryShot),
  freeze: V_("freeze", FreezeShot), slap: V_("slap", SlapShot),
};
export const ART: Record<ShotId, string> = {
  coins: "hand-camper+prop-coins+prop-cup+x16 hand-ross+bg-counter+(code: $2.50)", clock: "bg-counter clock+(code: face, hands, readout, light)", web: "camper-sit+bg-seating+(code: chair, cobwebs, dust)", rossA: "ross-apron+bg-counter", rossB: "ross-apron+bg-counter",
  bought: "camper-sit+bg-seating+(code: chair, cobwebs, dust)", eight: "ross-apron+bg-counter+(code: clock hands 3:00)", sip: "camper-sip+bg-seating+(code: strand, dust)", table: "ross-apron+bg-counter", who: "camper-wave+bg-seating+(code: web, dust)",
  empty: "camper-sit+bg-seating+prop-tumbleweed+(code: tables)", door: "bg-window+(code: door swing, bell)", row: "team-row+bg-seating", guy2: "team-row+bg-seating", guy3: "team-row+bg-seating", tables: "team-table+bg-seating",
  plug: "hand-dev+prop-strip+bg-counter+(code: socket, plugs, cord)", steam: "bg-counter machine+(code: stream, steam, spit)", leaving: "ross-plug+bg-counter", call: "camper-call+bg-seating+(code: tables)", offer: "prop-laptop+(code: OFFER ACCEPTED, $40,000,000)",
  gong: "camper-gong+prop-gong+bg-seating+(code: shake, rings)", cheer: "team-cheer+bg-seating", pop: "prop-champagne x2+(code: foam)", soaked: "ross-drip+ross-apron+bg-counter+(code: foam)", cup: "camper-cup+bg-seating", dry: "ross-drip+bg-counter+(code: drip)",
  freeze: "camper-freeze+bg-seating", slap: "hand-camper+prop-coins+bg-counter",
};
