import React from "react";
import { Inked, Panel, Poly, Puppet, ellipsePts, xf, type Char as PChar, type Pt, type Rig } from "./sp-puppet";
import { ContactShadow, Plane, inkAt, useCanvasTexture, useImages } from "./sp-fx";
import { H, W, focusOn, type View } from "./pen-stage";
import { CUSTOMER, DENISE, DOG, RIG_FIXED, SIDE_RIG, TODD } from "./lips-layout";
import { bellAngle, doorAngle, dogAt, holdPush, poseAt, type Char, type Pose, type ShotId } from "./lips-sched";

// What the scenes of "Cold Lips" (src/lips-scenes.tsx) share: a puppet drawn with this episode's acting, the shot's camera, the pieces that belong to a puppet (the dog in her purse, Todd's badge, Denise's name tag),
// the glass door, the chalkboard, and a stand-in for a shot that is not drawn yet. Everything is a function of the frame.
export { W, H };
export const FX = (px: number) => px - W / 2, FY = (py: number) => H / 2 - py;
/** a puppet of this episode, placed by its neck pivot (frame px) at scale E: its pose is src/lips-sched.ts poseAt; the customer and Todd come with their repaired pictures (src/lips-layout.ts RIG_FIXED) */
export const LActor = ({ c, f, nx, ny, E, order = 40, flip, headAttach, tint }: { c: Char; f: number; nx: number; ny: number; E: number; order?: number; flip?: boolean; headAttach?: React.ReactNode; tint?: string }) => (
  <Puppet char={c as PChar} pose={poseAt(c, f)} x={FX(nx)} y={FY(ny)} scale={E} order={order} flip={flip} headAttach={headAttach} tint={tint} rig={(RIG_FIXED as Record<string, Rig>)[c]} />
);
/** a shot: its canvas, a slow push in on a frame point (the hold's 2-3 %, src/lips-sched.ts holdPush), the scene inside. Every scene that loads pictures (useImages, useCanvasTexture, a Puppet's textures) is made by this and never
 * by a component that renders <Panel> itself: a load that suspends outside the canvas, in the page's tree, makes React hold back the new <Panel>, and Remotion's <ThreeCanvas/> asks for its delayRender while it renders; when
 * the next frame comes in before React reveals it, that render is thrown away, the delayRender is never cleared and the render dies at the shot's first frame ("Waiting for <ThreeCanvas/> to be created"). Inside the canvas
 * the same load suspends in the canvas's own Suspense, which clears its delay from an effect. lips-check holds src/lips-scenes.tsx to this. */
export const shot = (Inner: React.FC<{ f: number }>, focus: [number, number] = [W / 2, H / 2]): React.FC<{ f: number }> => ({ f }) => (
  <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(focus[0], focus[1])}><Inner f={f} /></Panel>
);
/** a shot that is not drawn yet: a dark panel with its name */
export const Placeholder = (id: ShotId): React.FC<{ f: number }> => () => (
  <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, background: "#2a2f3a", color: "#fff", font: "900 90px Arial", display: "flex", alignItems: "center", justifyContent: "center" }}>{id}</div>
);
/** the soft shadow under whatever stands on the floor: an ellipse of width w with its middle at frame (x, y) */
export const FootShadow = ({ x, y, w, order, op = 0.34 }: { x: number; y: number; w: number; order: number; op?: number }) => <ContactShadow x={FX(x)} y={FY(y)} w={w} h={w * 0.16} blur={Math.max(6, w * 0.04)} op={op} round color="#1a1208" order={order} />;

