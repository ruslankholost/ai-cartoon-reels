import React from "react";
import * as THREE from "three";
import { Glow, Inked, Panel, Picture, Poly, Puppet, ellipsePts, roundRect, xf, type Pt } from "./sp-puppet";
import { ContactShadow, Plane, ShadowOf, inkAt, useCanvasTexture, useImages } from "./sp-fx";
import rig3 from "./tip-rig.json";
import crops from "./tip-crops.json";
import { DESIGN, drawKiosk, drawTerminal, heart, type KioskState, type TerminalState } from "./tip-screens";
import { FPS, LINE, QUEUE, T, beaconRed, bellAngle, clamp01, doorAngle, ease, easeOut, fingerKioskAt, fingerNoAt, keys, kioskScreen, kyleOut, machineAmp, poseAt, scanDip, shotAt, swingAngle, swingGrow, terminalScreen, walkFrame, type Char, type Pose } from "./tip-sched";

// The three.js scenes of "Tip?". Every shot is one full-frame ortho canvas (Panel, 1080 x 1920) showing a picture of out/sp-cast3 (public/sp/tip-*), the puppets cut from the pictures
// (src/sp-puppet.tsx), the painted props (the terminal, the kiosk, the bag, the jar, two hands) and the screens, drawn in code (src/tip-screens.ts) as textures laid over the painted glass.
// The name tag, the jar's label, the chalkboard and the coffee shop's door are drawn in code too. All numbers below are px of the frame (y down) unless a name says picture px; FX/FY turn
// them into the panel's (origin in the middle, y up). One function per framing. The sets are one scene with several cameras: the store (hook, reverse, wide, Kyle), the hall (wide, kiosk,
// aisle, two-shot, the close-ups), the coffee shop (counter plate for the callback and Denise's close-ups; the flat wide plate for Kyle's close-up and the walk out). A close-up of a puppet is at most
// 1.6 times the source picture; the painted terminal and kiosk of the inserts are shown 2.6-4.6 times (their crops are upscaled 4x, scripts/tip-upscale.py).
export const W = 1080, H = 1920;
const FX = (px: number) => px - W / 2, FY = (py: number) => H / 2 - py;
const D2R = Math.PI / 180;
type Def = { file: string; w: number; h: number; ox: number; oy: number; screen?: number[]; pivot?: number[]; bulb?: number[]; tip?: number[]; label?: number[] };
const R = rig3 as unknown as { props: Record<string, Def>; scenes: Record<string, any>; deniseHood: { pivot: [number, number]; tags: Record<string, { x: number; top: number; w: number }> } };
const PR = R.props, SC = R.scenes;
// how far a puppet's feet are below its neck pivot, in puppet px (measured on the cut-outs)
const BELOW: Record<Char, number> = { deniseHood: 636, kyle: 739, kyleJ: 700, attendant: 714, lineA: 413, lineB: 617, lineC: 484, lineD: 687 };
// where Denise stands at the kiosk: where her fingertip would reach "no tip" (the fingertip of v2's 'tap' pose, from her neck pivot in puppet px; mirrored, her hand is on the kiosk's side), a step back
const TIP = { dx: 183, dy: -59 };
const bump = (t: number, a: number, b: number, c: number, d: number) => ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c))); // 0 .. 1 (from a to b) .. 1 (to c) .. 0 (at d)
const prog = (f: number) => shotAt(f).u; // 0..1 through the current shot: the slow push-in of a hold
/** the focus that puts the frame point (x, y) (px, y down) in the middle of the frame when the camera zooms by z about the focus (src/sp-puppet.tsx Cam) */
const centreOn = (x: number, y: number, z: number): [number, number] => [(FX(x) * z) / (z - 1), (FY(y) * z) / (z - 1)];

type View = { s: number; X: (u: number) => number; Y: (v: number) => number };
const view = (s: number, u0: number, v0: number): View => ({ s, X: (u) => -W / 2 + (u - u0) * s, Y: (v) => H / 2 - (v - v0) * s });
const bg = (m: View, file: string, order = 0, tint?: string) => <Picture file={file} w={768 * m.s} h={1344 * m.s} x={m.X(384)} y={m.Y(672)} order={order} tint={tint} />;
const strip = (m: View, file: string, y0: number, order: number) => <Picture file={file} w={768 * m.s} h={(1344 - y0) * m.s} x={m.X(384)} y={m.Y((1344 + y0) / 2)} order={order} alpha />;
const FootShadow = ({ x, y, w, order, op = 0.34 }: { x: number; y: number; w: number; order: number; op?: number }) => <ContactShadow x={FX(x)} y={FY(y)} w={w} h={w * 0.16} blur={10} op={op} round color="#1a1208" order={order} />;

