import React from "react";
import { Picture, Poly } from "./sp-puppet";
import { Group, Squash } from "./pen-stage";
import { Cork, PopBurst } from "./x08-fx";
import { Buzz } from "./x10-draw";
import { useHandFonts } from "./x10-ui";
import { Impact, LensSplat, ShoutLines, Spray, PX, PY } from "./x13-draw";
import { CoinShower, DisplayProp, EarPlumes, PhoneBig, SignMarker } from "./x13-props";
import { chuckPose, hop, lunge, rossMouthW, rossPose13, sipUp } from "./x13-act";
import { shotX } from "./x13-shared";
import { CUP_HAND, ChuckP, CounterFront, PL10, PlateM, ROSS_CUP, ROSS_EARS, RossP, chuckAt, chuckPt, counterView, headPt, rossAt, cam, RG13, type Kind, type RossBody } from "./x13-stage";
import {
  CORK_T, DRAWER_T, FLOP_T, FPS, KACHING_T, SCRIBBLE_T, SNAP2_T, SNAP_T, SPIT2_T, SPIT_T, SPLAT2_T, SPLAT_T, THUD_T, WHOOSH_T, chuckWet, clamp01, displayShown, ease, lerp, purpleAt, shotId,
  steamLevel, type ShotId,
} from "./x13-sched";

// The scenes of x13 "Cheaper": one canvas per shot, hard cuts. Each is the art of the shot (the plates, props and puppets cut from out/x13-cast by scripts/x13-prep.py, src/x13-rig.json; x10's shop plates, its counter's front layer and Ross's wide, till and
// apron bodies; x12's Chuck pictures and the cup-and-mitten sprite) under the effects and writing drawn in code (src/x13-draw.tsx, src/x13-props.tsx). Plates are seen through a view `m` (src/x09-stage.tsx cam); people are placed by the frame point of
// the middle of the eyes (Chuck) or the head (Ross) and a scale. A shot's `m` never moves: the camera's zoom (src/x13-sched.ts holdPush) is the canvas's (src/x13-shared.tsx). Frame px: x right, y down, 1080 x 1920.
// The first half: Chuck (the customer) stands against the shop's window (bg-window), Ross is behind the counter (bg-counter, the counter's front layer over his lower body). After the sign they swap: Ross against the window with his cup, Chuck behind
// the counter in the apron. The people stand in the left two thirds of the frame, so that the display (the running prop) has the right third.
const t = (f: number) => f / FPS;
const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
const EDGE_FRONT = { top: "#a0d4e8", bottom: "#454542", side: "#b96640", sideLow: "#7b7875", split: 1088 };
const toFrame = (p: [number, number]): [number, number] => [p[0] + 540, 960 - p[1]];   // a panel point as a frame point
const PANEL = (color: string, order: number) => <Poly pts={[[-2400, 2400], [2400, 2400], [2400, -2400], [-2400, -2400]]} color={color} order={order} />;

// ── the display: where it sits in each shot (frame px of the middle of the picture, its width). It is drawn over the people (the finger that stabs at it goes behind it), with a star of rays behind it on every KA-CHING. A third of the frame wide, in the free third of the frame
type DP = { x: number; y: number; w: number; order?: number };
const DISP_DEF: DP = { x: 885, y: 905, w: 360 };
const TOPR: DP = { x: 880, y: 330, w: 330 };   // above a huge face
const DISP: Partial<Record<ShotId, DP>> = {
  sip: TOPR, spit: TOPR, cup: TOPR, spit2: TOPR, snap: { x: 880, y: 975, w: 330 }, punch: { x: 880, y: 1275, w: 330 }, cousin: { x: 900, y: 905, w: 330 }, phone: { x: 900, y: 905, w: 330 },
  sipSlow: { x: 210, y: 330, w: 330 }, that: { x: 195, y: 1092, w: 330 }, free: { x: 905, y: 1120, w: 330 }, bill: { x: 905, y: 520, w: 320 },
};
function Disp({ f }: { f: number }) {
  if (!displayShown(f)) return null;
  const p = DISP[shotId(f)] ?? DISP_DEF;
  return (
    <>
      <DisplayProp f={f} x={p.x} y={p.y} w={p.w} order={p.order ?? 150} />
      {KACHING_T.map((k, i) => <PopBurst key={i} at={[PX(p.x), PY(p.y - 0.05 * p.w)]} t={t(f)} t0={k} R={p.w * 0.4} order={(p.order ?? 150) - 1} />)}
    </>
  );
}

