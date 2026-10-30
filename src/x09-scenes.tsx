import React from "react";
import { Glow, Inked, Poly, ellipsePts, ribbon, xf } from "./sp-puppet";
import { view } from "./pen-stage";
import { Cloud, Cork, PopBurst } from "./x08-fx";
import { CashFan, ClockDebris, ClockFace, IceHit, IceShower, Pen, Pyro, RingMarks, SpeedLines, Tape, TapeRip, TippedGlass, WaterSplash, YellowGlass, earSteam } from "./x09-draw";
import { Mitten } from "./lips8-fx";
import { BoardInk, DoodleInk, LabelText, NotebookInk, ReaderScreen, ScreenTitle, useHandFonts } from "./x09-ui";
import { boardState, noteState } from "./x09-parts";
import { guruMove, denisePose9, rossPose9, rossHeadsetPose, jitter } from "./x09-act";
import { FLAGS, H, W, shotX } from "./x09-shared";
import {
  CR, DENISE, FLAT, GU, GURU_DISC, GrinMouth, HEADSET, HeadsetProp, PL, PROP, Person, Plate, RG, RossHeadsetP, RossP, Spr, at, cam, guruK, plateOf, rect, seatOf, seatedAt, DeniseP, locOf, type Img,
} from "./x09-stage";
import {
  ALARM_T, BEEP_T, BLUR_T, BOARD1_T, BURST_T, CLOCK_SMASH_T, CORK_T, FPS, GLASS_UP_T, ICE_HIT_T, PYRO1_T, PYRO2_T, RIP_T, SLAM_T, SPLASH1_T, SPLASH2_T, TAPE_T, THUD_T, VEIN_T, WASH_T,
  CREAK_T, HEADSET_T, RUSTLE_T, SHOT_IDS, WHOOSH_T, cashUp, ease, flashAt, jumpAt, mouthAt, penUp, shotAt, steamLevel, tapeBulge, turnAt, twos, type ShotId, CHUG_T, JUMP_T, popP, clamp01, lerp, blinkOf,
} from "./x09-sched";

// The scenes of x09 "Habits of the Rich": one canvas per shot, hard cuts. Each is the art of the shot (the plates, sprites and puppets cut from out/x09-cast by scripts/x09-prep.py, src/x09-rig.json) under the effects and writing drawn
// in code (src/x09-draw.tsx, src/x09-ui.tsx). Positions are plate px (768 x 1344 pictures) put on the frame by a view `m` (src/x09-stage.tsx cam): a shot's `m` never moves, the camera's push is the canvas's zoom (src/x09-shared.tsx).
const t = (f: number) => f / FPS;
const Z = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const sm = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };

/** the white flash of the pyro and of the slam */
const Flash = ({ f }: { f: number }) => { const k = flashAt(f); return k > 0.02 ? <Poly pts={[[-1200, 1200], [1200, 1200], [1200, -1200], [-1200, -1200]]} color="#ffffff" order={300} op={0.7 * k} /> : null; };

// ═════════════════════════════════════════════════════ the stage (shots 1 and 28): the screen under its title, the two fire columns, the tub of ice; the guru's cannonball and Ross's
const STAGE_S = 1.55, STAGE = cam(STAGE_S, 384, 814);
const FLOOR = "#b58c56";                                                                   // the stage floor, carried on below the plate
const KT = 0.5, TUB = PROP.tub, TUB_U = 384, TUB_V = 1130;                              // the tub: plate px per sprite px, its bottom middle
const tubPt = (sx: number, sy: number) => plateOf(TUB.w / 2, TUB.h, TUB_U, TUB_V, KT, false, sx, sy);
const KG = 0.72;                                                                           // plate px per sprite px of the guru's master pose: he stands 565 plate px tall
const SCR = PL.stage.screen;                                                               // the screen's glass [x0, y0, x1, y1]
const COLS = PL.stage.columns as unknown as [number, number, number, number][];   // [x0, x1, top, bottom] of the two fire columns

