import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// StyleFlat: shot 1 of "Nobody Picks Up" (Denise, cold shower) in three FLAT 2D looks, plain SVG + filters (no three.js).
// Every bit of motion and noise is a function of the frame number (hash noise, feTurbulence seeds), never Math.random or a clock.
export type FlatLook = "adultswim" | "rubberhose" | "riso";
type Pt = [number, number];

// ── deterministic helpers ──
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const rnd = (i: number, k = 0) => hash(i * 13.37 + k * 91.7 + k * k * 3.1);
const f1 = (n: number) => Math.round(n * 10) / 10;
const lin = (pts: Pt[]) => "M" + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L") + "Z";
function smooth(pts: Pt[], close = true): string {
  const n = pts.length;
  const g = (i: number) => (close ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + (close ? "Z" : "");
}
// closed polygon whose edges bulge outward as round lobes (foam, clouds)
function bumpy(pts: Pt[], amp: number, seed = 0): string {
  const n = pts.length;
  let cx = 0, cy = 0;
  pts.forEach((p) => { cx += p[0] / n; cy += p[1] / n; });
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    let nx = dy / len, ny = -dx / len;
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
    const k = amp * (0.8 + 0.5 * rnd(i, seed)) * 1.33 * Math.min(1, len / 60);
    d += `C${f1(a[0] + nx * k)} ${f1(a[1] + ny * k)} ${f1(b[0] + nx * k)} ${f1(b[1] + ny * k)} ${f1(b[0])} ${f1(b[1])}`;
  }
  return d + "Z";
}
const ellp = (cx: number, cy: number, rx: number, ry: number, n = 14, jit = 0, seed = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, k = 1 + (rnd(i, seed) - 0.5) * 2 * jit;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] as Pt;
  });
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const star = (x: number, y: number, r: number) => lin([[x, y - r], [x + r * 0.22, y - r * 0.22], [x + r, y], [x + r * 0.22, y + r * 0.22], [x, y + r], [x - r * 0.22, y + r * 0.22], [x - r, y], [x - r * 0.22, y - r * 0.22]]);

// ── shared geometry (the same shot in every look: head at x 520, foam tower, shower head top-left, curtain at the shoulders) ──
const CX = 520;
const mir = (p: Pt): Pt => [2 * CX - p[0], p[1]];
const TL: Pt[] = [[300, 885], [284, 818], [322, 752], [304, 684], [338, 616], [324, 548], [354, 480], [344, 412], [378, 352], [440, 314]];
const TOWER_PTS: Pt[] = [...TL, [520, 305], ...[...TL].reverse().map(mir), [640, 918], [520, 928], [400, 918]];
const TOWER = bumpy(TOWER_PTS, 30);
const BUBBLES: [number, number, number][] = [[212, 640, 20], [800, 620, 15], [760, 430, 13], [838, 770, 17], [206, 790, 12], [900, 520, 10]];
const icLen = (f: number) => 150 + 170 * (1 - Math.exp(-f / 20)); // the icicle grows: 150 px at once, ~320 px after 2 s
const icicle = (x: number, y: number, len: number, w = 16) => lin([[x - w, y], [x + w, y], [x + w * 0.3, y + len * 0.7], [x, y + len], [x - w * 0.3, y + len * 0.7]]);
const curtainTop = (): Pt[] => Array.from({ length: 11 }, (_, i) => [-60 + i * 120, 1392 + 9 * Math.sin(i * 1.3) - (i === 5 ? 6 : 0)] as Pt);
const CURTAIN = smooth(curtainTop(), false) + "L1140 1980L-60 1980Z";
const SHOULDERS = smooth([[150, 1470], [168, 1345], [280, 1288], [430, 1270], [520, 1266], [610, 1270], [760, 1288], [872, 1345], [890, 1470]]);
const shake = (f: number): Pt => { const a = 20 * Math.exp(-f / 5); return [(rnd(f, 1) - 0.5) * 2 * a, (rnd(f, 2) - 0.5) * 1.4 * a]; };
const shiver = (f: number) => ({ dx: Math.sin(f * 2.3) * 3.5 + (rnd(f, 5) - 0.5) * 3, rot: Math.sin(f * 1.7) * 0.6 });
const HL: Pt[] = [[332, 1000], [320, 1130], [300, 1262], [314, 1344], [368, 1348], [380, 1262], [376, 1130]];
const HR: Pt[] = HL.map(mir);
const BIG = { x: -100, y: -100, width: 1300, height: 2100 } as const;

// ═══════════════════════════ 1. adultswim ═══════════════════════════
const A = {
  wall: "#bcd98a", wallL: "#cfe7a2", line: "#4d6a35", skin: "#f8c08f", skinD: "#dc8f63", hair: "#7a4624", hairD: "#4b2a14", ink: "#1d1330",
  curt: "#9b5ce0", curtD: "#7440b8", curtL: "#c3a2f3", foam: "#ffffff", foamD: "#b3d0e2", ice: "#d3f4ff", iceD: "#7cc4ea", chrome: "#c4c9d1", chromeD: "#8c94a2", pink: "#ec6a86", mouth: "#4a1226",
};
const Sh = ({ d, fill, sw = 9, stroke = A.ink }: { d: string; fill: string; sw?: number; stroke?: string }) => (
  <g strokeLinejoin="round" strokeLinecap="round">
    <path d={d} fill="none" stroke={stroke} strokeWidth={sw * 0.6} transform="translate(3 2.5)" />
    <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} />
  </g>
);
// one form: flat fill, ONE flat shadow shape (the lit copy is shifted up-left, what is left of the form is shadow), uneven outline
const Form = ({ id, d, light, dark, sw = 10, dx = -28, dy = -22 }: { id: string; d: string; light: string; dark: string; sw?: number; dx?: number; dy?: number }) => (
  <g strokeLinejoin="round">
    <path d={d} fill={dark} />
    <clipPath id={`c-${id}`}><path d={d} /></clipPath>
    <g clipPath={`url(#c-${id})`}><path d={d} fill={light} transform={`translate(${dx} ${dy})`} /></g>
    <path d={d} fill="none" stroke={A.ink} strokeWidth={sw * 0.6} transform="translate(3 2.5)" />
    <path d={d} fill="none" stroke={A.ink} strokeWidth={sw} />
  </g>
);

