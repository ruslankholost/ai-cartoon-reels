import React from "react";
import { BEVAN, Bk, Brow, C, Drip, Glove, Hose, Mouth, PieEye, Pt, bob, bumpy, clamp, ell, ellp, f1, lin, rnd, rrect, smooth } from "./nb-kit";

// The cast of "Nobody Picks Up" in the rubber-hose look. Every character is drawn around its own origin (the centre of the
// head) and placed with x, y, s; each one bounces and sways on the beat. Arms are black noodles from the shoulder to a white glove.
export type Arm = { to: Pt; bend?: number; pose?: "mitt" | "fist" | "point" | "open"; rot?: number; gs?: number };
export type Look = [number, number];

const chest = (f: number, seed: number) => 1 + Math.sin(f * 0.42 + seed) * 0.012;
const Frame = ({ f, x, y, s = 1, seed = 0, sway = 1, children }: { f: number; x: number; y: number; s?: number; seed?: number; sway?: number; children: React.ReactNode }) => (
  <g transform={`translate(${f1(x)} ${f1(y + bob(f, seed, 7 * s))}) rotate(${f1(Math.sin(f * 0.21 + seed) * 1.1 * sway)}) scale(${f1(s * 1000) / 1000} ${f1(s * chest(f, seed) * 1000) / 1000})`}>{children}</g>
);
const ArmDraw = ({ f, from, arm, seed, w = 30 }: { f: number; from: Pt; arm: Arm; seed: number; w?: number }) => {
  const wave = Math.sin(f * 0.42 + seed) * 12;
  return (
    <g>
      <Hose a={from} b={arm.to} bend={arm.bend ?? 60} wave={wave} w={w} />
      <Glove x={arm.to[0]} y={arm.to[1]} rot={arm.rot ?? 0} s={arm.gs ?? 1} pose={arm.pose ?? "mitt"} />
    </g>
  );
};

// ═══════════════════════ DENISE ═══════════════════════
export type DeniseP = {
  f: number; x: number; y: number; s?: number; seed?: number; mode?: "bath" | "robe";
  foam?: number; eyes?: "shut" | "open" | "angry" | "sad" | "wide" | "closed"; look?: Look; blink?: number; mouth?: number; mood?: number;
  shiver?: number; towel?: boolean; goose?: number; armL?: Arm; armR?: Arm; foamEye?: number; chin?: number; nose?: number; brow?: number; front?: React.ReactNode; mid?: React.ReactNode; dx?: number; dy?: number; sq?: number;
};
const lock = (x0: number, y0: number, x1: number, y1: number, w: number, bow: number) => `M${f1(x0 - w / 2)} ${f1(y0)}Q${f1((x0 + x1) / 2 - w / 2 + bow)} ${f1((y0 + y1) / 2)} ${f1(x1)} ${f1(y1)}Q${f1((x0 + x1) / 2 + w / 2 + bow)} ${f1((y0 + y1) / 2)} ${f1(x0 + w / 2)} ${f1(y0)}Z`;
const TL: Pt[] = [[-215, -120], [-236, -195], [-204, -268], [-232, -340], [-194, -410], [-150, -458], [-70, -494]];
const mirX = (p: Pt): Pt => [-p[0], p[1]];
const TOWER = bumpy([...TL, [0, -506], ...[...TL].reverse().map(mirX), [150, -108], [0, -98], [-150, -108]], 24);