// ── a painted prop: its layer in layer px, the origin of the group is the point (px, py) of the layer (the pivot a swing turns about), y up
function Layer({ tex, def, px, py, order, w = def.w, h = def.h }: { tex: THREE.Texture; def: Def; px: number; py: number; order: number; w?: number; h?: number }) {
  return <Plane tex={tex} x={w / 2 - px} y={py - h / 2} w={w} h={h} order={order} />;
}
/** the 4x crop of a painted layer (scripts/tip-upscale.py): `box` is the part of the layer it holds, in layer px; drawn where that part of the layer would be */
function LayerCrop({ tex, box, px, py, order }: { tex: THREE.Texture; box: number[]; px: number; py: number; order: number }) {
  return <Plane tex={tex} x={(box[0] + box[2]) / 2 - px} y={py - (box[1] + box[3]) / 2} w={box[2] - box[0]} h={box[3] - box[1]} order={order} />;
}
function Glass({ tex, rect, px, py, order, k = 1 }: { tex: THREE.Texture; rect: number[]; px: number; py: number; order: number; k?: number }) {
  const [x0, y0, x1, y1] = rect;
  return <Plane tex={tex} x={(x0 + x1) / 2 - px} y={py - (y0 + y1) / 2} w={(x1 - x0) * k} h={(y1 - y0) * k} order={order} />;
}
const Group = ({ x, y, rot = 0, s = 1, flip = false, children }: { x: number; y: number; rot?: number; s?: number; flip?: boolean; children: React.ReactNode }) => (
  <group position={[x, y, 0]} rotation={[0, 0, rot * D2R]} scale={[flip ? -s : s, s, 1]}>{children}</group>
);
// the screens: one texture per state, drawn once
function useStates<S extends string>(states: readonly S[], w: number, h: number, draw: (g: CanvasRenderingContext2D, W: number, H: number, s: S) => void): Record<S, THREE.CanvasTexture> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ts = states.map((s) => useCanvasTexture(w, h, (g) => draw(g, w, h, s), [s]));
  return Object.fromEntries(states.map((s, i) => [s, ts[i]])) as Record<S, THREE.CanvasTexture>;
}
const TERMINAL_STATES = ["ask", "askNo", "bad", "badDark"] as const satisfies readonly TerminalState[];
const KIOSK_STATES = ["ask", "askNo"] as const satisfies readonly KioskState[];
const useTerminalScreens = () => useStates(TERMINAL_STATES, 900, 1560, drawTerminal);
const useKioskScreens = () => useStates(KIOSK_STATES, 800, 688, drawKiosk);
// a point of a screen (design units of src/tip-screens.ts) in layer px of its prop
const onGlass = (rect: number[], kind: keyof typeof DESIGN, dx: number, dy: number): [number, number] => [rect[0] + (dx * (rect[2] - rect[0])) / DESIGN[kind][0], rect[1] + (dy * (rect[3] - rect[1])) / DESIGN[kind][1]];

// a soft touch dot where a finger is: shrinks as it lands
function Touch({ x, y, k, r = 34, order }: { x: number; y: number; k: number; r?: number; order: number }) {
  if (k <= 0.01) return null;
  return (
    <group position={[x, y, 0]} scale={[0.7 + 0.3 * k, 0.7 + 0.3 * k, 1]}>
      <Poly pts={ellipsePts(0, 0, r, r, 28)} color="#3b4452" op={0.38 * Math.min(1, k * 2)} order={order} />
      <Poly pts={ellipsePts(0, 0, r * 0.62, r * 0.62, 24)} color="#ffffff" op={0.28 * k} order={order + 0.1} />
    </group>
  );
}
/** the pointing hand of an insert: the painted hand (the hoodie's sleeve in the store and the supermarket, the jacket's in the coffee shop: one hand at a time) with its fingertip at (x, y)
 * of the frame (px, y down), a soft shadow under it and the touch dot. k: frame px per layer px of the hand */
function FingerHand({ hand, def, x, y, k, press, order, r = 40 }: { hand: THREE.Texture; def: Def; x: number; y: number; k: number; press: number; order: number; r?: number }) {
  const [hx, hy] = def.tip ?? [140, 4]; // the fingertip in the hand's layer
  const hs = k * (1 - 0.05 * press);
  return (
    <>
      <ShadowOf tex={hand} x={FX(x) + (def.w / 2 - hx) * hs} y={FY(y) + (hy - def.h / 2) * hs} w={def.w * hs} h={def.h * hs} dx={20 * k / 0.98} dy={-26 * k / 0.98} blur={14 * k / 0.98} op={0.4} order={order} />
      <Group x={FX(x)} y={FY(y)} s={hs}><Layer tex={hand} def={def} px={hx} py={hy} order={order + 1} /></Group>
      <Touch x={FX(x)} y={FY(y) + 6 * k / 0.98} k={press} r={r * k / 0.98} order={order + 2} />
    </>
  );
}

const pose = (c: Char, f: number) => poseAt(c, f);
// the blank board hanging in the hall (picture px of tip-bg-selfcheck) gets its words here
function HallSign({ m, order = 1 }: { m: View; order?: number }) {
  const tex = useCanvasTexture(735, 285, (g) => { g.fillStyle = "#f3f1e8"; g.fillRect(0, 0, 735, 285); g.fillStyle = "#1f2d3a"; g.font = "900 68px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SELF-CHECKOUT", 367, 146); }, []);
  const sign = [250, 305, 495, 400];
  return <Plane tex={tex} x={m.X((sign[0] + sign[2]) / 2)} y={m.Y((sign[1] + sign[3]) / 2)} w={(sign[2] - sign[0] - 8) * m.s} h={(sign[3] - sign[1] - 8) * m.s} order={order} />;
}
// the water bottle, drawn in code (the held one is part of Denise's picture): base centre at (x, y), s = 1 is 130 px tall. One silhouette (body, shoulder, neck) with one outline,
// so that no inner line shows where the parts meet
function Bottle({ x, y, s, order }: { x: number; y: number; s: number; order: number }) {
  const at = (pts: Pt[]) => xf(pts, x, y, 0, s);
  const sil = at([[-23, 10], [-20, 3], [-13, 0], [13, 0], [20, 3], [23, 10], [23, 88], [20, 100], [10, 110], [9, 114], [9, 126], [-9, 126], [-9, 114], [-10, 110], [-20, 100], [-23, 88]]);
  const cap = at(xf(roundRect(22, 15, 3), 0, 133));
  const label = at([[-23, 32], [23, 32], [23, 62], [-23, 62]]);
  const shine = at([[-15, 12], [-11, 12], [-11, 84], [-15, 84]]);
  return (
    <>
      <Inked pts={sil} color="#d9f1fb" ink="#2a3d4a" w={2.2 * s} order={order} />
      <Poly pts={label} color="#8fcdf0" order={order + 1} />
      <Poly pts={shine} color="#ffffff" op={0.85} order={order + 1.1} />
      <Inked pts={cap} color="#2b6fd6" ink="#122a55" w={2.2 * s} order={order + 1.2} />
    </>
  );
}

