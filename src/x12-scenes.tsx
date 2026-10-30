import React from "react";
import { Picture, Poly, ribbon } from "./sp-puppet";
import { Group, Squash } from "./pen-stage";
import { Cork, PopBurst } from "./x08-fx";
import { PlasterRain, Dust } from "./x08-fx";
import { Bell } from "./x10-draw";
import { useHandFonts } from "./x10-ui";
import { Ceiling, CeilingCrack, Impact, LightShaft, NameTag, PX, PY, RopeLine, ShoutLines, SteamCloud, SteamWisps, Wash, cupSprites, jetSprites, plumeSprites, ropePath, CEIL_Y } from "./x12-draw";
import { chuckPose, hop, lunge, rossPose12 } from "./x12-act";
import { shotX } from "./x12-shared";
import { ChuckP, CounterFront, PL10, RG, ROSS_EARS, RossP, TAG_BOX, Plate, chuckAt, chuckPt, counterView, headPt, rossAt, rossPt, cam, type Kind } from "./x12-stage";
import { CORK_T, CRACK_T0, DING_T, FPS, SIP_T, SINK_T, SNAP_T, bellPress, crackAt, cupSteam, ease, flashAt, lerp, purpleAt, ropeAt, rossDown, shotId, slapAt, steamLevel, type RossBody, type ShotId } from "./x12-sched";

// The scenes of x12 "Speak to the Manager": one canvas per shot, hard cuts. Each is the art of the shot (the plates, props and puppets cut from out/x12-cast by scripts/x12-prep.py, src/x12-rig.json; x10's counter and window plates and its counter's front
// layer) under the effects and writing drawn in code (src/x12-draw.tsx). Plates are seen through a view `m` (src/x09-stage.tsx cam); people are placed by the frame point of the middle of the eyes or the head and a scale. A shot's `m` never moves: the camera's
// zoom (src/x12-sched.ts holdPush) is the canvas's (src/x12-shared.tsx). Frame px: x right, y down, 1080 x 1920. Ross is always BEHIND the counter (the counter's front layer, order 80, hides him when he drops); Chuck stands against the window wall (the customer's side); shot 1 shows him from Ross's side of the counter, its strip across the bottom of the frame.
const t = (f: number) => f / FPS;
const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
const toFrame = (p: [number, number]): [number, number] => [p[0] + 540, 960 - p[1]];   // a panel point as a frame point
const mixHex = (a: string, b: string, u: number) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), c = (s: number) => Math.round(((x >> s) & 255) * (1 - u) + ((y >> s) & 255) * u); return "#" + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };

// ── the views. The counter's top edge (plate row 795) is put on the frame row Yc, so that what shows of Ross above it is what the shot wants
const M_END = counterView(1.5, 1173);                  // shot 19: the counter and its bell at the end of the reel
const BELL = { u: 583, v: 850 };                       // x10's bell on the counter top (plate px): every counter shot draws it
const M_WIDE = counterView(1.4286, 1136);              // the whole plate: the drops and the entrance of God
const M_CLOSE = counterView(1.6, 1330);                // the tie, the crown
const M_FLAT = counterView(1.7, 1480);
const M_SPEAK = counterView(1.6, 1420);
const M_TWO = counterView(1.45, 1150);                 // the two-shot of the steam
const hideD = (yc: number, cy: number, E: number, extra = 330) => yc - cy + extra * E + 30;   // how far Ross drops (frame px) to be out of sight behind the counter's top at frame row yc

