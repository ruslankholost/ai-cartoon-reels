import React, { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { loadFont as loadMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadPen } from "@remotion/google-fonts/PatrickHand";
import { Plane, useCanvasTexture } from "./sp-fx";
import { OUT, clamp, rr, text, type G } from "./pen-ui";
import { capAt, capBand, capX, shotAt } from "./x09-sched";

// The 2D parts of x09 "Habits of the Rich": the captions and the cover (DOM, as src/x08-ui.tsx), and everything that is written or drawn on a canvas and laid on a plane in a shot: the stage screen's title, the whiteboard's list in
// Ross's marker, Denise's notebook in her pink pen (the three MMFs, the underlines, HIRE A HITMAN, the hearts), the TAX label, the card reader's screen. Text is never painted into the art (scripts/x09-art-gen.py): all of it is drawn
// here, and every state is a function of the frame (a progress 0..1 of each stroke; the pen's tip is at the end of what is drawn).

// ── the two hands: Ross's thick marker and Denise's rounder pen. Web fonts: the canvases are drawn only once both are loaded (`useHandFonts`)
const MARKER = loadMarker("normal"), PEN = loadPen("normal");
export const MARKER_FONT = `${MARKER.fontFamily}, "Ink Free", "Marker Felt", Arial, sans-serif`;
export const PEN_FONT = `${PEN.fontFamily}, "Segoe Print", "Bradley Hand", Arial, sans-serif`;
/** false until both fonts are loaded (the render waits for it); draw canvases with text only when it is true */
export function useHandFonts(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const h = delayRender("x09 hand fonts");
    Promise.all([MARKER.waitUntilDone(), PEN.waitUntilDone()]).then(() => { setOk(true); continueRender(h); }, () => { setOk(true); continueRender(h); });
  }, []);
  return ok;
}

