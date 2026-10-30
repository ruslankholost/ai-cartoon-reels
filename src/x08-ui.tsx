import React, { useEffect } from "react";
import { Plane, useCanvasTexture, useImages } from "./sp-fx";
import { Poly, xf, type Pt } from "./sp-puppet";
import { OUT, clamp, rr, text, type G } from "./pen-ui";
import { capAt, capBand, shotAt } from "./x08-sched";
import { HAND, ROSS, bodyPt, loc } from "./x08-shared";
import type { RPose } from "./x08-sched";

// The 2D parts of x08: the captions and the cover (DOM, as src/lips8-ui.tsx), and everything that is drawn in code on a canvas and laid on a plane in a shot: the phone's screens (one clean generic shop: white cards, rounded corners,
// one yellow accent, a plain sans font; no real shop, no logo), the pop-ups that fly out of the phone, the hand that holds the phone (the inserts), a phone on its own. Text is never painted (scripts/x08-art-gen.py); every state is a
// function of the frame. The right 130 px and the bottom 400 px of the 1080 x 1920 frame stay free of anything that matters: the screens keep their words in the upper four fifths of the glass.
export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const band = capBand(shotAt(f).id), size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  return <div style={{ position: "absolute", left: 30, width: 920, top: band[0], height: band[1] - band[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.1, ...OUT }}>{c.text}</div>;
}
export const COVER_TITLE8 = "Just let me pay.";
export function Cover() {
  return <div style={{ position: "absolute", left: 30, width: 1020, top: 222, height: 126, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100, lineHeight: 1.1, ...OUT }}>{COVER_TITLE8}</div>;
}

// ── a texture that is thrown away when the next one replaces it (a screen has a new state nearly every frame; the GPU would fill up otherwise)
function useUiTexture(w: number, h: number, draw: (g: G) => void, deps: unknown[]) {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

// ═════════════════════════════════════════════════════ the look: one shop
export const UI = { ink: "#1b2230", grey: "#6b7482", line: "#d3d9e1", page: "#f1f3f6", yellow: "#ffc928", yellowDark: "#c99a00", red: "#e0392b", green: "#22a559", white: "#ffffff" };
export const DW = 300, DH = 640; // the design's units: the glass of the phone is 300 x 640 of them
const clamp01 = (x: number) => clamp(x);
const tickPath = (g: G, cx: number, cy: number, s: number, color: string, lw: number) => { g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(cx - 0.5 * s, cy + 0.02 * s); g.lineTo(cx - 0.12 * s, cy + 0.4 * s); g.lineTo(cx + 0.55 * s, cy - 0.45 * s); g.stroke(); g.restore(); };
const crossPath = (g: G, cx: number, cy: number, s: number, color: string, lw: number) => { g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = "round"; g.beginPath(); g.moveTo(cx - 0.4 * s, cy - 0.4 * s); g.lineTo(cx + 0.4 * s, cy + 0.4 * s); g.moveTo(cx + 0.4 * s, cy - 0.4 * s); g.lineTo(cx - 0.4 * s, cy + 0.4 * s); g.stroke(); g.restore(); };
/** scale a drawing about (x, y) by k, with opacity a */
const about = (g: G, x: number, y: number, k: number, a: number, fn: () => void) => { if (a <= 0.01 || k <= 0.01) return; g.save(); g.globalAlpha = clamp01(a); g.translate(x, y); g.scale(k, k); g.translate(-x, -y); fn(); g.restore(); };
const pop = (p: number) => ({ k: 0.55 + 0.45 * p, a: Math.min(1, p * 3) });
function star(g: G, cx: number, cy: number, r: number, fill: string | null, line: string, lw: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.46 : r; g[i ? "lineTo" : "moveTo"](cx + q * Math.cos(a), cy + q * Math.sin(a)); }
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  g.lineWidth = lw; g.lineJoin = "round"; g.strokeStyle = line; g.stroke();
}
/** the taco sock: a yellow sock with a red cuff and a taco on its leg (the product) */
function sock(g: G, cx: number, cy: number, s: number, grey = false) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  const body = grey ? "#c3c8d0" : "#ffd23f", cuff = grey ? "#9aa1ad" : UI.red, ink = grey ? "#6b7482" : "#7a5a00";
  g.beginPath(); g.moveTo(-36, -62); g.lineTo(18, -62); g.lineTo(18, 14); g.quadraticCurveTo(20, 30, 46, 32); g.quadraticCurveTo(74, 36, 74, 56); g.quadraticCurveTo(74, 72, 54, 72); g.lineTo(-18, 72); g.quadraticCurveTo(-36, 72, -36, 52); g.closePath();
  g.fillStyle = body; g.fill(); g.lineWidth = 3.5; g.lineJoin = "round"; g.strokeStyle = ink; g.stroke();
  g.beginPath(); g.rect(-36, -62, 54, 20); g.fillStyle = cuff; g.fill(); g.stroke();
  // the taco: a folded shell, a green lettuce edge, red bits
  g.beginPath(); g.arc(-9, -8, 21, Math.PI, 0); g.closePath(); g.fillStyle = grey ? "#d8dce2" : "#f3b04a"; g.fill(); g.lineWidth = 3; g.strokeStyle = ink; g.stroke();
  g.beginPath(); g.arc(-9, -10, 17, Math.PI * 1.08, Math.PI * 1.92); g.lineWidth = 5; g.strokeStyle = grey ? "#aab0ba" : "#4fae3c"; g.stroke();
  g.fillStyle = grey ? "#aab0ba" : UI.red; [[-17, -14], [-6, -19], [3, -13]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); });
  g.restore();
}
/** a shopping cart: a basket on a handle with two wheels (drawn in strokes) */
function cart(g: G, cx: number, cy: number, k: number) {
  g.save(); g.translate(cx, cy); g.scale(k, k);
  g.strokeStyle = UI.ink; g.lineWidth = 4.4; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(-22, -16); g.lineTo(-14, -16); g.lineTo(-7, 10); g.lineTo(16, 10); g.lineTo(21, -8); g.lineTo(-12, -8); g.stroke();
  g.beginPath(); g.arc(-3, 19, 3.4, 0, Math.PI * 2); g.arc(13, 19, 3.4, 0, Math.PI * 2); g.fillStyle = UI.ink; g.fill();
  g.restore();
}
function page(g: G, bar = true) {
  g.fillStyle = UI.white; g.fillRect(0, 0, DW, DH);
  if (bar) { g.fillStyle = UI.page; g.fillRect(0, 0, DW, 64); g.fillStyle = UI.line; g.fillRect(0, 64, DW, 2); }
}

