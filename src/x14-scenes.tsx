import React from "react";
import { useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { Glow, Picture, Poly } from "./sp-puppet";
import { Group, Squash } from "./pen-stage";
import { Cork, PopBurst } from "./x08-fx";
import { Spr } from "./x09-stage";
import { Impact, ShoutLines, Wash, PX, PY } from "./x13-draw";
import { Confetti, DizzyStars, EarPlumes, GoldStar, JumpCup, Streaks } from "./x14-draw";
import { HandCard, StandPhone, Thumb, UpScreen, slotAt, upGlassAt } from "./x14-props";
import { chuckPose, hop, rossMouthW, rossPose14 } from "./x14-act";
import { H, W, shotX } from "./x14-shared";
import { CHUCK_DISC, COUNTER, ChuckP, CounterFront, PL10, PlateM, RG14, ROSS_EARS, RossP, cam, chuckAt, chuckPt, counterView, headPt, rossAt, rossPt, type Kind, type RossBody } from "./x14-stage";
import {
  CHIME_T, CHOIR_T, CLINK_T, CORK_T, CRASH_T, FPS, LAND_T, POPPER_T, PRESS_T, PUNCH2_T, PUNCH_T, SLAM_T, SNAP_T, STAB_T, STEP_T, THUMBS_T, WHOOSH_T, cardAt, clamp01, confettiOn, ease, gulpAt, lerp, shotAt, steamLevel, thumbsPop, type ShotId,
} from "./x14-sched";

// The scenes of x14 "Four Stars": one canvas per shot, hard cuts. Each is the art of the shot (the plates, props and puppets cut from out/x14-cast by scripts/x14-prep.py, src/x14-rig.json; x10's shop plates, its counter's front layer and Ross's point
// and wide bodies; x08's hand with the phone and Ross's up and fly bodies; x13's Chuck with the phone and Ross's armless body) under the effects and writing drawn in code (src/x14-draw.tsx, src/x14-props.tsx). Plates are seen through a view `m`
// (src/x09-stage.tsx cam); people are placed by the frame point of the middle of the eyes (Chuck) or the head (Ross) and a scale. A shot's `m` never moves: the camera's zoom (src/x14-sched.ts holdPush) is the canvas's (src/x14-shared.tsx).
// Frame px: x right, y down, 1080 x 1920. Ross is behind the counter (the counter's front layer over his lower body) when the shot is on him, in front of it when he kneels, dives over it or stands over Chuck; Chuck is on the customer side
// against the shop's window (bg-window). The phone close-ups are all x08's hand.
const t = (f: number) => f / FPS;
const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
const clampU = (u: number, s: number) => Math.min(768 - 540 / s, Math.max(540 / s, u));   // the view's middle column: the plate always fills the frame's width, no edge shows
const winView = (cx: number, vy = 560, s = 1.5) => cam(s, clampU(234 + (540 - cx) / s, s), vy);   // the window of the plate (plate column 234) is behind a head at frame x `cx`, as far as the plate's width allows
const cView = (s: number, yc: number, cx: number) => counterView(s, yc, clampU(384 + (540 - cx) / s, s));   // the counter plate with its column 384 (where Ross stands) at frame x `cx`, as far as the plate's width allows
const toFrame = (p: [number, number]): [number, number] => [p[0] + 540, 960 - p[1]];   // a panel point as a frame point

// ═════════════════════════════════════════════════════ Chuck against the window: the plate, the figure placed by his eyes
function ChuckWin({ f, kind, cx, cy, E, flip = false, vy = 560, s = 1.5, attach, hopK = 0, k = 1, order = 40 }: { f: number; kind: Kind; cx: number; cy: number; E: number; flip?: boolean; vy?: number; s?: number; attach?: React.ReactNode; hopK?: number; k?: number; order?: number }) {
  const ch = chuckAt(kind, cx, cy, E);
  return (
    <>
      <PlateM m={winView(cx, vy, s)} file={PL10.window.file} edge={EDGE_WINDOW} />
      <Squash x={ch.x} y={ch.y} sx={k} sy={k}>
        <ChuckP kind={kind} flip={flip} x={ch.x} y={ch.y - hopK} E={ch.E} order={order} pose={chuckPose(kind, f)} f={f} attach={attach} />
      </Squash>
    </>
  );
}

// ═════════════════════════════════════════════════════ Ross behind the counter: the counter's front layer is over him
function RossCounter({ f, m, cx, cy, E, body, flip = false, mouthW, order = 40, attach, dx = 0, dy = 0, pop = 0 }: { f: number; m: ReturnType<typeof cam>; cx: number; cy: number; E: number; body: RossBody; flip?: boolean; mouthW?: number; order?: number; attach?: React.ReactNode; dx?: number; dy?: number; pop?: number }) {
  const ross = rossAt(cx, cy, E), pose = rossPose14(f, body);
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

// ═════════════════════════════════════════════════════ 1: the phone in Ross's hand over a soft counter: DING, the review slides down, four gold stars pop in one by one, the fifth stays an empty outline
const HAND1 = { E: 1.95, cx: 468, cy: 998 };
function CardShot({ f }: { f: number }) {
  return (
    <>
      <PlateM m={cam(2.4, 384, 830)} file={COUNTER} edge={EDGE_COUNTER} />
      <Wash color="#fff8ea" op={0.4} order={5} />
      <HandCard x={PX(HAND1.cx)} y={PY(HAND1.cy)} E={HAND1.E} card={cardAt(f)} order={60} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 2: Ross's face snaps purple (the service smile, then the snap: a squash, a hit star, shout lines)
const SNAP2 = { cx: 540, cy: 1010, E: 2.3 };
function SnapShot({ f }: { f: number }) {
  const s = SNAP2, tt = t(f), a = tt - SNAP_T, pop = a >= 0 ? 0.1 * Math.exp(-a / 0.05) : 0;
  return (
    <>
      <RossCounter f={f} m={cView(1.7, 1600, s.cx)} cx={s.cx} cy={s.cy} E={s.E} body="wideBare" pop={pop} />
      {a >= 0 && <Impact cx={s.cx} cy={s.cy} r={s.E * 190} age={a} order={170} />}
      {a >= 0 && <ShoutLines cx={s.cx} cy={s.cy + s.E * 70} r0={s.E * 215} r1={s.E * 340} f={f} order={30} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 3: SLAM. The hand with the phone comes down from above the frame onto the counter's top (it is above the frame on the cut's first frame: a smear of streaks), the two cups jump, a star of rays, a squash.
// The counter's front face (the plate's rows below its top surface) goes over the hand, so that its arm is cut off by the counter's edge
const SLAM = { E: 1.3, cx: 492, cy: 1046, top: 1180 };
function CounterFace({ m, order }: { m: ReturnType<typeof cam>; order: number }) {
  const c = RG14.props.counterFace;
  return <Spr m={m} d={{ file: c.file, w: c.w, h: c.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={c.y0} k={1} order={order} />;
}
function SlamShot({ f }: { f: number }) {
  const s = SLAM, tt = t(f), age = tt - SLAM_T, m = counterView(1.5, s.top, 384), landed = tt >= SLAM_T;
  const sq = landed ? 1 - 0.08 * Math.exp(-age / 0.07) * Math.cos(age * 42) : 1, dy = landed ? 0 : -760;
  return (
    <>
      <PlateM m={m} file={COUNTER} edge={EDGE_COUNTER} />
      <JumpCup at={[100, 1305]} w={120} age={tt - CLINK_T} order={30} />
      <JumpCup at={[980, 1305]} w={120} age={tt - CLINK_T} order={30} />
      <Group x={PX(s.cx)} y={PY(s.cy + 189 * s.E + dy)} sx={1} sy={sq}>
        <HandCard x={0} y={189 * s.E} E={s.E} card={cardAt(f)} order={60} />
      </Group>
      {!landed && [-150, -70, 0, 70, 150].map((o, i) => <Poly key={i} pts={[[PX(s.cx + o - 5), PY(0)], [PX(s.cx + o + 5), PY(0)], [PX(s.cx + o + 2), PY(1180)], [PX(s.cx + o - 2), PY(1180)]]} color="#ffffff" order={70} op={0.75 - 0.1 * i % 3} />)}
      <CounterFace m={m} order={80} />
      <PopBurst at={[PX(540), PY(1290)]} t={tt} t0={SLAM_T} R={190} order={90} />
      <PopBurst at={[PX(300), PY(1290)]} t={tt} t0={SLAM_T + 0.02} R={110} order={90} />
      <PopBurst at={[PX(780), PY(1290)]} t={tt} t0={SLAM_T + 0.02} R={110} order={90} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 4, 6 and 7: Ross, purple, behind the counter, his finger at the phone that stands on the counter (the phone of shot 3, upright, the four gold stars and the empty fifth). 4 is three pictures: the medium
// shot (1.43 s: Ross on the left, the phone at the right), a hard punch-in to his face on STARS?! (1.97 s: 1.9 times, the face fills the frame, a shake and a hit star), and at 2.53 s back out wide on the other side (mirrored: Ross at the right, the phone
// at the left); 6 Ross on the left again, closer, the phone at the right edge; 7 mirrored, the face huge, the finger stabbing on ONE and a hard step in on MANNERS!, the phone out of the frame
type Fr = { cx: number; cy: number; E: number; s: number; yc: number; k: number };   // Ross's head, his scale, the counter plate's scale and the row of its top edge, the phone's px per design unit (0: no phone)
const lunge = (f: number) => [PUNCH_T, PUNCH2_T, STAB_T, STEP_T].reduce((a, t0) => a + (t(f) >= t0 ? 22 * Math.exp(-(t(f) - t0) / 0.07) : 0), 0);
/** the phone's wobble when the finger lunges at it (degrees about its base) */
const wobble = (f: number, dir: number) => [PUNCH_T, PUNCH2_T, STAB_T].reduce((a, t0) => a + (t(f) >= t0 ? 2.6 * dir * Math.exp(-(t(f) - t0) / 0.08) * Math.cos((t(f) - t0) * 38) : 0), 0);
function PointShot({ f, fr, flip = false, hit = [] }: { f: number; fr: Fr; flip?: boolean; hit?: number[] }) {
  const { cx, cy, E, s: sc, yc, k } = fr, dir = flip ? -1 : 1, tip = cx + dir * 474 * E, tt = t(f), phoneX = tip + dir * (164 * k - 6), baseY = yc + 0.62 * 110 * sc;
  return (
    <>
      <RossCounter f={f} m={cView(sc, yc, cx)} cx={cx} cy={cy} E={E} body="point" flip={flip} dx={dir * lunge(f)} />
      <ShoutLines cx={cx} cy={cy + E * 70} r0={E * 215} r1={E * 330} f={f} order={30} />
      {hit.map((h, i) => tt >= h && <Impact key={i} cx={cx} cy={cy} r={E * 190} age={tt - h} order={170} />)}
      {k > 0 && <StandPhone x={PX(phoneX)} y={PY(baseY)} k={k} card={cardAt(f)} order={90} rot={wobble(f, dir)} />}
    </>
  );
}
const FR4: Fr[] = [{ cx: 210, cy: 800, E: 0.95, s: 1.6, yc: 1330, k: 1.3 }, { cx: 500, cy: 880, E: 1.9, s: 1.9, yc: 1560, k: 0 }, { cx: 860, cy: 860, E: 0.8, s: 1.35, yc: 1420, k: 1.3 }];
const FR6: Fr = { cx: 225, cy: 840, E: 1.05, s: 1.75, yc: 1440, k: 1.05 };
const ONE: Fr = { cx: 760, cy: 820, E: 1.5, s: 1.8, yc: 1500, k: 0 };
function ShoutShot({ f }: { f: number }) {
  const tt = t(f);
  return <PointShot f={f} fr={tt < PUNCH_T ? FR4[0] : tt < PUNCH2_T ? FR4[1] : FR4[2]} flip={tt >= PUNCH2_T} hit={[PUNCH_T, PUNCH2_T]} />;
}

// ═════════════════════════════════════════════════════ 5: Chuck against the window, beaming, two thumbs up: they pop up on "Four" (the figure springs up, a star of rays at each thumb)
const THUMBS = { cx: 470, cy: 760, E: 1.5 };
function ThumbsShot({ f }: { f: number }) {
  const s = THUMBS, tt = t(f), pk = thumbsPop(f), k = 0.93 + 0.07 * pk, tipL = chuckPt("thumbs", s.cx, s.cy, s.E, 298, 425), tipR = chuckPt("thumbs", s.cx, s.cy, s.E, 700, 430);
  return (
    <>
      <ChuckWin f={f} kind="thumbs" cx={s.cx} cy={s.cy} E={s.E} hopK={hop(f) * 0.4} vy={600} s={1.55} k={k} />
      <PopBurst at={[PX(tipL[0]), PY(tipL[1])]} t={tt} t0={THUMBS_T} R={80} order={170} />
      <PopBurst at={[PX(tipR[0]), PY(tipR[1])]} t={tt} t0={THUMBS_T} R={80} order={170} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 8: Chuck shrugs, palms up, still smiling: "Nobody's perfect."
const SHRUG = { cx: 540, cy: 790, E: 1.5 };
function ShrugShot({ f }: { f: number }) {
  const s = SHRUG;
  return <ChuckWin f={f} kind="shrug" cx={s.cx} cy={s.cy} E={s.E} hopK={hop(f) * 0.5} vy={620} s={1.6} />;
}

// ═════════════════════════════════════════════════════ 9 and 13: Ross close, the vein pops and throbs (9); the eyes bulge (13)
const CLOSE9 = { cx: 520, cy: 1000, E: 2.3 }, CLOSE13 = { cx: 560, cy: 1010, E: 2.35 };
function CloseShot({ f, c, s: sc, yc }: { f: number; c: { cx: number; cy: number; E: number }; s: number; yc: number }) {
  return <RossCounter f={f} m={cView(sc, yc, c.cx)} cx={c.cx} cy={c.cy} E={c.E} body="wideBare" />;
}

// ═════════════════════════════════════════════════════ 10: "On the house." Ross behind the counter holds out the mug on its saucer, beaming too hard; it lands on the counter top (his figure comes down onto it)
const PRES = { cx: 540, cy: 820, E: 1.45, top: 1342 };
function PresentShot({ f }: { f: number }) {
  const s = PRES, tt = t(f), t0 = shotAt(f).t0, a = tt - LAND_T;
  const dy = tt < LAND_T ? -70 * (1 - ((tt - t0) / (LAND_T - t0)) ** 2) : 10 * Math.exp(-a / 0.07) * Math.cos(a * 40);
  return <RossCounter f={f} m={cView(1.6, s.top, s.cx)} cx={s.cx} cy={s.cy} E={s.E} body="present" dy={dy} />;
}

// ═════════════════════════════════════════════════════ 11: the latte from above: Chuck's face in the foam, a sparkle. The picture is mirrored above and below it, so that the wood goes on to the frame's edges
function LatteShot({ f }: { f: number }) {
  const L = RG14.props.latte, k = 1.5, w = L.w * k, h = L.h * k, tt = t(f), a = tt - CHIME_T, y0 = 960, fy = 960 + (590 - 512) * k;
  return (
    <>
      <Picture file={L.file} w={w} h={h} x={0} y={PY(y0)} order={0} />
      <Group x={0} y={PY(y0 - h)} sy={-1}><Picture file={L.file} w={w} h={h} x={0} y={0} order={0} /></Group>
      <Group x={0} y={PY(y0 + h)} sy={-1}><Picture file={L.file} w={w} h={h} x={0} y={0} order={0} /></Group>
      {a >= 0 && a < 0.45 && [[-250, -150, 1], [270, -110, 0.8], [-90, 280, 0.65], [200, 250, 0.55], [-290, 120, 0.6]].map(([dx, dy, sc], i) => {
        const g = Math.max(0, Math.sin(Math.PI * clamp01((a - i * 0.04) / 0.3))) * sc * 150;
        return g > 1 ? <Group key={i} x={dx} y={PY(fy + dy)} rot={12 * i} sx={g} sy={g}><Poly pts={[[0, 1], [0.2, 0.2], [1, 0], [0.2, -0.2], [0, -1], [-0.2, -0.2], [-1, 0], [-0.2, 0.2]]} color="#ffffff" order={50} /></Group> : null;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ 12: Chuck with the mug at his chest: the gulp (the head goes back), the foam mustache is there after it
const MUG = { cx: 540, cy: 790, E: 1.65 };
function MugShot({ f }: { f: number }) {
  const s = MUG, g = gulpAt(f);
  return <ChuckWin f={f} kind="mug" cx={s.cx} cy={s.cy} E={s.E} hopK={0} vy={620} s={1.6} />;
}

// ═════════════════════════════════════════════════════ 14: JUST PRESS FIVE!! Ross on one knee in front of the counter, the ring box open: a golden star on its cushion, his hands (the whole of him) shaking on twos
const KNEEL = { cx: 540, cy: 670, E: 1.5 };
function KneelShot({ f }: { f: number }) {
  const s = KNEEL, tt = t(f), ross = rossAt(s.cx, s.cy, s.E), pose = rossPose14(f, "kneel"), box = rossPt(s.cx, s.cy, s.E, 792, 892);
  return (
    <>
      <PlateM m={cam(1.5, 384, 620)} file={COUNTER} edge={EDGE_COUNTER} />
      <RossP f={f} x={ross.x} y={ross.y} E={s.E} order={40} body="kneel" pose={pose} mouthW={rossMouthW(f)} />
      <GoldStar x={box[0] + (pose.dx ?? 0)} y={box[1] - 6} r={44 * s.E} age={tt - CHOIR_T} order={44} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 15: Chuck with his phone in his hand: his eyes go from the star to the phone and back up
const GOOD = { cx: 540, cy: 770, E: 1.8 };
function GoodShot({ f }: { f: number }) {
  const s = GOOD;
  return <ChuckWin f={f} kind="phone" cx={s.cx} cy={s.cy} E={s.E} hopK={hop(f) * 0.4} vy={620} s={1.7} />;
}

// ═════════════════════════════════════════════════════ 16: POP POP: Ross behind the counter, the plugs shoot out like corks, the kettle screams
const COR = { cx: 440, cy: 790, E: 1.2 };
function CorksShot({ f }: { f: number }) {
  const s = COR, tt = t(f), m = cView(1.5, 1330, s.cx), ross = rossAt(s.cx, s.cy, s.E), pose = rossPose14(f, "wide");
  const ears = ROSS_EARS.map(([hx, hy]) => headPt(pose, s.E, ross.x, ross.y, hx, hy)) as [number, number][];
  const earL = toFrame(ears[0]), earR = toFrame(ears[1]), r = 34 * s.E / 1.7;
  return (
    <>
      <RossCounter f={f} m={m} cx={s.cx} cy={s.cy} E={s.E} body="wide" />
      {steamLevel(f) > 0 && <EarPlumes left={earL} right={earR} t={tt} k={s.E / 1.7 * 2.7} order={170} />}
      <Cork at={ears[0]} dir={-1} t={tt} t0={CORK_T[0]} r={r} order={175} />
      <Cork at={ears[1]} dir={1} t={tt} t0={CORK_T[1]} r={r} order={175} up={0.8} />
      <PopBurst at={ears[0]} t={tt} t0={CORK_T[0]} R={70 * s.E / 1.7} order={174} />
      <PopBurst at={ears[1]} t={tt} t0={CORK_T[1]} R={70 * s.E / 1.7} order={174} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 17: the dive. Ross (x08's fly picture mended, turned flat: the superman pose) crosses the frame over the counter, streaks behind him; CRASH: a white flash and a shake. Two canvases: the room, the
// streaks and the flash (shotX), and over them a transparent one that holds the flying Ross alone, 1080 x 900 px (the band the flight crosses), inside @remotion/motion-blur's CameraMotionBlur (10 samples over a 216 degree shutter: the flight smears instead of
// strobing; each sample is the whole canvas at a frame time a little before this one, so everything in it is a function of useCurrentFrame)
const DIVE_E = 0.95, FLY_TOP = 430, FLY_H = 900;
const flight = (tt: number) => { const u = clamp01((tt - (WHOOSH_T - 0.02)) / (CRASH_T - 0.03 - (WHOOSH_T - 0.02))); return { u, x: -520 + 2200 * u ** 1.5, y: 900 - 70 * Math.sin(Math.PI * u) }; };
function DiveFly() {
  const fr = useCurrentFrame(), tt = fr / FPS, f = Math.round(fr), { x, y } = flight(tt), pose = rossPose14(f, "fly");
  return (
    <ThreeCanvas orthographic flat width={W} height={FLY_H} camera={{ position: [0, 0, 100], zoom: 1, near: 0.1, far: 1000 }} gl={{ antialias: false, preserveDrawingBuffer: true }}>
      <group position={[0, -(960 - (FLY_TOP + FLY_H / 2)), 0]}>   {/* (the camera stays on the origin, looking straight; the world moves up to this band of the frame) */}
        {tt < CRASH_T - 0.02 && (
          <Group x={PX(x)} y={PY(y)} rot={-90}>
            <RossP f={f} x={0} y={0} E={DIVE_E} order={40} body="fly" pose={{ ...pose, tilt: pose.tilt + 62 }} mouthW={130} />
          </Group>
        )}
      </group>
    </ThreeCanvas>
  );
}
const DiveRoom = shotX(({ f }) => {
  const tt = t(f), { x, y } = flight(tt), a = tt - CRASH_T, m = cView(1.15, 1250, 540);
  return (
    <>
      <PlateM m={m} file={COUNTER} edge={EDGE_COUNTER} />
      {tt < CRASH_T - 0.02 && <Streaks x={x - 600 * DIVE_E} y={y} reach={1000} spread={520} order={20} seed={3} />}
      <CounterFront m={m} />
      {a >= 0 && <Wash color="#ffffff" op={Math.exp(-a / 0.07)} order={200} />}
      <PopBurst at={[PX(960), PY(900)]} t={tt} t0={CRASH_T} R={330} order={190} />
    </>
  );
}, [540, 960]);
function DiveShot({ f }: { f: number }) {
  return (
    <>
      <DiveRoom f={f} />
      <CameraMotionBlur samples={10} shutterAngle={216}>
        <div style={{ position: "absolute", left: 0, top: FLY_TOP, width: W, height: FLY_H }}><DiveFly /></div>
      </CameraMotionBlur>
    </>
  );
}

// ═════════════════════════════════════════════════════ 18: the phone, Ross's thumb comes up from below the frame and jabs the fifth star: it fills gold and pops, "Review updated"
const HAND18 = { E: 2.0, cx: 468, cy: 1010 };
function JabShot({ f }: { f: number }) {
  const s = HAND18, tt = t(f), t0 = shotAt(f).t0, x = PX(s.cx), y = PY(s.cy);
  const rise = ease((tt - t0) / 0.12) * (1 - ease((tt - (PRESS_T + 0.1)) / 0.14)), down = ease((tt - (PRESS_T - 0.1)) / 0.1) * (1 - ease((tt - (PRESS_T + 0.06)) / 0.08)), sq = tt >= PRESS_T ? Math.max(0, Math.exp(-(tt - PRESS_T) / 0.06) * Math.cos((tt - PRESS_T) * 40)) : 0;
  return (
    <>
      <PlateM m={cam(2.4, 384, 830)} file={COUNTER} edge={EDGE_COUNTER} />
      <Wash color="#fff8ea" op={0.4} order={5} />
      <HandCard x={x} y={y} E={s.E} card={cardAt(f)} order={60} />
      <Thumb x={x} y={y} E={s.E} at={slotAt(4)} down={down} sq={sq} rise={rise} order={70} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 19: on the floor in front of the window: Chuck flat on his back (the starfish picture turned to lie down), dizzy stars circling his head; Ross squatting on his chest, the phone held up over his
// head with the five stars readable on it; the popper, the confetti. The window plate's floor is carried on below the picture in its own colour with plank lines
const FLOOR_VIEW = () => winView(540, 1095, 1.35);
function Floor({ order = 0 }: { order?: number }) {
  return (
    <>
      <PlateM m={FLOOR_VIEW()} file={PL10.window.file} edge={EDGE_WINDOW} order={order} />
      {[1330, 1400, 1490, 1600, 1730, 1880].map((y, i) => <Poly key={i} pts={[[PX(-40), PY(y)], [PX(1120), PY(y)], [PX(1120), PY(y + 6)], [PX(-40), PY(y + 6)]]} color="#8f6732" order={order + 0.1} op={0.7} />)}
    </>
  );
}
const LIE = { x: 480, y: 1170, E: 0.76 }, UP = { cx: 560, cy: 668, E: 0.68 };
/** the big row of five gold stars that burst out of the small phone's screen on the fanfare (about 105 px each): one every two frames, each flies from the middle of the glass to its place above the phone on an arc and pops there on a spring, with its glow, its
 *  sparkles and a star of rays on landing */
const ROW = { y: 250, r: 56, pitch: 114, step: 2 / FPS, fly: 0.2 };
function FloorShot({ f }: { f: number }) {
  const tt = t(f), pose = chuckPose("star", f), rp = rossPose14(f, "up"), ross = rossAt(UP.cx, UP.cy, UP.E), D = CHUCK_DISC("star"), gl = upGlassAt(ross.x + (rp.dx ?? 0), ross.y + rp.breath * UP.E, UP.E), from = toFrame(gl);
  return (
    <>
      <Floor />
      <Group x={PX(LIE.x)} y={PY(LIE.y)} rot={90}>
        <ChuckP kind="star" x={0} y={0} E={LIE.E} order={30} pose={pose} f={f} attach={<DizzyStars t={tt} cx={0} cy={461 - D[1] + D[2] * 1.08} rx={D[2] * 0.95} ry={D[2] * 0.26} size={30} order={30 + 16} />} />
      </Group>
      {confettiOn(f) && <Confetti t={tt} t0={POPPER_T} origin={[560, 130]} order={180} split={50} avoid={[120, 60, 980, 560]} />}
      <Glow x={gl[0]} y={gl[1]} rx={230} ry={260} op={0.9} order={56} color="rgba(255,225,120,1)" />
      <RossP f={f} x={ross.x} y={ross.y} E={UP.E} order={60} body="up" pose={rp} mouthW={rossMouthW(f)} />
      <UpScreen x={ross.x + (rp.dx ?? 0)} y={ross.y + rp.breath * UP.E} E={UP.E} order={105} card={cardAt(f)} />
      {[0, 1, 2, 3, 4].map((i) => {
        const t0 = POPPER_T + i * ROW.step, age = tt - t0, p = clamp01(age / ROW.fly), e = 1 - (1 - p) ** 3, sx = from[0] + (i - 2) * ROW.pitch;
        if (age < 0) return null;
        return (
          <React.Fragment key={i}>
            <GoldStar x={lerp(from[0], sx, e)} y={lerp(from[1], ROW.y, e) - 60 * Math.sin(Math.PI * p)} r={ROW.r} age={age} order={190 + i * 0.1} rock={(i - 2) * 5 * Math.exp(-age / 0.3)} />
            <PopBurst at={[PX(sx), PY(ROW.y)]} t={tt} t0={t0 + ROW.fly} R={ROW.r * 1.1} order={188 + i * 0.1} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ 20: Chuck sits up on the floor, sunglasses cracked, a shoe print on his tee, typing with one thumb
const WRECK = { cx: 540, cy: 720, E: 1.6 };
function WreckShot({ f }: { f: number }) {
  const s = WRECK, tt = t(f);
  return (
    <>
      <Floor />
      <WreckChuck f={f} cx={s.cx} cy={s.cy} E={s.E} />
      {confettiOn(f) && <Confetti t={tt} t0={POPPER_T} origin={[540, 220]} order={180} n={70} />}
    </>
  );
}
function WreckChuck({ f, cx, cy, E }: { f: number; cx: number; cy: number; E: number }) {
  const ch = chuckAt("wreck", cx, cy, E);
  return <ChuckP kind="wreck" x={ch.x} y={ch.y} E={ch.E} order={40} pose={chuckPose("wreck", f)} f={f} />;
}

// ═════════════════════════════════════════════════════ 21: the phone: "Great coffee. Owner tackled me." types itself out word by word with Chuck's voice, the fifth and then the fourth star go out, "Review updated". Only the phone and the fingers that hold
// it are in the frame (the arm is below it)
const HAND21 = { E: 2.4, cx: 451, cy: 1564 };
function ReviewShot({ f }: { f: number }) {
  const s = HAND21;
  return (
    <>
      <PlateM m={cam(2.4, 384, 830)} file={COUNTER} edge={EDGE_COUNTER} />
      <Wash color="#fff8ea" op={0.4} order={5} />
      <HandCard x={PX(s.cx)} y={PY(s.cy)} E={s.E} card={cardAt(f)} order={60} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 22: Ross close with confetti still falling on him: his grin falls apart, the eye twitches. It loops to shot 1
const GRIN = { cx: 540, cy: 800, E: 2.3 };
function GrinShot({ f }: { f: number }) {
  const s = GRIN, tt = t(f), ross = rossAt(s.cx, s.cy, s.E), pose = rossPose14(f, "wideBare");
  return (
    <>
      <Floor />
      <RossP f={f} x={ross.x} y={ross.y} E={s.E} order={40} body="wideBare" pose={pose} mouthW={rossMouthW(f)} />
      {confettiOn(f) && <Confetti t={tt} t0={POPPER_T} origin={[540, 220]} order={180} n={90} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ the 22 shots
const FOCUS: Record<ShotId, [number, number]> = {
  card: [540, 800], snap: [540, 1000], slam: [540, 1200], shout: [540, 900], thumbs: [470, 800], stab: [400, 840], one: [760, 880], shrug: [540, 800], vein: [500, 1000], present: [540, 900], latte: [540, 960], mug: [540, 800], bulge: [560, 1000], kneel: [540, 800],
  good: [540, 800], corks: [440, 800], dive: [540, 900], jab: [540, 900], floor: [540, 900], wreck: [540, 800], review: [540, 1000], grin: [540, 1000],
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
const REAL: Record<ShotId, React.FC<{ f: number }>> = {
  card: V("card", CardShot),
  snap: V("snap", SnapShot),
  slam: V("slam", SlamShot),
  shout: V("shout", ShoutShot),
  thumbs: V("thumbs", ThumbsShot),
  stab: V("stab", ({ f }) => <PointShot f={f} fr={FR6} />),
  one: V("one", ({ f }) => <PointShot f={f} fr={ONE} flip />),
  shrug: V("shrug", ShrugShot),
  vein: V("vein", ({ f }) => <CloseShot f={f} c={CLOSE9} s={1.7} yc={1560} />),
  present: V("present", PresentShot),
  latte: V("latte", LatteShot),
  mug: V("mug", MugShot),
  bulge: V("bulge", ({ f }) => <CloseShot f={f} c={CLOSE13} s={1.75} yc={1580} />),
  kneel: V("kneel", KneelShot),
  good: V("good", GoodShot),
  corks: V("corks", CorksShot),
  dive: DiveShot,
  jab: V("jab", JabShot),
  floor: V("floor", FloorShot),
  wreck: V("wreck", WreckShot),
  review: V("review", ReviewShot),
  grin: V("grin", GrinShot),
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = REAL;
export const ART: Record<ShotId, string> = {
  card: "hand+phone", snap: "wideBare", slam: "hand+phone+cups", shout: "point", thumbs: "thumbs", stab: "point mirrored", one: "point", shrug: "shrug", vein: "wideBare", present: "present", latte: "latte", mug: "mug", bulge: "wideBare", kneel: "kneel", good: "phone",
  corks: "wide", dive: "fly flat", jab: "hand+thumb", floor: "star lying + up", wreck: "wreck", review: "hand+phone", grin: "wideBare",
};
