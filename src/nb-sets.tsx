import React from "react";
import { BEVAN, Bk, C, Pt, bumpy, clamp, ease, ell, ellp, f1, lin, rnd, rrect, smooth, spark } from "./nb-kit";

// The sets of "Nobody Picks Up", drawn in the same sepia rubber-hose look. Each set is a background (and where something has to
// pass in front of the people, a foreground) in the 1080 x 1920 frame; the people are placed by the shot.
const Wall = ({ c0 = "#e4d4a6", c1 = "#8a7046", id = "wallg", cy = "48%" }: { c0?: string; c1?: string; id?: string; cy?: string }) => (
  <>
    <defs><radialGradient id={id} cx="50%" cy={cy} r="75%"><stop offset="0" stopColor={c0} /><stop offset="0.55" stopColor="#b89e6c" /><stop offset="1" stopColor={c1} /></radialGradient></defs>
    <rect x={-100} y={-100} width={1300} height={2200} fill={`url(#${id})`} />
  </>
);
const wob = (x1: number, y1: number, x2: number, y2: number, k = 6) => `M${x1} ${y1}Q${(x1 + x2) / 2 + k} ${(y1 + y2) / 2 - k} ${x2} ${y2}`;
const Hatch = ({ x, y, w, h, gap = 26, col = C.dark, sw = 5 }: { x: number; y: number; w: number; h: number; gap?: number; col?: string; sw?: number }) => (
  <g stroke={col} strokeWidth={sw} strokeLinecap="round" opacity={0.7}>{Array.from({ length: Math.floor((w + h) / gap) }, (_, i) => { const o = i * gap; return <line key={i} x1={x + Math.min(o, w)} y1={y + Math.max(0, o - w)} x2={x + Math.max(0, o - h)} y2={y + Math.min(o, h)} />; })}</g>
);

// ═════════════ the bathroom ═════════════
export function Bathroom({ f, t }: { f: number; t: number }) {
  const ice = 70 + 250 * (1 - Math.exp(-Math.max(0, t) / 0.7));
  const steam = clamp(1 - (t - 0.05) / 0.2);
  return (
    <g>
      <Wall />
      <g stroke={C.dark} strokeWidth={5} opacity={0.55} fill="none" strokeLinecap="round">
        {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${-20 + i * 190} -60 q8 500 -4 1000 t4 1040`} />)}
        {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M-60 ${-10 + i * 190} q540 10 1200 -4`} />)}
      </g>
      <path d="M-60 214 L212 214 L212 262" fill="none" stroke={C.ink} strokeWidth={46} strokeLinejoin="round" />
      <path d="M-60 214 L212 214 L212 262" fill="none" stroke={C.cream} strokeWidth={28} strokeLinejoin="round" />
      <Bk d="M104 304 C110 212 346 192 354 288 L350 304 L110 322Z" fill={C.cream} />
      <g transform="rotate(-6 230 318)"><Bk d={ell(230, 318, 124, 30)} fill={C.mid} sw={11} />{[170, 200, 230, 260, 290].map((x, i) => <circle key={i} cx={x} cy={320} r={5} fill={C.ink} />)}</g>
      {[[168, 0.55, 21], [230, 1, 28], [292, 0.4, 19]].map(([x, k, w], i) => {
        const len = ice * k * (i === 1 ? 1 : clamp(ease((t - 0.1 * i) / 0.3)));
        return <g key={i}><Bk d={lin([[x - w, 332], [x + w, 332], [x + w * 0.3, 332 + len * 0.7], [x, 332 + len], [x - w * 0.3, 332 + len * 0.7]])} fill={C.white} sw={10} /><path d={`M${x - w * 0.4} 344 L${x - w * 0.1} ${332 + len * 0.6}`} stroke={C.ink} strokeWidth={4} strokeLinecap="round" opacity={0.7} /></g>;
      })}
      {[[110, 470, 32], [372, 392, 24], [90, 330, 18]].map(([x, y, r], i) => <Bk key={i} d={spark(x, y, r * (0.75 + 0.25 * Math.sin(f * 0.9 + i * 2)) * clamp(ease((t - 0.1) / 0.15)))} fill={C.white} sw={6} />)}
      {steam > 0 && [[170, 440, 120], [280, 520, 150], [120, 600, 110], [330, 330, 100]].map(([x, y, r], i) => <Bk key={i} d={bumpy(ellp(x, y - (1 - steam) * 120, r * steam, r * 0.7 * steam, 8, 0.1, i), 20 * steam, i)} fill={C.white} sw={9} opacity={0.9 * steam} />)}
    </g>
  );
}
export function Curtain({ y = 1140 }: { y?: number }) {
  const top: Pt[] = Array.from({ length: 11 }, (_, i) => [-60 + i * 120, y + 8 * Math.sin(i * 1.3)] as Pt);
  const d = smooth(top, false) + "L1140 2000L-60 2000Z";
  return (
    <g>
      <path d={d} fill={C.ink} />
      {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={60 + (i % 6) * 180 + (Math.floor(i / 6) % 2) * 90} cy={y + 90 + Math.floor(i / 6) * 120} r={i % 3 ? 22 : 34} fill={C.cream} />)}
      <path d={d} fill="none" stroke={C.ink} strokeWidth={4} />
    </g>
  );
}

