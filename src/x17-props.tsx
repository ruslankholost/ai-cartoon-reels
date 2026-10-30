import { useEffect } from "react";
import * as THREE from "three";
import { Plane, useCanvasTexture, useImages } from "./sp-fx";
import { fit, rr, text, type G } from "./pen-ui";
import { hash } from "./sp-math";

// The props of x17 "Seat Swap" that are drawn in code (src/x17-scenes.tsx places them): the two boarding passes (12A · WINDOW · +$89 with "+$89" big; 47E · MIDDLE · BY TOILET with "BY TOILET" red), the JUST MARRIED lettering on the couple's
// white caps, the little "12A" by the window, the sky with the clouds that slide past a window or race past the wing (a canvas clipped to the glass, so that the plate's own frame is on top of it), the glare on the cockpit's windshield.
// Everything is a function of the frame: a canvas texture is drawn once per state and laid on a plane (the shape of src/x16-props.tsx).

// ── a texture that is thrown away when the next one replaces it (the clouds have a new state every frame; the GPU would fill up otherwise)
function useUiTexture(w: number, h: number, draw: (g: G) => void, deps: unknown[]): THREE.CanvasTexture {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const q = (x: number, n = 30) => Math.round(x * n);

// ═════════════════════════════════════════════════════ the two boarding passes (design 760 x 440 units): a navy band with BOARDING PASS and a little plane, the seat in big letters, its kind under it, and on the right a stub:
// his has the price tag +$89 (big, on green), hers a barcode; the line under hers, BY TOILET, is red. A pass is the card as seen from above on a tray (flat, no perspective)
export type PassKind = "mine" | "hers";
export const PASS_BOX = { w: 760, h: 440 };
function plane(g: G, x: number, y: number, s: number, color: string) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = color;
  g.beginPath(); g.moveTo(-24, 0); g.lineTo(18, -5); g.lineTo(34, -3); g.lineTo(36, 0); g.lineTo(34, 3); g.lineTo(18, 5); g.lineTo(-24, 0); g.fill();   // the body
  g.beginPath(); g.moveTo(-2, -2); g.lineTo(-14, -22); g.lineTo(-8, -22); g.lineTo(12, -2); g.fill();                                              // one wing
  g.beginPath(); g.moveTo(-2, 2); g.lineTo(-14, 22); g.lineTo(-8, 22); g.lineTo(12, 2); g.fill();                                                  // the other
  g.beginPath(); g.moveTo(-22, 0); g.lineTo(-30, -12); g.lineTo(-25, -12); g.lineTo(-14, 0); g.fill();                                              // the tail
  g.restore();
}
export function drawPass(g: G, kind: PassKind) {
  const { w, h } = PASS_BOX;
  g.save();
  rr(g, 0, 0, w, h, 30); g.fillStyle = "#fbfaf2"; g.fill(); g.lineWidth = 7; g.strokeStyle = "#16233d"; g.stroke();
  g.save(); rr(g, 3, 3, w - 6, h - 6, 28); g.clip();
  g.fillStyle = "#1f3a6e"; g.fillRect(0, 0, w, 92);
  text(g, "BOARDING PASS", 38, 62, 40, "#ffffff", { align: "left", spacing: 4 });
  plane(g, w - 70, 46, 1.1, "#ffffff");
  g.setLineDash([12, 10]); g.strokeStyle = "#8b93a3"; g.lineWidth = 4; g.beginPath(); g.moveTo(520, 112); g.lineTo(520, h - 24); g.stroke(); g.setLineDash([]);
  if (kind === "mine") {
    text(g, "SEAT", 44, 126, 28, "#6b7488", { align: "left", spacing: 3 });
    text(g, "12A", 40, 282, 180, "#16233d", { align: "left" });
    text(g, "WINDOW", 44, 372, 80, "#1b6fb8", { align: "left", spacing: 2 });
    text(g, "SEAT FEE", 640, 146, 30, "#6b7488", { spacing: 3 });
    rr(g, 546, 168, 190, 168, 28); g.fillStyle = "#1d9a4a"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#0d4a22"; g.stroke();
    text(g, "+$89", 641, 296, Math.min(98, fit(g, "+$89", 158, 100)), "#ffffff");
    text(g, "PAID", 641, 392, 40, "#1d9a4a", { spacing: 6 });
  } else {
    text(g, "SEAT", 44, 126, 28, "#6b7488", { align: "left", spacing: 3 });
    text(g, "47E", 40, 282, 180, "#16233d", { align: "left" });
    text(g, "MIDDLE", 44, 350, 62, "#16233d", { align: "left", spacing: 2 });
    text(g, "BY TOILET", 44, 416, 62, "#e5242b", { align: "left", spacing: 1 });
    for (let i = 0; i < 22; i++) { const bw = 3 + hash(i * 4.7) * 8; g.fillStyle = "#16233d"; g.fillRect(560 + i * 8.6, 150, bw < 6 ? 3 : 6, 200); }
    text(g, "CHECK-IN", 641, 392, 30, "#6b7488", { spacing: 3 });
  }
  g.restore(); g.restore();
}
export function Pass({ x, y, k, kind, rot = 0, order, sx = 1, sy = 1 }: { x: number; y: number; k: number; kind: PassKind; rot?: number; order: number; sx?: number; sy?: number }) {
  const tex = useUiTexture(PASS_BOX.w * 2, PASS_BOX.h * 2, (g) => { g.scale(2, 2); drawPass(g, kind); }, [kind]);
  return <Plane tex={tex} x={x} y={y} w={PASS_BOX.w * k} h={PASS_BOX.h * k} rot={rot} sx={sx} sy={sy} order={order} />;
}

