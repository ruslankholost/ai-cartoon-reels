import { ChadHead, Linda, type LindaProps } from "./chars";
import { Fill, G, Pic, Stroke, Txt, bezier, ell, paint, poly, rnd, rpoly, rrect, shp, taperPts, type Pt } from "./flat";
import { Clock, HEART, burst } from "./props";
import { Van } from "./street";

// Linda basement. A cross-section: the back wall with the stairs in profile at the left, the door at the top of the
// stairs letting in warm light, the burst pipe spraying down into the water. Linda floats on a pink flamingo, looking at
// her phone (we see its back; its screen light is on her face). The same set drains, dries and, on Monday, has new
// pipes, a photo of Chad with a heart on the wall and the van outside the window. Perspective is drawn in; light is flat zones.
const R = rrect;
const WATER = "#2B78AB", WATER_L = "#6FB8E0", WATER_D = "#276FA0";
const WARM = "#FFC474";
export const WL = -130; // the water line on the back wall, flooded
const FLOOR = -330; // where the back wall meets the floor
export const RING_FLOOD = -220;
export const RING_FLOOR = -392; // the ring sits here once the water is gone
export const LINDA_X = -10;

const waveShp = (y0: number, amp: number, wl: number, ph: number) =>
  shp(`wave${y0},${amp},${wl},${ph}`, () => {
    const pts: Pt[] = [];
    for (let x = -600; x <= 600; x += 20) pts.push([x, y0 + amp * Math.sin((x / wl) * 2 * Math.PI + ph) + amp * 0.4 * Math.sin((x / (wl * 0.45)) * 2 * Math.PI + ph * 1.7)]);
    pts.push([600, -1100], [-600, -1100]);
    return pts;
  });
// water laid over the foot of a floating thing, so it sits in the water instead of on it
function Cover({ x, y, w, h = 56, z, ph = 0 }: { x: number; y: number; w: number; h?: number; z: number; ph?: number }) {
  const n = Math.round(w / 14);
  const top: Pt[] = Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [-w / 2 + w * u, 6 * Math.sin(u * 9 + ph)] as Pt; });
  const S = shp(`cover${w},${h},${ph}`, () => [...top, [w / 2, -h], [-w / 2, -h]]);
  return (
    <G x={x} y={y} z={z}>
      <Fill s={S} fill={WATER} ow={0} />
      <Stroke pts={top} w={5} color="#CDE9F7" z={0.5} />
    </G>
  );
}

function blocks() {
  return paint("basement-blocks", 1100, 1000, (g) => {
    g.fillStyle = "#3A4658";
    g.fillRect(0, 0, 1100, 1000);
    let n = 0;
    for (let r = 0; r < 11; r++) {
      const off = (r % 2) * 110;
      for (let c = -1; c < 6; c++) {
        const v = rnd(n++);
        g.fillStyle = v < 0.3 ? "#3F4C60" : v < 0.55 ? "#364254" : "#3A4658";
        g.fillRect(c * 220 + off, r * 96, 220, 96);
      }
    }
    g.fillStyle = "#2B3546";
    for (let r = 0; r <= 11; r++) g.fillRect(0, r * 96 - 2, 1100, 5);
    for (let r = 0; r < 11; r++) {
      const off = (r % 2) * 110;
      for (let c = -1; c < 6; c++) g.fillRect(c * 220 + off - 2, r * 96, 5, 96);
    }
  });
}

function Stairs() {
  const N = 6;
  const steps = Array.from({ length: N }, (_, i) => ({ top: WL + 75 * (i + 1), right: -230 - 52 * i }));
  return (
    <G z={4}>
      {steps.slice().reverse().map((s, k) => {
        const i = N - 1 - k;
        const w = s.right + 580, h = s.top + 330;
        return (
          <G key={i} z={k * 0.6}>
            <Fill s={R(w, h, 0)} fill="#7E5A38" ow={5.5} x={s.right - w / 2} y={s.top - h / 2} />
            <Fill s={R(Math.min(w, 70), 16, 0)} fill="#9A7248" ow={0} x={s.right - Math.min(w, 70) / 2} y={s.top - 8} z={0.2} />
          </G>
        );
      })}
      {/* the handrail */}
      <Stroke pts={[[-232, WL + 75 + 120], [-492, WL + 75 * 6 + 120]]} w={13} color="#5E4430" ow={5.5} z={8} />
      {[0, 2, 4].map((i) => <Stroke key={i} pts={[[steps[i].right, steps[i].top], [steps[i].right, steps[i].top + 120]]} w={9} color="#5E4430" ow={5.5} round={false} z={7.5} />)}
    </G>
  );
}