// ── the coffee shop's props, drawn in code
// the name tag on Denise's apron: a white rectangle with a thin line and her name, hung at the bib's measured top edge (scripts/tip-prep.py), moving with her body (her breath), never mirrored
const TAG = { w: 170, h: 70, dy: 18 }; // picture px: its size, and how far under the bib's top edge it hangs
function ApronTag({ x, y, scale, p, flip = false, order }: { x: number; y: number; scale: number; p: Pose; flip?: boolean; order: number }) {
  const tex = useCanvasTexture(340, 140, (g) => {
    g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 340, 140);
    g.strokeStyle = "#2a2a2e"; g.lineWidth = 7; g.strokeRect(3.5, 3.5, 333, 133);
    g.fillStyle = "#1b2a3a"; g.font = "900 78px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("DENISE", 170, 74);
  }, []);
  const t = R.deniseHood.tags[p.body ?? ""], [px, py] = R.deniseHood.pivot;
  if (!t) return null;
  const cx = (flip ? -1 : 1) * (t.x - px), cy = py - (t.top + TAG.dy + TAG.h / 2);
  return (
    <group position={[x + (p.dx ?? 0), y + p.breath * scale, 0]} scale={[scale, scale, 1]}>
      <Plane tex={tex} x={cx} y={cy} w={TAG.w} h={TAG.h} order={order} />
    </group>
  );
}
/** the tip jar (the painted jar, tip-prep.py jar()), standing on the counter: base centre at (x, y) of the frame, s frame px per layer px; the label's words are drawn here: TIPS over a heart */
function TipJar({ tex, x, y, s, order }: { tex: THREE.Texture; x: number; y: number; s: number; order: number }) {
  const J = PR.jar, L = J.label!;
  const label = useCanvasTexture((L[2] - L[0]) * 2, (L[3] - L[1]) * 2, (g) => {
    const w = (L[2] - L[0]) * 2, h = (L[3] - L[1]) * 2;
    g.fillStyle = "#fbf9f2"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#2a2a2e"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = "#3a1d12"; g.font = "900 218px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillText("TIPS", w / 2, 258);
    heart(g, w / 2, 392, 92, "#e63a5a");
  }, []);
  return (
    <group position={[FX(x), FY(y), 0]} scale={[s, s, 1]}>
      <Plane tex={tex} x={0} y={J.h / 2} w={J.w} h={J.h} order={order} />
      <Plane tex={label} x={(L[0] + L[2]) / 2 - J.w / 2} y={J.h - (L[1] + L[3]) / 2} w={L[2] - L[0]} h={L[3] - L[1]} order={order + 1} />
    </group>
  );
}
/** the chalkboard's words (the painted board is blank): "COFFEE" in the lower half, over a chalk underline; `rect` is the board's dark area in picture px of its plate */
function Chalk({ m, rect, order = 2 }: { m: View; rect: number[]; order?: number }) {
  const w = rect[2] - rect[0], h = rect[3] - rect[1];
  const tex = useCanvasTexture(Math.round(w * 2), Math.round(h * 2), (g) => {
    g.clearRect(0, 0, w * 2, h * 2);
    g.fillStyle = "rgba(244,240,226,0.92)"; g.font = `900 ${Math.round(Math.min(h * 0.62, w * 0.41))}px Arial, Helvetica, sans-serif`; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillText("COFFEE", w, h * 1.42);
    g.fillRect(w * 0.34, h * 1.56, w * 0.64, 7); g.fillRect(w * 0.44, h * 1.68, w * 0.44, 5);
  }, []);
  return <Plane tex={tex} x={m.X((rect[0] + rect[2]) / 2)} y={m.Y((rect[1] + rect[3]) / 2)} w={w * m.s} h={h * m.s} order={order} />;
}
/** the glass door of the wide plate's doorway (picture px of bg-cafe-wide): the leaf is hinged on its right side and swings out, away from the camera, so it narrows toward the hinge and its
 * free edge shrinks a little; the glass is a thin veil so that the street shows through; the bell hangs under the lintel by the hinge side and swings on the door's moves */
function CafeDoor({ m, f, order }: { m: View; f: number; order: number }) {
  const [x0, y0, x1, y1] = SC.cafeWide.door as number[];
  const th = doorAngle(f) * D2R, c = Math.cos(th), sn = Math.sin(th), yc = (y0 + y1) / 2, wd = x1 - x0;
  const P = (x: number, y: number): Pt => { const k = 1 - 0.14 * sn * ((x1 - x) / wd); return [m.X(x1 - (x1 - x) * c), m.Y(yc + (y - yc) * k)]; };
  const quad = (a: number, b: number, c2: number, d: number): Pt[] => [P(a, b), P(c2, b), P(c2, d), P(a, d)];
  const ink = "#2a2118", frame = "#463a2f", lw = inkAt(m.s);
  const ba = bellAngle(f), bx = m.X(x1 - 16), by = m.Y(y0 + 2);
  const bell = xf([[-4, -4], [4, -4], [9, -9], [11, -17], [14, -25], [18, -28], [18, -31], [-18, -31], [-18, -28], [-14, -25], [-11, -17], [-9, -9]], 0, 0, 0, m.s); // the bell hangs from (0, 0), the mouth down
  return (
    <>
      <Poly pts={quad(x0 + 6, y0 + 6, x1 - 6, y1 - 62)} color="#b9dcea" op={0.3} order={order} />
      <Poly pts={[P(x0 + 18, y0 + 14), P(x0 + 38, y0 + 14), P(x0 + 70, y1 - 70), P(x0 + 50, y1 - 70)]} color="#ffffff" op={0.34} order={order + 0.1} />
      <Poly pts={[P(x0 + 56, y0 + 14), P(x0 + 64, y0 + 14), P(x0 + 96, y1 - 70), P(x0 + 88, y1 - 70)]} color="#ffffff" op={0.3} order={order + 0.1} />
      {[quad(x0, y0, x0 + 7, y1), quad(x1 - 7, y0, x1, y1), quad(x0, y0, x1, y0 + 7), quad(x0, y1 - 62, x1, y1 - 58)].map((q, k) => <Inked key={k} pts={q} color={frame} ink={ink} w={lw} order={order + 1} />)}
      <Inked pts={quad(x0 + 7, y1 - 58, x1 - 7, y1)} color="#7a5230" ink={ink} w={lw} order={order + 1.2} />
      <Inked pts={quad(x0 + 12, yc + 10, x0 + 18, yc + 80)} color="#cfc9bb" ink={ink} w={lw} order={order + 1.4} />
      <group position={[bx, by, 0]} rotation={[0, 0, ba * D2R]}>
        <Poly pts={[[-1.2 * m.s, 5 * m.s], [1.2 * m.s, 5 * m.s], [1.2 * m.s, 0], [-1.2 * m.s, 0]]} color={ink} order={order + 2} />
        <Inked pts={bell} color="#e6ae2e" ink="#6a4a12" w={lw} order={order + 2.2} />
        <Poly pts={xf(ellipsePts(0, 0, 3.4, 3.4, 12), 0, -34 * m.s, 0, m.s)} color="#6a4a12" order={order + 2.6} />
      </group>
    </>
  );
}

