import React from "react";
import * as THREE from "three";
import { Glow, Inked, Panel, Picture, Poly, Puppet, ribbon, type Pt } from "./sp-puppet";
import { ContactShadow, Plane, useCanvasTexture, useImages } from "./sp-fx";
import rig4 from "./because-rig.json";
import rig3 from "./tip-rig.json";
import crops from "./because-crops.json";
import { lerp } from "./sp-math";
import { drawScreen } from "./because-ui";
import {
  FPS, T, cashierInside, cupFall, cupOn, doorAngle, ease, hatWear, headsetWear, landDip, piesOn, poseAt, popK, rhondaP, rhondaStep, screenText, shotAt, trayOn,
  walkP, walkStep, type Char, type ShotId,
} from "./because-sched";

// The three.js scenes of "Because". Every shot is one full-frame ortho canvas (Panel, 1080 x 1920) showing a picture of out/sp-cast4 (public/sp/because-*): the counter from the dining room
// (plate A: the menu board over the counter, the swing door at the back) and the same counter from behind it (plate B: the dining room beyond), the puppets (src/sp-puppet.tsx: Denise is Tip's
// hoodie puppet, the cashier and Rhonda are new), the painted props (a tray, a cup the size of a trash can, two pies, a paper hat, a headset, the customer-facing screen) and what is drawn in code:
// the menu board's words, the totals, the headset's band, the swing door's leaf. All numbers below are px of the frame (y down) unless a name says plate px; FX/FY turn them into the
// panel's (origin in the middle, y up). One function per framing. Textures are loaded inside each Panel (a hook that suspends above the canvas stalls the render of the next cut).
export const W = 1080, H = 1920;
const FX = (px: number) => px - W / 2, FY = (py: number) => H / 2 - py;
const D2R = Math.PI / 180;
type Def = { file: string; w: number; h: number; ox: number; oy: number; screen?: number[]; l?: PartDef; r?: PartDef; band?: { w: number; colour: string } };
type PartDef = { file: string; w: number; h: number; cx: number; cy: number };
type RigLite = { pivot: [number, number]; disc: [number, number, number]; eyes: { cx: number; cy: number; rx: number; ry: number }[] };
const R4 = rig4 as unknown as { props: Record<string, Def>; scenes: { counter: { board: number[]; boardIn: number[]; counterTop: number; door: number[] }; back: { far: number } }; cashier: RigLite; rhonda: RigLite };
const R3 = rig3 as unknown as { deniseHood: RigLite };
const PR = R4.props, SC = R4.scenes;

type View = { s: number; X: (u: number) => number; Y: (v: number) => number };
const view = (s: number, u0: number, v0: number): View => ({ s, X: (u) => -W / 2 + (u - u0) * s, Y: (v) => H / 2 - (v - v0) * s });
const bg = (m: View, file: string, order = 0, tint?: string) => <Picture file={file} w={768 * m.s} h={1344 * m.s} x={m.X(384)} y={m.Y(672)} order={order} tint={tint} />;
const strip = (m: View, file: string, y0: number, order: number) => <Picture file={file} w={768 * m.s} h={(1344 - y0) * m.s} x={m.X(384)} y={m.Y((1344 + y0) / 2)} order={order} alpha />;
/** the focus that puts the frame point (x, y) (px, y down) in the middle of the frame when the camera zooms by z about the focus (src/sp-puppet.tsx Cam) */
const centreOn = (x: number, y: number, z: number): [number, number] => [(FX(x) * z) / (z - 1), (FY(y) * z) / (z - 1)];
const prog = (f: number) => shotAt(f).u; // 0..1 through the current shot: the slow push-in of a hold
const Foot = ({ x, y, w, order, op = 0.34 }: { x: number; y: number; w: number; order: number; op?: number }) => <ContactShadow x={FX(x)} y={FY(y)} w={w} h={w * 0.16} blur={10} op={op} round color="#1a1208" order={order} />;
const Group = ({ x, y, rot = 0, sx = 1, sy = 1, children }: { x: number; y: number; rot?: number; sx?: number; sy?: number; children: React.ReactNode }) => (
  <group position={[x, y, 0]} rotation={[0, 0, rot * D2R]} scale={[sx, sy, 1]}>{children}</group>
);

