import React from "react";
import { Glow, Inked, Picture, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { Squash } from "./pen-stage";
import { Cloud, Cork, PopBurst } from "./x08-fx";
import { SignText, useHandFonts } from "./x10-ui";
import {
  Boil, ClockHands, CurtainBunch, Cucumbers, DoorBell, DoorFrame, FoamOver, FP, FR, Fog, GLASS, GlassSheen, Grin, HairBubbles, Impact, LedClock, LitWindow, PX, PY, Pic, PressPatch, SignCard, Streaks, Sweat, TubSteam, Venetian, Wisp, Wash, Zzz, earSteam, hash, smooth,
} from "./x11-draw";
import { chuckPose, hop, rossPose11 } from "./x11-act";
import { FLAGS, shotX } from "./x11-shared";
import { ChuckP, PL, PL10, PR, RG, ROSS_EARS, ROSS_EYES, RossP, Plate, Spr, cam, chuckAt, chuckPt, headPt, rect, rossAt, rossPt, type Kind } from "./x11-stage";
import {
  BELL_T, BLIND_T, CLUNK_T, CORK_T, FLIP2_T, FPS, GREEN_T, KETTLE_T, RIP_T, SHOT_IDS, SLIDE_T, SMACK_T, THUD_T, TICK2_T, TICK_T, WALLET_T, WISP_T, ease, clamp01, lerp, lightsOn, mouthAt, shotAt, shotId, signAt, slideAt, smush,
  speedAt, steamLevel, swingAt, twos, wallClock, walletAt, wispAt, greenAt, bulgeAt, type ShotId,
} from "./x11-sched";

// The scenes of x11 "Are You Open?": one canvas per shot, hard cuts. Each is the art of the shot (the plates, props and puppets cut from out/x11-cast by scripts/x11-prep.py, src/x11-rig.json; x10's shop plates and Chuck) under the effects and writing drawn in code
// (src/x11-draw.tsx). Plates are placed by a view `m` (plate px -> frame px, src/x09-stage.tsx cam); the people are placed by the frame point of the middle of their eyes/head and a scale. A shot's `m` never moves: the camera's zoom (src/x11-sched.ts holdPush)
// is the canvas's (src/x11-shared.tsx). Frame px: x right, y down, 1080 x 1920.
const t = (f: number) => f / FPS;
const NIGHT = "#5662a0", NIGHT_P = "#aab2d8";
const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
const EDGE_FRONT = { top: "#a0d4e8", bottom: "#454542", side: "#b96640", sideLow: "#7b7875", split: 1088 };
const EDGE_NIGHT_FRONT = { top: "#34446c", bottom: "#24242a", side: "#7a4430", sideLow: "#46464a", split: 1088 };
const EDGE_CAR = { top: "#3a3a3e", bottom: "#3a3a3e", side: "#3a3a3e" };
const EDGE_BATH = { top: "#b6e2f0", bottom: "#eef0f2", side: "#b6e2f0", sideLow: "#eef0f2", split: 1140 };
const EDGE_BED = { top: "#1c2a63", bottom: "#241a10", side: "#1c2a63", sideLow: "#241a10", split: 1010 };
const mixHex = (a: string, b: string, u: number) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) * (1 - u) + ((y >> s) & 255) * u); return "#" + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
const PANEL = (color: string, order: number) => <Poly pts={[[-2400, 2400], [2400, 2400], [2400, -2400], [-2400, -2400]]} color={color} order={order} />;
const toFrame = (p: [number, number]): [number, number] => [p[0] + 540, 960 - p[1]];   // a panel point as a frame point

// views: the shop's counter wall seen through the door's glass (the clock top right), the street through the inside of the door, the car's rear window, the bedroom, the bath
const COUNTER = cam(1.5, 380, 520);
const STREET = cam(3.0, 234.5, 640);
const CAR = cam(1.55, 384, 600);
const BED = cam(1.4, 384, 672);
const BATH = cam(1.4, 384, 672);
const FRONT = cam(1.6, 384, 760);
const WALL = cam(1.5, 380, 700);

