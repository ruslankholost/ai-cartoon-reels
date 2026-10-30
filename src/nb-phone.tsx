import React from "react";
import { BEVAN, Bk, C, Drip, clamp, ease, ell, f1, popAt, rrect, star5 } from "./nb-kit";

// Phones in the period look (cream shell, thick ink, slab lettering) with screens you can read at phone size.
// A phone is drawn in its own coordinates: shell 600 x 1000, screen 520 x 860 at (40, 70).
export const SW = 520, SH = 860;
const T = ({ x, y, size, children, anchor = "start", fill = C.ink, ls = 0 }: { x: number; y: number; size: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; fill?: string; ls?: number }) => (
  <text x={x} y={y} fontFamily={BEVAN} fontSize={size} fill={fill} textAnchor={anchor} letterSpacing={ls}>{children}</text>
);

export function PhoneBody({ x = 540, y = 800, s = 1, rot = 0, glow = 0, children, shake = 0 }: { x?: number; y?: number; s?: number; rot?: number; glow?: number; children?: React.ReactNode; shake?: number }) {
  return (
    <g transform={`translate(${f1(x + shake)} ${f1(y)}) rotate(${f1(rot)}) scale(${s}) translate(-300 -500)`}>
      {glow > 0 && <g opacity={glow}>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => { const a = (i / 10) * Math.PI * 2; return <line key={i} x1={300 + Math.cos(a) * 340} y1={500 + Math.sin(a) * 560} x2={300 + Math.cos(a) * 420} y2={500 + Math.sin(a) * 660} stroke={C.ink} strokeWidth={14} strokeLinecap="round" />; })}</g>}
      <Bk d={rrect(0, 0, 600, 1000, 84)} fill={C.cream} sw={16} />
      <Bk d={rrect(34, 62, 532, 876, 30)} fill={C.ink} sw={4} />
      <g transform="translate(40 70)">
        <clipPath id="scr"><path d={rrect(0, 0, SW, SH, 24)} /></clipPath>
        <g clipPath="url(#scr)">{children}</g>
      </g>
      <Bk d={ell(300, 38, 44, 9)} fill={C.dark} sw={5} />
      <Bk d={ell(300, 972, 24, 22)} fill={C.cream} sw={8} />
    </g>
  );
}

export const Star = ({ x, y, r = 22 }: { x: number; y: number; r?: number }) => <Bk d={star5(x, y, r)} fill={C.ink} sw={4} />;

export type Row = { name: string; rating: string; open?: boolean; pop?: number; hot?: boolean };
export const ROWS_TOP: Row[] = [{ name: "AquaPro", rating: "5.0" }, { name: "Premier Plumbing", rating: "4.9" }, { name: "Flow Bros", rating: "4.8" }];
export const ROW_GARY: Row = { name: "Gary's Plumbing", rating: "2.1", open: true };
const FILLERS: Row[] = [{ name: "City Plumbing", rating: "4.6" }, { name: "Metro Plumbing", rating: "4.4" }, { name: "Pipe Masters", rating: "4.2" }, { name: "Quick Drain", rating: "3.9" }, { name: "Budget Plumbing", rating: "3.2" }];
export const LIST_LONG: Row[] = [...ROWS_TOP, ...FILLERS, ROW_GARY];