// how far a puppet's feet are below its neck pivot, in puppet px (measured on the cut-outs), and where its head is
const BELOW: Record<Char, number> = { deniseHood: 636, cashier: 727, rhonda: 705 };
const RIGS: Record<Char, RigLite> = { deniseHood: R3.deniseHood, cashier: R4.cashier, rhonda: R4.rhonda };
const UP = (c: Char) => RIGS[c].pivot[1] - RIGS[c].disc[1]; // the head disc's centre above the neck pivot, puppet px
/** where a puppet's neck pivot goes so that its feet stand at plate y `feet` (plate A, B: v grows down) with the puppet scaled by sc plate px per puppet px, or so that its waist is at `waist` */
const pivotForFeet = (c: Char, feet: number, sc: number) => feet - BELOW[c] * sc;
const pivotForWaist = (c: Char, waist: number, sc: number) => waist - 0.42 * BELOW[c] * sc;

// ── what is worn on a head: the paper hat (over the band) and the headset (the band under the hat, the cups at the ears, the microphone boom from the left one). All of it is in the head's own
// px, y up, from the middle of the head disc, so the same nodes ride on a head (src/sp-puppet.tsx headAttach) or fly in a group of their own
const HEAD = (c: "deniseHood" | "cashier") => {
  const R = RIGS[c], [cx, cy, r] = R.disc, e = R.eyes[0];
  return { dx: cx - R.pivot[0], dy: R.pivot[1] - cy, r, hatBottom: cy - (e.cy - 1.45 * e.ry) }; // the hat's lowest point: just over the brows, in px up from the disc's centre
};
const HEADS = { deniseHood: HEAD("deniseHood"), cashier: HEAD("cashier") };
const HAT_W = 691; // the painted hat is 691 px wide (its layer is 700 x 391, the lowest point of its brim 386 px down, in the middle)
type PropTex = { hat: THREE.Texture; hl: THREE.Texture; hr: THREE.Texture };
function HatNode({ tex, r, bottom, order, squash = 0 }: { tex: THREE.Texture; r: number; bottom: number; order: number; squash?: number }) {
  const s = (2.08 * r) / HAT_W, h = PR.hat;
  return <Plane tex={tex} x={0} y={bottom + (386 - h.h / 2) * s * (1 - squash)} w={h.w * s} h={h.h * s} sy={1 - squash} order={order} />;
}
function HeadsetBand({ r, order }: { r: number; order: number }) {
  const sc = (0.5 * r) / 167, HL = PR.headset.l!, HR = PR.headset.r!, cupX = r + 2, cupY = -0.08 * r;
  const x0 = -cupX + (34 - HL.cx) * sc, x3 = cupX + (141 - HR.cx) * sc, y0 = cupY + HL.cy * sc;
  const k = (r + 4 - y0) / 0.75;
  const pl: number[][] = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; pl.push([a * x0 + b * x0 + c * x3 + d * x3, a * y0 + b * (y0 + k) + c * (y0 + k) + d * y0, 45 * sc]); }
  return <Inked pts={ribbon(pl)} color={PR.headset.band!.colour} ink="#0b0b0b" w={1.3} order={order} />;
}
function HeadsetCups({ texL, texR, r, order }: { texL: THREE.Texture; texR: THREE.Texture; r: number; order: number }) {
  const sc = (0.5 * r) / 167, HL = PR.headset.l!, HR = PR.headset.r!, cupX = r + 2, cupY = -0.08 * r;
  return (
    <>
      <Plane tex={texL} x={-cupX + (HL.w / 2 - HL.cx) * sc} y={cupY - (HL.h / 2 - HL.cy) * sc} w={HL.w * sc} h={HL.h * sc} order={order} />
      <Plane tex={texR} x={cupX + (HR.w / 2 - HR.cx) * sc} y={cupY - (HR.h / 2 - HR.cy) * sc} w={HR.w * sc} h={HR.h * sc} order={order} />
    </>
  );
}
type Worn = { hat: boolean; hs: boolean; hatSquash?: number };
/** the nodes on a head, for Puppet's headAttach (the puppet's own order is 40-ish: the hat sits over the face's parts, which end at +14) */
function Attach({ who, worn, tex, order }: { who: "deniseHood" | "cashier"; worn: Worn; tex: PropTex; order: number }) {
  const h = HEADS[who];
  if (!worn.hat && !worn.hs) return null;
  return (
    <group position={[h.dx, h.dy, 0]}>
      {worn.hs && <HeadsetBand r={h.r} order={order + 15} />}
      {worn.hat && <HatNode tex={tex.hat} r={h.r} bottom={h.hatBottom} order={order + 16} squash={worn.hatSquash} />}
      {worn.hs && <HeadsetCups texL={tex.hl} texR={tex.hr} r={h.r} order={order + 16.5} />}
    </group>
  );
}
const useProps = () => {
  const [hat, hl, hr, tray, cup, pies] = useImages([PR.hat.file, PR.headset.l!.file, PR.headset.r!.file, PR.tray.file, PR.cup.file, PR.pies.file]);
  return { hat, hl, hr, tray, cup, pies };
};
const cashierWorn = (f: number): Worn => ({ hat: hatWear(f).on === "cashier", hs: headsetWear(f).on === "cashier" });
const deniseWorn = (f: number): Worn => ({ hat: hatWear(f).on === "denise", hs: headsetWear(f).on === "denise", hatSquash: 0.12 * landDip(f, T.hatLand) });