// the door at the top of the stairs, open, with the upstairs light behind it
function Door() {
  return (
    <G z={3}>
      <Fill s={R(150, 400, 0)} fill="#FFD98A" ow={5.5} x={-480} y={560} />
      <Fill s={poly("doorleaf", [[-555, 760], [-515, 740], [-515, 370], [-555, 390]])} fill="#5A4430" ow={5.5} z={1} />
    </G>
  );
}

// the pipe along the ceiling: burst and spraying (`spray` grows the jets from 0 to 1), or mended with a clamp
const spikes = (w: number, h: number, n: number) => shp(`crown${w},${h},${n}`, () => {
  const p: Pt[] = [];
  for (let i = 0; i <= n * 2; i++) p.push([-w / 2 + (w * i) / (n * 2), i % 2 ? h * (0.6 + 0.4 * rnd(i, 3)) : 4]);
  p.push([w / 2, -12], [-w / 2, -12]);
  return p;
});
export const TEAR: Pt = [250, 668];
function Pipe({ spray, fixed }: { spray: number; fixed: boolean }) {
  const jets: { p: Pt[]; w0: number; w1: number }[] = [
    { p: [[250, 660], [350, 540], [410, 220], [392, -150]], w0: 54, w1: 24 },
    { p: [[250, 660], [286, 500], [300, 160], [286, -150]], w0: 50, w1: 22 },
    { p: [[250, 660], [226, 520], [206, 190], [196, -150]], w0: 46, w1: 20 },
    { p: [[250, 660], [190, 620], [130, 540], [100, 430]], w0: 26, w1: 10 },
  ];
  const drops: [number, number, number][] = [[352, 600, 10], [398, 470, 13], [436, 330, 9], [338, 300, 11], [214, 520, 10], [150, 420, 12], [120, 330, 9], [350, 130, 10], [248, 260, 8], [110, 520, 9], [372, 40, 11], [232, 30, 9]];
  const burst_ = spray > 0 && !fixed;
  return (
    <>
      <G z={15}>
        <Stroke pts={[[-600, 690], [600, 690]]} w={46} color={fixed ? "#C9803F" : "#B8713A"} ow={5.5} round={false} />
        <Stroke pts={[[-600, 704], [600, 704]]} w={fixed ? 14 : 9} color={fixed ? "#F1B97C" : "#DB9C60"} round={false} z={0.3} />
        {[-380, 470].map((cx) => <Fill key={cx} s={R(32, 74, 6)} fill="#48505E" ow={5.5} x={cx} y={690} z={1} />)}
        {fixed ? (
          <>
            <Fill s={R(120, 76, 14)} fill="#C9D2DC" ow={5.5} x={250} y={690} z={1} />
            <Fill s={R(120, 18, 0)} fill="#EEF3F8" ow={0} x={250} y={706} z={1.2} />
            {[-40, 40].map((bx) => <Fill key={bx} s={ell(9, 9, 12)} fill="#8A95A3" ow={4} x={250 + bx} y={690} z={1.5} />)}
          </>
        ) : (
          <>
            <Fill s={R(104, 68, 10)} fill="#9C5B2A" ow={5.5} x={250} y={690} z={1} />
            {burst_ && <Fill s={poly("tear", Array.from({ length: 18 }, (_, i) => { const a = (i * Math.PI) / 9; const r = i % 2 ? 17 : 34; return [Math.cos(a) * r, Math.sin(a) * r * 0.8] as Pt; }))} fill="#1C1E26" ow={5.5} x={250} y={668} z={2} />}
          </>
        )}
      </G>
      {burst_ && jets.map((j, i) => {
        const c = bezier(j.p, 28).slice(0, Math.max(3, Math.round(29 * Math.min(1, spray))));
        const k = c.length / 29;
        return (
          <G key={i} z={24 + i * 0.1}>
            <Fill s={poly(`jet${i}-${c.length}`, taperPts(c, j.w0, j.w0 + (j.w1 - j.w0) * k))} fill="#DDF1FF" ow={5.5} />
            <Fill s={poly(`jetH${i}-${c.length}`, taperPts(c.map(([px, py]) => [px - 5, py] as Pt), j.w0 * 0.3, (j.w0 + (j.w1 - j.w0) * k) * 0.3))} fill="#FFFFFF" ow={0} z={0.05} />
          </G>
        );
      })}
      {burst_ && spray > 0.6 && drops.map(([dx, dy, r], i) => <Fill key={i} s={ell(r, r * 1.15, 16)} fill="#EAF6FF" ow={4.5} x={dx} y={dy} z={24.6} />)}
      {burst_ && (
        <G z={26}>
          {[[-22, 0, 32], [18, 6, 40], [0, -16, 28], [38, -8, 26]].map(([dx, dy, r], i) => <Fill key={i} s={ell(r, r * 0.85, 24)} fill="#EAF6FF" ow={5.5} x={250 + dx} y={650 + dy} z={i * 0.1 + 0.2} sx={Math.min(1, spray * 3)} />)}
          <Fill s={burst(84, 64, 10, 0.55)} fill="#FFFFFF" ow={5.5} x={250} y={660} z={-0.2} sx={Math.min(1.25, 0.4 + spray * 2)} />
        </G>
      )}
      {burst_ && spray > 0.95 && [[196, -150, 100, 60, 4], [290, -154, 150, 74, 6], [392, -150, 104, 60, 4]].map(([cx, cy, w, h, n], i) => <Fill key={i} s={spikes(w, h, n)} fill="#EAF6FF" ow={5.5} x={cx} y={cy} z={27} />)}
    </>
  );
}

