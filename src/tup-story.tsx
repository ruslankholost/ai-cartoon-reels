import React from "react";
import { Inked, Panel, Picture, Poly, roundRect, xf } from "./sp-puppet";
import { ContactShadow, inkAt, useImages, type SteamCfg } from "./sp-fx";
import { lerp } from "./sp-math";
import plates from "./tup-plates.json";
import { DetroitCard } from "./pen-ui";
import { DOORCARD, DoorCard, Newspaper, PAPER } from "./tup-ui";
import { D2R, DustCloud, FX, FY, Foot, Group, H, PR, Prop, Squash, W, atHead, atPlate, below, bg, focusOn, onPuppet, plateAt, strip, view, type View } from "./pen-stage";
import {
  CLERK_WALK, FORMS, LID, FPS, STACK_ORDER, T, burpFinger, walkK, walkStep, bounceY, dustAt, doorCardAt, formAt, giftHop, handK, holdPush, lidAt, lidSquash, paperAt, paperPush, pullK, puffAt, shopperK, slideAt, stackAt, stampAt, ease, type ShotId,
} from "./tup-sched";
import { DETROIT, DIVE_END_W, DUST, EMPTY, GASP, GIFT_ON, LIVING, PAGE, detroitY } from "./tup-layout";
import { BOWL, GIFT, HAND_HOSTESS, HAND_MAN, HAND_SHOPPER, LID_ON_BOWL, LID_PROP, TActor, shot } from "./tup-shared";

// The story's sepia shots of "I'm Just Supporting a Friend": the 1949 store (the bowl on its stack, the lid that pops off, the shelf that empties), the 1950s living room (the burp, the gift, the order forms, the
// guests), the door with its card, and the newspaper. The sepia, the grain and the projector's flicker are the look of src/Tup.tsx; the numbers in the comments are the shot numbers of src/tup-sched.ts SHOT_IDS.
// Layers: plate 0, back props 10-30, shadows 28-30, puppets 40+, the stacks over the clerk 90, strips 150, front props 160+, effects 300.