// ── the menu board's words (the painted board is blank): a title and two columns of items with prices; `rect` is the board's dark inside in plate px. Left blank under the share line.
function BoardText({ m, order = 2 }: { m: View; order?: number }) {
  const [x0, y0, x1, y1] = SC.counter.boardIn, w = x1 - x0, h = y1 - y0, k = 2;
  const M = 84; // the text keeps 84 px in from the board's edges, so the camera's creep (zoom 1.2) does not cut a word at the frame's edge
  const tex = useCanvasTexture(w * k, h * k, (g) => {
    g.clearRect(0, 0, w * k, h * k); g.scale(k, k);
    g.textBaseline = "alphabetic";
    g.fillStyle = "#f6f0de"; g.font = "900 42px Arial, Helvetica, sans-serif"; g.textAlign = "left"; g.fillText("BURGERS", M, 76); // (at the left, and small enough to stay clear of the total's monitor over the board's top right even when the camera has crept in)
    g.fillStyle = "rgba(246,240,222,0.55)"; g.fillRect(M, 92, 226, 4);
    const rows: [string, string, string, string][] = [["CHEESEBURGER", "3.49", "FRIES", "2.19"], ["DOUBLE", "5.29", "SHAKE", "3.29"], ["CHICKEN", "4.79", "PIE", "1.49"]];
    const colW = (w - 2 * M) / 2 - 12, rx = w / 2 + 12;
    let sz = 38; // the biggest size at which every name and its price fit their column with a gap between them
    for (; sz > 16; sz--) { g.font = `800 ${sz}px Arial, Helvetica, sans-serif`; if (rows.every(([a, pa, b, pb]) => g.measureText(a).width + g.measureText(pa).width + 14 <= colW && g.measureText(b).width + g.measureText(pb).width + 14 <= colW)) break; }
    rows.forEach(([a, pa, b, pb], i) => {
      const y = 166 + i * 68;
      g.font = `800 ${sz}px Arial, Helvetica, sans-serif`; g.textAlign = "left"; g.fillStyle = "#f6f0de"; g.fillText(a, M, y); g.fillText(b, rx, y);
      g.textAlign = "right"; g.fillStyle = "#ffbf47"; g.fillText(pa, M + colW, y); g.fillText(pb, rx + colW, y);
    });
  }, []);
  return <Plane tex={tex} x={m.X((x0 + x1) / 2)} y={m.Y((y0 + y1) / 2)} w={w * m.s} h={h * m.s} order={order} />;
}

// ── the swing door at the back of plate A: its leaf is a sprite cut from the plate, hinged on its right, over a dark doorway; closed, the plate's own door shows
function StaffDoor({ m, f, order }: { m: View; f: number; order: number }) {
  const [leaf] = useImages([PR.door.file]);
  const D = PR.door as unknown as { x0: number; y0: number; w: number; h: number };
  const a = doorAngle(f);
  if (a < 0.4) return null;
  const c = Math.cos(a * D2R), x1 = D.x0 + D.w;
  const pts: Pt[] = [[m.X(D.x0 + 6), m.Y(D.y0 + 6)], [m.X(x1 - 6), m.Y(D.y0 + 6)], [m.X(x1 - 6), m.Y(D.y0 + D.h)], [m.X(D.x0 + 6), m.Y(D.y0 + D.h)]];
  return (
    <>
      <Poly pts={pts} color="#17181c" order={order} />
      <Plane tex={leaf} x={m.X(x1) - (D.w * m.s * c) / 2} y={m.Y(D.y0 + D.h / 2)} w={D.w * m.s} h={D.h * m.s} sx={c} order={order + 1} />
    </>
  );
}

