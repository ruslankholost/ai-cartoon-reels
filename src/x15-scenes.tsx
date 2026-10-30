import React from "react";
import { Picture, Poly, ribbon } from "./sp-puppet";
import { Group, Squash } from "./pen-stage";
import { Cork, PopBurst } from "./x08-fx";
import { Impact, ShoutLines, Wash, PX, PY } from "./x13-draw";
import { EarPlumes, Envelopes, JumpCup, MosaicMesh, SteamLetters, Strip, mosaicCells, mosaicPop, wordBox, type Mound, type WordPlace } from "./x15-draw";
import { HandCall, InvoiceText, ReceiptEnd, StandCall } from "./x15-props";
import { bleepPose, chuckPose, rossMouthW, rossPose15 } from "./x15-act";
import { shotX, toView } from "./x15-shared";
import {
  BleepP, COUNTER, CounterFace, CounterFront, ChuckP, PL10, PlateM, RG15, ROSS_EARS, RossP, cam, chuckAt, chuckPt, counterView, bleepAt2, bleepPt, headFrame, headPt, mosaicAt, rossAt, type Kind,
} from "./x15-stage";
import {
  BLEEPS, CLINK_T, CORK_T, FPS, PLUCK_T, PRINT_T, SLAM_T, SLOT_T, SNAP_T, STAMP2_T, STAMP_T, STEP_T, THUD_T, VEIN_T,
  bleepAt, buzzAt, callAt, clamp01, curlFall, ease, lerp, shotAt, shotId, steamLevel, type ShotId,
} from "./x15-sched";

// The scenes of x15 "Bleep Fee": one canvas per shot, hard cuts. Each is the art of the shot (the plates, props and puppets cut from out/x15-cast by scripts/x15-prep.py, src/x15-rig.json; x14's counter plate with its front layer and face, x10's window
// plate, x13's armless Ross, x08's hand with the phone) under the effects and writing drawn in code (src/x15-draw.tsx, src/x15-props.tsx). Plates are seen through a view `m` (src/x09-stage.tsx cam); people are placed by the frame point of the
// middle of the head (Ross) or the eyes (Chuck) and a scale. A shot's `m` never moves: the camera's zoom (src/x15-sched.ts holdPush) is the canvas's (src/x15-shared.tsx). Frame px: x right, y down, 1080 x 1920.
// Ross is behind the counter (the counter's front layer over his lower body) when the shot is on him; Chuck is on the customer side against the shop's window; the door is seen from inside. The pop of each bleep starts from the mosaic's place
// (`popAnchor`, the same numbers as the scene's).
const t = (f: number) => f / FPS;
const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
const EDGE_DOOR = { top: "#f2e3b4", bottom: "#8a5a26", side: "#e0c58f", sideLow: "#8a5a26", split: 1150 };
const clampU = (u: number, s: number) => Math.min(768 - 540 / s, Math.max(540 / s, u));   // the view's middle column: the plate always fills the frame's width, no edge shows
const winView = (cx: number, vy = 560, s = 1.5) => cam(s, clampU(234 + (540 - cx) / s, s), vy);   // the window of the plate (plate column 234) is behind a head at frame x `cx`, as far as the plate's width allows
const cView = (s: number, yc: number, cx: number) => counterView(s, yc, clampU(384 + (540 - cx) / s, s));   // the counter plate with its column 384 (where Ross stands) at frame x `cx`, as far as the plate's width allows
const toFrame = (p: [number, number]): [number, number] => [p[0] + 540, 960 - p[1]];   // a panel point as a frame point

// ═════════════════════════════════════════════════════ Ross behind the counter: the counter's front layer is over him
type Place = { cx: number; cy: number; E: number };
function RossCounter({ f, m, cx, cy, E, body, flip = false, mouthW, order = 40, attach, dx = 0, dy = 0, pop = 0 }: { f: number; m: ReturnType<typeof cam>; cx: number; cy: number; E: number; body: "call" | "lean" | "envelopes" | "buried" | "receipt" | "wideBare" | "wide"; flip?: boolean; mouthW?: number; order?: number; attach?: React.ReactNode; dx?: number; dy?: number; pop?: number }) {
  const ross = rossAt(cx, cy, E), pose = rossPose15(f, body);
  return (
    <>
      <PlateM m={m} file={COUNTER} edge={EDGE_COUNTER} />
      <Squash x={cx - 540} y={960 - cy} sx={1 + pop} sy={1 + pop * 0.7}>
        <RossP f={f} x={ross.x + dx} y={ross.y - dy} E={E} order={order} body={body} pose={pose} mouthW={mouthW ?? rossMouthW(f)} flip={flip} attach={attach} />
      </Squash>
      <CounterFront m={m} />
    </>
  );
}