// ═════════════════════════════════════════════════════ Chuck against the window: the plate, the figure placed by his eyes
const clampU = (u: number, s: number) => Math.min(768 - 540 / s, Math.max(540 / s, u));   // the view's middle column: the plate always fills the frame's width, no edge shows
const winView = (cx: number, vy = 560, s = 1.5) => cam(s, clampU(234 + (540 - cx) / s, s), vy);   // the window of the plate (plate column 234) is behind a head at frame x `cx`, as far as the plate's width allows
function ChuckWin({ f, kind, cx, cy, E, flip = false, purple = 0, wet = 0, vy = 560, s = 1.5, attach, lungeK = 0, hopK = 0, order = 40 }: { f: number; kind: Kind; cx: number; cy: number; E: number; flip?: boolean; purple?: number; wet?: number; vy?: number; s?: number; attach?: React.ReactNode; lungeK?: number; hopK?: number; order?: number }) {
  const ch = chuckAt(kind, cx, cy, E);
  return (
    <>
      <PlateM m={winView(cx, vy, s)} file={PL10.window.file} edge={EDGE_WINDOW} />
      <ChuckP kind={kind} flip={flip} x={ch.x + lungeK} y={ch.y - hopK} E={ch.E} order={order} pose={chuckPose(kind, f)} purple={purple} wet={wet} f={f} attach={attach} />
    </>
  );
}

/** the cup-and-mitten sprite (x12's) held up at the lips of a Chuck: `lips` the frame point of his lips, `E` the scale of his picture; it turns by `tilt` degrees about its middle, `up` 0..1 how far up from under the frame's bottom edge it is. The picture's cuff
 *  is past the bottom edge of the frame when the face is low and big (E 2.9: the lips on row 1480), so no forearm is in the picture */
function CupAtLips({ lips, E, up = 1, tilt = 0, order, drop = 0 }: { lips: [number, number]; E: number; up?: number; tilt?: number; order: number; drop?: number }) {
  const c = CUP_HAND, k = E, w = c.w * k, h = c.h * k;
  const cx = lips[0] + 8, cy = lips[1] + h / 2 - 8 * k + (1 - up) * 900 + drop;
  return (
    <Group x={PX(cx)} y={PY(cy)} rot={tilt}>
      <Picture file={c.file} w={w} h={h} x={0} y={0} order={order} alpha />
    </Group>
  );
}