// ───────────────────────────────────────────── shots 1 and 15: the terminal in her face (close, over the counter): it swings toward the camera on its arm and lands at 57% of the
// frame's height. The callback (shot 15) is the same shot the other way round: Denise behind the counter in the apron (eyes to the side, one arm out toward the terminal), Kyle in front of
// it in his jacket with the water, the tip jar on the counter at the left
const CLOSE = { m: view(1.9, 100, 329), ts: 1.65, base: [450, 2300] as [number, number], left: [120, 633, 0.62] as [number, number, number], right: [830, 1052, 0.62] as [number, number, number] };
const CALLBACK = { left: [120, 610, 0.62] as [number, number, number], right: [830, 1108, 0.62] as [number, number, number], jar: [108, 932, 0.33] as [number, number, number] };
function CloseScene({ f, cafe }: { f: number; cafe: boolean }) {
  const [term, jar] = useImages(["sp/tip-terminal.png", "sp/tip-jar.png"]);
  const scr = useTerminalScreens();
  const t = f / FPS, t0 = cafe ? T.swing : 0;
  const { m, ts, base } = CLOSE;
  const T0 = PR.terminal, [px, py] = T0.pivot!;
  const dp = pose("deniseHood", f);
  if (!cafe) dp.tilt -= 2.2 * bump(t, 0.1, 0.25, 0.3, 0.9); // she leans back from the thing for a moment
  const [lx, ly, ls] = cafe ? CALLBACK.left : CLOSE.left, [rx, ry, rs] = cafe ? CALLBACK.right : CLOSE.right;
  const kp = pose(cafe ? "kyleJ" : "kyle", f);
  return (
    <>
      {bg(m, cafe ? "sp/tip-bg-cafe.jpg" : "sp/tip-bg-store.jpg", 0)}
      {cafe && <Chalk m={m} rect={SC.cafe.chalk} />}
      {cafe ? <Puppet char="deniseHood" pose={dp} x={FX(lx)} y={FY(ly)} scale={ls} flip order={10} /> : <Puppet char="kyle" pose={kp} x={FX(lx)} y={FY(ly)} scale={ls} order={10} />}
      {cafe && <ApronTag x={FX(lx)} y={FY(ly)} scale={ls} p={dp} flip order={15} />}
      {strip(m, cafe ? "sp/tip-fg-cafe.png" : "sp/tip-fg-store.png", cafe ? SC.cafe.counterTop : SC.store.counterTop, 100)}
      {cafe && <TipJar tex={jar} x={CALLBACK.jar[0]} y={CALLBACK.jar[1]} s={CALLBACK.jar[2]} order={104} />}
      <FootShadow x={rx} y={ry + (cafe ? BELOW.kyleJ : BELOW.deniseHood) * rs + 6} w={250} order={105} />
      {cafe ? <Puppet char="kyleJ" pose={kp} x={FX(rx)} y={FY(ry)} scale={rs} flip order={120} /> : <Puppet char="deniseHood" pose={dp} x={FX(rx)} y={FY(ry)} scale={rs} flip order={120} />}
      <Group x={FX(base[0])} y={FY(base[1])} rot={-swingAngle(t, t0)} s={ts * swingGrow(t, t0)}>
        <Layer tex={term} def={T0} px={px} py={py} order={150} />
        <Glass tex={scr[terminalScreen(f, T.tapK)]} rect={T0.screen!} px={px} py={py} order={151} />
      </Group>
    </>
  );
}
export function Close({ f }: { f: number }) {
  const u = clamp01(f / FPS / T.s2);
  return <Panel w={W} h={H} zoom={1 + 0.04 * u} focus={[FX(540), FY(1000)]}><CloseScene f={f} cafe={false} /></Panel>;
}
export function Callback({ f }: { f: number }) {
  const u = clamp01((f / FPS - T.swing) / (T.s16 - T.swing));
  return <Panel w={W} h={H} zoom={1 + 0.04 * u} focus={[FX(540), FY(1000)]}><CloseScene f={f} cafe /></Panel>;
}

// ───────────────────────────────────────────── shot 2: reverse on Denise; shot 16: the same shot on Kyle in the coffee shop, with the door behind him
export function Reverse({ f }: { f: number }) {
  const t = f / FPS, m = view(1.6, 60, 140);
  const s = keys(t, [[T.s2, 1.12], [LINE(2).start, 1.12], [LINE(2).end, 1.22]]);
  return (
    <Panel w={W} h={H}>
      {bg(m, "sp/tip-bg-fridges.jpg", 0)}
      <FootShadow x={520} y={959 + 700 * s} w={330 * s} order={30} />
      <Puppet char="deniseHood" pose={pose("deniseHood", f)} x={FX(520)} y={FY(959)} scale={s} order={40} />
    </Panel>
  );
}
const KYLE_CAFE = { m: view(2.0, 228, 165), x: 400, y: 1180 };
export function KyleCafe({ f }: { f: number }) {
  const t = f / FPS, { m, x, y } = KYLE_CAFE;
  const s = keys(t, [[T.s16, 1.12], [LINE(19).start, 1.12], [LINE(19).end, 1.22]]);
  return (
    <Panel w={W} h={H}>
      {bg(m, "sp/tip-bg-cafeWide.jpg", 0)}
      <Chalk m={m} rect={SC.cafeWide.chalk} />
      <CafeDoor m={m} f={f} order={3} />
      <FootShadow x={x} y={y + BELOW.kyleJ * s} w={330 * s} order={30} />
      <Puppet char="kyleJ" pose={pose("kyleJ", f)} x={FX(x)} y={FY(y)} scale={s} order={40} />
    </Panel>
  );
}