// ═════════════════════════════════════════════════════ Chuck against the window: the plate, the figure placed by his eyes, the counter he stands at drawn in code (a wooden top and its front) over his legs
function CounterStrip({ y, order = 70 }: { y: number; order?: number }) {
  return (
    <>
      <Poly pts={[[PX(-60), PY(y)], [PX(1140), PY(y)], [PX(1140), PY(y + 70)], [PX(-60), PY(y + 70)]]} color="#d49a52" order={order} />
      <Poly pts={[[PX(-60), PY(y)], [PX(1140), PY(y)], [PX(1140), PY(y + 7)], [PX(-60), PY(y + 7)]]} color="#7a4a1c" order={order + 0.1} />
      <Poly pts={[[PX(-60), PY(y + 70)], [PX(1140), PY(y + 70)], [PX(1140), PY(y + 500)], [PX(-60), PY(y + 500)]]} color="#7b4e27" order={order + 0.1} />
      <Poly pts={[[PX(-60), PY(y + 66)], [PX(1140), PY(y + 66)], [PX(1140), PY(y + 76)], [PX(-60), PY(y + 76)]]} color="#3e2410" order={order + 0.2} />
    </>
  );
}
function ChuckWin({ f, kind, cx, cy, E, flip = false, vy = 560, s = 1.5, attach, hopK = 0, k = 1, order = 40, counter = 1500 }: { f: number; kind: Kind; cx: number; cy: number; E: number; flip?: boolean; vy?: number; s?: number; attach?: React.ReactNode; hopK?: number; k?: number; order?: number; counter?: number }) {
  const ch = chuckAt(kind, cx, cy, E);
  return (
    <>
      <PlateM m={winView(cx, vy, s)} file={PL10.window.file} edge={EDGE_WINDOW} />
      <Squash x={ch.x} y={ch.y} sx={k} sy={k}>
        <ChuckP kind={kind} flip={flip} x={ch.x} y={ch.y - hopK} E={ch.E} order={order} pose={chuckPose(kind, f)} attach={attach} />
      </Squash>
      {counter > 0 && <CounterStrip y={counter} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 1 and 27: the phone on the counter, RING: it buzzes and hops, the screen glows red
const RING = { s: 2.0, vy: 640, x: 540, y: 1460, k: 2.0 };
function RingShot({ f }: { f: number }) {
  const s = RING, b = buzzAt(f, shotAt(f).t0);
  return (
    <>
      <PlateM m={cam(s.s, 384, s.vy)} file={COUNTER} edge={EDGE_COUNTER} />
      <Wash color="#3a0508" op={0.28} order={5} />
      <StandCall x={PX(s.x + b.dx)} y={PY(s.y + b.dy)} k={s.k} call={callAt(f)} order={60} rot={b.rot} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 2, 3 and 4: Ross behind the counter with the phone at his ear: the service smile (2), his face snaps purple (3), he yells into the phone (4: a punch-in, the first mosaic)
const PICK2: Place = { cx: 600, cy: 900, E: 1.55 }, SNAP3: Place = { cx: 640, cy: 900, E: 2.0 }, YELL4: Place = { cx: 650, cy: 860, E: 2.25 };
function PickupShot({ f }: { f: number }) {
  const s = PICK2;
  return <RossCounter f={f} m={cView(1.6, 1450, s.cx)} cx={s.cx} cy={s.cy} E={s.E} body="call" />;
}
function SnapShot({ f }: { f: number }) {
  const s = SNAP3, tt = t(f), a = tt - SNAP_T, pop = a >= 0 ? 0.08 * Math.exp(-a / 0.05) : 0;
  return (
    <>
      <RossCounter f={f} m={cView(1.8, 1560, s.cx)} cx={s.cx} cy={s.cy} E={s.E} body="call" pop={pop} />
      {a >= 0 && <Impact cx={s.cx} cy={s.cy} r={s.E * 190} age={a} order={170} />}
      {a >= 0 && <ShoutLines cx={s.cx} cy={s.cy + s.E * 70} r0={s.E * 215} r1={s.E * 340} f={f} order={30} />}
    </>
  );
}
function YellShot({ f }: { f: number }) {
  const s = YELL4;
  return (
    <>
      <RossCounter f={f} m={cView(1.9, 1580, s.cx)} cx={s.cx} cy={s.cy} E={s.E} body="call" />
      <ShoutLines cx={s.cx} cy={s.cy + s.E * 70} r0={s.E * 215} r1={s.E * 330} f={f} order={30} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 5: SLAM. The hand with the phone comes down from above the frame onto the counter's top (it is above the frame on the cut's first frame: a smear of streaks), the two cups jump, a star of rays,
// a squash (x14's slam). The counter's front face goes over the hand, so that its arm is cut off by the counter's edge
const SLAM = { E: 1.3, cx: 492, cy: 1046, top: 1180 };
function SlamShot({ f }: { f: number }) {
  const s = SLAM, tt = t(f), age = tt - SLAM_T, m = counterView(1.5, s.top, 384), landed = tt >= SLAM_T;
  const sq = landed ? 1 - 0.08 * Math.exp(-age / 0.07) * Math.cos(age * 42) : 1, dy = landed ? 0 : -760;
  return (
    <>
      <PlateM m={m} file={COUNTER} edge={EDGE_COUNTER} />
      <JumpCup at={[100, 1305]} w={120} age={tt - CLINK_T} order={30} />
      <JumpCup at={[980, 1305]} w={120} age={tt - CLINK_T} order={30} />
      <Group x={PX(s.cx)} y={PY(s.cy + 189 * s.E + dy)} sx={1} sy={sq}>
        <HandCall x={0} y={189 * s.E} E={s.E} call={callAt(f)} order={60} />
      </Group>
      {!landed && [-150, -70, 0, 70, 150].map((o, i) => <Poly key={i} pts={[[PX(s.cx + o - 5), PY(0)], [PX(s.cx + o + 5), PY(0)], [PX(s.cx + o + 2), PY(1180)], [PX(s.cx + o - 2), PY(1180)]]} color="#ffffff" order={70} op={0.75 - 0.1 * i % 3} />)}
      <CounterFace m={m} order={80} />
      <PopBurst at={[PX(540), PY(1290)]} t={tt} t0={SLAM_T} R={190} order={90} />
      <PopBurst at={[PX(300), PY(1290)]} t={tt} t0={SLAM_T + 0.02} R={110} order={90} />
      <PopBurst at={[PX(780), PY(1290)]} t={tt} t0={SLAM_T + 0.02} R={110} order={90} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 6 and 7: Ross leans over the counter at us (6: two pictures, the medium shot and a punch-in on the bleep) and shakes a fistful of envelopes (7)
const LEAN6: Place[] = [{ cx: 540, cy: 790, E: 1.3 }, { cx: 540, cy: 830, E: 1.85 }], ENV7: Place = { cx: 640, cy: 800, E: 1.45 };
const lean6 = (f: number) => (f >= Math.round(BLEEPS[1].f0) ? LEAN6[1] : LEAN6[0]);
function LeanShot({ f }: { f: number }) {
  const s = lean6(f), two = s === LEAN6[1];
  return (
    <>
      <RossCounter f={f} m={cView(two ? 1.9 : 1.6, two ? 1530 : 1330, s.cx)} cx={s.cx} cy={s.cy} E={s.E} body="lean" />
      <ShoutLines cx={s.cx} cy={s.cy + s.E * 70} r0={s.E * 215} r1={s.E * 330} f={f} order={30} />
    </>
  );
}
function EnvShot({ f }: { f: number }) {
  const s = ENV7, tt = t(f), a = tt - VEIN_T;
  return (
    <>
      <RossCounter f={f} m={cView(1.6, 1430, s.cx)} cx={s.cx} cy={s.cy} E={s.E} body="envelopes" />
      <ShoutLines cx={s.cx} cy={s.cy + s.E * 70} r0={s.E * 215} r1={s.E * 330} f={f} order={30} />
      {a >= 0 && <Impact cx={s.cx} cy={s.cy - s.E * 150} r={s.E * 60} age={a} order={170} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 8, 16, 17, 18, 19, 20, 21: Ross close, the bleeps: a step in on each (the head gets bigger), the mosaic over his mouth, half his face, his face, his whole head
const CLOSE: Record<string, Place & { s: number; yc: number }> = {   // (the chin of each is at about y 1250: cy = 1250 - 207 E; the captions go under it)
  shit: { cx: 540, cy: 815, E: 2.1, s: 1.9, yc: 1720 },
  bulge: { cx: 560, cy: 795, E: 2.2, s: 1.9, yc: 1720 },
  hair: { cx: 540, cy: 784, E: 2.25, s: 1.9, yc: 1720 },
  blast1: { cx: 540, cy: 764, E: 2.35, s: 1.9, yc: 1720 },
  blast2: { cx: 540, cy: 733, E: 2.5, s: 1.9, yc: 1720 },
  blast3: { cx: 540, cy: 701, E: 2.65, s: 1.9, yc: 1720 },
  head: { cx: 540, cy: 670, E: 2.8, s: 1.9, yc: 1720 },
};
function CloseShot({ f, id }: { f: number; id: keyof typeof CLOSE }) {
  const c = CLOSE[id];
  return <RossCounter f={f} m={cView(c.s, c.yc, c.cx)} cx={c.cx} cy={c.cy} E={c.E} body="wideBare" />;
}
// the pictures of the shots that are more than one: shot 17 steps in on HAIR! (STEP_T)
const hairPlace = (f: number): Place => (t(f) >= STEP_T ? { cx: 540, cy: 722, E: 2.55 } : CLOSE.hair);
function HairShot({ f }: { f: number }) {
  const c = hairPlace(f);
  return <RossCounter f={f} m={cView(1.9, 1720, c.cx)} cx={c.cx} cy={c.cy} E={c.E} body="wideBare" />;
}

// ═════════════════════════════════════════════════════ 9 and 10: the door from inside. The brass mail slot fires envelopes like a fire hose, they pile up (9); Ross is buried in them up to his neck, one hand up with an envelope, and they still rain in (10)
const DOOR = { s: 1.5, u: 384, v: 700 };
const doorView = () => cam(DOOR.s, DOOR.u, DOOR.v);
const slotFrame = (): [number, number] => { const [x0, y0, x1, y1] = RG15.props.door.slot; return [540 + ((x0 + x1) / 2 - DOOR.u) * DOOR.s, 960 + ((y0 + y1) / 2 - DOOR.v) * DOOR.s + 6]; };
const MOUND: Mound = { x: 560, halfW: 460, floor: 1800, hMax: (q) => 40 + 330 * clamp01((q - SLOT_T) / 0.95) };
const ENVELOPE = RG15.props.envelope;
const STREAM = { rate: 72, n: 90 };
function DoorShot({ f }: { f: number }) {
  const tt = t(f);
  return (
    <>
      <PlateM m={doorView()} file={RG15.props.door.file} edge={EDGE_DOOR} />
      <Envelopes img={ENVELOPE} from={slotFrame()} fromW={100} t={tt} t0={SLOT_T} rate={STREAM.rate} n={STREAM.n} land={MOUND} flyers={0.4} order={50} k={0.19} seed={3} />
    </>
  );
}
const BURIED = { cx: 430, cy: 1200, E: 0.98 };
function BuriedShot({ f }: { f: number }) {
  const s = BURIED, tt = t(f), ross = rossAt(s.cx, s.cy, s.E), a = tt - THUD_T, sq = a >= 0 ? 0.04 * Math.exp(-a / 0.06) * Math.cos(a * 40) : 0, pose = rossPose15(f, "buried");
  return (
    <>
      <PlateM m={doorView()} file={RG15.props.door.file} edge={EDGE_DOOR} />
      <Envelopes img={ENVELOPE} from={slotFrame()} fromW={100} t={tt} t0={SLOT_T} rate={STREAM.rate} n={STREAM.n} order={30} k={0.19} seed={3} />
      <Squash x={ross.x} y={ross.y - 700 * s.E} sx={1 + sq} sy={1 - sq}>
        <RossP f={f} x={ross.x} y={ross.y} E={s.E} order={40} body="buried" pose={pose} mouthW={rossMouthW(f)} />
      </Squash>
    </>
  );
}

// ═════════════════════════════════════════════════════ 11: his tattooed hand holds the invoice up to the lens: the painted sheet is blank, the words are code (INVOICE, "You opened this."), the amount is stamped on the thud
const INV = { k: 1.9, fx: 540, fy: 950 };
function InvoiceShot({ f }: { f: number }) {
  const I = RG15.props.invoice, [px0, py0, px1, py1] = I.paper, pcx = (px0 + px1) / 2, pcy = (py0 + py1) / 2, k = INV.k, tt = t(f), a = tt - STAMP_T;
  const sway = 0.8 * Math.sin(tt * 9), lcx = I.ox + I.w / 2, lcy = I.oy + I.h / 2;
  return (
    <>
      <PlateM m={cam(2.4, 384, 830)} file={COUNTER} edge={EDGE_COUNTER} />
      <Wash color="#fff8ea" op={0.4} order={5} />
      <Group x={0} y={0} rot={sway}>
        <Picture file={I.file} w={I.w * k} h={I.h * k} x={PX(INV.fx + (lcx - pcx) * k)} y={PY(INV.fy + (lcy - pcy) * k)} order={40} alpha />
        <InvoiceText x={PX(INV.fx)} y={PY(INV.fy)} k={k} paper={I.paper} stamp={a >= 0 ? a : 0} order={50} />
      </Group>
    </>
  );
}

// ═════════════════════════════════════════════════════ 12, 13, 14, 15: Chuck at the counter (B-roll): he licks the plate clean (12), plucks a curl from his head and drops it on the plate (13), slides the plate back, palm up (14), the plate and the palm in a punch-in (15)
const LICK = { cx: 540, cy: 700, E: 1.55 }, PLUCK = { cx: 560, cy: 700, E: 1.5 }, SLIDE = { cx: 540, cy: 700, E: 1.3 }, PLATE = { cx: 472, cy: 575, E: 1.75 };
const LICK_AT = [0.05, 0.3, 0.55];   // the three licks' times after the first (x15-lick: 0.05, 0.25-0.35, 0.45-0.65 s)
function LickShot({ f }: { f: number }) {
  const s = LICK, a = t(f) - 9.0, bob = LICK_AT.reduce((v, q) => v + (a >= q ? 6 * Math.exp(-(a - q) / 0.1) * Math.sin((a - q) * 32) : 0), 0);
  return <ChuckWin f={f} kind="lick" cx={s.cx} cy={s.cy} E={s.E} hopK={bob} vy={600} s={1.55} />;
}
/** a grey curl of hair: a coil that opens out into a short tail (unit size, x right, y up), a ribbon that is thick at the middle of the coil and thin at the end of the tail, with a dark ink line */
const CURL: [number, number, number][] = [
  ...Array.from({ length: 34 }, (_, i) => { const u = i / 33, th = u * Math.PI * 3.6 + 0.4, r = 0.1 + 0.3 * u; return [r * Math.cos(th) - 0.1, r * Math.sin(th) * 0.85, 1 - 0.45 * u] as [number, number, number]; }),
  ...Array.from({ length: 10 }, (_, i) => { const u = (i + 1) / 10; return [0.42 + 0.75 * u, -0.28 + 0.1 * Math.sin(u * 3), 0.55 * (1 - 0.7 * u)] as [number, number, number]; }),
];
function Curl({ x, y, size, rot = 0, order }: { x: number; y: number; size: number; rot?: number; order: number }) {
  const pl = CURL.map(([a, b, w]) => [a * size, b * size, w * size * 0.13]);
  return (
    <Group x={x} y={y} rot={rot}>
      <Poly pts={ribbon(pl.map(([a, b, w]) => [a, b, w + size * 0.06]))} color="#2d3034" order={order} />
      <Poly pts={ribbon(pl)} color="#9aa0a6" order={order + 0.1} />
    </Group>
  );
}
function PluckShot({ f }: { f: number }) {
  const s = PLUCK, tt = t(f), a = tt - PLUCK_T, p = curlFall(f), fist = chuckPt("pluck", s.cx, s.cy, s.E, 235, 300), plate = chuckPt("pluck", s.cx, s.cy, s.E, 548, 580);
  const x = lerp(fist[0], plate[0], ease(p)) + 40 * Math.sin(p * Math.PI * 3), y = lerp(fist[1], plate[1], p * p) - 70 * Math.sin(p * Math.PI);
  const flinch = a >= 0 ? 1 + 0.03 * Math.exp(-a / 0.06) * Math.cos(a * 44) : 1;
  return (
    <>
      <ChuckWin f={f} kind="pluck" cx={s.cx} cy={s.cy} E={s.E} vy={600} s={1.55} k={flinch} />
      {a >= 0 && a < 0.16 && <PopBurst at={[PX(fist[0] + 30), PY(fist[1] - 20)]} t={tt} t0={PLUCK_T} R={70} order={170} />}
      {a >= 0.12 && p < 1 && <Curl x={PX(x)} y={PY(y)} size={64} rot={-30 + 360 * p} order={120} />}
      {p >= 1 && <Curl x={PX(plate[0])} y={PY(plate[1] + 6)} size={64} rot={-12} order={120} />}
    </>
  );
}
function SlideShot({ f }: { f: number }) {
  const s = SLIDE, a = t(f) - 11.48, k = 1 + 0.05 * clamp01(a / 0.3), plate = chuckPt("plate", s.cx, s.cy, s.E * k, 352, 592);
  return (
    <>
      <ChuckWin f={f} kind="plate" cx={s.cx} cy={s.cy} E={s.E * k} vy={600} s={1.55} counter={1560} />
      <Curl x={PX(plate[0])} y={PY(plate[1])} size={60 * k} rot={-8} order={120} />
    </>
  );
}
function PlateShot({ f }: { f: number }) {
  const s = PLATE, plate = chuckPt("plate", s.cx, s.cy, s.E, 352, 592);
  return (
    <>
      <ChuckWin f={f} kind="plate" cx={s.cx} cy={s.cy} E={s.E} vy={600} s={1.75} counter={0} />
      <Curl x={PX(plate[0])} y={PY(plate[1])} size={86} rot={-8} order={120} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 22: Ross panting behind the counter (the lean picture is a man out of breath); beside him, all along, the Bleep Guy with his thumb on the button: BRRRT, a strip of receipt shoots out of the box on his
// belly, arcs over the counter and unrolls down its front
const PRN = { ross: { cx: 290, cy: 770, E: 0.98 }, guy: { cx: 790, cy: 700, E: 1.3 }, yc: 1190 };
function PrinterShot({ f }: { f: number }) {
  const s = PRN, m = cView(1.4, s.yc, 540), tt = t(f), g = bleepAt2("button", s.guy.cx, s.guy.cy, s.guy.E), r = rossAt(s.ross.cx, s.ross.cy, s.ross.E), box = bleepPt("button", s.guy.cx, s.guy.cy, s.guy.E, 506, 612);
  const p = ease(clamp01((tt - PRINT_T) / 0.5)), sh = tt >= PRINT_T ? 4 * Math.exp(-(tt - PRINT_T) / 0.2) * Math.sin((tt - PRINT_T) * 120) : 0, press = tt >= PRINT_T - 0.05 ? Math.exp(-Math.max(0, tt - PRINT_T) / 0.08) : 0;   // (his thumb comes down on the button: the whole figure dips a little)
  const path = (u: number): [number, number] => {
    const P: [number, number][] = [box, [box[0] - 70, box[1] - 150], [box[0] - 260, box[1] - 120], [box[0] - 360, box[1] + 90], [box[0] - 390, 1500], [box[0] - 340, 1980]];
    const q = u * (P.length - 1), i = Math.min(P.length - 2, Math.floor(q)), w = q - i, a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
    const cr = (p0: number, p1: number, p2: number, p3: number) => 0.5 * (2 * p1 + (-p0 + p2) * w + (2 * p0 - 5 * p1 + 4 * p2 - p3) * w * w + (-p0 + 3 * p1 - 3 * p2 + p3) * w * w * w);
    return [cr(a[0], b[0], c[0], d[0]) + sh, cr(a[1], b[1], c[1], d[1])];
  };
  return (
    <>
      <PlateM m={m} file={COUNTER} edge={EDGE_COUNTER} />
      <RossP f={f} x={r.x + sh} y={r.y} E={s.ross.E} order={40} body="lean" pose={rossPose15(f, "lean")} mouthW={rossMouthW(f)} />
      <Squash x={g.x + sh} y={PY(1150)} sx={1 + 0.012 * press} sy={1 - 0.035 * press}>
        <BleepP kind="button" x={g.x + sh} y={g.y} E={g.E} order={44} pose={bleepPose(f)} />
      </Squash>
      <CounterFront m={m} order={80} />
      <Strip path={path} p={p} w={118} order={120} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 23: the end of the receipt on the floor: the printed lines of the bleeps, TOTAL $1,272.45 in big print, the torn end
const FLOOR_PLANKS = [150, 340, 540, 760, 1000, 1260, 1540, 1840];
function PlankFloor({ order = 0 }: { order?: number }) {
  return (
    <>
      <Poly pts={[[PX(-60), PY(-60)], [PX(1140), PY(-60)], [PX(1140), PY(1980)], [PX(-60), PY(1980)]]} color="#b98642" order={order} />
      {FLOOR_PLANKS.map((y, i) => <Poly key={i} pts={[[PX(-60), PY(y)], [PX(1140), PY(y)], [PX(1140), PY(y + 7)], [PX(-60), PY(y + 7)]]} color="#8f6732" order={order + 0.1} op={0.75} />)}
    </>
  );
}
const RLINES: [string, string][] = BLEEPS.slice(0, 8).map((b, i) => [`BLEEP ${i + 1}`, b.price.toFixed(2)]);
function TotalShot({ f }: { f: number }) {
  const tt = t(f), a = tt - STAMP2_T, drop = 36 * Math.max(0, 1 - a / 0.08) ** 2;
  return (
    <>
      <PlankFloor />
      <ReceiptEnd x={PX(540)} y={PY(1120 - drop)} k={1.42} lines={RLINES} rot={-3} order={30} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 24: Ross with the receipt in both hands, his eye twitching
const REC24: Place = { cx: 540, cy: 900, E: 1.3 };
function ReceiptShot({ f }: { f: number }) {
  const s = REC24;
  return <RossCounter f={f} m={cView(1.6, 1700, s.cx)} cx={s.cx} cy={s.cy} E={s.E} body="receipt" />;
}

// ═════════════════════════════════════════════════════ 25: the two of them: Ross opens his mouth wide for the next one, the Bleep Guy's thumb waits on the button, Ross clamps his mouth shut, shaking
const CLA = { ross: { cx: 330, cy: 800, E: 1.25 }, guy: { cx: 800, cy: 830, E: 1.45 }, yc: 1520 };
function ClampShot({ f }: { f: number }) {
  const s = CLA, m = cView(1.5, s.yc, 540), g = bleepAt2("button", s.guy.cx, s.guy.cy, s.guy.E), r = rossAt(s.ross.cx, s.ross.cy, s.ross.E), pose = rossPose15(f, "receipt");
  return (
    <>
      <PlateM m={m} file={COUNTER} edge={EDGE_COUNTER} />
      <RossP f={f} x={r.x} y={r.y} E={s.ross.E} order={40} body="receipt" pose={pose} mouthW={rossMouthW(f)} />
      <BleepP kind="button" x={g.x} y={g.y} E={g.E} order={44} pose={bleepPose(f)} />
      <CounterFront m={m} order={80} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 26: POP POP, the ear tunnels shoot out like corks, the kettle screams, the steam curls into letters (an F first) and the mosaic snaps over the word
const STEAM = { cx: 540, cy: 1010, E: 1.75, yc: 1740 };
const earsOf = (f: number): [[number, number], [number, number]] => {
  const s = STEAM, ross = rossAt(s.cx, s.cy, s.E), pose = rossPose15(f, "wideBare");
  const p = ROSS_EARS.map(([hx, hy]) => toFrame(headPt(pose, s.E, ross.x, ross.y, hx, hy)));
  return [p[0], p[1]];
};
const WORD: Omit<WordPlace, "ears"> = { cx: 500, cy: 570, lw: 125, lh: 200, gap: 28 };
const wordPlace = (f: number): WordPlace => ({ ...WORD, ears: earsOf(f) });
function SteamShot({ f }: { f: number }) {
  const s = STEAM, tt = t(f), m = cView(1.9, s.yc, 760), ross = rossAt(s.cx, s.cy, s.E), pose = rossPose15(f, "wideBare");   // (the plate is moved right: the blackboard is behind the word, the clock is out of the frame)
  const ears = ROSS_EARS.map(([hx, hy]) => headPt(pose, s.E, ross.x, ross.y, hx, hy)) as [number, number][];
  const earL = toFrame(ears[0]), earR = toFrame(ears[1]), r = 34 * s.E / 1.7, b = BLEEPS[8], word = wordPlace(f), [wx0, wy0, wx1, wy1] = wordBox(word), on = bleepAt(f)?.stage === "word", age = (f - b.f0) / FPS;
  const sh = { cx: (wx0 + wx1) / 2 - 540, cy: 960 - (wy0 + wy1) / 2, a: (wx1 - wx0) / 2 + 26, b: (wy1 - wy0) / 2 + 24, ellipse: false, cell: 30 };
  const pp = mosaicPop(age);
  return (
    <>
      <RossCounter f={f} m={m} cx={s.cx} cy={s.cy} E={s.E} body="wideBare" />
      {steamLevel(f) > 0 && <EarPlumes left={earL} right={earR} t={tt} k={s.E / 1.7 * 1.5} lvk={0.55} order={170} />}
      <SteamLetters f={f} place={word} order={172} />
      <Cork at={ears[0]} dir={-1} t={tt} t0={CORK_T[0]} r={r} order={175} />
      <Cork at={ears[1]} dir={1} t={tt} t0={CORK_T[1]} r={r} order={175} up={0.8} />
      <PopBurst at={ears[0]} t={tt} t0={CORK_T[0]} R={70 * s.E / 1.7} order={174} />
      <PopBurst at={ears[1]} t={tt} t0={CORK_T[1]} R={70 * s.E / 1.7} order={174} />
      {on && (
        <Group x={sh.cx} y={sh.cy} sx={pp} sy={pp}>
          <group position={[-sh.cx, -sh.cy, 0]}><MosaicMesh cells={mosaicCells(sh, { kind: "word", mouth: [0, 0], eyes: [], top: 0 }, 91, Math.floor((f - b.f0) / 2))} order={190} /></group>
        </Group>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════ the 27 shots
export const FOCUS: Record<ShotId, [number, number]> = {
  ring: [540, 1000], pickup: [600, 900], snap: [640, 900], yell: [650, 880], slam: [540, 1200], lean: [540, 900], env: [640, 880], shit: [540, 850], door: [540, 1000], buried: [430, 1200], invoice: [540, 950], lick: [540, 800], pluck: [560, 800],
  slide: [540, 800], plate: [500, 700], bulge: [560, 850], hair: [540, 850], blast1: [540, 850], blast2: [540, 850], blast3: [540, 850], head: [540, 850], printer: [540, 960], total: [540, 960], receipt: [540, 900], clamp: [540, 960],
  steam: [540, 800], ring2: [540, 1000],
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
const REAL: Record<ShotId, React.FC<{ f: number }>> = {
  ring: V("ring", RingShot),
  pickup: V("pickup", PickupShot),
  snap: V("snap", SnapShot),
  yell: V("yell", YellShot),
  slam: V("slam", SlamShot),
  lean: V("lean", LeanShot),
  env: V("env", EnvShot),
  shit: V("shit", ({ f }) => <CloseShot f={f} id="shit" />),
  door: V("door", DoorShot),
  buried: V("buried", BuriedShot),
  invoice: V("invoice", InvoiceShot),
  lick: V("lick", LickShot),
  pluck: V("pluck", PluckShot),
  slide: V("slide", SlideShot),
  plate: V("plate", PlateShot),
  bulge: V("bulge", ({ f }) => <CloseShot f={f} id="bulge" />),
  hair: V("hair", HairShot),
  blast1: V("blast1", ({ f }) => <CloseShot f={f} id="blast1" />),
  blast2: V("blast2", ({ f }) => <CloseShot f={f} id="blast2" />),
  blast3: V("blast3", ({ f }) => <CloseShot f={f} id="blast3" />),
  head: V("head", ({ f }) => <CloseShot f={f} id="head" />),
  printer: V("printer", PrinterShot),
  total: V("total", TotalShot),
  receipt: V("receipt", ReceiptShot),
  clamp: V("clamp", ClampShot),
  steam: V("steam", SteamShot),
  ring2: V("ring2", RingShot),
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = REAL;
export const ART: Record<ShotId, string> = {
  ring: "phone", pickup: "call", snap: "call", yell: "call", slam: "hand+phone+cups", lean: "lean", env: "envelopes", shit: "wideBare", door: "door+envelopes", buried: "buried", invoice: "invoice", lick: "lick", pluck: "pluck", slide: "plate",
  plate: "plate", bulge: "wideBare", hair: "wideBare", blast1: "wideBare", blast2: "wideBare", blast3: "wideBare", head: "wideBare", printer: "lean+bleep+strip", total: "receipt", receipt: "receipt", clamp: "receipt+bleep", steam: "wideBare+steam", ring2: "phone",
};

// ── where the red pop of a bleep starts (frame px): the mouth of Ross in the shot's picture, through the camera (the zoom and the shake of that frame)
const PLACE: Partial<Record<ShotId, (f: number) => Place>> = {
  yell: () => YELL4, lean: lean6, shit: () => CLOSE.shit, bulge: () => CLOSE.bulge, hair: hairPlace, blast1: () => CLOSE.blast1, blast2: () => CLOSE.blast2, blast3: () => CLOSE.blast3, head: () => CLOSE.head,
};
const BODY: Partial<Record<ShotId, string>> = { yell: "call", lean: "lean" };
export function popAnchor(f: number): [number, number] {
  const id = shotId(f), pl = PLACE[id];
  if (id === "steam") { const [x0, y0, x1, y1] = wordBox(wordPlace(f)); return toView(f, FOCUS[id], [(x0 + x1) / 2, (y0 + y1) / 2]); }
  if (!pl) return [540, 900];
  const p = pl(f), pose = rossPose15(f, BODY[id] ?? "wideBare"), mp = mosaicAt("mouth");
  return toView(f, FOCUS[id], headFrame(pose, p.cx, p.cy, p.E, [mp[0], mp[1] + 20]));
}
/** the frame point the payout of shot 21 is thrown from */
export const payoutAnchor = (): [number, number] => popAnchor(Math.round(BLEEPS[7].f0));
