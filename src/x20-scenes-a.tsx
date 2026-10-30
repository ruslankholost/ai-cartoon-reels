import React from "react";
import { Picture, Poly, ellipsePts, ribbon, type Pt } from "./sp-puppet";
import { Plate } from "./x09-stage";
import { Group, type View } from "./pen-stage";
import { Wash, FR } from "./x13-draw";
import { ClockHands } from "./x10-draw";
import { DustSpecks, FanWeb, LightPatch, SnapStrand, Spider } from "./x20-draw";
import { PriceTag20 } from "./x20-props";
import { rossMouthW, rossPose20 } from "./x20-act";
import { CounterFront, Flat, PL, PX, PY, PlateM, RG18, RossP, cam, counterView, rossAt, type Pic, type RossBody } from "./x20-stage";
import { ChairBack, Person, P, camperMove, figPt } from "./x20-cast";
import {
  BELL_T, CUP_T, FPS, POP_T, SNAP_T, TUMBLE_T, WHIRL0, WHIRL1, blinkOf, clamp01, clockMinutes, clockSettle, ease, lightAt, lerp, popP,
} from "./x20-sched";

// The first half of the scenes of x20 "One Coffee" (the second is src/x20-scenes.tsx, which imports the helpers): the coins and the tiny cup on the counter, the wall clock, the camper in his cobwebs at his table, Ross at the counter, the strand that snaps, the camper's wave,
// the empty café with its tumbleweed and the door. One canvas per shot, hard cuts. Each is the art of the shot (the pictures cut by scripts/x20-prep.py, src/x20-rig.json; x10's counter wall with its clock, its apron body and its window and door, x18's seating plate, x16's hand)
// under the effects drawn in code (src/x20-draw.tsx). Plates are seen through a view `m` (src/x09-stage.tsx cam: plate px -> frame px); Ross is a puppet placed by the frame point of the middle of his head and a scale; the camper and the guys are flat pictures placed by the
// middle between their eyes (src/x20-cast.tsx). A shot's `m` never moves: the camera's push-in and shake come from the canvas (src/x20-shared.tsx). Frame px: x right, y down, 1080 x 1920.
export const t = (f: number) => f / FPS;
export const W = 1080, H = 1920;
export const fp = (m: View, u: number, v: number): [number, number] => [W / 2 + m.X(u), H / 2 - m.Y(v)];   // a plate point as a frame point
export const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
export const EDGE_SEAT = { top: "#d2b677", bottom: "#7f5c33", side: "#ecd391", sideLow: "#7f5c33", split: 1155 };
export const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
export const sm = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const PLT = RG18.plates;
export const HEAD_R = 195;   // Ross's head radius in the rig's px
export type V = [number, number];