const RowView = ({ r, y }: { r: Row; y: number }) => {
  const p = r.pop ?? 1;
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x={0} y={0} width={SW} height={176} fill={r.hot ? C.tan : C.white} />
      <path d={`M0 176 H${SW}`} stroke={C.ink} strokeWidth={6} />
      <T x={28} y={62} size={r.name.length > 14 ? 41 : 46}>{r.name}</T>
      <g transform={`translate(28 98) scale(${p})`} style={{ transformBox: "fill-box" }}>
        <Star x={26} y={36} r={28} />
        <T x={66} y={56} size={56}>{r.rating}</T>
        {r.open && <g><Bk d={rrect(190, 8, 250, 62, 31)} fill={C.ink} sw={4} /><T x={315} y={52} size={34} anchor="middle" fill={C.white}>Open now</T></g>}
      </g>
    </g>
  );
};
export function SearchScreen({ rows, typed = "plumber near me", scroll = 0, dots = true, pops = [] }: { rows: Row[]; typed?: string; scroll?: number; dots?: boolean; pops?: number[] }) {
  return (
    <g>
      <rect width={SW} height={SH} fill={C.white} />
      <g transform={`translate(0 ${-scroll})`}>
        {rows.map((r, i) => <RowView key={i} r={{ ...r, pop: pops[i] ?? r.pop }} y={156 + i * 176 + (dots && i === 3 && rows.length === 4 ? 40 : 0)} />)}
        {dots && rows.length === 4 && <T x={SW / 2} y={156 + 3 * 176 + 8} size={56} anchor="middle">· · ·</T>}
      </g>
      <rect width={SW} height={150} fill={C.cream} />
      <path d={`M0 150 H${SW}`} stroke={C.ink} strokeWidth={8} />
      <Bk d={rrect(18, 28, 484, 92, 46)} fill={C.white} sw={7} />
      <circle cx={64} cy={72} r={16} fill="none" stroke={C.ink} strokeWidth={7} /><line x1={76} y1={84} x2={90} y2={98} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
      <T x={104} y={88} size={38}>{typed}</T>
    </g>
  );
}
export function CallScreen({ title, sub = "Calling", f = 0, dark = false }: { title: string; sub?: string; f?: number; dark?: boolean }) {
  const n = Math.floor(f / 8) % 4;
  return (
    <g>
      <rect width={SW} height={SH} fill={dark ? C.ink : C.tan} />
      <T x={SW / 2} y={170} size={70} anchor="middle" fill={dark ? C.white : C.ink}>{sub}{".".repeat(n)}</T>
      <Bk d={ell(SW / 2, 380, 110, 110)} fill={C.cream} sw={10} />
      <T x={SW / 2} y={410} size={110} anchor="middle">{title[0]}</T>
      <T x={SW / 2} y={590} size={title.length > 12 ? 52 : 64} anchor="middle" fill={dark ? C.white : C.ink}>{title}</T>
      <Bk d={ell(SW / 2, 744, 70, 70)} fill={C.ink} sw={8} stroke={C.white} />
      <path d="M-30 6 q30 -34 60 0" transform={`translate(${SW / 2} 744)`} stroke={C.white} strokeWidth={14} fill="none" strokeLinecap="round" />
    </g>
  );
}
export function IncomingScreen({ f }: { f: number }) {
  const w = Math.sin(f * 1.1) * 6;
  return (
    <g>
      <rect width={SW} height={SH} fill={C.white} />
      <T x={SW / 2} y={170} size={66} anchor="middle">Incoming</T>
      <T x={SW / 2} y={250} size={66} anchor="middle">call</T>
      <g transform={`translate(${SW / 2} 450) rotate(${w})`}>
        <Bk d={ell(0, 0, 130, 130)} fill={C.cream} sw={10} />
        <path d="M-52 -40 q-16 60 40 100 q30 20 52 -6 l-30 -34 l-24 14 q-26 -22 -34 -50 l22 -14 l-34 -34z" fill={C.ink} />
      </g>
      <T x={SW / 2} y={680} size={52} anchor="middle">Unknown caller</T>
      <Bk d={ell(140, 780, 56, 56)} fill={C.ink} sw={6} /><Bk d={ell(380, 780, 56, 56)} fill={C.dark} sw={6} />
    </g>
  );
}
export function LockScreen({ f, lit }: { f: number; lit: number }) {
  const p = popAt(f / 30, 0.05, 0.3);
  return (
    <g opacity={0.25 + 0.75 * lit}>
      <rect width={SW} height={SH} fill={C.tan} />
      <T x={SW / 2} y={190} size={116} anchor="middle">6:47</T>
      <T x={SW / 2} y={270} size={50} anchor="middle">PM</T>
      <g transform={`translate(${SW / 2} 520) scale(${0.5 + 0.5 * p})`}>
        <Bk d={rrect(-236, -150, 472, 300, 34)} fill={C.white} sw={9} />
        <T x={0} y={-70} size={46} anchor="middle">Premier Plumbing</T>
        <Star x={-64} y={-6} r={24} />
        <T x={-26} y={14} size={56}>4.9</T>
        <T x={0} y={104} size={56} anchor="middle">calling</T>
      </g>
      <Bk d={ell(150, 770, 52, 52)} fill={C.ink} sw={6} /><Bk d={ell(370, 770, 52, 52)} fill={C.dark} sw={6} />
    </g>
  );
}
export function PhoneBack() {
  return (
    <g>
      <rect width={SW} height={SH} fill={C.dark} />
      <Bk d={ell(SW / 2, 330, 90, 90)} fill={C.mid} sw={10} />
      <Bk d={ell(SW / 2, 330, 40, 40)} fill={C.ink} sw={6} />
      <path d={`M60 650 H${SW - 60}`} stroke={C.mid} strokeWidth={10} strokeLinecap="round" />
    </g>
  );
}
// foam blobs landing on a screen (screen coords): each lands at t0 with a squash, then drips
export function ScreenFoam({ t, blobs }: { t: number; blobs: { x: number; y: number; r: number; t0: number; len?: number }[] }) {
  return (
    <g>
      {blobs.map((b, i) => {
        const u = t - b.t0;
        if (u < -0.3) return null;
        const falling = u < 0;
        const sq = u >= 0 && u < 0.18 ? 1 + 0.5 * Math.sin((u / 0.18) * Math.PI) : 1;
        const yy = falling ? b.y - (-u / 0.3) * 240 : b.y;
        return <g key={i} transform={`translate(${b.x} ${yy}) scale(${1 / Math.sqrt(sq)} ${sq}) translate(${-b.x} ${-b.y})`}><Drip x={b.x} y={b.y} r={b.r} len={falling ? 0 : (b.len ?? 0) * clamp(ease(u / 1.2))} seed={i} /></g>;
      })}
    </g>
  );
}