export function Denise(p: DeniseP) {
  const { f, x, y, s = 1, seed = 0, mode = "bath", foam = 0, eyes = "open", look = [0, 0], blink = 0, mouth = 0, mood = 0, shiver = 0, goose = 0, towel = false } = p;
  const sx = shiver ? Math.sin(f * 2.3) * 4 * shiver + (rnd(f, 5) - 0.5) * 3 * shiver : 0;
  const slide = foam * 70;
  const robe = mode === "robe";
  const S_l: Pt = [-232, 330], S_r: Pt = [232, 330];
  const eyeY = -28, ex = 84;
  const bang = eyes === "angry" ? 18 : eyes === "sad" ? -14 : 0;
  return (
    <Frame f={f} x={x + sx + (p.dx ?? 0)} y={y + (p.dy ?? 0)} s={s} seed={seed} sway={shiver ? 0.3 : 1}>
      {/* body */}
      {!robe && (
        <>
          <Bk d={smooth([[-72, 150], [72, 150], [80, 280], [-80, 280]])} fill={C.cream} sw={11} />
          <Bk d={smooth([[-318, 520], [-306, 372], [-236, 292], [-104, 252], [0, 246], [104, 252], [236, 292], [306, 372], [318, 520]])} fill={C.cream} sw={12} />
          <g fill="none" stroke={C.ink} strokeWidth={7} strokeLinecap="round"><path d="M-110 300 Q-60 322 -8 300" /><path d="M110 300 Q60 322 8 300" /></g>
          {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={i % 2 ? -250 + rnd(i, 3) * 90 : 160 + rnd(i, 4) * 90} cy={330 + rnd(i, 5) * 50} r={4} fill={C.dark} />)}
          {goose > 0 && [[-262, 318], [262, 312], [-210, 292], [208, 288]].map(([gx, gy], i) => (
            <g key={i} transform={`translate(${gx} ${gy}) scale(${clamp(goose * 1.2 - i * 0.05)})`} fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round"><path d="M-14 10 l-9 -14 M0 2 l0 -18 M14 10 l9 -14" /></g>
          ))}
          {towel && (
            <g>
              <Bk d={smooth([[-326, 540], [-318, 380], [-240, 290], [-110, 262], [0, 258], [110, 262], [240, 290], [318, 380], [326, 540], [200, 470], [0, 440], [-200, 470]])} fill={C.mid} sw={12} />
              {[-250, -140, -30, 80, 190].map((tx, i) => <path key={i} d={`M${tx} ${300 + Math.abs(tx) * 0.12} l8 130`} stroke={C.dark} strokeWidth={9} strokeLinecap="round" />)}
            </g>
          )}
        </>
      )}
      {robe && (
        <>
          <Bk d={smooth([[-72, 150], [72, 150], [80, 280], [-80, 280]])} fill={C.cream} sw={11} />
          <Bk d={smooth([[-330, 560], [-318, 380], [-240, 296], [-110, 262], [0, 256], [110, 262], [240, 296], [318, 380], [330, 560]])} fill={C.white} sw={12} />
          <Bk d="M-96 262 L0 470 L96 262 L58 252 L0 360 L-58 252Z" fill={C.mid} sw={10} />
          <Bk d="M-60 252 L0 360 L60 252 L40 246 L0 300 L-40 246Z" fill={C.cream} sw={8} />
          <path d="M-330 470 Q-165 520 0 480 Q165 520 330 470" fill="none" stroke={C.dark} strokeWidth={16} strokeLinecap="round" />
          {[-200, -90, 90, 200].map((tx, i) => <path key={i} d={`M${tx} 320 l${tx > 0 ? 6 : -6} 90`} stroke={C.mid} strokeWidth={8} strokeLinecap="round" />)}
        </>
      )}
      {/* back hair, long wet locks */}
      <Bk d={smooth(ellp(0, -22, 224, 228, 14, 0.03, 2))} fill={C.ink} sw={4} />
      {[-1, 1].map((sd) => (
        <g key={sd}>
          <path d={lock(sd * 214, -70, sd * 262, 360, 52, sd * 8)} fill={C.ink} />
          <path d={lock(sd * 196, -20, sd * 222, 290, 40, sd * 6)} fill={C.ink} />
          <path d={lock(sd * 236, 60, sd * 286, 260, 30, sd * 10)} fill={C.ink} />
          <path d={`M${sd * 216} -20 Q${sd * 238} 120 ${sd * 258} 300`} fill="none" stroke={C.cream} strokeWidth={5} strokeLinecap="round" opacity={0.85} strokeDasharray="90 40" />
          <path d={`M${sd * 232} 330 q${sd * 4} 26 0 40`} stroke={C.ink} strokeWidth={10} strokeLinecap="round" fill="none" />
        </g>
      ))}
      {/* face */}
      <Bk d={smooth(ellp(0, 0, 190, 202, 12, 0.025, 1))} fill={C.cream} sw={13} />
      {[-1, 1].map((sd) => <ellipse key={sd} cx={sd * 122} cy={58} rx={36} ry={26} fill={C.mid} opacity={0.7} />)}
      {/* eyes */}
      {eyes === "shut" && [-1, 1].map((sd) => (
        <g key={sd} fill="none" stroke={C.ink} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${sd * 132} ${eyeY - 44}Q${sd * 90} ${eyeY - 20} ${sd * 46} ${eyeY + 10}`} strokeWidth={22} />
          {[0, 1, 2].map((k) => <line key={k} x1={sd * 142} y1={eyeY - 6 + k * 18} x2={sd * 170} y2={eyeY - 16 + k * 28} strokeWidth={6} />)}
        </g>
      ))}
      {eyes === "closed" && [-1, 1].map((sd) => <path key={sd} d={`M${sd * ex - 44} ${eyeY} Q${sd * ex} ${eyeY + 34} ${sd * ex + 44} ${eyeY}`} fill="none" stroke={C.ink} strokeWidth={13} strokeLinecap="round" />)}
      {(eyes === "open" || eyes === "angry" || eyes === "sad" || eyes === "wide") && [-1, 1].map((sd) => (
        <PieEye key={sd} x={sd * ex} y={eyeY} r={eyes === "wide" ? 42 : 36} dx={look[0]} dy={look[1]} blink={blink} wedge={sd > 0 ? 0 : 56} />
      ))}
      {eyes !== "shut" && eyes !== "closed" && [-1, 1].map((sd) => <Brow key={sd} x={sd * ex} y={eyeY - (eyes === "wide" ? 76 : 62)} w={86} rot={-sd * bang} th={15} />)}
      {eyes === "shut" && [-1, 1].map((sd) => <Brow key={`b${sd}`} x={sd * 96} y={eyeY - 62} w={96} rot={sd * -16} th={16} />)}
      <Bk d={ell(0, 30, 22, 19)} fill={C.cream} sw={9} />
      <circle cx={-7} cy={24} r={5} fill={C.white} />
      <Mouth x={0} y={108} w={176} open={mouth} mood={mood} teeth={mouth > 0.4 ? 1 : 0} />
      {/* wet bangs, plastered on the forehead */}
      {[[-132, -168, -154, -66], [-82, -186, -92, -92], [-28, -194, -34, -118], [30, -194, 44, -108], [86, -186, 112, -80], [136, -166, 168, -52]].map(([a, b, c, d], i) => (
        <path key={i} d={lock(a, b, c, d, 54, i % 2 ? 10 : -10)} fill={C.ink} />
      ))}
      {/* foam tower + what slid off it */}
      {!robe && <g transform={`translate(0 ${f1(slide)})`}>
        <Bk d={TOWER} fill={C.white} sw={13} />
        <g fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round">
          {[[118, -330], [146, -262], [-170, -300], [-120, -420], [150, -170]].map(([hx, hy], i) => <path key={i} d={`M${hx} ${hy} q16 -10 34 -6 M${hx + 6} ${hy + 20} q16 -10 30 -6`} />)}
        </g>
        <Drip x={-196} y={-104} r={22} len={64} seed={1} />
        <Drip x={206} y={-98} r={20} len={44} seed={2} />
      </g>}
      {!robe && [[-300, -230, 18], [262, -380, 14], [296, -150, 11], [-290, -420, 12], [330, -300, 9]].map(([bx, by, r], i) => (
        <g key={i}><Bk d={ell(bx, by + Math.sin(f * 0.3 + i) * 3 + slide * 0.2, r, r)} fill={C.white} sw={7} /><circle cx={bx - r * 0.3} cy={by - r * 0.3 + Math.sin(f * 0.3 + i) * 3 + slide * 0.2} r={r * 0.2} fill={C.dark} /></g>
      ))}
      {(p.brow ?? 0) > 0 && <Drip x={-20} y={-150 + slide * 0.5} r={40 * p.brow!} len={50 * p.brow!} seed={3} />}
      {(p.foamEye ?? 0) > 0 && <Drip x={-ex} y={eyeY - 20} r={54 * p.foamEye!} len={90 * p.foamEye!} seed={4} />}
      {(p.nose ?? 0) > 0 && <Drip x={0} y={14} r={18 * p.nose!} len={0} seed={5} />}
      {(p.chin ?? 0) > 0 && <Drip x={34} y={186} r={22} len={clamp(p.chin!, 0, 3) * 70} seed={6} />}
      {shiver > 0 && [-1, 1].map((sd) => [0, 1, 2].map((k) => <line key={`${sd}${k}`} x1={sd * (262 + k * 6) + (rnd(f, k + 7) - 0.5) * 6} y1={-40 + k * 46} x2={sd * (302 + k * 6)} y2={-30 + k * 46} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />))}
      {/* arms, in front */}
      {p.mid}
      {p.armL && <ArmDraw f={f} from={S_l} arm={p.armL} seed={seed + 1} />}
      {p.armR && <ArmDraw f={f} from={S_r} arm={p.armR} seed={seed + 2} />}
      {p.front}
    </Frame>
  );
}

// ═══════════════════════ GENERIC FOLK ═══════════════════════
export type FolkP = {
  f: number; x: number; y: number; s?: number; seed?: number; rx?: number; ry?: number; torsoW?: number; torsoFill?: string; collar?: React.ReactNode;
  hair?: "short" | "slick" | "bun" | "bald" | "none"; hairFill?: string; eyes?: "open" | "angry" | "sad" | "wide" | "closed" | "lids";
  look?: Look; blink?: number; mouth?: number; mood?: number; lid?: number; brow?: number; armL?: Arm; armR?: Arm; sway?: number; hat?: React.ReactNode; torsoOver?: React.ReactNode; behind?: React.ReactNode; front?: React.ReactNode;
  nose?: number; cheek?: number; dx?: number; dy?: number; rot?: number; stubble?: boolean; bodyH?: number; mid?: React.ReactNode;
};
export function Folk(p: FolkP) {
  const { f, x, y, s = 1, seed = 0, rx = 150, ry = 160, torsoW = 400, torsoFill = C.mid, hair = "short", hairFill = C.ink, eyes = "open", look = [0, 0], blink = 0, mouth = 0, mood = 0, lid = 0 } = p;
  const eyeY = -ry * 0.12, ex = rx * 0.46, er = rx * 0.2;
  const sh = ry + 70, tw = torsoW / 2;
  const ang = eyes === "angry" ? 16 : eyes === "sad" ? -14 : 0;
  return (
    <Frame f={f} x={x + (p.dx ?? 0)} y={y + (p.dy ?? 0)} s={s} seed={seed} sway={p.sway ?? 1}>
      <g transform={p.rot ? `rotate(${p.rot} 0 ${sh})` : undefined}>
        {p.behind}
        <Bk d={smooth([[-tw * 0.22, ry - 20], [tw * 0.22, ry - 20], [tw * 0.26, ry + 100], [-tw * 0.26, ry + 100]])} fill={C.cream} sw={11} />
        <Bk d={smooth([[-tw, ry + (p.bodyH ?? 700)], [-tw + 6, ry + 140], [-tw * 0.66, ry + 62], [-tw * 0.3, ry + 40], [0, ry + 36], [tw * 0.3, ry + 40], [tw * 0.66, ry + 62], [tw - 6, ry + 140], [tw, ry + (p.bodyH ?? 700)]])} fill={torsoFill} sw={12} />
        {p.collar}
        {p.torsoOver}
        {/* ears */}
        {[-1, 1].map((sd) => <Bk key={sd} d={ell(sd * (rx - 4), ry * 0.06, 26, 38)} fill={C.cream} sw={9} />)}
        {/* hair behind the face */}
        {hair === "short" && <Bk d={smooth(ellp(0, -ry * 0.12, rx + 10, ry + 6, 12, 0.02, 3))} fill={hairFill} sw={4} />}
        {hair === "slick" && <Bk d={smooth(ellp(0, -ry * 0.1, rx + 8, ry + 6, 12, 0.02, 4))} fill={hairFill} sw={4} />}
        {hair === "bun" && <><Bk d={ell(0, -ry - 36, 62, 52)} fill={hairFill} sw={6} /><Bk d={smooth(ellp(0, -ry * 0.1, rx + 12, ry + 10, 12, 0.02, 5))} fill={hairFill} sw={4} /></>}
        <Bk d={smooth(ellp(0, 0, rx, ry, 12, 0.025, seed + 1))} fill={C.cream} sw={13} />
        {/* hair over the forehead */}
        {hair === "short" && <Bk d={smooth([[-rx + 6, -ry * 0.1], [-rx * 0.8, -ry * 0.72], [-rx * 0.3, -ry * 0.96], [rx * 0.3, -ry * 0.98], [rx * 0.82, -ry * 0.7], [rx - 6, -ry * 0.1], [rx * 0.55, -ry * 0.48], [0, -ry * 0.42], [-rx * 0.5, -ry * 0.5]])} fill={hairFill} sw={5} />}
        {hair === "slick" && <><Bk d={smooth([[-rx + 6, -ry * 0.12], [-rx * 0.8, -ry * 0.74], [-rx * 0.2, -ry * 1.02], [rx * 0.5, -ry * 0.92], [rx - 6, -ry * 0.18], [rx * 0.5, -ry * 0.52], [-rx * 0.1, -ry * 0.58], [-rx * 0.6, -ry * 0.36]])} fill={hairFill} sw={5} /><path d={`M${-rx * 0.5} ${-ry * 0.82} Q0 ${-ry * 0.98} ${rx * 0.5} ${-ry * 0.74}`} stroke={C.cream} strokeWidth={6} fill="none" strokeLinecap="round" /></>}
        {hair === "bun" && <Bk d={smooth([[-rx + 6, -ry * 0.05], [-rx * 0.8, -ry * 0.7], [0, -ry * 0.98], [rx * 0.8, -ry * 0.7], [rx - 6, -ry * 0.05], [rx * 0.4, -ry * 0.55], [-rx * 0.4, -ry * 0.55]])} fill={hairFill} sw={5} />}
        {hair === "bald" && <path d={`M${-rx * 0.5} ${-ry * 0.8} Q${-rx * 0.1} ${-ry * 0.96} ${rx * 0.25} ${-ry * 0.92}`} stroke={C.white} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.9} />}
        {p.hat}
        {/* cheeks, eyes, nose, mouth */}
        {(p.cheek ?? 1) > 0 && [-1, 1].map((sd) => <ellipse key={sd} cx={sd * rx * 0.66} cy={ry * 0.3} rx={rx * 0.2} ry={ry * 0.14} fill={C.mid} opacity={0.65} />)}
        {eyes === "closed" && [-1, 1].map((sd) => <path key={sd} d={`M${sd * ex - er * 1.2} ${eyeY} Q${sd * ex} ${eyeY + er} ${sd * ex + er * 1.2} ${eyeY}`} fill="none" stroke={C.ink} strokeWidth={11} strokeLinecap="round" />)}
        {eyes !== "closed" && [-1, 1].map((sd) => <PieEye key={sd} x={sd * ex} y={eyeY} r={eyes === "wide" ? er * 1.2 : er} dx={look[0]} dy={look[1]} blink={blink} lid={eyes === "lids" ? 0.46 + lid : lid} wedge={sd > 0 ? 0 : 56} lidFill={C.cream} />)}
        {eyes !== "closed" && [-1, 1].map((sd) => <Brow key={`b${sd}`} x={sd * ex} y={eyeY - er * (eyes === "lids" ? 1.9 : 1.75) - (p.brow ?? 0)} w={rx * 0.5} rot={-sd * ang} th={13} />)}
        <Bk d={ell(0, ry * 0.18, rx * 0.15 * (p.nose ?? 1), rx * 0.12 * (p.nose ?? 1))} fill={C.cream} sw={9} />
        {p.stubble && Array.from({ length: 34 }, (_, i) => { const a = 0.15 * Math.PI + rnd(i, 40) * 0.7 * Math.PI, r = 0.62 + rnd(i, 41) * 0.3; return <circle key={i} cx={Math.cos(a) * rx * r} cy={Math.sin(a) * ry * r + 6} r={3 + rnd(i, 42) * 1.5} fill={C.dark} />; })}
        {p.front}
        {p.mid}
        {p.armL && <ArmDraw f={f} from={[-tw * 0.7, sh + 40]} arm={p.armL} seed={seed + 1} />}
        {p.armR && <ArmDraw f={f} from={[tw * 0.7, sh + 40]} arm={p.armR} seed={seed + 2} />}
      </g>
    </Frame>
  );
}
export const FolkMouth = (props: React.ComponentProps<typeof Mouth>) => <Mouth {...props} />;

// ═══════════════════════ the small cast, on top of Folk ═══════════════════════
export const MARCO_FILL = C.mid;
export function Marco(p: Omit<FolkP, "torsoFill" | "hair"> & { mouthAmt?: number }) {
  const rx = 150, ry = 160;
  return (
    <Folk {...p} rx={rx} ry={ry} torsoW={420} torsoFill={C.mid} hair="short"
      collar={<g><Bk d="M-70 238 L-24 226 L0 290 L-110 270Z" fill={C.white} sw={9} /><Bk d="M70 238 L24 226 L0 290 L110 270Z" fill={C.white} sw={9} /><path d="M0 290 L0 460" stroke={C.ink} strokeWidth={7} />{[330, 390, 440].map((by) => <circle key={by} cx={0} cy={by} r={7} fill={C.ink} />)}</g>}
      torsoOver={<g><Bk d={ell(-120, 380, 50, 38)} fill={C.white} sw={8} /><text x={-120} y={394} textAnchor="middle" fontFamily={BEVAN} fontSize={46} fill={C.ink}>P</text></g>}
      front={<Mouth x={0} y={ry * 0.52} w={96} open={p.mouth ?? 0} mood={p.mood ?? 0.3} />}
    />
  );
}
export function Agency(p: Omit<FolkP, "torsoFill" | "hair">) {
  const rx = 146, ry = 158;
  return (
    <Folk {...p} rx={rx} ry={ry} torsoW={440} torsoFill={C.cream} hair="slick"
      hat={<g transform="translate(0 -128) rotate(-6)"><Bk d="M-96 -6 Q-90 -34 -50 -30 Q-8 -24 -4 6 Q-8 34 -50 32 Q-92 30 -96 -6Z" fill={C.ink} sw={7} /><Bk d="M96 -6 Q90 -34 50 -30 Q8 -24 4 6 Q8 34 50 32 Q92 30 96 -6Z" fill={C.ink} sw={7} /><path d="M-4 -4 L4 -4" stroke={C.ink} strokeWidth={10} /><path d="M-78 -12 q16 -10 34 -6 M52 -18 q16 -4 28 6" stroke={C.white} strokeWidth={5} fill="none" strokeLinecap="round" /></g>}
      torsoOver={<g><Bk d={smooth([[-216, 700], [-210, 190], [-120, 150], [-26, 190], [-26, 700]])} fill={C.dark} sw={11} /><Bk d={smooth([[216, 700], [210, 190], [120, 150], [26, 190], [26, 700]])} fill={C.dark} sw={11} />{[270, 350, 430, 510].map((qy) => <path key={qy} d={`M-210 ${qy} Q-120 ${qy + 14} -26 ${qy} M210 ${qy} Q120 ${qy + 14} 26 ${qy}`} stroke={C.ink} strokeWidth={6} fill="none" />)}<path d="M-26 190 L-26 700 M26 190 L26 700" stroke={C.ink} strokeWidth={8} /></g>}
      front={<Mouth x={0} y={ry * 0.5} w={130} open={p.mouth ?? 0} mood={0.9} teeth={1} />}
    />
  );
}
export function Rick(p: Omit<FolkP, "torsoFill" | "hair">) {
  const rx = 160, ry = 160;
  return (
    <Folk {...p} rx={rx} ry={ry} torsoW={470} torsoFill={C.cream} hair="none"
      hat={<g>
        <Bk d={smooth([[-rx + 4, -ry * 0.18], [-rx * 0.86, -ry * 0.82], [-rx * 0.3, -ry * 1.12], [rx * 0.3, -ry * 1.12], [rx * 0.86, -ry * 0.82], [rx - 4, -ry * 0.18], [0, -ry * 0.3]])} fill={C.dark} sw={11} />
        <text x={0} y={-ry * 0.58} textAnchor="middle" fontFamily={BEVAN} fontSize={34} fill={C.white} letterSpacing={1}>FLOW BROS</text>
        <Bk d={`M${-rx - 20} ${-ry * 0.22} Q0 ${-ry * 0.02} ${rx + 20} ${-ry * 0.22} Q${rx} ${-ry * 0.36} 0 ${-ry * 0.34} Q${-rx} ${-ry * 0.36} ${-rx - 20} ${-ry * 0.22}Z`} fill={C.white} sw={10} />
      </g>}
      front={<g><Bk d={smooth([[-86, ry * 0.4], [-30, ry * 0.3], [0, ry * 0.36], [30, ry * 0.3], [86, ry * 0.4], [40, ry * 0.5], [0, ry * 0.44], [-40, ry * 0.5]])} fill={C.ink} sw={6} /><Mouth x={0} y={ry * 0.6} w={80} open={p.mouth ?? 0} mood={-0.3} /></g>}
      torsoOver={<g><path d="M-190 260 q190 50 380 0" stroke={C.mid} strokeWidth={10} fill="none" strokeLinecap="round" /><path d="M-140 400 q140 40 280 0" stroke={C.tan} strokeWidth={12} fill="none" strokeLinecap="round" /></g>}
    />
  );
}
export function Wife(p: Omit<FolkP, "torsoFill" | "hair">) {
  const rx = 138, ry = 152;
  return (
    <Folk {...p} rx={rx} ry={ry} torsoW={380} torsoFill={C.dark} hair="bun"
      collar={<g><Bk d="M-60 218 L0 300 L60 218 L40 206 L0 250 L-40 206Z" fill={C.cream} sw={8} /></g>}
      front={<Mouth x={0} y={ry * 0.5} w={86} open={p.mouth ?? 0} mood={-0.6} teeth={0.6} />}
    />
  );
}
export function Gary(p: Omit<FolkP, "torsoFill" | "hair" | "eyes"> & { chew?: number; sauce?: boolean; eyes?: FolkP["eyes"] }) {
  const rx = 206, ry = 186;
  const jaw = p.chew ?? 0;
  return (
    <Folk {...p} rx={rx} ry={ry} torsoW={540} torsoFill={C.dark} hair="bald" eyes={p.eyes ?? "lids"} stubble nose={1.5}
      collar={<g>
        <Bk d={smooth([[-200, 270], [-110, 214], [0, 236], [110, 214], [200, 270], [150, 396], [0, 420], [-150, 396]])} fill={C.deep} sw={12} />
        <Bk d={smooth([[-84, 262], [0, 300], [84, 262], [60, 420], [0, 440], [-60, 420]])} fill={C.mid} sw={9} />
        <path d="M-34 330 q-6 60 -2 100 M34 330 q6 60 2 100" stroke={C.white} strokeWidth={8} strokeLinecap="round" fill="none" />
      </g>}
      torsoOver={<g fill={C.ink} opacity={0.55}>{[[-180, 520, 26], [140, 580, 34], [-60, 640, 20], [220, 470, 16], [-230, 600, 22]].map(([bx, by, r], i) => <ellipse key={i} cx={bx} cy={by} rx={r * 1.3} ry={r} />)}</g>}
      front={<g>
        {/* heavy brows + stubble ring + sauce */}
        <Mouth x={0} y={ry * 0.56} w={120 + jaw * 20} open={jaw * 0.5} mood={-0.5} teeth={0.4} wob={jaw * 4} />
        {(p.sauce ?? true) && <g><Bk d={`M-14 ${ry * 0.68} Q-24 ${ry * 0.86} -8 ${ry * 0.96} Q10 ${ry * 0.9} 6 ${ry * 0.7}Z`} fill={C.deep} sw={5} /><Bk d={ell(-4, ry * 0.98 + 4, 11, 14)} fill={C.deep} sw={4} /><path d={`M-10 ${ry * 0.74} l-2 22`} stroke={C.mid} strokeWidth={3} /></g>}
      </g>}
    />
  );
}
export function Kid(p: Omit<FolkP, "torsoFill" | "hair">) {
  const rx = 120, ry = 126;
  return (
    <Folk {...p} rx={rx} ry={ry} torsoW={300} torsoFill={C.dark} hair="short" hairFill={C.deep} eyes={p.eyes ?? "wide"}
      hat={<g>{/* the tree costume: a crown of leaves */}
        {[[-80, -110, 54], [-30, -150, 62], [34, -154, 62], [86, -108, 54], [0, -120, 58]].map(([lx, ly, r], i) => <Bk key={i} d={bumpy(ellp(lx, ly - 20, r, r * 0.8, 8, 0.05, i), 14, i)} fill={C.mid} sw={9} />)}</g>}
      torsoOver={<g><Bk d={smooth([[-120, 600], [-130, 180], [-60, 130], [0, 150], [60, 130], [130, 180], [120, 600]])} fill={C.dark} sw={10} /><path d="M-70 220 q30 40 70 20 q40 20 70 -20 M-50 330 q40 40 90 10" stroke={C.mid} strokeWidth={9} fill="none" strokeLinecap="round" />
        <Bk d={bumpy(ellp(-132, 250, 70, 60, 8, 0.05, 3), 12, 3)} fill={C.mid} sw={8} /><Bk d={bumpy(ellp(132, 250, 70, 60, 8, 0.05, 4), 12, 4)} fill={C.mid} sw={8} /></g>}
      front={<Mouth x={0} y={ry * 0.5} w={60} open={p.mouth ?? 0.25} mood={0} />}
    />
  );
}