// ═════════════════════════════════════════════════════ shot 1: the bell, from Ross's side of the counter. Chuck stands against the window wall (the door at his right), calm, the latte up in his right hand (frame right: the picture is mirrored, so the cup is in the
// same hand as in the latte picture of shot 2), his other mitten hanging over the bell; the counter's strip runs across the bottom of the frame and hides his legs. The whole figure goes down on each slap
const WIN_BELL = cam(1.55, 300, 620);
const CHUCK_BELL = { cx: 540, cy: 690, E: 1.45 };
const COUNTER_BELL = counterView(1.5, 1372);           // the strip of the counter: its far edge on frame row 1372, the front panel below it
const HAND_BELL = 139;                                  // px of the cup picture from the middle of his eyes to his hanging mitten (to the side; the figure is mirrored: to the left in the frame)
function BellShot({ f }: { f: number }) {
  const m = COUNTER_BELL, c = CHUCK_BELL, ch = chuckAt("cup", c.cx, c.cy, c.E), bx = c.cx - HAND_BELL * c.E, by = 1372 + 40, sb = 1.1;
  return (
    <>
      <Plate m={WIN_BELL} file={PL10.window.file} edge={EDGE_WINDOW} />
      <ChuckP kind="cup" flip x={ch.x} y={ch.y - slapAt(f)} E={ch.E} order={41} pose={chuckPose("cup", f)} />
      <CounterFront m={m} />
      <Bell x={PX(bx)} y={PY(by)} s={sb} press={bellPress(f)} ring={0} order={82} />
      {DING_T.map((t0, i) => <PopBurst key={i} at={[PX(bx), PY(by - 70 * sb)]} t={t(f)} t0={t0} R={52 * sb} order={85} />)}
    </>
  );
}

