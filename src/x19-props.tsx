import { useEffect } from "react";
import * as THREE from "three";
import { Plane, useCanvasTexture } from "./sp-fx";
import { fit } from "./pen-ui";

// The writing of x19 "Screen Time" that is drawn in code (src/x19-draw.tsx and src/x19-scenes.tsx place it): MAX next to the volume bars, the 1% of the battery, SUGAR on the jar. Text is never painted
// into the art (scripts/x19-art-gen.py). A canvas texture is drawn once per state and laid on a plane (the shape of src/x18-props.tsx).
export function useUiTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, deps: unknown[]): THREE.CanvasTexture {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const FONT = "Arial, Helvetica, sans-serif";

/** a word in fat letters with an outline (`ink`, none when null) on a transparent plane of w x h, centred at (x, y) (panel px, y up); `sx`, `sy` squeeze it (a pop), `rot` degrees counter-clockwise */
export function WordTag({ text, w, h, fill, ink = null, lineW = 0.14, x, y, sx = 1, sy = 1, rot = 0, order, op = 1 }: { text: string; w: number; h: number; fill: string; ink?: string | null; lineW?: number; x: number; y: number; sx?: number; sy?: number; rot?: number; order: number; op?: number }) {
  const K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => {
    g.scale(K, K);
    const size = fit(g, text, w * 0.92, h * 0.86);
    g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
    const base = h / 2 + size * 0.35;
    if (ink) { g.lineWidth = size * lineW; g.strokeStyle = ink; g.strokeText(text, w / 2, base); }
    g.fillStyle = fill; g.fillText(text, w / 2, base);
  }, [text, w, h, fill, ink, lineW]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} sx={sx} sy={sy} order={order} op={op} />;
}