// the pink flamingo float: the ring behind Linda, the front of the ring in front of her, the neck and the head
const arc = (cx: number, cy: number, rx: number, ry: number, n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI + (i / n) * Math.PI; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt; });
function Flamingo({ y }: { y: number }) {
  const PINK = "#E86A9A", PINK_D = "#C9507F", PINK_L = "#F58DB5";
  const neck = bezier([[-282, y + 10], [-410, y + 30], [-290, y + 110], [-350, y + 226]], 26);
  const outer = arc(-10, y, 290, 92, 40);
  const hole = arc(-10, y + 8, 186, 46, 32);
  return (
    <>
      <G z={30}>
        {[[298, y + 36, 24], [322, y + 20, 48], [330, y - 14, 70]].map(([fx, fy, r], i) => <Fill key={i} s={ell(54, 22)} fill={PINK_D} ow={5.5} x={fx} y={fy} r={r} z={-0.5 + i * 0.1} />)}
        <Stroke pts={neck} w={56} color={PINK} ow={5.5} round={false} z={0.2} />
        <Fill s={ell(52, 47)} fill={PINK} ow={5.5} x={-350} y={y + 240} z={0.6} />
        <Fill s={poly("beak", [[-386, y + 248], [-434, y + 238], [-460, y + 208], [-416, y + 214], [-388, y + 226]])} fill="#F6D9C8" ow={5.5} z={0.8} />
        <Fill s={poly("beaktip", [[-434, y + 238], [-460, y + 208], [-476, y + 218], [-466, y + 240]])} fill="#1E2028" ow={5.5} z={0.9} />
        <Fill s={ell(12, 12, 14)} fill="#FFFFFF" ow={4} x={-354} y={y + 258} z={1} />
        <Fill s={ell(5, 5, 10)} fill="#000" ow={0} x={-356} y={y + 258} z={1.1} />
        <Fill s={ell(290, 92)} fill={PINK} ow={5.5} x={-10} y={y} z={1} />
        <Stroke pts={outer.slice(6, 34).map(([px, py]) => [px * 0.9 - 1, (py - y) * 0.86 + y + 6] as Pt)} w={12} color={PINK_L} z={1.2} />
        <Fill s={ell(186, 46)} fill={WATER} ow={5.5} x={-10} y={y + 8} z={2} />
      </G>
      <G z={50}>
        <Fill s={poly(`ringfront${y}`, [...outer, ...hole.slice().reverse()])} fill={PINK} ow={0} />
        <Stroke pts={hole} w={5} color="#000" />
        <Stroke pts={outer} w={5} color="#000" z={-0.1} />
        <Stroke pts={outer.slice(4, 37).map(([px, py]) => [px * 0.92 - 1, (py - y) * 0.7 + y - 22] as Pt)} w={10} color={PINK_L} z={0.3} />
      </G>
    </>
  );
}

