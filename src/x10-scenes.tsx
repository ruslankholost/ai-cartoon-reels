import React from "react";
import { Glow, Inked, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { Cloud, Cork, PopBurst } from "./x08-fx";
import { Banknote, CashFan } from "./x09-draw";
import { Mitten } from "./lips8-fx";
import {
  Bell, BottomRail, Buzz, Dust, Flame, Glint, Moth, Note, Padlock, Quarter, Rain, ShopSteam, Slats, Smoke, ClockHands, earSteam, mothPos,
} from "./x10-draw";
import { EnvelopeCard, HelpWanted, Letter, Reel, ReviewCard, SignText, Tag, useHandFonts } from "./x10-ui";
import { hop, otherPose, rossPose10 } from "./x10-act";
import { FLAGS, H, W, shotX } from "./x10-shared";
import { CROP, FLAT, HEAD_R, Over, PL, PR, PersonP, Plate, RG, ROSS_EARS, RossP, Spr, at, cam, headPt, plateOf, rect, stand, type Img, type Who } from "./x10-stage";
import {
  BELL_T, BILL_T, CLINK_T, CORK_T, DING_T, FIRE_T, FPS, KACHING_T, LOCK_T, MOTH_T, NIGHT_CLUNK_T, POP_T, RING_T, SHOT_IDS, SHUTTER_T, SHUTTER_TOP, SLAP_T, SNATCH_T, SPIN_T, SPRINK_T, STING_T, SWISH_T, WHISTLEBACK_T, WHISTLE_T,
  WHUMP_T, boxFall, clamp01, ease, flashAt, lockDropAt, lockOpenAt, mouthAt, reach, reelAt, shotAt, shutterAt, steamLevel, strollAt, twos, lerp, KETTLE_T, mothAge, popP, type ShotId,
} from "./x10-sched";

// The scenes of x10 "My Own Business": one canvas per shot, hard cuts. Each is the art of the shot (the plates, sprites and puppets cut from out/x10-cast by scripts/x10-prep.py, src/x10-rig.json) under the effects and writing drawn in code
// (src/x10-draw.tsx, src/x10-ui.tsx). Positions are plate px (768 x 1344 pictures) put on the frame by a view `m` (src/x09-stage.tsx cam): a shot's `m` never moves, the camera's push is the canvas's zoom (src/x10-shared.tsx).
const t = (f: number) => f / FPS;
const Z = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const sm = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const NIGHT = "#5662a0", NIGHT_P = "#aab2d8";               // the night's tint: the plates, and the people a little paler
const EDGE_FRONT = { top: "#a0d4e8", bottom: "#454542", side: "#b96640", sideLow: "#7b7875", split: 1088 };
const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
const EDGE_WINDOW = { top: "#f6e7b8", bottom: "#a77b40", side: "#f1dda7", sideLow: "#aa7e43", split: 1125 };
const NIGHT_EDGE = { top: "#8b8d70", bottom: "#605a62", side: "#8a7f78", sideLow: "#625e66", split: 1125 };   // the window plate's edge colours under the night tint
const PANEL = (color: string, order: number) => <Poly pts={[[-2400, 2400], [2400, 2400], [2400, -2400], [-2400, -2400]]} color={color} order={order} />;

// ═════════════════════════════════════════════════════ shots 1 and 2: the shutter and the padlock, then the shop front
// shot 1: the key turns in the padlock on the shutter's bottom rail, the shackle springs open (CLICK), the lock drops
const Scene1 = shotX(({ f }) => {
  const tt = t(f), turn = clamp01(tt / 0.1), open = lockOpenAt(f), drop = lockDropAt(f), s = 3.6;
  const y0 = 40, restY = -715, fall = drop * (y0 - restY), bounce = tt > LOCK_T[1] ? 22 * Math.exp(-(tt - LOCK_T[1]) / 0.08) * Math.abs(Math.sin((tt - LOCK_T[1]) * 40)) : 0;
  return (
    <>
      <Slats x0={-560} y0={1000} x1={560} y1={-340} h={96} order={0} />
      <BottomRail x={0} y={-400} w={1200} s={3.4} order={10} />
      <Poly pts={[[-560, -468], [560, -468], [560, -1000], [-560, -1000]]} color="#8a8c8e" order={4} />
      <Poly pts={[[-560, -468], [560, -468], [560, -490], [-560, -490]]} color="#5d5f62" order={5} />
      <Inked pts={xf(roundRect(150, 90, 14), 0, -330)} color="#4a5057" ink="#101316" w={5} order={12} />
      <Padlock x={0} y={y0 - fall + bounce} s={s} rot={drop * 18} open={open} turn={turn} withKey={drop < 0.05} order={20} />
    </>
  );
});
// shot 2: the shutter flies up; Ross, arms wide, under the sign ROSS'S COFFEE
const FRONT_S = 1.4286, FRONT = cam(FRONT_S, 384, 672);
const Scene2 = shotX(({ f }) => {
  const m = FRONT, ok = useHandFonts(), tt = t(f), [sx0, sy0, sx1, sy1] = PL.front.shutter, [hx0, , hx1] = PL.front.housing, [bx0, by0, bx1, by1] = PL.front.sign;
  const ross = stand(m, "ross", 384, 819, 101), sh = shutterAt(f), wob = tt >= SHUTTER_TOP ? 5 * Math.exp(-(tt - SHUTTER_TOP) / 0.12) * Math.sin((tt - SHUTTER_TOP) * 70) : 0;
  const top = m.Y(sy0), bot = top - (m.Y(sy0) - m.Y(sy1)) * sh;
  return (
    <>
      <Plate m={m} file={PL.front.file} edge={EDGE_FRONT} />
      <SignText x={m.X((bx0 + bx1) / 2)} y={m.Y((by0 + by1) / 2)} w={(bx1 - bx0) * m.s} h={(by1 - by0) * m.s} order={20} ready={ok} />
      <RossP f={f} x={ross.x} y={ross.y} E={ross.E} order={40} body="wide" pose={rossPose10(f, "wide")} />
      {sh > 0.001 && (
        <>
          <Slats x0={m.X(sx0)} y0={top + wob} x1={m.X(sx1)} y1={bot + wob} h={26 * m.s} order={80} />
          <BottomRail x={m.X((sx0 + sx1) / 2)} y={bot - 14 * m.s + wob} w={(sx1 - sx0) * m.s} s={m.s * 0.55} order={90} />
        </>
      )}
      {flashAt(f) > 0.02 && <Poly pts={[[-1200, 1200], [1200, 1200], [1200, -1200], [-1200, -1200]]} color="#ffffff" order={300} op={flashAt(f)} />}
    </>
  );
});

// ═════════════════════════════════════════════════════ shot 3: his eyes fill the frame; the pupils spin like a slot machine and land on two green dollar signs
const Scene3 = shotX(({ f }) => {
  const tt = t(f), R = RG.puppets.ross, E = 4.2, pose = rossPose10(f, "wide"), x = 0, y = 960 - (700 + 201 * E);   // the middle of his eyes at frame y 700
  const eyes = R.eyes, [c0, c1] = eyes.map((e) => locOf2(R, e.cx, e.cy));
  const landed = tt >= KACHING_T, pop = landed ? 1 + 0.22 * Math.exp(-(tt - KACHING_T) / 0.1) * Math.cos((tt - KACHING_T) * 36) : 1;
  const sparkle = landed ? Math.exp(-(tt - KACHING_T) / 0.45) : 0;
  return (
    <>
      {PANEL("#f0c98c", -1)}
      <RossP f={f} x={x} y={y} E={E} order={40} body="wide" pose={{ ...pose, gaze: [0, 0] }} attach={
        <>
          {[c0, c1].map((c, i) => (
            <group key={i}>
              <Reel x={c[0]} y={c[1]} w={(eyes[i].rx + 4) * 2 * pop} h={(eyes[i].ry + 4) * 2 * pop} p={reelAt(f, i as 0 | 1)} order={70} />
              {sparkle > 0.05 && <Glow x={c[0]} y={c[1]} rx={(eyes[i].rx + 40) * (1 + 0.4 * sparkle)} ry={(eyes[i].ry + 40) * (1 + 0.4 * sparkle)} op={0.6 * sparkle} order={69.5} color="rgba(120,255,160,1)" />}
            </group>
          ))}
        </>
      } />
      {sparkle > 0.05 && [[-130, 400, 92, 0], [330, 410, 76, 15], [-470, 190, 60, 8], [450, 150, 70, 22]].map(([sx, sy, r, rot], i) => <Glint key={i} x={sx} y={sy} r={r * (0.3 + 0.7 * sparkle)} rot={rot + 90 * (tt - KACHING_T)} order={160} op={Math.min(1, sparkle * 1.6)} />)}
    </>
  );
});
/** a rig point (px of the padded picture, y down) as a head-local point: puppet px from the neck pivot, y up */
const locOf2 = (R: { pivot: [number, number] }, X: number, Y: number): [number, number] => [X - R.pivot[0], R.pivot[1] - Y];

// ═════════════════════════════════════════════════════ the shop from inside: the front wall (bg-window), the counter (bg-counter)
const WIN_S = 1.4286, WIN = cam(WIN_S, 384, 672);
const CNT_S = 1.4286, CNT = cam(CNT_S, 384, 672);
// shot 4: the delivery guy tips the boxes off his hand truck onto Ross; they bury him
const Scene4 = shotX(({ f }) => {
  const m = WIN, ok = useHandFonts(), tt = t(f), fall = boxFall(f), boxes = PR.boxes, landed = tt >= WHUMP_T;
  const ross = stand(m, "ross", 250, 880, 105), cour = PR.courier;
  const kc = 0.62, tilt = 8 + 14 * sm(0.0, 0.25, tt - 3.3);
  return (
    <>
      <Plate m={m} file={PL.window.file} edge={EDGE_WINDOW} />
      {!landed && <RossP f={f} x={ross.x} y={ross.y} E={ross.E} order={40} body="wide" pose={rossPose10(f, "wide")} />}
      <Spr m={m} d={cour} ax={cour.w * 0.55} ay={cour.h - 30} u={560} v={1070} k={kc} rot={tilt} order={50} />
      {(() => {
        const dy = (1 - fall) * 700, sq = landed ? 1 - 0.1 * Math.exp(-(tt - WHUMP_T) / 0.1) * Math.cos((tt - WHUMP_T) * 30) : 1;
        return <Spr m={m} d={boxes} ax={boxes.w / 2} ay={boxes.h - 40} u={250} v={1010 - dy} k={0.5} rot={landed ? 0 : 12 * (1 - fall)} sy={sq} sx={2 - sq} order={60} />;
      })()}
      {landed && <PileTags m={m} u={250} v={1010} k={0.5} ok={ok} order={65} />}
      <Dust at={[m.X(250), m.Y(1015)]} age={tt - WHUMP_T} k={m.s / 1.4} order={70} />
    </>
  );
});

const PILE_U = 230;
/** the three labels on the bottom row of the pile (sprite px of the pile picture: the middle of each box's front, its turn) */
const BOX_TAGS: { label: string; px: number; py: number; rot: number }[] = [{ label: "CUPS", px: 215, py: 585, rot: -2 }, { label: "MILK", px: 560, py: 592, rot: 2 }, { label: "BEANS", px: 270, py: 368, rot: -3 }];
function PileTags({ m, u, v, k, ok, order }: { m: ReturnType<typeof cam>; u: number; v: number; k: number; ok: boolean; order: number }) {
  const b = PR.boxes;
  return <>{BOX_TAGS.map((tg, i) => { const [pu, pv] = plateOf(b.w / 2, b.h - 40, u, v, k, false, tg.px, tg.py); return <Tag key={i} x={m.X(pu)} y={m.Y(pv)} w={170 * k * m.s} h={70 * k * m.s} rot={tg.rot} label={tg.label} order={order} ready={ok} />; })}</>;
}
// shot 5: Chuck slaps the counter bell, phone in the other hand
const Scene5 = shotX(({ f }) => {
  const m = cam(1.7, 400, 780), tt = t(f), ok = useHandFonts();
  const p = stand(m, "chuck", 560, 770, 118), pose = otherPose("CHUCK", f), lunge = BELL_T.reduce((s, t0) => s + (tt >= t0 && tt < t0 + 0.12 ? Math.sin(((tt - t0) / 0.12) * Math.PI) : 0), 0);
  const press = BELL_T.reduce((s, t0) => Math.max(s, tt >= t0 && tt < t0 + 0.1 ? 1 : 0), 0), ring = BELL_T.reduce((s, t0) => Math.max(s, tt >= t0 ? Math.exp(-(tt - t0) / 0.12) : 0), 0);
  const boxes = PR.boxes;
  return (
    <>
      <Plate m={m} file={PL.counter.file} edge={EDGE_COUNTER} />
      <Spr m={m} d={boxes} ax={boxes.w / 2} ay={boxes.h - 40} u={PILE_U} v={900} k={0.5} order={30} />
      <Spr m={m} d={{ file: CROP.counterFront.file, w: CROP.counterFront.w, h: CROP.counterFront.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={CROP.counterFront.y0} k={1} order={80} />
      <Bell x={m.X(392)} y={m.Y(822)} s={m.s * 1.0} press={press} ring={ring} order={82} />
      <PersonP who="chuck" x={p.x} y={p.y - lunge * 40 * m.s / 1.7} E={p.E} order={90} pose={pose} />
    </>
  );
});

// shot 6: the pile of boxes; a hand pokes out of it with a cup of coffee
const Scene6 = shotX(({ f }) => {
  const m = cam(2.2, 250, 560), tt = t(f), boxes = PR.boxes, ok = useHandFonts(), cup = PR.cup;
  const up = sm(POP_T - 0.02, POP_T + 0.12, tt), wob = tt >= POP_T - 0.6 && tt < POP_T ? 3 * Math.sin(tt * 60) : 0, shake = tt >= POP_T ? Math.exp(-(tt - POP_T) / 0.1) * 6 * Math.sin((tt - POP_T) * 80) : 0;
  const k = 0.62, top = 900 - (boxes.h - 40) * k, hole = top + 66;
  return (
    <>
      <Plate m={m} file={PL.counter.file} edge={EDGE_COUNTER} />
      <Spr m={m} d={boxes} ax={boxes.w / 2} ay={boxes.h - 40} u={PILE_U + wob} v={900} k={k} order={30} />
      <PileTags m={m} u={PILE_U + wob} v={900} k={k} ok={ok} order={36} />
      {up > 0.01 && <Poly pts={xf(ellipsePts(0, 0, 66 * m.s, 20 * m.s, 20), m.X(PILE_U), m.Y(hole))} color="#1c1208" order={37} />}
      <Spr m={m} d={cup} ax={cup.w * 0.5} ay={cup.h} u={PILE_U + shake / m.s} v={hole + 8 - (1 - up) * 150 - 12} k={0.3} order={38} />
      <Spr m={m} d={{ file: CROP.counterFront.file, w: CROP.counterFront.w, h: CROP.counterFront.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={CROP.counterFront.y0} k={1} order={80} />
    </>
  );
});

// shots 7, 8 and 9: the till, the hands in from the edges and the tip jar; Ross pays all of them
const paying = (f: number, flip: boolean, view: ReturnType<typeof cam>, hand: Img, edge: "right" | "left", t0: number, t1: number, slapT: number, uHand: number, vHand: number, k: number, extra?: React.ReactNode) => {
  const m = view, tt = t(f), r = reach(f, t0, t1), ross = stand(m, "ross", 384, 740, 80), lunge = tt >= slapT - 0.04 && tt < slapT + 0.1 ? 14 : 0;
  const slide = (1 - r) * 520;
  return (
    <>
      <Plate m={m} file={PL.counter.file} edge={EDGE_COUNTER} />
      <RossP f={f} x={ross.x + (flip ? -lunge : lunge) * m.s / 1.7} y={ross.y} E={ross.E} order={40} body="till" pose={rossPose10(f, "till")} flip={flip} />
      <Spr m={m} d={hand} ax={edge === "right" ? 0 : hand.w} ay={hand.h / 2} u={uHand + (edge === "right" ? slide : -slide) / m.s} v={vHand} k={k} order={60} />
      {extra}
      <Spr m={m} d={{ file: CROP.counterFront.file, w: CROP.counterFront.w, h: CROP.counterFront.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={CROP.counterFront.y0} k={1} order={80} />
    </>
  );
};
const Scene7 = shotX(({ f }) => paying(f, false, cam(2.4, 430, 760), PR.handSuit, "right", 7.3, 8.3, SLAP_T[0], 566, 722, 0.5));
const Scene8 = shotX(({ f }) => paying(f, true, cam(2.4, 340, 760), PR.handWork, "left", 8.2, 9.3, SLAP_T[1], 232, 722, 0.5));
const Scene9 = shotX(({ f }) => {
  const m = cam(2.2, 560, 770), tt = t(f), jar = PL.counter.jar, tiny = PR.handTiny, ross = stand(m, "ross", 470, 740, 80);
  const up = sm(9.25, 9.65, tt) * (1 - sm(10.0, 10.2, tt)), take = sm(10.0, 10.1, tt);
  return (
    <>
      <Plate m={m} file={PL.counter.file} edge={EDGE_COUNTER} />
      <RossP f={f} x={ross.x} y={ross.y} E={ross.E} order={40} body="till" pose={rossPose10(f, "till")} />
      <Spr m={m} d={tiny} ax={tiny.w / 2} ay={tiny.h} u={(jar[0] + jar[2]) / 2} v={jar[3] - 10 - (1 - Math.max(up, take)) * 120} k={0.2} order={60} />
      <Spr m={m} d={{ file: CROP.counterFront.file, w: CROP.counterFront.w, h: CROP.counterFront.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={CROP.counterFront.y0} k={1} order={80} />
    </>
  );
});

// shot 10: the till is empty; his eye twitches
const Scene10 = shotX(({ f }) => {
  const E = 2.2, ry = 760 + 201 * E, pose = rossPose10(f, "wide");
  return (
    <>
      {PANEL("#6a4b2a", -1)}
      <RossP f={f} x={0} y={960 - ry} E={E} order={40} body="wide" pose={pose} />
      <Poly pts={xf(roundRect(1500, 260, 20), 0, -820)} color="#8b8f95" order={50} />
      <Poly pts={xf(roundRect(1380, 180, 20), 0, -860)} color="#b9bec4" order={51} />
      {[-560, -280, 0, 280, 560].map((x, i) => <Poly key={i} pts={xf(roundRect(210, 130, 10), x, -850)} color="#d9dde1" order={52} />)}
    </>
  );
});

// ═════════════════════════════════════════════════════ shots 11-15: HELP WANTED and Tyler, the fire, the walk out in the rain, the phone, the review
/** where a person's neck pivot goes (plate px) so that the feet stand on the plate row `vFeet`, and the scale for a head radius R */
const standOn = (m: ReturnType<typeof cam>, who: Who, body: string, u: number, vFeet: number, R: number) => {
  const P = RG.puppets[who], L = who === "ross" ? P.bodies![body] : P.layers.body, k = R / HEAD_R[who];
  return stand(m, who, u, vFeet - (L.y + L.h - P.pivot[1]) * k, R);
};
const TYLER_V = 1150 - 573 * (62 / 134);        // Tyler's neck pivot (plate row) when he stands on the floor row 1150 with a head of radius 62
// shot 11: HELP WANTED in the window; Ross holds the apron out to Tyler ("You're hired!"), the apron flies onto him
const Scene11 = shotX(({ f }) => {
  const m = cam(1.6, 384, 700), tt = t(f), ok = useHandFonts(), flyT = 10.72;
  const given = tt >= flyT + 0.2, ross = standOn(m, "ross", given ? "wide" : "apron", 540, 1150, 100), tyl = standOn(m, "tyler", "", 215, 1150, 62);
  const a = clamp01((tt - flyT) / 0.22), ap = RG.apron, ka = 0.36;
  const fromU = 540 - 20, fromV = 905, toU = 215 + 2, toV = TYLER_V + 4;
  const au = lerp(fromU, toU, ease(a)), av = lerp(fromV, toV, ease(a)) - 60 * Math.sin(a * Math.PI), arot = lerp(-8, 0, ease(a)), asc = lerp(1.3, 1, ease(a));
  return (
    <>
      <Plate m={m} file={PL.window.file} edge={EDGE_WINDOW} />
      <HelpWanted x={m.X(235)} y={m.Y(430)} w={190 * m.s} h={132 * m.s} rot={-3} order={20} ready={ok} />
      <PersonP who="tyler" x={tyl.x} y={tyl.y} E={tyl.E} order={50} pose={otherPose("TYLER", f, 0.3)} />
      {tt >= flyT && <Spr m={m} d={ap} ax={ap.w / 2} ay={22} u={au} v={av} k={ka * asc} rot={arot} order={tt < flyT + 0.25 ? 70 : 60} />}
      <RossP f={f} x={ross.x} y={ross.y} E={ross.E} order={40} body={given ? "wide" : "apron"} pose={rossPose10(f, given ? "wide" : "apron")} />
    </>
  );
});
// shot 12: the panini press is on fire behind Tyler, who films himself; Ross points, the vein pops
const Scene12 = shotX(({ f }) => {
  const m = CNT, tt = t(f), age = tt - FIRE_T, grow = clamp01(age / 0.35), [px0, py0, px1] = PL.counter.panini;
  const ross = stand(m, "ross", 235, 736, 82), tyl = stand(m, "tylerSelfie", 545, 700, 62), pose = rossPose10(f, "point");
  return (
    <>
      <Plate m={m} file={PL.counter.file} edge={EDGE_COUNTER} />
      <Flame x={m.X((px0 + px1) / 2)} base={m.Y(py0 + 6)} k={m.s * 0.85} grow={grow} f={f} order={20} seed={2} />
      <Smoke x={m.X((px0 + px1) / 2)} y={m.Y(py0 - 260)} age={age} k={m.s * 0.7} order={30} />
      <PersonP who="tylerSelfie" x={tyl.x} y={tyl.y} E={tyl.E} order={50} pose={otherPose("TYLER", f, 0.25)} />
      <RossP f={f} x={ross.x} y={ross.y} E={ross.E} order={60} body="point" pose={pose} />
      <Spr m={m} d={{ file: CROP.counterFront.file, w: CROP.counterFront.w, h: CROP.counterFront.h, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={CROP.counterFront.y0} k={1} order={80} />
    </>
  );
});
const HEADS = [150, 384, 620];
// shot 13: Tyler walks out in his apron saying "Cool."; the sprinklers burst on
const Scene13 = shotX(({ f }) => {
  const m = WIN, tt = t(f), age = tt - SPRINK_T, w = clamp01((tt - 13.74) / 1.25), ap = RG.apron, tyl = standOn(m, "tyler", "", lerp(235, 610, ease(w)), 1150 - 12 * Math.abs(Math.sin(w * Math.PI * 7)), 62);
  return (
    <>
      <Plate m={m} file={PL.window.file} edge={EDGE_WINDOW} />
      <PersonP who="tyler" x={tyl.x} y={tyl.y} E={tyl.E} order={50} pose={otherPose("TYLER", f, 0.3)} />
      <Spr m={m} d={ap} ax={ap.w / 2} ay={22} u={lerp(235, 610, ease(w)) + 2} v={TYLER_V + 4 - 12 * Math.abs(Math.sin(w * Math.PI * 7))} k={0.36} order={60} />
      <Rain age={age} k={m.s / 1.43} order={120} heads={HEADS.map((h) => m.X(h))} />
    </>
  );
});
// shot 14: Ross in the sprinkler rain, an extinguisher, a plunger, the phone clamped at his ear: "Ross's Coffee, how can I help?"
const Scene14 = shotX(({ f }) => {
  const m = WIN, tt = t(f), age = tt - SPRINK_T, ross = standOn(m, "ross", "flood", 384, 1150, 112), ringing = tt >= RING_T && tt < 15.42;
  return (
    <>
      <Plate m={m} file={PL.window.file} edge={EDGE_WINDOW} />
      <RossP f={f} x={ross.x + (ringing ? 3 * Math.sin(tt * 90) : 0)} y={ross.y} E={ross.E} order={50} body="flood" pose={rossPose10(f, "flood")} />
      {ringing && <Buzz x={ross.x - 150 * ross.E} y={ross.y + 77 * ross.E} s={ross.E * 0.8} f={f} order={110} />}
      <Rain age={age} k={m.s / 1.43} order={120} heads={HEADS.map((h) => m.X(h))} />
    </>
  );
});
// shot 15: Chuck, dripping, holds up his phone: one star
const Scene15 = shotX(({ f }) => {
  const m = cam(1.5, 384, 800), tt = t(f), ch = stand(m, "chuckWet", 400, 775, 128), pop = popP(tt, 17.62, 0.5, 40);
  return (
    <>
      <Plate m={m} file={PL.counter.file} edge={EDGE_COUNTER} />
      <PersonP who="chuckWet" x={ch.x} y={ch.y} E={ch.E} order={50} pose={otherPose("CHUCK", f)} />
      <ReviewCard x={m.X(205)} y={m.Y(775) + 8} w={210 * m.s * Math.max(0.05, pop)} h={308 * m.s * Math.max(0.05, pop)} rot={-6} order={90} />
      {Array.from({ length: 7 }, (_, i) => { const a = (tt * 1.2 + hash7(i)) % 1; return <Poly key={i} pts={ellipsePts(m.X(300 + 190 * hash7(i + 3)), m.Y(620 + 360 * a), 5 * m.s, 8 * m.s, 10)} color="#9ad0f2" order={95} op={0.8} />; })}
    </>
  );
});
const hash7 = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ═════════════════════════════════════════════════════ shots 16-21: night (the till, the quarter, the envelope, the letter, the hand in the mail slot), the clock
const TILL_M = cam(1.4286, 384, 672);
// shot 16: night: the till drawer opens, a moth flutters out, one quarter on the bottom
const Scene16 = shotX(({ f }) => {
  const m = TILL_M, tt = t(f), slide = 1 - ease((tt - 18.95) / 0.12), age = mothAge(f), [mx, my] = mothPos(age, m.X(384), m.Y(760), m.s * 0.9);
  return (
    <>
      {PANEL("#1e2238", -3)}
      <Spr m={m} d={{ file: PL.till.file, w: 768, h: 1344, ox: 0, oy: 0 }} ax={0} ay={0} u={0} v={slide * 520} k={1} order={0} tint={NIGHT} />
      <Quarter x={m.X(477)} y={m.Y(969 + slide * 520)} r={32 * m.s} shine={tt > 19.1 ? 0.5 + 0.5 * Math.sin((tt - 19.1) * 14) : 0} order={20} />
      {age > 0 && <Moth x={mx} y={my} s={m.s * 1.8} f={f} rot={10 * Math.sin(age * 9)} order={30} />}
    </>
  );
});
// shot 17: Ross holds up the quarter: "...Profit."  The pose's own hand is hidden behind the master's head (it was painted at his cheek), so a mitten beside his face holds the coin
const COIN_HAND = { x: 188, y: 78, s: 0.9, rot: -8 };            // the mitten's middle (puppet px from his neck pivot, y up) and its size and turn; the coin is at the top of its thumb
const coinAt = (c: { x: number; y: number; s: number; rot: number }): [number, number] => { const r = (c.rot * Math.PI) / 180; return [c.x + (14 * Math.cos(r) - 52 * Math.sin(r)) * c.s, c.y + (14 * Math.sin(r) + 52 * Math.cos(r)) * c.s]; };
const Scene17 = shotX(({ f }) => {
  const E = 1.9, ry = 700 + 201 * E, tt = t(f), ross = { x: 0, y: 960 - ry }, [qx, qy] = coinAt(COIN_HAND);
  return (
    <>
      {PANEL("#262c4a", -3)}
      <Glow x={0} y={80} rx={760} ry={900} op={0.45} order={-2} color="rgba(255,206,120,1)" />
      <RossP f={f} x={ross.x} y={ross.y} E={E} order={40} body="coin" pose={rossPose10(f, "coin")} tint={NIGHT_P} />
      <Mitten x={ross.x + COIN_HAND.x * E} y={ross.y + COIN_HAND.y * E} rot={COIN_HAND.rot} s={COIN_HAND.s * E} skin="#d9c3a0" ink="#2a1c0e" order={60} />
      <Quarter x={ross.x + qx * E} y={ross.y + qy * E} r={26 * E} shine={0.4 + 0.4 * Math.sin(tt * 9)} order={70} />
    </>
  );
});
// shot 18: an envelope slides under the door: TAX OFFICE
const Scene18 = shotX(({ f }) => {
  const m = cam(1.9, 520, 1010), tt = t(f), a = ease((tt - 21.22) / 0.34);
  return (
    <>
      <Plate m={m} file={PL.window.file} edge={NIGHT_EDGE} tint={NIGHT} />
      <EnvelopeCard x={m.X(lerp(720, 540, a))} y={m.Y(1168)} w={170 * m.s} h={111 * m.s} rot={lerp(-14, -4, a)} order={30} />
      <Over m={m} c={CROP.wallR} order={25} tint={NIGHT} />
    </>
  );
});
// shot 19: the letter: YOU OWE $7,412.18
const Scene19 = shotX(({ f }) => {
  const tt = t(f), pop = 1 + 0.07 * Math.exp(-(tt - STING_T) / 0.1) * (tt >= STING_T ? 1 : 0), p = clamp01((tt - STING_T) / 0.7);
  return (
    <>
      {PANEL("#3a2f26", -3)}
      <Poly pts={xf(roundRect(880, 1180, 14), 10, -20)} color="#1c1612" order={-2} op={0.5} />
      <Letter x={0} y={30} w={860 * pop} h={1167 * pop} rot={-2} p={p} order={20} />
    </>
  );
});
// shot 20: a hand in a grey sleeve through the mail slot plucks the quarter from his fingers and pulls back (everything here is in frame px: the view `FR` puts plate (u, v) on frame (u, v))
const FR = cam(1, 540, 960);
const Scene20 = shotX(({ f }) => {
  const tt = t(f), E = 1.55, hg = PR.handGrey, a = sm(SNATCH_T - 0.25, SNATCH_T, tt), back = sm(SNATCH_T + 0.03, CLINK_T + 0.02, tt);
  const px = 290, py = 1012, [cqx, cqy] = coinAt(COIN_HAND), qx = px + cqx * E, qy = py - cqy * E, k = 0.4, doorX = 690, slotY = qy;
  const tipX = back > 0 ? lerp(qx + 6, doorX + 90, ease(back)) : lerp(doorX + 90, qx + 6, ease(a));
  return (
    <>
      {PANEL("#2a3150", -3)}
      <Glow x={px - 540} y={960 - py + 180} rx={560} ry={700} op={0.4} order={-2} color="rgba(255,206,120,1)" />
      <RossP f={f} x={px - 540} y={960 - py} E={E} order={40} body="coin" pose={rossPose10(f, "coin")} tint={NIGHT_P} />
      <Mitten x={px - 540 + COIN_HAND.x * E} y={960 - py + COIN_HAND.y * E} rot={COIN_HAND.rot} s={COIN_HAND.s * E} skin="#d9c3a0" ink="#2a1c0e" order={60} />
      {tt < SNATCH_T + 0.03 && <Quarter x={qx - 540} y={960 - qy} r={26 * E} shine={0.3} order={70} />}
      <Spr m={FR} d={hg} ax={26} ay={hg.h / 2} u={tipX} v={qy} k={k} order={72} />
      {tt >= SNATCH_T + 0.03 && tt < CLINK_T + 0.1 && <Quarter x={tipX - 540 + 14} y={960 - qy} r={20} shine={0} order={73} />}
      <Poly pts={rect(FR, doorX, -200, 1200, qy - 52)} color="#5b4630" order={75} />
      <Poly pts={rect(FR, doorX, qy + 52, 1200, 2200)} color="#5b4630" order={75} />
      <Poly pts={rect(FR, doorX - 14, -200, doorX, 2200)} color="#3a2c1c" order={76} />
      <Poly pts={rect(FR, doorX, qy - 52, 1200, qy - 40)} color="#9aa0a8" order={77} />
      <Poly pts={rect(FR, doorX, qy + 40, 1200, qy + 52)} color="#9aa0a8" order={77} />
    </>
  );
});
// shot 21: the wall clock clicks to 5:00
const Scene21 = shotX(({ f }) => {
  const m = cam(5.0, 587, 197), tt = t(f), [cx, cy, r] = PL.counter.clock, hit = tt >= DING_T;
  const minute = hit ? 0 : 59, hour = hit ? 5 : 4, shake = hit ? Math.exp(-(tt - DING_T) / 0.1) * 5 * Math.sin((tt - DING_T) * 80) : 0;
  return (
    <>
      <Plate m={m} file={PL.counter.file} edge={EDGE_COUNTER} />
      <ClockHands x={m.X(cx) + shake} y={m.Y(cy)} r={r * m.s} hour={hour} minute={minute} order={20} />
      {hit && tt < DING_T + 0.35 && [-1, 1].map((d) => [0, 1].map((i) => <Poly key={`${d}${i}`} pts={ribbon([[m.X(cx) + d * (r * m.s + 40 + 36 * i), m.Y(cy) + 70 - 44 * i, 9], [m.X(cx) + d * (r * m.s + 90 + 36 * i), m.Y(cy) + 120 - 44 * i, 9]])} color="#1b1b20" order={25} op={0.8} />))}
    </>
  );
});

// ═════════════════════════════════════════════════════ shots 22-26: another day. The guy outside the window, Ross mopping inside, the corks, the whistle back
const walker = PR.guyWalk;
const outside = (m: ReturnType<typeof cam>, u: number, bob = 0) => <Spr m={m} d={walker} ax={walker.w / 2} ay={walker.h - 24} u={u} v={985 - bob} k={0.31} order={50} />;
const wallsOver = (m: ReturnType<typeof cam>) => <><Over m={m} c={CROP.wallL} order={55} /><Over m={m} c={CROP.wallM} order={55} /><Over m={m} c={CROP.wallR} order={55} /></>;
// shot 22: Ross mops inside; outside the window the guy strolls past, whistling, the bluebird on his shoulder
const Scene22 = shotX(({ f }) => {
  const m = WIN, tt = t(f), w = strollAt(f), ross = standOn(m, "ross", "mop", 560, 1160, 98), nt = tt - WHISTLE_T;
  const gu = lerp(30, 240, ease(w)), bob = 7 * Math.abs(Math.sin(w * Math.PI * 4));
  return (
    <>
      <Plate m={m} file={PL.window.file} edge={EDGE_WINDOW} />
      {outside(m, gu, bob)}
      {wallsOver(m)}
      {nt > 0 && [0, 1].map((i) => { const a = (nt * 1.3 + i * 0.5) % 1; return <Note key={i} x={m.X(gu + 40 + 30 * i)} y={m.Y(700 - 160 * a)} s={0.9 * m.s / 1.4} rot={-14 + 28 * i} color="#ffffff" order={58} op={1 - a} />; })}
      <RossP f={f} x={ross.x + 14 * Math.sin(tt * 5)} y={ross.y} E={ross.E} order={90} body="mop" pose={rossPose10(f, "mop")} />
    </>
  );
});
// shot 23: through the glass the guy waves: "Must be nice! ..."
const Scene23 = shotX(({ f }) => {
  const m = cam(1.9, 330, 800), tt = t(f), g = standOn(m, "guy", "", 232, 985, 52), ross = standOn(m, "ross", "mop", 600, 1170, 110);
  return (
    <>
      <Plate m={m} file={PL.window.file} edge={EDGE_WINDOW} />
      <PersonP who="guy" x={g.x} y={g.y - hop("GUY", f) * 0.3} E={g.E} order={50} pose={otherPose("GUY", f)} />
      {wallsOver(m)}
      <RossP f={f} x={ross.x} y={ross.y} E={ross.E} order={90} body="mop" pose={rossPose10(f, "mop")} />
    </>
  );
});
// shot 24: Ross listens ("Setting your own hours!"), the mop in his hands
const Scene24 = shotX(({ f }) => {
  const E = 1.7, tt = t(f), ry = 760 + 201 * E, pose = rossPose10(f, "mop");
  return (
    <>
      {PANEL("#efdcab", -3)}
      <RossP f={f} x={0} y={960 - ry} E={E} order={40} body="mop" pose={pose} />
    </>
  );
});
// shot 25: POP POP: his ear tunnels shoot out like corks, steam screams out of the holes
const Scene25 = shotX(({ f }) => {
  const E = 1.7, tt = t(f), ry = 760 + 201 * E, pose = rossPose10(f, "mop"), x = 0, y = 960 - ry;
  const ears = ROSS_EARS.map(([hx, hy]) => headPt(pose, E, x, y, hx, hy)) as [number, number][];
  const lv = steamLevel(f), sp = lv > 0 ? [...earSteam(ears[0], -1, tt, E / 1.7 * 1.5, 1), ...earSteam(ears[1], 1, tt, E / 1.7 * 1.5, 2)] : [];
  return (
    <>
      {PANEL("#efdcab", -3)}
      <RossP f={f} x={x} y={y} E={E} order={40} body="mop" pose={pose} />
      {sp.length > 0 && <Cloud sprites={sp} order={170} />}
      <Cork at={ears[0]} dir={-1} t={tt} t0={CORK_T[0]} r={34 * E / 1.7} order={175} />
      <Cork at={ears[1]} dir={1} t={tt} t0={CORK_T[1]} r={34 * E / 1.7} order={175} up={0.8} />
      <PopBurst at={ears[0]} t={tt} t0={CORK_T[0]} R={70 * E / 1.7} order={174} />
      <PopBurst at={ears[1]} t={tt} t0={CORK_T[1]} R={70 * E / 1.7} order={174} />
    </>
  );
});
// shot 26: outside the shop the guy hears it, smiles and whistles the same note back; the bluebird joins; the steam curls out of the shop
const Scene26 = shotX(({ f }) => {
  const m = FRONT, tt = t(f), ok = useHandFonts(), [bx0, by0, bx1, by1] = PL.front.sign, w = clamp01((tt - 29.2) / 1.3), nt = tt - WHISTLEBACK_T;
  const gu = lerp(300, 560, ease(w)), bob = 6 * Math.abs(Math.sin(w * Math.PI * 5));
  return (
    <>
      <Plate m={m} file={PL.front.file} edge={EDGE_FRONT} />
      <SignText x={m.X((bx0 + bx1) / 2)} y={m.Y((by0 + by1) / 2)} w={(bx1 - bx0) * m.s} h={(by1 - by0) * m.s} order={20} ready={ok} />
      <ShopSteam at={[m.X(583), m.Y(560)]} age={tt - 28.4} k={m.s / 1.4 * 1.3} order={40} />
      <Spr m={m} d={walker} ax={walker.w / 2} ay={walker.h - 24} u={gu} v={1150 - bob} k={0.42} order={50} />
      {nt > 0 && [0, 1, 2].map((i) => { const a = (nt * 1.3 + i / 3) % 1; return <Note key={i} x={m.X(gu + 70 + 24 * i)} y={m.Y(860 - 220 * a + 30 * i)} s={1.3 * m.s / 1.4} rot={-16 + 16 * i} color="#ffffff" order={58} op={1 - a} />; })}
    </>
  );
});

// ═════════════════════════════════════════════════════ flat fallback: what is not built yet
const FLATC: Record<ShotId, string> = Object.fromEntries(SHOT_IDS.map((id, i) => [id, ["#2c2548", "#3a2f55", "#47355a", "#31445a", "#5b4a3a"][i % 5]])) as Record<ShotId, string>;
const Flat = (id: ShotId) => shotX(() => <>{FLAT(FLATC[id], 0)}</>);
const REAL: Partial<Record<ShotId, React.FC<{ f: number }>>> = { padlock: Scene1, shutter: Scene2, dollars: Scene3, boxes: Scene4, bell: Scene5, pile: Scene6, landlord: Scene7, supplier: Scene8, tipjar: Scene9, till: Scene10, hire: Scene11, fire: Scene12, walkout: Scene13, phone: Scene14, review: Scene15, night: Scene16, quarter: Scene17, envelope: Scene18, letter: Scene19, slot: Scene20, clock: Scene21, stroll: Scene22, wave: Scene23, listen: Scene24, corks: Scene25, whistle: Scene26 };
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = Object.fromEntries(SHOT_IDS.map((id) => [id, REAL[id] ?? Flat(id)])) as Record<ShotId, React.FC<{ f: number }>>;
export const ART: Record<ShotId, string> = Object.fromEntries(SHOT_IDS.map((id) => [id, id])) as Record<ShotId, string>;