// ═════════════════════════════════════════════════════ the door, seen from the street: Ross behind the glass, the counter wall and its clock behind him, the sign on the glass (shots 1, 4, 23, 27)
const HOOK: [number, number] = [774, 890];            // the sign's suction cup (frame px): the card hangs by Ross's raised fist
const ROSS_DOOR = { cx: 340, cy: 900, E: 1.1 };
function DoorStreet({ f, body, lit }: { f: number; body: "sign" | "point" | "pj"; lit: boolean }) {
  const m = COUNTER, ok = useHandFonts(), [cx, cy, r] = PL10.counter.clock, wc = wallClock(f), sg = signAt(f), tt = t(f);
  const ross = rossAt(ROSS_DOOR.cx, ROSS_DOOR.cy, ROSS_DOOR.E), pose = rossPose11(f, body);
  const tickT = shotId(f) === "nextday" ? TICK2_T : TICK_T, jolt = (shotId(f) === "sign" || shotId(f) === "nextday") && tt >= tickT ? 5 * Math.exp(-(tt - tickT) / 0.1) * Math.sin((tt - tickT) * 80) : 0;
  const mouth = pose.mouth, open = mouth === "closed" ? 0.1 : mouth === "small" ? 0.35 : mouth === "mid" ? 0.65 : mouth === "o" ? 0.5 : 1;
  const E = ROSS_DOOR.E;
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <ClockHands x={m.X(cx)} y={m.Y(cy)} r={r * m.s} hour={wc.hour} minute={wc.minute} order={20} shake={jolt} />
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={40} body={body} pose={pose} attach={body === "pj" ? <><HairBubbles f={f} order={56} /><Grin cx={-9} cy={80} w={250} open={open} order={53.6} /></> : shotId(f) === "nextday" ? <Sweat x={-150} y={300} age={tt - 27.7} k={1.6} order={60} /> : undefined} />
      <SignCard x={HOOK[0]} y={HOOK[1]} turn={sg.turn} word={sg.word} swing={swingAt(f)} order={150} ready={ok} />
      <GlassSheen order={200} />
      <DoorFrame side="street" order={220} />
      {lit && <Glow x={PX(540)} y={PY(1000)} rx={700} ry={900} op={0.12} order={210} color="rgba(255,236,170,1)" />}
    </>
  );
}