function StageSet({ f, m, splashT, pyroT }: { f: number; m: typeof STAGE; splashT: number; pyroT: number }) {
  const age = t(f) - splashT, rim = tubPt(461, 70), at0: [number, number] = [m.X(rim[0]), m.Y(rim[1])];
  return (
    <>
      <Plate m={m} file={PL.stage.file} edge={{ bottom: FLOOR }} />
      <ScreenTitle x={m.X((SCR[0] + SCR[2]) / 2)} y={m.Y((SCR[1] + SCR[3]) / 2)} w={(SCR[2] - SCR[0]) * m.s} h={(SCR[3] - SCR[1]) * m.s} shine={(t(f) * 0.4) % 1} order={20} op={FLAGS.cover ? 0.16 : 1} />
      <Spr m={m} d={TUB} ax={TUB.w / 2} ay={TUB.h} u={TUB_U} v={TUB_V} k={KT} order={40} />
      {COLS.map((c, i) => <Pyro key={i} x={m.X((c[0] + c[1]) / 2)} base={m.Y(c[2] - 6)} age={t(f) - pyroT} f={f} k={m.s / 1.4286} order={60 + 2 * i} seed={i + 1} />)}
      <WaterSplash at={at0} age={age} k={m.s / 1.4286 * 0.9} order={80} />
      <IceShower at={at0} age={age} k={m.s / 1.4286} order={90} />
      <Flash f={f} />
    </>
  );
}
/** the cannonball: a sprite dropped from the air into the tub on `landT`: head's middle (u, v) in plate px, its turn and squash */
function cannonPath(f: number, t0: number, landT: number, bottom: number, drop = 300): { u: number; v: number; rot: number; sx: number; sy: number } {
  const tt = t(f), G = (2 * drop) / ((landT - t0) ** 2), a = tt - landT, w = Z((tt - t0) / (landT - t0), 0, 1);       // the fall: from `drop` plate px above the landing point, gravity G (plate px/s^2)
  const vLand = bottom;                                                                     // the head's middle where it lands
  if (a < 0) return { u: 384 + 6 * Math.sin(tt * 9), v: vLand - 0.5 * G * a * a, rot: 14 * (1 - w) - 6, sx: 1 - 0.04 * w, sy: 1 + 0.05 * w };
  const sink = 120 * sm(0, 0.22, a), squash = Math.exp(-a / 0.08);
  return { u: 384, v: vLand + sink, rot: -6 * Math.exp(-a / 0.2), sx: 1 + 0.16 * squash, sy: 1 - 0.18 * squash };
}
const CANNON_MOUTH: [number, number, number, number] = [165, 388, 290, 440];
const GOLD_MOUTH: [number, number, number, number] = [168, 336, 262, 384];
const Scene1 = shotX(({ f }) => {
  const m = STAGE, d = GU.cannon, k = guruK("cannon", KG), p = cannonPath(f, 0, SPLASH1_T, 560), mv = guruMove(f);
  const mouth = mouthAt("GURU", f);
  return (
    <>
      <StageSet f={f} m={m} splashT={SPLASH1_T} pyroT={PYRO1_T} />
      <Spr m={m} d={d} ax={d.disc[0]} ay={d.disc[1]} u={p.u} v={p.v + mv.bob * -0.1} k={k} rot={p.rot + mv.tilt * 0.4} sx={p.sx} sy={p.sy} order={35}>
        <GrinMouth box={CANNON_MOUTH} ax={d.disc[0]} ay={d.disc[1]} skin={d.skin} shape={mouth} order={36} />
      </Spr>
    </>
  );
});
const Scene28 = shotX(({ f }) => {
  const m = STAGE, d = GU.gold as unknown as Img, k = 0.4, p = cannonPath(f, shotAt(f).t0, SPLASH2_T, 560);
  const mouth = mouthAt("ROSS", f);
  return (
    <>
      <StageSet f={f} m={m} splashT={SPLASH2_T} pyroT={PYRO2_T} />
      <Spr m={m} d={d} ax={220} ay={235} u={p.u} v={p.v} k={k} rot={p.rot} sx={p.sx} sy={p.sy} order={35}>
        <GrinMouth box={GOLD_MOUTH} ax={220} ay={235} skin="#fcd590" shape={mouth} order={36} />
      </Spr>
    </>
  );
});

// ═════════════════════════════════════════════════════ the guru in the close-ups (shots 3, 4, 7, 8, 23): the plate with the title dimmed, a warm spot behind him, his painted pose that bounces with his voice
function StageBack({ f, m, spot, dim = 0.2, tub = false, side = false, orderBase = 0 }: { f: number; m: ReturnType<typeof cam>; spot?: [number, number]; dim?: number; tub?: boolean; side?: boolean; orderBase?: number }) {
  return (
    <>
      <Plate m={m} file={PL.stage.file} edge={{ bottom: FLOOR, top: "#141414", side: side ? "#e4b023" : undefined }} order={orderBase} />
      <ScreenTitle x={m.X((SCR[0] + SCR[2]) / 2)} y={m.Y((SCR[1] + SCR[3]) / 2)} w={(SCR[2] - SCR[0]) * m.s} h={(SCR[3] - SCR[1]) * m.s} shine={(t(f) * 0.4) % 1} order={orderBase + 20} op={dim} />
      {spot && <Glow x={m.X(spot[0])} y={m.Y(spot[1])} rx={330 * m.s} ry={360 * m.s} op={0.5} order={orderBase + 22} color="rgba(255,226,150,1)" />}
      {tub && <Spr m={m} d={TUB} ax={TUB.w / 2} ay={TUB.h} u={TUB_U} v={TUB_V} k={KT} order={orderBase + 40} />}
    </>
  );
}
const GURU_MOUTH: Record<"guru" | "toast", [number, number, number, number]> = { guru: [233, 347, 387, 415], toast: [266, 344, 419, 411] };
/** a talking guru in one of his painted poses (guru / toast) with the head's middle on the plate point (u, v) */
function Guru({ f, m, pose, u, v, kk, rot = 0, sx = 1, sy = 1, order = 50, talk = true, children }: { f: number; m: ReturnType<typeof cam>; pose: "guru" | "toast"; u: number; v: number; kk: number; rot?: number; sx?: number; sy?: number; order?: number; talk?: boolean; children?: (g: { ax: number; ay: number; k: number }) => React.ReactNode }) {
  const d = GU[pose], k = guruK(pose, kk), mv = guruMove(f), [ax, ay] = [d.disc[0], d.disc[1]];
  return (
    <Spr m={m} d={d} ax={ax} ay={ay} u={u} v={v - mv.bob * k * 0.6} k={k} rot={rot + mv.tilt * 0.45} sx={sx * mv.pulse} sy={sy * mv.pulse} order={order}>
      {talk && <GrinMouth box={GURU_MOUTH[pose]} ax={ax} ay={ay} skin={d.skin} shape={mouthAt("GURU", f)} order={order + 1} />}
      {children?.({ ax, ay, k })}
    </Spr>
  );
}

