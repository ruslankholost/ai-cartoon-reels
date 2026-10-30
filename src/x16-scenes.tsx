import React from "react";
import { Glow, Picture, Poly, ribbon } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Cup } from "./lips8-fx";
import { Cork, PopBurst } from "./x08-fx";
import { Impact, ShoutLines, Wash, PX, PY } from "./x13-draw";
import { Cobweb, EarPlumes, Flag, FLAG_KINDS, Hearts, RingLight, ScreenBurst, StormFlags, TableTop, Tumbler, flagSlide, type FlagKindId } from "./x16-draw";
import { LiveUi, PhoneBack, PhoneMom, PHONE_BOX, SignLetters, type MomArt } from "./x16-props";
import { kenziePose, momScreen, rossMouthW, rossPose16 } from "./x16-act";
import { shotX } from "./x16-shared";
import { HAIR_TOP, KENZIE_DISC, KenzieP, PlateM, RG16, ROSS_DISC, ROSS_EARS, RossP, cam, headPt, kenzieAt, kenziePt, rossAt, type KenzieKind, type RossBody } from "./x16-stage";
import { PL10 } from "./x13-stage";
import {
  CLICK2_T, CORK_T, DRAW_T, FPS, HEARTS, SNAP_T, THROB_T, THUNK_T, clamp01, ease, flagAge, flagIn, flashAt, glareAt, kenzieKind, lerp, steamLevel,
  type ShotId,
} from "./x16-sched";

// The scenes of x16 "Hiring a Zoomer": one canvas per shot, hard cuts. Each is the art of the shot (the pictures cut from out/x16-cast by scripts/x16-prep.py, src/x16-rig.json; x10's window plate behind Kenzie, the plate with the line behind Ross) under
// the effects and writing drawn in code (src/x16-draw.tsx, src/x16-props.tsx). Plates are seen through a view `m` (src/x09-stage.tsx cam); people are placed by the frame point of the middle of the head (Ross) or the eyes (Kenzie) and a scale. A shot's
// `m` never moves: the camera's zoom (src/x16-sched.ts holdPush) is the canvas's (src/x16-shared.tsx). Frame px: x right, y down, 1080 x 1920.
// Ross sits behind his round café table (it is in his picture) in front of the counter and the line; Kenzie is lit from behind by her ring light against x10's window plate; Mom is a picture on the glass of the phone.
const t = (f: number) => f / FPS;
const EDGE_LINE = { top: "#efcf96", bottom: "#97642d" };
const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
const clampU = (u: number, s: number) => Math.min(768 - 540 / s, Math.max(540 / s, u));   // the view's middle column: the plate always fills the frame's width, no edge shows
const lineView = (s: number, u: number, v: number) => cam(s, clampU(u, s), v);                  // the plate with the line: plate point (u, v) in the middle of the frame
const winView = (cx: number, vy = 600, s = 1.6) => cam(s, clampU(234 + (540 - cx) / s, s), vy);   // the window of the plate (plate column 234) is behind a head at frame x `cx`
const toFrame = (p: [number, number]): [number, number] => [p[0] + 540, 960 - p[1]];            // a panel point as a frame point
const LINE = RG16.props.bg_line, DUCK = RG16.props.bg_line_duck, HAND_R = RG16.props.hand_ross, HAND_K = RG16.props.hand_kenzie;
const MOM: MomArt = { files: [RG16.props.mom_live.file, RG16.props.mom_glasses.file], dims: [RG16.props.mom_live, RG16.props.mom_glasses].map((m) => ({ w: m.w, h: m.h, mouth: m.mouth, skin: m.skin })) };
const WALL = "#efd29c";   // the wall of the inserts on Ross's side: the plate's beige, flat

function LineBg({ m, duck = false }: { m: ReturnType<typeof cam>; duck?: boolean }) {
  return <PlateM m={m} file={(duck ? DUCK : LINE).file} edge={EDGE_LINE} />;
}
function WindowBg({ cx, vy = 600, s = 1.6 }: { cx: number; vy?: number; s?: number }) {
  return <PlateM m={winView(cx, vy, s)} file={PL10.window.file} edge={EDGE_WINDOW} />;
}
/** the ring light's glare on Ross: a bloom round his face and, on the click, a white flash over everything */
function Glare({ f, at = [540, 900] }: { f: number; at?: [number, number] }) {
  const g = glareAt(f), flash = Math.max(0, (g - 0.45) / 0.55);
  return g > 0.004 ? <><Glow x={PX(at[0])} y={PY(at[1])} rx={780} ry={780} op={Math.min(1, 0.55 * g + 0.35 * flash)} order={148} color="rgba(255,251,230,1)" /><Wash color="#ffffff" op={0.1 * g + 0.5 * flash} order={149} /></> : null;
}