// ── the captions: one plain line at a time (two lines when it would not fit 920 px at a readable size), the band of the shot (src/x09-sched.ts capBand)
const CHAR_W = 0.6; // an Arial 900 capital is about 0.6 em wide on average; the measured captions of x08 ran 0.588 em per character
function layout(textIn: string, w: number): { lines: string[]; size: number } {
  const one = Math.min(84, Math.floor(w / (textIn.length * CHAR_W)));
  if (one >= 56 || !textIn.includes(" ")) return { lines: [textIn], size: Math.max(44, one) };
  const words = textIn.split(" ");
  let best = { lines: [textIn], worst: 1e9 };
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(" "), b = words.slice(k).join(" "), worst = Math.max(a.length, b.length);
    if (worst < best.worst) best = { lines: [a, b], worst };
  }
  return { lines: best.lines, size: Math.min(66, Math.floor(w / (best.worst * CHAR_W))) };
}
export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const id = shotAt(f).id, band = capBand(id), [x0, x1] = capX(id), { lines, size } = layout(c.text, x1 - x0 - 20);
  return (
    <div style={{ position: "absolute", left: x0, width: x1 - x0, top: band[0], height: band[1] - band[0], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.08, ...OUT }}>
      {lines.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}
/** the cover's title (a frame of shot 1 just after the splash): two lines over the top, inside the 3:4 crop of the profile grid (y 240-1680) */
export const COVER_LINES9 = ["Real habits", "of rich people"];
export function Cover() {
  return (
    <div style={{ position: "absolute", left: 30, width: 1020, top: 236, height: 270, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 108, lineHeight: 1.1, ...OUT }}>
      {COVER_LINES9.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

// ── a texture that is thrown away when the next one replaces it (a written page has a new state nearly every frame; the GPU would fill up otherwise)
function useUiTexture(w: number, h: number, draw: (g: G) => void, deps: unknown[]) {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const K = 2; // texture px per design unit
const q = (x: number) => Math.round(clamp(x) * 48) / 48; // progress, rounded to 1/48: the memo key of a texture
/** a canvas of cw x ch design units drawn by `draw` (in design units) and laid on the panel rectangle (x, y) w x h */
export function InkPlane<S>({ x, y, w, h, cw, ch, rot = 0, op = 1, order, state, draw, ready = true }: { x: number; y: number; w: number; h: number; cw: number; ch: number; rot?: number; op?: number; order: number; state: S; draw: (g: G, s: S) => void; ready?: boolean }) {
  const key = JSON.stringify(state, (_k, v) => (typeof v === "number" ? Math.round(v * 48) / 48 : v));
  const tex = useUiTexture(cw * K, ch * K, (g) => { g.scale(K, K); draw(g, state); }, [key, ready]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} op={op} order={order} />;
}

// ── handwriting that is written on: `p` 0..1 of the text is drawn from the left, the edge of the reveal slanted and a little rough like a pen's stroke; (x, y) is the left end of the baseline
function written(g: G, s: string, x: number, y: number, size: number, color: string, font: string, p: number, o: { align?: CanvasTextAlign; spacing?: number; jitter?: number; maxW?: number } = {}) {
  if (p <= 0.001) return 0;
  g.save();
  g.font = `400 ${size}px ${font}`; g.textBaseline = "alphabetic"; g.letterSpacing = `${o.spacing ?? 0}px`;
  let sz = size;
  if (o.maxW && g.measureText(s).width > o.maxW) { sz = Math.floor((size * o.maxW) / g.measureText(s).width); g.font = `400 ${sz}px ${font}`; }
  const w = g.measureText(s).width, x0 = o.align === "center" ? x - w / 2 : x;
  const edge = x0 + (w + sz * 0.5) * p, lean = sz * 0.35;
  g.beginPath(); g.moveTo(x0 - 20, y - sz * 1.4); g.lineTo(edge + lean, y - sz * 1.4); g.lineTo(edge - lean, y + sz * 0.6); g.lineTo(x0 - 20, y + sz * 0.6); g.closePath(); g.clip();
  g.fillStyle = color; g.textAlign = "left"; g.fillText(s, x0, y + (o.jitter ?? 0));
  g.restore();
  return w;
}
/** a stroke along a polyline, `p` of its length drawn (an underline, a heart): round caps, the pen's width `lw` */
function stroke(g: G, pts: [number, number][], p: number, color: string, lw: number) {
  if (p <= 0.001) return;
  let L = 0; const seg: number[] = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let left = L * p;
  g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) { const d = Math.min(1, left / seg[i - 1]); g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * d, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * d); left -= seg[i - 1]; }
  g.stroke(); g.restore();
}
/** a heart of width `w` centred on (cx, cy) as a polyline: from the bottom point up the left side, over the notch between the two lobes and down the right side (the classic curve x = 16 sin^3 t, y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t) */
function heartPts(cx: number, cy: number, w: number): [number, number][] {
  const sc = w / 32, out: [number, number][] = [];
  for (let i = 0; i <= 60; i++) { const t = Math.PI + (i / 60) * Math.PI * 2; out.push([cx + sc * 16 * Math.sin(t) ** 3, cy + sc * 2.5 - sc * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); }
  return out;
}

// ═════════════════════════════════════════════════════ the whiteboard (640 x 800 design units: the board's surface). Ross's marker: black, thick, the list in capitals; the title at the top, lines 1-10 one a row, line 11 in two rows, red
export const BOARD = { w: 640, h: 866 };
export const BOARD_LINES = ["1. TAX EVASION", "2. MONEY LAUNDERING", "3. HIRE A HITMAN", "4. KICKBACKS", "5. BRIBE OFFICIALS", "6. THREATEN COMPETITORS", "7. SHELL COMPANIES", "8. EMBEZZLEMENT", "9. RIG THE MARKET", "10. GO BANKRUPT ON PURPOSE"];
export const BOARD_ELEVEN = ["11. SELL COURSES", "TO BROKE PEOPLE"];
export const BOARD_TITLE = ["REAL HABITS OF", "RICH PEOPLE"];
const ROW0 = 214, ROW = 46; // the baseline of list row 1 and the row spacing
/** where line i (0-based, 0-9) sits on the board, in design units: the left end of its baseline, and its font size */
export const boardRow = (i: number): { x: number; y: number; size: number } => ({ x: 44, y: ROW0 + ROW * i, size: 38 });
export type BoardState = { title: number; lines: number[]; eleven: number; lit: number; blur: number };
export function drawBoard(g: G, s: BoardState) {
  const black = "#15171c", red = "#d3222a";
  BOARD_TITLE.forEach((t, i) => written(g, t, 44, 98 + 62 * i, 60, black, MARKER_FONT, clamp(s.title * 2 - i), { maxW: 560 }));
  BOARD_LINES.forEach((t, i) => {
    const r = boardRow(i), p = s.lines[i] ?? 0;
    if (i >= 3 && s.blur > 0.01 && p > 0 && p < 1) { // scribbled in a blur: the same text twice, smeared sideways and jittered
      written(g, t, r.x - 14, r.y - 3, r.size, black + "88", MARKER_FONT, p, { maxW: 560 });
      written(g, t, r.x + 10, r.y + 3, r.size, black + "88", MARKER_FONT, p, { maxW: 560 });
    }
    written(g, t, r.x, r.y, r.size, black, MARKER_FONT, p, { maxW: 560 });
  });
  // line 11: two rows, each word lit in red from the left as it is said (`lit` words 0..5: Sell courses to broke people), an underline under the whole at the end
  const words = ["11. SELL", "COURSES", "TO", "BROKE", "PEOPLE"], y11 = [ROW0 + ROW * 10 + 34, ROW0 + ROW * 10 + 34 + 58];
  if (s.eleven > 0.01) {
    BOARD_ELEVEN.forEach((t, i) => written(g, t, 44, y11[i], 52, black, MARKER_FONT, clamp(s.eleven * 2 - i), { maxW: 560 }));
    if (s.lit > 0) {
      g.save(); g.font = `400 52px ${MARKER_FONT}`; g.fillStyle = red;
      let cx = 44, row = 0;
      words.forEach((w, i) => { if (i === 2) { cx = 44; row = 1; } const ww = g.measureText(w + " ").width; if (i < s.lit) stroke(g, [[cx, y11[row] + 12], [cx + ww - 14, y11[row] + 12]], 1, red, 7); cx += ww; });
      g.restore();
    }
  }
}
export function BoardInk({ x, y, w, h, st, order, ready = true }: { x: number; y: number; w: number; h: number; st: BoardState; order: number; ready?: boolean }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={BOARD.w} ch={BOARD.h} order={order} state={{ ...st, lines: st.lines.map(q), title: q(st.title), eleven: q(st.eleven), blur: q(st.blur) }} draw={drawBoard} ready={ready} />;
}

// ═════════════════════════════════════════════════════ Denise's notebook (768 x 1344: the page of the painted notebook seen from above). Her pink pen; the writing sits on the page's ruled lines (NOTE_ROW) right of the margin
export const NOTE = { w: 768, h: 1344 };
export const NOTE_ROW = [374, 474, 624, 824, 924]; // the baselines used (on the painted notebook's ruled lines): ICE BATH, 4 AM, MMF MMF MMF, HIRE A, HITMAN
export type NoteState = { mmf: number[]; under: number[]; hire: number; heart: number };
export function drawNotebook(g: G, s: NoteState) {
  const ink = "#ec3f99", x0 = 150;
  written(g, "ICE BATH", x0, NOTE_ROW[0], 90, ink, PEN_FONT, 1);
  stroke(g, heartPts(x0 + 470, NOTE_ROW[0] - 34, 58), 1, ink, 7);
  written(g, "4 AM", x0, NOTE_ROW[1], 90, ink, PEN_FONT, 1);
  stroke(g, heartPts(x0 + 250, NOTE_ROW[1] - 34, 58), 1, ink, 7);
  ["MMF", "MMF", "MMF"].forEach((t, i) => written(g, t, x0 + 195 * i, NOTE_ROW[2], 84, ink, PEN_FONT, s.mmf[i] ?? 0, { jitter: i === 1 ? 3 : i === 2 ? -3 : 0 }));
  [0, 1].forEach((i) => stroke(g, [[x0 - 6, NOTE_ROW[2] + 16 + 18 * i], [x0 + 200, NOTE_ROW[2] + 12 + 18 * i], [x0 + 400, NOTE_ROW[2] + 20 + 18 * i], [x0 + 560, NOTE_ROW[2] + 14 + 18 * i]], s.under[i] ?? 0, ink, 7));
  written(g, "HIRE A", x0, NOTE_ROW[3], 96, ink, PEN_FONT, clamp(s.hire * 2));
  written(g, "HITMAN", x0, NOTE_ROW[4], 96, ink, PEN_FONT, clamp(s.hire * 2 - 1));
  stroke(g, heartPts(x0 + 400, NOTE_ROW[4] - 40, 64), s.heart, ink, 7);
}
export function NotebookInk({ x, y, w, h, st, order, ready = true }: { x: number; y: number; w: number; h: number; st: NoteState; order: number; ready?: boolean }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={NOTE.w} ch={NOTE.h} order={order} state={{ mmf: st.mmf.map(q), under: st.under.map(q), hire: q(st.hire), heart: q(st.heart) }} draw={drawNotebook} ready={ready} />;
}

// ═════════════════════════════════════════════════════ the stage screen's title (590 x 883 units: the glass of the plate's screen): "HABITS / OF THE / RICH" in gold on the dark screen, a white edge, a slow shine across it
export const SCREEN = { w: 590, h: 883 };
export function drawScreenTitle(g: G, s: { shine: number }) {
  const lines: [string, number, number][] = [["HABITS", 128, 330], ["OF THE", 128, 480], ["RICH", 214, 700]]; // text, size, baseline
  g.save();
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
  lines.forEach(([t, size, y]) => {
    const gr = g.createLinearGradient(0, y - size * 0.8, 0, y);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.55, "#fffaf0"); gr.addColorStop(1, "#ffe9a8");
    g.font = `900 ${size}px Arial, Helvetica, sans-serif`;
    g.lineWidth = size * 0.1; g.strokeStyle = "#1a1002"; g.strokeText(t, SCREEN.w / 2, y + 6);
    g.lineWidth = size * 0.058; g.strokeStyle = "#e6a200"; g.strokeText(t, SCREEN.w / 2, y);
    g.fillStyle = gr; g.fillText(t, SCREEN.w / 2, y);
  });
  // the shine: a slanted pale band sliding across the letters
  g.globalCompositeOperation = "source-atop";
  const sx = -200 + 1000 * s.shine, band = g.createLinearGradient(sx, 0, sx + 110, 0);
  band.addColorStop(0, "rgba(255,255,255,0)"); band.addColorStop(0.5, "rgba(255,255,255,0.55)"); band.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = band; g.fillRect(0, 0, SCREEN.w, SCREEN.h);
  g.restore();
}
export function ScreenTitle({ x, y, w, h, shine, order, op = 1 }: { x: number; y: number; w: number; h: number; shine: number; order: number; op?: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={SCREEN.w} ch={SCREEN.h} order={order} op={op} state={{ shine: q(shine) }} draw={drawScreenTitle} />;
}

// ═════════════════════════════════════════════════════ the TAX label on the box (400 x 160 units): black capitals on the cream panel, as if stamped
export function drawLabel(g: G, s: { text: string }) {
  g.save(); g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "900 150px Arial, Helvetica, sans-serif";
  g.fillStyle = "#1c1612"; g.globalAlpha = 0.92; g.fillText(s.text, 200, 128);
  g.restore();
}
export function LabelText({ x, y, w, h, label, rot = 0, order }: { x: number; y: number; w: number; h: number; label: string; rot?: number; order: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={400} ch={160} rot={rot} order={order} state={{ text: label }} draw={drawLabel} />;
}

// ═════════════════════════════════════════════════════ the card reader's screen (200 x 140 units): "TAP CARD" waiting, then "APPROVED" with a tick when the card is tapped and it beeps
export function drawReader(g: G, s: { tap: number }) {
  rr(g, 0, 0, 200, 140, 14); g.fillStyle = s.tap > 0.5 ? "#0e3a1c" : "#0f2a33"; g.fill();
  if (s.tap > 0.5) {
    text(g, "APPROVED", 100, 74, 29, "#59ff8a", { weight: 900 });
    g.save(); g.strokeStyle = "#59ff8a"; g.lineWidth = 9; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(74, 104); g.lineTo(94, 122); g.lineTo(130, 92); g.stroke(); g.restore();
  } else {
    text(g, "TAP CARD", 100, 82, 30, "#7fe4ff", { weight: 900 });
    g.save(); g.strokeStyle = "#7fe4ff"; g.lineWidth = 5; g.globalAlpha = 0.6; rr(g, 70, 100, 60, 28, 6); g.stroke(); g.restore();
  }
}
export function ReaderScreen({ x, y, w, h, tap, rot = 0, order }: { x: number; y: number; w: number; h: number; tap: number; rot?: number; order: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={200} ch={140} rot={rot} order={order} state={{ tap: tap > 0.5 ? 1 : 0 }} draw={drawReader} />;
}

// ═════════════════════════════════════════════════════ the guru's side of the whiteboard (the same 640 x 866 units): his own habits in blue marker, a dollar sign, a zigzag up. Ross spins the board away from it in shot 11
export function drawDoodle(g: G) {
  const blue = "#2457c5", red = "#d3222a", green = "#1c8a3a";
  written(g, "ICE BATH", 70, 150, 76, blue, MARKER_FONT, 1, { maxW: 520 });
  written(g, "4 AM", 70, 250, 76, blue, MARKER_FONT, 1, { maxW: 520 });
  written(g, "$ $ $", 90, 470, 150, green, MARKER_FONT, 1, { maxW: 520 });
  stroke(g, [[70, 760], [190, 650], [260, 710], [410, 540], [490, 600], [580, 420]], 1, red, 16);
  stroke(g, [[580, 420], [510, 430]], 1, red, 16); stroke(g, [[580, 420], [585, 495]], 1, red, 16);
}
export function DoodleInk({ x, y, w, h, order }: { x: number; y: number; w: number; h: number; order: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={BOARD.w} ch={BOARD.h} order={order} state={{}} draw={drawDoodle} />;
}