// shot 3: he bursts out of the tub on the ringing alarm clock and smashes it on "FOUR"
const Scene3 = shotX(({ f }) => {
  const tt = t(f), m = cam(1.7, 470, 900), d = GU.smash, kk = 0.72, k = guruK("smash", kk), clk = PROP.clock, kc = 0.32;
  const CU = 540, CV = 1150 - (clk.h - clk.face[1]) * kc;                                                      // the clock stands on the floor in front of him: its face's middle (plate px)
  const HU = 596, HV = 770, land = BURST_T + 0.3;                                                              // where his head's middle is in the crouch behind the clock (plate px)
  // the leap: from the tub (his head just above the ice) in an arc to the crouch; then the wind-up (he rises and shakes) and the smash on "FOUR"
  const a = clamp01((tt - BURST_T) / (land - BURST_T)), arc = 4 * a * (1 - a), wind = sm(land + 0.1, CLOCK_SMASH_T - 0.05, tt) * (tt < CLOCK_SMASH_T ? 1 : 0);
  const hit = tt >= CLOCK_SMASH_T ? Math.exp(-(tt - CLOCK_SMASH_T) / 0.1) : 0;
  const hu = tt < BURST_T ? 384 : lerp(384, HU, ease(a)), hv = (tt < BURST_T ? 905 : lerp(905, HV, ease(a)) - 250 * arc) - 70 * wind + 55 * hit;
  const clockR = clk.face[2], ringing = tt >= ALARM_T && tt < CLOCK_SMASH_T, smashed = tt >= CLOCK_SMASH_T, shake = ringing ? 5 * Math.sin(tt * 90) : 0;
  const mv = guruMove(f), bells = at(clk.face[0], clk.face[1], clk.bells[0], clk.bells[1]);
  return (
    <>
      <StageBack f={f} m={m} spot={[560, 760]} tub side />
      {tt < BURST_T && <Spr m={m} d={GU.cannon} ax={GU.cannon.disc[0]} ay={GU.cannon.disc[1]} u={384} v={850} k={guruK("cannon", kk)} order={30} />}
      {tt >= BURST_T && (
        <Spr m={m} d={d} ax={d.disc[0]} ay={d.disc[1]} u={hu} v={hv - mv.bob * k * 0.5} k={k} rot={-12 * arc + 10 * wind * (1 - hit) + mv.tilt * 0.4} sx={1 + 0.12 * hit} sy={1 - 0.14 * hit} order={50} />
      )}
      {!smashed && (
        <Spr m={m} d={clk} ax={clk.face[0]} ay={clk.face[1]} u={CU + shake} v={CV} k={kc} rot={ringing ? 2 * Math.sin(tt * 70) : 0} order={60}>
          <ClockFace x={0} y={0} r={clockR} order={61} />
          {ringing && <RingMarks x={bells[0]} y={bells[1]} s={3.0} f={f} order={61} />}
        </Spr>
      )}
      <WaterSplash at={[m.X(tubPt(461, 70)[0]), m.Y(tubPt(461, 70)[1] - 40)]} age={tt - BURST_T} k={m.s / 1.6} order={55} seed={3} />
      <ClockDebris at={[m.X(CU), m.Y(CV)]} age={tt - CLOCK_SMASH_T} k={m.s / 1.4} order={110} />
      {tt >= CLOCK_SMASH_T && tt < CLOCK_SMASH_T + 0.12 && <Glow x={m.X(CU)} y={m.Y(CV)} rx={170 * m.s * 0.5} ry={150 * m.s * 0.5} op={0.9} order={108} color="rgba(255,244,190,1)" />}
      <Flash f={f} />
    </>
  );
});

// shot 4: the guru's face, he slaps tape over his mouth on "MOUTH" and keeps yelling
const Scene4 = shotX(({ f }) => {
  const tt = t(f), s = 3.0, m = cam(s, 384, 520), kk = 0.716, a = tt - TAPE_T;
  const b = GU.guru, [ax, ay] = [b.disc[0], b.disc[1]], bx = (GURU_MOUTH.guru[0] + GURU_MOUTH.guru[2]) / 2, by = (GURU_MOUTH.guru[1] + GURU_MOUTH.guru[3]) / 2, [tx, ty] = at(ax, ay, bx, by);
  return (
    <>
      <StageBack f={f} m={m} spot={[384, 440]} dim={0.14} />
      <Guru f={f} m={m} pose="guru" u={384} v={440} kk={kk} talk={tt < TAPE_T}>
        {() => a >= 0 && <Tape x={tx} y={ty - 4} w={214} h={58} rot={-3} pop={1 + 0.35 * Math.exp(-a / 0.05)} bulge={tapeBulge(f)} order={60} />}
      </Guru>
      <Flash f={f} />
    </>
  );
});

// shot 7: the tape comes off ("DRINK!"), the glass is up; shot 8: he chugs it, the glass at his mouth
const Scene7 = shotX(({ f }) => {
  const tt = t(f), s = 2.6, m = cam(s, 384, 520), kk = 0.69, hu = 384 + 70, hv = 510 - 8 * Math.exp(-Math.max(0, tt - GLASS_UP_T) / 0.1);
  const b = GU.toast, [ax, ay] = [b.disc[0], b.disc[1]], bx = (GURU_MOUTH.toast[0] + GURU_MOUTH.toast[2]) / 2, by = (GURU_MOUTH.toast[1] + GURU_MOUTH.toast[3]) / 2, [tx, ty] = at(ax, ay, bx, by), rip = (tt - RIP_T) / 0.3;
  return (
    <>
      <StageBack f={f} m={m} spot={[hu, hv]} dim={0.14} />
      <Guru f={f} m={m} pose="toast" u={hu} v={hv} kk={kk} talk={tt >= RIP_T + 0.05}>
        {() => (tt < RIP_T ? <Tape x={tx} y={ty - 4} w={226} h={58} rot={-3} order={60} /> : <TapeRip x={tx} y={ty - 4} w={226} h={58} rot={-3} a={rip} order={60} />)}
      </Guru>
    </>
  );
});
const Scene8 = shotX(({ f }) => {
  const tt = t(f), s = 3.3, m = cam(s, 384, 520), kk = 0.72, hu = 384 - 10, hv = 540;
  const b = GU.toast, [ax, ay] = [b.disc[0], b.disc[1]], [mx, my] = at(ax, ay, 340, 388);                      // the mouth, where the rim of the glass goes
  const come = sm(CHUG_T - 0.3, CHUG_T - 0.04, tt), tip = sm(CHUG_T - 0.1, CHUG_T + 0.25, tt), drain = sm(CHUG_T, CHUG_T + 0.7, tt);
  const rot = lerp(-8, 112, tip), fill = 0.9 - 0.9 * drain, R = (rot * Math.PI) / 180, dir: [number, number] = [Math.sin(R), -Math.cos(R)];   // dir: from the rim along the glass to its base
  const gx = lerp(mx - 520, mx + 6, come), gy = lerp(my - 60, my + 6, come), gulp = tt >= CHUG_T ? 0.03 * Math.abs(Math.sin((tt - CHUG_T) * 24)) : 0;
  const GS = 1.5, hand: [number, number] = [gx + dir[0] * 150 * GS * 0.62, gy + dir[1] * 150 * GS * 0.62], arm: [number, number] = [hand[0] + dir[0] * 330, hand[1] + dir[1] * 330];
  return (
    <>
      <StageBack f={f} m={m} spot={[hu, hv]} dim={0.14} />
      <Guru f={f} m={m} pose="toast" u={hu} v={hv} kk={kk} talk={tt < CHUG_T - 0.3} sx={1 + gulp} sy={1 - gulp}>
        {() => (
          <>
            <Poly pts={ribbon([[hand[0], hand[1], 38], [arm[0], arm[1], 46]])} color="#5b4308" order={69.8} />
            <Poly pts={ribbon([[hand[0], hand[1], 33], [arm[0], arm[1], 41]])} color="#d9ae22" order={69.9} />
            <TippedGlass x={gx} y={gy} s={GS} rot={rot} fill={Math.max(0, fill)} order={70} />
            <Mitten x={hand[0]} y={hand[1]} rot={rot + 180} s={0.95} skin={b.skin} ink="#3a2a18" order={71} flip />
          </>
        )}
      </Guru>
    </>
  );
});

