import { useEffect } from "react";
import * as THREE from "three";
import { Plane, useCanvasTexture } from "./sp-fx";
import { fit, rr, text, type G } from "./pen-ui";

// The props of x18 "Unattended" that are drawn in code (src/x18-scenes.tsx places them): OAT MILK on the blank carton, the sign (UNATTENDED CHILDREN WILL BE GIVEN AN / ESPRESSO / AND A / FREE PUPPY, with ESPRESSO and FREE PUPPY the biggest) and its back
// (NOW HIRING), the price "$6.50" that pops over the cup, and the words on a stand-in for art that is not painted yet. Text is never painted into the art (scripts/x18-art-gen.py). Everything is a function of the frame: a canvas texture is drawn once
// per state and laid on a plane (the shape of src/x17-props.tsx).
function useUiTexture(w: number, h: number, draw: (g: G) => void, deps: unknown[]): THREE.CanvasTexture {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const FONT = "Arial, Helvetica, sans-serif";

// ═════════════════════════════════════════════════════ OAT MILK on the carton's blank side: "OAT" over "MILK" in navy block letters, each a little crooked, and an ear of oats between them. The box (w x h) is the side's blank panel in px of the
// plane, (x, y) its middle in panel px, `rot` degrees counter-clockwise
export function drawOatMilk(g: G, w: number, h: number) {
  const rows = ["OAT", "MILK"], sizes = rows.map((r) => Math.min(h * 0.34, fit(g, r, w * 0.84, 400, { weight: 900 })));
  const total = sizes[0] * 0.74 + sizes[1] * 0.74 + h * 0.1;
  let base = (h - total) / 2 + h * 0.02;
  rows.forEach((r, ri) => {
    const size = sizes[ri];
    g.font = `900 ${size}px ${FONT}`; g.textBaseline = "alphabetic"; g.textAlign = "left";
    const adv = [...r].map((c) => g.measureText(c).width), tw = adv.reduce((a, b) => a + b, 0);
    let cx = (w - tw) / 2;
    base += size * 0.74;
    [...r].forEach((c, ci) => {
      const rotL = (((ci * 37 + ri * 11) % 10) / 10 - 0.5) * 0.1;
      g.save(); g.translate(cx + adv[ci] / 2, base); g.rotate(rotL);
      g.lineJoin = "round"; g.lineWidth = size * 0.06; g.strokeStyle = "#0b1d3f"; g.strokeText(c, -adv[ci] / 2, 0);
      g.fillStyle = "#1d4a96"; g.fillText(c, -adv[ci] / 2, 0);
      g.restore();
      cx += adv[ci];
    });
    if (ri === 0) { // an ear of oats between the two rows: a stem and three pairs of grains
      const sx = w * 0.5, sy = base + h * 0.05;
      g.strokeStyle = "#8a6a1e"; g.lineWidth = Math.max(2, h * 0.012); g.beginPath(); g.moveTo(sx, sy + h * 0.045); g.lineTo(sx, sy - h * 0.04); g.stroke();
      g.fillStyle = "#d9a82a"; [-1, 1].forEach((d) => [0, 1, 2].forEach((i) => { g.beginPath(); g.ellipse(sx + d * h * 0.02, sy - h * 0.035 + i * h * 0.026, h * 0.011, h * 0.022, d * 0.5, 0, Math.PI * 2); g.fill(); }));
    }
    base += h * 0.1;
  });
}
export function OatMilk({ x, y, w, h, rot = 0, order }: { x: number; y: number; w: number; h: number; rot?: number; order: number }) {
  const K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => { g.scale(K, K); drawOatMilk(g, w, h); }, [w, h]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} order={order} />;
}
/** OAT MILK on a carton's blank side that is a parallelogram in the painted picture: `quad` its four corners (top left, top right, bottom right, bottom left) in the coordinates of the group it is drawn in (x right, y UP: a Flat's children): the words are drawn in a
 *  design box of 300 x 360 units and sheared onto the quad by a canvas transform, so that they lie on the carton's face and tilt with it */