// ───────────────────────────────────────────── shots 3 and 17: insert on the terminal's screen, a finger comes up from below, straight, and hits the tiny "no tip" while its owner looks
// away: Denise's in the store (the hoodie's sleeve), Kyle's in the coffee shop (the jacket's sleeve). BAD TIP, red, flashing
const INSERT = { ts: 2.45, c: [540, 720] as [number, number] };
/** the camera of the inserts: a push-in toward the bottom of the screen that starts `d` s before the tap and kicks back out after it, so that the whole red screen reads */
function insertCam(t: number, t0: number, tap: number) {
  const d = Math.min(0.7, tap - t0 - 0.1);
  const e = ease((t - (tap - d - 0.1)) / d) * (1 - ease((t - (tap + 0.02)) / 0.2));
  const drift = 0.14 * ease((t - t0) / (tap - t0)); // the screen first, whole, creeping in
  return { zoom: 1 + drift + 0.75 * e, fy: -298 * (1 + 0.9 * e) };
}
function InsertScene({ f, cafe }: { f: number; cafe: boolean }) {
  const [term, hand] = useImages([crops.terminal.file, cafe ? "sp/tip-handJ.png" : "sp/tip-hand.png"]);
  const scr = useTerminalScreens();
  const t = f / FPS, tap = cafe ? T.tapK : T.tapNo;
  const { ts, c } = INSERT, T0 = PR.terminal, [px, py] = T0.pivot!, H0 = cafe ? PR.handJ : PR.hand;
  const kick = t >= tap ? Math.exp(-(t - tap) / 0.07) : 0;
  const shake: [number, number] = [kick * 9 * Math.sin((t - tap) * 90), kick * 7 * Math.cos((t - tap) * 70)];
  // the finger: its tip at a point of the screen
  const fg = fingerNoAt(f, tap);
  const sg = T0.screen!;
  const gx = sg[0] + (fg.x * (sg[2] - sg[0])) / DESIGN.terminal[0], gy = sg[1] + (fg.y * (sg[3] - sg[1])) / DESIGN.terminal[1]; // layer px
  const tipX = c[0] + (gx - (sg[0] + sg[2]) / 2) * ts, tipY = c[1] + (gy - (sg[1] + sg[3]) / 2) * ts;
  const m = view(1.9, 100, 255);
  return (
    <>
      <group position={[shake[0], shake[1], 0]}>
        {bg(m, cafe ? "sp/tip-bg-cafe.jpg" : "sp/tip-bg-store.jpg", 0, "#7d7d7d")}
        <Group x={FX(c[0] + (px - 161.5) * ts)} y={FY(c[1] + (py - 309) * ts)} s={ts}>
          <LayerCrop tex={term} box={crops.terminal.box} px={px} py={py} order={50} />
          <Glass tex={scr[terminalScreen(f, tap)]} rect={sg} px={px} py={py} order={51} />
        </Group>
        {fg.on && <FingerHand hand={hand} def={H0} x={tipX} y={tipY} k={ts * 0.4} press={fg.press} order={60} />}
      </group>
    </>
  );
}
function insertShot(cafe: boolean) {
  return function Insert({ f }: { f: number }) {
    const t = f / FPS, c = insertCam(t, cafe ? T.s17 : T.s3, cafe ? T.tapK : T.tapNo);
    return <Panel w={W} h={H} zoom={c.zoom} focus={[0, c.fy]}><InsertScene f={f} cafe={cafe} /></Panel>;
  };
}
export const Insert = insertShot(false), InsertNo = insertShot(true);

// ───────────────────────────────────────────── shot 4: the store, wide: the line stares (the buzzer, the heads snap, the gasp); Denise takes her water off the counter, unbothered
const STORE = {
  m: view(1.4286, 6, 0), term: [312, 1096] as [number, number], ts: 0.45, kyle: [150, 1046, 0.58] as [number, number, number], ds: 0.72, restX: 600, bottle: [432, 1114, 0.8] as [number, number, number],
  line: [[825, 1572, 0.52], [885, 1450, 0.47], [950, 1540, 0.44], [1005, 1410, 0.35]] as [number, number, number][], // x, feet y, scale: A and C in front, B and D behind them, a heap that leans toward her
};
function StoreScene({ f }: { f: number }) {
  const [term] = useImages(["sp/tip-terminal.png"]);
  const scr = useTerminalScreens();
  const { m, term: tp, ts, kyle, ds, line, restX, bottle } = STORE;
  const T0 = PR.terminal, [px] = T0.pivot!;
  const cropH = 640;
  const feet = 1560, dny = feet - 636 * ds;
  const rank = line.map((l) => line.filter((o) => o[1] > l[1]).length); // nearer = lower in the frame = drawn later
  return (
    <>
      {bg(m, "sp/tip-bg-store.jpg", 0)}
      <Puppet char="kyle" pose={pose("kyle", f)} x={FX(kyle[0])} y={FY(kyle[1])} scale={kyle[2]} order={10} />
      <Group x={FX(tp[0])} y={FY(tp[1])} s={ts}>
        <Layer tex={term} def={T0} px={px} py={cropH} order={60} w={T0.w} h={T0.h} />
        <Glass tex={scr[terminalScreen(f, T.tapNo)]} rect={T0.screen!} px={px} py={cropH} order={61} />
      </Group>
      {f / FPS < T.takeWater && <Bottle x={FX(bottle[0])} y={FY(bottle[1])} s={bottle[2]} order={62} />}
      {strip(m, "sp/tip-fg-store.png", SC.store.counterTop, 100)}
      {[...QUEUE].reverse().map((c) => { const i = QUEUE.indexOf(c); return (
        <React.Fragment key={c}>
          <FootShadow x={line[i][0]} y={line[i][1]} w={190 * line[i][2] / 0.66} order={125 + (3 - rank[i]) * 20} />
          <Puppet char={c} pose={pose(c, f)} x={FX(line[i][0])} y={FY(line[i][1] - BELOW[c] * line[i][2])} scale={line[i][2]} order={130 + (3 - rank[i]) * 20} />
        </React.Fragment>
      ); })}
      <FootShadow x={restX} y={feet + 4} w={230} order={195} />
      <Puppet char="deniseHood" pose={pose("deniseHood", f)} x={FX(restX)} y={FY(dny)} scale={ds} order={200} />
    </>
  );
}
export function Store({ f }: { f: number }) {
  return <Panel w={W} h={H} zoom={1 + 0.05 * prog(f)} focus={[FX(540), FY(1000)]}><StoreScene f={f} /></Panel>;
}