// shot 23: the guru at the edge of the stage with the card reader, caught: the reader beeps, he freezes and gulps
const Scene23 = shotX(({ f }) => {
  const tt = t(f), s = 2.2, m = cam(s, 420, 880), kk = 0.9, d = GU.caught, k = guruK("caught", kk), [ax, ay] = [d.disc[0], d.disc[1]];
  const freeze = tt >= BEEP_T, gulpT = tt - 24.5, gulp = gulpT >= 0 && gulpT < 0.3 ? Math.sin((gulpT / 0.3) * Math.PI) : 0;
  const [rx, ry, rw, rh, ra] = d.reader as number[], [rcx, rcy] = at(ax, ay, rx, ry);
  return (
    <>
      <StageBack f={f} m={m} spot={[430, 780]} dim={0.2} />
      <Spr m={m} d={d} ax={ax} ay={ay} u={430 + (freeze ? 0 : 5 * Math.sin(tt * 40))} v={800 - 6 * gulp} k={k} rot={freeze ? 0 : 2 * Math.sin(tt * 30)} sx={1 + 0.02 * gulp} sy={1 - 0.03 * gulp} order={50}>
        <ReaderScreen x={rcx} y={rcy} w={rw * 1.04} h={rh * 1.1} rot={-(ra - 180)} tap={freeze ? 1 : 0} order={55} />
      </Spr>
    </>
  );
});