// ── the counter's props. `s` is plate px per layer px; (u, v) the middle of the base in plate px
const PROPK = { tray: 0.4, cup: 0.43, pies: 0.27 }; // plate px per layer px for a person scaled by 1 (a person of scale sc takes PROPK * sc)
type PropAt = { u: number; sc: number };
function Prop({ tex, def, x, y, s, sx = 1, sy = 1, order }: { tex: THREE.Texture; def: Def; x: number; y: number; s: number; sx?: number; sy?: number; order: number }) {
  return (
    <Group x={x} y={y} sx={sx} sy={sy}>
      <Plane tex={tex} x={0} y={(def.h * s) / 2} w={def.w * s} h={def.h * s} order={order} />
    </Group>
  );
}
/** the tray, the cup and the pies on the counter top at plate y `v`; `cx` is the middle of the person at the counter and `sc` that person's scale; positions are offsets from him in a medium close shot (sc 0.62) */
function Pile({ m, f, tex, v, cx, sc, order, slamming = false }: { m: View; f: number; tex: ReturnType<typeof useProps>; v: number; cx: number; sc: number; order: number; slamming?: boolean }) {
  const t = f / FPS, k = sc / 0.62;
  const tray = popK(t, T.tray), pies = popK(t, T.pies);
  const cf = cupFall(f);
  const trayS = PROPK.tray * sc * m.s, cupS = PROPK.cup * sc * m.s, piesS = PROPK.pies * sc * m.s;
  const trayAt = { u: cx - 150 * k }, piesAt = { u: cx + 20 * k }, cupAt = { u: cx + 175 * k };
  const bump = slamming ? 5 * m.s * cf.kick : 0; // the tray jolts down when the cup lands on it
  const shade = (x: number, s: number, def: Def, k = 1) => <ContactShadow x={x} y={m.Y(v) - 4} w={def.w * s * 0.95 * k} h={def.w * s * 0.1} blur={7} op={0.3} round color="#2a1a08" order={order - 0.5} />; // (x: panel px)
  return (
    <>
      {trayOn(f) && shade(m.X(trayAt.u), trayS * Math.max(0.01, tray), PR.tray)}
      {trayOn(f) && <Prop tex={tex.tray} def={PR.tray} x={m.X(trayAt.u)} y={m.Y(v) - bump} s={trayS * Math.max(0.01, tray)} sy={1 - 0.05 * cf.kick} order={order} />}
      {cupOn(f) && cf.drop < 0.02 && shade(m.X(cupAt.u), cupS, PR.cup, 0.9)}
      {cupOn(f) && <Prop tex={tex.cup} def={PR.cup} x={m.X(cupAt.u)} y={m.Y(v) + cf.drop * 1500 - bump * 0} s={cupS} sx={cf.sx} sy={cf.sy} order={order + 1} />}
      {piesOn(f) && shade(m.X(piesAt.u), piesS * Math.max(0.01, pies), PR.pies)}
      {piesOn(f) && <Prop tex={tex.pies} def={PR.pies} x={m.X(piesAt.u)} y={m.Y(v)} s={piesS * Math.max(0.01, pies)} order={order + 2} />}
    </>
  );
}

const pose = (c: Char, f: number) => poseAt(c, f);
const CA = SC.counter.counterTop; // plate A: the counter's top edge, 800