// ── the store: the clerk behind the counter, the seven stacks over him (he peeks over them), the counter's front over him; the mint bowl of the dive stands on the fourth stack
const COUNTER = plates.counter, STK = plates.stacks, TOP = STK[3];
const BOWL_KP = 112 / BOWL.w; // plate px per bowl px of the bowl on the stack
const TOPBOWL = { u: TOP.x0 + TOP.w / 2, v: TOP.top + 8 };
/** the bowl on the fourth stack: its foot on the stack's top; (dx, dy, rot, sy) move it with its stack when the stack leaves */
function TopBowl({ m, tex, dx = 0, dy = 0, rot = 0, sy = 1, order = 95 }: { m: View; tex: THREE.Texture; dx?: number; dy?: number; rot?: number; sy?: number; order?: number }) {
  return <Prop tex={tex} def={BOWL} x={m.X(TOPBOWL.u) + dx} y={m.Y(TOPBOWL.v) + dy} k={BOWL_KP * m.s} rot={rot} sy={sy} order={order} />;
}
import type * as THREE from "three";
/** the match cut of the dive: the camera starts the store on the bowl filling the frame (the same size as the dive's last frame) and pulls back to the shot's own view */
function PullCam({ f, m, children }: { f: number; m: View; children: React.ReactNode }) {
  const k = pullK(f), bowlW = BOWL.w * BOWL_KP * m.s, Z = DIVE_END_W / bowlW, z = Math.pow(Z, k); // the bowl is as wide as the dive's last frame has it
  const mid: [number, number] = [m.X(TOPBOWL.u), m.Y(TOPBOWL.v - 289.5 * BOWL_KP)], e = ease(k), c: [number, number] = [lerp(mid[0], 0, e), lerp(mid[1], 0, e)];
  const F: [number, number] = z < 1.001 ? mid : [(c[0] - z * mid[0]) / (1 - z), (c[1] - z * mid[1]) / (1 - z)];
  return <Panel w={W} h={H} zoom={z * holdPush(f)} focus={F}>{children}</Panel>;
}
function Store({ m, f, sc, cut, pileOver = true, clerk = true, plate = "sp/pen-bg-store.jpg", bowl = true }: { m: View; f: number; sc: number; cut: number; pileOver?: boolean; clerk?: boolean; plate?: string; bowl?: boolean }) {
  const at = atPlate(m, 384, COUNTER, sc, cut), P = PR.pileStore, [bowlTex] = useImages([BOWL.file]);
  return (
    <>
      {bg(m, plate)}
      {clerk && <TActor c="clerk" f={f} {...at} order={40} />}
      <Picture file={P.file} w={P.w * m.s} h={P.h * m.s} x={m.X(P.x0 + P.w / 2)} y={m.Y(P.y0 + P.h / 2)} order={pileOver ? 90 : 20} alpha />
      {bowl && <TopBowl m={m} tex={bowlTex} />}
      {strip(m, PR.stripStore.file, PR.stripStore.y0, 150)}
    </>
  );
}
// 8: the clerk blows the dust off the bowl on its stack; the camera pulls back from the bowl; the card DETROIT, 1949 lands on "1949."
const StoreDust = ({ f }: { f: number }) => {
  const m = view(DUST.s, DUST.u0, DUST.v0), k = DUST.k;
  // the dust is blown off the bowl's right rim, away from his face (his chin ends about plate x 430 at that height), to the right and a little down, toward the camera as it grows
  const cfg: SteamCfg = { ...dustAt(T.puff), seed: 7, emitters: [{ box: [TOPBOWL.u + 61, TOPBOWL.v - 58, TOPBOWL.u + 73, TOPBOWL.v - 42], n: 16, r: [6, 28], rise: [-25, 10], life: [0.35, 0.6], strength: 0.9, drift: 380, dir: 1, burst: 3.2, lobes: 4 }] };
  const c = stampAt(f);
  return (
    <PullCam f={f} m={m}>
      <Store m={m} f={f} sc={k} cut={DUST.cut} />
      <DustCloud m={m} f={f} cfg={cfg} order={300} fill="#faf3df" ink="#7a6a4a" ow={0.7} />
      <DetroitCard x={0} y={FY(detroitY(c.s))} s={DETROIT.k * c.s} sx={c.sx} sy={c.sy} rot={c.rot} op={c.on ? 1 : 0} order={310} ink={inkAt(1.1)} />
    </PullCam>
  );
};
// 9: the stacks, close, the mint bowl on top ("Plastic bowls.")
const PileBowls = shot(({ f }) => {
  const m = view(3.4, 262, 235);
  return <Store m={m} f={f} sc={0.684} cut={247} clerk={false} />;
}, [540, 960]);
// 10: the whole store, nobody in it: the clerk yawns
const StoreWide = shot(({ f }) => <Store m={view(1.4286, 6, 0)} f={f} sc={0.5} cut={396} />, [540, 700]);
// 12: the clerk shrugs
const ClerkShrug = shot(({ f }) => <Store m={view(2.0, 150, 0)} f={f} sc={0.8} cut={300} />, [540, 700]);
// 18: the shelf empties: the clerk (bowl pose) carries a short stack on his bowl out of the frame, to the left; the other six stacks leave one by one on thuds, the mint bowl with its stack (src/tup-sched.ts)
const StoreEmpty = shot(({ f }) => {
  const m = view(EMPTY.s, EMPTY.u0, EMPTY.v0), at = atPlate(m, EMPTY.clerk.u + CLERK_WALK.dx * walkK(f), COUNTER, EMPTY.clerk.sc, EMPTY.clerk.cut), [bowlTex] = useImages([BOWL.file]), C = plates.carry;
  const [fx, fy] = onPuppet(at, 0, EMPTY.carryFoot); // the foot of the stack he carries: inside the opening of the bowl in his hands
  return (
    <>
      {bg(m, plates.emptyPlate)}
      <TActor c="clerk" f={f} {...at} order={40} />
      <Picture file={C.file} w={C.w * m.s} h={C.h * m.s} x={fx} y={fy + (C.h * m.s) / 2 + walkStep(f) * at.scale} order={45} alpha />
      {STACK_ORDER.map((j, i) => {
        const s = STK[j], q = stackAt(i, f);
        if (q.gone) return null; // (the carried stack, the third, is not in the order: it is in his hands)
        const cx = m.X(s.x0 + s.w / 2), cy = m.Y(s.y0 + s.h / 2), base = m.Y(s.bottom);
        return (
          <React.Fragment key={i}>
            <Squash x={cx} y={base} sx={1} sy={q.sy}><Picture file={s.file} w={s.w * m.s} h={s.h * m.s} x={cx + q.dx} y={cy + q.dy} rot={q.rot} order={90 + i * 0.1} alpha /></Squash>
            {j === 3 && <Squash x={cx} y={base} sx={1} sy={q.sy}><TopBowl m={m} tex={bowlTex} dx={q.dx} dy={q.dy} rot={q.rot} order={90.5} /></Squash>}
          </React.Fragment>
        );
      })}
      {strip(m, PR.stripStore.file, PR.stripStore.y0, 150)}
    </>
  );
}, [540, 700]);