export function OatMilkQuad({ quad, order }: { quad: [number, number][]; order: number }) {
  const xs = quad.map((p) => p[0]), ys = quad.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0, h = y1 - y0, K = 2, DW = 300, DH = 360;
  const [p0, p1, , p3] = quad;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => {
    // canvas y runs down, the group's up: the corners are mapped into the canvas by (x - x0, y1 - y)
    const c0 = [p0[0] - x0, y1 - p0[1]], c1 = [p1[0] - x0, y1 - p1[1]], c3 = [p3[0] - x0, y1 - p3[1]];
    g.setTransform((K * (c1[0] - c0[0])) / DW, (K * (c1[1] - c0[1])) / DW, (K * (c3[0] - c0[0])) / DH, (K * (c3[1] - c0[1])) / DH, K * c0[0], K * c0[1]);
    drawOatMilk(g, DW, DH);
  }, [...xs, ...ys]);
  return <Plane tex={tex} x={(x0 + x1) / 2} y={(y0 + y1) / 2} w={w} h={h} order={order} />;
}

// ═════════════════════════════════════════════════════ the sign's words on the sheet (design 1113 x 723 units: the painted sheet of prop-sign, wider than tall, its cup in the bottom left corner and its puppy in the bottom right one): five rows of black
// marker capitals with a little crooked baseline: UNATTENDED CHILDREN / WILL BE GIVEN AN (small), ESPRESSO (dark coffee brown), AND A (small), FREE PUPPY (red), the two big rows the same size. They stay above y 600: the corners are painted
export const SIGN = { w: 1113, h: 723 };
function signRows(g: G, w: number): { t: string; size: number; color: string }[] {
  const small = Math.min(fit(g, "UNATTENDED CHILDREN", w * 0.82, 110), fit(g, "WILL BE GIVEN AN", w * 0.82, 110)), big = Math.min(fit(g, "ESPRESSO", w * 0.82, 400), fit(g, "FREE PUPPY", w * 0.82, 400));
  return [{ t: "UNATTENDED CHILDREN", size: small, color: "#16110d" }, { t: "WILL BE GIVEN AN", size: small, color: "#16110d" }, { t: "ESPRESSO", size: big, color: "#4a2410" }, { t: "AND A", size: small, color: "#16110d" }, { t: "FREE PUPPY", size: big, color: "#d3221a" }];
}
export function drawSignText(g: G, w: number, h: number) {
  const rows0 = signRows(g, w), gaps0 = [0.2, 0.34, 0.2, 0.34, 0].map((k) => k * rows0[0].size);
  // the block of words stays above the painted puppy and cup (they start at y 507 of the sheet's 723): it is scaled down to end at 0.66 of the height
  const total0 = rows0.reduce((a, r, i) => a + r.size * 0.74 + gaps0[i], 0), kk = Math.min(1, (h * 0.64) / total0);
  const rows = rows0.map((r) => ({ ...r, size: r.size * kk })), gaps = gaps0.map((v) => v * kk);
  const top = h * 0.075;
  let y = top;
  rows.forEach((r, i) => {
    y += r.size * 0.74;
    g.save(); g.translate(w / 2, y); g.rotate(((i * 29) % 7 - 3) * 0.003);
    g.font = `900 ${r.size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
    g.lineWidth = r.size * 0.05; g.strokeStyle = r.color; g.fillStyle = r.color; g.strokeText(r.t, 0, 0); g.fillText(r.t, 0, 0);
    g.restore();
    y += gaps[i];
  });
}
export function SignText({ x, y, w, h, rot = 0, order, sx = 1, sy = 1 }: { x: number; y: number; w: number; h: number; rot?: number; order: number; sx?: number; sy?: number }) {
  const K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => { g.scale((w * K) / SIGN.w, (h * K) / SIGN.h); drawSignText(g, SIGN.w, SIGN.h); }, [w, h]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} sx={sx} sy={sy} order={order} />;
}
/** the back of the sign: NOW over HIRING, big, "HIRING" red */
export function drawNowHiring(g: G, w: number, h: number) {
  const size = Math.min(fit(g, "HIRING", w * 0.8, 400), (h * 0.76) / 1.6), now = size, gap = size * 0.12, top = h * 0.5 - (now * 0.74 + size * 0.74 + gap) / 2;
  const row = (t: string, s: number, y: number, c: string) => { g.font = `900 ${s}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round"; g.lineWidth = s * 0.05; g.strokeStyle = c; g.fillStyle = c; g.strokeText(t, w / 2, y); g.fillText(t, w / 2, y); };
  row("NOW", now, top + now * 0.74, "#16110d");
  row("HIRING", size, top + now * 0.74 + gap + size * 0.74, "#d3221a");
}
export function NowHiring({ x, y, w, h, rot = 0, order, sx = 1, sy = 1 }: { x: number; y: number; w: number; h: number; rot?: number; order: number; sx?: number; sy?: number }) {
  const K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => { g.scale((w * K) / SIGN.w, (h * K) / SIGN.h); drawNowHiring(g, SIGN.w, SIGN.h); }, [w, h]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} sx={sx} sy={sy} order={order} />;
}

// ═════════════════════════════════════════════════════ the price: "$6.50" in fat green letters with a black outline and a white shine, on a pale starburst, so that it reads over a white cup. `s` the scale (the pop is the scene's)
export function PriceTag({ x, y, s = 1, rot = 0, order, op = 1 }: { x: number; y: number; s?: number; rot?: number; order: number; op?: number }) {
  const w = 520, h = 300, K = 2;
  const tex = useUiTexture(w * K, h * K, (g) => {
    g.scale(K, K);
    // the burst: a 14-point star behind the price
    g.beginPath();
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.74 : 1; g.lineTo(w / 2 + Math.cos(a) * r * (w / 2 - 6), h / 2 + Math.sin(a) * r * (h / 2 - 6)); }
    g.closePath(); g.fillStyle = "#fff3a8"; g.fill(); g.lineWidth = 8; g.strokeStyle = "#16110d"; g.lineJoin = "round"; g.stroke();
    const size = fit(g, "$6.50", w * 0.7, 190);
    g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
    g.lineWidth = size * 0.16; g.strokeStyle = "#16110d"; g.strokeText("$6.50", w / 2, h / 2 + size * 0.34);
    g.fillStyle = "#28b04c"; g.fillText("$6.50", w / 2, h / 2 + size * 0.34);
    g.save(); g.beginPath(); g.rect(0, 0, w, h / 2 - size * 0.02); g.clip(); g.fillStyle = "rgba(255,255,255,0.28)"; g.fillText("$6.50", w / 2, h / 2 + size * 0.34); g.restore();
  }, []);
  return <Plane tex={tex} x={x} y={y} w={w * s} h={h * s} rot={rot} order={order} op={op} />;
}

// ═════════════════════════════════════════════════════ the name on a stand-in for art that is not painted yet (scripts/x18-prep.py has not cut it): white capitals in a dark pill
export function PhLabel({ x, y, w, label, order }: { x: number; y: number; w: number; label: string; order: number }) {
  const h = 64, K = 1;
  const tex = useUiTexture(Math.round(w * K), h * K, (g) => {
    rr(g, 2, 2, w - 4, h - 4, h / 2); g.fillStyle = "rgba(14,16,22,0.82)"; g.fill();
    const size = Math.min(40, fit(g, label, w - 40, 40));
    text(g, label, w / 2, h / 2 + size * 0.35, size, "#ffffff");
  }, [w, label]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} order={order} />;
}