// ═════════════ under a stranger's sink ═════════════
export function Kitchen({ f }: { f: number }) {
  return (
    <g>
      <Wall c0="#d9c79a" c1="#7d6540" id="kitg" />
      {/* wallpaper stripes */}
      <g stroke={C.mid} strokeWidth={14} opacity={0.35}>{Array.from({ length: 14 }, (_, i) => <line key={i} x1={i * 90 - 20} y1={-20} x2={i * 90 - 20} y2={560} />)}</g>
      {/* faucet and window shelf */}
      <Bk d="M470 300 Q470 230 540 230 Q620 230 620 300 L620 330 L590 330 L590 300 Q590 262 545 262 Q500 262 500 300 L500 330 L470 330Z" fill={C.cream} sw={11} />
      <Bk d="M540 230 L540 180 L600 180" fill="none" sw={14} />
      <Bk d={rrect(120, 330, 840, 100, 14)} fill={C.cream} sw={13} />
      <Bk d={rrect(280, 322, 520, 30, 12)} fill={C.mid} sw={11} />
      {/* cabinet body */}
      <Bk d={rrect(150, 430, 780, 920, 10)} fill={C.tan} sw={14} />
      <Bk d={rrect(230, 500, 620, 760, 8)} fill={C.ink} sw={10} />
      {/* inside: pipes, trap, bucket */}
      <path d="M470 500 V760 Q470 840 540 840 Q610 840 610 760 V690" fill="none" stroke={C.ink} strokeWidth={54} strokeLinecap="round" />
      <path d="M470 500 V760 Q470 840 540 840 Q610 840 610 760 V690" fill="none" stroke={C.mid} strokeWidth={34} strokeLinecap="round" />
      <path d="M640 500 V640" stroke={C.ink} strokeWidth={46} strokeLinecap="round" /><path d="M640 500 V640" stroke={C.cream} strokeWidth={26} strokeLinecap="round" />
      <Bk d="M280 1090 L300 1190 L420 1190 L440 1090Z" fill={C.mid} sw={9} /><Bk d={ell(360, 1090, 80, 18)} fill={C.dark} sw={8} />
      <circle cx={540} cy={880 + ((f * 5) % 40)} r={9} fill={C.white} opacity={0.9} />
      {/* open doors */}
      <Bk d="M150 430 L60 470 L60 1290 L150 1350Z" fill={C.mid} sw={12} /><Bk d="M930 430 L1020 470 L1020 1290 L930 1350Z" fill={C.mid} sw={12} />
      <circle cx={92} cy={560} r={11} fill={C.ink} /><circle cx={988} cy={560} r={11} fill={C.ink} />
      {/* floor */}
      <Bk d="M-60 1340 H1140 V2000 H-60Z" fill={C.dark} sw={12} />
      <g stroke={C.ink} strokeWidth={5} opacity={0.6}>{Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${-60 + i * 240} 1340 L${-160 + i * 300} 2000`} />)}</g>
    </g>
  );
}
// Tony: only his legs, bent over into the cabinet. buzz 0..1 shakes the phone in his back pocket.
export function TonyLegs({ f, buzz = 0, wrench = 0 }: { f: number; buzz?: number; wrench?: number }) {
  const sway = Math.sin(f * 0.42) * 5;
  const kick = Math.sin(f * 0.84) * 3;
  const shk = buzz ? Math.sin(f * 4.2) * 9 * buzz : 0;
  return (
    <g transform={`translate(${f1(sway)} 0)`}>
      {/* his back, going into the dark: shirt with the AquaPro hem */}
      <Bk d={smooth([[390, 640], [690, 640], [730, 860], [700, 940], [380, 940], [350, 860]])} fill={C.mid} sw={13} />
      <path d="M400 900 H680" stroke={C.dark} strokeWidth={8} />
      <text x={540} y={928} textAnchor="middle" fontFamily={BEVAN} fontSize={52} fill={C.ink} letterSpacing={2}>AquaPro</text>
      {/* skin and the crack */}
      <Bk d="M400 940 L680 940 L694 1066 L386 1066Z" fill={C.cream} sw={11} />
      <path d="M540 940 V1070" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
      <path d="M516 1040 L540 1100 L564 1040Z" fill={C.ink} />
      {/* jeans */}
      <Bk d={smooth([[380, 1050], [700, 1050], [722, 1180], [690, 1320], [650, 1352], [572, 1352], [548, 1190], [532, 1190], [508, 1352], [430, 1352], [390, 1320], [358, 1180]])} fill={C.dark} sw={13} />
      <path d="M540 1070 V1200" stroke={C.ink} strokeWidth={7} />
      <path d="M380 1060 H700" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
      {[[-1, 410], [1, 600]].map(([sd, px]) => <path key={sd} d={`M${px} 1100 h90 v96 q-45 24 -90 0z`} fill={C.deep} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />)}
      {/* the phone in the back pocket */}
      <g transform={`translate(${f1(640 + shk)} ${f1(1090 - Math.abs(shk) * 0.3)}) rotate(${f1(8 + shk * 0.6)})`}>
        <Bk d={rrect(-28, -50, 56, 100, 10)} fill={C.cream} sw={7} />
        <rect x={-20} y={-40} width={40} height={72} rx={5} fill={buzz > 0 ? C.white : C.ink} />
        {buzz > 0 && [[-44, -10], [44, -10], [-52, 20], [52, 20]].map(([bx, by], i) => <path key={i} d={`M${bx} ${by} l${bx > 0 ? 18 : -18} -8`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />)}
      </g>
      <path d="M592 1100 h96 v96 q-48 24 -96 0z" fill="none" stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
      {/* boots */}
      {[[-1, 440, 1352], [1, 640, 1352]].map(([sd, bx, by]) => (
        <g key={sd} transform={`translate(0 ${sd < 0 ? kick : -kick})`}>
          <Bk d={`M${bx - 90} ${by - 10} h150 l20 60 q10 40 -20 46 h-190 q-26 -6 -6 -46z`} fill={C.ink} sw={11} />
          <path d={`M${bx - 70} ${by + 30} h120`} stroke={C.mid} strokeWidth={9} strokeLinecap="round" /><path d={`M${bx - 70} ${by + 8} l12 20 M${bx - 36} ${by + 8} l12 20 M${bx - 2} ${by + 8} l12 20`} stroke={C.cream} strokeWidth={6} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

// ═════════════ the Premier Plumbing office ═════════════
export function Office({ f }: { f: number }) {
  return (
    <g>
      <Wall c0="#e8dab0" c1="#7d6540" id="offg" />
      <g stroke={C.mid} strokeWidth={4} opacity={0.5}>{Array.from({ length: 9 }, (_, i) => <path key={i} d={wob(-40, 120 + i * 200, 1120, 110 + i * 200, 8)} fill="none" />)}</g>
      {/* the company sign */}
      <Bk d={rrect(190, 250, 700, 150, 16)} fill={C.cream} sw={14} />
      <Bk d={rrect(206, 266, 668, 118, 8)} fill="none" sw={5} />
      <text x={540} y={346} textAnchor="middle" fontFamily={BEVAN} fontSize={66} fill={C.ink} letterSpacing={3}>PREMIER</text>
      {/* window with blinds */}
      <Bk d={rrect(700, 470, 280, 360, 8)} fill={C.white} sw={13} />
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M706 ${490 + i * 38} H974`} stroke={C.mid} strokeWidth={14} />)}
      <Bk d={rrect(80, 500, 220, 130, 10)} fill={C.cream} sw={11} /><path d="M100 590 l50 -50 l36 30 l46 -56 l52 60" stroke={C.ink} strokeWidth={9} fill="none" strokeLinejoin="round" />
      {/* a plant */}
      <Bk d="M120 960 L150 1100 L260 1100 L290 960Z" fill={C.dark} sw={11} />
      {[[-60, -150], [0, -190], [60, -140], [-20, -110]].map(([lx, ly], i) => <Bk key={i} d={`M205 960 q${lx - 20} ${ly * 0.5} ${lx} ${ly} q${40} ${-ly * 0.1 + 20} 14 ${-ly + 8}z`} fill={C.mid} sw={9} />)}
    </g>
  );
}
export function OfficeTable() {
  return (
    <g>
      <Bk d="M-60 1180 H1140 V1230 H-60Z" fill={C.tan} sw={14} />
      <Bk d="M-60 1230 H1140 V2000 H-60Z" fill={C.dark} sw={14} />
      <Hatch x={-60} y={1250} w={1200} h={200} gap={44} col={C.deep} sw={6} />
    </g>
  );
}

