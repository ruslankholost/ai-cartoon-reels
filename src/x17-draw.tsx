import { Inked, Poly, ellipsePts, ribbon, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { Cloud } from "./x08-fx";
import { hash, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { PX, PY } from "./x13-draw";
import { FPS, steamLevel } from "./x17-sched";

// The effects and props of x17 "Seat Swap" that are drawn in code (src/x17-scenes.tsx places them): the wind's streaks, the drops of sweat on the two big men, a peacock's feather for Ross's hair, the loose ends of his seatbelt, a flapping
// scarf, the attendant's and the bride's hands, the red handle of the exit and its door, and the steam out of Ross's ear holes. Flat shapes with the show's thin ink line. FRAME px (x right, y down, 1080 x 1920) in the pieces that say `frame`;
// panel px (y up, origin in the middle) elsewhere. Every piece is a closed-form function of the age it is given (hashed velocities and phases): nothing reads a clock or a random source. The shapes that move are drawn once, in unit size, and
// placed by a group's position, turn and scale, so that no frame makes a new geometry (src/x16-draw.tsx).
const W = 1080, H = 1920;
export const NAVY = "#1b2a55", CUFF = "#f4f1e8", SKIN = "#fed38d", SKIN_INK = "#7d4a1a";

// ═════════════════════════════════════════════════════ the wind's streaks: thin white lines flying across a box (frame px) in one direction, each on its own lane, with its own length, speed and phase; they wrap round the box
const STREAK: Pt[] = [[0, 0], [0.3, 0.55], [0.9, 0.4], [1, 0], [0.9, -0.4], [0.3, -0.55]];
export function WindStreaks({ t, box, n = 18, dir = -1, speed = 1800, len = [160, 520], thick = 5, order, op = 0.7, seed = 1, color = "#ffffff" }: { t: number; box: [number, number, number, number]; n?: number; dir?: 1 | -1; speed?: number; len?: [number, number]; thick?: number; order: number; op?: number; seed?: number; color?: string }) {
  const [x0, y0, x1, y1] = box, span = x1 - x0 + len[1];
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const h = (k: number) => hash(i * k + seed * 3.3), L = len[0] + (len[1] - len[0]) * h(7.7), v = speed * (0.65 + 0.7 * h(5.3)), lane = y0 + (y1 - y0) * ((i + h(3.1) * 0.8) / n), th = thick * (0.6 + 0.8 * h(9.1));
        const u = ((h(1.9) * span + v * t) % span) / span, x = dir < 0 ? x1 + L - u * span : x0 - L + u * span;   // dir -1: they fly toward the left
        return (
          <Group key={i} x={PX(dir < 0 ? x - L : x)} y={PY(lane)} sx={L} sy={th}>
            <Group x={0} y={0} sx={dir < 0 ? -1 : 1} sy={1}>
              <Poly pts={STREAK} color={color} order={order + i * 0.001} op={op * (0.55 + 0.45 * h(2.7))} />
            </Group>
          </Group>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ a drop of sweat: a teardrop (a round end down, its tip up), light blue with a thin darker line and a little shine; it forms on a temple, grows, slides down and drops off, over and over
const DROP: Pt[] = (() => {
  const a0 = (27 * Math.PI) / 180, a1 = ((153 - 360) * Math.PI) / 180, n = 16;
  return [[0, 2.2], ...Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [Math.cos(a), Math.sin(a)] as Pt; })];
})();
/** `at` the place the drops start (frame px), `k` the size of a drop's radius (px), `fall` how far they slide (px), `period` s one drop takes; `count` drops, each a different phase and a different lane (a hashed side step) */
export function Sweat({ t, at, k = 14, fall = 140, period = 1.1, count = 2, order, seed = 1 }: { t: number; at: [number, number]; k?: number; fall?: number; period?: number; count?: number; order: number; seed?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const ph = (t / period + i / count + hash(seed * 5.1 + i * 2.7)) % 1, cyc = Math.floor(t / period + i / count + hash(seed * 5.1 + i * 2.7)), side = (hash(cyc * 3.1 + i + seed) - 0.5) * 2;
        const grow = Math.min(1, ph / 0.25), slide = ph < 0.3 ? 0 : ((ph - 0.3) / 0.7) ** 2, fade = ph > 0.88 ? 1 - (ph - 0.88) / 0.12 : 1;
        const s = k * (0.55 + 0.45 * grow), x = at[0] + side * k * 2.2, y = at[1] + fall * slide;
        return (
          <Group key={i} x={PX(x)} y={PY(y)} sx={s} sy={s * (1 + 0.5 * slide)}>
            <Inked pts={DROP} color="#bfe8ff" ink="#3f8fc2" w={0.16} order={order} op={fade} />
            <Poly pts={ellipsePts(-0.32, -0.25, 0.2, 0.34, 10)} color="#ffffff" order={order + 0.6} op={0.9 * fade} />
          </Group>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ a peacock's tail feather (head px from the neck pivot, y up, for what is stuck in Ross's hair): a thin quill, a slender green oval of a vane with a ragged edge and, near its tip, the eye: gold ring, then blue, then a dark centre.
// (x, y) the quill's end, `rot` degrees counter-clockwise from straight up, `k` the feather's size (1: the vane is 116 px long). Inked puts the outline at `order` and the fill at +0.5, so a feather uses order .. order + 1.4
const VANE: Pt[] = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2, r = i % 2 ? 1.06 : 0.97; return [Math.sin(a) * 23 * r, 85 + Math.cos(a) * 58 * r] as Pt; });
export function Feather({ x, y, rot = 0, k = 1, order }: { x: number; y: number; rot?: number; k?: number; order: number }) {
  return (
    <Group x={x} y={y} rot={rot} sx={k} sy={k}>
      <Inked pts={VANE} color="#2e9a6b" ink="#14533a" w={1.5} order={order + 0.1} />
      <Poly pts={ribbon([[0, 0, 3], [0, 40, 2.5], [0, 92, 1.6]])} color="#7a6a30" order={order + 0.65} />
      <Inked pts={ellipsePts(0, 106, 13, 17.5, 22)} color="#d7b32e" ink="#6f5a10" w={1.3} order={order + 0.7} />
      <Poly pts={ellipsePts(0, 105, 9.4, 13, 20)} color="#1b79b0" order={order + 1.3} />
      <Poly pts={ellipsePts(0, 104, 4.8, 7.2, 16)} color="#0b2a44" order={order + 1.4} />
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the attendant's or the bride's hand (frame px): a peach mitten with a short fat thumb in a sleeve that comes in at an angle; (x, y) is the middle of the MITTEN (where it grips), `rot` degrees turns the
// whole thing about it, clockwise (0: the sleeve comes from below, the mitten points up; 90: from the left, pointing right), `k` scales it (1: the mitten is 120 px across), `len` the sleeve's length in px at k = 1. The sleeve ends in a cuff
export function Hand({ x, y, rot = 0, k = 1, sleeve = NAVY, cuff = CUFF, order, grip = 0, len = 520 }: { x: number; y: number; rot?: number; k?: number; sleeve?: string; cuff?: string; order: number; grip?: number; len?: number }) {
  return (
    <Group x={PX(x)} y={PY(y)} rot={-rot} sx={k} sy={k}>
      <Group x={0} y={-(52 - 8 * grip)}>
        <Inked pts={[[-70, -len], [70, -len], [54, -10], [-54, -10]]} color={sleeve} ink="#0b1230" w={3} order={order} />
        <Poly pts={ribbon([[-36, -len + 20, 16], [-28, -50, 13]])} color="#ffffff" order={order + 0.55} op={0.11} />
        <Inked pts={[[-62, -34], [62, -34], [66, 4], [-66, 4]]} color={cuff} ink="#5c5a50" w={3} order={order + 0.2} />
        <Inked pts={ellipsePts(0, 52 - 8 * grip, 56, 64 - 6 * grip, 28)} color={SKIN} ink={SKIN_INK} w={3} order={order + 0.4} />
        <Inked pts={ellipsePts(-50 + 12 * grip, 40 - 6 * grip, 24, 40, 20)} color={SKIN} ink={SKIN_INK} w={3} order={order + 0.6} />
        <Poly pts={ribbon([[-38 + 10 * grip, 62, 3], [-30 + 8 * grip, 14, 3]])} color={SKIN_INK} order={order + 0.7} op={0.7} />
      </Group>
    </Group>
  );
}

// ═════════════════════════════════════════════════════ the loose ends of a seatbelt (frame px): two grey straps with a metal buckle half each, whipped out at the first moment of `age` and swinging to rest, as a belt that has just let go
export function BeltEnds({ x, y, age, order }: { x: number; y: number; age: number; order: number }) {
  if (age < 0) return null;
  const a = Math.min(age, 2), swing = 60 * Math.exp(-a / 0.18) * Math.cos(a * 26);
  return (
    <>
      <Group x={PX(x - 20)} y={PY(y)} rot={-(26 + swing)}>
        <Inked pts={[[-19, 0], [19, 0], [19, -190], [-19, -190]]} color="#a3a8ae" ink="#4b4f55" w={2.6} order={order} />
        <Inked pts={[[-26, -190], [26, -190], [26, -236], [-26, -236]]} color="#d3d6da" ink="#4b4f55" w={2.6} order={order + 0.2} />
      </Group>
      <Group x={PX(x + 20)} y={PY(y)} rot={26 - swing}>
        <Inked pts={[[-19, 0], [19, 0], [19, -190], [-19, -190]]} color="#a3a8ae" ink="#4b4f55" w={2.6} order={order} />
        <Inked pts={[[-14, -190], [14, -190], [14, -228], [-14, -228]]} color="#d3d6da" ink="#4b4f55" w={2.6} order={order + 0.2} />
      </Group>
    </>
  );
}

// ═════════════════════════════════════════════════════ the attendant's scarf in the wind (frame px): two red-and-white striped tails from the knot, streaming to one side and rippling (on threes: a cartoon flutters); `dir` -1 streams to the left,
// `k` scales it, `amp` how hard it flaps
export function ScarfTails({ x, y, t, dir = -1, k = 1, amp = 1, order }: { x: number; y: number; t: number; dir?: -1 | 1; k?: number; amp?: number; order: number }) {
  const tq = Math.floor(t * 10) / 10;
  return (
    <>
      {[0, 1].map((j) => {
        const pl = (n: number, u0: number, u1: number) => Array.from({ length: n + 1 }, (_, i) => { const u = u0 + ((u1 - u0) * i) / n; return [dir * u * 150 * k, (j ? 1 : -1) * u * 24 * k + amp * Math.sin(tq * 22 + u * 6 + j * 2.1) * u * 26 * k, (15 + 14 * u) * k]; });
        return (
          <Group key={j} x={PX(x)} y={PY(y)}>
            <Inked pts={ribbon(pl(10, 0, 1))} color="#f4f1e8" ink="#7a1f26" w={2.2} order={order + j * 0.3} />
            {[0, 1, 2, 3, 4].map((s) => <Poly key={s} pts={ribbon(pl(3, 0.1 + 0.18 * s, 0.19 + 0.18 * s))} color="#d4191f" order={order + j * 0.3 + 0.6 + s * 0.01} />)}
          </Group>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the steam out of an ear hole: an ordinary kettle plume thrown out and up (the cloud kit of src/sp-fx.tsx, one batch of particles per tenth of a second, thick as the steam level of that moment)
const cloud = (s: Sprite) => ({ x: s.x - W / 2, y: H / 2 - s.y, r: s.r * 1.55, a: s.a });
export function plumeSprites(at: [number, number], dir: -1 | 1, t: number, k: number, seed: number, lvk = 1): Sprite[] {
  const out: Sprite[] = [];
  for (let b = Math.floor((t - 1.6) / 0.1); b <= Math.floor(t / 0.1); b++) {
    const tb = b * 0.1, lv = steamLevel(Math.round((tb + 0.05) * FPS)) * lvk;
    if (lv <= 0.01 || tb < 0) continue;
    const n = Math.floor(lv * 1.15 + hash(b * 3.7 + seed));
    if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + 0.1, stop: 1e9, seed: b * 7 + seed, emitters: [{ seg: [at[0], at[1], at[0] + dir * 8, at[1] - 6, 6], n, r: [(12 + 3 * lv) * k, (40 + 13 * lv) * k], rise: [300 * (0.7 + 0.3 * lv) * k, 640 * (0.7 + 0.3 * lv) * k], life: [0.8, 1.4], strength: 0.95, drift: 460 * k, burst: 2.2, dir, lobes: 4 }] };
    out.push(...steamSprites(cfg, t));
  }
  return out.map(cloud);
}
export function EarPlumes({ left, right, t, k, order, lvk = 1 }: { left: [number, number]; right: [number, number]; t: number; k: number; order: number; lvk?: number }) {
  const sp = [...plumeSprites(left, -1, t, k, 1, lvk), ...plumeSprites(right, 1, t, k, 2, lvk)];
  return sp.length ? <Cloud sprites={sp} order={order} /> : null;
}