// ═════════════════════════════════════════════════════ the plates: the counter wall (1, 2, 4, 5, 7, 9, 17, 18, 19, 25, 27, 29), the seating corner with its big window (3, 6, 8, 10, 11, 13-16, 20, 22, 23, 26, 28), the front wall with the door (12)
export const CounterBg = ({ m }: { m: View }) => <PlateM m={m} file={PL.counter.file} edge={EDGE_COUNTER} />;
export const SeatBg = ({ m }: { m: View }) => <PlateM m={m} file={PLT.seating.file} edge={EDGE_SEAT} />;
export const WindowBg = ({ m }: { m: View }) => <PlateM m={m} file={PL.window.file} edge={EDGE_WINDOW} />;
/** the café's floor in code, from the frame row `y` down (the seating plate's own is too low for a close shot): the plate's brown planks and their seams */
export function Floor({ y, s, order = 6 }: { y: number; s: number; order?: number }) {
  return (
    <>
      <Poly pts={FR(-40, y, W + 40, H + 60)} color="#7f5c33" order={order} />
      <Poly pts={FR(-40, y - 3, W + 40, y + 3)} color="#5b3d1b" order={order + 0.1} />
      {[1, 2, 3, 4].map((i) => <Poly key={i} pts={FR(-40, y + 36 * s * i - 2, W + 40, y + 36 * s * i + 2)} color="#6a4a22" order={order + 0.1} />)}
    </>
  );
}
/** a café table seen from the side, as a band across the frame from row `y`: a light top edge, a wooden front (the counter between us and the people who stand at it) */
export function Counter({ y, order = 50 }: { y: number; order?: number }) {
  return (
    <>
      <Poly pts={FR(-40, y, W + 40, H + 60)} color="#4a3018" order={order} />
      <Poly pts={FR(-40, y - 44, W + 40, y)} color="#e8ab5a" order={order + 0.1} />
      <Poly pts={FR(-40, y - 4, W + 40, y + 6)} color="#8a5a2a" order={order + 0.2} />
    </>
  );
}
/** how big Ross's head is on a plate view: the plate scale that makes his head `E` big (x10 puts a head of radius 80 on the plate at that scale) and the view of the counter plate with its top edge on frame row `yc` */
export const VIEW_S = (E: number) => (E * HEAD_R) / 80;
export const rossView = (E: number, yc: number, u = 384) => counterView(VIEW_S(E), yc, u);
export function RossCounter({ f, m, cx, cy, E, body, order = 40, attach, tint }: { f: number; m: View; cx: number; cy: number; E: number; body: RossBody; order?: number; attach?: React.ReactNode; tint?: string }) {
  const r = rossAt(cx, cy, E), pose = rossPose20(f, body);
  return (
    <>
      <RossP x={r.x} y={r.y} E={E} order={order} body={body} pose={pose} mouthW={rossMouthW(f)} tint={tint} attach={attach} />
      <CounterFront m={m} order={80} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 1 and 29: INSERT, the counter top from above (x10's counter plate): the camper's hand slaps four coins down (1: on COINS_T; 29: on COINS2_T) and, in 1, Ross's hand (x16's, a tattooed forearm) sets the tiny cup beside them
// and "$2.50" pops over the cup. The camper's hand, the coins and the cup are painted (hand-camper turned so that the sleeve comes in from below, prop-coins, prop-cup); the price is in code
export const CTOP_M = cam(3.4, 384, 790);
const COIN_AT: V[] = [[410, 1215], [520, 1252], [626, 1190], [502, 1128]];
const COIN_R = 48;   // frame px
const HAND_ROSS = RG18.props.hand_ross as Pic & { gap: [number, number] };
export const num2 = (d: Pic, k: string) => d[k] as unknown as V;
export const num3 = (d: Pic, k: string) => d[k] as unknown as [number, number, number];
export function CounterTopShot({ f, s0, hitF, first }: { f: number; s0: number; hitF: number; first: boolean }) {
  const a = f - hitF, come = ease((f - s0) / Math.max(1, hitF - s0)), away = ease((a - 2) / 6), hy = f <= hitF ? lerp(2120, 1180, come) : 1180 + 1000 * away;
  const cupF = Math.round(CUP_T * FPS), popF = Math.round(POP_T * FPS), hand = ease((f - 4) / (cupF - 4)), gone = ease((f - cupF - 3) / 6);
  const hx = lerp(1180, 760, hand) + 200 * gone, hyr = lerp(540, 1082, hand) - 560 * gone, cupBottom = f >= cupF ? 1200 : hyr + 118, pa = (f - popF) / FPS;
  const HC = P("hand_camper"), palm = num2(HC, "palm"), cup = P("cup"), foot = num2(cup, "foot");
  return (
    <>
      <CounterBg m={CTOP_M} />
      {a >= 0 && COIN_AT.map(([x, y], i) => {
        const hop = Math.max(0, 26 * Math.exp(-a / 3) * Math.sin(a * 1.6 + i)), c = P(`coin_${i + 1}`), cc = num3(c, "c");
        return <Flat key={i} d={c} apx={cc[0]} apy={cc[1]} x={x} y={y - hop} k={COIN_R / cc[2]} rot={i * 37} order={20 + i * 0.1} />;
      })}
      <Flat d={HC} apx={palm[0]} apy={palm[1]} x={500} y={hy} k={1.25} rot={-90} order={30} />
      {first && (
        <>
          <Flat d={cup} apx={foot[0]} apy={foot[1]} x={hx + 4} y={cupBottom} k={0.25} order={32} />
          <Flat d={HAND_ROSS} apx={HAND_ROSS.ox + HAND_ROSS.gap[0]} apy={HAND_ROSS.oy + HAND_ROSS.gap[1]} x={hx} y={hyr} k={0.62} rot={186} order={36} />
          {pa >= 0 && <PriceTag20 x={PX(776)} y={PY(880)} s={Math.max(0.01, 0.85 * popP(pa, 0, 0.45, 40))} rot={-6} order={95} />}
        </>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════ 2: INSERT, the wall clock of the counter plate, big, with the beside it its readout (8:00 AM rolling to 3:00 PM, src/x20-ui.tsx ClockReadout): the hands pull back, whirl seven hours (two ghost
// hands behind the fast one) and land on 3:00 with a small shake; the light of the café's window swings across the wall; the wall warms toward the afternoon
export const CLOCK_M = cam(2.6, 668, 236);
const HAND_GHOST: Pt[] = ribbon([[0, -0.14, 0.05], [0, 0.1, 0.07], [0, 0.76, 0.028]]);
// (the clock hangs near the plate's right edge and the view shows the wall past it: the plate's mirror copy would show a second clock there, so the wall is carried on in its own colour, which is the plate's at its right edge to within 3 levels)
const EDGE_WALL = { top: "#e9ce99", bottom: "#80542d", side: "#eace9b", sideLow: "#80542d", split: 580 };
export function ClockShot({ f }: { f: number }) {
  const m = CLOCK_M, [cx, cy, r] = PL.counter.clock, minute = clockMinutes(f), x = m.X(cx) + clockSettle(f), y = m.Y(cy), R = r * m.s, L = lightAt(f), spin = f >= WHIRL0 && f < WHIRL1 + 1;
  return (
    <>
      <Plate m={m} file={PL.counter.file} edge={EDGE_WALL} />
      <LightPatch x={L.x} y={760} ang={L.ang} op={L.op} order={4} />
      <ClockHands x={x} y={y} r={R} hour={8} minute={minute} order={20} />
      {spin && [1, 2].map((g) => <Group key={g} x={x} y={y} rot={-(minute - g * 14) * 6} sx={R} sy={R}><Poly pts={HAND_GHOST} color="#1b1b20" order={19 + g * 0.1} op={0.34 / g} /></Group>)}
      <Wash color="#ff9a3c" op={0.09 * ease((f - WHIRL0) / (WHIRL1 - WHIRL0 + 4))} order={60} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 3, 6, 8, 10, 11, 28 (and 20 in the second half): the camper at his table by the window. His four table pictures (sit, sip, wave, call) share one head, one table, one laptop and one cup, so they are all placed by the same picture point,
// the middle between his eyes in camper-sit. A chair's back stands behind him (code), the cobwebs run from his right elbow to it and from the cup to the laptop's corner, dust hangs over his hair (code)
export const SEAT_K = 1.1;
export const TBL_A: V = [507.5, 295.2];
// where the webs, the spider and the dust hang, in the picture's px: a big corner web from the chair's right post to his right arm (the strands end on the sleeve's edge, left of the face), the same on his left (from his shoulder to the post on the window's side), one from the laptop
// lid's top corner to the cup and the table; the spider hangs from the lid's top edge
const SEAT_WEB = { right: { a: [850, 446] as V, ends: [704, 490, 718, 528, 738, 576, 752, 626, 762, 678] as number[] }, left: { a: [204, 446] as V, ends: [338, 490, 320, 526, 298, 576, 285, 626, 280, 690] as number[] }, cup: { a: [624, 598] as V, ends: [676, 706, 700, 700, 726, 704, 740, 742, 764, 772] as number[] }, spider: [480, 598] as V, hair: [520, 92] as V, shoulders: [528, 482] as V, chairX: 527, rail: 472, chairW: 625, chairH: 290 };
const ends = (pt: (px: number, py: number) => V, xs: number[]): V[] => Array.from({ length: xs.length / 2 }, (_, i) => pt(xs[2 * i] as number, xs[2 * i + 1] as number));
/** the cobwebs of the camper's table (`pt` puts a picture point on the frame), the spider on the lid and the dust on his hair and shoulders; `left` the web on his left (the wave tears it), `cup` the one to the cup (his cup is at his lips in 8), `cupDy` how much lower the cup stands in camper-wave */
function Webs({ f, k, pt, left = true, cup = true, cupDy = 0, dustFall = 0 }: { f: number; k: number; pt: (px: number, py: number) => V; left?: boolean; cup?: boolean; cupDy?: number; dustFall?: number }) {
  const w = SEAT_WEB, sp = pt(...w.spider), hair = pt(...w.hair), sh = pt(...w.shoulders);
  return (
    <>
      <FanWeb a={pt(...w.right.a)} ends={ends(pt, w.right.ends)} order={60} />
      {left && <FanWeb a={pt(...w.left.a)} ends={ends(pt, w.left.ends)} order={60} />}
      {cup && <FanWeb a={pt(...w.cup.a)} ends={ends(pt, w.cup.ends.map((v, i) => (i % 2 ? v + cupDy : v)))} w={5.5} order={61} />}
      <Spider x={sp[0]} y0={sp[1]} len={62 * k} f={f} s={k} order={63} />
      <DustSpecks cx={hair[0]} cy={hair[1] + 20} w={340} h={190} f={f} n={28} order={62} fall={dustFall} />
      <DustSpecks cx={sh[0]} cy={sh[1]} w={300 * k} h={44 * k} f={f} n={14} order={62} size={1.2} color="#e8e2d4" />
    </>
  );
}
export type SeatedProps = { f: number; name: string; x: number; y: number; k: number; typing?: boolean; talk?: boolean; look?: V; back?: number; webs?: boolean; cupWeb?: boolean; dustFall?: number; blink?: boolean };
export function SeatedCamper({ f, name, x, y, k, typing = false, talk = false, look, back = 0, webs = true, cupWeb = true, dustFall = 0, blink = true }: SeatedProps) {
  const mv = camperMove(f, typing), X = x + mv.dx, Y = y + mv.dy - back, pt = (px: number, py: number) => figPt(TBL_A, X, Y, k, px, py), w = SEAT_WEB, rail = pt(w.chairX, w.rail);
  return (
    <>
      <ChairBack x={rail[0]} y={rail[1]} w={w.chairW * k} h={w.chairH * k} k={k} order={20} />
      <Person f={f} name={name} x={X} y={Y} k={k} rot={mv.rot - 0.1 * back} at={TBL_A} who="CAMPER" talk={talk} look={look} lid={blink ? blinkOf("camper", f) : 0} order={30} />
      {webs && <Webs f={f} k={k} pt={pt} cup={cupWeb} dustFall={dustFall} />}
    </>
  );
}
/** the seating plate behind a seated figure whose eye line is on frame row `ay`, at the person's scale `k`: the window's sill (plate row 775) is a fixed number of the person's px under the eyes; the café's floor in code under it */
export const SeatWall = ({ k = SEAT_K, ay = 770 }: { k?: number; ay?: number }) => {
  const s = k / 0.51, sill = ay + 330 * k, v0 = 775 - (sill - 960) / s, m = cam(s, 415, v0);
  return (
    <>
      <SeatBg m={m} />
      <Floor y={ay + 600 * k} s={s} />
    </>
  );
};
/** shot 3 is the cover's picture: the camper sits low enough that the label's two rows (y 300-600) stand over the wall and not over his hair */
export const WEB_AT = { x: 540, y: 905, k: 1.1 };
export const WebShot = ({ f }: { f: number }) => (
  <>
    <SeatWall k={WEB_AT.k} ay={WEB_AT.y} />
    <SeatedCamper f={f} name="camper_sit" {...WEB_AT} />
  </>
);
export const BOUGHT_AT = { x: 540, y: 690, k: 1.25 };   // (higher than the first version so that the laptop, the cup and their web stand over the caption's band, not under it)
export const BoughtShot = ({ f }: { f: number }) => (
  <>
    <SeatWall k={BOUGHT_AT.k} ay={BOUGHT_AT.y} />
    <SeatedCamper f={f} name="camper_sit" {...BOUGHT_AT} typing talk />
  </>
);
/** 8: the camper lifts the tiny cup to his lips (camper-sip), leaning back; a cobweb strand stretches from it to the table and snaps (the whole picture rocks back with it) */
export const SIP_AT = { x: 540, y: 800, k: 1.3 };
export function SipShot({ f }: { f: number }) {
  const f0 = 176, snapF = Math.round(SNAP_T * FPS), stretch = ease((f - f0) / (snapF - f0)), back = f < snapF ? 14 * stretch : 14 * Math.exp(-(f - snapF) / 3) * Math.cos((f - snapF) * 1.4);
  const mv = camperMove(f), X = SIP_AT.x + mv.dx, Y = SIP_AT.y + mv.dy - back, pt = (px: number, py: number) => figPt(TBL_A, X, Y, SIP_AT.k, px, py);
  return (
    <>
      <SeatWall k={SIP_AT.k} ay={SIP_AT.y} />
      <SeatedCamper f={f} name="camper_sip" {...SIP_AT} back={back} cupWeb={false} dustFall={f >= Math.round(t(177) * FPS) ? 0.6 : 0} />
      <SnapStrand a={pt(520, 748)} b={pt(514, 520)} f={f} f0={f0} snapF={snapF} order={61} />
    </>
  );
}
/** 10: the camper waves a hand at the room (camper-wave: the raised arm is its own layer behind him and swings about his shoulder), smug; his eyes go up and out to the room for the wave and come back down to his screen; the web that ran from his left elbow to the chair is
 * torn: its threads hang from the chair and stretch to the moving elbow */
export const WHO_AT = { x: 540, y: 800, k: 1.3 };
export function WhoShot({ f }: { f: number }) {
  const u = (f - 290) / 27, wave = Math.sin((f - 290) * 0.9), swing = (u < 1 ? 1 - 0.35 * u : 0.65) * 9 * wave - 2;
  const mv = camperMove(f), X = WHO_AT.x + mv.dx, Y = WHO_AT.y + mv.dy, k = WHO_AT.k, pt = (px: number, py: number) => figPt(TBL_A, X, Y, k, px, py);
  const arm = P("camper_wave_arm"), pv = num2(arm, "pivot"), pvf = pt(pv[0], pv[1]), a = (swing * Math.PI) / 180;
  const el = num2(arm, "elbow"), eo = [el[0] - pv[0], el[1] - pv[1]], elbow: V = [pvf[0] + (eo[0] * Math.cos(a) + eo[1] * Math.sin(a)) * k, pvf[1] + (-eo[0] * Math.sin(a) + eo[1] * Math.cos(a)) * k];
  const up = 1 - ease((f - 290 - 14) / 7), look: V = [-0.95, -0.85];   // (up and out at the room for the wave, then back to the painted spot: his screen)
  return (
    <>
      <SeatWall k={k} ay={WHO_AT.y} />
      <ChairBack x={pt(527, 472)[0]} y={pt(527, 472)[1]} w={625 * k} h={290 * k} k={k} order={20} />
      <Flat d={arm} apx={pv[0]} apy={pv[1]} x={pvf[0]} y={pvf[1]} k={k} rot={swing} order={28} />
      <Person f={f} name="camper_wave_body" x={X} y={Y} k={k} rot={mv.rot} at={TBL_A} who="CAMPER" talk look={look} mix={up} lid={blinkOf("camper", f)} order={30} />
      <Webs f={f} k={k} pt={pt} left={false} cupDy={13} dustFall={0.3} />
      <FanWeb torn a={elbow} ends={ends(pt, [238, 474, 238, 516, 238, 560])} sag={14} w={5.5} order={60} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 4, 5, 7, 9: Ross behind the counter in his apron (x10's apron body: he holds its straps), seen from the customers' side; the counter's own front layer hides what is below its top. 4 medium, 5 close, 7 close with the wall clock
// behind him (3:00), 9 close and leaning in. The view puts the counter's top edge (plate row 795) on frame row `yc`; Ross's head is placed by its middle
export const R4 = { E: 0.85, yc: 1290, cx: 540 }, R5 = { E: 1.3, yc: 1370, cx: 540 }, R7 = { E: 1.0, yc: 1180, cx: 460, clock: [820, 560, 150] as [number, number, number] }, R9 = { E: 1.2, yc: 1330, cx: 560 };
// (at this scale the plate's own wall clock hangs in the top right corner with only its lower arc in the frame and no hands: a patch of the wall's colour hides it; the clock that matters is the one of shots 2 and 7)
export const RossAShot = ({ f }: { f: number }) => { const m = rossView(R4.E, R4.yc); return <><CounterBg m={m} /><Poly pts={FR(730, -60, 1150, 300)} color="#eace9b" order={3} /><RossCounter f={f} m={m} cx={R4.cx} cy={R4.yc - 137 * m.s} E={R4.E} body="apron" /></>; };
export const RossBShot = ({ f }: { f: number }) => { const m = rossView(R5.E, R5.yc); return <><CounterBg m={m} /><RossCounter f={f} m={m} cx={R5.cx} cy={R5.yc - 137 * m.s} E={R5.E} body="apron" /></>; };
/** the wall clock as a code picture (the plate's own is too high on its wall to be in a close shot of Ross): the plate's ring (dark brown, 1.17 of the disc's radius), its off-white disc, the ticks and the hands; (x, y) the middle in frame px, `r` the disc's radius */
export function WallClock({ x, y, r, hour, minute, order }: { x: number; y: number; r: number; hour: number; minute: number; order: number }) {
  return (
    <>
      <Group x={PX(x)} y={PY(y)} sx={r * 1.2} sy={r * 1.2}><Poly pts={ellipsePts(0, 0, 1, 1, 40)} color="#2f1f05" order={order} /></Group>
      <Group x={PX(x)} y={PY(y)} sx={r * 1.17} sy={r * 1.17}><Poly pts={ellipsePts(0, 0, 1, 1, 40)} color="#3a2919" order={order + 0.1} /></Group>
      <Group x={PX(x)} y={PY(y)} sx={r} sy={r}><Poly pts={ellipsePts(0, 0, 1, 1, 40)} color="#f5f2eb" order={order + 0.2} /></Group>
      <ClockHands x={PX(x)} y={PY(y)} r={r} hour={hour} minute={minute} order={order + 0.3} />
    </>
  );
}
export function EightShot({ f }: { f: number }) {
  const m = rossView(R7.E, R7.yc);
  return (
    <>
      <CounterBg m={m} />
      <WallClock x={R7.clock[0]} y={R7.clock[1]} r={R7.clock[2]} hour={3} minute={0} order={20} />
      <RossCounter f={f} m={m} cx={R7.cx} cy={R7.yc - 137 * m.s} E={R7.E} body="apron" />
    </>
  );
}
export const TableShot = ({ f }: { f: number }) => { const m = rossView(R9.E, R9.yc); return <><CounterBg m={m} /><RossCounter f={f} m={m} cx={R9.cx} cy={R9.yc - 137 * m.s} E={R9.E} body="apron" /></>; };

// ═════════════════════════════════════════════════════ 11: WIDE, the empty café: every table bare, the camper small at his by the window, a tumbleweed rolling across the floor (the painted prop, rolled by code), no music
export const EMPTY_M = cam(1.43, 384, 880);
/** a round café table seen from the side in the wood of the camper's own table (top #d4a86b with a darker edge, column and foot #3f2c1b): a wooden top (an ellipse with a rim), a stem and a foot; (x, y) the middle of the foot (frame px), `k` its size (1: the top is 240 px across) */
export function BareTable({ x, y, k = 1, order = 20 }: { x: number; y: number; k?: number; order?: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} sx={k} sy={k}>
      <Poly pts={ellipsePts(0, 8, 124, 20, 28)} color="#6b4a26" order={order} />
      <Poly pts={[[-124, 8], [124, 8], [124, -4], [-124, -4]]} color="#976c39" order={order + 0.05} />
      <Poly pts={ellipsePts(0, 4, 120, 18, 28)} color="#976c39" order={order + 0.08} />
      <Poly pts={ellipsePts(0, 11, 120, 17, 28)} color="#d4a86b" order={order + 0.1} />
      <Poly pts={[[-17, 0], [17, 0], [14, -150], [-14, -150]]} color="#3f2c1b" order={order - 0.05} />
      <Poly pts={ellipsePts(0, -158, 60, 16, 28)} color="#2e2013" order={order - 0.04} />
      <Poly pts={ellipsePts(0, -156, 56, 13, 28)} color="#41301e" order={order - 0.03} />
    </Group>
  );
}
const TW_Y = 1500, TW_R = 66;
export function EmptyShot({ f }: { f: number }) {
  const u = clamp01((f - Math.round(TUMBLE_T * FPS)) / (342 - Math.round(TUMBLE_T * FPS))), x = lerp(-90, 1170, u), dist = x + 90, hop = 22 * Math.abs(Math.sin(u * Math.PI * 7)), rot = -(dist / TW_R) * (180 / Math.PI);
  const tw = P("tumbleweed"), c = num3(tw, "c");
  const CAMP = { x: 300, y: 1252, k: 0.4 };
  return (
    <>
      <SeatBg m={EMPTY_M} />
      <Floor y={1353} s={1.43} />
      <BareTable x={830} y={1330} k={0.5} order={14} />
      <BareTable x={420} y={1345} k={0.5} order={14} />
      <BareTable x={170} y={1720} k={0.85} order={22} />
      <BareTable x={930} y={1740} k={0.9} order={22} />
      <BareTable x={560} y={1790} k={0.85} order={24} />
      <Person f={f} name="camper_sit" x={CAMP.x} y={CAMP.y} k={CAMP.k} at={TBL_A} order={16} lid={blinkOf("camper", f)} />
      {f >= Math.round(TUMBLE_T * FPS) && x < 1160 && <Flat d={tw} apx={c[0]} apy={c[1]} x={x} y={TW_Y - hop} k={TW_R / c[2]} rot={rot} sx={1 + 0.06 * Math.sin(u * 40)} sy={1 - 0.06 * Math.sin(u * 40)} order={40} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 12: INSERT, the café's front wall (x10's plate: the window, the door): DING-A-LING, the little bell over the door swings and the door swings open on the street (the leaf of the plate squeezed about its hinge, the street in the doorway)
type Box = [number, number, number, number];
const DOOR = PLT.door as unknown as { file: string; w: number; h: number; leaf: Box; hinge: number; street: { y0: number; y1: number; color: string }[] };
export const DOOR_M = cam(2.0, 580, 740);
export const doorOpen = (f: number) => ease((f - Math.round(BELL_T * FPS)) / 5);
export function DoorShot({ f }: { f: number }) {
  const m = DOOR_M, open = doorOpen(f), [x0, y0, x1] = DOOR.leaf, a = t(f) - BELL_T, swing = a >= 0 ? 28 * Math.exp(-a / 0.14) * Math.cos(a * 38) : 0, top = fp(m, (x0 + x1) / 2, y0 - 24);
  const rect = (u0: number, v0: number, u1: number, v1: number): Pt[] => [[m.X(u0), m.Y(v0)], [m.X(u1), m.Y(v0)], [m.X(u1), m.Y(v1)], [m.X(u0), m.Y(v1)]];
  return (
    <>
      <WindowBg m={m} />
      {open > 0.01 && DOOR.street.map((b, i) => <Poly key={i} pts={rect(x0, b.y0, x1, b.y1)} color={b.color} order={1 + i * 0.01} />)}
      <Group x={m.X(x1)} y={0} sx={1 - 0.84 * open}>
        <DoorLeaf m={m} open={open} />
      </Group>
      <Group x={top[0] - W / 2} y={H / 2 - top[1]} rot={swing}>
        <Poly pts={ribbon([[0, 0, 7], [0, -34, 7]])} color="#3a2a14" order={30} />
        <Poly pts={[[-26, -34], [26, -34], [18, -78], [-18, -78]].map(([a2, b2]) => [a2, b2] as Pt)} color="#5a420c" order={30.1} />
        <Poly pts={[[-22, -36], [22, -36], [15, -74], [-15, -74]].map(([a2, b2]) => [a2, b2] as Pt)} color="#e0b02a" order={30.2} />
        <Poly pts={ellipsePts(0, -80, 7, 7, 10)} color="#5a420c" order={30.3} />
        <Poly pts={ellipsePts(0, -38, 8, 8, 10)} color="#f6dc78" order={30.4} />
      </Group>
    </>
  );
}
function DoorLeaf({ m, open }: { m: View; open: number }) {
  const [x0, y0, x1, y1] = DOOR.leaf;
  return <Picture file={DOOR.file} w={(x1 - x0) * m.s} h={(y1 - y0) * m.s} x={-((x1 - x0) * m.s) / 2} y={m.Y((y0 + y1) / 2)} order={2} alpha tint={open > 0.02 ? "#d8d2c6" : undefined} />;
}