// ── the dog in her purse (props.dog of src/lips-rig.json): the picture of its face (neutral, sour, gasp), its paws on the front edge of the purse's opening (customer.purse[pose]), at three quarters of the purse's width; it
// lives in the puppet's own group (so it breathes with her body), above her body (order + 5) and under her head. `dogAt` (src/lips-sched.ts) says which face it makes and how it moves
const D2R = Math.PI / 180;
export function Dog({ nx, ny, E, p, d, order }: { nx: number; ny: number; E: number; p: Pose; d: ReturnType<typeof dogAt>; order: number }) {
  const [neutral, sour, gasp] = useImages([DOG.files.neutral, DOG.files.sour, DOG.files.gasp]);
  const pu = CUSTOMER.purse[p.body ?? "stand"], k = (0.75 * pu.w) / (DOG.paws[1] - DOG.paws[0]);
  const ax = pu.x - CUSTOMER.pivot[0], ay = CUSTOMER.pivot[1] - pu.y; // puppet px from the neck pivot, y up
  const tex = d.face === "gasp" ? gasp : d.face === "sour" ? sour : neutral;
  return (
    <group position={[FX(nx) + (p.dx ?? 0), FY(ny) + p.breath * E, 0]} scale={[E, E, 1]}>
      <group position={[ax + d.dx, ay + d.up, 0]} rotation={[0, 0, d.rot * D2R]} scale={[k * d.sx, k, 1]}>
        <Plane tex={tex} x={DOG.w / 2 - DOG.anchor[0]} y={DOG.anchor[1] - DOG.h / 2} w={DOG.w} h={DOG.h} order={order} />
      </group>
    </group>
  );
}
// ── the dog in the purse of the side view (public/sp/lips-customer-side.png): the same dog, by the same rule (its paws three quarters of the purse's width, its anchor on the purse's anchor), at the side piece's scale; (x, y) is the
// purse's anchor in the frame, E her piece's scale
export function SideDog({ x, y, E, d, order }: { x: number; y: number; E: number; d: ReturnType<typeof dogAt>; order: number }) {
  const [neutral, sour, gasp] = useImages([DOG.files.neutral, DOG.files.sour, DOG.files.gasp]);
  const pu = SIDE_RIG.customer.purse, k = (0.75 * pu.w) / (DOG.paws[1] - DOG.paws[0]);
  const tex = d.face === "gasp" ? gasp : d.face === "sour" ? sour : neutral;
  return (
    <group position={[FX(x) + d.dx * E, FY(y) + d.up * E, 0]} scale={[E, E, 1]}>
      <group rotation={[0, 0, d.rot * D2R]} scale={[k * d.sx, k, 1]}>
        <Plane tex={tex} x={DOG.w / 2 - DOG.anchor[0]} y={DOG.anchor[1] - DOG.h / 2} w={DOG.w} h={DOG.h} order={order} />
      </group>
    </group>
  );
}
// ── Todd's badge: the plain black rectangle of his picture (todd.badge[pose] = [cx, cy, w, h, angle]) gets its words here, TODD over MANAGER, in the puppet's own group
export function ToddBadge({ nx, ny, E, p, flip = false, order }: { nx: number; ny: number; E: number; p: Pose; flip?: boolean; order: number }) {
  const B = TODD.badge[p.body ?? "point"] ?? TODD.badge.point, [cx, cy, w, h, ang] = B, K = 6;
  const tex = useCanvasTexture(Math.round(w * K), Math.round(h * K), (g) => {
    g.clearRect(0, 0, w * K, h * K);
    g.fillStyle = "#f3f1e8"; g.textAlign = "center"; g.textBaseline = "alphabetic";
    const fit = (s: string, size: number, maxW: number) => { g.font = `900 ${size * K}px Arial, Helvetica, sans-serif`; const m = g.measureText(s).width; return m > maxW * K ? (size * maxW * K) / m : size; };
    const s1 = fit("TODD", h * 0.42, w * 0.84), s2 = fit("MANAGER", h * 0.25, w * 0.9);
    g.font = `900 ${s1 * K}px Arial, Helvetica, sans-serif`; g.fillText("TODD", (w * K) / 2, h * K * 0.46);
    g.font = `800 ${s2 * K}px Arial, Helvetica, sans-serif`; g.fillText("MANAGER", (w * K) / 2, h * K * 0.8);
  }, [w, h]);
  return (
    <group position={[FX(nx) + (p.dx ?? 0), FY(ny) + p.breath * E, 0]} scale={[(flip ? -1 : 1) * E, E, 1]}>
      <Plane tex={tex} x={cx - TODD.pivot[0]} y={TODD.pivot[1] - cy} w={w} h={h} rot={-ang} order={order} />
    </group>
  );
}
// ── Denise's name tag (src/tip-scenes.tsx ApronTag): a white rectangle with a thin line and her name, hung at the bib's measured top edge, moving with her body
const TAG = { w: 170, h: 70, dy: 18 };
export function ApronTag({ nx, ny, E, p, order }: { nx: number; ny: number; E: number; p: Pose; order: number }) {
  const tex = useCanvasTexture(340, 140, (g) => {
    g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 340, 140);
    g.strokeStyle = "#2a2a2e"; g.lineWidth = 7; g.strokeRect(3.5, 3.5, 333, 133);
    g.fillStyle = "#1b2a3a"; g.font = "900 78px Arial, Helvetica, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("DENISE", 170, 74);
  }, []);
  const t = DENISE.tags[p.body ?? ""], [px, py] = DENISE.pivot;
  if (!t) return null;
  return (
    <group position={[FX(nx) + (p.dx ?? 0), FY(ny) + p.breath * E, 0]} scale={[E, E, 1]}>
      <Plane tex={tex} x={t.x - px} y={py - (t.top + TAG.dy + TAG.h / 2)} w={TAG.w} h={TAG.h} order={order} />
    </group>
  );
}
/** the chalkboard's words (the painted board is blank): "COFFEE" in the lower half, over a chalk underline; `rect` is the board's dark area in picture px of its plate */
export function Chalk({ m, rect, order = 2 }: { m: View; rect: number[]; order?: number }) {
  const w = rect[2] - rect[0], h = rect[3] - rect[1];
  const tex = useCanvasTexture(Math.round(w * 2), Math.round(h * 2), (g) => {
    g.clearRect(0, 0, w * 2, h * 2);
    g.fillStyle = "rgba(244,240,226,0.92)"; g.font = `900 ${Math.round(Math.min(h * 0.62, w * 0.41))}px Arial, Helvetica, sans-serif`; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillText("COFFEE", w, h * 1.42);
    g.fillRect(w * 0.34, h * 1.56, w * 0.64, 7); g.fillRect(w * 0.44, h * 1.68, w * 0.44, 5);
  }, []);
  return <Plane tex={tex} x={m.X((rect[0] + rect[2]) / 2)} y={m.Y((rect[1] + rect[3]) / 2)} w={w * m.s} h={h * m.s} order={order} />;
}
/** the glass door of the cafe-back plate's doorway (picture px of `rect` = scenes.cafeBack.door): the leaf is hinged on its right side and swings out, away from the camera, so it narrows toward the hinge and its free edge
 * shrinks a little; the glass is a thin veil so that the street shows through; the bell hangs under the lintel by the hinge side and swings on the door's moves (src/tip-scenes.tsx CafeDoor, with this episode's angles) */
export function LipsDoor({ m, f, order, rect }: { m: View; f: number; order: number; rect: number[] }) {
  const [x0, y0, x1, y1] = rect;
  const th = (doorAngle(f) * Math.PI) / 180, c = Math.cos(th), sn = Math.sin(th), yc = (y0 + y1) / 2, wd = x1 - x0;
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
      <group position={[bx, by, 0]} rotation={[0, 0, (ba * Math.PI) / 180]}>
        <Poly pts={[[-1.2 * m.s, 5 * m.s], [1.2 * m.s, 5 * m.s], [1.2 * m.s, 0], [-1.2 * m.s, 0]]} color={ink} order={order + 2} />
        <Inked pts={bell} color="#e6ae2e" ink="#6a4a12" w={lw} order={order + 2.2} />
        <Poly pts={xf(ellipsePts(0, 0, 3.4, 3.4, 12), 0, -34 * m.s, 0, m.s)} color="#6a4a12" order={order + 2.6} />
      </group>
    </>
  );
}