// ── the lid (11): the shopper's fingertip presses the lid's edge, it pops off the bowl, spins over and lands beside it. The pieces are one scale (k): the bowl 975 px wide, the lid on it, the hand
const LidScene = shot(({ f }) => {
  const m = view(2.4, 30, 200), [bowl, lid, hand] = useImages([BOWL.file, LID_PROP.file, HAND_SHOPPER.file]);
  const k = 0.56, bx = 640, by = 1230, L = lidAt(f); // the bowl's foot in the frame (the counter's top: plate row 713 at 2.4 from row 200)
  const lx = bx + (LID_ON_BOWL[0] - BOWL.pivot[0]) * k, ly = H / 2 - by + (BOWL.pivot[1] - LID_ON_BOWL[1]) * k; // the lid's middle on the bowl (panel px), y up
  const tipRest: [number, number] = [FX(lx + 0) + (PB_EDGE[0]) * k, ly - PB_EDGE[1] * k]; // the lid's pressed edge
  const fk = shopperK(f), hx = tipRest[0], hy = tipRest[1] + (1 - fk) * 560 - 7 * fk * (f / FPS < T.lidPop ? 1 : 0);
  const lidX = FX(lx) + LID.dx, dustSide = (sgn: number) => { const [u, v] = plateAt(m, lidX + sgn * 230, FY(by) - 16); return { box: [u - 5, v - 4, u + 5, v + 4] as [number, number, number, number], n: 6, r: [4, 12] as [number, number], rise: [10, 40] as [number, number], life: [0.25, 0.45] as [number, number], strength: 0.9, drift: 240, dir: sgn as 1 | -1, burst: 3, lobes: 3 }; };
  const dust: SteamCfg = { t0: T.lidLand - 0.02, t1: T.lidLand + 0.06, stop: T.lidLand + 0.15, breakDur: 0.3, seed: 9, emitters: [dustSide(-1), dustSide(1)] }; // a little dust where the lid hits the counter
  return (
    <>
      {bg(m, "sp/pen-bg-store.jpg")}
      <ContactShadow x={FX(bx) + 8} y={FY(by) - 8} w={BOWL.w * k * 1.1} h={52} blur={14} op={0.45} round color="#1a0e04" order={9} />
      <Prop tex={bowl} def={BOWL} x={FX(bx)} y={FY(by)} k={k} order={20} />
      {L.on && <ContactShadow x={FX(lx) + L.x + 10} y={FY(by) - 8} w={LID_PROP.w * k * 0.9} h={30} blur={12} op={0.4 * Math.max(0, 1 - (L.y - LID.floor) / 500)} round color="#1a0e04" order={9.5} />}
      <Prop tex={lid} def={LID_PROP} x={FX(lx) + (L.on ? L.x : 0)} y={ly + L.y} k={k} sx={1 + 0.06 * L.sq} sy={L.sy * (1 - 0.1 * L.sq)} rot={L.rot} order={22} />
      <ContactShadow x={hx + 8} y={tipRest[1] - 8} w={90} h={26} blur={9} op={0.3 * fk * (f / FPS < T.lidPop ? 1 : 0)} round color="#1a0e04" order={21} />
      <Prop tex={hand} def={HAND_SHOPPER} x={hx} y={hy} k={k} order={30} />
      <DustCloud m={m} f={f} cfg={dust} order={300} fill="#fbf6e6" ink="#6b5a3a" ow={0.9} />
    </>
  );
}, [540, 900]);
const PB_EDGE: [number, number] = [403.7, 34.1]; // the lid's pressEdge from its middle, in px of the bowl's picture (props.lid.pressEdge - centre)
const LidPop = LidScene;