// ═════════════════════════════════════════════════════ shots 2, 3, 11, 12: Chuck's face against the window wall (the window's sky behind his head). 2: calm for three frames (the hold picture, mirrored: the cup in his right hand, as in the latte picture), then it snaps (the latte picture's face, purple);
// 3: the same pushed in; 11: his eyes go up; 12: the screaming head
const WIN_FACE = cam(1.55, 234, 560);
function Face({ f, kind, view, cx, cy, E, shout = false }: { f: number; kind: Kind; view: ReturnType<typeof cam>; cx: number; cy: number; E: number; shout?: boolean }) {
  const tt = t(f), id = shotId(f), calm = id === "snap" && tt < SNAP_T, k: Kind = calm ? "hold" : kind, ch = chuckAt(k, cx, cy, E);
  const a = tt - SNAP_T, pop = id === "snap" && a >= 0 ? 0.11 * Math.exp(-a / 0.05) : 0;
  const mouth = chuckAt(k, cx, cy, E);
  void mouth;
  return (
    <>
      <Plate m={view} file={PL10.window.file} edge={EDGE_WINDOW} />
      <Squash x={cx - 540} y={960 - cy} sx={1 + pop} sy={1 + pop * 0.7}>
        <ChuckP kind={k} flip={calm} x={ch.x} y={ch.y} E={ch.E} order={40} pose={chuckPose(k, f)} purple={calm ? 0 : purpleAt(f)} />
      </Squash>
      {id === "snap" && <Impact cx={cx} cy={cy} r={E * 175} age={a} order={170} />}
      {shout && <ShoutLines cx={cx} cy={cy + E * 70} r0={E * 215} r1={E * 330} f={f} order={30} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ Ross behind the counter. `down` 0 standing .. 1 out of sight; the name tag is drawn over the painted blank one
function RossBehind({ f, m, cx, cy, E, body, yc, down, extra = 330, tag = false, attach, order = 40 }: { f: number; m: ReturnType<typeof cam>; cx: number; cy: number; E: number; body: RossBody; yc: number; down: number; extra?: number; tag?: boolean; attach?: React.ReactNode; order?: number }) {
  const ok = useHandFonts(), ross = rossAt(cx, cy, E), pose = rossPose12(f, body), dy = down * hideD(yc, cy, E, extra);
  const [tx, ty] = rossPt(cx, cy, E, (TAG_BOX[0] + TAG_BOX[2]) / 2, (TAG_BOX[1] + TAG_BOX[3]) / 2);
  const crownSlip = shotId(f) === "flat" ? ease((t(f) - 8.3) / 0.35) : 0;
  void m;
  return (
    <>
      <RossP f={f} x={ross.x} y={ross.y - dy} E={E} order={order} body={body} pose={pose} attach={attach} crownSlip={crownSlip} />
      {tag && down < 0.995 && <NameTag x={tx + (pose.dx ?? 0)} y={ty + pose.breath * E + dy} w={TAGW * E} rot={0} order={order + 30} ready={ok} />}
    </>
  );
}
const TAGW = 135;   // the tag's width in picture px (the painted blank one is 70 wide: the code-drawn one is bigger so that MANAGER reads)

// ═════════════════════════════════════════════════════ shots 4 and 7: the drop (the counter's whole plate, Ross small behind it); 5 and 8: the pop-up (closer)
const ROSS_WIDE = { cx: 540, cy: 800, E: 0.9 };
const DropShot = (body: RossBody, tag: boolean) => ({ f }: { f: number }) => {
  const m = M_WIDE, r = ROSS_WIDE;
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <RossBehind f={f} m={m} cx={r.cx} cy={r.cy} E={r.E} body={body} yc={1136} down={rossDown(f)} tag={tag} />
      <CounterFront m={m} />
      <Bell x={m.X(BELL.u)} y={m.Y(BELL.v)} s={m.s} press={0} ring={0} order={82} />
    </>
  );
};
const ROSS_CLOSE = { cx: 540, cy: 700, E: 1.45 };
const PopShot = (body: RossBody, tag: boolean) => ({ f }: { f: number }) => {
  const m = M_CLOSE, r = ROSS_CLOSE;
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <RossBehind f={f} m={m} cx={r.cx} cy={r.cy} E={r.E} body={body} yc={1330} down={rossDown(f)} tag={tag} />
      <CounterFront m={m} />
      <Bell x={m.X(BELL.u)} y={m.Y(BELL.v)} s={m.s} press={0} ring={0} order={82} />
    </>
  );
};

// ═════════════════════════════════════════════════════ shot 6: Chuck, louder (the latte picture's mitten comes down on "OWNER")
function Owner({ f }: { f: number }) {
  const m = cam(1.5, 300, 760), E = 1.55, ch = chuckAt("latte", 590, 650, E);
  return (
    <>
      <Plate m={m} file={PL10.window.file} edge={EDGE_WINDOW} />
      <ChuckP kind="latte" x={ch.x} y={ch.y - lunge(f) * 0.9} E={ch.E} order={40} pose={chuckPose("latte", f)} purple={purpleAt(f)} />
    </>
  );
}
// ═════════════════════════════════════════════════════ shot 9: Chuck squints and points at him (on SAME and GUY the figure jabs to the left)
function Point({ f }: { f: number }) {
  const m = cam(1.5, 400, 700), E = 1.4, ch = chuckAt("point", 690, 700, E);
  return (
    <>
      <Plate m={m} file={PL10.window.file} edge={EDGE_WINDOW} />
      <ChuckP kind="point" x={ch.x - lunge(f)} y={ch.y} E={ch.E} order={40} pose={chuckPose("point", f)} purple={purpleAt(f)} />
    </>
  );
}
// ═════════════════════════════════════════════════════ shots 15 and 18: Chuck shows his cup (cold, then warm: it steams)
function ShowCup({ f, cx, cy, E, view }: { f: number; cx: number; cy: number; E: number; view: ReturnType<typeof cam> }) {
  const ch = chuckAt("cup", cx, cy, E), lid = chuckPt("cup", cx, cy, E, 275, 318), sp = cupSprites(lid, cupSteam(f), t(f), E * 1.25);
  return (
    <>
      <Plate m={view} file={PL10.window.file} edge={EDGE_WINDOW} />
      <ChuckP kind="cup" x={ch.x} y={ch.y - hop(f) * 0.4} E={ch.E} order={40} pose={chuckPose("cup", f)} />
      <SteamCloud sprites={sp} order={172} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 13: THUNDER. The counter's whole plate with the ceiling cracked open over it, the light, the plaster, and Ross on a rope in a bedsheet
const GOD_WIDE = { cx: 540, cy: 800, E: 0.9 };
/** the rope, its knot above the halo and the two strands down to the harness round his chest, as frame px, for a Ross placed by rossAt(cx, cy, E) hanging `dy` px off his place */
function GodRope({ cx, cy, E, dy, order, f }: { cx: number; cy: number; E: number; dy: number; order: number; f: number }) {
  const px = cx, py = cy + 201 * E + dy;                                   // the neck pivot, frame px
  const knot: [number, number] = [px, py - 790 * E], armL: [number, number] = [px - 190 * E, py + 55 * E], armR: [number, number] = [px + 190 * E, py + 55 * E];
  const w = 24 * Math.max(0.55, E / 0.9);
  return (
    <>
      <RopeLine pts={ropePath(px, -260, knot[0], knot[1], 0, 1)} w={w} order={order} />
      <RopeLine pts={ropePath(knot[0], knot[1], armL[0], armL[1], 0, 2)} w={w * 0.8} order={order} />
      <RopeLine pts={ropePath(knot[0], knot[1], armR[0], armR[1], 0, 3)} w={w * 0.8} order={order} />
      <RopeLine pts={[[armL[0] - 6, armL[1]], [px - 90 * E, armL[1] + 22 * E], [px, armL[1] + 30 * E], [px + 90 * E, armL[1] + 22 * E], [armR[0] + 6, armR[1]]]} w={w * 0.8} order={order + 15} />
    </>
  );
}
function GodShot({ f }: { f: number }) {
  const m = M_WIDE, r = GOD_WIDE, tt = t(f), rope = ropeAt(f), ck = crackAt(f), ross = rossAt(r.cx, r.cy, r.E), pose = rossPose12(f, "god");
  const holeHW = 34 + 175 * ck.open;
  const fl = flashAt(f);
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <Ceiling order={20} />
      <CeilingCrack len={ck.len} open={ck.open} order={22} />
      <LightShaft cx={540} hw={holeHW} open={ck.open} floor={1180} f={f} order={30} />
      <GodRope cx={r.cx} cy={r.cy} E={r.E} dy={rope.y} order={36} f={f} />
      <RossP f={f} x={ross.x} y={ross.y - rope.y} E={r.E} order={40} body="god" pose={pose} />
      <CounterFront m={m} />
      <Bell x={m.X(BELL.u)} y={m.Y(BELL.v)} s={m.s} press={0} ring={0} order={82} />
      <PlasterRain f={f} t0={CRACK_T0 + 0.22} origin={[0, PY(CEIL_Y)]} spread={340} land={PY(1120)} k={0.6} order={150} />
      <Dust f={f} t0={CRACK_T0 + 0.46} at={[0, PY(CEIL_Y + 30)]} k={0.5} order={152} />
      {fl > 0.02 && <Wash color="#ffffff" op={Math.min(1, fl)} order={300} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 14: God, serene, in the light (the counter close-up); the rope goes up out of the frame
const GOD_SPEAK = { cx: 540, cy: 790, E: 1.35 };
function SpeakShot({ f }: { f: number }) {
  const m = M_SPEAK, r = GOD_SPEAK;
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <LightShaft cx={540} hw={200} open={1} floor={1500} f={f} order={30} top={-80} />
      <GodRope cx={r.cx} cy={r.cy} E={r.E} dy={0} order={36} f={f} />
      <RossBehind f={f} m={m} cx={r.cx} cy={r.cy} E={r.E} body="god" yc={1420} down={0} />
      <CounterFront m={m} />
      <Bell x={m.X(BELL.u)} y={m.Y(BELL.v)} s={m.s} press={0} ring={0} order={82} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 16: the two-shot. God on the left, Chuck at the end of the counter on the right holding his cup out; the steam jet from Ross's nearer ear, the cup steams
const TWO = { rx: 280, ry: 800, RE: 0.9, dist: 190 };
function TwoShot({ f }: { f: number }) {
  const m = M_TWO, tt = t(f), r = TWO, ross = rossAt(r.rx, r.ry, r.RE), pose = rossPose12(f, "god");
  const ears = ROSS_EARS.map(([hx, hy]) => headPt(pose, r.RE, ross.x, ross.y, hx, hy)) as [number, number][];
  const earR = toFrame(ears[1]), earL = toFrame(ears[0]);
  const cupX = earR[0] + r.dist, cupY = earR[1] - 8, E = 0.9, ccx = cupX + (511 - 195) * E, ccy = cupY - (400 - 266) * E, ch = chuckAt("hold", ccx, ccy, E);
  const cupLid = chuckPt("hold", ccx, ccy, E, 195, 338);
  const lv = steamLevel(f), jet = lv > 0 ? jetSprites(earR, 1, r.dist, tt, 0.9, 1) : [], plume = lv > 0 ? plumeSprites(earL, -1, tt, 0.8, 2, 0.55) : [];
  const small = 34 * r.RE / 1.7 * 0.8;
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <LightShaft cx={r.rx} hw={190} open={1} floor={1500} f={f} order={30} top={-80} />
      <GodRope cx={r.rx} cy={r.ry} E={r.RE} dy={0} order={36} f={f} />
      <RossBehind f={f} m={m} cx={r.rx} cy={r.ry} E={r.RE} body="god" yc={1150} down={0} />
      <CounterFront m={m} />
      <Bell x={m.X(BELL.u)} y={m.Y(BELL.v)} s={m.s} press={0} ring={0} order={82} />
      <ChuckP kind="hold" x={ch.x} y={ch.y} E={ch.E} order={90} pose={chuckPose("hold", f)} />
      <SteamCloud sprites={[...jet, ...plume]} order={170} />
      <SteamCloud sprites={cupSprites(cupLid, cupSteam(f), tt, E * 1.2)} order={172} />
      <Cork at={ears[0]} dir={-1} t={CORK_T[0] + (tt - CORK_T[0]) * 2.2} t0={CORK_T[0]} r={small} order={85} />
      <Cork at={ears[1]} dir={1} t={CORK_T[1] + (tt - CORK_T[1]) * 2.2} t0={CORK_T[1]} r={small} order={85} up={0.8} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 18: the sip. The 'hold' head low in the frame (his mouth near the bottom), so that the cup and its mitten (cut out of the cup picture) come up from below the frame's bottom edge, tilt at his lips on the slurp
// and go down, with no forearm in the picture; the set is moved, not pushed in: his stretched-out arm is out of the frame at the left (the figure sits a little left of the middle), the hanging one is below it. The latte steams (two thin wisps off the lid: the lumpy clouds of shot 19 read as white lumps on a face)
const SIP = { cx: 480, cy: 1138, E: 2.9 };
function SipShot({ f }: { f: number }) {
  const m = cam(1.7, 200, 600), tt = t(f), s = SIP, ch = chuckAt("hold", s.cx, s.cy, s.E), lips = chuckPt("hold", s.cx, s.cy, s.E, 510, 384);
  const c = RG.props.cupHand, k = s.E, w = c.w * k, h = c.h * k;
  const up = ease((tt - SIP_T[0]) / (SIP_T[1] - SIP_T[0])), down = ease((tt - SIP_T[3]) / (SIP_T[4] - SIP_T[3])), pos = up * (1 - down);
  const tilt = -14 * ease((tt - SIP_T[1]) / (SIP_T[2] - SIP_T[1])) * (1 - down);
  const cx = lips[0] + 8, cy = lerp(2330, lips[1] + 250, pos);            // (at the top of its way the cuff is past the bottom edge of the frame)
  const a = (tilt * Math.PI) / 180, L = h / 2 - 10 * k, lid: [number, number] = [cx - L * Math.sin(a), cy - L * Math.cos(a)];   // the middle of the lid, frame px, for the cup turned `tilt` degrees about its middle
  return (
    <>
      <Plate m={m} file={PL10.window.file} edge={EDGE_WINDOW} />
      <ChuckP kind="hold" x={ch.x} y={ch.y} E={ch.E} order={40} pose={chuckPose("hold", f)} />
      <Group x={PX(cx)} y={PY(cy)} rot={tilt}>
        <Picture file={c.file} w={w} h={h} x={0} y={0} order={90} alpha />
      </Group>
      <SteamWisps at={lid} t={tt} k={1.15} level={cupSteam(f)} order={172} />
    </>
  );
}

// ═════════════════════════════════════════════════════ shot 20: the halo droops on its wire, Ross sinks behind the counter, the rope is hauled up and the light goes out; the camera pushes in on the empty counter and its bell, and the reel loops by a cut to shot 1
const ROSS_END = { cx: 540, cy: 760, E: 0.95 };
function DroopShot({ f }: { f: number }) {
  const m = M_END, r = ROSS_END, tt = t(f), light = 1 - ease((tt - SINK_T[0]) / (SINK_T[1] - SINK_T[0]));
  const down = rossDown(f), hd = hideD(1173, r.cy, r.E, 480);
  const ross = rossAt(r.cx, r.cy, r.E), pose = rossPose12(f, "god");
  // the rope follows him down, and once he is out of sight it is hauled up out of the frame
  const reel = ease((tt - SINK_T[1]) / 0.1);
  return (
    <>
      <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
      <LightShaft cx={540} hw={190} open={light} floor={1500} f={f} order={30} top={-80} />
      {reel < 1 && <GodRope cx={r.cx} cy={r.cy} E={r.E} dy={down * hd - reel * 1800} order={36} f={f} />}
      <RossP f={f} x={ross.x} y={ross.y - down * hd} E={r.E} order={40} body="god" pose={pose} />
      <CounterFront m={m} />
      <Bell x={m.X(BELL.u)} y={m.Y(BELL.v)} s={m.s} press={0} ring={0} order={82} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the 19 shots
const FOCUS: Record<ShotId, [number, number]> = {
  bell: [540, 960], snap: [540, 900], build: [540, 900], manager: [540, 1139], drop: [540, 960], tie: [540, 960], owner: [540, 960], drop2: [540, 960], crown: [540, 960], point: [540, 960], flat: [540, 960], wantGod: [540, 900], scream: [540, 900],
  god: [540, 960], speaking: [540, 960], latte: [540, 960], steam: [540, 960], sip: [540, 960], cantI: [540, 960], droop: [838, 1255],   // (the bell's base: the push-in of shot 20 grows the bell where it stands)
};
const V = (id: ShotId, Inner: React.FC<{ f: number }>) => shotX(Inner, FOCUS[id]);
const REAL: Record<ShotId, React.FC<{ f: number }>> = {
  bell: V("bell", BellShot),
  snap: V("snap", ({ f }) => <Face f={f} kind="latte" view={WIN_FACE} cx={540} cy={870} E={1.6} />),
  build: V("build", ({ f }) => <Face f={f} kind="latte" view={cam(1.55, 300, 540)} cx={540} cy={830} E={2.0} />),
  manager: V("manager", ({ f }) => <Face f={f} kind="latte" view={cam(1.55, 300, 540)} cx={540} cy={830} E={2.0} shout />),
  drop: V("drop", DropShot("apron", false)),
  tie: V("tie", PopShot("tie", true)),
  owner: V("owner", Owner),
  drop2: V("drop2", DropShot("tie", true)),
  crown: V("crown", PopShot("king", false)),
  point: V("point", Point),
  flat: V("flat", ({ f }) => {
    const m = M_FLAT, r = { cx: 540, cy: 720, E: 1.8 };
    return (
      <>
        <Plate m={m} file={PL10.counter.file} edge={EDGE_COUNTER} />
        <RossBehind f={f} m={m} cx={r.cx} cy={r.cy} E={r.E} body="king" yc={1480} down={0} />
        <CounterFront m={m} />
      </>
    );
  }),
  wantGod: V("wantGod", ({ f }) => <Face f={f} kind="latte" view={cam(1.7, 234, 420)} cx={540} cy={800} E={1.5} />),
  scream: V("scream", ({ f }) => <Face f={f} kind="scream" view={cam(1.7, 234, 300)} cx={540} cy={650} E={2.25} shout />),
  god: V("god", GodShot),
  speaking: V("speaking", SpeakShot),
  latte: V("latte", ({ f }) => <ShowCup f={f} cx={640} cy={700} E={1.7} view={cam(1.5, 400, 700)} />),
  steam: V("steam", TwoShot),
  sip: V("sip", SipShot),
  cantI: V("cantI", ({ f }) => <ShowCup f={f} cx={640} cy={800} E={1.3} view={cam(1.6, 590, 760)} />),
  droop: V("droop", DroopShot),
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = REAL;
export const ART: Record<ShotId, string> = { bell: "cup mirrored", snap: "hold mirrored>latte", build: "latte", manager: "latte", drop: "apron", tie: "tie", owner: "latte", drop2: "tie", crown: "king", point: "point", flat: "king", wantGod: "latte", scream: "scream", god: "god", speaking: "god", latte: "cup", steam: "god+hold", sip: "hold+cup", cantI: "cup", droop: "god" };