// ═════════════ the school gym ═════════════
export function Gym({ f }: { f: number }) {
  return (
    <g>
      <Wall c0="#e2d3a6" c1="#6f5a38" id="gymg" cy="34%" />
      {/* back wall: stripes, a banner, hoops */}
      <g stroke={C.mid} strokeWidth={5} opacity={0.5}>{Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 100 - 30} y1={-20} x2={i * 100 - 30} y2={820} />)}</g>
      <Bk d={rrect(120, 270, 840, 110, 12)} fill={C.cream} sw={12} />
      <text x={540} y={346} textAnchor="middle" fontFamily={BEVAN} fontSize={64} fill={C.ink} letterSpacing={4}>SPRING SHOW</text>
      {/* stage: curtains and floor */}
      <Bk d="M120 420 H960 V840 H120Z" fill={C.dark} sw={14} />
      <Bk d="M120 420 Q170 520 160 840 H120Z" fill={C.deep} sw={10} /><Bk d="M960 420 Q910 520 920 840 H960Z" fill={C.deep} sw={10} />
      <Bk d="M96 840 H984 V900 H96Z" fill={C.tan} sw={13} />
    </g>
  );
}
// a person in the audience, seen from the front; turn 0..1 is the head swinging round towards the culprit (looks left)
export function AudHead({ f, x, y, s = 1, seed = 0, turn = 0, who = 0, dir = 1, cap = false }: { f: number; x: number; y: number; s?: number; seed?: number; turn?: number; who?: number; dir?: number; cap?: boolean }) {
  const hair = [C.ink, C.dark, C.deep, C.mid][who % 4];
  const sq = 1 + (turn > 0 && turn < 1 ? 0.06 : 0);
  return (
    <g transform={`translate(${f1(x)} ${f1(y - Math.abs(Math.sin(f * 0.21 + seed)) * 4 * s)}) scale(${s * sq} ${s})`}>
      <Bk d={smooth([[-130, 260], [-110, 120], [-60, 80], [60, 80], [110, 120], [130, 260]])} fill={[C.mid, C.dark, C.tan, C.deep][(who + 1) % 4]} sw={11} />
      <Bk d={smooth(ellp(0, 0, 88, 96, 10, 0.03, seed))} fill={C.cream} sw={11} />
      <Bk d={smooth([[-94, -10], [-84, -70], [0, -104], [84, -70], [94, -10], [50, -52], [-50, -52]])} fill={hair} sw={6} />
      {[-1, 1].map((sd) => <PieEyeLite key={sd} x={sd * 36 + turn * 22 * dir} y={2} turn={turn * -dir} />)}
      <Bk d={ell(turn * 22 * dir, 28, 12, 10)} fill={C.cream} sw={7} />
      {cap && <g><Bk d="M-96 -20 Q-90 -110 0 -112 Q90 -110 96 -20 Q0 -50 -96 -20Z" fill={C.dark} sw={8} /><Bk d="M-110 -22 Q0 14 110 -22 Q90 -40 0 -38 Q-90 -40 -110 -22Z" fill={C.white} sw={8} /></g>}
      <path d={`M${-26 + turn * 22 * dir} 62 H${26 + turn * 22 * dir}`} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
    </g>
  );
}
const PieEyeLite = ({ x, y, turn }: { x: number; y: number; turn: number }) => (
  <g transform={`translate(${f1(x)} ${f1(y)})`}><ellipse cx={turn * -6} cy={0} rx={13} ry={22} fill={C.ink} /><path d={`M${turn * -6 + 1} -2 L${turn * -6 + 12} -16 L${turn * -6 + 12} -3Z`} fill={C.white} /></g>
);
export function Seats() {
  return (
    <g>
      {[0, 1].map((r) => <Bk key={r} d={rrect(-40, 1380 + r * 180, 1160, 90, 14)} fill={C.dark} sw={12} />)}
    </g>
  );
}