// ═════════════════════════════════════════════════════ Ross: the flags in his hair and the pole on his head are drawn in his head's own space (head px from the neck pivot, y up), so that they tilt and dip with it
const HAIR_FLAG = { x: -55, y: 392, rot: -16, k: 1.0 }, POLE = { x: HAIR_TOP[0] + 12, y: HAIR_TOP[1] - 26 };
function RossFlags({ f }: { f: number }) {
  const tt = t(f), ha = flagAge("hair", f), pa = flagAge("pole", f);
  return (
    <>
      {ha > -0.1 && flagIn("hair", f + 3) && <Flag x={HAIR_FLAG.x} y={HAIR_FLAG.y} k={HAIR_FLAG.k} rot={HAIR_FLAG.rot} age={ha} t={tt} kind="pencil" dir={1} order={66} seed={2} />}
      {pa >= 0 && <Flag x={POLE.x} y={POLE.y} k={1} rot={0} age={pa} t={tt} kind="pole" dir={1} order={64} seed={5} />}
    </>
  );
}
/** Ross in a close shot: his head placed at frame (cx, cy) at scale E (the picture of the body in front of the plate `bg`) */
function RossShot({ f, cx, cy, E, body = "table", bg, over, flags = true }: { f: number; cx: number; cy: number; E: number; body?: RossBody; bg: React.ReactNode; over?: React.ReactNode; flags?: boolean }) {
  const ross = rossAt(cx, cy, E), pose = rossPose16(f, body);
  return (
    <>
      {bg}
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={40} body={body} pose={pose} mouthW={rossMouthW(f)} attach={flags ? <RossFlags f={f} /> : undefined} />
      {over}
    </>
  );
}
/** the two ear holes of Ross for a shot (panel px: where the corks leave from; frame px: where the steam does) */
function earsOf(f: number, cx: number, cy: number, E: number, body: RossBody): { panel: [number, number][]; frame: [number, number][] } {
  const ross = rossAt(cx, cy, E), pose = rossPose16(f, body);
  const panel = ROSS_EARS.map(([hx, hy]) => headPt(pose, E, ross.x, ross.y, hx, hy)) as [number, number][];
  return { panel, frame: panel.map(toFrame) };
}

// ═════════════════════════════════════════════════════ Kenzie in the ring: the ring light is a halo behind her head, the back of her phone sits at the bottom, in front of her chest, its camera on Ross
type KShot = { cx?: number; cy?: number; E?: number; ringR?: number; level?: number; phone?: "back" | "none" | "mom"; spin?: number; glow?: number; base?: number };
function KenzieShot({ f, cx = 540, cy = 1000, E = 2.2, ringR = 470, level = 0.92, phone = "back", spin = 0, glow = 1, base = 1990, over }: KShot & { f: number; over?: React.ReactNode }) {
  const kind: KenzieKind = kenzieKind(f), k = kenzieAt(kind, cx, cy, E), pose = kenziePose(kind, f), D = KENZIE_DISC(kind), head = kenziePt(kind, cx, cy, E, D[0], D[1]);
  const ringY = head[1], pk = 0.9;   // the phone: its top edge at about y 1390 (`base` 1990), the rest is under the frame's bottom
  return (
    <>
      <WindowBg cx={cx} />
      <Glow x={0} y={PY(ringY)} rx={ringR * 2.6} ry={ringR * 2.6} op={0.5 * glow * level} order={2} color="rgba(255,240,205,1)" />
      <RingLight x={PX(cx)} y={PY(ringY)} r={ringR} w={ringR * 0.16} level={level} order={20} inner={0} glow={0.45 * glow} />
      <KenzieP kind={kind} x={k.x} y={k.y} E={k.E} order={40} pose={pose} />
      {phone === "back" && <PhoneBack x={PX(cx)} y={PY(base)} k={pk} order={80} />}
      {phone === "mom" && (spin < 0.5
        ? <PhoneBack x={PX(cx)} y={PY(base)} k={pk} order={80} sx={Math.cos(spin * Math.PI)} />
        : <PhoneMom x={PX(cx)} y={PY(base)} k={pk} s={momScreen(f)} art={MOM} order={80} sx={-Math.cos(spin * Math.PI)} />)}
      <Glow x={PX(cx)} y={PY(ringY)} rx={ringR * 0.95} ry={ringR * 0.95} op={0.12 * level * glow} order={70} color="rgba(255,250,232,1)" />
      {over}
    </>
  );
}

