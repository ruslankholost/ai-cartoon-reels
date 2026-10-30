import React from "react";
import { Glow, Inked, Panel, Picture, Poly, Puppet, ellipsePts, grow, ribbon, xf, type Pt, type Rig } from "./sp-puppet";
import { useCanvasTexture, useImages } from "./sp-fx";
import { H, W, TPlane, focusOn, view, type View } from "./pen-stage";
import rigJson from "./x08-rig.json" with { type: "json" };
import { AngerMark } from "./lips8-fx";
import { RS, ROSS_U, ROSS_V, dayAt, ghostPose, holdPush, peelPose, plugState, redAt, redLine, rossPose, shakeAt, sootOn, twitchAt, veinAt, type GhostPose, type RPose } from "./x08-sched";

// What the scenes of x08 (src/x08-scenes.tsx) share: Ross as a puppet of this episode's acting (src/x08-sched.ts rossPose: one head, a body per pose, the head with its ear tunnels in or out, a red overlay that rises, a vein, a twitching
// lid, soot), the ghost drawn in code, the plate of the living room at night or in the morning, the shot's canvas. Everything is a function of the frame.
export { W, H };
export const FX = (px: number) => px - W / 2, FY = (py: number) => H / 2 - py;
const D2R = Math.PI / 180;

// ── the rig numbers (scripts/x08-prep.py): px of the picture padded by `pad`, y down
type Layer = { file: string; x: number; y: number; w: number; h: number };
type Eye = { cx: number; cy: number; rx: number; ry: number; lid: number[][] };
type RossJson = { pivot: [number, number]; disc: [number, number, number]; layers: { head: Layer; body: Layer }; bodies?: Record<string, Layer>; eyes: Eye[]; pupils: number[][]; mouth: { cx: number; cy: number; w: number }; mouthW: number; brows: number[][][]; browColour: string; face: string; ink: string; headFiles?: Record<string, string>; plugs?: number[][]; flySil?: { file: string; sky: string; w: number; h: number; pivot: [number, number] }; screens?: Record<string, { file: string; cx: number; cy: number; w: number; h: number; turn: number }> };
export type HandJson = { file: string; screenFile: string; w: number; h: number; ox: number; oy: number; screen: [number, number, number, number]; skin: number[] };
export const RJ = rigJson as unknown as { ross: RossJson; rossPeel: RossJson; props: { hand: HandJson }; scenes: { living: { file: string; ceiling: number; window: number[]; panes: number[][]; backTop: number; seatTop: number; seatFront: number; floor: number; wallFloor: number; lamp: number[] } } };
export const ROSS = RJ.ross, PEEL = RJ.rossPeel, LIVING = RJ.scenes.living, HAND = RJ.props.hand;
/** a point of the rig's picture (px, y down) as a head-local point: puppet px from the neck pivot, y up */
export const loc = (R: RossJson, X: number, Y: number): [number, number] => [X - R.pivot[0], R.pivot[1] - Y];

/** Ross's rig for one picture: the pose's body, the head (the master's with its tunnels in or out), the mouth's width (the scream's is bigger), the colour of his lids (red when his face is) */
export function rossRig(body: string, head: "both" | "l" | "none" | "red", o: { mouthW?: number; face?: string } = {}): Rig {
  const R = ROSS, B = (R.bodies as Record<string, Layer>)[body];
  const H0 = R.layers.head, hl: Layer = head === "both" ? H0 : { ...H0, file: (R.headFiles as Record<string, string>)[head] };
  return { ...R, layers: { head: hl, body: B }, bodies: { [body]: B }, mouthW: o.mouthW ?? R.mouthW, face: o.face ?? R.face } as unknown as Rig;
}
const PEEL_RIG = PEEL as unknown as Rig;

/** the view of a plate: the plate point (u, v) in the middle of the frame, s frame px per plate px (src/pen-stage.tsx view) */
export const cam = (s: number, u: number, v: number): View => view(s, u - W / 2 / s, v - H / 2 / s);
/** Ross on the couch in a view: his neck pivot (panel px) and his scale (frame px per rig px) */
export const rossFrame = (m: View) => ({ x: m.X(ROSS_U), y: m.Y(ROSS_V), E: RS * m.s });

/** a head-local point (puppet px from the neck pivot, y up) as a panel point, for a puppet at (x, y) at scale E in the pose p (tilt and dip of the head, breath of the body) */
export function headPt(p: RPose, E: number, x: number, y: number, hx: number, hy: number): [number, number] {
  const a = p.tilt * D2R, c = Math.cos(a), s = Math.sin(a);
  return [x + p.dx + (hx * c - hy * s + p.hdx) * E, y + p.breath * E + (hx * s + hy * c + p.bob) * E];
}
/** the same for a body point (it does not tilt) */
export const bodyPt = (p: RPose, E: number, x: number, y: number, bx: number, by: number): [number, number] => [x + p.dx + bx * E, y + (p.breath + by) * E];