function AdultSwim({ f }: { f: number }) {
  const seed = Math.floor(f / 2); // line boil: new wobble every 2 frames
  const { dx, rot } = shiver(f);
  const [sx, sy] = shake(f);
  const len = icLen(f);
  const jaw = Math.sin(f * 0.8) * 4;
  const mp = ([[418, 1180], [444, 1143], [520, 1126], [596, 1143], [622, 1180], [606, 1218], [556, 1240], [484, 1240], [434, 1218]] as Pt[]).map(([x, y], i) => [x + Math.sin(f * 0.9 + i * 1.7) * 3, y + Math.sin(f * 1.1 + i) * 3 + (y > 1200 ? jaw : 0)] as Pt);
  const mouth = smooth(mp);
  const upper = [452, 482, 512, 542, 572], uh = [42, 50, 38, 48, 40];
  const lower = [468, 506, 546], lh = [32, 26, 30];
  const hairStrand = (pts: Pt[]) => <Sh d={smooth(pts)} fill={A.hair} sw={8} />;
  return (
    <g transform={`translate(${f1(sx)} ${f1(sy)})`}>
      <defs>
        <filter id="boil" filterUnits="userSpaceOnUse" {...BIG} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves={2} seed={seed + 3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={9} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="boilBg" filterUnits="userSpaceOnUse" {...BIG} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={2} seed={seed + 40} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {/* background: flat tiles with a few detail lines */}
      <g filter="url(#boilBg)">
        <rect x={-80} y={-80} width={1240} height={2080} fill={A.wall} />
        {[[2, 1], [4, 3], [1, 5], [3, 6], [5, 4], [0, 3], [4, 7]].map(([c, r], i) => <rect key={i} x={-20 + c * 210} y={-10 + r * 200} width={210} height={200} fill={A.wallL} />)}
        <g stroke={A.line} strokeWidth={6} strokeLinecap="round">
          {Array.from({ length: 7 }, (_, i) => <line key={`v${i}`} x1={-20 + i * 210} y1={-60} x2={-20 + i * 210} y2={1960} />)}
          {Array.from({ length: 10 }, (_, i) => <line key={`h${i}`} x1={-60} y1={-10 + i * 200} x2={1140} y2={-10 + i * 200} />)}
        </g>
        <path d="M760 205 q40 -34 78 0 q-26 18 -10 46 q-40 4 -68 -46z" fill={A.line} opacity={0.45} />
        <g stroke={A.line} strokeWidth={5} fill="none" strokeLinecap="round"><path d="M880 590 l34 52 l-26 40 l30 36" /><path d="M64 1010 l30 -20 M64 1040 l50 -10" /></g>
      </g>
      <g filter="url(#boil)">
        {/* shower arm, head, icicles */}
        <path d="M-60 214 L212 214 L212 262" fill="none" stroke={A.ink} strokeWidth={46} strokeLinejoin="round" />
        <path d="M-60 214 L212 214 L212 262" fill="none" stroke={A.chrome} strokeWidth={30} strokeLinejoin="round" />
        <Form id="dome" d="M104 304 C110 212 346 192 354 288 L350 304 L110 322Z" light="#dfe3e8" dark={A.chromeD} sw={9} />
        <g transform="rotate(-6 230 318)"><Form id="face" d={ell(230, 318, 124, 30)} light="#dfe3e8" dark={A.chromeD} sw={9} />
          {[[170, 318], [200, 322], [230, 324], [260, 322], [290, 318]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} fill={A.ink} />)}</g>
        {[[168, 0.55, 21], [230, 1, 28], [292, 0.4, 19]].map(([x, k, w], i) => <Form key={i} id={`ic${i}`} d={icicle(x, 330, len * k, w)} light={A.ice} dark={A.iceD} sw={8} dx={-7} dy={0} />)}
        {[[110, 470, 30], [372, 392, 22], [90, 330, 16]].map(([x, y, r], i) => <Sh key={i} d={star(x, y, r)} fill="#fff" sw={6} />)}
        {/* Denise */}
        <g transform={`translate(${f1(dx)} 0) rotate(${f1(rot)} 520 1300)`}>
          <Form id="neck" d={smooth([[452, 1190], [588, 1190], [604, 1300], [436, 1300]])} light={A.skin} dark={A.skinD} sw={9} />
          <Form id="sho" d={SHOULDERS} light={A.skin} dark={A.skinD} sw={10} dx={-30} dy={-26} />
          <g stroke={A.ink} strokeWidth={7} fill="none" strokeLinecap="round"><path d="M398 1334 Q450 1352 506 1334" /><path d="M642 1334 Q590 1352 534 1334" /></g>
          {Array.from({ length: 11 }, (_, i) => <circle key={i} cx={i % 2 ? 250 + rnd(i, 3) * 90 : 690 + rnd(i, 4) * 90} cy={1320 + rnd(i, 5) * 50} r={4.5} fill="none" stroke={A.skinD} strokeWidth={3.5} />)}
          <Form id="hairb" d={smooth(ellp(520, 1022, 232, 236, 14, 0.04, 2))} light={A.hair} dark={A.hairD} sw={10} />
          <Form id="hairL" d={smooth(HL)} light={A.hair} dark={A.hairD} sw={9} />
          <Form id="hairR" d={smooth(HR)} light={A.hair} dark={A.hairD} sw={9} />
          <Form id="head" d={smooth(ellp(520, 1054, 200, 214, 12, 0.035, 1))} light={A.skin} dark={A.skinD} sw={11} dx={-34} dy={-26} />
          {[-1, 1].map((sd) => <ellipse key={sd} cx={520 + sd * 124} cy={1130} rx={40} ry={26} fill={A.pink} opacity={0.55} />)}
          {/* eyes squeezed shut, creases, bags */}
          {[-1, 1].map((sd) => (
            <g key={sd} fill="none" stroke={A.ink} strokeLinecap="round" strokeLinejoin="round">
              <polyline points={`${520 + sd * 118},${990} ${520 + sd * 58},${1030} ${520 + sd * 118},${1072}`} strokeWidth={sd > 0 ? 17 : 14} />
              {[0, 1, 2].map((k) => <line key={k} x1={520 + sd * 132} y1={1010 + k * 22} x2={520 + sd * 160} y2={1000 + k * 30} strokeWidth={6} />)}
              <path d={`M${520 + sd * 112} 1096 Q${520 + sd * 80} 1112 ${520 + sd * 52} 1096`} strokeWidth={6} stroke={A.skinD} />
            </g>
          ))}
          <Sh d={smooth([[366, 948], [488, 984], [486, 1008], [368, 976]])} fill={A.hairD} sw={8} />
          <Sh d={smooth([[690, 934], [552, 986], [554, 1010], [686, 962]])} fill={A.hairD} sw={8} />
          <Form id="nose" d={smooth(ellp(520, 1098, 36, 28, 10, 0.05, 4))} light={A.skin} dark={A.skinD} sw={8} dx={-10} dy={-8} />
          {/* the shout: wobbly mouth, visible teeth, tongue, drool */}
          <clipPath id="mclip"><path d={mouth} /></clipPath>
          <path d={mouth} fill={A.mouth} />
          <g clipPath="url(#mclip)">
            <ellipse cx={520} cy={1240 + jaw} rx={56} ry={30} fill={A.pink} stroke={A.ink} strokeWidth={5} />
            {upper.map((x, i) => <rect key={i} x={x} y={1108} width={31} height={uh[i] + 14} rx={7} fill="#fff" stroke={A.ink} strokeWidth={4} />)}
            {lower.map((x, i) => <rect key={i} x={x} y={1250 + jaw - lh[i]} width={28} height={lh[i] + 10} rx={7} fill="#f6f1e2" stroke={A.ink} strokeWidth={4} />)}
          </g>
          <path d={mouth} fill="none" stroke={A.ink} strokeWidth={12} strokeLinejoin="round" />
          <path d={`M440 ${1226 + jaw} Q430 1268 446 ${1300 + Math.sin(f * 0.5) * 8}`} fill="none" stroke="#bfe6f2" strokeWidth={9} strokeLinecap="round" />
          {[[676, 1160, 10], [700, 1190, 8], [388, 1150, 9]].map(([x, y, r], i) => <path key={i} d={lin([[x, y - r * 1.6], [x + r, y], [x, y + r], [x - r, y]])} fill="#bfe6f2" stroke={A.ink} strokeWidth={4} />)}
          {/* wet hair plastered on the face */}
          {hairStrand([[326, 900], [352, 888], [376, 960], [370, 1060], [354, 1126], [332, 1060], [322, 980]])}
          {hairStrand([[714, 900], [690, 886], [666, 960], [672, 1050], [688, 1116], [710, 1050], [718, 980]])}
          {hairStrand([[420, 886], [470, 884], [462, 944], [446, 972], [430, 944]])}
          {hairStrand([[600, 886], [648, 890], [632, 948], [616, 966], [602, 940]])}
          {/* the foam tower */}
          <Form id="foam" d={TOWER} light={A.foam} dark={A.foamD} sw={10} dx={-36} dy={-28} />
          {BUBBLES.map(([x, y, r], i) => <Form key={i} id={`b${i}`} d={ell(x, y + Math.sin(f * 0.3 + i) * 3, r, r)} light="#fff" dark={A.foamD} sw={7} dx={-4} dy={-4} />)}
          <Form id="drip1" d="M388 918 q-6 44 16 52 q26 -8 12 -52z" light="#fff" dark={A.foamD} sw={7} dx={-6} dy={-6} />
          <Form id="drip2" d="M634 916 q-4 36 14 44 q22 -6 10 -44z" light="#fff" dark={A.foamD} sw={7} dx={-6} dy={-6} />
          {/* cold: shiver ticks */}
          {[-1, 1].map((sd) => [0, 1, 2].map((k) => <line key={`${sd}${k}`} x1={520 + sd * (262 + k * 6) + (rnd(f, k + 7) - 0.5) * 6} y1={1000 + k * 46} x2={520 + sd * (300 + k * 6)} y2={1010 + k * 46} stroke={A.ink} strokeWidth={9} strokeLinecap="round" />))}
          {/* goosebump pop */}
          <g fill="none" stroke={A.ink} strokeWidth={4} strokeLinecap="round">{[[238, 1330], [790, 1326]].map(([x, y], i) => <path key={i} d={`M${x - 10} ${y + 8} l-8 -12 M${x} ${y} l0 -16 M${x + 10} ${y + 8} l8 -12`} />)}</g>
        </g>
        {/* curtain up to her shoulders, her hands grip it */}
        <path d={CURTAIN} fill={A.curt} stroke={A.ink} strokeWidth={11} strokeLinejoin="round" />
        {[[160, 0], [520, 0], [900, 0]].map(([x], i) => <path key={i} d={`M${x} 1410 q20 140 -4 300 l60 0 q24 -150 0 -300z`} fill={A.curtD} />)}
        {Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx={90 + (i % 4) * 280 + rnd(i, 9) * 40} cy={1470 + Math.floor(i / 4) * 150} rx={26} ry={22} fill={A.curtL} />)}
        {[-1, 1].map((sd) => (
          <g key={sd} transform={`translate(${520 + sd * 318 + dx} 1396)`}>
            <Form id={`hand${sd}`} d={smooth(ellp(0, 0, 58, 50, 10, 0.05, 6 + sd))} light={A.skin} dark={A.skinD} sw={9} />
            {[-22, 2, 26].map((x) => <line key={x} x1={x} y1={-6} x2={x} y2={30} stroke={A.ink} strokeWidth={6} strokeLinecap="round" />)}
          </g>
        ))}
      </g>
    </g>
  );
}