// ── the living room: three guests on the sofa (the sofa's front over their laps), the hostess in front of it
const SOFA_FRONT = LIVING.sofaFront;
const GU = [["guest1", 190], ["guest2", 385], ["guest3", 560]] as const;
function Living({ m, f, gsc, hostess, body = "stand" }: { m: View; f: number; gsc: number; hostess?: { u: number; sc: number; feet: number }; body?: string }) {
  const h = hostess && atPlate(m, hostess.u, hostess.feet, hostess.sc, below("hostess", body));
  return (
    <>
      {bg(m, "sp/pen-bg-living.jpg")}
      {GU.map(([c, u], i) => <TActor key={c} c={c} f={f} {...atPlate(m, u, SOFA_FRONT, gsc, LIVING.guestCut)} order={40 + 25 * i} />)}
      {strip(m, PR.stripSofa.file, PR.stripSofa.y0, 150)}
      {h && hostess && <><Foot x={h.x} y={m.Y(hostess.feet) + 4} w={150 * h.scale} op={0.45} order={190} /><TActor c="hostess" f={f} {...h} order={200} /></>}
    </>
  );
}
// 13: the lid, the hostess's finger on its middle: the lid squashes, the puff escapes at the rim, the burp; the ding
const BurpScene = shot(({ f }) => {
  const m = view(3.0, 214, 440), [bowl, lid, hand] = useImages([BOWL.file, LID_PROP.file, HAND_HOSTESS.file]);
  const k = 0.58, bx = 540, by = 1000;
  const lx = bx + (LID_ON_BOWL[0] - BOWL.pivot[0]) * k, ly = H / 2 - by + (BOWL.pivot[1] - LID_ON_BOWL[1]) * k;
  const sq = lidSquash(f), fk = burpFinger(f), tipY = ly + 34 * 0, hy = tipY + (1 - fk) * 520 - sq * 120 * 1.0;
  const side = (sgn: number) => { const [u, v] = plateAt(m, FX(lx) + sgn * 470 * k, ly - 8 * k); return { box: [u - 8, v - 6, u + 8, v + 6] as [number, number, number, number], n: 8, r: [7, 16] as [number, number], rise: [40, 110] as [number, number], life: [0.25, 0.45] as [number, number], strength: 1, drift: 140, burst: 3, lobes: 3 }; };
  const cfg: SteamCfg = { ...puffAt(T.burpT), seed: 5, emitters: [side(-1), side(1)] }; // a small puff of air escapes at the rim, on both sides of the lid
  return (
    <>
      {bg(m, "sp/pen-bg-living.jpg")}
      <ContactShadow x={FX(bx) + 8} y={FY(by) - 8} w={BOWL.w * k * 1.1} h={52} blur={14} op={0.45} round color="#1a0e04" order={9} />
      <Prop tex={bowl} def={BOWL} x={FX(bx)} y={FY(by)} k={k} order={20} />
      <Prop tex={lid} def={LID_PROP} x={FX(lx)} y={ly} k={k} sy={1 - sq} sx={1 + sq * 0.4} order={22} />
      <ContactShadow x={FX(lx) + 8} y={ly - 6} w={90} h={26} blur={9} op={0.3 * fk} round color="#1a0e04" order={21} />
      <Prop tex={hand} def={HAND_HOSTESS} x={FX(lx)} y={hy} k={k} order={30} />
      <DustCloud m={m} f={f} cfg={cfg} order={300} fill="#fbf6e6" ink="#6b5a3a" ow={1.4} />
    </>
  );
}, [540, 960]);
// 14: the three guests gasp, the hostess beams
const Gasp = shot(({ f }) => <Living m={view(GASP.s, GASP.u0, GASP.v0)} f={f} gsc={GASP.gsc} hostess={GASP.hostess} />, [540, 800]);
// 15: the hostess beams ("Brownie Wise shows 'em at parties.")
const HostessBrownie = shot(({ f }) => {
  const m = view(2.2, 120, 0);
  return <>{bg(m, "sp/pen-bg-living.jpg")}<TActor c="hostess" f={f} {...atHead("hostess", 500, 780, 1.45)} order={200} /></>;
}, [500, 780]);
// 16: she holds the lidded bowl up ("To her friends.")
const HostessHolds = shot(({ f }) => {
  const m = view(2.2, 0, 0);
  return <>{bg(m, "sp/pen-bg-living.jpg")}<TActor c="hostess" f={f} {...atHead("hostess", 640, 760, 1.5)} order={200} /></>;
}, [640, 760]);