// ── Ross
const mixHex = (a: string, b: string, k: number) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), ch = (s: number) => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k); return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); };
export const RED_FACE = "#fe3b22";
/** what he wears on his head in this episode (inside the head's group, puppet px from the neck pivot, y up): the red face (the 'red' head over his own, from the chin up to the rising line), the vein, the twitching lid, soot */
function RossWear({ f, order, soot, tint }: { f: number; order: number; soot: boolean; tint?: string }) {
  const tc = (c: string) => (tint ? mulHex(c, tint) : c);
  const red = redAt(f), line = redLine(f), vein = veinAt(f), tw = twitchAt(f);
  const H0 = ROSS.layers.head, [lx, ly] = loc(ROSS, H0.x + H0.w / 2, H0.y + H0.h / 2);
  const [redImg] = useImages([(ROSS.headFiles as Record<string, string>).red]);
  const q = Math.round(line * 32) / 32;
  const tex = useCanvasTexture(H0.w, H0.h, (g) => {
    g.drawImage(redImg.image as CanvasImageSource, 0, 0, H0.w, H0.h);
    const chin = 431, top = 3, yl = chin + (top - chin) * q; // the head layer's rows: the chin's line (rows below it are neck) and the top of the hair
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = "#000"; g.fillRect(0, yl, H0.w, H0.h - yl);
  }, [redImg, q]);
  const eye = ROSS.eyes[1], [ex, ey] = loc(ROSS, eye.cx, eye.cy);
  const lashInk = ROSS.ink;
  return (
    <>
      {red > 0.01 && !(red > 0.97 && line > 0.999) && <TPlane tex={tex} x={lx} y={ly} w={H0.w} h={H0.h} op={red} order={order + 10.5} tint={tint} />}
      {tw > 0 && <Lid ex={ex} ey={ey} rx={eye.rx + 3} ry={eye.ry + 3} c={tw} face={tc(mixHex(ROSS.face, RED_FACE, red > 0.5 ? red : 0))} ink={tc(lashInk)} order={order + 12.6} />}
      {vein > 0.01 && <AngerMark x={-38} y={334} r={30} k={0.7 + 0.45 * vein} color={tc(mixHex("#a8321a", "#6a0d0d", red))} order={order + 14.8} op={Math.min(1, vein * 1.5)} />}
      {soot && <Soot order={order + 10.8} color={tc("#2b2622")} />}
    </>
  );
}
/** the lid of one eye jumps down by `c` (a fraction of the eye): the eye's outline grown by 3 px, cut where the lid ends, in his skin, with a lash line (src/lips8-ui.tsx TwitchLid) */
function Lid({ ex, ey, rx, ry, c, face, ink, order }: { ex: number; ey: number; rx: number; ry: number; c: number; face: string; ink: string; order: number }) {
  const yc = ey + ry - 2 * ry * c;
  const hw = rx * Math.sqrt(Math.max(0, 1 - ((yc - ey) / ry) ** 2));
  const edge: Pt[] = Array.from({ length: 13 }, (_, i) => [ex - hw + (2 * hw * i) / 12, yc] as Pt);
  return (
    <>
      <Poly pts={ellipsePts(ex, (yc + ey + ry) / 2, Math.max(hw, rx * 0.7), (ey + ry - yc) / 2 + 2, 32)} color={face} order={order} />
      <Poly pts={ribbon(edge.map((p) => [p[0], p[1], 3.4]))} color={ink} order={order + 0.1} />
    </>
  );
}
/** soot on his face: lumpy smudges on the cheeks, the forehead and the nose, the ink of a fire (the morning) */
const SOOT: [number, number, number, number, number][] = [[-8, 306, 96, 20, 3], [-104, 150, 52, 44, -20], [112, 142, 48, 40, 14], [4, 62, 74, 26, 2], [-8, 196, 20, 16, 0], [-138, 226, 22, 38, -8], [134, 226, 22, 34, 8]]; // x, y, rx, ry, turn (puppet px): the forehead, both cheeks, the chin, the nose, the temples
function Soot({ order, color }: { order: number; color: string }) {
  const blob = (rx: number, ry: number, a: number, i: number): Pt[] => ellipsePts(0, 0, rx, ry, 28).map(([px, py], j) => [px * (1 + 0.07 * Math.sin(j * 2.1 + i)), py * (1 + 0.07 * Math.cos(j * 1.7 + i))] as Pt).map(([px, py]) => [px * Math.cos(a * D2R) - py * Math.sin(a * D2R), px * Math.sin(a * D2R) + py * Math.cos(a * D2R)] as Pt);
  return (
    <>
      {SOOT.map(([x, y, rx, ry, a], i) => (
        <React.Fragment key={i}>
          <Poly pts={xf(blob(rx * 1.22, ry * 1.3, a, i), x, y)} color={color} order={order + i * 0.01} op={0.2} />
          <Poly pts={xf(blob(rx, ry, a, i + 3), x, y)} color={color} order={order + i * 0.01 + 0.005} op={0.34} />
        </React.Fragment>
      ))}
      <Poly pts={ribbon([[-120, 262, 7], [-60, 270, 9], [10, 262, 7]])} color={color} order={order + 0.1} op={0.3} />
    </>
  );
}