// ───────────────────────────────────────────── shot 5: medium close on Kyle behind the counter, flat, eyes to the side: "Have a good one."
const KYLE_MC = { m: view(2.0, 60, 0), x: 560, y: 1330, s: 1.4 };
function KyleMcScene({ f }: { f: number }) {
  const { m, x, y, s } = KYLE_MC;
  return (
    <>
      {bg(m, "sp/tip-bg-store.jpg", 0)}
      <Puppet char="kyle" pose={pose("kyle", f)} x={FX(x)} y={FY(y)} scale={s} order={10} />
      {strip(m, "sp/tip-fg-store.png", SC.store.counterTop, 100)}
    </>
  );
}
export const KyleMc = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.04 * prog(f)} focus={[FX(540), FY(900)]}><KyleMcScene f={f} /></Panel>;

// ───────────────────────────────────────────── shots 6 and 9: the self-checkout hall, wide (Denise at her kiosk, her groceries already bagged; the attendant walks in from the far end)
const HALL = { m: view(1.4286, 6, 0), denise: [548, 800] as [number, number], bag: [592, 664] as [number, number], beacon: [676, 418] as [number, number], screen: [636, 574] as [number, number], scanner: [612, 656] as [number, number] };
const hallPs = (v: number) => 0.00182 * (v - 640);
function HallScene({ f, walk }: { f: number; walk: boolean }) {
  const [bag] = useImages(["sp/tip-bag.png"]);
  const t = f / FPS, m = HALL.m;
  const dps = hallPs(HALL.denise[1]), ds = dps * m.s;
  const dip = scanDip(f);
  const dpose = pose("deniseHood", f);
  const BG = PR.bag;
  const bs = 0.135 * m.s;
  const red = beaconRed(f);
  const w = walkFrame(f);
  const wps = w.ps * m.s;
  const ap = { ...pose("attendant", f), dx: w.dx * m.s, tilt: pose("attendant", f).tilt + w.tilt };
  const showA = walk && t >= T.s9 && t < T.s10;
  const talk = machineAmp(f);
  const beepOn = t >= T.beep && t < T.beep + 3 / FPS ? 1 : 0;
  return (
    <>
      {bg(m, "sp/tip-bg-selfcheck.jpg", 0)}
      <HallSign m={m} />
      {talk > 0.05 && <Glow x={m.X(HALL.screen[0])} y={m.Y(HALL.screen[1])} rx={30 * m.s} ry={34 * m.s} op={0.55 * talk} order={4} color="rgba(190,230,255,1)" />}
      {beepOn > 0 && <Glow x={m.X(HALL.scanner[0])} y={m.Y(HALL.scanner[1])} rx={22 * m.s} ry={10 * m.s} op={0.9} order={4} color="rgba(255,60,40,1)" />}
      {red > 0 && walk && (
        <>
          <Glow x={m.X(HALL.beacon[0])} y={m.Y(HALL.beacon[1])} rx={46} ry={46} op={0.8 * red} order={3} color="rgba(255,40,30,1)" />
          <Poly pts={ellipsePts(m.X(HALL.beacon[0]), m.Y(HALL.beacon[1]), 13, 13, 20)} color="#ff2a1e" op={red} order={4} />
        </>
      )}
      <group position={[m.X(HALL.bag[0]), m.Y(HALL.bag[1]), 0]} scale={[bs, bs, 1]}>
        <Layer tex={bag} def={BG} px={BG.w / 2} py={BG.h - 4} order={20} />
      </group>
      <FootShadow x={m.X(HALL.denise[0]) + W / 2} y={H / 2 - m.Y(HALL.denise[1]) + 0} w={120 * ds / 0.416} order={25} />
      <Puppet char="deniseHood" pose={dpose} x={m.X(HALL.denise[0])} y={m.Y(HALL.denise[1] - BELOW.deniseHood * dps) - dip * 7} scale={ds} order={30} />
      {showA && <FootShadow x={m.X(w.u) + W / 2} y={H / 2 - m.Y(w.v)} w={120 * wps / 0.416} order={45} />}
      {showA && <Puppet char="attendant" pose={ap} x={m.X(w.u)} y={m.Y(w.v - BELOW.attendant * w.ps) + w.bob * m.s} scale={wps} order={50} />}
    </>
  );
}
// the establishing wide: the whole hall, nobody else; the aisle: tighter, the attendant a small figure at the far end
export const ScanWide = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1.0 + 0.05 * prog(f)} focus={[FX(540), FY(900)]}><HallScene f={f} walk={false} /></Panel>;
export const Aisle = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1.3 + 0.08 * prog(f)} focus={[HALL.m.X(560), HALL.m.Y(800)]}><HallScene f={f} walk /></Panel>;