// ═════════════════════════════════════════════════════ 1: Ross at the table, the résumé up, his best boss smile; CLICK: the ring light blazes in his face (the white bloom, he squints). The label is the DOM's
const T1 = { cx: 540, cy: 1010, E: 1.75 };
const TableShot = ({ f }: { f: number }) => <RossShot f={f} cx={T1.cx} cy={T1.cy} E={T1.E} bg={<LineBg m={lineView(1.9, 384, 700)} />} over={<Glare f={f} at={[T1.cx, T1.cy - 80]} />} />;

// ═════════════════════════════════════════════════════ 2, 6, 8: Kenzie in her ring, bored (2: "Hi chat."; 6: deadpan; 8: one eyebrow up)
const KS: Record<"ring" | "flag" | "unpaid", KShot> = { ring: { cy: 990, E: 2.2 }, flag: { cy: 970, E: 2.45, ringR: 520 }, unpaid: { cy: 990, E: 2.3, ringR: 500 } };
const RingShot = ({ f }: { f: number }) => <KenzieShot f={f} {...KS.ring} />;
const FlagShot = ({ f }: { f: number }) => <KenzieShot f={f} {...KS.flag} />;
const UnpaidShot = ({ f }: { f: number }) => <KenzieShot f={f} {...KS.unpaid} />;