/** Ross, placed by his neck pivot (panel px) at scale E: his pose of this frame, the head and body of that pose, what he wears. `scream` opens his mouth wide (a bigger mouth than the painted one) */
export function RossActor({ f, x, y, E, order = 40, tint, pose }: { f: number; x: number; y: number; E: number; order?: number; tint?: string; pose?: (p: RPose) => RPose }) {
  const p0 = rossPose(f), p = pose ? pose(p0) : p0;
  const scream = p.mood === "furious" && p.mouth !== "closed";
  const red = redAt(f);
  const allRed = red > 0.97 && redLine(f) > 0.999; // the whole face is red: the red head stands in for his own (no edge of skin round it)
  const rig = rossRig(p.body, allRed ? "red" : plugState(f), { mouthW: scream ? 150 : 100, face: mixHex(ROSS.face, RED_FACE, red > 0.5 && redLine(f) > 0.5 ? red : 0) });
  return <Puppet char="customer" rig={rig} pose={p} x={x} y={y} scale={E} order={order} tint={tint} headAttach={<RossWear f={f} order={order} soot={sootOn(f)} tint={tint} />} />;
}
/** the peel puppet (shot 3): its own head, both hands on his cheeks; placed so that its head lands where the master's would (same disc middle, the head the same size) */
export function PeelActor({ f, x, y, E, order = 40, tint }: { f: number; x: number; y: number; E: number; order?: number; tint?: string }) {
  const p = peelPose(f), tw = twitchAt(f);
  const k = ROSS.disc[2] / PEEL.disc[2], Ep = E * k;
  const dy = (PEEL.pivot[1] - PEEL.disc[1]) * Ep - (ROSS.pivot[1] - ROSS.disc[1]) * E; // the peel's pivot is lower than the master's by this
  const eye = PEEL.eyes[1], [ex, ey] = loc(PEEL, eye.cx, eye.cy);
  return <Puppet char="customer" rig={PEEL_RIG} pose={p} x={x} y={y - dy} scale={Ep} order={order} tint={tint} headAttach={tw > 0 ? <Lid ex={ex} ey={ey} rx={eye.rx + 3} ry={eye.ry + 3} c={tw} face={tint ? mulHex(PEEL.face, tint) : PEEL.face} ink={tint ? mulHex(PEEL.ink, tint) : PEEL.ink} order={order + 12.6} /> : null} />;
}