// ═════════════════════════════════════════════════════ the door from inside: the street through the glass, Chuck's face smacked on it, the blind (shots 2, 3, 5)
const FACE_E = 1.25, FACE_C: [number, number] = [540, 790];
function ChuckFace({ f, kind, cx, cy, E, t0, order, hold = 0.1, shirt = false }: { f: number; kind: Kind; cx: number; cy: number; E: number; t0: number; order: number; hold?: number; shirt?: boolean }) {
  const k = smush(f, t0), sx = 1 + 0.3 * k + hold, sy = 1 - 0.2 * k - hold * 0.6, ch = chuckAt(kind, cx, cy, E * (1 + 0.05 * k));
  const [x, y] = [cx - 540, 960 - cy];
  return (
    <Squash x={x} y={y} sx={sx} sy={sy}>
      {shirt && <Poly pts={FP([[cx - 355, cy + 531 * E - 6], [cx + 405, cy + 531 * E - 6], [cx + 470, cy + 1100], [cx - 440, cy + 1100]])} color="#fbfaf6" order={order - 1} />}
      <ChuckP kind={kind} x={ch.x} y={ch.y} E={ch.E} order={order} pose={chuckPose(kind, f)} />
    </Squash>
  );
}
function InsideDoor({ f, blind }: { f: number; blind: boolean }) {
  const m = STREET, tt = t(f), age = tt - SMACK_T[0], mouth = mouthAt("CHUCK", f);
  const fog = (mouth === "closed" ? 0.06 : mouth === "small" ? 0.12 : mouth === "mid" ? 0.18 : 0.24) * (age > 0 ? 1 : 0);
  const k = smush(f, SMACK_T[0]);
  // the blind: it falls from the top of the glass over the three frames before the slam (BLIND_T); his face then presses a bump into the slats from behind, which swells on the slam and settles
  const a = tt - BLIND_T, fall = blind ? (a < 0 ? clamp01(1 + a / 0.1) ** 2 : 1) : 0, bump = blind && a >= 0 ? 0.85 + 0.5 * Math.exp(-a / 0.09) * Math.cos(a * 30) : 0;
  return (
    <>
      <Plate m={m} file={PL10.window.file} edge={EDGE_WINDOW} />
      {age >= -0.0001 && <ChuckFace f={f} kind="smush" cx={FACE_C[0]} cy={FACE_C[1]} E={FACE_E} t0={SMACK_T[0]} order={40} shirt />}
      {age >= -0.0001 && <PressPatch cx={FACE_C[0]} cy={FACE_C[1] + 30} rx={470} ry={400} palms={[[120, 1050, 80], [960, 1050, 80]]} k={0.5 + 0.5 * k} order={160} />}
      {age >= -0.0001 && <Fog x={FACE_C[0] + 4} y={FACE_C[1] + 232} rx={210} ry={110} op={fog} order={162} />}
      {age >= -0.0001 && <Impact cx={FACE_C[0]} cy={FACE_C[1]} r={440} age={age} order={170} />}
      <GlassSheen order={200} />
      <DoorFrame side="inside" order={220} />
      {blind && a >= 0 && <Impact cx={540} cy={1560} r={430} age={a} order={240} />}
      {blind && <Venetian fall={fall} bump={bump} c={[FACE_C[0], FACE_C[1] - 70]} r={[470, 400]} sway={a >= 0 ? 12 * Math.exp(-a / 0.22) * Math.sin(a * 22) : 0} order={230} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ the car (shots 6-10): Ross in the driver's seat facing us, the rear window behind his head with Chuck's face on it, the dashboard in front of him
const CAR_ROSS = { cx: 540, cy: 890, E: 1.1 };
const WIN_FACE: [number, number] = [540, 410];
function Car({ f, face }: { f: number; face: boolean }) {
  const m = CAR, tt = t(f), g = greenAt(f), sp = speedAt(f), ross = rossAt(CAR_ROSS.cx, CAR_ROSS.cy, CAR_ROSS.E), E = CAR_ROSS.E;
  const light = mixHex("#b05866", "#5a9c78", g), rossTint = mixHex("#ffc4bc", "#f9fffa", g), glow = g < 0.5 ? "rgba(255,50,40,1)" : "rgba(60,255,120,1)";
  const [fx0, fy0] = [m.X(39) + 540, 960 - m.Y(154)], [fx1, fy1] = [m.X(726) + 540, 960 - m.Y(527)];
  const k = 0.8, dashX = 540 - (PR.dash.w * k) / 2, dashY = 1340;
  const sx = dashX + 659 * k, sy = dashY + 161 * k;
  const mouth = mouthAt("CHUCK", f), age = tt - SMACK_T[1], fog = face ? (mouth === "closed" ? 0.08 : mouth === "small" ? 0.16 : 0.24) : 0;
  return (
    <>
      <Plate m={m} file={PL.car.file} edge={EDGE_CAR} tint={light} />
      {sp > 0.01 && <Poly pts={rect(m, 39, 154, 726, 527)} color="#0e1840" order={5} />}
      {sp > 0.01 && <Streaks rect={[fx0, fy0, fx1, fy1]} speed={sp} age={tt - GREEN_T} order={6} />}
      {face && (
        <>
          <ChuckFace f={f} kind="smush" cx={WIN_FACE[0]} cy={WIN_FACE[1]} E={0.85} t0={SMACK_T[1]} order={20} hold={0.1} />
          <PressPatch cx={WIN_FACE[0]} cy={WIN_FACE[1] + 20} rx={400} ry={290} palms={[]} k={0.5 + 0.5 * smush(f, SMACK_T[1])} order={33} />
          <Fog x={WIN_FACE[0] + 3} y={WIN_FACE[1] + 160} rx={150} ry={80} op={fog} order={33.5} />
          <Impact cx={WIN_FACE[0]} cy={WIN_FACE[1]} r={340} age={age} order={34} />
        </>
      )}
      <Picture file={PL.carHole} w={768 * m.s} h={1344 * m.s} x={m.X(384)} y={m.Y(672)} order={36} alpha tint={light} />
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={40} body="drive" pose={rossPose11(f, "drive")} tint={rossTint} />
      {(() => {                                                                                  // a thin lighter rim on the black wheel (a black wheel on a black tee reads only by its outline)
        const [wx, wy] = rossPt(CAR_ROSS.cx, CAR_ROSS.cy, E, 818, 930), p = rossPose11(f, "drive");
        return <Poly pts={ribbon(Array.from({ length: 41 }, (_, i) => { const a = (i / 40) * Math.PI * 2; return [PX(wx) + Math.cos(a) * 112 * E, PY(wy + p.breath * -E) + Math.sin(a) * 104 * E, 3.2]; }))} color="#6d7690" order={95} op={0.8} />;
      })()}
      <Pic file={PR.dash.file} x0={dashX} y0={dashY} w={PR.dash.w * k} h={PR.dash.h * k} order={100} tint={NIGHT_P} />
      <LedClock x={PX(sx)} y={PY(sy)} w={250} h={140} digits="11:48" sub="PM" color="#7dffb0" dim="#0c2418" order={110} />
      <Glow x={PX(540)} y={PY(880)} rx={760} ry={900} op={g < 0.5 ? 0.3 : 0.055} order={150} color={glow} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the bedroom (shots 11-15): the bed with Ross in it, the window behind his head, the clock on the bedside table
const BED_ROSS = { cx: 540, cy: 1050, E: 1.25 };
const BED_FACE: [number, number] = [534, 560];
function Bedroom({ f, face, slide = 0, trail = false }: { f: number; face: boolean; slide?: number; trail?: boolean }) {
  const m = BED, tt = t(f), low = shotId(f) === "slide1" || shotId(f) === "slide2", ross = rossAt(BED_ROSS.cx, low ? 1350 : BED_ROSS.cy, BED_ROSS.E), E = BED_ROSS.E, mouth = mouthAt("CHUCK", f);   // (in the two window shots he sits lower: only his hair is in the frame, under the caption's band)
  const [cx, cy] = [m.X(675) + 540, 960 - m.Y(799)], age = tt - SMACK_T[2];
  const fy = BED_FACE[1] + slide * 1000, fog = face && slide < 0.05 ? (mouth === "closed" ? 0.08 : mouth === "small" ? 0.16 : 0.24) : 0;
  const asleep = shotId(f) === "bed", zage = (tt - 9.533) % 1.6;
  return (
    <>
      <Plate m={m} file={PL.bedroom.file} edge={EDGE_BED} />
      {face && (
        <>
          {trail && [[-190, 70], [0, 150], [190, 70]].map(([dx, w], i) => <Poly key={i} pts={xf(roundRect(w, 1000 * slide + 200, w / 2), PX(BED_FACE[0] + dx), PY(BED_FACE[1] + 500 * slide + 60))} color="#fbeee6" order={33} op={0.36} />)}
          <ChuckFace f={f} kind="smush" cx={BED_FACE[0]} cy={fy} E={0.66} t0={SMACK_T[2]} order={20} hold={0.1} />
          <PressPatch cx={BED_FACE[0]} cy={fy + 10} rx={290} ry={230} palms={[]} k={0.5 + 0.5 * smush(f, SMACK_T[2])} order={33} />
          <Fog x={BED_FACE[0] + 3} y={fy + 118} rx={110} ry={62} op={fog} order={33.5} />
          <Impact cx={BED_FACE[0]} cy={fy} r={260} age={age} order={34} />
        </>
      )}
      <Picture file={PL.bedHole} w={768 * m.s} h={1344 * m.s} x={m.X(384)} y={m.Y(672)} order={36} alpha />
      <LedClock x={PX(cx)} y={PY(cy)} w={150} h={84} digits="3:07" sub="AM" color="#ff5a4a" dim="#2a0c0a" order={38} />
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={40} body="bed" pose={rossPose11(f, "bed")} attach={undefined} />
      {asleep && <Zzz x={PX(800)} y={PY(1010)} age={zage} k={1.3} order={120} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ the bath (shots 16-18, 20, 21)
const BATH_ROSS = { cx: 540, cy: 800, E: 1.2 };
function Bath({ f, cukes, boil }: { f: number; cukes: boolean; boil: boolean }) {
  const m = BATH, tt = t(f), ross = rossAt(BATH_ROSS.cx, BATH_ROSS.cy, BATH_ROSS.E), E = BATH_ROSS.E, pose = rossPose11(f, "bath"), age = tt - CORK_T[0];
  const red = tt >= CORK_T[1] - 0.05 ? "red" : undefined;
  const slide = clamp01((tt - (RIP_T + 0.07)) / 0.7), r = 50;
  const ears = ROSS_EARS.map(([hx, hy]) => headPt(pose, E, ross.x, ross.y, hx, hy)) as [number, number][];
  const lv = steamLevel(f), sp = lv > 0 ? [...earSteam(ears[0], -1, tt, E * 1.1, 1), ...earSteam(ears[1], 1, tt, E * 1.1, 2)] : [];
  const rimY = 800 + (690 - 300) * E, xL = 540 - 400 * E * 0.97, xR = 540 + 400 * E * 0.97;
  return (
    <>
      <Plate m={m} file={PL.bathroom.file} edge={EDGE_BATH} />
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={40} body="bath" head={red as "red" | undefined} pose={pose}
        attach={cukes ? <Cucumbers centers={ROSS_EYES} r={r} slide={slide} which={0} f={f} order={53} /> : undefined} />
      {boil && <Boil x0={xL + 60} x1={xR - 60} yFoam={rimY - 120} rise={shotId(f) === "fine" ? 120 : 250} age={age} k={clamp01(age / 0.25)} order={110} />}
      {boil && <FoamOver xL={xL + 30} xR={xR - 30} yRim={rimY - 40} age={age} k={1} order={112} />}
      {boil && <TubSteam x0={xL + 60} x1={540 - 190 * E} y={rimY - 150} t={tt} tStart={CORK_T[0]} lv={Math.min(1.8, 0.4 + age * 3)} k={0.8} order={30} />}
      {boil && <TubSteam x0={540 + 190 * E} x1={xR - 60} y={rimY - 150} t={tt} tStart={CORK_T[0]} lv={Math.min(1.8, 0.4 + age * 3)} k={0.8} order={30} />}
      {boil && sp.length > 0 && <Cloud sprites={sp} order={170} />}
      {boil && <Cork at={ears[0]} dir={-1} t={tt} t0={CORK_T[0]} r={34 * E / 1.7 * 1.3} order={175} />}
      {boil && <Cork at={ears[1]} dir={1} t={tt} t0={CORK_T[1]} r={34 * E / 1.7 * 1.3} order={175} up={0.8} />}
      {boil && <PopBurst at={ears[0]} t={tt} t0={CORK_T[0]} R={70 * E / 1.7 * 1.3} order={174} />}
      {boil && <PopBurst at={ears[1]} t={tt} t0={CORK_T[1]} R={70 * E / 1.7 * 1.3} order={174} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ the shop front at 4 AM (shot 22): the plate under the night, the window and the door lighting up row by row, the wall clock inside it
function ShopFront({ f }: { f: number }) {
  const m = FRONT, ok = useHandFonts(), rows = lightsOn(f), [bx0, by0, bx1, by1] = RG10front.sign, tt = t(f);
  const win: [number, number, number, number] = [m.X(104) + 540, 960 - m.Y(612), m.X(436) + 540, 960 - m.Y(955)], door: [number, number, number, number] = [m.X(509) + 540, 960 - m.Y(624), m.X(657) + 540, 960 - m.Y(1040)];
  const wcx = m.X(380) + 540, wcy = 960 - m.Y(690), wr = 50 * m.s / 1.0;
  const pulse = (t0: number) => (tt >= t0 ? 0.5 * Math.exp(-(tt - t0) / 0.08) : 0);
  return (
    <>
      <Plate m={m} file={PL10.front.file} edge={EDGE_NIGHT_FRONT} tint={NIGHT} />
      <SignText x={m.X((bx0 + bx1) / 2)} y={m.Y((by0 + by1) / 2)} w={(bx1 - bx0) * m.s} h={(by1 - by0) * m.s} order={20} ready={ok} />
      <LitWindow rect={win} rows={rows} order={30} />
      <LitWindow rect={door} rows={rows} order={30} />
      {rows > 0 && (
        <>
          <Inked pts={ellipsePts(PX(wcx), PY(wcy), wr, wr, 36)} color="#fbf7ea" ink="#4a3a22" w={4} order={36} />
          <ClockHands x={PX(wcx)} y={PY(wcy)} r={wr} hour={4} minute={12} order={37} />
        </>
      )}
      <Glow x={PX(380)} y={PY(1340)} rx={560} ry={170} op={0.4 * Math.min(1, rows / 3)} order={40} color="rgba(255,226,140,1)" />
      <Wash color="#fff3c0" op={Math.max(pulse(CLUNK_T[0]), pulse(CLUNK_T[1]), pulse(CLUNK_T[2]))} order={300} />
    </>
  );
}
const RG10front = PL10.front;

// ═════════════════════════════════════════════════════ inside the shop (shots 24-26): Chuck behind the pastry case, Chuck at the door, Ross dead-eyed
function Case({ f }: { f: number }) {
  const m = WALL, tt = t(f), E = 1.25, cx = 540, cy = 700, k = 0.9, caseX = 540 - (PR.case.w * k) / 2, caseY = 1330, w = RG.wallet;
  const [cxl, cyl, cr] = PL10.counter.clock, u = ease(walletAt(f)), pose = chuckPose("wallet", f);
  const p0 = chuckPt("wallet", cx, cy, E, 363, 664), p1 = chuckPt("wallet", cx, cy, E, 404, 758), wx = lerp(p0[0], p1[0], u), wy = lerp(p0[1], p1[1], u);
  const ch = chuckAt("wallet", cx, cy, E), bw = (w.box[2] - w.box[0]) * E, bh = (w.box[3] - w.box[1]) * E, hp = -hop(f);
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <ClockHands x={m.X(cxl)} y={m.Y(cyl)} r={cr * m.s} hour={4} minute={12} order={20} />
      <ChuckP kind="wallet" x={ch.x} y={ch.y - hp} E={ch.E} order={50} pose={pose} />
      <Picture file={w.file} w={bw} h={bh} x={PX(wx)} y={PY(wy) - hp} order={95} alpha op={1 - smooth(0.78, 1, u)} rot={-28 * u} />
      <Pic file={PR.case.file} x0={caseX} y0={caseY} w={PR.case.w * k} h={PR.case.h * k} order={120} />
      <DoorBell x={150} y={80} age={tt - BELL_T[0]} order={140} />
    </>
  );
}
function AtDoor({ f }: { f: number }) {
  const m = cam(1.6, 489, 700), E = 1.3, ch = chuckAt("x10", 420, 820, E), pose = chuckPose("x10", f), hp = -hop(f);
  return (
    <>
      <Plate m={m} file={PL10.window.file} edge={EDGE_WINDOW} />
      <ChuckP kind="x10" x={ch.x} y={ch.y - hp} E={ch.E} order={50} pose={pose} />
    </>
  );
}
function Five({ f }: { f: number }) {
  const m = WALL, ross = rossAt(558, 880, 1.1), E = 1.1, pose = rossPose11(f, "pj"), tt = t(f), cl = PL10.counter.clock;   // (558: with the push-in his raised fist is just out of the frame on the right)
  const ear = headPt(pose, E, ross.x, ross.y, ROSS_EARS[0][0] - 6, ROSS_EARS[0][1] + 8);
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <ClockHands x={m.X(cl[0])} y={m.Y(cl[1])} r={cl[2] * m.s} hour={4} minute={12} order={20} />
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={40} body="pj" pose={pose} />
      <Wisp at={ear} age={tt - WISP_T} k={1.25} order={160} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the 27 shots
const FOCUS: Record<ShotId, [number, number]> = {
  sign: [540, 960], smack: [540, 800], shout: [540, 1100], twitch: [600, 940], blind: [540, 800], car: [540, 960], carsmack: [540, 760], vein: [540, 1047], wait: [540, 700], floor: [540, 960], bed: [540, 960], bedsmack: [540, 1250], bulge: [540, 1450],
  slide1: [534, 200], slide2: [534, 330], bath: [540, 960], cukes: [540, 827], rip: [540, 960], chuck: [540, 960], corks: [540, 900], fine: [540, 820], lights: [540, 960], open: [540, 960], case: [540, 960], door: [540, 960], five: [540, 958], nextday: [540, 960],
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
const Chuck19 = ({ f }: { f: number }) => {
  const m = BATH, E = 1.3, ch = chuckAt("curtain", 600, 760, E), pose = chuckPose("curtain", f), hp = -hop(f);
  const [fx, fy] = chuckPt("curtain", 600, 760, E, 270, 140);
  return (
    <>
      <Plate m={m} file={PL.bathdoor.file} edge={EDGE_BATH} />
      <CurtainBunch fx={fx} fy={fy} wBottom={480} yBottom={2000} order={20} />
      <ChuckP kind="curtain" x={ch.x} y={ch.y - hp} E={ch.E} order={50} pose={pose} />
    </>
  );
};
const Rip = ({ f }: { f: number }) => {
  const tt = t(f), a = ease((tt - RIP_T) / 0.16), w = 1130 * (1 - 0.87 * a), x0 = 1100 - w;
  return (
    <>
      <Bath f={f} cukes boil={false} />
      <Pic file={PR.curtain.file} x0={x0} y0={96} w={w} h={1900} order={200} />
    </>
  );
};
const Fine = ({ f }: { f: number }) => <Bath f={f} cukes={false} boil />;
const REAL: Record<ShotId, React.FC<{ f: number }>> = {
  sign: V("sign", ({ f }) => <DoorStreet f={f} body="sign" lit={false} />),
  smack: V("smack", ({ f }) => <InsideDoor f={f} blind={false} />),
  shout: V("shout", ({ f }) => <InsideDoor f={f} blind={false} />),
  twitch: V("twitch", ({ f }) => <DoorStreet f={f} body="point" lit={false} />),
  blind: V("blind", ({ f }) => <InsideDoor f={f} blind />),
  car: V("car", ({ f }) => <Car f={f} face={false} />),
  carsmack: V("carsmack", ({ f }) => <Car f={f} face />),
  vein: V("vein", ({ f }) => <Car f={f} face />),
  wait: V("wait", ({ f }) => <Car f={f} face />),
  floor: V("floor", ({ f }) => <Car f={f} face />),
  bed: V("bed", ({ f }) => <Bedroom f={f} face={false} />),
  bedsmack: V("bedsmack", ({ f }) => <Bedroom f={f} face />),
  bulge: V("bulge", ({ f }) => <Bedroom f={f} face />),
  slide1: V("slide1", ({ f }) => <Bedroom f={f} face />),
  slide2: V("slide2", ({ f }) => <Bedroom f={f} face slide={slideAt(f)} trail />),
  bath: V("bath", ({ f }) => <Bath f={f} cukes boil={false} />),
  cukes: V("cukes", ({ f }) => <Bath f={f} cukes boil={false} />),
  rip: V("rip", Rip),
  chuck: V("chuck", Chuck19),
  corks: V("corks", Fine),
  fine: V("fine", Fine),
  lights: V("lights", ({ f }) => <ShopFront f={f} />),
  open: V("open", ({ f }) => <DoorStreet f={f} body="pj" lit />),
  case: V("case", Case),
  door: V("door", AtDoor),
  five: V("five", Five),
  nextday: V("nextday", ({ f }) => <DoorStreet f={f} body="sign" lit={false} />),
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = REAL;
export const ART: Record<ShotId, string> = Object.fromEntries(SHOT_IDS.map((id) => [id, id])) as Record<ShotId, string>;
void FLAGS; void Spr; void FP; void FR; void hash; void twos; void KETTLE_T; void THUD_T; void SLIDE_T; void FLIP2_T; void CORK_T; void shotAt; void bulgeAt; void wispAt; void speedAt; void toFrame; void mixHex; void PANEL; void Poly;