// ═════════════ Gary's van, from the inside ═════════════
export function VanCab({ f, rumble = 0 }: { f: number; rumble?: number }) {
  const r = rumble ? Math.sin(f * 5.1) * 4 * rumble : 0;
  return (
    <g transform={`translate(${f1(r)} ${f1(Math.sin(f * 6.3) * 3 * rumble)})`}>
      <Wall c0="#9a8658" c1="#35291a" id="vang" />
      {/* the side window, with the taco place outside */}
      <g transform="translate(50 0)"><Bk d={rrect(40, 330, 470, 560, 26)} fill={C.cream} sw={16} />
      <rect x={60} y={350} width={430} height={520} rx={14} fill={C.tan} />
      <Bk d="M80 560 H470 V870 H80Z" fill={C.mid} sw={9} />
      <Bk d="M70 540 H480 L450 470 H100Z" fill={C.ink} sw={9} />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${100 + i * 68} 470 L${86 + i * 78} 540`} stroke={C.cream} strokeWidth={14} />)}
      <Bk d={rrect(120, 590, 310, 130, 12)} fill={C.cream} sw={10} />
      <text x={275} y={690} textAnchor="middle" fontFamily={BEVAN} fontSize={92} fill={C.ink} letterSpacing={4}>TACOS</text>
      <Bk d={rrect(120, 740, 310, 130, 10)} fill={C.dark} sw={8} />
      <circle cx={420} cy={420} r={34} fill={C.white} stroke={C.ink} strokeWidth={9} /></g>
      {/* dashboard bottom and the wheel */}
      <Bk d="M-60 1380 H1140 V2000 H-60Z" fill={C.ink} sw={4} />
      <Bk d="M-60 1330 Q540 1270 1140 1330 V1400 H-60Z" fill={C.dark} sw={14} />
      <Bk d={rrect(700, 1250, 90, 130, 14)} fill={C.cream} sw={9} /><rect x={712} y={1290} width={66} height={50} fill={C.mid} />
      <Bk d={rrect(840, 1262, 70, 120, 14)} fill={C.mid} sw={9} />
      {/* seat headrest behind him */}
      <Bk d={rrect(380, 620, 620, 700, 120)} fill={C.dark} sw={14} opacity={0.0} />
    </g>
  );
}
export function Wheel({ f, turn = 0 }: { f: number; turn?: number }) {
  return (
    <g transform={`translate(540 1560) rotate(${turn})`}>
      <path d="M-300 0 a300 140 0 0 1 600 0" fill="none" stroke={C.ink} strokeWidth={70} strokeLinecap="round" />
      <path d="M-300 0 a300 140 0 0 1 600 0" fill="none" stroke={C.dark} strokeWidth={46} strokeLinecap="round" />
    </g>
  );
}

// ═════════════ Denise's living room, evening ═════════════
export function Living({ f, t }: { f: number; t: number }) {
  return (
    <g>
      <Wall c0="#e8d7a8" c1="#6d5634" id="livg" cy="40%" />
      <g stroke={C.mid} strokeWidth={4} opacity={0.4}>{Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 100 - 30} y1={-20} x2={i * 100 - 30} y2={1200} />)}</g>
      {/* the bathroom door, ajar, with steam coming out */}
      <Bk d="M30 330 H290 V1180 H30Z" fill={C.ink} sw={14} />
      <Bk d="M30 330 L150 370 V1140 L30 1180Z" fill={C.tan} sw={12} /><circle cx={130} cy={780} r={12} fill={C.ink} />
      {[0, 1, 2, 3, 4].map((i) => { const u = ((t * 0.55 + i * 0.2) % 1); return <Bk key={i} d={bumpy(ellp(190 + Math.sin(u * 6 + i) * 30 + u * 60, 760 - u * 380, 36 + u * 40, 28 + u * 26, 8, 0.1, i), 12, i)} fill={C.white} sw={8} opacity={clamp(1 - u * 1.1) * 0.95} />; })}
      {/* window: drawn by the shot, over the van */}
      
      {/* picture frame */}
      <Bk d={rrect(930, 450, 160, 200, 10)} fill={C.cream} sw={11} />
      {/* the couch and the table are drawn by the shot */}
    </g>
  );
}
export function Couch() {
  return (
    <g>
      <Bk d={rrect(50, 880, 980, 520, 90)} fill={C.mid} sw={15} />
      <Bk d={rrect(10, 1100, 160, 330, 60)} fill={C.dark} sw={14} /><Bk d={rrect(910, 1100, 160, 330, 60)} fill={C.dark} sw={14} />
      <Bk d={rrect(120, 1150, 840, 290, 50)} fill={C.tan} sw={14} />
    </g>
  );
}
export function CoffeeTable() {
  return (
    <g>
      <Bk d="M60 1420 H1020 V1480 H60Z" fill={C.dark} sw={14} />
      <Bk d="M140 1480 V1700 M940 1480 V1700" stroke={C.ink} strokeWidth={34} strokeLinecap="round" fill="none" />
    </g>
  );
}
// Gary's dented white van, seen from the side, driving to the right (x is its centre)
export function Van({ f, x, y, s = 1 }: { f: number; x: number; y: number; s?: number }) {
  const bounce = Math.sin(f * 1.7) * 3, lean = Math.sin(f * 0.9) * 0.6;
  return (
    <g transform={`translate(${f1(x)} ${f1(y + bounce)}) rotate(${f1(lean)}) scale(${s})`}>
      <Bk d="M-250 -130 H110 Q190 -130 220 -50 L260 20 V100 H-250Z" fill={C.white} sw={13} />
      <Bk d="M130 -112 Q172 -112 196 -54 L214 -14 H130Z" fill={C.dark} sw={10} />
      <path d="M-120 -80 q40 30 20 90 q-40 -10 -60 -60z" fill={C.mid} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      <path d="M-140 -10 l30 20 l-10 -34" stroke={C.ink} strokeWidth={7} fill="none" strokeLinecap="round" />
      <text x={-60} y={52} textAnchor="middle" fontFamily={BEVAN} fontSize={46} fill={C.ink} letterSpacing={1}>GARY'S - CASH ONLY</text>
      <path d="M-250 100 H260" stroke={C.ink} strokeWidth={13} />
      {[-150, 130].map((wx) => <g key={wx}><Bk d={ell(wx, 100, 54, 54)} fill={C.ink} sw={9} /><Bk d={ell(wx, 100, 24, 24)} fill={C.tan} sw={6} /></g>)}
      <path d="M-262 -20 q-26 6 -34 30" stroke={C.ink} strokeWidth={7} fill="none" strokeLinecap="round" />
    </g>
  );
}