// ───────────────────────────────────────────── shot 1: the counter from the dining room, wide: Denise, small, under the giant menu board; the cashier behind the register
const WIDE = { m: view(1.4286, 6, 0), den: { u: 470, feet: 1190, sc: 0.4 }, cash: { u: 300, sc: 0.36 } };
function WideScene({ f, end }: { f: number; end: boolean }) {
  const tex = useProps();
  const { m } = WIDE;
  const dsc = WIDE.den.sc, csc = WIDE.cash.sc;
  // the opening: Denise in front of the counter (right), the cashier behind it (left). The ending turns it round: Denise behind the counter in his place, Rhonda in front
  const dv = end ? pivotForWaist("deniseHood", CA, 0.4) : pivotForFeet("deniseHood", WIDE.den.feet, dsc);
  const du = end ? 384 : WIDE.den.u;
  const rsc = 0.38, rfeet = 1190;
  return (
    <>
      {bg(m, "sp/because-bg-counter.jpg", 0)}
      {!end && <BoardText m={m} />}
      <StaffDoor m={m} f={f} order={3} />
      {!end && <Puppet char="cashier" pose={pose("cashier", f)} x={m.X(WIDE.cash.u)} y={m.Y(pivotForWaist("cashier", CA, csc))} scale={csc * m.s} order={40} headAttach={<Attach who="cashier" worn={cashierWorn(f)} tex={tex} order={40} />} />}
      {end && <Puppet char="deniseHood" pose={pose("deniseHood", f)} x={m.X(du)} y={m.Y(dv)} scale={0.4 * m.s} order={40} headAttach={<Attach who="deniseHood" worn={deniseWorn(f)} tex={tex} order={40} />} />}
      {strip(m, "sp/because-fg-counter.png", CA, 100)}
      {end && <Pile m={m} f={f} tex={tex} v={CA + 30} cx={384} sc={0.4} order={104} />}
      {!end && <>
        <Foot x={m.X(du) + W / 2} y={H / 2 - m.Y(WIDE.den.feet)} w={250 * (dsc / 0.4)} order={118} />
        <Puppet char="deniseHood" pose={pose("deniseHood", f)} x={m.X(du)} y={m.Y(dv)} scale={dsc * m.s} order={120} />
      </>}
      {end && <>
        <Foot x={m.X(560) + W / 2} y={H / 2 - m.Y(rfeet)} w={250 * (rsc / 0.4)} order={118} />
        <Puppet char="rhonda" pose={pose("rhonda", f)} x={m.X(560)} y={m.Y(pivotForFeet("rhonda", rfeet, rsc))} scale={rsc * m.s} order={120} />
      </>}
    </>
  );
}
export const DenWide = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.05 * prog(f)} focus={[FX(540), FY(1150)]}><WideScene f={f} end={false} /></Panel>;
export const WideEnd = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.02 * prog(f)} focus={[FX(540), FY(1150)]}><WideScene f={f} end /></Panel>;

// ───────────────────────────────────────────── the cashier, medium close, behind the counter with the board over his head (shots 2, 4, 6, 8, 10, 12, 14); and Denise in his place (shots 22, 23, 24)
const MC = { m: view(1.8, 84, 11), u: 384, sc: 0.62 };
function CounterMc({ f, who, board = true }: { f: number; who: "cashier" | "deniseHood"; board?: boolean }) {
  const tex = useProps();
  const { m, u } = MC;
  const sc = who === "cashier" ? MC.sc : 0.66;
  const v = pivotForWaist(who, CA, sc);
  const worn = who === "cashier" ? cashierWorn(f) : deniseWorn(f);
  return (
    <>
      {bg(m, "sp/because-bg-counter.jpg", 0)}
      {board && <BoardText m={m} />}
      <StaffDoor m={m} f={f} order={3} />
      <Puppet char={who} pose={pose(who, f)} x={m.X(u)} y={m.Y(v)} scale={sc * m.s} order={40} headAttach={<Attach who={who} worn={worn} tex={tex} order={40} />} />
      {strip(m, "sp/because-fg-counter.png", CA, 100)}
      <Pile m={m} f={f} tex={tex} v={CA + 28} cx={u} sc={MC.sc} order={104} />
    </>
  );
}
const mcShot = (who: "cashier" | "deniseHood", z0 = 1, z1 = 1.04) => ({ f }: { f: number }) => <Panel w={W} h={H} zoom={lerp(z0, z1, prog(f))} focus={[FX(540), FY(900)]}><CounterMc f={f} who={who} /></Panel>;
// the camera creeps in on the cashier a little more with every ask (1.0 -> 1.2 over seven shots), so the ladder tightens as the asks speed up; a face stays under 1.6 times its picture
const CASH_ZOOM: Partial<Record<ShotId, [number, number]>> = { cash2: [1.0, 1.03], cash4: [1.03, 1.06], cash6: [1.06, 1.09], cash8: [1.09, 1.12], cash10: [1.12, 1.15], cash12: [1.15, 1.18], cashLook: [1.18, 1.2] };
export const CashMc = ({ f }: { f: number }) => {
  const sh = shotAt(f), [z0, z1] = CASH_ZOOM[sh.id] ?? [1, 1.04];
  return <Panel w={W} h={H} zoom={lerp(z0, z1, sh.u)} focus={[FX(540), FY(900)]}><CounterMc f={f} who="cashier" /></Panel>;
};
export const DenSay = mcShot("deniseHood");
// the push-in on the cashier for the franchise line, and Denise's close-up for "Fucking marketing."
export const CashPush = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={lerp(1.2, 1.34, prog(f))} focus={centreOn(540, 800, 1.3)}><CounterMc f={f} who="cashier" /></Panel>;
export const DenSwear = ({ f }: { f: number }) => { const z = lerp(1.04, 1.16, prog(f)); return <Panel w={W} h={H} zoom={z} focus={centreOn(540, 830, 1.3)}><CounterMc f={f} who="deniseHood" /></Panel>; };
// her eyes widen: the same picture, much closer, a push-in on her eyes
export const DenEyes = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={lerp(1.22, 1.33, prog(f))} focus={centreOn(540, 800, 1.36)}><CounterMc f={f} who="deniseHood" board={false} /></Panel>;

