import { useEffect } from "react";
import * as THREE from "three";
import { Glow, Poly, ellipsePts } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Plane, useCanvasTexture, useImages } from "./sp-fx";
import { fit, rr, text, type G } from "./pen-ui";
import { HAND } from "./x14-stage";
import type { Call } from "./x15-sched";

// The props of x15 "Bleep Fee" that are drawn in code on the painted pictures (src/x15-scenes.tsx places them): the red call screen of the phone (on x08's hand that holds it, and on the phone that stands on the counter), the words of the invoice
// on the painted sheet, and the end of the receipt (the printed lines, TOTAL $1,272.45, the torn end). Everything is a function of the frame.

// ── a texture that is thrown away when the next one replaces it (a screen has a new state nearly every frame; the GPU would fill up otherwise)
function useUiTexture(w: number, h: number, draw: (g: G) => void, deps: unknown[]): THREE.CanvasTexture {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const q60 = (x: number) => Math.round(x * 30);

// ═════════════════════════════════════════════════════ the call (design 300 x 640 units: the glass of the phone): a red screen that pulses, rings going out of the caller's disc, BUSINESS LISTING DEPT, YOUR LISTING WILL BE SUSPENDED on yellow
export const DW = 300, DH = 640;
export function drawCall(g: G, s: Call) {
  g.save();
  g.fillStyle = `rgb(${Math.round(150 + 90 * s.glow)},${Math.round(8 + 22 * s.glow)},${Math.round(14 + 20 * s.glow)})`; g.fillRect(0, 0, DW, DH);
  g.lineWidth = 7;
  for (let k = 0; k < 3; k++) { const u = (s.ring + k / 3) % 1; g.strokeStyle = `rgba(255,255,255,${0.42 * (1 - u)})`; g.beginPath(); g.arc(150, 168, 38 + u * 250, 0, Math.PI * 2); g.stroke(); }
  text(g, "incoming call", 150, 82, 24, "rgba(255,255,255,0.85)", { weight: 700 });
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(150, 168, 50, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#c4121b"; g.beginPath(); g.moveTo(150, 132); g.lineTo(188, 197); g.lineTo(112, 197); g.closePath(); g.fill();
  text(g, "!", 150, 190, 52, "#ffffff");
  const f1 = fit(g, "BUSINESS", 262, 50), f2 = fit(g, "LISTING DEPT", 262, 50);
  text(g, "BUSINESS", 150, 268, f1, "#ffffff"); text(g, "LISTING DEPT", 150, 316, f2, "#ffffff");
  g.fillStyle = "#ffd21f"; rr(g, 16, 344, 268, 138, 20); g.fill();
  const lines = ["YOUR LISTING", "WILL BE", "SUSPENDED"], fs = Math.min(...lines.map((l) => fit(g, l, 230, 46)));
  lines.forEach((l, i) => text(g, l, 150, 392 + i * (fs + 6) - (fs - 30) * 0.2, fs, "#4a060b"));
  g.fillStyle = "#2a0507"; g.beginPath(); g.arc(70, 566, 34, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#ffffff"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(58, 554); g.lineTo(82, 578); g.moveTo(82, 554); g.lineTo(58, 578); g.stroke();
  g.fillStyle = "#22a559"; g.beginPath(); g.arc(230, 566, 34, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.beginPath(); g.moveTo(218, 556); g.quadraticCurveTo(212, 574, 232, 584); g.stroke();
  g.restore();
}
const callKey = (c: Call) => `${q60(c.ring)}:${q60(c.glow)}`;

// ── x08's hand with the phone (the glass is a mask, so the fingers stay in front); (x, y) the middle of the hand's picture in panel px, E panel px per picture px
const K_HAND = 2;
export function HandCall({ x, y, E, call, order, rot = 0 }: { x: number; y: number; E: number; call: Call; order: number; rot?: number }) {
  const [pic, mask] = useImages([HAND.file, HAND.screenFile]);
  const tex = useUiTexture(HAND.w * K_HAND, HAND.h * K_HAND, (g) => {
    g.drawImage(pic.image as CanvasImageSource, 0, 0, HAND.w * K_HAND, HAND.h * K_HAND);
    const ui = document.createElement("canvas"); ui.width = HAND.w * K_HAND; ui.height = HAND.h * K_HAND;
    const u = ui.getContext("2d")!, [x0, y0, x1, y1] = HAND.screen;
    u.save(); u.scale(K_HAND, K_HAND); u.translate(x0, y0); u.scale((x1 - x0) / DW, (y1 - y0) / DH);
    drawCall(u, call);
    u.restore();
    u.globalCompositeOperation = "destination-in"; u.drawImage(mask.image as CanvasImageSource, 0, 0, HAND.w * K_HAND, HAND.h * K_HAND);
    g.drawImage(ui, 0, 0);
  }, [pic, mask, callKey(call)]);
  return <Plane tex={tex} x={x} y={y} w={HAND.w * E} h={HAND.h * E} rot={rot} order={order} />;
}

// ═════════════════════════════════════════════════════ a phone standing on the counter, the call on its glass (code: a black bezel round the glass, the notch): `x`, `y` the middle of its base (panel px), `k` panel px per design unit,
// `rot` degrees about the base; the screen lights the counter round it (a red glow that pulses with the screen)
const BZ = 14, PW = DW + 2 * BZ, PH = DH + 2 * BZ;
export function StandCall({ x, y, k, call, order, rot = 0 }: { x: number; y: number; k: number; call: Call; order: number; rot?: number }) {
  const tex = useUiTexture(PW * 2, PH * 2, (g) => {
    g.scale(2, 2);
    rr(g, 0, 0, PW, PH, 46); g.fillStyle = "#0b0d12"; g.fill();
    rr(g, 3, 3, PW - 6, PH - 6, 43); g.lineWidth = 2; g.strokeStyle = "#2b3140"; g.stroke();
    g.save(); g.translate(BZ, BZ); rr(g, 0, 0, DW, DH, 34); g.clip(); drawCall(g, call); g.restore();
    rr(g, PW / 2 - 48, BZ - 1, 96, 22, 11); g.fillStyle = "#0b0d12"; g.fill();
  }, [callKey(call)]);
  return (
    <>
      <Glow x={x} y={y + (PH * k) / 2} rx={PW * k * 1.15} ry={PH * k * 0.62} op={0.55 + 0.35 * call.glow} order={order - 3} color="rgba(255,40,40,1)" />
      <Poly pts={ellipsePts(x + 16 * k, y - 2 * k, 118 * k, 17 * k, 28)} color="#2a1608" order={order - 1} op={0.32} />
      <Group x={x} y={y} rot={rot}><Plane tex={tex} x={0} y={(PH * k) / 2} w={PW * k} h={PH * k} order={order} /></Group>
    </>
  );
}

// ═════════════════════════════════════════════════════ the invoice: the painted hand holds a blank sheet; the words go on it (a canvas laid over the sheet): INVOICE, "You opened this.", and the amount, stamped on `stamp` (0 not yet, then a
// spring from big and tilted to its place). The sheet's inside is `paper` (the picture's px), the canvas is that size; the lower left is the thumb's, the words keep to the right of it
export function InvoiceText({ x, y, k, paper, stamp, order }: { x: number; y: number; k: number; paper: [number, number, number, number]; stamp: number; order: number }) {
  const w = paper[2] - paper[0], h = paper[3] - paper[1], K = 2;
  const st = stamp <= 0 ? -1 : q60(stamp);
  const tex = useUiTexture(w * K, h * K, (g) => {
    g.scale(K, K);
    const ink = "#1b2230";
    const fi = fit(g, "INVOICE", w - 70, 150);
    text(g, "INVOICE", w / 2, 36 + fi * 0.92, fi, ink);
    g.fillStyle = ink; g.fillRect(34, 52 + fi, w - 68, 7);
    const f2 = fit(g, "You opened this.", w - 70, 80, { weight: 800 });
    text(g, "You opened this.", w / 2, 52 + fi + 42 + f2 * 0.8, f2, "#3a3f4a", { weight: 800 });
    for (let i = 0; i < 3; i++) { g.fillStyle = "#c9ced6"; rr(g, 34 + (i === 2 ? 40 : 0), 52 + fi + 70 + f2 + i * 26, w - 68 - (i === 2 ? 190 : 0) - (i === 1 ? 70 : 0), 12, 6); g.fill(); }
    if (stamp > 0) {   // the amount: a rubber stamp, red, in a double frame, on the right of the thumb
      const s = 1 + 0.9 * Math.max(0, 1 - stamp * 9) + 0.06 * Math.exp(-stamp * 12) * Math.cos(stamp * 70), cx = w / 2 + 50, cy = h - 150, fa = fit(g, "$29.99", w - 220, 190);
      g.save(); g.translate(cx, cy); g.rotate((-6 * Math.PI) / 180); g.scale(s, s);
      g.globalAlpha = Math.min(1, stamp * 14);
      g.strokeStyle = "#d4191f"; g.lineWidth = 10; rr(g, -(w - 190) / 2, -fa * 0.72, w - 190, fa * 1.32, 18); g.stroke();
      g.lineWidth = 3.5; rr(g, -(w - 190) / 2 + 13, -fa * 0.72 + 13, w - 190 - 26, fa * 1.32 - 26, 12); g.stroke();
      text(g, "$29.99", 0, fa * 0.3, fa, "#d4191f");
      g.restore();
    }
  }, [w, h, st]);
  return <Plane tex={tex} x={x} y={y} w={w * k} h={h * k} order={order} />;
}

// ═════════════════════════════════════════════════════ the end of the receipt (shot 23): a strip of white paper with the printed lines of the bleeps, a rule, TOTAL and $1,272.45 in big print, and a torn end; design `DW2` x `DH2`
export const RW = 640, RH = 1180;
export function drawReceipt(g: G, lines: [string, string][]) {
  g.save();
  const zz = (y: number) => { g.beginPath(); g.moveTo(0, 0); g.lineTo(RW, 0); g.lineTo(RW, y); for (let i = 16; i >= 0; i--) g.lineTo((RW * i) / 16, y + (i % 2 ? 26 : -10)); g.closePath(); };
  zz(RH - 40); g.fillStyle = "#3a3a3a"; g.fill();
  g.save(); g.translate(5, 0); g.scale((RW - 10) / RW, 1); zz(RH - 46); g.fillStyle = "#fbfbf7"; g.fill(); g.restore();
  lines.forEach(([a, b], i) => { const y = 96 + i * 58; text(g, a, 44, y, 40, "#2b2f36", { align: "left", weight: 800 }); text(g, b, RW - 44, y, 40, "#2b2f36", { align: "right", weight: 800 }); });
  const y0 = 96 + lines.length * 58 + 6;
  g.setLineDash([16, 12]); g.strokeStyle = "#6b7482"; g.lineWidth = 5; g.beginPath(); g.moveTo(40, y0); g.lineTo(RW - 40, y0); g.stroke(); g.setLineDash([]);
  text(g, "TOTAL", RW / 2, y0 + 118, 132, "#1b2230");
  const f = fit(g, "$1,272.45", RW - 70, 200);
  text(g, "$1,272.45", RW / 2, y0 + 118 + f * 0.98, f, "#d4191f");
  g.restore();
}
export function ReceiptEnd({ x, y, k, lines, rot = 0, order }: { x: number; y: number; k: number; lines: [string, string][]; rot?: number; order: number }) {
  const tex = useUiTexture(RW * 2, RH * 2, (g) => { g.scale(2, 2); drawReceipt(g, lines); }, [lines.length]);
  return <Group x={x} y={y} rot={rot}><Plane tex={tex} x={0} y={0} w={RW * k} h={RH * k} order={order} /></Group>;
}