// ═════════════════════════════════════════════════════ the crowd: three rows of chairs in front of the painted audience (the plate), the six sprites repeated (some mirrored) on the seventeen chairs, Ross and Denise in the front row
const CARPET = "#5f1b18";
type Occ = { row: number; i: number; who: number | "ross" | "denise"; flip?: boolean };
const SEATING: Occ[] = [
  { row: 2, i: 0, who: 5 }, { row: 2, i: 1, who: 3 }, { row: 2, i: 2, who: "ross" }, { row: 2, i: 3, who: "denise" }, { row: 2, i: 4, who: 1 },
  { row: 1, i: 0, who: 6 }, { row: 1, i: 1, who: 2 }, { row: 1, i: 2, who: 4 }, { row: 1, i: 3, who: 5, flip: true }, { row: 1, i: 4, who: 3, flip: true }, { row: 1, i: 5, who: 2, flip: true },
  { row: 0, i: 0, who: 4, flip: true }, { row: 0, i: 1, who: 1, flip: true }, { row: 0, i: 2, who: 6, flip: true }, { row: 0, i: 3, who: 3 }, { row: 0, i: 4, who: 4 }, { row: 0, i: 5, who: 5, flip: true },
];
const ROW_TINT = ["#c9c9d2", "#e0e0e6", "#ffffff"];                          // the far rows are a little dimmer, as the painted audience behind them is
const WIDE = cam(1.8, 384, 1000);
type Mode = "glass" | "pens" | "turn" | "cash";
/** Denise's pen hand in her body's rig px (the picture's), as puppet px from her neck pivot (y up): the place of her glass, her cash */
const DEN_HAND = locOf(DENISE, 294, 824);
/** the room: the plate, and everybody on the chairs in the state of `mode` at frame f. `ross`: Ross sits in his chair (shots 9 and 10), else the chair is empty */
function Crowd({ f, m, mode, ross, order = 0 }: { f: number; m: ReturnType<typeof cam>; mode: Mode; ross: boolean; order?: number }) {
  const tt = t(f);
  return (
    <>
      <Plate m={m} file={PL.crowd.file} edge={{ bottom: CARPET, side: CARPET }} order={order} />
      {SEATING.map((o, n) => {
        const seat = seatOf(o.row, o.i), tint = ROW_TINT[o.row], ord = [30, 60, 90][o.row] + o.i * 0.3 + order;
        if (o.who === "ross") {
          if (!ross) return null;
          const p = seatedAt("ross", seat);
          return <RossP key={n} f={f} x={m.X(p.u)} y={m.Y(p.v)} E={p.k * m.s} order={ord} body="chair" pose={rossPose9(f, "chair")} />;
        }
        if (o.who === "denise") {
          const p = seatedAt("denise", seat), E = p.k * m.s, up = mode === "glass" ? Math.min(1, jumpAt(n, f) / 60) : 0, cash = mode === "cash" ? cashUp(n, f) : 0;
          const pose = denisePose9(f), hx = DEN_HAND[0], hy = DEN_HAND[1];
          const px = m.X(p.u) + hx * E, py = m.Y(p.v) + hy * E;
          return (
            <React.Fragment key={n}>
              <DeniseP x={m.X(p.u)} y={m.Y(p.v) + jumpAt(n, f) * 0.25 * (mode === "glass" ? 1 : 0)} E={E} order={ord} pose={pose} />
              {mode === "glass" && up > 0.05 && <YellowGlass x={px - 6 * E} y={py + 80 * E + jumpAt(n, f) * 0.25} s={1.25 * E} rot={6} level={0.85} order={ord + 22} />}
              {mode === "cash" && cash > 0.3 && <CashFan x={px} y={py + 20 * E} s={0.9 * E} rot={-8} n={4} order={ord + 22} />}
            </React.Fragment>
          );
        }
        const flip = !!o.flip, who = o.who as number;
        if (mode === "glass") {
          const jp = jumpAt(n, f), upSt = jp > 0 || tt >= JUMP_T + 0.02 + 0.14 * ((n * 0.382) % 1) ? "up" : "seat";
          return (
            <Person key={n} m={m} row={o.row} i={o.i} who={who} st={upSt} flip={flip} lift={jp / m.s} order={ord} tint={tint}>
              {({ k, hand }) => upSt === "up" && hand ? <YellowGlass x={hand[0]} y={hand[1] + 36} s={1.15} rot={(n % 2 ? 1 : -1) * 6} level={0.85} order={ord + 22} /> : null}
            </Person>
          );
        }
        if (mode === "pens") {
          const up = penUp(n, f), upSt = up > 0.3 ? "up" : "seat";
          return (
            <Person key={n} m={m} row={o.row} i={o.i} who={who} st={upSt} flip={flip} order={ord} tint={tint}>
              {({ hand }) => upSt === "up" && hand ? <Pen x={hand[0]} y={hand[1] + 60} s={1.5} rot={(n % 2 ? 1 : -1) * 8} color={["#2a62d9", "#c62a47", "#1c1c22", "#2a9d5c", "#7a3fc4", "#e0861a", "#d6336c"][n % 7]} order={ord + 22} /> : null}
            </Person>
          );
        }
        if (mode === "cash") {
          const up = cashUp(n, f), upSt = up > 0.3 ? "up" : "seat";
          return (
            <Person key={n} m={m} row={o.row} i={o.i} who={who} st={upSt} flip={flip} lift={up > 0.3 ? 14 * Math.exp(-(tt - RUSTLE_T) / 0.12) : 0} order={ord} tint={tint}>
              {({ hand }) => upSt === "up" && hand ? <CashFan x={hand[0]} y={hand[1] + 20} s={1.9} rot={(n % 2 ? 1 : -1) * 10} n={3 + (n % 3)} order={ord + 22} /> : null}
            </Person>
          );
        }
        // turn: every head turns to the right (the edge of the stage), one after another; the sprite is swapped with a squash
        const tp = turnAt(n, f), turned = tp > 0.5, sq = 1 - 0.1 * Math.sin(Math.PI * Z(tp, 0, 1));
        return <Person key={n} m={m} row={o.row} i={o.i} who={who} st={turned ? "turn" : "seat"} flip={turned ? false : flip} sx={sq} order={ord} tint={tint} />;
      })}
    </>
  );
}
const WideShot = (mode: Mode, ross: boolean) => shotX(({ f }) => (
  <>
    <Crowd f={f} m={WIDE} mode={mode} ross={ross} />
    <Flash f={f} />
  </>
));
const Scene9 = WideShot("glass", true);
const Scene13 = WideShot("pens", false);
const Scene22 = WideShot("turn", false);
const Scene25 = WideShot("cash", false);