// ───────────────────────────────────────────── Denise, close, on the customer's side: the counter from behind with the dining room beyond (plate B). The counter's top is in the
// foreground (the props stand on it), Denise's torso comes up over its far edge, the window and the door are behind her head
const BACK = { m: view(2.0, 114, 57), u: 384, sc: 0.725, v: 577 };
function BackDen({ f, tray }: { f: number; tray: boolean }) {
  const tex = useProps();
  const m = tray ? view(1.7, 66, 44) : BACK.m;
  const sc = tray ? 0.6 : BACK.sc, v = tray ? 560 : BACK.v;
  const cx = tray ? 384 : BACK.u;
  return (
    <>
      {bg(m, "sp/because-bg-back.jpg", 0)}
      <Puppet char="deniseHood" pose={pose("deniseHood", f)} x={m.X(cx)} y={m.Y(v)} scale={sc * m.s} order={40} />
      {strip(m, "sp/because-fg-back.png", SC.back.far, 100)}
      <Pile m={m} f={f} tex={tex} v={792} cx={cx + (tray ? 35 : 0)} sc={sc * 0.86} order={104} slamming={tray} />
    </>
  );
}
export const DenClose = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.03 * prog(f)} focus={[FX(540), FY(900)]}><BackDen f={f} tray={false} /></Panel>;
export const DenTray = ({ f }: { f: number }) => { const k = cupFall(f).kick; return <Panel w={W} h={H} zoom={1 + 0.03 * prog(f) + 0.012 * k} focus={[FX(540), FY(1000)]}><BackDen f={f} tray /></Panel>; };

// ───────────────────────────────────────────── shot 17: the customer-facing screen, an insert: the painted monitor (4x crop) over the dimmed counter, the total rolls up to two million
const SCREEN = { c: [510, 760] as [number, number], k: 1.45 };
function ScreenScene({ f }: { f: number }) {
  const [mon] = useImages([crops.screen.file]);
  const st = screenText(f);
  const tex = useCanvasTexture(1176, 716, (g) => drawScreen(g, 1176, 716, st.text, st.sub, st.locked), [st.text, st.sub, st.locked]);
  const t = f / FPS, m = view(1.9, 80, 150);
  const S = PR.screen, [sx0, sy0, sx1, sy1] = S.screen!, k = SCREEN.k;
  const lx = (u: number) => FX(SCREEN.c[0]) + (u - S.w / 2) * k, ly = (v: number) => FY(SCREEN.c[1]) - (v - S.h / 2) * k; // layer px -> panel px
  const pop = t >= T.lock ? Math.exp(-(t - T.lock) / 0.12) : 0; // the lock: a short flash and a shake
  return (
    <>
      {bg(m, "sp/because-bg-counter.jpg", 0, "#6f6f6f")}
      <Plane tex={mon} x={lx(S.w / 2)} y={ly(S.h / 2)} w={S.w * k} h={S.h * k} order={50} />
      <Plane tex={tex} x={lx((sx0 + sx1) / 2)} y={ly((sy0 + sy1) / 2)} w={(sx1 - sx0) * k} h={(sy1 - sy0) * k} order={51} />
      {pop > 0.02 && <Glow x={lx((sx0 + sx1) / 2)} y={ly((sy0 + sy1) / 2)} rx={560} ry={380} op={0.55 * pop} order={52} color="rgba(255,236,150,1)" />}
    </>
  );
}
export const Screen = ({ f }: { f: number }) => {
  const t = f / FPS, a = t - T.lock, kick = a >= 0 ? Math.exp(-a / 0.07) : 0;
  return <Panel w={W} h={H} zoom={1 + 0.05 * prog(f) + 0.015 * kick} focus={[FX(540), FY(800)]}><ScreenScene f={f} /></Panel>;
};

