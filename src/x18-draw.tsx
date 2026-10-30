import React from "react";
import { Inked, Poly, ellipsePts, ribbon, roundRect, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { hash } from "./sp-fx";
import { pupilAt } from "./sp-eyes";
import { PX, PY } from "./x13-draw";
import { FPS } from "./x18-sched";

// The effects and props of x18 "Unattended" that are drawn in code (src/x18-scenes.tsx places them): the oat milk (the waterfall into the till, the stream out of the carton, the splash, the drops off the counter's edge), the coins and bills,
// the wet smear of a tongue on glass, a strip of tape, the small hands, the zap's bolts, the clock's ghost hands. Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`; panel px (y up,
// origin in the middle) elsewhere. Every piece is a closed-form function of the age it is given (hashed velocities and phases): nothing reads a clock or a random source. The shapes that move are drawn once, in unit size, and placed by a group's
// position, turn and scale, so that no frame makes a new geometry (the shapes that change with the frame, a smear or a bolt, take a few quantised states: the geometry cache holds each).
export const MILK = { fill: "#f8f1df", ink: "#7a6a4a", shade: "#e3d6b5", shine: "#ffffff" };
const UNIT = ellipsePts(0, 0, 1, 1, 28);
const D2R = Math.PI / 180;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (u: number) => { const c = clamp01(u); return c * c * (3 - 2 * c); };

// ═════════════════════════════════════════════════════ the oat milk stream: a chain of blobs along a curve (a quadratic Bezier from the spout `a` through `b` to the landing `c`, frame px), thickest at the top; the swell of a glug runs down it.
// `reach` 0..1 how far down the curve the stream has got (its front), `w` the stream's width at the spout (px), `t` seconds. The blobs overlap so that the chain is one lumpy stream; an outline copy first, a fill, a thin shine along its left side
export function MilkStream({ a, b, c, w, t, reach = 1, order, op = 1, n = 18 }: { a: [number, number]; b: [number, number]; c: [number, number]; w: number; t: number; reach?: number; order: number; op?: number; n?: number }) {
  if (reach <= 0.01) return null;
  const bez = (u: number): [number, number] => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
  const tan = (u: number): number => { const dx = 2 * (1 - u) * (b[0] - a[0]) + 2 * u * (c[0] - b[0]), dy = 2 * (1 - u) * (b[1] - a[1]) + 2 * u * (c[1] - b[1]); return Math.atan2(dy, dx) / D2R; };
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]) * 1.05;
  const items = Array.from({ length: n }, (_, i) => {
    const u = ((i + 0.5) / n) * reach, p = bez(u), swell = 0.82 + 0.2 * Math.sin(Math.PI * 2 * (u * 3.2 - t * 2.6) + i * 0.7), wd = w * swell * (1 - 0.22 * u), hh = (len / n) * 1.9 * reach + 14;
    return { p, ang: tan(u) - 90, wd: Math.round(wd / 3) * 3, hh: Math.round(hh / 4) * 4 };
  });
  return (
    <>
      {items.map((s, i) => <Group key={`o${i}`} x={PX(s.p[0])} y={PY(s.p[1])} rot={-s.ang} sx={s.wd / 2 + 4} sy={s.hh / 2 + 4}><Poly pts={UNIT} color={MILK.ink} order={order + i * 0.001} op={op} /></Group>)}
      {items.map((s, i) => <Group key={`f${i}`} x={PX(s.p[0])} y={PY(s.p[1])} rot={-s.ang} sx={s.wd / 2} sy={s.hh / 2}><Poly pts={UNIT} color={MILK.fill} order={order + 0.5 + i * 0.001} op={op} /></Group>)}
      {items.map((s, i) => <Group key={`s${i}`} x={PX(s.p[0])} y={PY(s.p[1])} rot={-s.ang}><Group x={-s.wd * 0.2} y={0} sx={s.wd * 0.07 + 1} sy={s.hh * 0.4}><Poly pts={UNIT} color={MILK.shine} order={order + 0.7 + i * 0.001} op={0.9 * op} /></Group></Group>)}
    </>
  );
}