export function Duck({ x, y, s = 1, z, r = 0 }: { x: number; y: number; s?: number; z: number; r?: number }) {
  return (
    <G x={x} y={y} z={z} sx={s} r={r}>
      <Fill s={rpoly("ducktail", [[70, 20], [128, 70], [106, 0], [84, -22]], 10)} fill="#E7B536" ow={5.5} z={-0.4} />
      <Fill s={ell(100, 64)} fill="#EDBE3A" ow={5.5} />
      <Fill s={ell(52, 32)} fill="#D8A62E" ow={5} x={14} y={6} r={-14} z={1} />
      <Fill s={ell(52, 50)} fill="#EDBE3A" ow={5.5} x={-64} y={74} z={1.5} />
      <Fill s={R(72, 30, 14)} fill="#E8762E" ow={5.5} x={-122} y={66} z={1.2} />
      <Fill s={ell(12, 12, 14)} fill="#FFFFFF" ow={4} x={-72} y={86} z={2} />
      <Fill s={ell(5, 5, 10)} fill="#000" ow={0} x={-75} y={86} z={2.1} />
    </G>
  );
}

function Box({ x, y, z, r = 8 }: { x: number; y: number; z: number; r?: number }) {
  return (
    <G x={x} y={y} z={z} r={r}>
      <Fill s={R(150, 100, 8)} fill="#B68A55" ow={5.5} />
      <Fill s={R(150, 18, 0)} fill="#D2B07A" ow={0} y={30} z={0.2} />
      <Fill s={R(104, 40, 4)} fill="#EFE6D2" ow={4} y={-8} z={0.4} />
      <Txt text="XMAS" size={26} color="#8A2B2B" y={-8} z={1} />
    </G>
  );
}

// Monday: Chad framed on the wall with a heart round him, and the van outside the window
function ChadPhoto({ x, y }: { x: number; y: number }) {
  return (
    <G x={x} y={y} z={9}>
      <Fill s={R(200, 240, 10)} fill="#C9A044" ow={5.5} />
      <Fill s={R(168, 208, 4)} fill="#A9D4EE" ow={4} z={1} />
      <G x={0} y={-24} z={2} sx={0.5}><ChadHead mask={false} faceLight={false} smile={1} mouth={0.45} tilt={3} /></G>
      <Fill s={HEART} fill="#E5352B" ow={5.5} x={96} y={-104} sx={46} r={-14} z={4} />
      <Fill s={HEART} fill="#F0617A" ow={5.5} x={-100} y={96} sx={22} r={-16} z={4} />
      <Fill s={HEART} fill="#F0617A" ow={5.5} x={114} y={20} sx={15} r={12} z={4} />
    </G>
  );
}
function WindowVan({ x, y }: { x: number; y: number }) {
  return (
    <G x={x} y={y} z={9}>
      <Fill s={R(372, 212, 6)} fill="#9FD3F2" ow={5.5} />
      <Fill s={R(372, 62, 0)} fill="#7CB86B" ow={0} y={-75} z={0.2} />
      <G x={0} y={-52} z={1}><Van sx={0.5} /></G>
      <Fill s={R(372, 12, 0)} fill="#2E3648" ow={5.5} y={-102} z={3} />
      <Fill s={R(12, 212, 0)} fill="#2E3648" ow={0} x={-186} z={3} />
      <Fill s={R(12, 212, 0)} fill="#2E3648" ow={0} x={186} z={3} />
    </G>
  );
}

// the floor: concrete, once the water is gone
function FloorSlab() {
  const seams = Array.from({ length: 13 }, (_, i) => {
    const bx = (i - 6) * 180;
    const f = (700 - FLOOR) / (700 + 960);
    return <Stroke key={i} pts={[[f * bx, FLOOR], [bx, -960]]} w={4} color="#4B566A" round={false} />;
  });
  return (
    <G z={19}>
      <Fill s={R(1100, 700, 0)} fill="#59647A" ow={0} y={FLOOR - 350} />
      {seams}
      <Fill s={ell(260, 40)} fill="#4A5568" ow={0} x={-200} y={-520} />
      <Fill s={ell(150, 26)} fill="#3F6A8F" ow={0} x={330} y={-640} />
      <Fill s={ell(70, 10)} fill="#7FB4DC" ow={0} x={310} y={-636} z={0.1} />
    </G>
  );
}

export type BasementState = {
  g?: number;
  spray?: number; // 0 pipe intact .. 1 full jets
  water?: number | null; // the water line at the back wall; null = dry
  ring?: number; // y of the flamingo ring; default follows the water
  linda?: LindaProps & { bob?: boolean };
  duck?: { x: number; y: number } | null;
  box?: { y: number; r?: number } | null;
  monday?: boolean;
  fixed?: boolean;
  clock?: [number, number];
};
export const lindaHeadAt = (ringY: number): Pt => [LINDA_X, ringY - 20 + 262 * 1.05];