// ── the ghost: a small navy blob with a wavy hem, two big white eyes, two stubby arms, a thin black outline. Ghost px: 100 wide, 125 tall, its middle at the base (0, 0), y up
export const GHOST = { body: "#141e4a", ink: "#04060f", white: "#fdfaf3", pupil: "#060708" };
function ghostBody(wave: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI; pts.push([50 * Math.cos(a), 78 + 47 * Math.sin(a)]); }
  const n = 36;
  for (let i = 0; i <= n; i++) { const x = -50 + (100 * i) / n; pts.push([x, 13 + 9 * Math.sin((x / 100) * Math.PI * 6 + wave)]); }
  return pts;
}
const EYE_C: [number, number][] = [[-18.5, 82], [18.5, 82]];
/** a rounded bar from a (radius ra) to b (radius rb): both ends round */
export function capsule(a: Pt, b: Pt, ra: number, rb: number, n = 10): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, out: Pt[] = [];
  for (let k = 0; k <= n; k++) { const t = (Math.PI * k) / n; out.push([b[0] + rb * (nx * Math.cos(t) + ux * Math.sin(t)), b[1] + rb * (ny * Math.cos(t) + uy * Math.sin(t))]); }
  for (let k = 0; k <= n; k++) { const t = (Math.PI * k) / n; out.push([a[0] - ra * (nx * Math.cos(t) + ux * Math.sin(t)), a[1] - ra * (ny * Math.cos(t) + uy * Math.sin(t))]); }
  return out;
}
/** pieces drawn as one shape: all the outlines first, then all the fills, so that no outline cuts across a neighbour's fill (an arm's two bars) */
export function InkSet({ parts, color, ink, w, order }: { parts: Pt[][]; color: string; ink: string; w: number; order: number }) {
  return (
    <>
      {parts.map((p, i) => <Poly key={`o${i}`} pts={grow(p, w)} color={ink} order={order} />)}
      {parts.map((p, i) => <Poly key={`f${i}`} pts={p} color={color} order={order + 0.5} />)}
    </>
  );
}
/** one arm: the shoulder at (side * 46, 56); `a` degrees out from hanging straight down, `len` long; blended into the covering pose (both hands over the top of its head) by `cover` */
function armParts(side: -1 | 1, a: number, len: number, cover: number): Pt[][] {
  const sh: Pt = [side * 44, 56], A = a * D2R;
  const h1: Pt = [sh[0] + side * Math.sin(A) * len, sh[1] - Math.cos(A) * len];
  if (cover < 0.02) return [capsule(sh, h1, 10.5, 9.2)];
  const e2: Pt = [side * 62, 100], h2: Pt = [side * 10, 134];
  const e: Pt = [(sh[0] + h1[0]) / 2 + (e2[0] - (sh[0] + h1[0]) / 2) * cover, (sh[1] + h1[1]) / 2 + (e2[1] - (sh[1] + h1[1]) / 2) * cover];
  const h: Pt = [h1[0] + (h2[0] - h1[0]) * cover, h1[1] + (h2[1] - h1[1]) * cover];
  return [capsule(sh, e, 10.5, 9.8), capsule(e, h, 9.8, 9)];
}
/** the ghost at panel px (x, y) (the middle of its base), k panel px per ghost px, in a pose (src/x08-sched.ts ghostPose); `ink` is the outline's width in panel px */
export function Ghost({ x, y, k, pose, order, ink = 3, glow = 0 }: { x: number; y: number; k: number; pose: GhostPose; order: number; ink?: number; glow?: number }) {
  const T = (pts: Pt[]) => xf(pts, x + pose.dx * k, y + pose.dy * k, pose.rot, k * pose.sx, k * pose.sy);
  const body = ghostBody(pose.wave);
  const lidK = pose.lid, front = pose.cover > 0.3;
  const arms = [armParts(-1, pose.armL, pose.lenL, pose.cover), armParts(1, pose.armR, pose.lenR, pose.cover)].flat().map(T);
  return (
    <>
      <InkSet parts={arms} color={GHOST.body} ink={GHOST.ink} w={ink} order={front ? order + 4 : order - 0.2} />
      <Inked pts={T(body)} color={GHOST.body} ink={GHOST.ink} w={ink} order={order} />
      <Poly pts={T(ellipsePts(-22, 58, 10, 22, 20))} color="#22327a" order={order + 0.7} op={0.6} />
      {EYE_C.map(([cx, cy], i) => {
        const rx = 17, ry = 22.5, open = 1 - 0.92 * lidK;
        const gx = cx + pose.gaze[0] * 6.5, gy = cy - pose.gaze[1] * 8 - ry * (1 - open) * 0.9;
        return (
          <React.Fragment key={i}>
            {lidK < 0.9 ? (
              <>
                <Inked pts={T(ellipsePts(cx, cy - ry * (1 - open), rx, ry * open, 28))} color={GHOST.white} ink={GHOST.ink} w={ink * 0.55} order={order + 2} />
                {lidK < 0.78 && <Poly pts={T(ellipsePts(gx, gy, 5.4, 5.4, 14))} color={GHOST.pupil} order={order + 2.5} />}
              </>
            ) : (
              <Poly pts={T(ribbon([[cx - 12, cy - 2, 2.6], [cx, cy - 6, 3.2], [cx + 12, cy - 2, 2.6]]))} color={GHOST.ink} order={order + 2} />
            )}
          </React.Fragment>
        );
      })}
      {glow > 0.01 && <Poly pts={T(body)} color="#6f86d8" order={order + 3} op={glow * 0.22} />}
    </>
  );
}
/** the ghost on Ross's left shoulder of the picture (his right): its base's middle in puppet px from his neck pivot; with his arms up (the scream) it cowers at his side */
export const GHOST_ANCHOR: [number, number] = [-168, -22];
const GHOST_ANCHOR_UP: [number, number] = [-318, -60];
export const GHOST_K = 1.12; // ghost px -> puppet px
export function ShoulderGhost({ f, x, y, E, p, order = 41, glow = 0, kMul = 1 }: { f: number; x: number; y: number; E: number; p: RPose; order?: number; glow?: number; kMul?: number }) {
  const g = ghostPose(f), a = p.body === "up" ? GHOST_ANCHOR_UP : GHOST_ANCHOR;
  const [gx, gy] = bodyPt(p, E, x, y, a[0], a[1]);
  return <Ghost x={gx} y={gy} k={GHOST_K * E * kMul} pose={{ ...g, rot: g.rot + (p.body === "up" ? 6 : 16) }} order={g.peek > 0.5 ? 35 : order} ink={Math.max(2.4, 1.9 * E)} glow={glow} />;
}

