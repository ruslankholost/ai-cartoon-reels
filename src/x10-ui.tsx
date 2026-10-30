import React, { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { loadFont as loadMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadPen } from "@remotion/google-fonts/PatrickHand";
import { Plane, useCanvasTexture } from "./sp-fx";
import { OUT, clamp, rr, text, type G } from "./pen-ui";
import { capAt, capBand, capX, shotAt } from "./x10-sched";

// The 2D parts of x10 "My Own Business": the captions and the cover (DOM, as src/x09-ui.tsx), and everything that is written or drawn on a canvas and laid on a plane in a shot: the hand-painted sign ROSS'S COFFEE, the slot-machine reels
// in his eyes, HELP WANTED, the review with one star, the envelope TAX OFFICE and the letter YOU OWE $7,412.18, the labels on the boxes. Text is never painted into the art (scripts/x10-art-gen.py): all of it is drawn here, and every state is a
// function of the frame.

// ── the fonts: a thick brush marker for the signs (the shop's sign, HELP WANTED, the box labels) and a round pen. The canvases are drawn only once both are loaded (`useHandFonts`)
const MARKER = loadMarker("normal"), PEN = loadPen("normal");
export const MARKER_FONT = `${MARKER.fontFamily}, "Ink Free", "Marker Felt", Arial, sans-serif`;
export const PEN_FONT = `${PEN.fontFamily}, "Segoe Print", "Bradley Hand", Arial, sans-serif`;
/** false until both fonts are loaded (the render waits for it); draw canvases with text only when it is true */
export function useHandFonts(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const h = delayRender("x10 hand fonts");
    Promise.all([MARKER.waitUntilDone(), PEN.waitUntilDone()]).then(() => { setOk(true); continueRender(h); }, () => { setOk(true); continueRender(h); });
  }, []);
  return ok;
}

