import { useEffect } from "react";
import * as THREE from "three";
import { Inked, Poly, ellipsePts, roundRect } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Plane, useCanvasTexture, useImages } from "./sp-fx";
import { fit, rr, text, type G } from "./pen-ui";
import { hash } from "./sp-math";
import type { MouthShape } from "./x16-sched";

// The props of x16 "Hiring a Zoomer" that are drawn in code (src/x16-scenes.tsx places them): the LIVE screen of her phone with its badge, its count and its comment bar (shot 3: the whole frame is the screen), the phone that Mom joins, standing
// in the ring light (a black bezel round a glass with Mom's picture in it, her talking mouth, the MOM joined banner and the LIVE badge), the back of that phone with its camera, and the NOW HIRING lettering on the blank paper sign.
// Everything is a function of the frame.

// ── a texture that is thrown away when the next one replaces it (a screen has a new state nearly every frame; the GPU would fill up otherwise)
function useUiTexture(w: number, h: number, draw: (g: G) => void, deps: unknown[]): THREE.CanvasTexture {
  const tex = useCanvasTexture(w, h, draw, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}
const q = (x: number, n = 30) => Math.round(x * n);

// ═════════════════════════════════════════════════════ her live (shot 3): the whole frame is her phone's screen. This layer is what is over the picture of Ross on it: a black bezel with round corners, the red LIVE badge, "2,418 watching" in a dark
// pill, the comment bar at the bottom. Frame px, 1080 x 1920; the hearts that float up are src/x16-draw.tsx's
export const VIEWERS = "2,418";
export function drawLive(g: G) {
  const W = 1080, H = 1920;
  g.save();
  g.fillStyle = "#050609"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "destination-out"; rr(g, 16, 16, W - 32, H - 32, 78); g.fill(); g.globalCompositeOperation = "source-over";
  g.save(); rr(g, 16, 16, W - 32, H - 32, 78); g.clip();
  const bot = g.createLinearGradient(0, 1420, 0, H - 16); bot.addColorStop(0, "rgba(0,0,0,0)"); bot.addColorStop(1, "rgba(0,0,0,0.6)"); g.fillStyle = bot; g.fillRect(0, 1420, W, H - 1436);
  // the badge and the count: under the label, which is still big over the top of this shot
  const y = 660;
  rr(g, 56, y, 168, 76, 18); g.fillStyle = "#ec1c2e"; g.fill();
  text(g, "LIVE", 140, y + 54, 46, "#ffffff", { spacing: 2 });
  rr(g, 242, y, 470, 76, 18); g.fillStyle = "rgba(10,12,18,0.7)"; g.fill();
  g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.lineCap = "round";                                    // an eye
  g.beginPath(); g.moveTo(272, y + 38); g.quadraticCurveTo(302, y + 6, 332, y + 38); g.quadraticCurveTo(302, y + 70, 272, y + 38); g.stroke();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(302, y + 38, 9, 0, Math.PI * 2); g.fill();
  text(g, `${VIEWERS} watching`, 356, y + 52, 40, "#ffffff", { align: "left", weight: 800 });
  // the comment bar
  rr(g, 56, 1380, 840, 92, 46); g.fillStyle = "rgba(255,255,255,0.2)"; g.fill();
  text(g, "Add a comment...", 100, 1438, 38, "rgba(255,255,255,0.8)", { align: "left", weight: 700 });
  g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(980, 1426, 40, 0, Math.PI * 2); g.fill();   // the heart button
  g.fillStyle = "#ec1c2e"; g.save(); g.translate(980, 1430); g.scale(30, 30);
  g.beginPath(); g.moveTo(0, 0.9); g.bezierCurveTo(-1.4, -0.1, -1.1, -1.1, -0.45, -1.05); g.bezierCurveTo(-0.15, -1.03, 0, -0.8, 0, -0.62); g.bezierCurveTo(0, -0.8, 0.15, -1.03, 0.45, -1.05); g.bezierCurveTo(1.1, -1.1, 1.4, -0.1, 0, 0.9); g.fill();
  g.restore();
  g.restore(); g.restore();
}
export function LiveUi({ order }: { order: number }) {
  const tex = useUiTexture(1080, 1920, drawLive, []);
  return <Plane tex={tex} x={0} y={0} w={1080} h={1920} order={order} />;
}

// ═════════════════════════════════════════════════════ the phone that Mom joins (design 300 x 640 units: the glass): her picture fills the glass from its top, a talking mouth over her painted smirk, a dark top band with the red LIVE badge and
// a viewer count, the MOM joined banner that slides in from above. `pic` 0 = sunglasses on (mom-live), 1 = sunglasses lowered (mom-glasses); the pictures are the glass's height and cropped at the sides
export const DW = 300, DH = 640;
export type MomArt = { files: [string, string]; dims: { w: number; h: number; mouth: { cx: number; cy: number; w: number }; skin: string }[] };
export type MomScreen = { pic: 0 | 1; bob: number; mouth: MouthShape; banner: number; viewers: string };
const MOUTH_SHAPE: Record<MouthShape, [number, number]> = { closed: [0, 0], small: [0.62, 0.3], mid: [0.8, 0.5], wide: [0.95, 0.7], o: [0.42, 0.62], pucker: [0.5, 0.5] };   // width and height of her open mouth, in fractions of the painted lips' width
function drawMom(g: G, s: MomScreen, art: MomArt, imgs: CanvasImageSource[]) {
  g.save();
  g.fillStyle = "#cdbb94"; g.fillRect(0, 0, DW, DH);
  const A = art.dims[s.pic], k = DH / A.h, w = A.w * k, x0 = (DW - w) / 2, y0 = s.bob;
  g.drawImage(imgs[s.pic], x0, y0, w, A.h * k);
  const [ow, oh] = MOUTH_SHAPE[s.mouth];
  if (ow > 0) {   // the open mouth: a skin patch over the painted smirk, red lips, a dark inside
    const mx = x0 + A.mouth.cx * k, my = y0 + A.mouth.cy * k, mw = A.mouth.w * k;
    g.fillStyle = A.skin; g.beginPath(); g.ellipse(mx + mw * 0.08, my - mw * 0.1, mw * 0.82, mw * 0.5, 0, 0, Math.PI * 2); g.fill();   // (it also covers the painted smirk's curled corner, up and to the right of the lips)
    rr(g, mx - (mw * ow) / 2, my - (mw * oh) / 3, mw * ow, mw * oh * 0.78 + 3, Math.min(mw * ow, mw * oh) * 0.42); g.fillStyle = "#c4161c"; g.fill();
    rr(g, mx - (mw * ow) / 2 + 2.4, my - (mw * oh) / 3 + 2.4, mw * ow - 4.8, Math.max(2, mw * oh * 0.78 - 4.2), Math.min(mw * ow, mw * oh) * 0.36); g.fillStyle = "#2b0e0e"; g.fill();
  }
  const band = g.createLinearGradient(0, 0, 0, 120); band.addColorStop(0, "rgba(0,0,0,0.6)"); band.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = band; g.fillRect(0, 0, DW, 120);
  rr(g, 14, 16, 58, 26, 7); g.fillStyle = "#ec1c2e"; g.fill(); text(g, "LIVE", 43, 36, 17, "#ffffff", { spacing: 1 });
  rr(g, 80, 16, 92, 26, 7); g.fillStyle = "rgba(10,12,18,0.62)"; g.fill(); text(g, s.viewers, 126, 36, 16, "#ffffff", { weight: 800 });
  if (s.banner > 0.01) {   // MOM joined: slides in from above the glass
    const dy = -70 * (1 - s.banner);
    g.save(); g.globalAlpha = Math.min(1, s.banner * 2);
    rr(g, 40, 60 + dy, 220, 46, 23); g.fillStyle = "#ffffff"; g.fill();
    g.fillStyle = "#9b82c4"; g.beginPath(); g.arc(66, 83 + dy, 16, 0, Math.PI * 2); g.fill();
    text(g, "M", 66, 90 + dy, 20, "#ffffff");
    text(g, "MOM joined", 90, 91 + dy, 23, "#1b2230", { align: "left", weight: 900 });
    g.restore();
  }
  g.restore();
}
const BZ = 14, PW = DW + 2 * BZ, PH = DH + 2 * BZ;
const momKey = (s: MomScreen) => `${s.pic}:${q(s.bob, 6)}:${s.mouth}:${q(s.banner, 20)}:${s.viewers}`;
/** the phone standing on the ring light with Mom on its screen: (x, y) the middle of its base (panel px), `k` panel px per design unit, `rot` degrees about the base. The glass is at (BZ, BZ) of the bezel; `PHONE_BOX` is the whole phone in design units */
export const PHONE_BOX = { w: PW, h: PH };
export function PhoneMom({ x, y, k, s, art, order, rot = 0, sx = 1 }: { x: number; y: number; k: number; s: MomScreen; art: MomArt; order: number; rot?: number; sx?: number }) {
  const imgs = useImages(art.files).map((t) => t.image as CanvasImageSource);
  const tex = useUiTexture(PW * 2, PH * 2, (g) => {
    g.scale(2, 2);
    rr(g, 0, 0, PW, PH, 46); g.fillStyle = "#0b0d12"; g.fill();
    rr(g, 3, 3, PW - 6, PH - 6, 43); g.lineWidth = 2; g.strokeStyle = "#2b3140"; g.stroke();
    g.save(); g.translate(BZ, BZ); rr(g, 0, 0, DW, DH, 34); g.clip(); drawMom(g, s, art, imgs); g.restore();
    rr(g, PW / 2 - 48, BZ - 1, 96, 22, 11); g.fillStyle = "#0b0d12"; g.fill();
  }, [imgs, momKey(s)]);
  return <Group x={x} y={y} rot={rot} sx={sx} sy={1}><Plane tex={tex} x={0} y={(PH * k) / 2} w={PW * k} h={PH * k} order={order} /></Group>;
}

// ═════════════════════════════════════════════════════ the back of that phone (shot 2 and the first half of 13: its camera looks at Ross): a black rounded slab, a camera bump with two lenses; same size and place as PhoneMom
export function PhoneBack({ x, y, k, order, rot = 0, sx = 1 }: { x: number; y: number; k: number; order: number; rot?: number; sx?: number }) {
  const cy = PH * 0.84;
  return (
    <Group x={x} y={y} rot={rot} sx={k * sx} sy={k}>
      <Inked pts={roundRect(PW, PH, 46).map(([a, b]) => [a, b + PH / 2] as [number, number])} color="#15171d" ink="#05060a" w={2.4} order={order} />
      <Poly pts={roundRect(PW - 22, PH - 22, 38).map(([a, b]) => [a, b + PH / 2] as [number, number])} color="#1d2027" order={order + 0.1} />
      <Inked pts={roundRect(116, 124, 28).map(([a, b]) => [a - PW * 0.2, b + cy - 40] as [number, number])} color="#0b0c10" ink="#3a3f4b" w={2.4} order={order + 0.3} />
      {[0, 1].map((i) => (
        <Group key={i} x={-PW * 0.2} y={cy - 40 + (i ? -30 : 30)} sx={1} sy={1}>
          <Inked pts={ellipsePts(0, 0, 25, 25, 24)} color="#232833" ink="#4b5262" w={2.2} order={order + 0.5} />
          <Poly pts={ellipsePts(0, 0, 14, 14, 20)} color="#0a0d14" order={order + 0.6} />
          <Poly pts={ellipsePts(-5, 5, 4.4, 4.4, 10)} color="#5c7390" order={order + 0.7} />
        </Group>
      ))}
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the lettering on the blank paper sign: NOW HIRING in two rows of thick red marker letters, each a little crooked, with a thin dark line round it; the box (w x h) is the sign's face in frame
// px, (x, y) its middle in panel px, `rot` degrees. The letters are drawn once and the sign's own turn is the plane's
export function SignLetters({ x, y, w, h, rot = 0, order }: { x: number; y: number; w: number; h: number; rot?: number; order: number }) {
  const K = 2;
  const tex = useUiTexture(Math.round(w * K), Math.round(h * K), (g) => {
    g.scale(K, K);
    const rows = ["NOW", "HIRING"], pad = w * 0.08, avail = w - 2 * pad;
    const size = Math.min(h * 0.4, ...rows.map((r) => fit(g, r, avail, 400, { weight: 900 }))), gap = h * 0.04, total = rows.length * size * 0.74 + gap;
    rows.forEach((r, ri) => {
      g.font = `900 ${size}px Arial, Helvetica, sans-serif`; g.textBaseline = "alphabetic"; g.textAlign = "left";
      const adv = [...r].map((c) => g.measureText(c).width), tw = adv.reduce((a, b) => a + b, 0);
      let cx = (w - tw) / 2;
      const base = (h - total) / 2 + size * 0.74 + ri * (size * 0.74 + gap);
      [...r].forEach((c, ci) => {
        const j = hash(ci * 3.7 + ri * 11.3), rotL = (j - 0.5) * 0.12, dy = (hash(ci * 5.9 + ri * 2.3) - 0.5) * size * 0.05;
        g.save(); g.translate(cx + adv[ci] / 2, base + dy); g.rotate(rotL);
        g.lineJoin = "round"; g.lineWidth = size * 0.07; g.strokeStyle = "#5e0a0f"; g.strokeText(c, -adv[ci] / 2, 0);
        g.fillStyle = "#d4191f"; g.fillText(c, -adv[ci] / 2, 0);
        g.restore();
        cx += adv[ci];
      });
    });
  }, [w, h]);
  return <Plane tex={tex} x={x} y={y} w={w} h={h} rot={rot} order={order} />;
}