// ═════════════════════════════════════════════════════ a drop of oat milk: a teardrop (a round end down, its tip up), cream with a thin brown line and a shine; it forms on an edge, grows, slides, drops and is gone, over and over. `at` the place
// the drops start (frame px, on the edge), `k` the size of a drop's radius (px), `fall` how far they drop (px), `period` s one drop takes, `count` drops each with a phase and a side step of its own
const DROP: Pt[] = (() => {
  const a0 = (27 * Math.PI) / 180, a1 = ((153 - 360) * Math.PI) / 180, n = 16;
  return [[0, 2.2], ...Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [Math.cos(a), Math.sin(a)] as Pt; })];
})();
export function MilkDrop({ x, y, s, stretch = 1, order, op = 1 }: { x: number; y: number; s: number; stretch?: number; order: number; op?: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} sx={s} sy={s * stretch}>
      <Inked pts={DROP} color={MILK.fill} ink={MILK.ink} w={0.18} order={order} op={op} />
      <Poly pts={ellipsePts(-0.32, -0.25, 0.2, 0.34, 10)} color="#ffffff" order={order + 0.6} op={0.95 * op} />
    </Group>
  );
}
export function MilkDrips({ t, at, k = 16, fall = 260, period = 1.15, count = 3, spread = 90, order, seed = 1, fallAt }: { t: number; at: [number, number]; k?: number; fall?: number; period?: number; count?: number; spread?: number; order: number; seed?: number; fallAt?: number[] }) {
  // `fallAt`: the time (s, on the same clock as `t`) at which drop i lets go for the first time (its phase is set so that it does; the drop hangs and swells for the 0.34 of a period before it): the picture's hit is then on the sound's
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const ph0 = fallAt ? (t - (fallAt[i] - 0.34 * period)) / period : t / period + i / count + hash(seed * 5.1 + i * 2.7), ph = ((ph0 % 1) + 1) % 1, ok = fallAt ? t > fallAt[i] - 0.34 * period : t > 0;
        const grow = Math.min(1, ph / 0.3), slide = ph < 0.34 ? 0 : ((ph - 0.34) / 0.66) ** 2, fade = ph > 0.92 ? 1 - (ph - 0.92) / 0.08 : 1;
        const x = at[0] + ((i + 0.5) / count - 0.5) * spread * 2 + (hash(seed + i * 3.3) - 0.5) * spread * 0.3, y = at[1] + fall * slide, s = k * (0.5 + 0.5 * grow);
        return ok ? <MilkDrop key={i} x={x} y={y} s={s} stretch={1 + 0.7 * slide} order={order + i * 0.01} op={fade} /> : null;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ a puddle of oat milk on a flat top: a union of lumpy ellipses (cream, one brown line round the whole), a shade under its middle and a shine; (x, y) its middle (frame px), `w` x `h` its size.
// `lobes` are hanging bulges over an edge below it: [x offset, y offset, rx, ry] (they sag over the counter's edge; the drips start there)
export function MilkPuddle({ x, y, w, h, order, seed = 1, lobes = [] }: { x: number; y: number; w: number; h: number; order: number; seed?: number; lobes?: [number, number, number, number][] }) {
  const n = 9, blobs: { cx: number; cy: number; rx: number; ry: number }[] = Array.from({ length: n }, (_, i) => {
    const u = (i + 0.5) / n - 0.5, hh = (q: number) => hash(i * q + seed * 3.7);
    return { cx: x + u * w * 0.86, cy: y + (hh(2.1) - 0.5) * h * 0.34, rx: w * (0.15 + 0.07 * hh(3.3)), ry: h * (0.36 + 0.14 * hh(4.9)) * (1 - 0.5 * Math.abs(u)) };
  });
  lobes.forEach(([ox, oy, rx, ry]) => blobs.push({ cx: x + ox, cy: y + oy, rx, ry }));
  return (
    <>
      {blobs.map((b, i) => <Group key={`o${i}`} x={PX(b.cx)} y={PY(b.cy)} sx={b.rx + 5} sy={b.ry + 5}><Poly pts={UNIT} color={MILK.ink} order={order} /></Group>)}
      {blobs.map((b, i) => <Group key={`f${i}`} x={PX(b.cx)} y={PY(b.cy)} sx={b.rx} sy={b.ry}><Poly pts={UNIT} color={MILK.fill} order={order + 0.1} /></Group>)}
      <Group x={PX(x + w * 0.04)} y={PY(y + h * 0.12)} sx={w * 0.36} sy={h * 0.2}><Poly pts={UNIT} color={MILK.shade} order={order + 0.2} op={0.8} /></Group>
      <Group x={PX(x - w * 0.18)} y={PY(y - h * 0.18)} sx={w * 0.14} sy={h * 0.06} rot={4}><Poly pts={UNIT} color={MILK.shine} order={order + 0.3} op={0.95} /></Group>
    </>
  );
}

// ═════════════════════════════════════════════════════ the splash where a stream lands (frame px): drops thrown up out of the pool and falling back, each on its own phase (a closed form of the time), and the pool itself: a cream ellipse
// that grows from the landing (`pool` 0..1) with a lighter ring. `R` the splash's reach (px)
export function MilkSplash({ at, t, t0 = 0, R = 160, pool = 1, order, n = 22, rate = 1.7 }: { at: [number, number]; t: number; t0?: number; R?: number; pool?: number; order: number; n?: number; rate?: number }) {
  const age = t - t0;
  if (age < 0) return null;
  const pr = R * 1.5 * smooth(age / 0.5) * pool, cy = at[1] + 20;
  // the pool: a cloud of blobs round the rim of an ellipse and one big ellipse in the middle, a shade, two ripples that spread
  const rim = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2, h = (q: number) => hash(i * q + 2.2), r = 0.86 + 0.16 * h(3.1); return { x: at[0] + Math.cos(a) * pr * r * 0.9, y: cy + Math.sin(a) * pr * 0.5 * r * 0.9, rx: pr * 0.2 * (0.8 + 0.5 * h(5.3)), ry: pr * 0.14 * (0.8 + 0.6 * h(7.7)) }; });
  const ring = (k: number) => { const u = ((age * 1.4 + k * 0.5) % 1), rr = pr * (0.25 + 0.6 * u); return { rr, op: 0.7 * (1 - u) }; };
  return (
    <>
      {pool > 0.01 && pr > 4 && (
        <>
          {rim.map((b, i) => <Group key={`o${i}`} x={PX(b.x)} y={PY(b.y)} sx={b.rx + 5} sy={b.ry + 5}><Poly pts={UNIT} color={MILK.ink} order={order} /></Group>)}
          <Group x={PX(at[0])} y={PY(cy)} sx={pr * 0.94 + 5} sy={pr * 0.5 * 0.94 + 5}><Poly pts={UNIT} color={MILK.ink} order={order} /></Group>
          {rim.map((b, i) => <Group key={`f${i}`} x={PX(b.x)} y={PY(b.y)} sx={b.rx} sy={b.ry}><Poly pts={UNIT} color={MILK.fill} order={order + 0.1} /></Group>)}
          <Group x={PX(at[0])} y={PY(cy)} sx={pr * 0.94} sy={pr * 0.5 * 0.94}><Poly pts={UNIT} color={MILK.fill} order={order + 0.1} /></Group>
          <Group x={PX(at[0])} y={PY(cy + 8)} sx={pr * 0.7} sy={pr * 0.3}><Poly pts={UNIT} color={MILK.shade} order={order + 0.2} op={0.7} /></Group>
          {[0, 1].map((k) => { const g = ring(k); return <Group key={`r${k}`} x={PX(at[0])} y={PY(cy + 6)} sx={g.rr} sy={g.rr * 0.5}><Poly pts={ribbon(ellipsePts(0, 0, 1, 1, 36).map(([x, y]) => [x, y, 0.05] as number[]))} color={MILK.ink} order={order + 0.3} op={g.op} /></Group>; })}
        </>
      )}
      {Array.from({ length: n }, (_, i) => {
        const h = (q: number) => hash(i * q + 4.2), period = 0.5 + 0.35 * h(2.3), ph = ((age * rate) / period + h(5.1) * 3) % 1, ang = (-90 + (h(7.7) - 0.5) * 120) * D2R, v = R * (1.5 + 1.4 * h(3.9));
        const T = ph * period, g = 4.2 * R, x = at[0] + Math.cos(ang) * v * T * 0.8, y = at[1] + Math.sin(ang) * v * T + 0.5 * g * T * T, s = (8 + 14 * h(9.1)) * (R / 160);
        if (ph < 0.02) return null;
        return <Group key={i} x={PX(x)} y={PY(y)} sx={s} sy={s}><Poly pts={UNIT} color={MILK.ink} order={order + 0.3 + i * 0.001} /><Group x={0} y={0} sx={0.78} sy={0.78}><Poly pts={UNIT} color={MILK.fill} order={order + 0.4 + i * 0.001} /></Group></Group>;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ money: a coin (gold, seen flat; `spin` 0..1 turns it about its vertical axis) and a bill (green with a lighter inner rectangle, a round seal and corner marks), both with the thin ink line
const COIN_IN = ellipsePts(0, 0, 0.74, 0.74, 20);
export function Coin({ x, y, r, spin = 0, rot = 0, order, op = 1 }: { x: number; y: number; r: number; spin?: number; rot?: number; order: number; op?: number }) {
  const sx = Math.max(0.12, Math.abs(Math.cos(spin * Math.PI * 2)));
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={r * sx} sy={r}>
      <Poly pts={UNIT} color="#5a4310" order={order} op={op} />
      <Group x={0} y={0} sx={0.92} sy={0.92}><Poly pts={UNIT} color="#e8b92c" order={order + 0.1} op={op} /></Group>
      <Poly pts={COIN_IN} color="#c99a1b" order={order + 0.2} op={op} />
      <Group x={0} y={0} sx={0.62} sy={0.62}><Poly pts={UNIT} color="#f4cf55" order={order + 0.3} op={op} /></Group>
      <Group x={-0.34} y={0.38} sx={0.16} sy={0.26} rot={30}><Poly pts={UNIT} color="#fff6c8" order={order + 0.4} op={0.9 * op} /></Group>
    </Group>
  );
}
const BILL = roundRect(2.4, 1, 0.1, 5);
export function Bill({ x, y, h, rot = 0, flip = 1, order, op = 1 }: { x: number; y: number; h: number; rot?: number; flip?: number; order: number; op?: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={h * flip} sy={h}>
      <Group x={0} y={0} sx={1.04} sy={1.08}><Poly pts={BILL} color="#1d3a1e" order={order} op={op} /></Group>
      <Poly pts={BILL} color="#6ab36a" order={order + 0.1} op={op} />
      <Group x={0} y={0} sx={0.86} sy={0.72}><Poly pts={BILL} color="#a6d8a2" order={order + 0.2} op={op} /></Group>
      <Group x={0} y={0} sx={0.3} sy={0.3}><Poly pts={UNIT} color="#3e8a45" order={order + 0.3} op={op} /></Group>
      {[-1, 1].map((sx) => [-1, 1].map((sy) => <Group key={`${sx}${sy}`} x={sx * 0.9} y={sy * 0.28} sx={0.07} sy={0.07}><Poly pts={UNIT} color="#3e8a45" order={order + 0.3} op={op} /></Group>))}
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the wet smear of a tongue on glass: a translucent white band along `path` (frame px) up to `progress` (0..1, quantised to 1/24), `w` its width, a brighter core and a thin shine on it
export function Smear({ path, progress, w, order, op = 0.55 }: { path: [number, number][]; progress: number; w: number; order: number; op?: number }) {
  const q = Math.round(clamp01(progress) * 24) / 24;
  if (q <= 0) return null;
  const pts = (() => {
    const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1])), total = seg.reduce((s, v) => s + v, 0), goal = total * q, out: [number, number][] = [path[0]];
    let acc = 0;
    for (let i = 0; i < seg.length && acc < goal; i++) { const take = Math.min(seg[i], goal - acc), u = seg[i] > 0 ? take / seg[i] : 0; out.push([path[i][0] + (path[i + 1][0] - path[i][0]) * u, path[i][1] + (path[i + 1][1] - path[i][1]) * u]); acc += take; }
    return out;
  })();
  if (pts.length < 2) return null;
  // one ribbon for each stretch between two turns of the path (a ribbon round a sharp turn throws a long spike)
  return (
    <>
      {pts.slice(1).map((p, i) => {
        const q = pts[i];
        return (
          <React.Fragment key={i}>
            <Poly pts={ribbon([[PX(q[0]), PY(q[1]), w], [PX(p[0]), PY(p[1]), w]])} color="#ffffff" order={order} op={op} />
            <Poly pts={ribbon([[PX(q[0]) - w * 0.12, PY(q[1]), w * 0.55], [PX(p[0]) - w * 0.12, PY(p[1]), w * 0.55]])} color="#ffffff" order={order + 0.1} op={Math.min(1, op * 1.1)} />
            <Poly pts={ribbon([[PX(q[0]) - w * 0.3, PY(q[1]), w * 0.08], [PX(p[0]) - w * 0.3, PY(p[1]), w * 0.08]])} color="#dcefff" order={order + 0.2} op={0.9} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ a strip of tape: a pale translucent band with a shine and a notched end, (x, y) its middle (frame px), `w` x `h`, turned `rot` degrees clockwise
const TAPE = (): Pt[] => [[-0.5, 0.5], [0.5, 0.5], [0.46, 0.25], [0.5, 0], [0.46, -0.25], [0.5, -0.5], [-0.5, -0.5], [-0.46, -0.25], [-0.5, 0], [-0.46, 0.25]];
const TAPE_PTS = TAPE();
export function Tape({ x, y, w, h, rot = 0, order, op = 0.82 }: { x: number; y: number; w: number; h: number; rot?: number; order: number; op?: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={w} sy={h}>
      <Poly pts={TAPE_PTS} color="#efe3b0" order={order} op={op} />
      <Group x={0} y={0.12} sx={0.9} sy={0.22}><Poly pts={roundRect(1, 1, 0.3, 4)} color="#ffffff" order={order + 0.1} op={0.55} /></Group>
    </Group>
  );
}

// ═════════════════════════════════════════════════════ a kid's hand: a mitten in a sleeve (the shape of src/x17-draw.tsx Hand, short and fat), the sleeve coming from below; (x, y) the middle of the mitten, `k` the size (1: the mitten is 120 px across)
const SKIN = "#fed38d", SKIN_INK = "#7d4a1a";
export function KidHand({ x, y, rot = 0, k = 0.5, sleeve, cuff = "#f4f1e8", order, len = 420 }: { x: number; y: number; rot?: number; k?: number; sleeve: string; cuff?: string; order: number; len?: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={k} sy={k}>
      <Group x={0} y={-52}>
        <Inked pts={[[-70, -len], [70, -len], [58, -10], [-58, -10]]} color={sleeve} ink="#1c1c24" w={4} order={order} />
        <Inked pts={[[-66, -38], [66, -38], [70, 6], [-70, 6]]} color={cuff} ink="#5c5a50" w={4} order={order + 0.2} />
        <Inked pts={roundRect(110, 112, 40, 6).map(([a, b]) => [a, b + 58] as Pt)} color={SKIN} ink={SKIN_INK} w={4} order={order + 0.4} />
        <Inked pts={ellipsePts(-62, 56, 24, 44, 20)} color={SKIN} ink={SKIN_INK} w={4} order={order + 0.6} />
        {[-30, 0, 30].map((fx, i) => <Poly key={i} pts={ribbon([[fx, 114, 3], [fx, 84, 3]])} color={SKIN_INK} order={order + 0.7} op={0.75} />)}
      </Group>
    </Group>
  );
}

// ═════════════════════════════════════════════════════ a bolt of the zap: a jagged line (white with a yellow edge) from (x, y) outward `len` px at `rot` degrees (clockwise from straight up); `seed` changes its zigzag (four of them), so a bolt that
// flickers on twos has four geometries
export function Bolt({ x, y, len, rot, seed = 0, order, op = 1 }: { x: number; y: number; len: number; rot: number; seed?: number; order: number; op?: number }) {
  const s = Math.floor(seed) % 4, pts: [number, number, number][] = Array.from({ length: 7 }, (_, i) => { const u = i / 6; return [(hash(i * 3.7 + s * 5.3) - 0.5) * 0.28 * (i > 0 && i < 6 ? 1 : 0), -u, 0.1 * (1 - 0.7 * u) + 0.01] as [number, number, number]; });
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={len} sy={len}>
      <Poly pts={ribbon(pts.map(([a, b, c]) => [a, b, c * 1.9]))} color="#f2c81d" order={order} op={op} />
      <Poly pts={ribbon(pts)} color="#ffffff" order={order + 0.1} op={op} />
    </Group>
  );
}

// ═════════════════════════════════════════════════════ a brow drawn in code (the mom has none painted: one brow up for "Do you have kids?", a smug pair): a thick curved band, thinner at the ends, (x, y) its middle in the coordinates of the group it
// is drawn in (x right, y UP, as a Flat's children), `w` its length, `th` its thickness, `rot` degrees counter-clockwise, `arch` how high its middle is over its ends (px, quantised to whole px)
export function Brow({ x, y, w, th, rot = 0, arch = 8, color = "#7a5a1e", order }: { x: number; y: number; w: number; th: number; rot?: number; arch?: number; color?: string; order: number }) {
  const a = Math.round(arch), pts: number[][] = [[-w / 2, 0, th * 0.45], [-w / 4, a * 0.85, th * 0.9], [0, a, th], [w / 4, a * 0.85, th * 0.9], [w / 2, 0, th * 0.45]];
  return <Group x={x} y={y} rot={rot}><Poly pts={ribbon(pts)} color={color} order={order} /></Group>;
}

// ═════════════════════════════════════════════════════ pupils drawn in code over a painted face (the mom's dart, the toddler's buzz): each painted pupil is covered with a disc of the eye's white, a dot goes where the gaze says (kept inside the eye by src/sp-eyes.ts pupilAt).
// All in picture px, drawn in the children of a Flat (y up) about the picture point (apx, apy); `eyes` and `pupils` are the rig's (scripts/x18-prep.py), `gaze` -1..1 (x right, y down), `pr` the dot's radius (the painted one's by default)
export function LookPupils({ apx, apy, eyes, pupils, gaze, pr, white, ink = "#0a0a0a", order, margin = 4 }: { apx: number; apy: number; eyes: { cx: number; cy: number; rx: number; ry: number }[]; pupils: number[][]; gaze: [number, number]; pr?: number; white: string; ink?: string; order: number; margin?: number }) {
  const K = (px: number, py: number): [number, number] => [px - apx, apy - py];
  return (
    <>
      {eyes.map((e, i) => {
        const q = pupils[Math.min(i, pupils.length - 1)] ?? [e.cx, e.cy, 8], r = pr ?? q[2], home = K(q[0], q[1]);
        const [nx, ny] = pupilAt(e, [q[0], q[1]], r, gaze, margin), to = K(nx, ny);
        return (
          <React.Fragment key={i}>
            <Poly pts={ellipsePts(home[0], home[1], q[2] + 3.2, q[2] + 3.2, 20)} color={white} order={order} />
            <Poly pts={ellipsePts(to[0], to[1], r, r, 20)} color={ink} order={order + 0.1} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the stand-in for art that is not painted yet: a coloured rounded block with a head on it and its name, so that the shot can be timed, captioned and framed before the picture comes
export function PhBlock({ x, y, w, h, color = "#b8c4d4", head = true, order, rot = 0, op = 1 }: { x: number; y: number; w: number; h: number; color?: string; head?: boolean; order: number; rot?: number; op?: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot}>
      <Poly pts={roundRect(w + 8, h + 8, 36, 6)} color="#222a36" order={order} op={op} />
      <Poly pts={roundRect(w, h, 32, 6)} color={color} order={order + 0.1} op={op} />
      {head && <Group x={0} y={h / 2 + w * 0.22} sx={w * 0.28} sy={w * 0.28}><Poly pts={UNIT} color="#222a36" order={order} op={op} /><Group x={0} y={0} sx={0.93} sy={0.93}><Poly pts={UNIT} color="#f1d2a8" order={order + 0.1} op={op} /></Group></Group>}
    </Group>
  );
}
export { FPS };