// ═════════════════════════════════════════════════════ shot 1: the sip. Chuck's face huge and low against the window, the latte at his lips (its cuff is past the bottom edge); the display pops up above him and his eyes swivel up to it
const SIP = { cx: 480, cy: 1138, E: 2.9 };
function SipShot({ f }: { f: number }) {
  const s = SIP, lips = chuckPt("hold", s.cx, s.cy, s.E, 510, 384);
  return (
    <>
      <ChuckWin f={f} kind="hold" cx={s.cx} cy={s.cy} E={s.E} vy={600} s={1.7} />
      <CupAtLips lips={lips} E={s.E} tilt={-8} order={90} />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 2: PFFFT. The same face, closer: the cup drops away, a spray out of his mouth at the lens, drops stuck on the glass
const SPIT = { cx: 470, cy: 1130, E: 3.3 };
function SpitShot({ f }: { f: number }) {
  const s = SPIT, tt = t(f), age = tt - SPIT_T, lips = chuckPt("hold", s.cx, s.cy, s.E, 510, 384), mouth: [number, number] = [lips[0], lips[1] + 14];
  return (
    <>
      <ChuckWin f={f} kind="hold" cx={s.cx} cy={s.cy} E={s.E} vy={600} s={1.7} hopK={age >= 0 ? 14 * Math.exp(-age / 0.1) : 0} />
      <CupAtLips lips={lips} E={s.E} tilt={-8 - 40 * Math.min(1, age / 0.15)} order={90} drop={age > 0 ? 2800 * age * age : 0} />
      <Disp f={f} />
      <Spray at={mouth} age={age} order={160} />
      <LensSplat age={age} order={170} />
    </>
  );
}

// ═════════════════════════════════════════════════════ Ross behind the counter: the counter's front layer is over him
function RossCounter({ f, m, cx, cy, E, body, mouthW, order = 40, attach }: { f: number; m: ReturnType<typeof cam>; cx: number; cy: number; E: number; body: RossBody; mouthW?: number; order?: number; attach?: React.ReactNode }) {
  const ross = rossAt(cx, cy, E), pose = rossPose13(f, body);
  return (
    <>
      <PlateM m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={order} body={body} pose={pose} mouthW={mouthW ?? rossMouthW(f)} attach={attach} />
      <CounterFront m={m} />
    </>
  );
}
const cView = (s: number, yc: number, cx: number) => counterView(s, yc, clampU(384 + (540 - cx) / s, s));   // the counter plate with its column 384 (where Ross stands) at frame x `cx`, as far as the plate's width allows

// ═════════════════════════════════════════════════════ shot 3: the spray hit Ross: coffee on his face and dripping off his chin, the service smile frozen
const SPLAT = { cx: 380, cy: 700, E: 1.5 };
function SplatShot({ f }: { f: number }) {
  const s = SPLAT, m = cView(1.6, 1330, s.cx), age = t(f) - SPLAT_T;
  return (
    <>
      <RossCounter f={f} m={m} cx={s.cx} cy={s.cy} E={s.E} body="apron" />
      <Impact cx={s.cx} cy={s.cy} r={s.E * 190} age={age} order={170} color="#e0a868" />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shots 4 and 5: Chuck's face snaps purple (the figure mirrored: his finger stabs to the right, at the display); 5 is the punch-in on BUCKS?! and a second step on COFFEE
function SnapFace({ f, cx, cy, E, view }: { f: number; cx: number; cy: number; E: number; view?: { s: number; vy: number } }) {
  const tt = t(f), id = shotId(f), calm = id === "snap" && tt < SNAP_T, kind: Kind = calm ? "hold" : "point", a = tt - SNAP_T, pop = id === "snap" && a >= 0 ? 0.11 * Math.exp(-a / 0.05) : 0;
  const ch = chuckAt(kind, cx, cy, E), v = view ?? { s: 1.5, vy: 560 };
  return (
    <>
      <PlateM m={winView(cx, v.vy, v.s)} file={PL10.window.file} edge={EDGE_WINDOW} />
      <Squash x={cx - 540} y={960 - cy} sx={1 + pop} sy={1 + pop * 0.7}>
        <ChuckP kind={kind} flip x={ch.x + lunge(f)} y={ch.y} E={ch.E} order={40} pose={chuckPose(kind, f)} purple={calm ? 0 : purpleAt(f)} f={f} />
      </Squash>
      {id === "snap" && <Impact cx={cx} cy={cy} r={E * 175} age={a} order={170} />}
      {!calm && <ShoutLines cx={cx} cy={cy + E * 70} r0={E * 215} r1={E * 330} f={f} order={30} />}
      <Disp f={f} />
    </>
  );
}
const SNAPF = { cx: 340, cy: 700, E: 1.25 }, PUNCH = { cx: 340, cy: 900, E: 1.85 };

// ═════════════════════════════════════════════════════ shot 6: the display, big: KA-CHING, $5.00 flips to $4.00 (the counter behind it)
function DisplayInsert({ f, y = 900, w = 880 }: { f: number; y?: number; w?: number }) {
  const m = cam(1.5, 384, 760);
  return (
    <>
      <PlateM m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <DisplayProp f={f} x={540} y={y} w={w} order={60} bounce />
      {KACHING_T.map((k, i) => <PopBurst key={i} at={[0, PY(y)]} t={t(f)} t0={k} R={w * 0.42} order={55} />)}
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 7: Ross dripping and smiling through "...Four?": his right eye twitches. A wider shot, the counter lower
const FOUR = { cx: 380, cy: 760, E: 1.1 };
function FourShot({ f }: { f: number }) {
  const s = FOUR, m = cView(1.45, 1270, s.cx);
  return (
    <>
      <RossCounter f={f} m={m} cx={s.cx} cy={s.cy} E={s.E} body="apron" />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 8: Chuck, pouting, shows his cup: "My cousin sells it for two."
const COUSIN = { cx: 470, cy: 760, E: 1.5 };
function CousinShot({ f }: { f: number }) {
  const s = COUSIN;
  return (
    <>
      <ChuckWin f={f} kind="cup" cx={s.cx} cy={s.cy} E={s.E} hopK={hop(f) * 0.4} vy={600} s={1.6} />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 9: Ross, close: the vein throbs, the smile stretches wider
const VEIN = { cx: 380, cy: 740, E: 1.9 };
function VeinShot({ f }: { f: number }) {
  const s = VEIN, m = cView(1.7, 1520, s.cx);
  return (
    <>
      <RossCounter f={f} m={m} cx={s.cx} cy={s.cy} E={s.E} body="apron" />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shots 10 and 11: Chuck holds up his phone, proud; then the phone's screen, big
const PHONE = { cx: 480, cy: 760, E: 1.5 };
function PhoneShot({ f }: { f: number }) {
  const s = PHONE;
  return (
    <>
      <ChuckWin f={f} kind="phone" cx={s.cx} cy={s.cy} E={s.E} hopK={hop(f) * 0.4} vy={600} s={1.55} />
      <Disp f={f} />
    </>
  );
}
function ProfileShot({ f }: { f: number }) {
  void f;
  return (
    <>
      {PANEL("#e8c98e", -3)}
      <PhoneBig x={540} y={650} w={650} rot={-3} order={30} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 12: FREE!! Ross flings his arms wide, the eyes bulge, a huge clenched grin
const FREE = { cx: 400, cy: 720, E: 1.1 };
function FreeShot({ f }: { f: number }) {
  const s = FREE, m = cView(1.45, 1250, s.cx);
  return (
    <>
      <RossCounter f={f} m={m} cx={s.cx} cy={s.cy} E={s.E} body="wideA" />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 13: Chuck's slow sip, then flat: "What else do I get?" The figure is mirrored (his face on the right of the frame), the display above him on the left
const SIPSLOW = { cx: 600, cy: 1138, E: 2.9 };
function SipSlowShot({ f }: { f: number }) {
  const s = SIPSLOW, { up, tilt } = sipUp(f), lips = chuckPt("hold", s.cx, s.cy, s.E, 510, 384);
  return (
    <>
      <ChuckWin f={f} kind="hold" cx={s.cx} cy={s.cy} E={s.E} flip vy={620} s={1.7} />
      {up > 0.001 && <CupAtLips lips={lips} E={s.E} up={up} tilt={tilt} order={90} />}
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 14: Ross holds out the five, the bill shaking, both eyes twitching
const BILL = { cx: 330, cy: 720, E: 1.1 };
function BillShot({ f }: { f: number }) {
  const s = BILL, m = cView(1.45, 1250, s.cx);
  return (
    <>
      <RossCounter f={f} m={m} cx={s.cx} cy={s.cy} E={s.E} body="tillA" />
      <Buzz x={PX(s.cx + 364 * s.E)} y={PY(s.cy + 234 * s.E)} s={1.0} f={f} order={120} />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 15: Chuck looks at the bill and back up: "...That's it?"
const THAT = { cx: 700, cy: 780, E: 1.5 };
function ThatShot({ f }: { f: number }) {
  const s = THAT;
  return (
    <>
      <ChuckWin f={f} kind="point" cx={s.cx} cy={s.cy} E={s.E} hopK={hop(f) * 0.4} vy={600} s={1.55} />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 16: POP POP: the plugs shoot out, the kettle screams, the drawer is yanked out of the till, coins fly
const COR = { cx: 440, cy: 700, E: 1.05 };
function CorksShot({ f }: { f: number }) {
  const s = COR, tt = t(f), m = cView(1.35, 1240, s.cx), yanked = tt >= DRAWER_T, body: RossBody = yanked ? "drawerA" : "tillA", ross = rossAt(s.cx, s.cy, s.E), pose = rossPose13(f, body);
  const ears = ROSS_EARS.map(([hx, hy]) => headPt(pose, s.E, ross.x, ross.y, hx, hy)) as [number, number][];
  const earL = toFrame(ears[0]), earR = toFrame(ears[1]), r = 34 * s.E / 1.7;
  const trayAt: [number, number] = [s.cx - 84 * s.E, s.cy + 339 * s.E];
  return (
    <>
      <RossCounter f={f} m={m} cx={s.cx} cy={s.cy} E={s.E} body={body} />
      {steamLevel(f) > 0 && <EarPlumes left={earL} right={earR} t={tt} k={s.E / 1.7 * 2.1} order={170} />}
      <Cork at={ears[0]} dir={-1} t={tt} t0={CORK_T[0]} r={r} order={175} />
      <Cork at={ears[1]} dir={1} t={tt} t0={CORK_T[1]} r={r} order={175} up={0.8} />
      <PopBurst at={ears[0]} t={tt} t0={CORK_T[0]} R={70 * s.E / 1.7} order={174} />
      <PopBurst at={ears[1]} t={tt} t0={CORK_T[1]} R={70 * s.E / 1.7} order={174} />
      {yanked && <PopBurst at={[PX(trayAt[0]), PY(trayAt[1])]} t={tt} t0={DRAWER_T} R={150} order={174} />}
      <CoinShower from={[trayAt[0], trayAt[1] - 20]} t={tt} t0={DRAWER_T} floorY={1285} order={120} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 17: the drawer is shoved into Chuck's arms; Ross's apron flies in and flops onto it: "TAKE IT ALL!!"
const DRAWER = { cx: 420, cy: 640, E: 1.2 };
function DrawerShot({ f }: { f: number }) {
  const s = DRAWER, tt = t(f), a = clamp01((tt - WHOOSH_T) / (FLOP_T - WHOOSH_T)), land = ease(a), ap = RG13.props.apron, k = 0.4 * (s.E / 1.2);
  const dy = tt >= THUD_T ? 18 * Math.exp(-(tt - THUD_T) / 0.08) * Math.cos((tt - THUD_T) * 40) : 0, tray: [number, number] = [s.cx - 15 * s.E + 4, s.cy + 330 * s.E];
  const from: [number, number] = [1320, 330], x = lerp(from[0], tray[0], land), y = lerp(from[1], tray[1], land) - 240 * Math.sin(a * Math.PI), rot = lerp(75, -6, land), flat = ease((tt - (FLOP_T - 0.05)) / 0.1);
  const sc = lerp(1.5, 1, land) * k, sq = (1 - 0.5 * flat) * (tt >= FLOP_T ? 1 + 0.1 * Math.exp(-(tt - FLOP_T) / 0.07) * Math.cos((tt - FLOP_T) * 34) : 1);
  return (
    <>
      <ChuckWin f={f} kind="drawer" cx={s.cx} cy={s.cy + dy} E={s.E} vy={620} s={1.5} hopK={0} />
      {tt >= WHOOSH_T && (
        <Group x={PX(x)} y={PY(y + (tt >= FLOP_T ? 0 : 0))} rot={rot} sx={sc} sy={sc * sq}>
          <Picture file={ap.file} w={ap.w} h={ap.h} x={0} y={0} order={100} alpha />
        </Group>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 18: the sign: ROSS'S COFFEE, struck out in marker, CHUCK'S scrawled above it
const FRONT = cam(1.4286, 384, 672);
function SignShot({ f }: { f: number }) {
  const ok = useHandFonts(), tt = t(f), m = FRONT, a = tt - SCRIBBLE_T;
  return (
    <>
      <PlateM m={m} file={PL10.front.file} edge={EDGE_FRONT} />
      <SignMarker m={m} strike={clamp01(a / 0.25)} scrawl={clamp01((a - 0.24) / 0.24)} order={20} ready={ok} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shots 19 and 20: the next day. Ross is the customer at the window, plugless, his face huge and low like Chuck's in shot 1, his cup at his lips: the display pops $12.00, then his own spit-take and his purple face
const RCUP = { cx: 440, cy: 1130, E: 2.2 }, RSPIT = { cx: 440, cy: 1180, E: 2.6 };
function RossWin({ f, cx, cy, E, view, children }: { f: number; cx: number; cy: number; E: number; view: ReturnType<typeof cam>; children?: React.ReactNode }) {
  const ross = rossAt(cx, cy, E), pose = rossPose13(f, "wideBare");
  return (
    <>
      <PlateM m={view} file={PL10.window.file} edge={EDGE_WINDOW} />
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={40} body="wideBare" pose={pose} mouthW={rossMouthW(f)} />
      {children}
    </>
  );
}
/** x10's cup in Ross's tattooed hand, up at his lips: the picture's cup is at its top right (the lid's middle at (0.68 w, 0.10 h)), the sleeve leaves it at its bottom left, which the frame's edge hides; `k` the picture's scale */
const MOUTH_R = { x: -8.6, y: 117.7 };   // Ross's mouth from the middle of his head (rig px)
function RossCupSprite({ cx, cy, E, k = 1.1, drop = 0, tilt = 0, order = 90 }: { cx: number; cy: number; E: number; k?: number; drop?: number; tilt?: number; order?: number }) {
  const c = ROSS_CUP, w = c.w * k, h = c.h * k, mouth: [number, number] = [cx + MOUTH_R.x * E, cy + MOUTH_R.y * E];
  return (
    <Group x={PX(mouth[0] - 0.18 * w)} y={PY(mouth[1] + 0.4 * h + drop)} rot={tilt}>
      <Picture file={c.file} w={w} h={h} x={0} y={0} order={order} alpha />
    </Group>
  );
}
function CupShot({ f }: { f: number }) {
  const s = RCUP;
  return (
    <>
      <RossWin f={f} cx={s.cx} cy={s.cy} E={s.E} view={winView(s.cx, 600, 1.7)}>
        <RossCupSprite cx={s.cx} cy={s.cy} E={s.E} tilt={-4} />
      </RossWin>
      <Disp f={f} />
    </>
  );
}
function Spit2Shot({ f }: { f: number }) {
  const s = RSPIT, tt = t(f), age = tt - SPIT2_T, mouth: [number, number] = [s.cx + MOUTH_R.x * s.E, s.cy + MOUTH_R.y * s.E];
  return (
    <>
      <RossWin f={f} cx={s.cx} cy={s.cy} E={s.E} view={winView(s.cx, 620, 1.7)}>
        <RossCupSprite cx={s.cx} cy={s.cy} E={s.E} tilt={-4 - 40 * Math.min(1, age / 0.15)} drop={age > 0 ? 2800 * age * age : 0} />
        {tt >= SNAP2_T && <Impact cx={s.cx} cy={s.cy} r={s.E * 190} age={tt - SNAP2_T} order={170} />}
        {tt >= SNAP2_T && <ShoutLines cx={s.cx} cy={s.cy + s.E * 70} r0={s.E * 230} r1={s.E * 350} f={f} order={30} />}
      </RossWin>
      <Disp f={f} />
      <Spray at={mouth} age={age} order={160} />
      <LensSplat age={age} order={170} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 21: Chuck behind the counter in Ross's apron, coffee dripping off his face, not blinking: the display flips to $13.00. "...Thirteen."
const THIRT = { cx: 400, cy: 700, E: 1.5 };
function ThirteenShot({ f }: { f: number }) {
  const s = THIRT, m = cView(1.6, 1330, s.cx), tt = t(f), ch = chuckAt("apron", s.cx, s.cy, s.E), age = tt - SPLAT2_T;
  return (
    <>
      <PlateM m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <ChuckP kind="apron" x={ch.x} y={ch.y} E={ch.E} order={40} pose={chuckPose("apron", f)} wet={chuckWet(f)} f={f} />
      <CounterFront m={m} />
      <Impact cx={s.cx} cy={s.cy} r={s.E * 175} age={age} order={170} color="#e0a868" />
      <Disp f={f} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 22: the display, $13.00, a push-in; the reel loops to the sip
function EndShot({ f }: { f: number }) {
  return <DisplayInsert f={f} />;
}

// ═════════════════════════════════════════════════════ the 22 shots
const FOCUS: Record<ShotId, [number, number]> = {
  sip: [480, 1000], spit: [470, 1000], splat: [400, 800], snap: [400, 800], punch: [880, 1200], flip: [540, 960], four: [400, 800], cousin: [400, 800], vein: [400, 800], phone: [400, 800], profile: [540, 700], free: [400, 800], sipSlow: [600, 1000], bill: [330, 800],
  that: [700, 800], corks: [440, 760], drawer: [420, 800], sign: [540, 960], cup: [440, 1000], spit2: [440, 1000], thirteen: [400, 800], end: [540, 960],
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
const REAL: Record<ShotId, React.FC<{ f: number }>> = {
  sip: V("sip", SipShot),
  spit: V("spit", SpitShot),
  splat: V("splat", SplatShot),
  snap: V("snap", ({ f }) => <SnapFace f={f} {...SNAPF} />),
  punch: V("punch", ({ f }) => <SnapFace f={f} {...PUNCH} view={{ s: 1.6, vy: 650 }} />),
  flip: V("flip", ({ f }) => <DisplayInsert f={f} />),
  four: V("four", FourShot),
  cousin: V("cousin", CousinShot),
  vein: V("vein", VeinShot),
  phone: V("phone", PhoneShot),
  profile: V("profile", ProfileShot),
  free: V("free", FreeShot),
  sipSlow: V("sipSlow", SipSlowShot),
  bill: V("bill", BillShot),
  that: V("that", ThatShot),
  corks: V("corks", CorksShot),
  drawer: V("drawer", DrawerShot),
  sign: V("sign", SignShot),
  cup: V("cup", CupShot),
  spit2: V("spit2", Spit2Shot),
  thirteen: V("thirteen", ThirteenShot),
  end: V("end", EndShot),
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = REAL;
export const ART: Record<ShotId, string> = {
  sip: "hold+cup", spit: "hold", splat: "apron", snap: "hold>point mirrored", punch: "point mirrored", flip: "display", four: "apron", cousin: "cup", vein: "apron", phone: "phone", profile: "phone screen", free: "wide+apron", sipSlow: "hold+cup", bill: "till+apron", that: "point",
  corks: "till+apron>drawer+apron", drawer: "chuck drawer+apron", sign: "sign", cup: "armless wide+cup", spit2: "armless wide", thirteen: "chuck apron", end: "display",
};