// ───────────────────────────────────────────── shot 18: the hat and the headset change heads, he walks away to the door at the back and goes out. A two-shot: the cashier behind the counter in
// the middle, Denise in front of it on the left, the swing door on the right
const SWAP = { m: view(1.5, 20, 64), cash: { u: 400, sc: 0.5 }, den: { u: 215, feet: 1250, sc: 0.58 }, door: { u: 603 } };
const flight = (a: [number, number], b: [number, number], u: number, lift: number): [number, number] => [lerp(a[0], b[0], ease(u)), lerp(a[1], b[1], ease(u)) + lift * Math.sin(Math.PI * u)];
function SwapScene({ f }: { f: number }) {
  const tex = useProps();
  const { m } = SWAP, t = f / FPS;
  const p = walkP(f), step = walkStep(f);
  const csc = lerp(SWAP.cash.sc, 0.2, p) * (cashierInside(f) ? 0.01 : 1);
  const cu = lerp(SWAP.cash.u, SWAP.door.u, p), cv = lerp(pivotForWaist("cashier", CA, SWAP.cash.sc), 800 - 727 * 0.2 - 6, p) - Math.abs(step) * 10 * csc;
  const dsc = SWAP.den.sc, dv = pivotForFeet("deniseHood", SWAP.den.feet, dsc);
  const cp = pose("cashier", f); cp.tilt += 3 * step; cp.gaze = [0.6, 0.05];
  const dp = pose("deniseHood", f); dp.bob -= 7 * Math.max(0, landDip(f, T.hatLand)) + 4 * Math.max(0, landDip(f, T.hsLand)); // her head dips under the hat and again under the headset
  // the head discs in panel px (y up), for the flights
  const hc = HEADS.cashier, hd = HEADS.deniseHood;
  const cashHead: [number, number] = [m.X(SWAP.cash.u) + hc.dx * SWAP.cash.sc * m.s, m.Y(pivotForWaist("cashier", CA, SWAP.cash.sc)) + hc.dy * SWAP.cash.sc * m.s];
  const denHead: [number, number] = [m.X(SWAP.den.u) + hd.dx * dsc * m.s, m.Y(dv) + hd.dy * dsc * m.s];
  const hat = hatWear(f), hs = headsetWear(f);
  const fly = (w: ReturnType<typeof hatWear>, kind: "hat" | "hs") => {
    if (w.on !== "flight") return null;
    const bot = (c: "cashier" | "deniseHood") => (kind === "hat" ? HEADS[c].hatBottom : 0);
    const a: [number, number] = [cashHead[0], cashHead[1] + bot("cashier") * SWAP.cash.sc * m.s];
    const b: [number, number] = [denHead[0], denHead[1] + bot("deniseHood") * dsc * m.s];
    const [x, y] = flight(a, b, w.u, 150);
    const sc = lerp(SWAP.cash.sc, dsc, ease(w.u)) * m.s, spin = (kind === "hat" ? -16 : 12) * Math.sin(Math.PI * w.u);
    return (
      <Group x={x} y={y} rot={spin} sx={sc} sy={sc}>
        {kind === "hat" ? <HatNode tex={tex.hat} r={lerp(hc.r, hd.r, ease(w.u))} bottom={0} order={300} /> : <><HeadsetBand r={lerp(hc.r, hd.r, ease(w.u))} order={300} /><HeadsetCups texL={tex.hl} texR={tex.hr} r={lerp(hc.r, hd.r, ease(w.u))} order={301} /></>}
      </Group>
    );
  };
  void t;
  return (
    <>
      {bg(m, "sp/because-bg-counter.jpg", 0)}
      <BoardText m={m} />
      <StaffDoor m={m} f={f} order={3} />
      <Puppet char="cashier" pose={cp} x={m.X(cu)} y={m.Y(cv)} scale={csc * m.s} visible={!cashierInside(f)} order={40} headAttach={<Attach who="cashier" worn={cashierWorn(f)} tex={tex} order={40} />} />
      {strip(m, "sp/because-fg-counter.png", CA, 100)}
      <Pile m={m} f={f} tex={tex} v={CA + 34} cx={SWAP.cash.u} sc={SWAP.cash.sc} order={104} />
      <Foot x={m.X(SWAP.den.u) + W / 2} y={H / 2 - m.Y(SWAP.den.feet)} w={250 * (dsc / 0.4)} order={118} />
      <Puppet char="deniseHood" pose={dp} x={m.X(SWAP.den.u)} y={m.Y(dv)} scale={dsc * m.s} order={120} headAttach={<Attach who="deniseHood" worn={deniseWorn(f)} tex={tex} order={120} />} />
      {fly(hat, "hat")}
      {fly(hs, "hs")}
    </>
  );
}
export const Swap = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.03 * prog(f)} focus={[FX(540), FY(1000)]}><SwapScene f={f} /></Panel>;