// ═════════════════════════════════════════════════════ JUST MARRIED on a white cap: "JUST" over "MARRIED" in red marker capitals, each letter a little crooked, a dark line round it (the shape of src/x16-props.tsx SignLetters); the box (w x h) is the cap's
// front panel in px of the plane, (x, y) its middle in panel px
export function CapLetters({ x, y, w, h, rot = 0, order }: { x: number; y: number; w: number; h: number; rot?: number; order: number }) {
  const K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => {
    g.scale(K, K);
    const rows = ["JUST", "MARRIED"], avail = w * 0.94;
    const sizes = rows.map((r) => Math.min(h * 0.46, fit(g, r, avail, 400, { weight: 900 }))), gap = h * 0.04, total = sizes[0] * 0.74 + sizes[1] * 0.74 + gap;
    let base = (h - total) / 2;
    rows.forEach((r, ri) => {
      const size = sizes[ri];
      g.font = `900 ${size}px Arial, Helvetica, sans-serif`; g.textBaseline = "alphabetic"; g.textAlign = "left";
      const adv = [...r].map((c) => g.measureText(c).width), tw = adv.reduce((a, b) => a + b, 0);
      let cx = (w - tw) / 2;
      base += size * 0.74;
      [...r].forEach((c, ci) => {
        const j = hash(ci * 3.7 + ri * 11.3), rotL = (j - 0.5) * 0.12, dy = (hash(ci * 5.9 + ri * 2.3) - 0.5) * size * 0.05;
        g.save(); g.translate(cx + adv[ci] / 2, base + dy); g.rotate(rotL);
        g.lineJoin = "round"; g.lineWidth = size * 0.08; g.strokeStyle = "#5e0a0f"; g.strokeText(c, -adv[ci] / 2, 0);
        g.fillStyle = "#d4191f"; g.fillText(c, -adv[ci] / 2, 0);
        g.restore();
        cx += adv[ci];
      });
      base += gap;
    });
  }, [w, h]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} order={order} />;
}

// ═════════════════════════════════════════════════════ a small seat label by a window ("12A"): white marker capitals on a navy plate with a thin white line round it, so that it reads at phone size on the fuselage
export function SeatTag({ x, y, w, h, text: label, order, rot = 0 }: { x: number; y: number; w: number; h: number; text: string; order: number; rot?: number }) {
  const K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => {
    g.scale(K, K);
    rr(g, 2, 2, w - 4, h - 4, h * 0.22); g.fillStyle = "#16233d"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#ffffff"; g.stroke();
    const size = Math.min(h * 0.7, fit(g, label, w * 0.8, 400, { weight: 900 }));
    text(g, label, w / 2, h / 2 + size * 0.36, size, "#ffffff", { spacing: 2 });
  }, [w, h, label]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} order={order} />;
}