// ───────────────────────────────────────────── shots 8 and 10: the kiosk, medium (Denise on its left; the attendant on its right: he arrives in the two-shot); shots 7 and 13: insert on its screen,
// her finger hits the tiny "no tip" in the bottom left corner, the beacon's red light washes over the glass
const KIOSK = { ks: 1.0, top: 300, ds: 0.78 };
const KIOSK_INS = { z: 2.9 }; // the kiosk's painted layer is shown from its 4x crop (scripts/tip-upscale.py: crisp, no white fringe)
function KioskScene({ f, mode, tap }: { f: number; mode: "kiosk" | "two" | "tap"; tap: number }) {
  const two = mode === "two", ins = mode === "tap";
  const [kiosk, hand, kioskR4] = useImages(ins ? ["sp/tip-kiosk.png", "sp/tip-hand.png", crops.kiosk.file] : ["sp/tip-kiosk.png", "sp/tip-hand.png"]);
  const scr = useKioskScreens();
  const t = f / FPS;
  const K = PR.kiosk, { ks, ds } = KIOSK, kx = 620;
  const kx0 = kx - 191 * ks, ky0 = KIOSK.top; // the layer's top-left in the frame
  const sg = K.screen!;
  const dnx = kx0 + onGlass(sg, "kiosk", 40, 312)[0] * ks - TIP.dx * ds - 125;
  const dny = ky0 + onGlass(sg, "kiosk", 40, 312)[1] * ks - TIP.dy * ds;
  const dp = pose("deniseHood", f);
  const bulb = K.bulb!, red = beaconRed(f), talk = machineAmp(f);
  const att = pose("attendant", f);
  // he arrives from the right edge: a decelerating walk with a shuffle, the sigh at the end of it
  const a = clamp01((t - T.s10) / 0.45), arr = 1 - easeOut(a), step = Math.sin((Math.PI * 2 * (t - T.s10)) / 0.5);
  att.dx = 470 * arr; att.bob += -Math.abs(step) * 12 * arr; att.tilt += 3 * step * arr;
  const m = view(1.7, 80, 200);
  // the finger of the insert
  const fg = fingerKioskAt(f, tap);
  const fpt = onGlass(sg, "kiosk", fg.x, fg.y), fx = kx0 + fpt[0] * ks, fy = ky0 + fpt[1] * ks;
  return (
    <>
      {bg(m, "sp/tip-bg-selfcheck.jpg", 0, "#9a9a9a")}
      <HallSign m={m} />
      {!ins && <FootShadow x={dnx} y={dny + 636 * ds} w={250} order={39} />}
      {!ins && <Puppet char="deniseHood" pose={dp} x={FX(dnx)} y={FY(dny)} scale={ds} flip order={70} />}
      {two && <FootShadow x={kx + 240 + att.dx!} y={ky0 + 470 * ks + 150 + 714 * 0.88} w={280} order={41} />}
      {two && <Puppet char="attendant" pose={att} x={FX(kx + 240)} y={FY(ky0 + 470 * ks + 150)} scale={0.88} order={42} />}
      <Group x={FX(kx0 + 191 * ks)} y={FY(ky0)} s={ks}>
        {ins ? <LayerCrop tex={kioskR4} box={crops.kiosk.box} px={191} py={0} order={60} /> : <Layer tex={kiosk} def={K} px={191} py={0} order={60} />}
        <Glass tex={scr[kioskScreen(f)]} rect={sg} px={191} py={0} order={61} />
        {talk > 0.05 && <Poly pts={[[sg[0] - 191, -sg[1]], [sg[2] - 191, -sg[1]], [sg[2] - 191, -sg[3]], [sg[0] - 191, -sg[3]]] as Pt[]} color="#ffffff" op={0.22 * talk} order={62} />}
        {red > 0 && !ins && <Glow x={bulb[0] - 191} y={-bulb[1]} rx={120} ry={120} op={0.85 * red} order={62.5} color="rgba(255,40,30,1)" />}
        {red > 0 && !ins && <Poly pts={ellipsePts(bulb[0] - 191, -bulb[1], bulb[2] * 0.85, bulb[2] * 0.85, 24)} color="#ff2a1e" op={red} order={63} />}
      </Group>
      {ins && red > 0 && <Glow x={0} y={0} rx={900} ry={1100} op={0.3 * red} order={64} color="rgba(255,40,30,1)" />}
      {ins && <FingerHand hand={hand} def={PR.hand} x={fx} y={fy} k={0.98 / KIOSK_INS.z} press={fg.press} order={80} />}
    </>
  );
}
function KioskStage({ f, mode, tap = T.tap1 }: { f: number; mode: "kiosk" | "two" | "tap"; tap?: number }) {
  const u = prog(f), sg = PR.kiosk.screen!, kx0 = 620 - 191;
  if (mode === "tap") return <Panel w={W} h={H} zoom={KIOSK_INS.z + 0.1 * u} focus={centreOn(kx0 + (sg[0] + sg[2]) / 2, KIOSK.top + (sg[1] + sg[3]) / 2, KIOSK_INS.z)}><KioskScene f={f} mode={mode} tap={tap} /></Panel>;
  return <Panel w={W} h={H} zoom={1 + 0.05 * u} focus={[FX(540), FY(900)]}><KioskScene f={f} mode={mode} tap={tap} /></Panel>;
}
export const Kiosk = ({ f }: { f: number }) => <KioskStage f={f} mode="kiosk" />;
export const Two = ({ f }: { f: number }) => <KioskStage f={f} mode="two" />;
export const KioskTap = ({ f }: { f: number }) => <KioskStage f={f} mode="tap" tap={T.tap1} />;
export const KioskTap2 = ({ f }: { f: number }) => <KioskStage f={f} mode="tap" tap={T.tap2} />;

// ───────────────────────────────────────────── shots 11, 12, 14: close-ups in the hall: Denise's stare, the attendant with his thumb, the attendant's shoulders dropping
const HALL_MC = {
  denKiosk: { m: view(2.0, 60, 250), char: "deniseHood" as Char, x: 470, y: 1180, s: 1.45, flip: true },
  attMc: { m: view(2.0, 200, 250), char: "attendant" as Char, x: 560, y: 1125, s: 1.4, flip: false }, // his fist with the thumb stays above the caption (y 1295)
};
function HallMcScene({ f, k }: { f: number; k: keyof typeof HALL_MC }) {
  const c = HALL_MC[k];
  return (
    <>
      {bg(c.m, "sp/tip-bg-selfcheck.jpg", 0, "#9a9a9a")}
      <HallSign m={c.m} />
      <Puppet char={c.char} pose={pose(c.char, f)} x={FX(c.x)} y={FY(c.y)} scale={c.s} flip={c.flip} order={40} />
    </>
  );
}
const hallMc = (k: keyof typeof HALL_MC) => ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.04 * prog(f)} focus={[FX(540), FY(1000)]}><HallMcScene f={f} k={k} /></Panel>;
export const DenKiosk = hallMc("denKiosk"), AttMc = hallMc("attMc"), AttSag = hallMc("attMc");