// ── the gift: the man's hand in the suit sleeve holds the box out to the hostess (20); next shot she holds it in her hands (21, 26, 27): the picture of the box laid over the brown one of her pose
const GIFT_K = GIFT_ON.k, GIFT_AT = GIFT_ON.at; // puppet px: the gift's foot below her neck pivot (the brown box's bottom), its scale (src/tup-layout.ts)
function GiftOn({ at, f }: { at: { x: number; y: number; scale: number }; f: number }) {
  const [tex] = useImages([GIFT.file]), [x, y] = onPuppet(at, GIFT_AT[0], GIFT_AT[1]);
  return <Prop tex={tex} def={GIFT} x={x} y={y + giftHop(f) * at.scale} k={GIFT_K * at.scale} order={230} />;
}
const GiftHand = shot(({ f }) => {
  const m = view(1.7, 100, 200), [hand] = useImages([HAND_MAN.file]), kh = 0.65;
  const x = FX(lerp(-260, 590, handK(f))), y = H / 2 - 1010; // the box's foot in the palm: in the frame it goes from off the left edge to the hostess's chest
  return (
    <>
      <Living m={m} f={f} gsc={0.36} hostess={{ u: 520, sc: 0.62, feet: 1050 }} />
      <Prop tex={hand} def={HAND_MAN} x={x} y={y} k={kh} order={250} />
    </>
  );
}, [560, 900]);
const GiftBeam = shot(({ f }) => {
  const m = view(2.2, 100, 0), at = atHead("hostess", 560, 780, 1.45);
  return <>{bg(m, "sp/pen-bg-living.jpg")}<TActor c="hostess" f={f} {...at} order={200} /><GiftOn at={at} f={f} /></>;
}, [560, 780]);
const HostessSells = shot(({ f }) => {
  const m = view(2.2, 120, 0), at = atHead("hostess", 500, 780, 1.45);
  return <>{bg(m, "sp/pen-bg-living.jpg")}<TActor c="hostess" f={f} {...at} order={200} /><GiftOn at={at} f={f} /></>;
}, [500, 780]);

// ── the order forms: a form and a pen slide along the coffee table in front of each guest and stop dead (22); the forms pile up on the table, each falling on a loud syllable (27)
const TABLE = LIVING.table, SLIDE_REST = LIVING.rest;
/** the three forms of shot 22 where they stopped, on the table: they stay there in the guests' close-ups and under the forms that pile up (QA: they vanished) */
function RestForms({ m }: { m: View }) {
  return <>{SLIDE_REST.map((u, i) => <Form key={i} m={m} u={u} v={TABLE.v - 2 + i * 3} rot={(i - 1) * 4} sy={0.55} order={160 + i} />)}</>;
}
function Form({ m, u, v, rot, sx = 1, sy = 1, pen = true, order }: { m: View; u: number; v: number; rot: number; sx?: number; sy?: number; pen?: boolean; order: number }) {
  return (
    <group position={[m.X(u), m.Y(v), 0]} rotation={[0, 0, rot * D2R]} scale={[sx * m.s, sy * m.s, 1]}>
      <Inked pts={roundRect(82, 58, 3)} color="#fbfaf2" ink="#3a3326" w={inkAt(1)} order={order} />
      {[-14, 0, 14].map((y) => <Poly key={y} pts={xf(roundRect(54, 3, 1), -6, y, 0)} color="#8d8878" order={order + 0.3} />)}
      {pen && <Poly pts={xf(roundRect(70, 4, 2), 8, -8, -18)} color="#23262e" order={order + 0.4} />}
    </group>
  );
}
const FormsSlide = shot(({ f }) => {
  const m = view(1.7, 80, 214.5);
  return (
    <>
      <Living m={m} f={f} gsc={0.34} />
      {SLIDE_REST.map((rest, i) => {
        const q = slideAt(i, f);
        if (!q.on) return null;
        const u = lerp(760, rest, q.p), v = TABLE.v - 2 + i * 3; // from just off the frame's right edge (plate u 715)
        return (
          <React.Fragment key={i}>
            <Foot x={m.X(u)} y={m.Y(v) - 4} w={96 * m.s} h={20 * m.s} op={0.3} order={158} />
            <Form m={m} u={u} v={v} rot={(i - 1) * 4} sy={0.55} order={160 + i} />
          </React.Fragment>
        );
      })}
    </>
  );
}, [540, 700]);
const guestShot = (u: number) => shot(({ f }) => { const m = view(2.6, Math.max(0, Math.min(353, u - 208)), 218); return <><Living m={m} f={f} gsc={0.4} /><RestForms m={m} /></>; }, [540, 760]);
const Guest1 = guestShot(190), Guest2 = guestShot(385), Guest3 = guestShot(560);
const FormsPile = shot(({ f }) => {
  const { s, u0, v0, gsc, fall } = LIVING.pile, m = view(s, u0, v0), OFF = [-46, 34, -12, 52, -34, 6];
  return (
    <>
      <Living m={m} f={f} gsc={gsc} />
      <RestForms m={m} />
      {FORMS.map((_, i) => {
        const q = formAt(i, f);
        if (!q.on) return null;
        const u = TABLE.u + OFF[i % 6], land = TABLE.v - 4 * i, v = land - (q.drop * fall) / m.s, flat = lerp(0.5, 0.95, q.drop), // they fall from `fall` px above the table: below the guests' faces
           rot = (i % 2 ? 1 : -1) * (7 + 3 * i) + 40 * q.drop * (i % 2 ? 1 : -1);
        return (
          <React.Fragment key={i}>
            <Foot x={m.X(u)} y={m.Y(land) - 2} w={96 * m.s * (1 - 0.3 * q.drop)} h={20 * m.s * (1 - 0.3 * q.drop)} op={0.34 * (1 - q.drop)} order={158} />
            <Form m={m} u={u} v={v} rot={rot} sx={1 + 0.08 * q.sq} sy={flat * (1 - 0.16 * q.sq)} pen={false} order={160 + i} />
          </React.Fragment>
        );
      })}
    </>
  );
}, [540, 700]);

