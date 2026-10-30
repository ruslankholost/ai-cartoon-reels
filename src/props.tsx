import * as THREE from "three";
import { Fill, G, Pic, Stroke, ell, paint, rrect, shp, type Pt } from "./flat";

// Props shared by more than one set: the wall clock, sleeping Zs, a lit phone, a burst of light, 7-segment digits.

export const ZGlyph = shp("zglyph", () => [[-1, 1], [1, 1], [1, 0.62], [-0.2, -0.62], [1, -0.62], [1, -1], [-1, -1], [-1, -0.62], [0.2, 0.62], [-1, 0.62]]);
export function Z({ x, y, size, r = 0, fill = "#EAF6FF" }: { x: number; y: number; size: number; r?: number; fill?: string }) {
  const s = size / 2;
  return <Fill s={ZGlyph} fill={fill} ow={5.5} x={x} y={y} r={r} sx={s} sy={s} z={100} />;
}

// a star-shaped burst of light behind a lit screen
export const burst = (rx: number, ry: number, n = 14, k = 0.68) =>
  shp(`burst${rx},${ry},${n},${k}`, () => Array.from({ length: n * 2 }, (_, i) => {
    const a = (i * Math.PI) / n;
    const kk = i % 2 ? k : 1;
    return [Math.cos(a) * rx * kk, Math.sin(a) * ry * kk] as Pt;
  }));

// a wall clock; h and m may be fractional (m = 3.7 is just short of the "1" tick)
export function Clock({ x, y, h = 9, m = 4, r = 92, z = 8 }: { x: number; y: number; h?: number; m?: number; r?: number; z?: number }) {
  const k = r / 92;
  const hand = (deg: number, len: number, w: number) => {
    const a = (deg * Math.PI) / 180;
    return <Stroke pts={[[0, 0], [Math.sin(a) * len * k, Math.cos(a) * len * k]]} w={w * k} z={3} />;
  };
  return (
    <G x={x} y={y} z={z}>
      <Fill s={ell(r, r)} fill="#8A5A34" ow={5.5} />
      <Fill s={ell(r * 0.83, r * 0.83)} fill="#FFFFFF" ow={4} z={1} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <Stroke key={i} pts={[[Math.sin(a) * 60 * k, Math.cos(a) * 60 * k], [Math.sin(a) * 70 * k, Math.cos(a) * 70 * k]]} w={(i % 3 === 0 ? 7 : 4) * k} z={2} round={false} />;
      })}
      {hand((h % 12) * 30 + m * 0.5, 40, 9)}
      {hand(m * 6, 60, 6)}
      <Fill s={ell(8 * k, 8 * k, 14)} fill="#000" ow={0} z={4} />
    </G>
  );
}

// a phone showing a drawing; `glow` puts a burst of light behind it
export function Phone({ x, y, r = 0, w = 150, tex, z = 0, glow, glowColor = "#FFF1A6", glowOp = 0.8 }: { x: number; y: number; r?: number; w?: number; tex: THREE.Texture; z?: number; glow?: number; glowColor?: string; glowOp?: number }) {
  const h = w * 1.75;
  return (
    <G x={x} y={y} z={z}>
      {glow ? <Fill s={burst(glow, glow * 0.64)} fill={glowColor} ow={0} op={glowOp} z={-1} /> : null}
      <G r={r}>
        <Fill s={rrect(w, h, w * 0.16)} fill="#14141A" ow={5} />
        <Pic tex={tex} w={w - 18} h={h - 20} z={1} />
      </G>
    </G>
  );
}

// seven-segment digits, for the alarm clock
const SEG: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg" };
const SEGPOS: Record<string, [number, number, boolean]> = { a: [0, 27, true], g: [0, 0, true], d: [0, -27, true], f: [-15, 13.5, false], b: [15, 13.5, false], e: [-15, -13.5, false], c: [15, -13.5, false] };
export function Digit({ ch, x = 0, y = 0, on = "#FF5A36", off = "#3A171A" }: { ch: string; x?: number; y?: number; on?: string; off?: string }) {
  const lit = SEG[ch] ?? "";
  return (
    <G x={x} y={y}>
      {Object.entries(SEGPOS).map(([k, [sx, sy, hz]]) => (
        <Fill key={k} s={hz ? rrect(24, 7.5, 3.5) : rrect(7.5, 24, 3.5)} fill={lit.includes(k) ? on : off} ow={0} x={sx} y={sy} z={lit.includes(k) ? 0.2 : 0} />
      ))}
    </G>
  );
}
export function Colon({ x = 0, y = 0, on = "#FF5A36" }: { x?: number; y?: number; on?: string }) {
  return (
    <G x={x} y={y}>
      <Fill s={rrect(8, 8, 2)} fill={on} ow={0} y={11} />
      <Fill s={rrect(8, 8, 2)} fill={on} ow={0} y={-11} />
    </G>
  );
}

// a phone drawing helper: rounded rect path on a 2D canvas
export const roundRect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
};

// a flat heart, 2 units wide
export const HEART = shp("heart", () => Array.from({ length: 48 }, (_, i) => {
  const t = (i / 48) * Math.PI * 2;
  return [(16 * Math.sin(t) ** 3) / 16, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 + 0.05] as Pt;
}));

// the back of a phone (what we see when someone holds it up to read it); `goo` is dip from the bowl
export function PhoneBack({ x = 0, y = 0, s = 1, glow = true, goo = false, z = 2 }: { x?: number; y?: number; s?: number; glow?: boolean; goo?: boolean; z?: number }) {
  return (
    <G x={x} y={y} z={z} sx={s}>
      {glow && <Fill s={burst(124, 100, 12, 0.72)} fill="#CFE6FF" ow={0} op={0.7} z={-1} />}
      <Fill s={rrect(116, 204, 24)} fill="#2A2F3C" ow={5.5} />
      <Fill s={rrect(108, 196, 20)} fill="#343A4A" ow={0} z={0.2} />
      <Fill s={rrect(34, 34, 10)} fill="#12151C" ow={4} x={-28} y={72} z={0.4} />
      <Fill s={ell(8, 8, 12)} fill="#5B6B86" ow={0} x={-28} y={72} z={0.6} />
      <Stroke pts={[[56, 80], [56, -80]]} w={6} color="#BFE3FF" z={0.5} round={false} />
      {goo && (
        <G z={1}>
          <Fill s={ell(44, 30)} fill="#7FA83A" ow={0} x={-6} y={-30} r={-18} />
          <Fill s={ell(26, 18)} fill="#7FA83A" ow={0} x={30} y={10} r={24} />
          <Fill s={ell(12, 20)} fill="#7FA83A" ow={0} x={-30} y={-70} />
        </G>
      )}
    </G>
  );
}

// pajamas: light-blue stripes (Chad's sleeves and trousers)
let PJ: THREE.CanvasTexture | null = null;
export const pajamaTex = () => {
  if (!PJ) {
    PJ = paint("pajamas", 64, 64, (g) => {
      g.fillStyle = "#86B2E4";
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = "#EEF3FA";
      g.fillRect(28, 0, 8, 64);
    });
    PJ.wrapS = PJ.wrapT = THREE.RepeatWrapping;
    PJ.repeat.set(1 / 64, 1 / 64);
  }
  return PJ;
};