// ───────────────────────────────────────────── shots 19 and 20: the counter from behind. Denise (staff, nearest the camera) in the hat and the headset; Rhonda walks up on the far side of
// the counter with her coffee (19), then she is alone in the frame, medium close (20)
const BACK2 = { m: view(1.6, 60, 140), den: { u: 250, feet: 1330, sc: 0.8 }, rhonda: { u: 500, sc: 0.45 } };
function BackTwo({ f }: { f: number }) {
  const tex = useProps();
  const { m } = BACK2, p = rhondaP(f), step = rhondaStep(f);
  const rsc = BACK2.rhonda.sc;
  const ru = lerp(780, BACK2.rhonda.u, p), rv = pivotForWaist("rhonda", SC.back.far, rsc) - Math.abs(step) * 9;
  const rp = pose("rhonda", f); rp.tilt += 3 * step; rp.gaze = [-0.5 + 0.2 * (1 - p), 0.1];
  const dv = pivotForFeet("deniseHood", BACK2.den.feet, BACK2.den.sc);
  return (
    <>
      {bg(m, "sp/because-bg-back.jpg", 0)}
      <Puppet char="rhonda" pose={rp} x={m.X(ru)} y={m.Y(rv)} scale={rsc * m.s} order={40} />
      {strip(m, "sp/because-fg-back.png", SC.back.far, 100)}
      <Pile m={m} f={f} tex={tex} v={792} cx={430} sc={0.34} order={104} />
      <Puppet char="deniseHood" pose={pose("deniseHood", f)} x={m.X(BACK2.den.u)} y={m.Y(dv)} scale={BACK2.den.sc * m.s} order={120} headAttach={<Attach who="deniseHood" worn={deniseWorn(f)} tex={tex} order={120} />} />
    </>
  );
}
export const BackDenWide = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.03 * prog(f)} focus={[FX(540), FY(1000)]}><BackTwo f={f} /></Panel>;
const RM = { m: view(2.0, 200, 57), u: 470, sc: 0.62 };
function RhondaScene({ f }: { f: number }) {
  const tex = useProps();
  const { m } = RM;
  const v = pivotForWaist("rhonda", SC.back.far, RM.sc);
  return (
    <>
      {bg(m, "sp/because-bg-back.jpg", 0)}
      <Puppet char="rhonda" pose={pose("rhonda", f)} x={m.X(RM.u)} y={m.Y(v)} scale={RM.sc * m.s} order={40} />
      {strip(m, "sp/because-fg-back.png", SC.back.far, 100)}
      <Pile m={m} f={f} tex={tex} v={792} cx={560} sc={0.5} order={104} />
    </>
  );
}
export const RhondaMc = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.03 * prog(f)} focus={[FX(540), FY(900)]}><RhondaScene f={f} /></Panel>;
