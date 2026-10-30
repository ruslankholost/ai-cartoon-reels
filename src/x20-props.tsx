import { useEffect } from "react";
import * as THREE from "three";
import { Plane, useCanvasTexture } from "./sp-fx";
import { fit } from "./pen-ui";

// The writing of x20 "One Coffee" that is drawn in code (src/x20-draw.tsx and src/x20-scenes.tsx place it): "$2.50" over the tiny cup, OFFER ACCEPTED and the sum on the laptop's screen. Text is never painted into the art (scripts/x20-art-gen.py). A canvas texture
// is drawn once per state and laid on a plane (the shape of src/x18-props.tsx and src/x19-props.tsx).
export function useUiTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, deps: unknown[]): THREE.CanvasTexture {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const FONT = "Arial, Helvetica, sans-serif";

/** a word in fat letters with an outline (`ink`, none when null) on a transparent plane of w x h, centred at (x, y) (panel px, y up); `sx`, `sy` squeeze it (a pop), `rot` degrees counter-clockwise */
export function WordTag({ text, w, h, fill, ink = null, lineW = 0.14, x, y, sx = 1, sy = 1, rot = 0, order, op = 1, fitTo }: { text: string; w: number; h: number; fill: string; ink?: string | null; lineW?: number; x: number; y: number; sx?: number; sy?: number; rot?: number; order: number; op?: number; fitTo?: string }) {
  const K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => {
    g.scale(K, K);
    const size = fit(g, fitTo ?? text, w * 0.92, h * 0.86);   // `fitTo`: the string the size is fitted to (a count-up keeps one size: the widest number)
    g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
    const base = h / 2 + size * 0.35;
    if (ink) { g.lineWidth = size * lineW; g.strokeStyle = ink; g.strokeText(text, w / 2, base); }
    g.fillStyle = fill; g.fillText(text, w / 2, base);
  }, [text, w, h, fill, ink, lineW, fitTo]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} sx={sx} sy={sy} order={order} op={op} />;
}

// ═════════════════════════════════════════════════════ the price: "$2.50" in fat green letters with a black outline and a white shine, on a pale starburst, so that it reads over a white cup (x18's and x19's price, a different sum). `s` the scale (the pop is the scene's)
export function PriceTag20({ x, y, s = 1, rot = 0, order, op = 1, text = "$2.50" }: { x: number; y: number; s?: number; rot?: number; order: number; op?: number; text?: string }) {
  const w = 520, h = 300, K = 2;
  const tex = useUiTexture(w * K, h * K, (g) => {
    g.scale(K, K);
    g.beginPath();
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.74 : 1; g.lineTo(w / 2 + Math.cos(a) * r * (w / 2 - 6), h / 2 + Math.sin(a) * r * (h / 2 - 6)); }
    g.closePath(); g.fillStyle = "#fff3a8"; g.fill(); g.lineWidth = 8; g.strokeStyle = "#16110d"; g.lineJoin = "round"; g.stroke();
    const size = fit(g, text, w * 0.7, 190);
    g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
    g.lineWidth = size * 0.16; g.strokeStyle = "#16110d"; g.strokeText(text, w / 2, h / 2 + size * 0.34);
    g.fillStyle = "#28b04c"; g.fillText(text, w / 2, h / 2 + size * 0.34);
    g.save(); g.beginPath(); g.rect(0, 0, w, h / 2 - size * 0.02); g.clip(); g.fillStyle = "rgba(255,255,255,0.28)"; g.fillText(text, w / 2, h / 2 + size * 0.34); g.restore();
  }, [text]);
  return <Plane tex={tex} x={x} y={y} w={w * s} h={h * s} rot={rot} order={order} op={op} />;
}