// ───────────────────────────────────────────── shots 18, 20, 21: Denise behind the counter in the apron, the counter plate. The tip jar stands on the counter to her right; the name tag hangs
// on her bib and the jar's label above the caption's band (y 1295-1455); the jar's coins sit above it too
const CAFE_DEN = {
  denCafe: { m: view(2.0, 90, 110), x: 540, y: 830, s: 1.3, jar: [850, 1300, 0.5] as [number, number, number], chalk: true },
  denClose: { m: view(2.0, 90, 110), x: 420, y: 860, s: 1.42, jar: [845, 1300, 0.55] as [number, number, number], chalk: true },
  denJar: { m: view(2.0, 70, 14), x: 450, y: 1234, s: 1.15, jar: [835, 1470, 0.62] as [number, number, number], chalk: false }, // (no caption here: the jar's coins sit low; the board stays blank under the share line)
};
function CafeDenScene({ f, k }: { f: number; k: keyof typeof CAFE_DEN }) {
  const [jar] = useImages(["sp/tip-jar.png"]);
  const c = CAFE_DEN[k], p = pose("deniseHood", f);
  return (
    <>
      {bg(c.m, "sp/tip-bg-cafe.jpg", 0)}
      {c.chalk && <Chalk m={c.m} rect={SC.cafe.chalk} />}
      <Puppet char="deniseHood" pose={p} x={FX(c.x)} y={FY(c.y)} scale={c.s} order={40} />
      <ApronTag x={FX(c.x)} y={FY(c.y)} scale={c.s} p={p} order={45} />
      {strip(c.m, "sp/tip-fg-cafe.png", SC.cafe.counterTop, 100)}
      <TipJar tex={jar} x={c.jar[0]} y={c.jar[1]} s={c.jar[2]} order={110} />
    </>
  );
}
export const DenCafe = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.04 * prog(f)} focus={[FX(540), FY(1000)]}><CafeDenScene f={f} k="denCafe" /></Panel>;
export const DenClose = ({ f }: { f: number }) => {
  const tip = LINE(21).words[5].t; // a small push-in on "tip?"
  const z = 1 + 0.03 * prog(f) + 0.05 * ease((f / FPS - (tip - 0.15)) / 0.5);
  return <Panel w={W} h={H} zoom={z} focus={[FX(540), FY(1000)]}><CafeDenScene f={f} k="denClose" /></Panel>;
};
export const DenJar = ({ f }: { f: number }) => <Panel w={W} h={H} zoom={1 + 0.03 * prog(f)} focus={[FX(540), FY(1000)]}><CafeDenScene f={f} k="denJar" /></Panel>;

// ───────────────────────────────────────────── shot 19: the coffee shop, wide (the flat plate): Denise behind the counter, still smiling; Kyle walks to the door, pushes it open (the bell rings),
// steps out onto the sidewalk and the door swings shut behind him
const CAFE_WIDE = { m: view(1.4286, 6, 0), den: [265, 885, 0.43] as [number, number, number], jar: [396, 778, 0.075] as [number, number, number] }; // Denise: feet (u, v) in plate px and puppet scale; the jar: base (u, v), frame px per layer px
function CafeWideScene({ f }: { f: number }) {
  const [jar] = useImages(["sp/tip-jar.png"]);
  const { m, den } = CAFE_WIDE, C = SC.cafeWide;
  const dp = pose("deniseHood", f), ky = kyleOut(f), kp = pose("kyleJ", f);
  const cc = PR.counterCafe as unknown as { x0: number; y0: number; w: number; h: number };
  return (
    <>
      {bg(m, "sp/tip-bg-cafeWide.jpg", 0)}
      <Chalk m={m} rect={C.chalk} />
      <Puppet char="deniseHood" pose={dp} x={m.X(den[0])} y={m.Y(den[1]) + BELOW.deniseHood * den[2]} scale={den[2]} order={20} />
      <ApronTag x={m.X(den[0])} y={m.Y(den[1]) + BELOW.deniseHood * den[2]} scale={den[2]} p={dp} order={25} />
      <Picture file="sp/tip-fg-cafe-counter.png" w={cc.w * m.s} h={cc.h * m.s} x={m.X(cc.x0 + cc.w / 2)} y={m.Y(cc.y0 + cc.h / 2)} order={100} alpha />
      <TipJar tex={jar} x={m.X(CAFE_WIDE.jar[0]) + W / 2} y={H / 2 - m.Y(CAFE_WIDE.jar[1])} s={CAFE_WIDE.jar[2]} order={104} />
      <FootShadow x={m.X(ky.u) + W / 2} y={H / 2 - m.Y(ky.v)} w={150 * ky.s / 0.47} order={108} />
      <Puppet char="kyleJ" pose={{ ...kp, bob: kp.bob + ky.bob, tilt: kp.tilt + ky.tilt }} x={m.X(ky.u)} y={m.Y(ky.v) + BELOW.kyleJ * ky.s} scale={ky.s} order={ky.out ? 110 : 140} />
      <CafeDoor m={m} f={f} order={130} />
    </>
  );
}
// the flat plate is a stage set with a margin of plain wall above it and plain floor below: the camera sits on the set (1.35 times, its middle in the middle of the frame), so that no margin shows
export const CafeWide = ({ f }: { f: number }) => { const z = 1.35 + 0.03 * prog(f); return <Panel w={W} h={H} zoom={z} focus={centreOn(540, 931, z)}><CafeWideScene f={f} /></Panel>; };