// ═════════════════════════════════════════════════════ 3: her phone's screen from her side: Ross squinting on it (her camera's picture of him, whited out by her own light), the LIVE badge and the count, the hearts floating up
function LiveShot({ f }: { f: number }) {
  return (
    <>
      <RossShot f={f} cx={540} cy={820} E={1.5} bg={<LineBg m={lineView(1.9, 384, 700)} />} over={<Glare f={f} at={[540, 740]} />} flags={false} />
      <Hearts t={t(f)} items={HEARTS} bottom={1390} order={190} />
      <LiveUi order={200} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 4: Ross smiling into the light, lit white (a step in on "family")
const FAMILY = { cx: 540, cy: 860, E: 2.0 };
const FamilyShot = ({ f }: { f: number }) => <RossShot f={f} cx={FAMILY.cx} cy={FAMILY.cy} E={FAMILY.E} bg={<LineBg m={lineView(1.9, 384, 700)} />} over={<Glare f={f} at={[FAMILY.cx, FAMILY.cy - 60]} />} />;

// ═════════════════════════════════════════════════════ the hand with the flag (5, 12, 18): the painted hand and sleeve turned upside down (the arm comes from above), its nails pinch the top of the stick; the stick and the flag are code. It comes in
// with the flag along its axis, plants it on `age` 0 and goes away upwards; `lean` turns it a little off the vertical
type HandImg = { file: string; w: number; h: number; ox: number; oy: number; stick: { x: number; top: number; pinch: number; w: number } };
function HandAt({ img, at, k, rot = 180, order }: { img: HandImg; at: [number, number]; k: number; rot?: number; order: number }) {
  const cx = img.ox + img.w / 2, cy = img.oy + img.h / 2;
  return (
    <Group x={PX(at[0])} y={PY(at[1])} rot={rot} sx={k} sy={k}>
      <Picture file={img.file} w={img.w} h={img.h} x={cx - img.stick.x} y={img.stick.pinch - cy} order={order} alpha />
    </Group>
  );
}
/** a flag planted by a hand: the flag stands at `base` (frame px, its planting place, the stick's lower end), the hand holds its top. Returns the pieces */
function Planted({ f, id, kind, base, k, lean = 0, hand, handK, order = 100, flagOrder = 96 }: { f: number; id: "coffee" | "tumbler" | "screen"; kind: FlagKindId; base: [number, number]; k: number; lean?: number; hand: HandImg; handK: number; order?: number; flagOrder?: number }) {
  const age = flagAge(id, f), K = FLAG_KINDS[kind];
  const slide = flagSlide(kind, age) * k, L = K.L * 0.97 * k, rad = (lean * Math.PI) / 180;
  const lift = age > 0.1 ? ease((age - 0.1) / 0.22) * 1300 : 0;
  const pinch: [number, number] = [base[0] + Math.sin(rad) * (L + slide), base[1] - Math.cos(rad) * (L + slide) - lift];
  return (
    <>
      <Flag x={PX(base[0])} y={PY(base[1])} k={k} rot={-lean} age={age} t={t(f)} kind={kind} dir={1} order={flagOrder} seed={1} />
      {lift < 1300 && <HandAt img={hand} at={pinch} k={handK} rot={180 - lean} order={order} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 5 and 23: the coffee on the table (a paper cup on a table top, the plate's beige wall): 5: her nails stab a toothpick flag into it, DING; 23: one little flag lands in it. The cup sits high so that in 5 only her nails come into the frame from the top (the painted sleeve is a stiff cone)
const CUP5 = { x: 540, y: 872, s: 3.3 }, LID5: [number, number] = [CUP5.x, CUP5.y - 93 * CUP5.s];
function CoffeeTable() {
  return (
    <>
      <Wash color={WALL} op={1} order={0} />
      <TableTop x0={-60} x1={1140} y={CUP5.y + 76 * CUP5.s + 40} h={70} order={20} />
      <Cup x={PX(CUP5.x)} y={PY(CUP5.y)} s={CUP5.s} order={30} />
    </>
  );
}
const StabShot = ({ f }: { f: number }) => (
  <>
    <CoffeeTable />
    <Planted f={f} id="coffee" kind="pick" base={LID5} k={3.4} lean={0} hand={HAND_K} handK={2.3} />
  </>
);

// ═════════════════════════════════════════════════════ 7 and 22: the wide: Ross (left) and Kenzie (right) at the café table, the ring light on a stand between them, the line behind them at the counter (the plate), the cobwebbed sign; 22: the same,
// in the steam storm: the customers duck, every flag flies. The plate at 1.25 puts the line's heads at y 700 and the sign under the platform's top bar; the people sit below the line's heads, so that the line reads
const W7 = { rossCx: 270, rossCy: 1060, rossE: 0.77, kenzieCx: 865, kenzieCy: 1060, kenzieE: 1.02, plateS: 1.25, plateV: 1178 };
const wideCam = () => cam(W7.plateS, 384, W7.plateV);
function WideBase({ f, duck = false }: { f: number; duck?: boolean }) {
  const R = W7, ross = rossAt(R.rossCx, R.rossCy, R.rossE), kz = kenzieAt("ring", R.kenzieCx, R.kenzieCy, R.kenzieE), m = wideCam();
  const tableY = R.rossCy + (RG16.puppets.ross.table.table.top - ROSS_DISC[1]) * R.rossE, [sx, sy] = toFrame([m.X((LINE.sign[0] + LINE.sign[2]) / 2), m.Y((LINE.sign[1] + LINE.sign[3]) / 2)]);
  const ringY = tableY - 125, ringX = 540;
  return (
    <>
      <PlateM m={m} file={(duck ? DUCK : LINE).file} edge={EDGE_LINE} />
      <SignOnPlate cx={sx} cy={sy} s={R.plateS} />
      <RossP f={f} x={ross.x} y={ross.y} E={R.rossE} order={40} body="table" pose={rossPose16(f, "table")} mouthW={rossMouthW(f)} attach={<RossFlags f={f} />} />
      <KenzieP kind="ring" x={kz.x} y={kz.y} E={kz.E} order={42} pose={kenziePose("ring", f)} />
      <TableTop x0={470} x1={1075} y={tableY + 6} h={46} order={44} />
      <Poly pts={ribbon([[PX(ringX), PY(ringY + 100), 12], [PX(ringX), PY(tableY + 4), 12]])} color="#3a3d44" order={46} />
      <RingLight x={PX(ringX)} y={PY(ringY)} r={108} w={19} level={0.9} order={50} inner={0} glow={0.3} />
      <PhoneBack x={PX(ringX)} y={PY(ringY + 58)} k={0.2} order={52} />
    </>
  );
}
/** the lettering and the cobwebs on the blank paper sign of the plate: (cx, cy) the middle of its face in frame px, `s` the plate's scale */
function SignOnPlate({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  const [x0, y0, x1, y1] = LINE.sign, w = (x1 - x0) * s, h = (y1 - y0) * s;
  return (
    <>
      <SignLetters x={PX(cx)} y={PY(cy)} w={w} h={h} order={12} />
      <Cobweb x={cx - w / 2} y={cy - h / 2} R={w * 0.6} dir={1} order={13} />
      <Cobweb x={cx + w / 2} y={cy - h / 2} R={w * 0.5} dir={-1} order={13} />
    </>
  );
}
const WideShot = ({ f }: { f: number }) => <WideBase f={f} />;

// ═════════════════════════════════════════════════════ 9: Ross's smile freezes; a bigger flag stabs into his hair, DING
const FreezeShot = ({ f }: { f: number }) => <RossShot f={f} cx={540} cy={880} E={2.0} bg={<LineBg m={lineView(1.9, 384, 700)} />} />;

// ═════════════════════════════════════════════════════ 10 and 24: Kenzie sipping from her tumbler, unbothered (the sip picture, then the master when she talks)
const SipShot = ({ f }: { f: number }) => <KenzieShot f={f} cy={990} E={2.3} ringR={500} />;
const StartShot = ({ f }: { f: number }) => <KenzieShot f={f} cy={980} E={2.25} ringR={500} />;

// ═════════════════════════════════════════════════════ 11 and 15: Ross dead flat, the eye starts to twitch (11), the twitch harder, both eyes (15)
const ShopShot = ({ f }: { f: number }) => <RossShot f={f} cx={540} cy={870} E={2.0} bg={<LineBg m={lineView(1.9, 384, 700)} />} />;
const TwitchShot = ({ f }: { f: number }) => <RossShot f={f} cx={560} cy={880} E={2.2} bg={<LineBg m={lineView(2.1, 400, 700)} />} />;

// ═════════════════════════════════════════════════════ 12: his tattooed hand stabs a desk flag into her tumbler
function TumblerShot({ f }: { f: number }) {
  const T = { x: 520, y: 1330, tall: 900 }, k = T.tall / 560, lid: [number, number] = [T.x + 70 * k, T.y - 288 * k];
  return (
    <>
      <WindowBg cx={540} vy={560} s={1.5} />
      <Tumbler x={T.x} y={T.y} tall={T.tall} order={30} />
      <Planted f={f} id="tumbler" kind="desk" base={lid} k={1.6} lean={-4} hand={HAND_R} handK={1.9} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 13: Kenzie, the desk flag in her tumbler; she spins the phone round on the ring light (its back turns to its screen)
const TUMBLER_LID: [number, number] = [372, 486];   // the lid of the tumbler in her picture (px)
function SpinShot({ f }: { f: number }) {
  const spin = clamp01((t(f) - 12.3) / 0.14), E = 2.2, cx = 540, cy = 990, pose = kenziePose("ring", f), tum = kenziePt("ring", cx, cy, E, TUMBLER_LID[0], TUMBLER_LID[1]), a = flagAge("tumbler", f);
  return (
    <>
      <KenzieShot f={f} {...KS.ring} phone={spin > 0 ? "mom" : "back"} spin={spin} base={2090} over={<Flag x={PX(tum[0])} y={PY(tum[1] - pose.breath * E)} k={0.38 * E} rot={4} age={a} t={t(f)} kind="desk" dir={1} order={85} seed={3} />} />
      {spin > 0 && spin < 1 && <Poly pts={ribbon([[PX(cx) - 200, PY(1500), 8], [PX(cx) + 200, PY(1500), 8]])} color="#ffffff" order={90} op={0.5 * Math.sin(spin * Math.PI)} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 14, 16, 18: the phone on the ring light, turned to us: MOM fills the screen (the banner "MOM joined", LIVE in the corner), 16: she lowers her sunglasses an inch, 18: a desk flag is jammed onto
// the screen, right on her face
const PH = { x: 540, base: 1255, k: 1.22, ringY: 840, ringR: 500 };
function PhoneInsert({ f, over }: { f: number; over?: React.ReactNode }) {
  return (
    <>
      <WindowBg cx={540} vy={640} s={1.5} />
      <Glow x={0} y={PY(PH.ringY)} rx={PH.ringR * 2.4} ry={PH.ringR * 2.4} op={0.5} order={2} color="rgba(255,240,205,1)" />
      <RingLight x={PX(PH.x)} y={PY(PH.ringY)} r={PH.ringR} w={PH.ringR * 0.16} level={0.92} order={20} inner={0} glow={0.45} />
      <Poly pts={ribbon([[PX(PH.x), PY(PH.ringY + PH.ringR), 40], [PX(PH.x), PY(1560), 40]])} color="#59606c" order={19} />
      <PhoneMom x={PX(PH.x)} y={PY(PH.base)} k={PH.k} s={momScreen(f)} art={MOM} order={60} />
      {over}
    </>
  );
}
const MomShot = ({ f }: { f: number }) => <PhoneInsert f={f} />;
const GlassesShot = ({ f }: { f: number }) => <PhoneInsert f={f} />;
function ScreenShot({ f }: { f: number }) {
  const face: [number, number] = [PH.x + 8, PH.base - 0.62 * PHONE_BOX.h * PH.k];
  return <PhoneInsert f={f} over={<Planted f={f} id="screen" kind="desk" base={face} k={1.7} lean={3} hand={HAND_R} handK={1.9} order={104} flagOrder={102} />} />;
}

// ═════════════════════════════════════════════════════ 17: IT'S A COFFEE SHOP!: Ross (the thumb picture) at the right, the vein pops, the thumb jabbed back at the line (the plate)
const TH = { cx: 740, cy: 780, E: 1.3 };
function ThumbShot({ f }: { f: number }) {
  const a = t(f) - THROB_T;
  return (
    <>
      <RossShot f={f} cx={TH.cx} cy={TH.cy} E={TH.E} body="thumb" bg={<PlateM m={cam(1.5, 384, 1057)} file={LINE.file} edge={EDGE_LINE} />} />
      <ShoutLines cx={TH.cx} cy={TH.cy + 90} r0={TH.E * 215} r1={TH.E * 330} f={f} order={30} />
      {a >= 0 && <Impact cx={TH.cx} cy={TH.cy - TH.E * 150} r={TH.E * 60} age={a} order={170} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 19: Mom's arm bursts out of the screen, goes over the table to above Ross's head and draws the flagpole up like a sword (the phone at the right, Ross beside it); the pole is drawn over her fist
const ARM19 = { phoneX: 880, phoneBase: 1250, k: 0.9, rossCx: 450, rossCy: 880, rossE: 1.05, burst: [800, 760] as [number, number], fist: [500, 560] as [number, number], poleLow: [500, 650] as [number, number] };
function ArmShot({ f }: { f: number }) {
  const R = ARM19, tt = t(f), a = tt - DRAW_T, A = RG16.props.mom_arm, reach = ease(a / 0.2), wind = a > 0.3 ? -110 * ease((a - 0.3) / 0.12) : 0;
  const fist: [number, number] = [lerp(R.burst[0], R.fist[0], reach), lerp(R.burst[1], R.fist[1], reach) + wind], base: [number, number] = [lerp(R.burst[0], R.poleLow[0], reach), lerp(R.burst[1] + 90, R.poleLow[1], reach) + wind];
  const [fx0, fy0, fx1, fy1] = A.fist, fcx = (fx0 + fx1) / 2, fcy = (fy0 + fy1) / 2, ak = 0.58, ang = (Math.atan2(R.burst[1] - fist[1], R.burst[0] - fist[0]) * 180) / Math.PI;
  return (
    <>
      <RossShot f={f} cx={R.rossCx} cy={R.rossCy} E={R.rossE} body="table" bg={<WindowBg cx={540} vy={640} s={1.5} />} />
      <PhoneMom x={PX(R.phoneX)} y={PY(R.phoneBase)} k={R.k} s={momScreen(f)} art={MOM} order={60} />
      {a >= 0 && (
        <>
          <Group x={PX(fist[0])} y={PY(fist[1])} rot={-ang} sx={-ak} sy={ak}>
            <Picture file={A.file} w={A.w} h={A.h} x={A.ox + A.w / 2 - fcx} y={fcy - (A.oy + A.h / 2)} order={106} alpha />
          </Group>
          <ScreenBurst at={R.burst} r={64} age={a} order={108} />
          <Flag x={PX(base[0])} y={PY(base[1])} k={1.05} rot={0} age={9} t={tt} kind="pole" dir={1} order={112} seed={5} />
        </>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════ 20: THUNK: the pole slams down on his head and wobbles, his eyes bulge; the flag in his hair (the cover is this shot, just after)
const SLAM = { cx: 540, cy: 1000, E: 1.4 };
const SlamShot = ({ f }: { f: number }) => {
  const a = t(f) - THUNK_T;
  return <RossShot f={f} cx={SLAM.cx} cy={SLAM.cy} E={SLAM.E} bg={<LineBg m={lineView(1.9, 384, 700)} />} over={a >= 0 ? <Impact cx={SLAM.cx} cy={SLAM.cy - 250 * SLAM.E} r={150} age={a} order={170} /> : null} />;
};

// ═════════════════════════════════════════════════════ 21: his face snaps purple; POP POP, the ear tunnels shoot out like corks, the kettle screams
const PUR = { cx: 540, cy: 960, E: 1.6 };
function PurpleShot({ f }: { f: number }) {
  const tt = t(f), a = tt - SNAP_T, ears = earsOf(f, PUR.cx, PUR.cy, PUR.E, "table"), r = 34 * PUR.E / 1.7;
  return (
    <RossShot f={f} cx={PUR.cx} cy={PUR.cy} E={PUR.E} bg={<LineBg m={lineView(1.9, 384, 700)} />} over={
      <>
        {a >= 0 && <Impact cx={PUR.cx} cy={PUR.cy} r={PUR.E * 190} age={a} order={170} />}
        {steamLevel(f) > 0 && <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={tt} k={PUR.E / 1.7 * 1.5} lvk={0.55} order={170} />}
        <Cork at={ears.panel[0]} dir={-1} t={tt} t0={CORK_T[0]} r={r} order={175} />
        <Cork at={ears.panel[1]} dir={1} t={tt} t0={CORK_T[1]} r={r} order={175} up={0.8} />
        <PopBurst at={ears.panel[0]} t={tt} t0={CORK_T[0]} R={70 * PUR.E / 1.7} order={174} />
        <PopBurst at={ears.panel[1]} t={tt} t0={CORK_T[1]} R={70 * PUR.E / 1.7} order={174} />
      </>
    } />
  );
}

// ═════════════════════════════════════════════════════ 22: the steam blasts every flag across the café, the line ducks
function StormShot({ f }: { f: number }) {
  const tt = t(f), R = W7, ears = earsOf(f, R.rossCx, R.rossCy, R.rossE, "table");
  const from: [number, number][] = [ears.frame[0], ears.frame[1], [R.rossCx - 40, R.rossCy - 190 * R.rossE], [560, 1330], [R.kenzieCx - 60, 1150], [R.rossCx + 90, 1180]];
  return (
    <>
      <WideBase f={f} duck />
      <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={tt} k={1.6} lvk={1} order={160} />
      <StormFlags t={tt} from={from} order={170} n={22} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 23: silence; one little flag drifts down into his coffee (the ducking line behind the wall: the plate is flat beige in the inserts)
function DriftShot({ f }: { f: number }) {
  const tt = t(f), age = flagAge("drift", f), u = clamp01(1 - -age / 0.47);
  const x = lerp(430, LID5[0], ease(u)) + 46 * Math.sin(u * Math.PI * 2.3) * (1 - u), y = lerp(80, LID5[1], u * u * 0.7 + 0.3 * u), rot = age < 0 ? 28 * Math.sin(u * Math.PI * 3) * (1 - u) : 0;
  return (
    <>
      <CoffeeTable />
      {age < 0 ? <Flag x={PX(x)} y={PY(y)} k={3.4} rot={rot} age={9} t={tt} kind="tiny" dir={1} order={96} seed={4} /> : <Flag x={PX(LID5[0])} y={PY(LID5[1])} k={3.4} rot={0} age={age} t={tt} kind="tiny" dir={1} order={96} seed={4} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 25: the NOW HIRING sign, the cobwebs, the line glaring behind it
const SIGN25 = { s: 2.2, fy: 780 };
function SignShot() {
  const [x0, y0, x1, y1] = LINE.sign, u = (x0 + x1) / 2, v = (y0 + y1) / 2, s = SIGN25.s, m = cam(s, clampU(u, s), v - (SIGN25.fy - 960) / s);
  return (
    <>
      <PlateM m={m} file={LINE.file} edge={EDGE_LINE} />
      <SignOnPlate cx={540 + (u - clampU(u, s)) * s} cy={SIGN25.fy} s={s} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 26: Ross steaming from both ears, purple, the pole still on his head, through his teeth
function HiredShot({ f }: { f: number }) {
  const tt = t(f), ears = earsOf(f, SLAM.cx, SLAM.cy, SLAM.E, "table");
  return <RossShot f={f} cx={SLAM.cx} cy={SLAM.cy} E={SLAM.E} bg={<LineBg m={lineView(1.9, 384, 700)} />} over={steamLevel(f) > 0 ? <EarPlumes left={ears.frame[0]} right={ears.frame[1]} t={tt} k={SLAM.E / 1.7 * 1.2} lvk={0.42} order={170} /> : null} />;
}

// ═════════════════════════════════════════════════════ 27: Kenzie looks at him a beat, then her hand comes up at the lens with one more flag, held by its foot, DING (the thrust); 28: the ring light blazes again, the frame blooms white (it hides the cut back to shot 1)
const LASTF = { x: 905, rest: 1820, k: 3.1, handK: 2.0 };   // the hand low enough that only her nails show above the frame's edge (the painted sleeve is a stiff cone), the flag bigger so its top stays where it was
function LastFlag({ f }: { f: number }) {
  const age = flagAge("last", f), a = Math.max(0, age), y = age < 0 ? lerp(2350, LASTF.rest - 70, ease((age + 0.1) / 0.1)) : LASTF.rest + 70 * Math.exp(-a / 0.09) * Math.cos(a * 26) - 0, pop = 1 + 0.14 * Math.exp(-a / 0.09);
  if (age < -0.1) return null;
  return (
    <>
      <Flag x={PX(LASTF.x)} y={PY(y)} k={LASTF.k * pop} rot={-5} age={a} t={t(f)} kind="desk" dir={1} order={96} seed={1} />
      <HandAt img={HAND_K} at={[LASTF.x, y]} k={LASTF.handK * pop} rot={-5} order={94} />
    </>
  );
}
const LastShot = ({ f }: { f: number }) => <KenzieShot f={f} cy={980} E={2.25} ringR={500} over={<LastFlag f={f} />} />;
function ClickShot({ f }: { f: number }) {
  const fl = flashAt(f), a = t(f) - CLICK2_T;
  return (
    <>
      <KenzieShot f={f} cy={980} E={2.25} ringR={500} level={0.92 + 0.28 * clamp01(a / 0.06)} glow={1 + clamp01(a / 0.06)} over={<LastFlag f={f} />} />
      <Glow x={0} y={PY(960)} rx={1100} ry={1100} op={0.9 * fl} order={198} color="rgba(255,252,238,1)" />
      <Wash color="#ffffff" op={fl} order={199} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the 28 shots
export const FOCUS: Record<ShotId, [number, number]> = {
  table: [540, 1000], ring: [540, 950], live: [540, 900], family: [540, 850], stab: [540, 1000], flag: [540, 950], wide: [540, 1000], unpaid: [540, 950], freeze: [540, 880], sip: [540, 950], shop: [540, 880], tumbler: [540, 1000],
  spin: [540, 950], mom: [540, 900], twitch: [560, 880], glasses: [540, 900], thumb: [740, 780], screen: [540, 900], arm: [540, 900], slam: [540, 1000], purple: [540, 960], storm: [540, 1000], drift: [540, 1000], start: [540, 950],
  sign: [540, 780], hired: [540, 1000], last: [540, 950], click: [540, 950],
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = {
  table: V("table", TableShot), ring: V("ring", RingShot), live: V("live", LiveShot), family: V("family", FamilyShot), stab: V("stab", StabShot), flag: V("flag", FlagShot), wide: V("wide", WideShot), unpaid: V("unpaid", UnpaidShot),
  freeze: V("freeze", FreezeShot), sip: V("sip", SipShot), shop: V("shop", ShopShot), tumbler: V("tumbler", TumblerShot), spin: V("spin", SpinShot), mom: V("mom", MomShot), twitch: V("twitch", TwitchShot), glasses: V("glasses", GlassesShot),
  thumb: V("thumb", ThumbShot), screen: V("screen", ScreenShot), arm: V("arm", ArmShot), slam: V("slam", SlamShot), purple: V("purple", PurpleShot), storm: V("storm", StormShot), drift: V("drift", DriftShot), start: V("start", StartShot),
  sign: V("sign", SignShot), hired: V("hired", HiredShot), last: V("last", LastShot), click: V("click", ClickShot),
};
export const ART: Record<ShotId, string> = {
  table: "ross-table", ring: "kenzie", live: "ross-table", family: "ross-table", stab: "hand-kenzie", flag: "kenzie", wide: "bg-line+ross-table+kenzie", unpaid: "kenzie", freeze: "ross-table", sip: "kenzie-sip>kenzie", shop: "ross-table", tumbler: "hand-ross",
  spin: "kenzie+phone", mom: "mom-live", twitch: "ross-table", glasses: "mom-live>mom-glasses", thumb: "ross-thumb+bg-line", screen: "mom-glasses+hand-ross", arm: "mom-arm+ross-table+mom-glasses", slam: "ross-table", purple: "ross-table", storm: "bg-line-duck", drift: "cup",
  start: "kenzie-sip>kenzie", sign: "bg-line", hired: "ross-table", last: "kenzie+hand-kenzie", click: "kenzie",
};