// ═════════════════════════════════════════════════════ the sky and its clouds in a canvas: (x, y) the middle in panel px, w x h the canvas in frame px, `t` seconds, `speed` px/s of the nearest clouds (the far ones go slower).
// `shape`: the part of the canvas that is sky ("oval": a stadium, the cabin window's glass inset by `inset` px; "all": the whole canvas). A cloud is a few overlapping circles with a thin blue-grey line round the union (the outline copies
// first, then the white): flat, as everything is. Clouds wrap round: nothing starts or stops inside the frame
export type SkyCfg = { w: number; h: number; t: number; speed: number; seed?: number; shape?: "oval" | "all"; radius?: number; inset?: number; n?: number; size?: number; top?: string; bottom?: string; cloud?: string; ink?: string };
export function drawSky(g: G, c: SkyCfg) {
  const { w, h, t } = c, seed = c.seed ?? 1, n = c.n ?? 7, size = c.size ?? 1, inset = c.inset ?? 0;
  g.save();
  if (c.shape === "oval") { rr(g, inset, inset, w - 2 * inset, h - 2 * inset, c.radius ?? Math.min(w, h) * 0.45); g.clip(); }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c.top ?? "#7fc8f4"); gr.addColorStop(1, c.bottom ?? "#cdeeff"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const ink = c.ink ?? "#6d98bd", fill = c.cloud ?? "#ffffff";
  const span = w * 1.5;
  const cl = Array.from({ length: n }, (_, i) => {
    const hs = (qq: number) => hash(i * qq + seed * 7.1), depth = 0.45 + 0.55 * hs(1.7);   // depth 1 = near: bigger, faster
    return { x0: hs(2.3) * span, y: (0.1 + 0.8 * hs(3.1)) * h, r: (34 + 44 * depth) * size, v: c.speed * depth, bumps: 4 + Math.floor(hs(5.3) * 3), hs };
  });
  const drawCloud = (cx: number, cy: number, r: number, bumps: number, lw: number, colour: string) => {
    g.fillStyle = colour;
    for (let b = 0; b < bumps; b++) {
      const u = bumps === 1 ? 0.5 : b / (bumps - 1), bx = cx + (u - 0.5) * r * 3.1, by = cy - Math.sin(u * Math.PI) * r * 0.55 + r * 0.25, br = r * (0.62 + 0.5 * Math.sin(u * Math.PI));
      g.beginPath(); g.arc(bx, by, br + lw, 0, Math.PI * 2); g.fill();
    }
    g.beginPath(); g.ellipse(cx, cy + r * 0.4, r * 1.75 + lw, r * 0.45 + lw, 0, 0, Math.PI * 2); g.fill();
  };
  for (const k of cl) {
    const x = (((k.x0 - k.v * t) % span) + span) % span - w * 0.25;
    drawCloud(x, k.y, k.r, k.bumps, 3.4, ink);
    drawCloud(x, k.y, k.r, k.bumps, 0, fill);
  }
  g.restore();
}
export function Sky({ x, y, cfg, order, sx = 1, sy = 1, maskFile }: { x: number; y: number; cfg: SkyCfg; order: number; sx?: number; sy?: number; maskFile?: string }) {
  const mask = useImages(maskFile ? [maskFile] : [])[0];   // (`maskFile`: a picture whose alpha is where the sky shows: the plate's glass, to the pixel)
  const key = `${q(cfg.t, 30)}:${cfg.w}:${cfg.h}:${cfg.speed}:${cfg.shape}:${cfg.seed}:${cfg.size}`;
  const tex = useUiTexture(Math.round(cfg.w / 2), Math.round(cfg.h / 2), (g) => {
    g.scale(0.5, 0.5); drawSky(g, cfg);
    if (mask) { g.globalCompositeOperation = "destination-in"; g.drawImage(mask.image as CanvasImageSource, 0, 0, cfg.w, cfg.h); g.globalCompositeOperation = "source-over"; }
  }, [key, mask]);
  return <Plane tex={tex} x={x} y={y} w={cfg.w} h={cfg.h} sx={sx} sy={sy} order={order} />;
}

// ═════════════════════════════════════════════════════ what is behind a window's glass: a picture clipped to the pane (a rounded rectangle w x h px), on the cabin's cream; the picture's layer point (ax, ay) goes on the pane's middle (moved by dx, dy px),
// at scale k (the couple kissing in window 12A)
export function Inside({ x, y, w, h, file, ax, ay, k, dx = 0, dy = 0, radius, bg = "#f3e4b8", order }: { x: number; y: number; w: number; h: number; file: string; ax: number; ay: number; k: number; dx?: number; dy?: number; radius: number; bg?: string; order: number }) {
  const img = useImages([file])[0], K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => {
    g.scale(K, K);
    rr(g, 0, 0, w, h, radius); g.clip();
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const im = img.image as CanvasImageSource & { width: number; height: number };
    g.drawImage(im, w / 2 + dx - ax * k, h / 2 + dy - ay * k, im.width * k, im.height * k);
  }, [img, w, h, k, dx, dy, radius, bg]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} order={order} />;
}

// ═════════════════════════════════════════════════════ the glare on a window or a windshield (design w x h px of its own): a wide soft diagonal band of white and a narrower one beside it, so that the glass reads as glass; `a` 0..1 how strong
export function Glare({ x, y, w, h, a = 0.35, shift = 0, order, rot = 0 }: { x: number; y: number; w: number; h: number; a?: number; shift?: number; order: number; rot?: number }) {
  const K = 1;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => {
    g.save();
    const band = (x0: number, bw: number, al: number) => { g.fillStyle = `rgba(255,255,255,${al})`; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + bw, 0); g.lineTo(x0 + bw - h * 0.55, h); g.lineTo(x0 - h * 0.55, h); g.closePath(); g.fill(); };
    band(w * 0.46 + shift, w * 0.2, a);
    band(w * 0.7 + shift, w * 0.07, a * 0.8);
    g.restore();
  }, [w, h, q(a, 100), q(shift, 4)]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} order={order} />;
}