// ── the captions: one plain line at a time (two lines when it would not fit at a readable size), the band and the box across of the shot (src/x10-sched.ts capBand, capX)
const CHAR_W = 0.6; // an Arial 900 capital is about 0.6 em wide on average
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
/** the cover's title (a frame of shot 3, the dollar signs just landed): over the top, inside the 3:4 crop of the profile grid (y 240-1680) */
export const COVER_LINES10 = ["My own", "business"];
export function Cover() {
  return (
    <div style={{ position: "absolute", left: 30, width: 1020, top: 236, height: 270, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 120, lineHeight: 1.1, ...OUT }}>
      {COVER_LINES10.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

// ── a texture that is thrown away when the next one replaces it (a state that changes nearly every frame; the GPU would fill up otherwise)
function useUiTexture(w: number, h: number, draw: (g: G) => void, deps: unknown[]) {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const K = 2; // texture px per design unit
export const q = (x: number) => Math.round(clamp(x) * 48) / 48; // progress, rounded to 1/48: the memo key of a texture
/** a canvas of cw x ch design units drawn by `draw` (in design units) and laid on the panel rectangle (x, y) w x h */
export function InkPlane<S>({ x, y, w, h, cw, ch, rot = 0, op = 1, order, state, draw, ready = true, k = K }: { x: number; y: number; w: number; h: number; cw: number; ch: number; rot?: number; op?: number; order: number; state: S; draw: (g: G, s: S) => void; ready?: boolean; k?: number }) {
  const key = JSON.stringify(state, (_k, v) => (typeof v === "number" ? Math.round(v * 48) / 48 : v));
  const tex = useUiTexture(cw * k, ch * k, (g) => { g.scale(k, k); draw(g, state); }, [key, ready]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} op={op} order={order} />;
}

// ═════════════════════════════════════════════════════ the shop's sign (640 x 141 units: the blank board of the plate's front): hand-painted brown capitals, a steaming cup on each side
export const SIGN = { w: 640, h: 141 };
export function drawSign(g: G) {
  g.save();
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
  g.font = `400 88px ${MARKER_FONT}`;
  g.fillStyle = "#e9d3a8"; g.fillText("ROSS'S COFFEE", SIGN.w / 2 + 3, 104 + 3);       // the painter's drop shadow in a darker cream
  g.fillStyle = "#4a2410"; g.fillText("ROSS'S COFFEE", SIGN.w / 2, 104);
  g.strokeStyle = "#7a4a26"; g.lineWidth = 1.6; g.strokeText("ROSS'S COFFEE", SIGN.w / 2, 104);
  g.restore();
}
export function SignText({ x, y, w, h, order, ready = true }: { x: number; y: number; w: number; h: number; order: number; ready?: boolean }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={SIGN.w} ch={SIGN.h} order={order} state={{}} draw={drawSign} ready={ready} />;
}

// ═════════════════════════════════════════════════════ a slot machine's reel in an eye (the eye's own size in rig px): white, a column of symbols scrolling down, the dollar sign (green) where it stops; `p` is the turn in symbols
export function drawReel(g: G, s: { w: number; h: number; p: number; land: number }) {
  const { w, h } = s, cx = w / 2, cy = h / 2, cell = h * 0.8, p = s.p;
  g.save();
  g.beginPath(); g.ellipse(cx, cy, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); g.clip();
  g.fillStyle = "#fdfef9"; g.fillRect(0, 0, w, h);
  const spinning = p < 11.98;
  const sym = (i: number, y: number, fade: number) => { // the symbols of the reel, in order: $ (index 0), cherries, BAR, 7, bell, lemon
    g.save(); g.translate(cx, y); g.globalAlpha = fade;
    switch (((i % 6) + 6) % 6) {
      case 0: g.fillStyle = "#14a84a"; g.font = `900 ${cell * 1.05}px Arial, Helvetica, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 5; g.strokeStyle = "#0a5a26"; g.strokeText("$", 0, cell * 0.06); g.fillText("$", 0, cell * 0.06); break;
      case 1: g.fillStyle = "#d4202c"; g.beginPath(); g.arc(-cell * 0.2, cell * 0.12, cell * 0.2, 0, 7); g.arc(cell * 0.2, cell * 0.16, cell * 0.2, 0, 7); g.fill(); g.strokeStyle = "#2f7a2f"; g.lineWidth = 5; g.beginPath(); g.moveTo(-cell * 0.2, cell * 0.0); g.quadraticCurveTo(0, -cell * 0.38, cell * 0.2, 0); g.stroke(); break;
      case 2: g.fillStyle = "#14141a"; g.fillRect(-cell * 0.42, -cell * 0.2, cell * 0.84, cell * 0.4); g.fillStyle = "#fff"; g.font = `900 ${cell * 0.3}px Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BAR", 0, 0); break;
      case 3: g.fillStyle = "#d4202c"; g.font = `900 ${cell * 0.95}px Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("7", 0, cell * 0.04); break;
      case 4: g.fillStyle = "#f2b61a"; g.beginPath(); g.moveTo(-cell * 0.34, cell * 0.28); g.quadraticCurveTo(-cell * 0.3, -cell * 0.36, 0, -cell * 0.36); g.quadraticCurveTo(cell * 0.3, -cell * 0.36, cell * 0.34, cell * 0.28); g.closePath(); g.fill(); g.beginPath(); g.arc(0, cell * 0.34, cell * 0.08, 0, 7); g.fill(); break;
      default: g.fillStyle = "#f3dc2a"; g.beginPath(); g.ellipse(0, 0, cell * 0.36, cell * 0.24, 0.3, 0, 7); g.fill(); g.strokeStyle = "#a88a00"; g.lineWidth = 4; g.stroke();
    }
    g.restore();
  };
  // the symbol at the middle of the eye is index round(12 - p) (p counts the symbols that have gone by; at p = 12 the dollar sign (index 0) is in the middle); neighbours above and below at one cell each
  const base = 12 - p, i0 = Math.round(base), frac = base - i0;
  for (let d = -2; d <= 2; d++) sym(i0 + d, cy + (d - frac) * cell, spinning ? 0.85 : 1);
  if (spinning) { // motion blur: pale streaks across the symbols
    g.globalAlpha = 0.28; g.fillStyle = "#fff";
    for (let i = 0; i < 6; i++) g.fillRect(0, ((i * 0.37 + p * 0.9) % 1) * h, w, h * 0.06);
  }
  g.restore();
  g.strokeStyle = "#1a1308"; g.lineWidth = 3.4; g.beginPath(); g.ellipse(cx, cy, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); g.stroke();
}
export function Reel({ x, y, w, h, p, order }: { x: number; y: number; w: number; h: number; p: number; order: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={Math.round(w)} ch={Math.round(h)} order={order} state={{ w: Math.round(w), h: Math.round(h), p: Math.round(p * 24) / 24, land: 0 }} draw={drawReel} k={1} />;
}

// ═════════════════════════════════════════════════════ HELP WANTED (360 x 250 units): a sheet of paper taped in the window, red capitals on white, a thick underline
export const HELP = { w: 360, h: 250 };
export function drawHelp(g: G) {
  g.save();
  g.fillStyle = "#fbf9f2"; g.fillRect(0, 0, HELP.w, HELP.h);
  g.strokeStyle = "#cfc9b8"; g.lineWidth = 3; g.strokeRect(2, 2, HELP.w - 4, HELP.h - 4);
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#c8202b"; g.font = `400 112px ${MARKER_FONT}`;
  g.fillText("HELP", HELP.w / 2, 112); g.font = `400 86px ${MARKER_FONT}`; g.fillText("WANTED", HELP.w / 2, 206);
  g.strokeStyle = "#c8202b"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(40, 226); g.lineTo(320, 222); g.stroke();
  g.restore();
}
export function HelpWanted({ x, y, w, h, rot = 0, order, ready = true }: { x: number; y: number; w: number; h: number; rot?: number; order: number; ready?: boolean }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={HELP.w} ch={HELP.h} rot={rot} order={order} state={{}} draw={drawHelp} ready={ready} />;
}

// ═════════════════════════════════════════════════════ the review on Chuck's phone (300 x 440 units): the shop's name, five stars with one gold, grey lines of text, a small thumbs-down; the star is big
export const REVIEW = { w: 300, h: 440 };
function star(g: G, cx: number, cy: number, R: number, fill: string, ink: string) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? R * 0.42 : R; g[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 4; g.strokeStyle = ink; g.lineJoin = "round"; g.stroke();
}
export function drawReview(g: G) {
  g.save();
  rr(g, 0, 0, REVIEW.w, REVIEW.h, 26); g.fillStyle = "#ffffff"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#1c1c22"; g.stroke();
  text(g, "Ross's Coffee", REVIEW.w / 2, 58, 34, "#1c1c22", { weight: 900 });
  for (let i = 0; i < 5; i++) star(g, 38 + i * 56, 138, 25, i === 0 ? "#ffc41a" : "#e3e5ea", i === 0 ? "#a87400" : "#b9bcc6");
  g.fillStyle = "#d9dce3"; for (const [y, w] of [[212, 250], [246, 220], [280, 240], [314, 150]] as [number, number][]) { rr(g, 25, y, w, 16, 8); g.fill(); }
  g.fillStyle = "#c8202b"; rr(g, 25, 356, 112, 46, 23); g.fill(); text(g, "1 star", 81, 388, 24, "#fff", { weight: 900 });
  g.restore();
}
export function ReviewCard({ x, y, w, h, rot = 0, order }: { x: number; y: number; w: number; h: number; rot?: number; order: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={REVIEW.w} ch={REVIEW.h} rot={rot} order={order} state={{}} draw={drawReview} />;
}

// ═════════════════════════════════════════════════════ the envelope (460 x 300 units): cream, TAX OFFICE and an address in grey, a red stamp, a window
export const ENVELOPE = { w: 460, h: 300 };
export function drawEnvelope(g: G) {
  g.save();
  rr(g, 0, 0, ENVELOPE.w, ENVELOPE.h, 10); g.fillStyle = "#f3e7c4"; g.fill(); g.lineWidth = 5; g.strokeStyle = "#5e5238"; g.stroke();
  g.beginPath(); g.moveTo(4, 4); g.lineTo(ENVELOPE.w / 2, 150); g.lineTo(ENVELOPE.w - 4, 4); g.lineWidth = 3; g.strokeStyle = "#8d805c"; g.stroke();
  text(g, "TAX OFFICE", ENVELOPE.w / 2, 232, 52, "#8a1a22", { weight: 900, spacing: 3 });
  g.fillStyle = "#b7ab88"; rr(g, 120, 252, 220, 10, 5); g.fill(); rr(g, 150, 270, 160, 10, 5); g.fill();
  g.beginPath(); g.arc(392, 70, 30, 0, 7); g.lineWidth = 5; g.strokeStyle = "#8a1a22"; g.stroke(); text(g, "PAY", 392, 80, 22, "#8a1a22", { weight: 900 });
  g.restore();
}
export function EnvelopeCard({ x, y, w, h, rot = 0, order }: { x: number; y: number; w: number; h: number; rot?: number; order: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={ENVELOPE.w} ch={ENVELOPE.h} rot={rot} order={order} state={{}} draw={drawEnvelope} />;
}

// ═════════════════════════════════════════════════════ the letter (560 x 760 units): a sheet of paper, the office's name, grey lines, and in red YOU OWE and $7,412.18 in big capitals under a thick red rule; `p` is how much of it is stamped (0..1)
export const LETTER = { w: 560, h: 760 };
export function drawLetter(g: G, s: { p: number }) {
  g.save();
  g.fillStyle = "#fffdf6"; g.fillRect(0, 0, LETTER.w, LETTER.h); g.lineWidth = 6; g.strokeStyle = "#cbc5b2"; g.strokeRect(3, 3, LETTER.w - 6, LETTER.h - 6);
  text(g, "TAX OFFICE", LETTER.w / 2, 82, 50, "#1c2a55", { weight: 900, spacing: 3 });
  g.fillStyle = "#d3d6df"; for (const [y, w] of [[130, 440], [160, 400], [190, 430], [220, 300]] as [number, number][]) { rr(g, 60, y, w, 14, 7); g.fill(); }
  const k = clamp(s.p * 1.6), a = Math.min(1, k * 2), b = clamp(k * 2 - 1);
  g.globalAlpha = a; text(g, "YOU OWE", LETTER.w / 2, 420, 108, "#d0151f", { weight: 900 });
  g.globalAlpha = 1; g.strokeStyle = "#d0151f"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.moveTo(50, 456); g.lineTo(50 + 460 * a, 456); g.stroke();
  g.globalAlpha = b; text(g, "$7,412.18", LETTER.w / 2, 584, 92, "#d0151f", { weight: 900 });
  g.restore();   // under the amount the paper is clean: the caption "I owe YOU?!" sits there
}
export function Letter({ x, y, w, h, rot = 0, p, order }: { x: number; y: number; w: number; h: number; rot?: number; p: number; order: number }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={LETTER.w} ch={LETTER.h} rot={rot} order={order} state={{ p: q(p) }} draw={drawLetter} />;
}

// ═════════════════════════════════════════════════════ a label on a box (240 x 100 units): a white paper tag with black capitals
export function drawTag(g: G, s: { t: string }) {
  g.save();
  rr(g, 2, 2, 236, 96, 6); g.fillStyle = "#fbf8ee"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#5b4a2a"; g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#1c150a"; g.font = `400 66px ${MARKER_FONT}`; g.fillText(s.t, 120, 54);
  g.restore();
}
export function Tag({ x, y, w, h, rot = 0, label, order, ready = true }: { x: number; y: number; w: number; h: number; rot?: number; label: string; order: number; ready?: boolean }) {
  return <InkPlane x={x} y={y} w={w} h={h} cw={240} ch={100} rot={rot} order={order} state={{ t: label }} draw={drawTag} ready={ready} />;
}