// ── the door with the card (19): the store's door (the hall's plate), the card SOLD AT HOME PARTIES ONLY falls onto it and swings on its hinge
const DoorShot = shot(({ f }) => {
  const m = view(2.4, 120, 330), D = PR.doorHall, c = doorCardAt(f);
  const s = 1.15, hx = m.X(D.x0 + D.w / 2), hy = m.Y(D.y0 + 290);
  return (
    <>
      {bg(m, "sp/pen-bg-hall.jpg")}
      {c.on && (
        <Group x={hx} y={hy + c.drop * 900} rot={c.swing}>
          <ContactShadow x={10} y={-(DOORCARD.h * s) / 2 - 8} w={DOORCARD.w * s} h={DOORCARD.h * s} r={6} blur={12} op={0.35} color="#120a04" order={9} />
          <DoorCard x={0} y={-(DOORCARD.h * s) / 2} s={s} sx={1 + 0.06 * c.sq} sy={1 - 0.1 * c.sq} order={10} ink={inkAt(1.4)} />
        </Group>
      )}
    </>
  );
}, [540, 900]);

// ── the newspaper: it spins in over the dark hall and stops dead on the thud (29), then the page's sum (30)
const paperBack = (m: View) => bg(m, "sp/pen-bg-hall.jpg", 0, "#6c5a49");
const PaperSpin = shot(({ f }) => {
  const m = view(2.4, 120, 330), p = paperAt(f), air = 1 - p.s;
  return (
    <>
      {paperBack(m)}
      {p.on && <ContactShadow x={22 + 60 * air} y={FY(PAGE.y) - 26 - 90 * air} w={PAPER.w * PAGE.s * p.s} h={PAPER.h * PAGE.s * p.s} r={8} rot={p.rot} blur={26 + 20 * air} op={0.42 - 0.2 * air} color="#120a04" order={9} />}
      <Newspaper x={0} y={FY(PAGE.y)} s={PAGE.s * p.s} rot={p.rot} op={p.on ? 1 : 0} order={10} ink={inkAt(PAGE.s)} />
    </>
  );
}, [540, 880]);
const PaperClose = ({ f }: { f: number }) => {
  const m = view(2.4, 120, 330); // the same page, in the same place and at the same tilt as the shot before, the camera pushing on from where that shot's hold left it
  return (
    <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(540, 880)}>
      {paperBack(m)}
      <Newspaper x={0} y={FY(PAGE.y)} s={PAGE.s} rot={-2} order={10} ink={inkAt(PAGE.s)} />
    </Panel>
  );
};

export const STORY_SCENES: Partial<Record<ShotId, React.FC<{ f: number }>>> = {
  storeDust: StoreDust, pileBowls: PileBowls, storeWide: StoreWide, lidPop: LidPop, clerkShrug: ClerkShrug, burp: BurpScene, gasp: Gasp, hostessBrownie: HostessBrownie, hostessHolds: HostessHolds, storeEmpty: StoreEmpty,
  doorCard: DoorShot, giftHand: GiftHand, giftBeam: GiftBeam, formsSlide: FormsSlide, guest1: Guest1, guest2: Guest2, guest3: Guest3, hostessSells: HostessSells, formsPile: FormsPile, paperSpin: PaperSpin, paperClose: PaperClose,
};
