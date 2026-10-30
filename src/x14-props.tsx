import { useEffect } from "react";
import * as THREE from "three";
import { Inked, Poly, ellipsePts, ribbon, xf, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { STAR_PATH } from "./x14-star";
import { Plane, useCanvasTexture, useImages } from "./sp-fx";
import { rr, text, type G } from "./pen-ui";
import { InkSet, capsule } from "./x08-shared";
import { glassPt, layerPt } from "./x08-ui";
import { HAND } from "./x14-stage";
import rig08 from "./x08-rig.json" with { type: "json" };
import type { Card } from "./x14-sched";

// The props of x14 "Four Stars" that are drawn in code on the painted pictures (src/x14-scenes.tsx places them): the review on the phone (a white card, a grey avatar with no name, five star slots, the review's text under them, "Review updated"),
// x08's hand that holds it (the phone's glass is a mask, so the fingers stay in front), the same card on the small phone Ross holds up in x08's 'up' picture, and the thumb that comes up from below the frame. Everything is a function of the frame.

// ── a texture that is thrown away when the next one replaces it (a screen has a new state nearly every frame; the GPU would fill up otherwise)
function useUiTexture(w: number, h: number, draw: (g: G) => void, deps: unknown[]): THREE.CanvasTexture {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const key = (s: unknown) => JSON.stringify(s, (_k, v) => (typeof v === "number" ? Math.round(v * 60) / 60 : v));

// ═════════════════════════════════════════════════════ the review card (design 300 x 640 units: the glass of the phone)
export const DW = 300, DH = 640;
const UI = { ink: "#1b2230", grey: "#6b7482", line: "#d3d9e1", page: "#e6ebf2", gold: "#ffc928", goldInk: "#b98a00", empty: "#b3bac6", green: "#22a559" };
/** the star of the card: the star of src/x14-star.ts (@remotion/shapes' five-point star, rounded tips) as a Path2D of unit size, scaled by `r` */
const STAR_P2D = new Path2D(STAR_PATH);
function star(g: G, cx: number, cy: number, r: number, fill: string | null, line: string, lw: number) {
  g.save(); g.translate(cx, cy); g.scale(r, r);
  if (fill) { g.fillStyle = fill; g.fill(STAR_P2D); }
  g.lineWidth = lw / r; g.lineJoin = "round"; g.strokeStyle = line; g.stroke(STAR_P2D);
  g.restore();
}
/** the five slots are 80% of the glass's width (pitch 48, radius 23.5); the card slides in from above on the DING; a gold star pops in a frame bigger than its slot; an empty slot is a grey outline; a star that goes out shrinks back to its outline */
export function drawCard(g: G, s: Card & { mini?: boolean }) {
  g.save();
  if (s.mini) {
    // the small phone Ross holds up (shot 19): nothing but the five gold stars, as wide as the glass allows
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, DW, DH);
    g.fillStyle = "#fff4c4"; g.fillRect(0, 150, DW, 250);
    for (let i = 0; i < 5; i++) star(g, 36 + i * 57, 275, 29, UI.gold, UI.goldInk, 7);
    g.restore();
    return;
  }
  g.fillStyle = UI.page; g.fillRect(0, 0, DW, DH);
  const n = Math.max(2, s.lines.length), y0 = 112 + (s.slide - 1) * 380, h = 176 + 36 * (n - 1) + 40;
  // the next review of the feed under it, pale: a grey avatar and bars (no words)
  g.save(); g.globalAlpha = 0.6; rr(g, 12, y0 + h + 24, 276, 230, 22); g.fillStyle = "#ffffff"; g.fill();
  g.beginPath(); g.arc(46, y0 + h + 62, 17, 0, Math.PI * 2); g.fillStyle = "#d3d8e0"; g.fill();
  g.fillStyle = "#e2e6ec"; rr(g, 74, y0 + h + 50, 110, 12, 6); g.fill(); rr(g, 74, y0 + h + 68, 70, 10, 5); g.fill(); rr(g, 30, y0 + h + 104, 232, 14, 7); g.fill(); rr(g, 30, y0 + h + 130, 190, 14, 7); g.fill();
  g.restore();
  g.save(); g.shadowColor = "rgba(20,30,60,0.22)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
  rr(g, 12, y0, 276, h, 22); g.fillStyle = "#ffffff"; g.fill(); g.restore();
  // the avatar: a small grey circle with a pale head and shoulders in it, no name
  g.save(); g.beginPath(); g.arc(50, y0 + 40, 22, 0, Math.PI * 2); g.fillStyle = "#c4cad3"; g.fill(); g.clip();
  g.fillStyle = "#eef0f4"; g.beginPath(); g.arc(50, y0 + 34, 9, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(50, y0 + 62, 16, 12, 0, Math.PI, 0); g.fill(); g.restore();
  // the five slots
  for (let i = 0; i < 5; i++) {
    const cx = 54 + i * 48, cy = y0 + 104 + s.jolt[i];
    star(g, cx, cy, 23.5, null, UI.empty, 3.6);
    const q = s.stars[i] * (1 - s.out[i]);
    if (q > 0.02) { g.save(); g.translate(cx, cy); g.scale(q, q); star(g, 0, 0, 23.5, s.out[i] > 0.02 ? "#d9b84a" : UI.gold, UI.goldInk, 3.4); g.restore(); }
    const b = s.burst[i];
    if (b >= 0) for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2, r0 = 27 + 14 * b, r1 = r0 + 15 * (1 - b); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineWidth = 5 * (1 - b) + 1; g.lineCap = "round"; g.strokeStyle = `rgba(255,190,40,${1 - b})`; g.stroke(); }
  }
  // the review's text under the stars (a word at a time while it is typed)
  s.lines.forEach((l, i) => text(g, l, 30, y0 + 180 + 36 * i, 30, UI.ink, { weight: 900, align: "left" }));
  if (s.caret) { const last = s.lines[s.lines.length - 1] ?? ""; g.font = "900 30px Arial, Helvetica, sans-serif"; const w = g.measureText(last).width; g.fillStyle = "#2f7bf6"; g.fillRect(30 + w + 4, y0 + 180 + 36 * (s.lines.length - 1) - 27, 4, 33); }
  // "Review updated": a pill at the top of the screen, under the notch
  if (s.toast > 0) {
    const k = Math.min(1.12, s.toast), cx = 150, cy = 66;
    g.save(); g.translate(cx, cy); g.scale(k, k); g.globalAlpha = Math.min(1, s.toast * 3);
    rr(g, -122, -25, 244, 50, 25); g.fillStyle = UI.ink; g.fill();
    g.beginPath(); g.arc(-92, 0, 13, 0, Math.PI * 2); g.fillStyle = UI.green; g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = 3.4; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(-98, 0); g.lineTo(-93, 5.5); g.lineTo(-85, -5); g.stroke();
    text(g, "Review updated", 16, 7.5, 22, "#ffffff", { weight: 900 });
    g.restore();
  }
  g.restore();
}

// ═════════════════════════════════════════════════════ x08's hand with the phone, the review on its glass; (x, y) the middle of the hand's picture in panel px, E panel px per picture px
const K_HAND = 2;
export function HandCard({ x, y, E, card, order, rot = 0 }: { x: number; y: number; E: number; card: Card; order: number; rot?: number }) {
  const [pic, mask] = useImages([HAND.file, HAND.screenFile]);
  const k = key(card);
  const tex = useUiTexture(HAND.w * K_HAND, HAND.h * K_HAND, (g) => {
    g.drawImage(pic.image as CanvasImageSource, 0, 0, HAND.w * K_HAND, HAND.h * K_HAND);
    const ui = document.createElement("canvas"); ui.width = HAND.w * K_HAND; ui.height = HAND.h * K_HAND;
    const u = ui.getContext("2d")!, [x0, y0, x1, y1] = HAND.screen;
    u.save(); u.scale(K_HAND, K_HAND); u.translate(x0, y0); u.scale((x1 - x0) / DW, (y1 - y0) / DH);
    drawCard(u, card);
    u.restore();
    u.globalCompositeOperation = "destination-in"; u.drawImage(mask.image as CanvasImageSource, 0, 0, HAND.w * K_HAND, HAND.h * K_HAND);
    g.drawImage(ui, 0, 0);
  }, [pic, mask, k]);
  return <Plane tex={tex} x={x} y={y} w={HAND.w * E} h={HAND.h * E} rot={rot} order={order} />;
}
/** a design point of the glass (300 x 640) as a panel point, for a hand at (x, y) at scale E */
export const dpt = (x: number, y: number, E: number, dx: number, dy: number): [number, number] => { const [lx, ly] = glassPt(dx, dy); return layerPt(x, y, E, lx, ly); };
/** where a star's middle is on the glass (design px), for the thumb to land on: slot i of the card at rest */
export const slotAt = (i: number): [number, number] => [54 + i * 48, 112 + 104];

// ═════════════════════════════════════════════════════ a phone standing on the counter, the review on its glass (code: a black bezel round the glass, the notch): `x`, `y` the middle of its base (panel px), `k` panel px per design unit, `rot` degrees about the base
const BZ = 14, PW = DW + 2 * BZ, PH = DH + 2 * BZ;
export function StandPhone({ x, y, k, card, order, rot = 0 }: { x: number; y: number; k: number; card: Card; order: number; rot?: number }) {
  const kk = key(card);
  const tex = useUiTexture(PW * 2, PH * 2, (g) => {
    g.scale(2, 2);
    rr(g, 0, 0, PW, PH, 46); g.fillStyle = "#0b0d12"; g.fill();
    rr(g, 3, 3, PW - 6, PH - 6, 43); g.lineWidth = 2; g.strokeStyle = "#2b3140"; g.stroke();
    g.save(); g.translate(BZ, BZ); rr(g, 0, 0, DW, DH, 34); g.clip(); drawCard(g, card); g.restore();
    rr(g, PW / 2 - 48, BZ - 1, 96, 22, 11); g.fillStyle = "#0b0d12"; g.fill();
  }, [kk]);
  return (
    <>
      <Poly pts={ellipsePts(x + 16 * k, y - 2 * k, 118 * k, 17 * k, 28)} color="#2a1608" order={order - 1} op={0.32} />
      <Group x={x} y={y} rot={rot}><Plane tex={tex} x={0} y={(PH * k) / 2} w={PW * k} h={PH * k} order={order} /></Group>
    </>
  );
}

// ═════════════════════════════════════════════════════ the small phone in Ross's raised hands (x08's 'up' picture: the glass is a mask of the body layer, so the fingers that cover it stay in front)
type RossJ = { pivot: [number, number]; bodies: Record<string, { file: string; x: number; y: number; w: number; h: number }>; screens: Record<string, { file: string; cx: number; cy: number; w: number; h: number; turn: number }> };
const R08 = (rig08 as unknown as { ross: RossJ }).ross;
export function UpScreen({ x, y, E, order, card }: { x: number; y: number; E: number; order: number; card: Card }) {
  const S = R08.screens.up, L = R08.bodies.up, [mask] = useImages([S.file]), K = 2, k = key(card);
  const tex = useUiTexture(L.w * K, L.h * K, (g) => {
    const ui = document.createElement("canvas"); ui.width = L.w * K; ui.height = L.h * K;
    const u = ui.getContext("2d")!;
    u.save(); u.scale(K, K); u.translate(S.cx, S.cy); u.rotate((S.turn * Math.PI) / 180); u.translate(-S.w / 2, -S.h / 2); u.scale(S.w / DW, S.w / DW);
    drawCard(u, { ...card, mini: true });
    u.restore();
    u.globalCompositeOperation = "destination-in"; u.drawImage(mask.image as CanvasImageSource, 0, 0, L.w * K, L.h * K);
    g.drawImage(ui, 0, 0);
  }, [mask, k]);
  const lx = L.x + L.w / 2 - R08.pivot[0], ly = R08.pivot[1] - (L.y + L.h / 2);
  return <Plane tex={tex} x={x + lx * E} y={y + ly * E} w={L.w * E} h={L.h * E} order={order} />;
}

/** the middle of the small phone's glass (panel px), for the small phone of Ross placed by his neck pivot (x, y) at scale E */
export const upGlassAt = (x: number, y: number, E: number): [number, number] => { const S = R08.screens.up, L = R08.bodies.up; return [x + (L.x + S.cx - R08.pivot[0]) * E, y + (R08.pivot[1] - (L.y + S.cy)) * E]; };

// ═════════════════════════════════════════════════════ the thumb (code): the other hand's thumb comes up from below the frame to a point of the glass (a design point); hovering it is bigger (nearer the lens) with a shadow under it, pressed it
// squashes (the thumb of src/x08-scenes.tsx)
export function Thumb({ x, y, E, at, down, sq = 0, rise = 1, order }: { x: number; y: number; E: number; at: [number, number]; down: number; sq?: number; rise?: number; order: number }) {
  const hov = 1 - down, tip = glassPt(at[0], at[1]), away = 1 - rise; // `rise` < 1: the thumb still comes up from below the frame, along its own line
  const T: Pt = [tip[0] - 14 * hov - 60 * away, tip[1] + 70 * hov + 600 * away];
  const d2: Pt = [-0.08, 0.997], d1: Pt = [-0.3, 0.954]; // the tip's bar leans a little, the bar behind the knuckle bends away to the lower left
  const K: Pt = [T[0] + d2[0] * 175, T[1] + d2[1] * 175], B: Pt = [K[0] + d1[0] * 760, K[1] + d1[1] * 760];
  const wT = 54 * (1 + 0.18 * hov) * (1 + 0.1 * sq), wK = 70 * (1 + 0.18 * hov), wB = 92 * (1 + 0.18 * hov);
  const P = (p: Pt): Pt => layerPt(x, y, E, p[0], p[1]);
  const skin = "#fed493", ink = "#8a6234";
  const nailC: Pt = [T[0] - d2[0] * wT * 0.06, T[1] - d2[1] * wT * 0.06];
  const nail = ellipsePts(0, 0, 0.3 * wT, 0.42 * wT, 22).map(([a, b]) => P([nailC[0] + a, nailC[1] + b]));
  const n: Pt = [d2[1], -d2[0]];
  const crease = ribbon([[...P([K[0] - n[0] * 0.3 * wK, K[1] - n[1] * 0.3 * wK + 4]), 2.6 * E], [...P([K[0], K[1] + 10]), 3 * E], [...P([K[0] + n[0] * 0.3 * wK, K[1] + n[1] * 0.3 * wK + 4]), 2.6 * E]]);
  const tp = P(T);
  return (
    <>
      {[1.5, 1.2, 0.9].map((k, i) => <Poly key={i} pts={xf(ellipsePts(0, 0, 34 * E * k, 20 * E * k, 24), tp[0] + 30 * E * hov, tp[1] - 62 * E * hov - 20, 0)} color="#06101e" order={order - 0.1 + i * 0.01} op={0.1 * hov} />)}
      <InkSet parts={[capsule(B, K, wB / 2, wK / 2).map(P), capsule(K, T, wK / 2, wT / 2).map(P)]} color={skin} ink={ink} w={3.4} order={order} />
      <Poly pts={crease} color={ink} order={order + 0.3} op={0.5} />
      <Inked pts={nail} color="#ffeccc" ink="#c49a60" w={1.8} order={order + 0.4} />
    </>
  );
}