export function Basement({ frame = 0, st = {} }: { frame?: number; st?: BasementState }) {
  const g = st.g ?? frame / 30;
  const water = st.water === undefined ? WL : st.water;
  const wet = water !== null;
  const bob = st.linda?.bob === false || !wet ? 0 : Math.sin(g * 2.4) * 6;
  const ringY = (st.ring ?? (wet ? Math.max(water - 90, RING_FLOOR) : RING_FLOOR)) + bob;
  const duck = st.duck === undefined ? (wet && water >= WL - 1 ? { x: 236, y: -470 } : null) : st.duck;
  const box = st.box === undefined ? (wet && water >= WL - 1 ? { y: -440 } : null) : st.box;
  const spray = st.spray ?? (st.fixed ? 0 : 1);
  const marks = Array.from({ length: 22 }, (_, i) => ({ x: -520 + rnd(i, 1) * 1040, y: -170 - rnd(i, 2) * 760, w: 60 + rnd(i, 3) * 80, c: i % 3 === 0 ? WATER_D : WATER_L }));
  const monday = !!st.monday;
  const lindaProps: LindaProps = { pose: "up", ...st.linda };
  return (
    <>
      {/* the back wall: concrete blocks, the ceiling, a beam, the wet line */}
      <Fill s={R(1100, 1000, 0)} fill="#3A4658" ow={0} y={390} z={0} />
      <Pic tex={blocks()} w={1100} h={1000} y={390} z={0.3} />
      <Fill s={R(1100, 190, 0)} fill="#232A38" ow={5.5} y={890} z={1} />
      <Fill s={R(1100, 58, 0)} fill="#6B4A2E" ow={5.5} y={812} z={1.2} />
      <Fill s={poly("stain", [[-600, FLOOR], [600, FLOOR], [600, WL + 36], ...Array.from({ length: 13 }, (_, i) => [600 - i * 100, WL + 36 + 14 * Math.sin(i * 1.9)] as Pt)])} fill="#2C3646" ow={0} z={1.5} />
      <Door />
      <Stairs />
      <Clock x={-40} y={540} r={76} h={monday ? 8 : 9} m={monday ? 12 : 3.7} />
      {monday && <ChadPhoto x={-190} y={330} />}
      {monday && <WindowVan x={250} y={440} />}
      <Pipe spray={spray} fixed={!!st.fixed} />
      {/* the light: warm from the open door, flat zones over the wall and the stairs */}
      <Fill s={poly("doorzoneA", [[-560, 340], [-430, 340], [60, -330], [-560, -330]])} fill={WARM} ow={0} op={0.13} z={12} />
      <Fill s={poly("doorzoneB", [[-560, 340], [-500, 340], [-140, -330], [-560, -330]])} fill={WARM} ow={0} op={0.1} z={12.1} />
      {monday && <Fill s={poly("daylight", [[110, 350], [390, 350], [140, -330], [-250, -330]])} fill="#E8F4FF" ow={0} op={0.09} z={12.2} />}

      {/* the floor, and the water */}
      <FloorSlab />
      {wet && (
        <G z={20}>
          <Fill s={waveShp(Math.round(water / 2) * 2, 8, 150, Math.round((0.4 + g * 0.1) * 20) / 20)} fill={WATER} ow={5.5} />
          {marks.filter((m) => m.y < water - 30).map((m, i) => <Stroke key={i} pts={Array.from({ length: 9 }, (_, k) => { const u = k / 8; return [m.x + (u - 0.5) * m.w, m.y + Math.sin(u * Math.PI * 2) * 7] as Pt; })} w={7} color={m.c} z={0.3} />)}
        </G>
      )}

      {/* what floats (and what lands) */}
      {box && <Box x={-340} y={box.y} z={44} r={box.r ?? 8} />}
      {box && wet && water > box.y + 120 && <Cover x={-340} y={box.y - 26} w={190} z={46} ph={1} />}
      {duck && <Duck x={duck.x} y={duck.y} s={1.05} z={45} />}
      {duck && <Cover x={duck.x} y={duck.y - 16} w={280} z={47} ph={2} />}
      <Flamingo y={ringY} />
      <Linda x={LINDA_X} y={ringY - 20} z={40} s={1.05} {...lindaProps} />
      {wet && ringY > RING_FLOOR + 4 && <Cover x={-10} y={ringY - 72} w={640} h={40} z={52} ph={3} />}
    </>
  );
}