// ── the room: the plate at night (dark, blue, the lamp and the phone the only light) or in the morning (as painted, the window repainted as a blue sky)
export const NIGHT_TINT = "#4a5a96", NIGHT_PUPPET = "#c6cbe4";
/** the plate of the living room in a view; `f` picks the night or the morning. A view may run past the plate (a close-up over the couch with the floor below it): the plate's top and bottom rows are carried on as flat colour, so the frame is never black */
const mulHex = (c: string, t: string) => { const a = parseInt(c.slice(1), 16), b = parseInt(t.slice(1), 16), ch = (q: number) => Math.round((((a >> q) & 255) * ((b >> q) & 255)) / 255); return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); };
const CEIL = "#e7d6ab", FLOOR = "#7a4f1f", WALL_L = "#dac38c";
export function Plate({ m, f, order = 0 }: { m: View; f: number; order?: number }) {
  const day = dayAt(f) > 0, tint = day ? "#fff6e6" : NIGHT_TINT;
  const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[m.X(x0), m.Y(y0)], [m.X(x1), m.Y(y0)], [m.X(x1), m.Y(y1)], [m.X(x0), m.Y(y1)]];
  return (
    <>
      <Poly pts={rect(-2000, 2400, 2800, -1200)} color={mulHex(WALL_L, tint)} order={order - 0.3} />
      <Poly pts={rect(-2000, 0, 2800, -1200)} color={mulHex(CEIL, tint)} order={order - 0.2} />
      <Poly pts={rect(-2000, 2400, 2800, 1344)} color={mulHex(FLOOR, tint)} order={order - 0.2} />
      <Picture file={LIVING.file} w={768 * m.s} h={1344 * m.s} x={m.X(384)} y={m.Y(672)} order={order} tint={tint} alpha />
      {day && LIVING.panes.map(([x0, y0, x1, y1], i) => (
        <React.Fragment key={i}>
          <Poly pts={rect(x0, y0, x1, y1)} color="#7cc4ff" order={order + 0.1} />
          <Poly pts={rect(x0, y0 + (y1 - y0) * 0.55, x1, y1)} color="#a9dcff" order={order + 0.11} />
          <Poly pts={xf(ellipsePts(0, 0, 38 * m.s / 1.5, 11 * m.s / 1.5, 20), m.X((x0 + x1) / 2 + 20), m.Y(y0 + (y1 - y0) * 0.35))} color="#ffffff" order={order + 0.12} op={0.9} />
        </React.Fragment>
      ))}
    </>
  );
}
/** the lamp's warm light on the night plate (an additive glow over the plate, under the puppets) */
export function LampGlow({ m, order = 1 }: { m: View; order?: number }) {
  const [x0, y0, x1, y1] = LIVING.lamp, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return <Glow x={m.X(cx)} y={m.Y(cy)} rx={330 * m.s * 0.55} ry={330 * m.s * 0.55} op={0.55} order={order} color="rgba(255,196,90,1)" />;
}

/** the camera's shake on a group (frame px of src/x08-sched.ts shakeAt) */
export function Shake({ f, children }: { f: number; children: React.ReactNode }) {
  const [sx, sy] = shakeAt(f);
  return <group position={[sx, sy, 0]}>{children}</group>;
}
/** a shot: its canvas, the zoom of the shot (src/x08-sched.ts holdPush) about a frame point, the scene inside; every scene that loads pictures is made by this (see src/lips-shared.tsx shot) */
export const shotX = (Inner: React.FC<{ f: number }>, focus: [number, number] = [W / 2, H / 2]): React.FC<{ f: number }> => ({ f }) => (
  <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(focus[0], focus[1])}><Inner f={f} /></Panel>
);