// ═════════════════════════════════════════════════════ the screens (design 300 x 640)
export type Screen =
  | { kind: "shop"; press: number; flash: number }
  | { kind: "password"; rules: number[]; typed: number; weak: number }
  | { kind: "captcha"; ticked: number[]; wrong: number }
  | { kind: "last"; pop: number; t: number }
  | { kind: "robot"; tick: number; pop: number }
  | { kind: "soldout"; pop: number }
  | { kind: "notify"; slide: number; press: number }
  | { kind: "rate"; stars: number[] };
type Assets = { face: HTMLCanvasElement | null };

/** the shop's cart page (shots 1, 21, 22, and under the notification): a top bar (the menu, the search, the cart with its "1"), "Your cart", the card of the taco socks, the total, a big yellow CHECKOUT button. Nothing is written under the
 * button: the captions of the shots that show this page full size go there (src/x08-sched.ts capBand) */
function drawShop(g: G, press: number, flash: number, dim = 0) {
  page(g);
  g.save(); g.strokeStyle = UI.ink; g.lineWidth = 3.4; g.lineCap = "round";
  [24, 32, 40].forEach((y) => { g.beginPath(); g.moveTo(20, y); g.lineTo(42, y); g.stroke(); });
  g.beginPath(); g.arc(204, 30, 8.5, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(210.5, 36.5); g.lineTo(219, 45); g.stroke();
  g.restore();
  cart(g, 258, 36, 1);
  g.beginPath(); g.arc(280, 20, 10.5, 0, Math.PI * 2); g.fillStyle = UI.yellow; g.fill(); g.lineWidth = 2; g.strokeStyle = UI.yellowDark; g.stroke();
  text(g, "1", 280, 25.5, 15, UI.ink, { weight: 900 });
  text(g, "Your cart", 20, 102, 24, UI.ink, { weight: 900, align: "left" });
  rr(g, 16, 114, 268, 100, 16); g.fillStyle = UI.white; g.fill(); g.lineWidth = 2.5; g.strokeStyle = UI.line; g.stroke();
  rr(g, 28, 124, 80, 80, 12); g.fillStyle = "#fff6d6"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = "#f0dd9a"; g.stroke();
  sock(g, 68, 164, 0.5);
  text(g, "Taco socks", 122, 158, 21, UI.ink, { weight: 900, align: "left" });
  text(g, "1 pair · $8", 122, 188, 16, UI.grey, { weight: 800, align: "left" });
  g.fillStyle = UI.line; g.fillRect(16, 232, 268, 2);
  text(g, "Total", 20, 270, 20, UI.grey, { weight: 800, align: "left" });
  text(g, "$8.00", 280, 270, 26, UI.ink, { weight: 900, align: "right" });
  const y = 288 + 6 * press;
  rr(g, 22, 294, 256, 76, 22); g.fillStyle = UI.yellowDark; g.fill();
  rr(g, 22, y, 256, 76, 22); g.fillStyle = press > 0.5 ? "#ffb800" : UI.yellow; g.fill();
  // the padlock at the button's left end (the thumb lands on it), the word on the right
  g.save(); g.fillStyle = UI.ink; g.strokeStyle = UI.ink; g.lineWidth = 4.4; g.lineCap = "round";
  rr(g, 41, y + 38, 26, 22, 5); g.fill();
  g.beginPath(); g.arc(54, y + 38, 8.5, Math.PI, 0); g.stroke();
  g.restore();
  text(g, "CHECKOUT", 90, y + 48, 27, UI.ink, { weight: 900, align: "left" });
  if (flash > 0.01) { rr(g, 14, 280 + 6 * press, 272, 92, 28); g.lineWidth = 8 * flash; g.strokeStyle = `rgba(255,255,255,${flash})`; g.stroke(); }
  if (dim > 0) { g.fillStyle = `rgba(20,24,40,${dim})`; g.fillRect(0, 0, DW, DH); }
}
/** the password screen (shot 4): the rules stand grey from the first frame; as he types the first three turn green (a disc with a tick, popped), then a fourth, red and bigger, pops in; under the field "Too weak". `rules[i]` 0..1 is rule i's pop */
function drawPassword(g: G, s: Extract<Screen, { kind: "password" }>) {
  page(g);
  text(g, "Create a password", 20, 116, 23, UI.ink, { weight: 900, align: "left" });
  rr(g, 20, 134, 260, 54, 12); g.fillStyle = UI.white; g.fill(); g.lineWidth = 3; g.strokeStyle = s.weak > 0.1 ? UI.red : "#b9c1cd"; g.stroke();
  for (let i = 0; i < s.typed; i++) { g.beginPath(); g.arc(40 + i * 22, 161, 7, 0, Math.PI * 2); g.fillStyle = UI.ink; g.fill(); }
  const w = pop(s.weak);
  about(g, 20, 222, w.k, w.a, () => { text(g, "Too weak 😔", 20, 228, 23, UI.red, { weight: 900, align: "left" }); });
  text(g, "Must include:", 20, 284, 15, UI.grey, { weight: 800, align: "left" });
  (["a capital letter", "a number", "a symbol"] as const).forEach((label, i) => {
    const y = 322 + 40 * i, p = s.rules[i] ?? 0, on = p > 0.02, q = pop(p);
    g.beginPath(); g.arc(36, y - 7, 11, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = "#b9c1cd"; g.stroke();
    if (on) about(g, 36, y - 7, q.k * 1.1, q.a, () => { g.beginPath(); g.arc(36, y - 7, 12.5, 0, Math.PI * 2); g.fillStyle = UI.green; g.fill(); tickPath(g, 36, y - 6, 15, "#ffffff", 3.6); });
    text(g, label, 60, y, 20, on ? UI.ink : "#8c95a3", { weight: 800, align: "left" });
  });
  const p3 = pop(s.rules[3] ?? 0);
  about(g, 150, 474, p3.k, p3.a, () => {
    rr(g, 14, 424, 272, 90, 14); g.fillStyle = "#fde9e7"; g.fill(); g.lineWidth = 3.4; g.strokeStyle = UI.red; g.stroke();
    g.beginPath(); g.arc(44, 469, 15, 0, Math.PI * 2); g.fillStyle = UI.red; g.fill(); crossPath(g, 44, 469, 22, "#ffffff", 4.6);
    text(g, "your grandma's", 70, 462, 25, UI.red, { weight: 900, align: "left" });
    text(g, "blood type", 70, 494, 25, UI.red, { weight: 900, align: "left" });
  });
}
const TILE = 80, GAP = 6, GX = 24, GY = 142;
function drawCaptcha(g: G, s: Extract<Screen, { kind: "captcha" }>, as: Assets) {
  page(g, false);
  g.fillStyle = UI.ink; g.fillRect(0, 0, DW, 128);
  text(g, "Select all squares", 150, 70, 17, "#cdd5e1", { weight: 800 });
  text(g, "with a human", 150, 108, 31, "#ffffff", { weight: 900 });
  for (let i = 0; i < 9; i++) {
    const x = GX + (i % 3) * (TILE + GAP), y = GY + Math.floor(i / 3) * (TILE + GAP), on = s.ticked[i] ?? 0;
    rr(g, x, y, TILE, TILE, 7); g.fillStyle = "#dfe6ee"; g.fill();
    if (as.face) {
      const k = 1 - 0.12 * Math.min(1, on), sc = (0.94 + 0.12 * ((i * 37) % 7) / 6) * k, w = TILE * 0.9 * sc, h = w * as.face.height / as.face.width;
      const ox = ((i * 53) % 9 - 4) * 0.8, oy = ((i * 29) % 7 - 3) * 0.8;
      g.save(); rr(g, x, y, TILE, TILE, 7); g.clip(); g.drawImage(as.face, x + (TILE - w) / 2 + ox, y + (TILE - h) / 2 + 3 + oy, w, h); g.restore();
    }
    if (on > 0.02) {
      rr(g, x + 1.5, y + 1.5, TILE - 3, TILE - 3, 7); g.lineWidth = 5; g.strokeStyle = s.wrong > 0.2 ? UI.red : UI.yellow; g.stroke();
      const q = Math.min(1.15, on);
      g.save(); g.translate(x + 15, y + 15); g.scale(q, q); g.beginPath(); g.arc(0, 0, 13.5, 0, Math.PI * 2); g.fillStyle = s.wrong > 0.2 ? UI.red : UI.yellow; g.fill(); tickPath(g, 0, 1, 15, s.wrong > 0.2 ? "#fff" : UI.ink, 3.6); g.restore();
    }
  }
  const w = pop(s.wrong);
  about(g, 150, 464, w.k, w.a, () => { rr(g, 22, 420, 256, 100, 16); g.fillStyle = "#fde9e7"; g.fill(); g.lineWidth = 4; g.strokeStyle = UI.red; g.stroke(); text(g, "Wrong.", 150, 468, 34, UI.red, { weight: 900 }); text(g, "No humans found.", 150, 500, 20, UI.red, { weight: 900 }); });
}
function drawLast(g: G, s: Extract<Screen, { kind: "last" }>) {
  page(g);
  const p = pop(s.pop);
  about(g, 150, 330, p.k, p.a, () => {
    text(g, "Last step!", 150, 150, 22, UI.grey, { weight: 900 });
    text(g, "Prove you're", 150, 204, 36, UI.ink, { weight: 900 });
    text(g, "human.", 150, 248, 36, UI.ink, { weight: 900 });
    for (let i = 0; i < 2; i++) { const u = (s.t * 1.1 + i * 0.5) % 1; g.beginPath(); g.arc(150, 382, 84 + 36 * u, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = `rgba(255,201,40,${0.7 * (1 - u)})`; g.stroke(); }
    g.beginPath(); g.arc(150, 386, 80, 0, Math.PI * 2); g.fillStyle = UI.yellowDark; g.fill();
    g.beginPath(); g.arc(150, 382, 80, 0, Math.PI * 2); g.fillStyle = UI.yellow; g.fill();
    rr(g, 131, 334, 38, 66, 19); g.fillStyle = UI.ink; g.fill();
    g.beginPath(); g.arc(150, 376, 31, 0.1 * Math.PI, 0.9 * Math.PI); g.lineWidth = 7; g.lineCap = "round"; g.strokeStyle = UI.ink; g.stroke();
    g.beginPath(); g.moveTo(150, 407); g.lineTo(150, 428); g.moveTo(130, 429); g.lineTo(170, 429); g.stroke();
  });
}
function drawRobot(g: G, s: Extract<Screen, { kind: "robot" }>) {
  page(g);
  const p = pop(s.pop);
  about(g, 150, 220, p.k, p.a, () => {
    rr(g, 16, 88, 268, 252, 22); g.fillStyle = "#fff1ef"; g.fill(); g.lineWidth = 4; g.strokeStyle = UI.red; g.stroke();
    text(g, "Too aggressive.", 150, 160, 29, UI.red, { weight: 900 });
    text(g, "Are you a robot?", 150, 212, 26, UI.ink, { weight: 900 });
    text(g, "🤖", 150, 296, 66, UI.ink, { weight: 900 });
  });
  rr(g, 20, 386, 260, 82, 14); g.fillStyle = "#f7f8fa"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = UI.line; g.stroke();
  rr(g, 36, 405, 44, 44, 7); g.fillStyle = UI.white; g.fill(); g.lineWidth = 4; g.strokeStyle = s.tick > 0.05 ? UI.green : "#98a1ae"; g.stroke();
  if (s.tick > 0.02) { g.save(); g.translate(58, 428); g.scale(Math.min(1.2, s.tick), Math.min(1.2, s.tick)); g.translate(-58, -428); tickPath(g, 58, 428, 36, UI.green, 7); g.restore(); }
  text(g, "I'm not a robot", 96, 436, 22, UI.ink, { weight: 800, align: "left" });
}
function drawSold(g: G, s: Extract<Screen, { kind: "soldout" }>) {
  page(g);
  const p = pop(s.pop);
  about(g, 150, 300, p.k, p.a, () => {
    rr(g, 16, 82, 268, 200, 20); g.fillStyle = "#eef0f3"; g.fill();
    sock(g, 150, 168, 0.98, true);
    text(g, "Sorry!", 150, 352, 54, UI.ink, { weight: 900 });
    text(g, "Out of stock 😔", 150, 408, 27, UI.grey, { weight: 900 });
    rr(g, 22, 440, 256, 72, 22); g.fillStyle = "#e4e7ec"; g.fill();
  });
}
function drawNotify(g: G, s: Extract<Screen, { kind: "notify" }>) {
  drawShop(g, s.press, 0, 0.45);
  const y = -176 + 232 * s.slide;
  g.save(); g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
  rr(g, 8, y, 284, 170, 24); g.fillStyle = "#ffffff"; g.fill(); g.restore();
  rr(g, 22, y + 22, 50, 50, 13); g.fillStyle = UI.yellow; g.fill();
  sock(g, 47, y + 47, 0.27);
  text(g, "You left something", 86, y + 44, 18.5, UI.ink, { weight: 900, align: "left" });
  text(g, "in your cart! 😊", 86, y + 70, 18.5, UI.ink, { weight: 900, align: "left" });
  text(g, "Taco socks are back", 26, y + 112, 18, UI.grey, { weight: 800, align: "left" });
  text(g, "in stock!", 26, y + 138, 18, UI.grey, { weight: 800, align: "left" });
}
function drawRate(g: G, s: Extract<Screen, { kind: "rate" }>) {
  page(g, false);
  g.fillStyle = UI.ink; g.fillRect(0, 0, DW, 6);
  text(g, "Rate your", 150, 150, 38, UI.ink, { weight: 900 });
  text(g, "experience!", 150, 198, 38, UI.ink, { weight: 900 });
  for (let i = 0; i < 5; i++) {
    const p = s.stars[i] ?? 0, cx = 34 + i * 58, cy = 296;
    star(g, cx, cy, 25, null, "#b3bac6", 3.2);
    if (p > 0.01) { g.save(); g.translate(cx, cy); const q = Math.min(1.3, p); g.scale(q, q); star(g, 0, 0, 25, UI.yellow, "#b98a00", 3.2); g.restore(); }
  }
}
export function drawScreen(g: G, s: Screen, as: Assets) {
  switch (s.kind) {
    case "shop": return drawShop(g, s.press, s.flash);
    case "password": return drawPassword(g, s);
    case "captcha": return drawCaptcha(g, s, as);
    case "last": return drawLast(g, s);
    case "robot": return drawRobot(g, s);
    case "soldout": return drawSold(g, s);
    case "notify": return drawNotify(g, s);
    case "rate": return drawRate(g, s);
  }
}
/** a screen's state as a short string: the memo key of its texture (numbers rounded to 1/24) */
export const screenKey = (s: Screen) => JSON.stringify(s, (_k, v) => (typeof v === "number" ? Math.round(v * 24) / 24 : v));

/** Ross's face as a tile for the captcha: the master head (the painted eyes, ears, stubble) with the brows and the mouth that the code draws on the puppet, drawn in the rig's own numbers; 220 px tall */
export function useFaceTile(): HTMLCanvasElement | null {
  const [img] = useImages([ROSS.layers.head.file]);
  return React.useMemo(() => {
    const H0 = ROSS.layers.head, k = 240 / H0.h;
    const c = document.createElement("canvas"); c.width = Math.round(H0.w * k); c.height = Math.round(H0.h * k);
    const g = c.getContext("2d")!;
    g.drawImage(img.image as CanvasImageSource, 0, 0, c.width, c.height);
    const P = (x: number, y: number): [number, number] => [(x - H0.x) * k, (y - H0.y) * k];
    // the mouth: the closed line the painted head had; the brows: the strokes the painted head had
    g.lineCap = "round"; g.lineJoin = "round";
    const m = ROSS.mouth, [mx, my] = P(m.cx, m.cy);
    g.strokeStyle = "#7a5a34"; g.lineWidth = 3.2; g.beginPath(); g.moveTo(mx - m.w * 0.5 * k, my + 1); g.quadraticCurveTo(mx, my + 5, mx + m.w * 0.5 * k, my - 3); g.stroke();
    g.strokeStyle = ROSS.browColour;
    ROSS.brows.forEach((b) => { g.beginPath(); b.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.lineWidth = 17 * k; g.stroke(); });
    return c;
  }, [img]);
}

// ═════════════════════════════════════════════════════ the painted phone in Ross's hands: a screen drawn on its glass (the sit and up pictures' phones; the glass is a mask of the body layer, so the fingers that cover it stay in front)
export function PuppetScreen({ pose, x, y, E, p, screen, order }: { pose: "sit" | "up"; x: number; y: number; E: number; p: RPose; screen: Screen; order: number }) {
  const S = (ROSS.screens as Record<string, { file: string; cx: number; cy: number; w: number; h: number; turn: number }>)[pose], L = (ROSS.bodies as Record<string, { x: number; y: number; w: number; h: number }>)[pose];
  const [mask] = useImages([S.file]);
  const face = useFaceTile();
  const key = screenKey(screen), K = 2;
  const tex = useUiTexture(L.w * K, L.h * K, (g) => {
    const ui = document.createElement("canvas"); ui.width = L.w * K; ui.height = L.h * K;
    const u = ui.getContext("2d")!;
    u.save(); u.scale(K, K); u.translate(S.cx, S.cy); u.rotate((S.turn * Math.PI) / 180); u.translate(-S.w / 2, -S.h / 2); u.scale(S.w / DW, S.w / DW);
    drawScreen(u, screen, { face });
    u.restore();
    u.globalCompositeOperation = "destination-in"; u.drawImage(mask.image as CanvasImageSource, 0, 0, L.w * K, L.h * K);
    g.drawImage(ui, 0, 0);
  }, [mask, face, key]);
  const [lx, ly] = loc(ROSS, L.x + L.w / 2, L.y + L.h / 2), [px, py] = bodyPt(p, E, x, y, lx, ly);
  return <Plane tex={tex} x={px} y={py} w={L.w * E} h={L.h * E} order={order} />;
}

// ═════════════════════════════════════════════════════ the hand that holds the phone (the inserts)
/** layer px (y down) of the hand's picture as panel px for a layer placed with its middle at (x, y) at scale E */
export const layerPt = (x: number, y: number, E: number, lx: number, ly: number): [number, number] => [x + (lx - HAND.w / 2) * E, y - (ly - HAND.h / 2) * E];
/** design px of the glass (300 x 640) as layer px */
export const glassPt = (dx: number, dy: number): [number, number] => [HAND.screen[0] + (dx * (HAND.screen[2] - HAND.screen[0])) / DW, HAND.screen[1] + (dy * (HAND.screen[3] - HAND.screen[1])) / DH];
const K_HAND = 2;
export function HandPhone({ x, y, E, screen, order, op = 1, rot = 0 }: { x: number; y: number; E: number; screen: Screen; order: number; op?: number; rot?: number }) {
  const [pic, mask] = useImages([HAND.file, HAND.screenFile]);
  const face = useFaceTile();
  const key = screenKey(screen);
  const tex = useUiTexture(HAND.w * K_HAND, HAND.h * K_HAND, (g) => {
    g.drawImage(pic.image as CanvasImageSource, 0, 0, HAND.w * K_HAND, HAND.h * K_HAND);
    const ui = document.createElement("canvas"); ui.width = HAND.w * K_HAND; ui.height = HAND.h * K_HAND;
    const u = ui.getContext("2d")!, [x0, y0, x1, y1] = HAND.screen;
    u.save(); u.scale(K_HAND, K_HAND); u.translate(x0, y0); u.scale((x1 - x0) / DW, (y1 - y0) / DH);
    drawScreen(u, screen, { face });
    u.restore();
    u.globalCompositeOperation = "destination-in"; u.drawImage(mask.image as CanvasImageSource, 0, 0, HAND.w * K_HAND, HAND.h * K_HAND);
    g.drawImage(ui, 0, 0);
  }, [pic, mask, face, key]);
  return <Plane tex={tex} x={x} y={y} w={HAND.w * E} h={HAND.h * E} rot={rot} op={op} order={order} />;
}

/** a phone on its own (no hand): a black rounded bezel round the screen, a notch; (x, y) its middle, `w` its width in panel px; the screen is a design (300 x 640) */
export function PlainPhone({ x, y, w, screen, order, rot = 0, op = 1 }: { x: number; y: number; w: number; screen: Screen; order: number; rot?: number; op?: number }) {
  const face = useFaceTile();
  const key = screenKey(screen);
  const K = 2, bz = 14, pw = DW + 2 * bz, ph = DH + 2 * bz;
  const tex = useUiTexture(pw * K, ph * K, (g) => {
    g.scale(K, K);
    rr(g, 0, 0, pw, ph, 46); g.fillStyle = "#0b0d12"; g.fill();
    rr(g, 3, 3, pw - 6, ph - 6, 43); g.lineWidth = 2; g.strokeStyle = "#2b3140"; g.stroke();
    g.save(); g.translate(bz, bz); rr(g, 0, 0, DW, DH, 34); g.clip(); drawScreen(g, screen, { face }); g.restore();
    rr(g, pw / 2 - 48, bz - 1, 96, 22, 11); g.fillStyle = "#0b0d12"; g.fill();
  }, [face, key]);
  return <Plane tex={tex} x={x} y={y} w={w} h={(w * ph) / pw} rot={rot} op={op} order={order} />;
}

// ═════════════════════════════════════════════════════ the pop-ups (shot 2): white cards with a grey bar, rounded, a yellow button; frame px of their own
export const WIN = [{ w: 600, h: 400 }, { w: 640, h: 430 }, { w: 660, h: 440 }, { w: 800, h: 600 }] as const;
function winFrame(g: G, w: number, h: number, bar = 56) {
  g.save(); rr(g, 0, 0, w, h, 30); g.clip();
  g.fillStyle = UI.white; g.fillRect(0, 0, w, h);
  g.fillStyle = "#e9edf2"; g.fillRect(0, 0, w, bar);
  [0, 1, 2].forEach((i) => { g.beginPath(); g.arc(34 + i * 30, bar / 2, 9, 0, Math.PI * 2); g.fillStyle = i === 0 ? "#f0827a" : i === 1 ? "#f2c35c" : "#9ad39b"; g.fill(); });
  crossPath(g, w - 38, bar / 2, 22, "#8c95a3", 5);
  g.restore();
  rr(g, 2, 2, w - 4, h - 4, 29); g.lineWidth = 4; g.strokeStyle = "#c9d0da"; g.stroke();
}
const btn = (g: G, x: number, y: number, w: number, h: number, label: string, size: number, solid = true) => {
  rr(g, x, y + 7, w, h, h * 0.3); g.fillStyle = UI.yellowDark; g.fill();
  rr(g, x, y, w, h, h * 0.3); g.fillStyle = solid ? UI.yellow : "#fff5cf"; g.fill(); if (!solid) { g.lineWidth = 5; g.strokeStyle = UI.yellow; g.stroke(); }
  text(g, label, x + w / 2, y + h * 0.5 + size * 0.35, size, UI.ink, { weight: 900 });
};
export function drawWindow(g: G, i: number) {
  const { w, h } = WIN[i];
  winFrame(g, w, h);
  switch (i) {
    case 0:
      text(g, "🍪 We use cookies!", w / 2, 170, 58, UI.ink, { weight: 900 });
      btn(g, w - 290, h - 120, 250, 78, "Accept all", 38);
      break;
    case 1:
      text(g, "Get 10% off!", w / 2, 150, 76, UI.ink, { weight: 900 });
      rr(g, 54, 206, w - 108, 84, 16); g.fillStyle = "#f4f6f9"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#b9c1cd"; g.stroke();
      text(g, "Enter your email", 84, 262, 38, "#8c95a3", { weight: 700, align: "left" });
      break;
    case 2:
      text(g, "Allow notifications?", w / 2, 160, 56, UI.ink, { weight: 900 });
      btn(g, 52, h - 148, 260, 88, "Allow", 44);
      btn(g, w - 312, h - 148, 260, 88, "Allow", 44);
      break;
    default: {
      g.save(); rr(g, 0, 0, w, h, 30); g.clip(); g.fillStyle = UI.yellow; g.fillRect(0, 56, w, 232); g.restore();
      text(g, "CREATE AN", w / 2, 160, 108, UI.ink, { weight: 900 });
      text(g, "ACCOUNT", w / 2, 258, 108, UI.ink, { weight: 900 });
      [0, 1].forEach((k) => { rr(g, 64, 322 + k * 96, w - 128, 70, 14); g.fillStyle = "#f4f6f9"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#b9c1cd"; g.stroke(); rr(g, 90, 346 + k * 96, 150 + 60 * k, 22, 8); g.fillStyle = "#d4d9e1"; g.fill(); });
      rr(g, 64, 520, w - 128, 4, 2); g.fillStyle = "#d4d9e1"; g.fill();
    }
  }
}
const K_WIN = 1.5;
/** window i as a plane: (x, y) its middle (panel px), `s` its scale, rot degrees, op */
export function WindowPlane({ i, x, y, s = 1, rot = 0, order, op = 1 }: { i: number; x: number; y: number; s?: number; rot?: number; order: number; op?: number }) {
  const { w, h } = WIN[i];
  const tex = useCanvasTexture(w * K_WIN, h * K_WIN, (g) => { g.scale(K_WIN, K_WIN); drawWindow(g, i); }, [i]);
  return <Plane tex={tex} x={x} y={y} w={w * s} h={h * s} rot={rot} op={op} order={order} />;
}
/** a soft dark shadow under a window (a flat rounded rect, three layers deep) */
export function WindowShadow({ i, x, y, s = 1, rot = 0, order, op = 0.5 }: { i: number; x: number; y: number; s?: number; rot?: number; order: number; op?: number }) {
  const { w, h } = WIN[i];
  return <Poly pts={xf(roundRectPts(w * s * 1.02, h * s * 1.02, 32 * s), x + 10 * s, y - 18 * s, rot)} color="#05060c" order={order} op={op} />;
}
function roundRectPts(w: number, h: number, r: number): Pt[] {
  const out: Pt[] = [], c: Pt[] = [[w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r], [w / 2 - r, -h / 2 + r]];
  c.forEach((p, k) => { for (let i = 0; i <= 8; i++) { const a = (k + i / 8) * (Math.PI / 2); out.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r]); } });
  return out;
}