// ═══════════════════════════ 2. rubberhose ═══════════════════════════
const R = { ink: "#14100c", cream: "#f2e7c6", white: "#fbf5e3", mid: "#b39968", dark: "#6a5230", bg0: "#e4d4a6", bg1: "#8a7046" };
const Bk = ({ d, fill, sw = 12 }: { d: string; fill: string; sw?: number }) => <path d={d} fill={fill} stroke={R.ink} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />;
const Tube = ({ d, w = 46 }: { d: string; w?: number }) => (<g fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={d} stroke={R.ink} strokeWidth={w} /><path d={d} stroke={R.cream} strokeWidth={w - 16} /></g>);

function RubberHose({ f }: { f: number }) {
  const seed = Math.floor(f / 2);
  const len = icLen(f);
  const { dx, rot } = shiver(f);
  const [sx, sy] = shake(f);
  const bob = -Math.abs(Math.sin(f * 0.5)) * 8; // rubber-hose bounce on the beat
  const squash = 1 + Math.sin(f * 0.5 + 1.2) * 0.012;
  const weave: Pt = [Math.sin(f * 0.7) * 2.2 + (rnd(f, 11) - 0.5) * 2, Math.sin(f * 0.43 + 1) * 1.8 + (rnd(f, 12) - 0.5) * 2];
  const jaw = Math.sin(f * 0.8) * 4;
  const mp = ([[410, 1180], [440, 1138], [520, 1120], [600, 1138], [630, 1180], [610, 1222], [560, 1246], [480, 1246], [430, 1222]] as Pt[]).map(([x, y], i) => [x + Math.sin(f * 0.9 + i) * 2, y + (y > 1200 ? jaw : 0)] as Pt);
  const mouth = smooth(mp);
  const eye = (sd: number) => (
    <g transform={`translate(${520 + sd * 82} 1030) rotate(${sd * -16})`}>
      <clipPath id={`lens${sd}`}><path d="M-58 0 Q0 -40 58 0 Q0 38 -58 0Z" /></clipPath>
      <path d="M-58 0 Q0 -40 58 0 Q0 38 -58 0Z" fill={R.ink} />
      <g clipPath={`url(#lens${sd})`}><path d={`M${sd * 6} 0 L${sd * 52} -26 L${sd * 58} 8Z`} fill={R.cream} /></g>
      <path d="M-62 2 Q0 -48 62 2" fill="none" stroke={R.ink} strokeWidth={14} strokeLinecap="round" />
      {[0, 1, 2].map((k) => <line key={k} x1={sd * 52} y1={-8 + k * 4} x2={sd * (78 + k * 3)} y2={-30 + k * 13} stroke={R.ink} strokeWidth={6} strokeLinecap="round" />)}
    </g>
  );
  const glove = (sd: number) => (
    <g transform={`translate(${520 + sd * 330 + dx} ${1388 + Math.sin(f * 1.3 + sd) * 2})`}>
      <Bk d={smooth(ellp(0, 0, 54, 46, 10, 0.04, 8))} fill={R.white} sw={11} />
      {[-30, -8, 14, 36].map((x, i) => <Bk key={i} d={ell(x, -38, 14, 18)} fill={R.white} sw={9} />)}
      <Bk d={ell(sd * 52, -4, 18, 14)} fill={R.white} sw={9} />
      <path d="M-20 -26 l0 32 M2 -26 l0 32 M24 -26 l0 32" stroke={R.ink} strokeWidth={5} strokeLinecap="round" />
      <Bk d="M-40 40 l80 0 l8 26 l-96 0z" fill={R.white} sw={9} />
    </g>
  );
  return (
    <g transform={`translate(${f1(weave[0])} ${f1(weave[1])})`}>
      <defs>
        <filter id="rhBoil" filterUnits="userSpaceOnUse" {...BIG} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed + 7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="rhBg" cx="50%" cy="48%" r="75%"><stop offset="0" stopColor={R.bg0} /><stop offset="0.55" stopColor="#b89e6c" /><stop offset="1" stopColor={R.bg1} /></radialGradient>
      </defs>
      <g transform={`translate(${f1(sx)} ${f1(sy)})`} filter="url(#rhBoil)">
        <rect x={-100} y={-100} width={1300} height={2200} fill="url(#rhBg)" />
        {/* tiles: wobbly hand-ruled lines */}
        <g stroke={R.dark} strokeWidth={5} opacity={0.55} fill="none" strokeLinecap="round">
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${-20 + i * 190} -60 q8 500 -4 1000 t4 1040`} />)}
          {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M-60 ${-10 + i * 190} q540 10 1200 -4`} />)}
        </g>
        {/* shower arm, head and icicles */}
        <path d="M-60 214 L212 214 L212 262" fill="none" stroke={R.ink} strokeWidth={46} strokeLinejoin="round" />
        <path d="M-60 214 L212 214 L212 262" fill="none" stroke={R.cream} strokeWidth={28} strokeLinejoin="round" />
        <Bk d="M104 304 C110 212 346 192 354 288 L350 304 L110 322Z" fill={R.cream} />
        <g transform="rotate(-6 230 318)"><Bk d={ell(230, 318, 124, 30)} fill={R.mid} sw={11} />
          {[170, 200, 230, 260, 290].map((x, i) => <circle key={i} cx={x} cy={320} r={5} fill={R.ink} />)}</g>
        {[[168, 0.55, 21], [230, 1, 28], [292, 0.4, 19]].map(([x, k, w], i) => (
          <g key={i}><Bk d={icicle(x, 330, len * k, w)} fill={R.white} sw={10} /><path d={`M${x - w * 0.4} 342 L${x - w * 0.1} ${330 + len * k * 0.6}`} stroke={R.ink} strokeWidth={4} strokeLinecap="round" opacity={0.7} /></g>
        ))}
        {[[110, 470, 32], [372, 392, 24], [90, 330, 18]].map(([x, y, r], i) => <Bk key={i} d={star(x, y, r * (0.75 + 0.25 * Math.sin(f * 0.9 + i * 2)))} fill={R.white} sw={6} />)}
        <g transform={`translate(${f1(dx)} ${f1(bob)}) rotate(${f1(rot)} 520 1300) translate(520 1390) scale(1 ${f1(squash * 1000) / 1000}) translate(-520 -1390)`}>
          {/* shoulders, noodle arms */}
          <Bk d={SHOULDERS} fill={R.cream} />
          <g fill="none" stroke={R.ink} strokeWidth={7} strokeLinecap="round"><path d="M398 1334 Q450 1352 506 1334" /><path d="M642 1334 Q590 1352 534 1334" /></g>
          {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={i % 2 ? 250 + rnd(i, 3) * 90 : 690 + rnd(i, 4) * 90} cy={1318 + rnd(i, 5) * 50} r={4} fill={R.dark} />)}
          <Tube d="M232 1338 C160 1296 118 1348 180 1388" />
          <Tube d="M808 1338 C880 1296 922 1348 860 1388" />
          {/* head: black wet hair, cream face */}
          <Bk d={smooth(ellp(520, 1022, 232, 236, 14, 0.035, 2))} fill={R.ink} sw={4} />
          <Bk d={smooth(HL)} fill={R.ink} sw={4} />
          <Bk d={smooth(HR)} fill={R.ink} sw={4} />
          <g fill="none" stroke={R.cream} strokeWidth={9} strokeLinecap="round" opacity={0.85}>
            <path d="M318 1120 Q304 1200 312 1290" /><path d="M722 1120 Q736 1200 728 1290" /><path d="M298 930 Q262 1010 292 1060" /><path d="M742 930 Q778 1010 748 1060" />
          </g>
          <Bk d={smooth(ellp(520, 1054, 200, 214, 12, 0.03, 1))} fill={R.cream} sw={13} />
          {[-1, 1].map((sd) => <ellipse key={sd} cx={520 + sd * 128} cy={1136} rx={38} ry={28} fill={R.mid} opacity={0.75} />)}
          {eye(-1)}{eye(1)}
          <Bk d={smooth([[364, 948], [490, 984], [488, 1004], [366, 974]])} fill={R.ink} sw={6} />
          <Bk d={smooth([[692, 940], [550, 986], [552, 1006], [690, 968]])} fill={R.ink} sw={6} />
          <Bk d={ell(520, 1100, 24, 20)} fill={R.cream} sw={9} /><circle cx={512} cy={1094} r={6} fill={R.white} />
          {/* the shout: black mouth, a bar of teeth, tongue */}
          <clipPath id="rmclip"><path d={mouth} /></clipPath>
          <path d={mouth} fill={R.ink} />
          <g clipPath="url(#rmclip)">
            <ellipse cx={520} cy={1250 + jaw} rx={60} ry={32} fill={R.mid} stroke={R.ink} strokeWidth={5} />
            <rect x={440} y={1112} width={160} height={46} rx={10} fill={R.white} stroke={R.ink} strokeWidth={5} />
            {[473, 507, 541, 575].map((x) => <line key={x} x1={x - 14} y1={1114} x2={x - 14} y2={1158} stroke={R.ink} strokeWidth={4} />)}
          </g>
          <path d={mouth} fill="none" stroke={R.ink} strokeWidth={13} strokeLinejoin="round" />
          {[-1, 1].map((sd) => <path key={sd} d={`M${520 + sd * 124} 1170 q${sd * 18} 30 ${sd * 2} 56`} fill="none" stroke={R.ink} strokeWidth={7} strokeLinecap="round" />)}
          {/* bangs plastered on the forehead */}
          <Bk d={smooth([[330, 902], [366, 884], [386, 950], [372, 1048], [354, 1110], [334, 1050], [324, 980]])} fill={R.ink} sw={5} />
          <Bk d={smooth([[712, 902], [676, 884], [654, 950], [668, 1048], [686, 1110], [708, 1050], [718, 980]])} fill={R.ink} sw={5} />
          <Bk d={smooth([[420, 886], [470, 884], [462, 946], [446, 974], [430, 946]])} fill={R.ink} sw={5} />
          <Bk d={smooth([[600, 886], [650, 890], [634, 950], [618, 968], [602, 942]])} fill={R.ink} sw={5} />
          {/* foam tower: bold outline, a few hatch strokes for volume */}
          <Bk d={TOWER} fill={R.white} sw={13} />
          <g fill="none" stroke={R.ink} strokeWidth={6} strokeLinecap="round" opacity={0.9}>
            {[[640, 640], [662, 700], [676, 770], [610, 520], [588, 440], [700, 830]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q16 -10 34 -6 M${x + 6} ${y + 20} q16 -10 30 -6`} />)}
          </g>
          {BUBBLES.map(([x, y, r], i) => <g key={i}><Bk d={ell(x, y + Math.sin(f * 0.3 + i) * 3, r, r)} fill={R.white} sw={8} /><circle cx={x - r * 0.3} cy={y - r * 0.3 + Math.sin(f * 0.3 + i) * 3} r={r * 0.2} fill={R.dark} /></g>)}
          <Bk d="M388 918 q-6 44 16 52 q26 -8 12 -52z" fill={R.white} sw={8} />
          <Bk d="M634 916 q-4 36 14 44 q22 -6 10 -44z" fill={R.white} sw={8} />
          {[-1, 1].map((sd) => [0, 1, 2].map((k) => <line key={`${sd}${k}`} x1={520 + sd * (264 + k * 6) + (rnd(f, k + 7) - 0.5) * 6} y1={1000 + k * 46} x2={520 + sd * (302 + k * 6)} y2={1010 + k * 46} stroke={R.ink} strokeWidth={9} strokeLinecap="round" />))}
        </g>
        {/* curtain: bold black with cream dots */}
        <path d={CURTAIN} fill={R.ink} />
        {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={60 + (i % 6) * 180 + (Math.floor(i / 6) % 2) * 90} cy={1470 + Math.floor(i / 6) * 120} r={i % 3 ? 22 : 34} fill={R.cream} />)}
        <path d={CURTAIN} fill="none" stroke={R.ink} strokeWidth={4} />
        {glove(-1)}{glove(1)}
      </g>
    </g>
  );
}

function FilmFx({ f }: { f: number }) {
  const flick = 0.05 + 0.12 * rnd(f, 21) + (rnd(f, 22) > 0.85 ? 0.12 : 0);
  const scratches = Array.from({ length: 3 }, (_, k) => ({ x: rnd(f, 30 + k) * 1080, y0: rnd(f, 33 + k) * 900, l: 200 + rnd(f, 36 + k) * 900, on: rnd(f, 39 + k) > 0.35, lt: rnd(f, 42 + k) > 0.5 }));
  const dust = Array.from({ length: 16 }, (_, k) => ({ x: rnd(f, 50 + k) * 1080, y: rnd(f, 70 + k) * 1920, r: 1.5 + rnd(f, 90 + k) * 4, lt: rnd(f, 110 + k) > 0.45 }));
  return (
    <>
      <defs>
        <filter id="grain" filterUnits="userSpaceOnUse" {...BIG} colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f + 1} />
          <feColorMatrix type="matrix" values="1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  0 0 0 0 1" />
        </filter>
        <radialGradient id="vig" cx="50%" cy="48%" r="72%"><stop offset="0.5" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.72} /></radialGradient>
      </defs>
      <rect width={1080} height={1920} filter="url(#grain)" style={{ mixBlendMode: "overlay" }} opacity={1} />
      <rect width={1080} height={1920} fill="url(#vig)" />
      <rect width={1080} height={1920} fill={rnd(f, 23) > 0.5 ? "#000" : "#fff"} opacity={flick * 0.5} />
      {scratches.filter((s) => s.on).map((s, i) => <line key={i} x1={s.x} y1={s.y0} x2={s.x + (rnd(f, 45 + i) - 0.5) * 14} y2={s.y0 + s.l} stroke={s.lt ? "#f6ecd0" : "#1a140c"} strokeWidth={1.6} opacity={0.6} />)}
      {dust.map((d, i) => <ellipse key={i} cx={d.x} cy={d.y} rx={d.r} ry={d.r * (0.6 + rnd(f, 130 + i))} fill={d.lt ? "#f6ecd0" : "#1a140c"} opacity={0.7} />)}
    </>
  );
}

// ═══════════════════════════ 3. riso ═══════════════════════════
type Ink = "Y" | "P" | "B";
const PAPER = "#f3ecda", KO = "#ffffff"; // a knock-out is white: it multiplies to the paper
const INKC: Record<Ink, string> = { Y: "#ffe600", P: "#ff4da6", B: "#0b6cc4" };
const ANG: Record<Ink, number> = { Y: 0, P: 15, B: 75 };
type Part = { d: string; ink: Partial<Record<Ink, string>>; stroke?: number; clip?: string; tx?: number; ty?: number };
// ink value: "s" solid, "25"/"50"/"75" halftone, "-" untouched (overprint); anything else (or missing) knocks the paper through
const part = (d: string, ink: Part["ink"], o: Partial<Part> = {}): Part => ({ d, ink, ...o });
const SKIN_INK = { P: "25" };
const DARK_INK = { B: "s", P: "50" };

const risoMouth = (f: number) => smooth(([[416, 1184], [442, 1146], [520, 1130], [598, 1146], [624, 1184], [606, 1224], [556, 1244], [484, 1244], [434, 1224]] as Pt[]).map(([x, y], i) => [520 + (x - 520) * 1.22 + Math.sin(f * 0.9 + i) * 2.5 + shiver(f).dx, 1190 + (y - 1190) * 1.2 + (y > 1200 ? Math.sin(f * 0.8) * 4 : 0)] as Pt));
function riso(f: number): Part[] {
  const out: Part[] = [];
  const add = (...p: Part[]) => out.push(...p);
  const len = icLen(f);
  const { dx } = shiver(f);
  const jaw = Math.sin(f * 0.8) * 4;
  const mouth = risoMouth(f);
  // wall, halo, tiles
  add(part("M-100 -100H1200V2100H-100Z", { Y: "s", P: "ko", B: "ko" }));
  for (let i = 0; i < 8; i++) add(part(`M${-20 + i * 190} -80V2000`, { Y: "-", P: "-", B: "s" }, { stroke: 4 }));
  for (let i = 0; i < 11; i++) add(part(`M-80 ${-10 + i * 190}H1200`, { Y: "-", P: "-", B: "s" }, { stroke: 4 }));
  add(part(ell(520, 990, 470, 470), { Y: "-", P: "-", B: "25" }));
  // shower head and icicles
  add(part("M-100 214H212V262", { B: "s" }, { stroke: 40 }));
  add(part("M104 304 C110 212 346 192 354 288 L350 304 L110 322Z", { B: "s" }));
  add(part(ell(230, 322, 124, 32), { B: "s" }));
  for (const [x, k, w] of [[168, 0.55, 22], [230, 1, 30], [292, 0.4, 20]] as const) {
    add(part(icicle(x, 336, len * k, w), { B: "s" }));
    add(part(`M${x - w * 0.45} 352 L${x - w * 0.12} ${336 + len * k * 0.6}`, {}, { stroke: 6 }));
  }
  for (const [x, y, r] of [[110, 470, 34], [372, 396, 26], [86, 330, 18]] as const) add(part(star(x, y, r), {}));
  // Denise
  const sx = dx;
  const T = (p: Pt): Pt => [p[0] + sx, p[1]];
  const tp = (pts: Pt[]) => pts.map(T);
  add(part(smooth(tp([[452, 1190], [588, 1190], [604, 1300], [436, 1300]])), SKIN_INK));
  add(part(smooth(tp([[150, 1470], [168, 1345], [280, 1288], [430, 1270], [520, 1266], [610, 1270], [760, 1288], [872, 1345], [890, 1470]])), SKIN_INK));
  add(part(smooth(tp([[440, 1196], [600, 1196], [610, 1300], [432, 1300], [470, 1262]])), { P: "75" }, { clip: "neckClip" }));
  add(part(smooth(tp(ellp(520, 1022, 232, 236, 14, 0.03, 2))), DARK_INK));
  add(part(smooth(tp(HL)), DARK_INK));
  add(part(smooth(tp(HR)), DARK_INK));
  add(part(smooth(tp(ellp(520, 1054, 200, 214, 12, 0.025, 1))), SKIN_INK));
  add(part(smooth(tp(ellp(520, 1054, 200, 214, 12, 0.025, 1))), { P: "50" }), part(smooth(tp(ellp(520, 1054, 200, 214, 12, 0.025, 1))), { P: "25", Y: "-", B: "-" }, { tx: -30, ty: -22, clip: "faceClip" }));
  for (const sd of [-1, 1]) add(part(ell(520 + sd * 158 + sx, 1098, 34, 26), { P: "s" }));
  for (const sd of [-1, 1]) {
    add(part(`M${520 + sd * 122 + sx} 990L${520 + sd * 58 + sx} 1030L${520 + sd * 122 + sx} 1074`, DARK_INK, { stroke: 24 }));
    add(part(lin(tp([[520 + sd * 134, 944 + (sd < 0 ? 4 : 0)], [520 + sd * 8, 986], [520 + sd * 8, 1010], [520 + sd * 134, 970 + (sd < 0 ? 4 : 0)]])), DARK_INK));
  }
  add(part(lin(tp([[520, 1070], [554, 1124], [486, 1124]])), { P: "75" }));
  add(part(mouth, { B: "s", P: "s" }));
  add(part(lin(tp([[430, 1100], [610, 1100], [610, 1174], [430, 1174]])), {}, { clip: "mouthClip" }));
  add(part(ell(520 + sx, 1246 + jaw, 58, 34), { P: "s", B: "ko" }, { clip: "mouthClip" }));
  // wet hair strands, foam
  add(part(smooth(tp([[326, 900], [352, 888], [376, 960], [370, 1060], [354, 1126], [332, 1060], [322, 980]])), DARK_INK));
  add(part(smooth(tp([[714, 900], [690, 886], [666, 960], [672, 1050], [688, 1116], [710, 1050], [718, 980]])), DARK_INK));
  add(part(smooth(tp([[420, 886], [470, 884], [462, 944], [446, 972], [430, 944]])), DARK_INK));
  add(part(smooth(tp([[600, 886], [648, 890], [632, 948], [616, 966], [602, 940]])), DARK_INK));
  add(part(TOWER, { B: "25" }, { tx: sx }), part(TOWER, {}, { tx: sx - 36, ty: -28, clip: "towerClip" }));
  for (const [x, y, r] of BUBBLES) { add(part(ell(x, y + Math.sin(f * 0.3) * 3, r, r), {}, { tx: sx })); }
  add(part("M388 918 q-6 44 16 52 q26 -8 12 -52z", {}, { tx: sx }), part("M634 916 q-4 36 14 44 q22 -6 10 -44z", {}, { tx: sx }));
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) add(part(`M${520 + sd * (270 + k * 6)} ${1000 + k * 46}l${sd * 38} 10`, { Y: "-", P: "-", B: "s" }, { stroke: 10 }));
  // curtain, hands
  add(part(CURTAIN, { P: "s" }));
  for (let i = 0; i < 24; i++) add(part(ell(60 + (i % 6) * 180 + (Math.floor(i / 6) % 2) * 90, 1480 + Math.floor(i / 6) * 120, i % 3 ? 22 : 34, i % 3 ? 22 : 34), i % 2 ? { Y: "-", P: "-", B: "s" } : {}));
  for (const sd of [-1, 1]) {
    const hx = 520 + sd * 318 + sx;
    add(part(ell(hx, 1398, 60, 52), SKIN_INK));
    for (const k of [-34, -12, 10, 32]) add(part(ell(hx + k, 1360, 15, 20), SKIN_INK));
    add(part(ell(hx + sd * 54, 1386, 19, 16), SKIN_INK));
  }
  return out;
}

function Riso({ f }: { f: number }) {
  const seed = Math.floor(f / 2);
  const [sx, sy] = shake(f);
  const reg: Record<Ink, Pt> = { Y: [-6, 5], P: [0, 0], B: [6, -5] };
  const parts = riso(f);
  const fillOf = (v: string | undefined, ink: Ink) => (v === "s" ? INKC[ink] : v === "25" || v === "50" || v === "75" ? `url(#ht${v}${ink})` : v === "-" ? null : KO);
  return (
    <>
      <defs>
        {(["Y", "P", "B"] as Ink[]).map((ink, k) => (
          <React.Fragment key={ink}>
            {(["25", "50", "75"] as const).map((v) => (
              <pattern key={v} id={`ht${v}${ink}`} width={13} height={13} patternUnits="userSpaceOnUse" patternTransform={`rotate(${ANG[ink]})`}>
                <circle cx={6.5} cy={6.5} r={{ "25": 3.9, "50": 5.6, "75": 6.9 }[v]} fill={INKC[ink]} />
              </pattern>
            ))}
            <filter id={`gr${ink}`} filterUnits="userSpaceOnUse" {...BIG} colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={seed * 3 + k + 1} result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -5.5" result="a" />
              <feComposite in="SourceGraphic" in2="a" operator="out" />
            </filter>
          </React.Fragment>
        ))}
        <clipPath id="mouthClip"><path d={risoMouth(f)} /></clipPath>
        <clipPath id="towerClip"><path d={TOWER} transform={`translate(${shiver(f).dx} 0)`} /></clipPath>
        <clipPath id="faceClip"><path d={smooth(ellp(520 + shiver(f).dx, 1054, 200, 214, 12, 0.025, 1))} /></clipPath>
        <clipPath id="neckClip"><path d={smooth([[452, 1190], [588, 1190], [604, 1300], [436, 1300]].map(([x, y]) => [x + shiver(f).dx, y] as Pt))} /></clipPath>
      </defs>
      <rect width={1080} height={1920} fill={PAPER} />
      {(["Y", "P", "B"] as Ink[]).map((ink, k) => (
        <g key={ink} style={{ mixBlendMode: "multiply" }} filter={`url(#gr${ink})`} transform={`translate(${f1(sx + reg[ink][0] + (rnd(seed, 60 + k) - 0.5) * 2)} ${f1(sy + reg[ink][1] + (rnd(seed, 70 + k) - 0.5) * 2)})`}>
          {parts.map((p, i) => {
            const v = p.ink[ink];
            const fill = fillOf(v, ink);
            if (fill === null) return null;
            const common = { ...(p.clip ? { clipPath: `url(#${p.clip})` } : {}), ...(p.tx || p.ty ? { transform: `translate(${f1(p.tx ?? 0)} ${f1(p.ty ?? 0)})` } : {}) };
            if (p.stroke) return <path key={i} d={p.d} fill="none" stroke={fill} strokeWidth={p.stroke} strokeLinecap="round" strokeLinejoin="round" {...common} />;
            const ht = v === "25" || v === "50" || v === "75";
            return ht ? <g key={i} {...common}><path d={p.d} fill={KO} /><path d={p.d} fill={fill} /></g> : <path key={i} d={p.d} fill={fill} {...common} />;
          })}
        </g>
      ))}
    </>
  );
}

// ═══════════════════════════ the composition ═══════════════════════════
export const STYLEFLAT_FRAMES = 60;
export const StyleFlat: React.FC<{ look: FlatLook }> = ({ look }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        {look === "adultswim" && <AdultSwim f={f} />}
        {look === "rubberhose" && <><RubberHose f={f} /><FilmFx f={f} /></>}
        {look === "riso" && <Riso f={f} />}
      </svg>
    </AbsoluteFill>
  );
};