// ═════════════════════════════════════════════════════ Ross and Denise in the front row, close: the dim painted audience behind them (the plate, zoomed), the figure placed by its head
const CLOSE_M = cam(3.4, 384, 500);
function CloseBack({ m = CLOSE_M }: { m?: ReturnType<typeof cam> }) {
  return (
    <>
      <Plate m={m} file={PL.crowd.file} edge={{ bottom: CARPET, side: CARPET }} />
      <Poly pts={[[-2400, 2400], [2400, 2400], [2400, -2400], [-2400, -2400]]} color="#10060a" order={1} op={0.28} />
    </>
  );
}
/** a point of a puppet's head (puppet px from its neck pivot, y up) as a panel point, the puppet placed at (x, y) at scale E in `pose` (the head's tilt and dip, the body's breath) */
function headPt(pose: { tilt: number; bob: number; breath: number; dx?: number; hdx?: number }, E: number, x: number, y: number, hx: number, hy: number): [number, number] {
  const a = (pose.tilt * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [x + (pose.dx ?? 0) + (hx * c - hy * s + (pose.hdx ?? 0)) * E, y + pose.breath * E + (hx * s + hy * c + pose.bob) * E];
}
const ROSS_EARS: [number, number][] = [locOf(RG.puppets.ross, 660.9, 647.0), locOf(RG.puppets.ross, 997.7, 677.5)];   // the two tunnels in his ears (head px)
const ROSS_BROW: [number, number] = [-30, 332];                                                                      // his forehead, where the ice cube lands

// shot 2: an ice cube smacks Ross's forehead; Denise next to him is already writing
const Scene2 = shotX(({ f }) => {
  const tt = t(f), E = 1.45, rx = 400, ry = 900 + 201 * E - 0, pose = rossPose9(f, "chair");
  const rp = { x: rx - 540, y: 960 - ry }, hit = headPt(pose, E, rp.x, rp.y, ROSS_BROW[0], ROSS_BROW[1]);
  const dE = 1.3, dpose = denisePose9(f);
  return (
    <>
      <CloseBack />
      <DeniseP x={1010 - 540} y={960 - (930 + 173 * dE)} E={dE} order={80} pose={dpose} />
      <RossP f={f} x={rp.x} y={rp.y} E={E} order={90} body="chair" pose={pose} />
      <IceHit to={hit} age={tt - ICE_HIT_T} k={1.5} order={140} />
      <Flash f={f} />
    </>
  );
});
// shot 6: a vein pops up on his forehead and throbs
const Scene6 = shotX(({ f }) => {
  const E = 1.6, ry = 880 + 201 * E, pose = rossPose9(f, "chair");
  return (
    <>
      <CloseBack />
      <RossP f={f} x={0} y={960 - ry} E={E} order={90} body="chair" pose={pose} />
    </>
  );
});
// shot 10: his ear tunnels shoot out like corks, steam whistles out of the holes
const Scene10 = shotX(({ f }) => {
  const tt = t(f), E = 1.5, ry = 880 + 201 * E, pose = rossPose9(f, "chair"), x = 0, y = 960 - ry;
  const ears = ROSS_EARS.map(([hx, hy]) => headPt(pose, E, x, y, hx, hy)) as [number, number][];
  const lv = steamLevel(f), sp = lv > 0 ? [...earSteam(ears[0], -1, tt, E / 1.7, 1), ...earSteam(ears[1], 1, tt, E / 1.7, 2)] : [];
  return (
    <>
      <CloseBack />
      <RossP f={f} x={x} y={y} E={E} order={90} body="chair" pose={pose} vein />
      {sp.length > 0 && <Cloud sprites={sp} order={170} />}
      <Cork at={ears[0]} dir={-1} t={tt} t0={CORK_T[0]} r={34 * E / 1.7} order={175} />
      <Cork at={ears[1]} dir={1} t={tt} t0={CORK_T[1]} r={34 * E / 1.7} order={175} up={0.8} />
      <PopBurst at={ears[0]} t={tt} t0={CORK_T[0]} R={70 * E / 1.7} order={174} />
      <PopBurst at={ears[1]} t={tt} t0={CORK_T[1]} R={70 * E / 1.7} order={174} />
    </>
  );
});
// shot 24: Denise looks up from her notebook at Ross: "How much is YOUR course?"
const Scene24 = shotX(({ f }) => {
  const E = 1.5, ry = 880 + 173 * E, pose = denisePose9(f);
  return (
    <>
      <CloseBack />
      <DeniseP x={0} y={960 - ry} E={E} order={90} pose={pose} />
    </>
  );
});

// ═════════════════════════════════════════════════════ the whiteboard room: the plate of the board and its easel, Ross standing in front of it with his marker's tip on a point of the plate. The board is BR of Ross's scale
// (plate px -> frame px per rig px), so a close-up of him is a close-up of the board too; the view is built from where his marker's tip is, so the writing and the marker always meet
const BR = 0.9;
const BSURF = PL.board.surface;                                                                 // [x0, y0, x1, y1] of the white surface (plate px)
const WALLC = PL.board.wall, BFLOOR = PL.board.floorColour;
const TIP: Record<"board" | "slam", [number, number]> = { board: [-380, 30], slam: [-443, 14] };   // the marker's tip, rig px from his neck pivot (x right, y down)
function boardView(E: number, px: number, py: number, body: "board" | "slam", tipU: number, tipV: number) {
  const sb = BR * E, [tx, ty] = TIP[body], tipX = px + tx * E, tipY = py - ty * E;              // the tip, panel px
  return view(sb, tipU - (tipX + W / 2) / sb, tipV - (H / 2 - tipY) / sb);
}
/** the board's plate in a view, the spin of shot 11 when `spin` (the guru's side, then the turn, then the clean side), the writing on it */
function BoardPlate({ f, m, spin = false, ink = true, order = 0 }: { f: number; m: ReturnType<typeof cam>; spin?: boolean; ink?: boolean; order?: number }) {
  const ok = useHandFonts(), tt = t(f), [x0, y0, x1, y1] = BSURF, cx = m.X((x0 + x1) / 2), cy = m.Y((y0 + y1) / 2), w = (x1 - x0) * m.s, h = (y1 - y0) * m.s;
  const p = spin ? clamp01((tt - WHOOSH_T) / 0.3) : 1, theta = (180 * ease(p) * Math.PI) / 180, cs = Math.cos(theta), mid = p > 0 && p < 1;
  return (
    <>
      <Plate m={m} file={PL.board.file} edge={{ top: WALLC, side: WALLC, sideLow: BFLOOR, split: PL.board.floor, bottom: BFLOOR }} order={order} />
      {mid && <Poly pts={rect(m, 36, 56, 736, 990)} color={WALLC} order={order + 1} />}
      {mid && <Poly pts={rect(m, 383.5 - 346 * Math.abs(cs), 60, 383.5 + 346 * Math.abs(cs), 985)} color="#8f969b" order={order + 2} />}
      {mid && <Poly pts={rect(m, 383.5 - 330.5 * Math.abs(cs), 75, 383.5 + 330.5 * Math.abs(cs), 969)} color="#fbfbf9" order={order + 3} />}
      {spin && p < 0.5 && <DoodleInk x={mid ? m.X(383.5) : cx} y={cy} w={mid ? w * Math.abs(cs) : w} h={h} order={order + 4} />}
      {ink && p >= 0.5 && <BoardInk x={mid ? m.X(383.5) : cx} y={cy} w={mid ? w * Math.abs(cs) : w} h={h} st={boardState(f)} order={order + 4} ready={ok} />}
    </>
  );
}
/** Ross at the board: the plate under his marker, himself at (px, py) (panel px, his neck pivot) at scale E in the picture `body` */
function BoardRoom({ f, E, px, py, body, tipU, tipV, spin = false, order = 0, moving, fixed, children }: { f: number; E: number; px: number; py: number; body: "board" | "slam"; tipU: number; tipV: number; spin?: boolean; order?: number; moving?: [number, number]; fixed?: ReturnType<typeof cam>; children?: (m: ReturnType<typeof cam>) => React.ReactNode }) {
  const m = fixed ?? boardView(E, px, py, body, tipU, tipV), [tx, ty] = TIP[body];
  // `moving`: the tip is somewhere else on the (fixed) plate now: Ross is carried there, the plate stays
  const rx = moving ? m.X(moving[0]) - tx * E : px, ry = moving ? m.Y(moving[1]) + ty * E : py;
  return (
    <>
      <BoardPlate f={f} m={m} spin={spin} order={order} />
      <RossP f={f} x={rx} y={ry} E={E} order={order + 60} body={body} pose={rossPose9(f, body)} />
      {children?.(m)}
    </>
  );
}
const whip = (f: number, t0: number, d = 0.2) => { const a = clamp01((t(f) - t0) / d); return 1 - ease(a) + 0.08 * Math.sin(a * Math.PI) * (a < 1 ? 1 : 0); };    // 1 -> 0 with a small overshoot

// shot 11: Ross storms up to the board, snatches the marker and spins the board to its clean side
const Scene11 = shotX(({ f }) => {
  const E = 1.1, wh = whip(f, 308 / FPS, 0.22);
  return <BoardRoom f={f} E={E} px={290 + 700 * wh} py={96} body="board" tipU={470} tipV={830} spin />;
});
// shot 12: Ross at the clean board, the title is written
const Scene12 = shotX(({ f }) => <BoardRoom f={f} E={1.05} px={300} py={-11} body="board" tipU={515} tipV={235} />);
// shot 19: Ross scribbles lines four to ten in a blur, speed lines; shot 20: the marker slams on line eleven
const Scene19 = shotX(({ f }) => {
  const tt = t(f), sweep = clamp01((tt - BLUR_T) / 0.5), E = 1.4, jig = twos(f) % 4 < 2 ? 1 : -1, tipV = 430 + 300 * sweep + 10 * jig;
  return (
    <BoardRoom f={f} E={E} px={330} py={-90} body="board" tipU={250} tipV={560}>
      {(m) => <SpeedLines cx={m.X(250)} cy={m.Y(tipV)} f={f} r0={120} r1={700} order={140} op={0.55} />}
    </BoardRoom>
  );
});
const Scene20 = shotX(({ f }) => {
  const tt = t(f), E = 1.3, a = clamp01((tt - (SLAM_T - 0.14)) / 0.14), pre = 1 - ease(a), shake = tt > SLAM_T ? 6 * Math.exp(-(tt - SLAM_T) / 0.12) * (twos(f) % 4 < 2 ? 1 : -1) : 0;
  return <BoardRoom f={f} E={E} px={300 + 260 * pre + shake} py={-30 + 120 * pre} body="slam" tipU={97} tipV={806}>{() => <Flash f={f} />}</BoardRoom>;
});

// the board's inserts: the line he is writing fills the frame (shot 14: "1. TAX EVASION" with his marker; shot 21: line eleven, its words lit in red)
const Scene14 = shotX(({ f }) => {
  // Ross at the board at a huge scale, the plate stays and he moves along the line: his marker's tip is where the writing's end is; his head is above the frame's corner and glares at the board
  const t0 = t(f), w1 = clamp01((t0 - BOARD1_T[0]) / 0.25), w2 = clamp01((t0 - BOARD1_T[1]) / 0.9), E = 1.5, jig = twos(f) % 4 < 2 ? 1 : -1;
  const tipDx = t0 < BOARD1_T[0] ? 44 : t0 < BOARD1_T[1] ? 44 + 60 * w1 : 104 + 330 * w2;               // the writing's end on the board, design px (640 x 866)
  const writing = t0 >= BOARD1_T[0] && w2 < 1 && (t0 < BOARD1_T[0] + 0.25 || t0 >= BOARD1_T[1]);
  const tipU = 52 + tipDx * 1.033 + (writing ? 1.2 * jig : 0), tipV = 75 + 206 * 1.033 + (writing ? -1.6 * jig : 0);
  return <BoardRoom f={f} E={E} px={0} py={0} body="board" tipU={0} tipV={0} fixed={cam(2.43, 275, 400)} moving={[tipU, tipV]} />;
});
const Scene21 = shotX(({ f }) => <BoardPlate f={f} m={cam(1.6, 370, 780)} />);

// shot 26: Ross's eyes: the cash, line eleven, the cash (the board behind him); shot 27: he takes the headset and puts it on
const Scene26 = shotX(({ f }) => <BoardRoom f={f} E={1.9} px={190} py={-230} body="board" tipU={420} tipV={760} />);
const Scene27 = shotX(({ f }) => {
  const tt = t(f), E = 1.9, px = 190, py = -230, on = tt >= HEADSET_T[1], rise = sm(HEADSET_T[0], HEADSET_T[1] - 0.04, tt), m = boardView(E, px, py, "board", 420, 760);
  const R = 195 * E, hx = px + 4 * E, hy = py + 201 * E, pop = tt >= HEADSET_T[1] ? Math.exp(-(tt - HEADSET_T[1]) / 0.07) : 0;
  return (
    <>
      <BoardPlate f={f} m={m} />
      {!on && <RossP f={f} x={px} y={py} E={E} order={60} body="board" pose={rossPose9(f, "board")} />}
      {on && <RossHeadsetP x={px} y={py} E={E * (1 + 0.04 * pop)} order={60} pose={rossHeadsetPose(f)} />}
      {tt >= HEADSET_T[0] - 0.1 && !on && <HeadsetProp x={lerp(hx + 380, hx, rise)} y={lerp(hy - 700, hy + 24, rise)} r={R} rot={lerp(-25, 0, rise)} order={110} />}
    </>
  );
});

// ═════════════════════════════════════════════════════ Denise's notebook seen from above (shots 5 and 18): the painted notebook on a desk, her writing on its ruled lines, her pink pen and her hand at the end of what is written
const NB = PROP.notebook, NOTE_VIEW = cam(1.5, 390, 640);
const NOTE_BASE = [374, 474, 624, 824, 924];                                  // the baselines used (ruled lines of the notebook): ICE BATH, 4 AM, MMF MMF MMF, HIRE A, HITMAN (src/x09-ui.tsx NOTE_ROW follows)
/** the writing's end (plate px) for the pen: in shot 5 the third MMF and its underlines, in shot 18 HIRE A HITMAN and its heart */
function penTip(f: number): [number, number] {
  const s = noteState(f), x0 = 150, size = 84;
  if (shotAt(f).id === "notebook") {
    const k = s.mmf.findIndex((v) => v < 0.999), i = k < 0 ? 2 : k;
    if (s.under[0] > 0 || s.under[1] > 0) { const u = s.under[1] > 0 ? 1 : 0, p = u ? s.under[1] : s.under[0]; return [x0 - 6 + 610 * p, NOTE_BASE[2] + 22 + 24 * u - 6]; }
    return [x0 + 205 * i + 150 * s.mmf[i], NOTE_BASE[2] - 18];
  }
  if (s.heart > 0) return [x0 + 400 + 30 * Math.sin(s.heart * 6), NOTE_BASE[4] - 50];
  return s.hire < 0.5 ? [x0 + 330 * s.hire * 2, NOTE_BASE[3] - 20] : [x0 + 380 * (s.hire * 2 - 1), NOTE_BASE[4] - 20];
}
function NotebookShot({ f, focus }: { f: number; focus?: [number, number] }) {
  const m = NOTE_VIEW, ok = useHandFonts(), [tx, ty] = penTip(f), jig = twos(f) % 4 < 2 ? 1 : -1;
  const X = m.X(tx), Y = m.Y(ty) + 2 * jig, ps = 2.5, rot = -42, R = (rot * Math.PI) / 180;
  const cxp = X - 86 * ps * Math.sin(R), cyp = Y + 86 * ps * Math.cos(R);
  return (
    <>
      {FLAT("#6e4f33", -2)}
      <Poly pts={rect(m, NB.ox + 14, NB.oy + 18, NB.ox + NB.w + 14, NB.oy + NB.h + 22)} color="#3a2616" order={-1} op={0.45} />
      <Spr m={m} d={NB} ax={0} ay={0} u={NB.ox} v={NB.oy} k={1} order={10} />
      <NotebookInk x={m.X(384)} y={m.Y(672)} w={768 * m.s} h={1344 * m.s} st={noteState(f)} order={30} ready={ok} />
      <Mitten x={X - 90 * ps * Math.sin(R)} y={Y + 90 * ps * Math.cos(R)} rot={rot} s={2.0} skin="#fee1a2" ink="#39200c" order={95} />
      <Pen x={cxp} y={cyp} s={ps} rot={rot} color="#ec3f99" order={96} />
    </>
  );
}
const Scene5 = shotX(({ f }) => <NotebookShot f={f} />, [W / 2, 700]);
const Scene18 = shotX(({ f }) => <NotebookShot f={f} />, [W / 2, 1000]);

// ═════════════════════════════════════════════════════ the inserts (shots 15, 16, 17): full pictures with a little in code
const INS_M = cam(1.43, 384, 672);
const Scene15 = shotX(({ f }) => {
  const tt = t(f), [x0, y0, x1, y1] = RG.inserts.tax.label, m = INS_M, thud = tt >= THUD_T ? Math.exp(-(tt - THUD_T) / 0.1) : 0;
  return (
    <>
      <Plate m={m} file={RG.inserts.tax.file} />
      <LabelText x={m.X((x0 + x1) / 2)} y={m.Y((y0 + y1) / 2)} w={(x1 - x0) * m.s * 0.96} h={(y1 - y0) * m.s * 0.8} rot={0} label="TAX" order={20} />
      {thud > 0.02 && <Poly pts={rect(m, 0, 0, 768, 1344)} color="#ffffff" order={200} op={0.12 * thud} />}
    </>
  );
}, [W / 2, 1300]);
const Scene16 = shotX(({ f }) => {
  const tt = t(f), m = INS_M, [cx, cy] = RG.inserts.wash.porthole, ang = tt < WASH_T ? 0 : -(tt - WASH_T) * 520, drum = { file: "sp/x09-wash-drum.png", w: 284, h: 284 } as Img;
  return (
    <>
      <Plate m={m} file={RG.inserts.wash.file} />
      <Spr m={m} d={drum} ax={142} ay={142} u={cx} v={cy} k={0.985} rot={ang} order={10} />
    </>
  );
});
const Scene17 = shotX(({ f }) => <Plate m={INS_M} file={RG.inserts.hit.file} />);

// ═════════════════════════════════════════════════════ the flat fallback: what is not built yet
const FLATC: Record<ShotId, string> = {
  splash: "#2c2548", ice: "#3a2f55", clock: "#47355a", tape: "#47355a", notebook: "#5b4a3a", vein: "#3a2f55", drink: "#47355a", chug: "#47355a", woo: "#3a2f55", corks: "#3a2f55", snatch: "#31445a", board1: "#31445a", pens: "#3a2f55", tax: "#cfd6dd",
  taxbox: "#9b8f6e", wash: "#d9d3a0", hit: "#1f4a52", dnote: "#5b4a3a", scribble: "#c93a3a", slam: "#31445a", line11: "#cfd6dd", turn: "#3a2f55", caught: "#47355a", denise: "#3a2f55", cash: "#3a2f55", eyes: "#3a2f55", headset: "#3a2f55", finale: "#2c2548",
};
const Flat = (id: ShotId) => shotX(() => <>{FLAT(FLATC[id], 0)}</>);
const REAL: Partial<Record<ShotId, React.FC<{ f: number }>>> = { splash: Scene1, ice: Scene2, clock: Scene3, tape: Scene4, notebook: Scene5, vein: Scene6, drink: Scene7, chug: Scene8, woo: Scene9, corks: Scene10, snatch: Scene11, board1: Scene12, pens: Scene13, tax: Scene14, taxbox: Scene15, wash: Scene16, hit: Scene17, dnote: Scene18, scribble: Scene19, slam: Scene20, line11: Scene21, turn: Scene22, caught: Scene23, denise: Scene24, cash: Scene25, eyes: Scene26, headset: Scene27, finale: Scene28 };
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = Object.fromEntries(SHOT_IDS.map((id) => [id, REAL[id] ?? Flat(id)])) as Record<ShotId, React.FC<{ f: number }>>;
export const ART: Record<ShotId, string> = Object.fromEntries(SHOT_IDS.map((id) => [id, id])) as Record<ShotId, string>;
