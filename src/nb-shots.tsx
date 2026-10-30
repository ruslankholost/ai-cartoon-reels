import React from "react";
import { Agency, Arm, Denise, DeniseP, Folk, Gary, Kid, Marco, Rick, Wife } from "./nb-chars";
import { BEVAN, Bk, C, Drip, Glove, Hose, Pt, bumpy, clamp, ease, easeIO, ell, ellp, f1, lerp, lin, popAt, rnd, rrect, smooth, spark, star5 } from "./nb-kit";
import { CallScreen, IncomingScreen, LIST_LONG, LockScreen, PhoneBack, PhoneBody, ROWS_TOP, ROW_GARY, ScreenFoam, SearchScreen } from "./nb-phone";
import { AudHead, Bathroom, CoffeeTable, Couch, Curtain, Gym, Kitchen, Living, Office, OfficeTable, TonyLegs, Van, VanCab, Wheel } from "./nb-sets";
import { FPS, Sched, ShotKey, blinkAt, mouthAt } from "./nb-sched";

export type Cam = { x?: number; y?: number; zoom?: number; rot?: number };
export type Ctx = { S: Sched; g: number; f: number; t: number; d: number; u: number; k: number };
export type Out = { cam?: Cam; shake?: Pt; scene: React.ReactNode; flash?: number; card?: number };

// ── motion helpers, all from the clock ──
const kick = (t: number, t0: number, amp = 20, dec = 0.12): Pt => {
  if (t < t0) return [0, 0];
  const f = Math.round(t * FPS), a = amp * Math.exp(-(t - t0) / dec);
  return [(rnd(f, 1) - 0.5) * 2 * a, (rnd(f, 2) - 0.5) * 1.5 * a];
};
const pz = (t: number, t0: number, a = 0.08, dur = 0.3) => (t < t0 ? 0 : a * Math.exp(-(t - t0) / (dur * 0.35)) * Math.cos(((t - t0) / dur) * 1.2));
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const Back = ({ c0 = "#cdb888", c1 = "#4e3b22", id = "insg" }: { c0?: string; c1?: string; id?: string }) => (
  <>
    <defs><radialGradient id={id} cx="50%" cy="46%" r="78%"><stop offset="0" stopColor={c0} /><stop offset="1" stopColor={c1} /></radialGradient></defs>
    <rect x={-100} y={-100} width={1300} height={2200} fill={`url(#${id})`} />
    <g stroke={C.deep} strokeWidth={5} opacity={0.3}>{Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 100 - 40} y1={-20} x2={i * 100 - 40} y2={1980} />)}</g>
  </>
);

// ── props ──
const EarPhone = ({ glow = 0 }: { glow?: number }) => (
  <g transform="translate(236 -4) rotate(12)">
    <Bk d={rrect(-34, -84, 68, 168, 16)} fill={C.cream} sw={9} />
    <rect x={-22} y={-62} width={44} height={110} rx={6} fill={glow ? C.white : C.dark} />
  </g>
);
const Burrito = ({ bite = 1 }: { bite?: number }) => (
  <g>
    <Bk d="M-46 120 L46 120 L54 -44 L-54 -44Z" fill={C.white} sw={11} />
    <path d="M-40 70 l18 -12 l18 12 l18 -12 l18 12 M-44 20 l20 -12 l20 12 l20 -12 l20 12 M-40 -20 l14 -10 l14 10 l14 -10 l14 10 l14 -10" stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Bk d={bumpy(ellp(0, -50, 52, 30, 8, 0.05, 1), 8, 1)} fill={C.tan} sw={9} />
    <Bk d={bumpy(ellp(-2, -56, 34, 16, 7, 0.1, 2), 6, 2)} fill={C.deep} sw={6} />
    {bite > 0 && <Bk d={ell(40, -66, 24, 20)} fill={C.dark} sw={7} opacity={0} />}
  </g>
);
const Laptop = ({ x, y, pop = 1 }: { x: number; y: number; pop?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <Bk d="M-190 0 L190 0 L226 34 L-226 34Z" fill={C.mid} sw={11} />
    <Bk d={rrect(-176, -226, 352, 226, 14)} fill={C.cream} sw={13} />
    <rect x={-154} y={-204} width={308} height={182} rx={6} fill={C.white} />
    <path d="M-132 -34 H132 M-132 -34 V-188" stroke={C.ink} strokeWidth={7} fill="none" strokeLinecap="round" />
    {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-110 + i * 50} y={-34 - (24 + i * 24) * clamp(pop)} width={32} height={(24 + i * 24) * clamp(pop)} fill={C.mid} stroke={C.ink} strokeWidth={5} />)}
    <g transform={`translate(0 0) scale(${pop})`}>
      <path d="M-120 -70 L-40 -110 L10 -90 L96 -166" stroke={C.ink} strokeWidth={13} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 -170 L110 -176 L98 -128Z" fill={C.ink} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
    </g>
  </g>
);
const TablePhone = ({ x, y, f, ring = 0 }: { x: number; y: number; f: number; ring?: number }) => {
  const sh = ring ? Math.sin(f * 4.1) * 6 * ring : 0;
  return (
    <g transform={`translate(${f1(x + sh)} ${y}) rotate(${f1(14 + sh)})`}>
      {ring > 0 && [0, 1].map((i) => <path key={i} d={`M${-70 - i * 22} -40 q-18 40 0 80 M${70 + i * 22} -40 q18 40 0 80`} stroke={C.ink} strokeWidth={7} fill="none" strokeLinecap="round" />)}
      <Bk d={rrect(-50, -86, 100, 172, 16)} fill={C.cream} sw={9} />
      <rect x={-38} y={-68} width={76} height={128} rx={6} fill={ring ? C.white : C.ink} />
      {ring > 0 && <circle cx={0} cy={-6} r={18} fill={C.ink} />}
    </g>
  );
};
const Mug = ({ f, steam = 1 }: { f: number; steam?: number }) => (
  <g>
    <Bk d="M-46 -50 H46 L40 54 Q0 70 -40 54Z" fill={C.cream} sw={11} />
    <Bk d="M44 -26 q46 4 40 36 q-6 24 -44 20" fill="none" sw={12} />
    <ellipse cx={0} cy={-48} rx={46} ry={10} fill={C.dark} stroke={C.ink} strokeWidth={8} />
    {steam > 0 && [0, 1, 2].map((i) => { const u = (f * 0.03 + i * 0.33) % 1; return <path key={i} d={`M${-20 + i * 20} ${-60 - u * 20} q${14 + Math.sin(u * 7) * 8} -30 0 -56 q-14 -26 4 -52`} stroke={C.white} strokeWidth={11} fill="none" strokeLinecap="round" opacity={clamp(1 - u) * steam} />; })}
  </g>
);

const FPSN = FPS;
const dMouth = (c: Ctx) => mouthAt(c.S, "DENISE", c.g);
const dBlink = (c: Ctx) => blinkAt(c.g, 3);
const clampi = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Denise in the shower, as she is in each shot of the morning (foam slides lower as the calls fail)
type DB = Partial<DeniseP>;
const dBath = (c: Ctx, o: DB): React.ReactNode => <Denise f={c.f} x={540} y={830} s={0.95} seed={1} mouth={dMouth(c)} blink={dBlink(c)} {...o} />;
const EAR_ARM: Arm = { to: [262, 66], bend: -70, pose: "fist", gs: 0.95 };
const bathBack = (c: Ctx, t = 6) => <Bathroom f={c.f} t={t} />;

// ═══════════════ the shots ═══════════════
export const SHOTS: Record<ShotKey, (c: Ctx) => Out> = {
  // 1. the shower goes ice cold
  bath: (c) => {
    const { t, f, S } = c;
    const m = dMouth(c);
    return {
      cam: { zoom: 1.02 + 0.05 * c.u + pz(t, 0.03, 0.06, 0.4) }, shake: kick(t, 0.03, 30, 0.16), flash: t >= 0.03 && t < 0.13 ? 0.8 : 0,
      scene: (
        <>
          {bathBack(c, t)}
          {dBath(c, { eyes: "shut", mouth: Math.max(m, 0.12), mood: -1, shiver: 1, goose: popAt(t, 0.08, 0.3), armL: { to: [-338, 260], bend: 70, pose: "fist" }, armR: { to: [338, 260], bend: -70, pose: "fist" } })}
          <Curtain />
        </>
      ),
    };
  },
  // 2. the search list, in a wet hand
  insSearch: (c) => {
    const { t, f } = c;
    const pops = [popAt(t, 0.28), popAt(t, 0.5), popAt(t, 0.72), popAt(t, 0.98)];
    const hold: Pt = [815 + Math.sin(f * 0.42) * 4, 1110];
    return {
      cam: { zoom: 1 + 0.04 * c.u },
      scene: (
        <>
          <Back />
          <PhoneBody x={540} y={800} s={0.98} rot={-2 + Math.sin(f * 0.21) * 0.6}>
            <SearchScreen rows={[ROWS_TOP[0], ROWS_TOP[1], ROWS_TOP[2], ROW_GARY]} pops={pops} />
            <ScreenFoam t={t} blobs={[{ x: 440, y: 285, r: 30, t0: 0.55, len: 70 }, { x: 455, y: 470, r: 22, t0: 1.1, len: 50 }, { x: 470, y: 640, r: 26, t0: 1.5, len: 40 }]} />
          </PhoneBody>
          <Hose a={[1160, 1800]} b={[hold[0] + 10, hold[1] + 50]} bend={-160} wave={Math.sin(f * 0.42) * 10} w={44} />
          <Glove x={hold[0]} y={hold[1]} rot={-24} s={1.5} pose="fist" />
          <Drip x={hold[0] - 20} y={hold[1] + 90} r={20} len={50 + (f % 30)} seed={f % 7} />
        </>
      ),
    };
  },
  // 3. her thumb taps AquaPro
  insTap: (c) => {
    const { t, f, S } = c;
    const tap = S.T.tap - S.shots[2].start;
    const press = t >= tap && t < tap + 0.12 ? 1 : 0;
    const called = t >= tap + 0.28;
    const thumbY = lerp(980, 640, ease(t / (tap + 0.02))) + (press ? 10 : 0);
    const rip = clamp((t - tap) / 0.35);
    return {
      cam: { zoom: 1.04 + pz(t, tap, 0.07, 0.3) },
      scene: (
        <>
          <Back />
          <PhoneBody x={540} y={800} s={0.98} rot={-2}>
            {called ? <CallScreen title="AquaPro" f={f} /> : <SearchScreen rows={[{ ...ROWS_TOP[0], hot: t >= tap }, ROWS_TOP[1], ROWS_TOP[2], ROW_GARY]} />}
          </PhoneBody>
          {t >= tap && rip < 1 && <circle cx={590} cy={620} r={20 + rip * 90} fill="none" stroke={C.ink} strokeWidth={10 * (1 - rip)} />}
          <Hose a={[1180, 1900]} b={[600, thumbY + 60]} bend={-170} w={44} />
          <Glove x={600} y={thumbY} rot={-8} s={1.5} pose="point" />
        </>
      ),
    };
  },
  // 4. under a stranger's sink
  sink: (c) => {
    const { t, f, S } = c;
    const b = (k: number) => t >= S.T[`buzz${k}`] - S.shots[3].start && t < S.T[`buzz${k}`] - S.shots[3].start + 0.34;
    const buzz = b(1) || b(2) || b(3) ? 1 : 0;
    const sh = [S.T.buzz1, S.T.buzz2, S.T.buzz3].reduce<Pt>((a, k) => add(a, kick(c.g, k, 12, 0.1)), [0, 0]);
    return {
      cam: { zoom: 1.02 + 0.06 * c.u }, shake: sh,
      scene: (
        <>
          <Kitchen f={f} />
          <g transform={`translate(${f1(Math.sin(f * 0.8) * 3)} ${f1(Math.sin(f * 0.6) * 4)})`}>
            <Hose a={[800, 700]} b={[690, 760]} bend={30} w={30} />
            <g transform={`translate(690 760) rotate(${f1(Math.sin(f * 0.7) * 12 - 20)})`}>
              <Bk d="M-14 -150 L14 -150 L14 0 L-14 0Z" fill={C.mid} sw={9} /><Bk d="M-36 -190 Q-34 -230 0 -230 Q34 -230 36 -190 L18 -190 L14 -150 L-14 -150 L-18 -190Z" fill={C.mid} sw={9} />
            </g>
            <Glove x={690} y={770} rot={-12} s={1} pose="fist" />
          </g>
          <g transform="translate(540 1352) scale(0.84) translate(-540 -1352)"><TonyLegs f={f} buzz={buzz} /></g>
        </>
      ),
    };
  },
  // 5. voicemail
  deniseEar: (c) => {
    const { t, f, S, g } = c;
    const slide = ease((g - S.T.foamSlide) / 0.35);
    const close = c.k >= 1;
    return {
      cam: close ? { x: 540, y: 800, zoom: 1.32 + 0.04 * c.u } : { zoom: 1 + 0.03 * c.u },
      scene: (
        <>
          {bathBack(c)}
          {dBath(c, { eyes: "open", look: [0.5, -0.5], mouth: 0, mood: -0.7, foam: 0.12 + 0.3 * slide, brow: 0.9 * slide, shiver: 0.5, armR: EAR_ARM, mid: <EarPhone />, goose: 1 })}
          <Curtain />
        </>
      ),
    };
  },
  // 6. the Premier office: the agency guy and the ringing phone
  office: (c) => {
    const { t, f, S, g } = c;
    const b = c.k >= 1;
    const ring = 1;
    const poppy = popAt(g, S.P[4] + 0.1, 0.35);
    const am = mouthAt(S, "AGENCY GUY", g);
    const ringPulse = pz(g, S.P[4] + 2.16, 0.07, 0.3);
    return {
      cam: b ? { x: 560, y: 1030, zoom: 1.5 + 0.08 * c.u + ringPulse } : { x: 540, y: 1060, zoom: 1.04 + 0.03 * c.u },
      shake: kick(g, S.P[4] + 2.16, 8, 0.1),
      scene: (
        <>
          <Office f={f} />
          <Marco f={f} x={270} y={800} s={0.92} seed={1} eyes="lids" look={[0.7, 0.9]} blink={blinkAt(g, 1)} mouth={0} mood={0.3} armL={{ to: [-60, 560], bend: 40, pose: "mitt" }} armR={{ to: [140, 520], bend: -40, pose: "mitt" }} />
          <Agency f={f} x={800} y={800} s={0.92} seed={2} eyes="open" look={[-0.7, 0.3]} blink={blinkAt(g, 2)} mouth={am} armL={{ to: [-270, 380], bend: 70, pose: "open" }} armR={{ to: [-200, 560], bend: -30, pose: "mitt" }} />
          <OfficeTable />
          <Laptop x={560} y={1166} pop={poppy} />
          <TablePhone x={190} y={1130} f={f} ring={ring} />
          <Glove x={700} y={1130} rot={-80} s={0.85} pose="mitt" />
        </>
      ),
    };
  },
  // 7. Marco turns the ringing phone face down
  phoneFlip: (c) => {
    const { t, f, S } = c;
    const t0 = S.T.flipThunk - S.shots[6].start - 0.24;
    const p = clamp((t - t0) / 0.24);
    const land = t - (t0 + 0.24);
    const sx = Math.max(0.05, Math.abs(Math.cos(p * Math.PI)));
    const sq = land > 0 && land < 0.2 ? 1 - 0.1 * Math.sin((land / 0.2) * Math.PI) : 1;
    const ringing = t < t0;
    const gx = lerp(-300, 540, easeIO(t / (t0 + 0.12))), gy = 1300 - 280 * ease(t / t0);
    return {
      cam: { zoom: 1.02 + pz(t, t0 + 0.24, 0.08, 0.3) }, shake: kick(t, t0 + 0.24, 18, 0.1),
      scene: (
        <>
          <Back c0="#d2bd8c" c1="#4a3820" id="tbl" />
          <Hatch2 />
          <ellipse cx={540} cy={1330} rx={300} ry={30} fill={C.ink} opacity={0.4} />
          <g transform={`translate(540 ${f1(820 + (sq < 1 ? 20 : 0))}) scale(${f1(sx * 0.82 * 1000) / 1000} ${f1(0.82 * sq * 1000) / 1000}) translate(-540 -800)`}>
            <PhoneBody x={540} y={800} s={1} rot={ringing ? Math.sin(f * 4.1) * 3 : 0} shake={ringing ? Math.sin(f * 4.1) * 8 : 0}>
              {p < 0.5 ? <IncomingScreen f={f} /> : <PhoneBack />}
            </PhoneBody>
          </g>
          {p < 1 && <><Hose a={[-200, 1900]} b={[gx, gy + 70]} bend={80} w={46} /><Glove x={gx} y={gy} rot={-20 + p * 60} s={1.6} pose="open" /></>}
        </>
      ),
    };
  },
  // 8. Denise, towel, teeth chattering: "Calling Flow Bros"
  deniseCall: (c) => {
    const { t, f } = c;
    const chat = 0.18 + 0.18 * Math.abs(Math.sin(f * 2.6));
    return {
      cam: { zoom: 1.02 + 0.03 * c.u },
      scene: (
        <>
          {bathBack(c)}
          {dBath(c, { x: 600, y: 700, s: 0.82, eyes: "open", look: [-0.4, 0.9], mouth: chat, mood: -0.4, foam: 0.62, foamEye: 1, towel: true, shiver: 1, goose: 1, mid: <PhoneBody x={-250} y={560} s={0.8} rot={-6}><CallScreen title="Flow Bros" f={f} /></PhoneBody>, armR: { to: [-40, 680], bend: -60, pose: "fist", gs: 1.1 }, armL: { to: [-420, 440], bend: 60, pose: "fist", gs: 1.1 } })}
          <Curtain y={1500} />
        </>
      ),
    };
  },
  // 9. the school gym: a toilet-flush ringtone
  gym: (c) => {
    const { t, f, S, g } = c;
    const fl = S.T.flush - S.shots[8].start;
    const culprit: Pt = [330, 1290];
    const rows: { y: number; s: number; xs: number[] }[] = [
      { y: 1010, s: 0.5, xs: [130, 330, 540, 750, 950] }, { y: 1130, s: 0.62, xs: [220, 440, 650, 860] }, { y: 1280, s: 0.8, xs: [330, 600, 870] },
    ];
    return {
      cam: { y: 1000, zoom: 1.0 + pz(t, fl, 0.05, 0.3) }, shake: kick(t, fl, 12, 0.2),
      scene: (
        <>
          <Gym f={f} />
          <Kid f={f} x={540} y={620} s={0.62} seed={3} eyes="wide" mouth={0.5} look={[0, 0.2]} armL={{ to: [-230, 330], bend: 50, pose: "open" }} armR={{ to: [230, 330], bend: -50, pose: "open" }} sway={0.4} />
          <GymFront />
          {rows.map((r, ri) => r.xs.map((x, i) => {
            const isC = ri === 2 && i === 0;
            const dir = x < culprit[0] ? 1 : -1;
            const turn = isC ? 0 : ease((t - fl - 0.04 * Math.abs(x - culprit[0]) / 100 - 0.05 * (2 - ri)) / 0.16);
            return <AudHead key={`${ri}${i}`} f={f} x={x} y={r.y} s={r.s} seed={ri * 5 + i} turn={turn} dir={dir} who={ri + i} cap={isC} />;
          }))}
          {t >= fl && (
            <g transform={`translate(${culprit[0] + 30} ${culprit[1] - 160}) rotate(${f1(-8 + Math.sin(f * 3) * 4)}) scale(${popAt(t, fl, 0.25)})`}>
              <text x={0} y={0} textAnchor="middle" fontFamily={BEVAN} fontSize={120} fill={C.white} stroke={C.ink} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">FLUSH!</text>
              {[-1, 1].map((sd) => [0, 1, 2].map((k) => <line key={`${sd}${k}`} x1={sd * 300} y1={-70 + k * 40} x2={sd * 360} y2={-90 + k * 52} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />))}
            </g>
          )}
        </>
      ),
    };
  },
  // 10. Rick kills the call, the elbow
  rick: (c) => {
    const { t, f, S, g } = c;
    const e = S.T.elbow - S.shots[9].start;
    const hit = t >= e ? Math.exp(-(t - e) / 0.18) : 0;
    const wifeM = mouthAt(S, "RICK'S WIFE", g);
    const rx = 650 + 34 * hit;
    return {
      cam: { zoom: 1.0 + pz(t, e, 0.06, 0.25) }, shake: kick(t, e, 24, 0.12),
      scene: (
        <>
          <Back c0="#d6c496" c1="#4a3a22" id="aud" />
          <ChairBand />
          <Wife f={f} x={250} y={800} s={0.82} seed={4} eyes="angry" look={[0.8, 0]} mouth={wifeM} blink={blinkAt(g, 4)} armR={{ to: [150, 560], bend: -40, pose: "point", rot: 30 }} armL={{ to: [-130, 560], bend: 40, pose: "mitt" }} />
          <g transform={`translate(${f1(34 * hit)} 0)`}>
            <Rick f={f} x={rx - 34 * hit} y={800} s={0.88} seed={5} eyes={t >= e ? "closed" : "open"} look={[0, 0.8]} mouth={t >= e ? 0.7 : 0} mood={-0.5} blink={blinkAt(g, 5)}
              dy={0} rot={hit * 5} armL={{ to: [-60, 330], bend: 40, pose: "fist", gs: 1 }} armR={{ to: [150, 520], bend: -40, pose: "mitt" }}
              mid={<g transform="translate(-72 332) rotate(-12)"><Bk d={rrect(-36, -64, 72, 128, 14)} fill={C.cream} sw={8} /><rect x={-26} y={-50} width={52} height={90} rx={4} fill={C.ink} /><circle cx={0} cy={24} r={13} fill={t >= e - 0.1 ? C.mid : C.white} stroke={C.ink} strokeWidth={4} /></g>} />
          </g>
          {/* her elbow, in his ribs */}
          <g>
            <Hose a={[330, 1000]} b={[470 + 20 * hit, 1020]} bend={-80} w={34} />
            <Bk d={ell(480 + 20 * hit, 1020, 30, 26)} fill={C.dark} sw={9} />
          </g>
          {t >= e && t < e + 0.3 && <g transform={`translate(520 1020) scale(${0.6 + (t - e) * 3})`} opacity={1 - (t - e) / 0.3}>{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={Math.cos(i * 0.785) * 40} y1={Math.sin(i * 0.785) * 40} x2={Math.cos(i * 0.785) * 100} y2={Math.sin(i * 0.785) * 100} stroke={C.ink} strokeWidth={12} strokeLinecap="round" />)}</g>}
        </>
      ),
    };
  },
  // 11. scrolling past the stars
  deniseScroll: (c) => {
    const { t, f, d } = c;
    const sc = 880 * easeIO((t - 0.1) / (d - 0.25));
    return {
      cam: { zoom: 1.02 },
      scene: (
        <>
          {bathBack(c)}
          {dBath(c, { x: 600, y: 690, s: 0.82, eyes: "open", look: [-0.3, 0.95], mouth: 0, mood: -0.6, foam: 0.8, foamEye: 0.55, chin: 1.2, towel: true, shiver: 0.6, goose: 1,
            mid: <PhoneBody x={-250} y={560} s={0.8} rot={-4}><SearchScreen rows={LIST_LONG} scroll={sc} dots={false} /></PhoneBody>,
            armR: { to: [-30, 690], bend: -60, pose: "fist", gs: 1.1 }, armL: { to: [-230, 640 - sc * 0.1], bend: 50, pose: "point", gs: 1.2 } })}
          <Curtain y={1500} />
        </>
      ),
    };
  },
  // 12. Gary's Plumbing, 2.1, open now
  insGary: (c) => {
    const { t, f, S, d } = c;
    const land = S.T.plop - S.shots[11].start;
    return {
      cam: { x: 560, y: 1090, zoom: 1.3 + 0.25 * easeIO(t / d) },
      scene: (
        <>
          <Back />
          <PhoneBody x={540} y={800} s={0.98} rot={-1}>
            <SearchScreen rows={LIST_LONG} scroll={880} dots={false} />
            <ScreenFoam t={t} blobs={[{ x: 410, y: 640, r: 40, t0: land, len: 70 }]} />
            <rect x={0} y={684} width={520} height={176} fill={C.tan} opacity={clamp((t - 1.7) / 0.1) * 0.8} />
          </PhoneBody>
        </>
      ),
    };
  },
  // 13. the thumb taps Gary
  insTapGary: (c) => {
    const { t, f, S } = c;
    const tap = S.T.tapGary - S.shots[12].start;
    const thumbY = lerp(1400, 1150, ease(t / (tap + 0.02))) + (t >= tap && t < tap + 0.1 ? 10 : 0);
    const called = t >= tap + 0.22;
    return {
      cam: { x: 560, y: 1060, zoom: 1.5 + pz(t, tap, 0.1, 0.3) },
      scene: (
        <>
          <Back />
          <PhoneBody x={540} y={800} s={0.98} rot={-1}>
            {called ? <CallScreen title="Gary's Plumbing" f={f} /> : <SearchScreen rows={LIST_LONG.map((r, i) => (i === 8 ? { ...r, hot: t >= tap } : r))} scroll={880} dots={false} />}
          </PhoneBody>
          <Hose a={[1250, 1900]} b={[800, thumbY + 60]} bend={-170} w={44} />
          <Glove x={800} y={thumbY} rot={-8} s={1.5} pose="point" />
        </>
      ),
    };
  },
  // 14. Gary answers
  garyAnswer: (c) => garyShot(c, { zoom: 1.0 + 0.04 * c.u, pick: true }),
  // 15. Denise, hopeful
  deniseHi: (c) => deniseTalk(c, { eyes: "wide", brow: 0, mood: 0.3, zoom: 1.04 + 0.1 * c.u, look: [0.4, -0.2] }),
  // 16. "Fifteen hundred."
  garyPrice: (c) => garyShot(c, { zoom: 1.2 + 0.1 * c.u, talk: true }),
  // 17. "For what?"
  deniseWhat: (c) => deniseTalk(c, { eyes: "angry", mood: -0.8, zoom: 1.1 + pz(c.t, 0.05, 0.08, 0.3), look: [0.2, 0] }),
  // 18. "I picked up."
  garyPicked: (c) => garyShot(c, { zoom: 1.2, slow: true, talk: true }),
  // 19. the drip, then "Okay. Come."
  deniseDrip: (c) => {
    const { t, f, S, g } = c;
    const drop = S.T.drop - S.shots[18].start;
    const second = c.k >= 1;
    const noseHit = second || t >= drop;
    const fall = clamp((t - (drop - 0.35)) / 0.35);
    return {
      cam: second ? { zoom: 1.06 + 0.03 * c.u } : { x: 540, y: 700, zoom: 1.7 + pz(t, drop, 0.12, 0.3) },
      shake: kick(t, drop, 6, 0.1),
      scene: (
        <>
          {bathBack(c)}
          {dBath(c, { eyes: second ? "closed" : "open", look: [0, -0.9], mouth: second ? dMouth(c) : 0, mood: -0.8, foam: 0.9, foamEye: 0.6, chin: 1.6, towel: true, shiver: 0.4, goose: 1, nose: noseHit ? 1 : 0, armR: EAR_ARM, mid: <EarPhone />, front: !noseHit && fall > 0 ? <Drip x={0} y={-250 + fall * 270} r={18} len={34} seed={9} /> : undefined })}
          <Curtain />
        </>
      ),
    };
  },
  // 20. Gary turns the key
  garyKey: (c) => garyShot(c, { zoom: 1.02, key: true, talk: true }),
  // 21. evening: the van pulls away
  living: (c) => {
    const { t, f, S, g } = c;
    const vx = lerp(770, 1700, easeIO((t - 0.25) / 1.2) ** 2) - 0;
    const money = popAt(t, S.T.money - S.shots[20].start, 0.3);
    return {
      cam: { zoom: 1.0 + 0.03 * c.u },
      scene: (
        <>
          <Living f={f} t={t} />
          <Bk d={rrect(380, 300, 520, 460, 14)} fill={C.tan} sw={15} />
          <clipPath id="win"><rect x={398} y={318} width={484} height={424} /></clipPath>
          <g clipPath="url(#win)">
            <g transform={`translate(${f1(-t * 40)} 0)`}>{[0, 1, 2].map((i) => <Bk key={i} d={rrect(380 + i * 200, 400 - (i % 2) * 70, 150, 360, 8)} fill={C.mid} sw={9} />)}</g>
            <Bk d="M380 690 H900 V760 H380Z" fill={C.dark} sw={10} />
            <Van f={f} x={vx - 130} y={600} s={0.9} />
          </g>
          <path d="M640 318 V742 M398 530 H882" stroke={C.ink} strokeWidth={12} />
          <Bk d={rrect(380, 300, 520, 460, 14)} fill="none" sw={15} />
          <Couch />
          <Denise f={f} x={560} y={980} s={0.85} seed={2} mode="robe" eyes="open" look={[lerp(-0.7, 0.9, ease(t / 1.4)), -0.2]} blink={blinkAt(g, 6)} mouth={0} mood={-0.15}
            armR={{ to: [150, 300], bend: -60, pose: "fist" }} armL={{ to: [-250, 560], bend: 50, pose: "mitt" }} mid={<g transform="translate(150 190)"><Mug f={f} /></g>} />
          <CoffeeTable />
          <g transform={`translate(800 1380) rotate(-4) scale(${0.55 + 0.45 * Math.max(0.0, Math.min(1.2, money))})`} opacity={money > 0 ? 1 : 0}>
            <Bk d="M-160 -70 H160 V90 L130 76 L100 94 L70 76 L40 94 L10 76 L-20 94 L-50 76 L-80 94 L-110 76 L-140 94 L-160 78Z" fill={C.white} sw={10} />
            <text x={0} y={2} textAnchor="middle" fontFamily={BEVAN} fontSize={64} fill={C.ink}>$1,500</text>
            <text x={0} y={52} textAnchor="middle" fontFamily={BEVAN} fontSize={40} fill={C.dark} letterSpacing={3}>CASH</text>
          </g>
        </>
      ),
    };
  },
  // 22. Premier calls back
  insPremier: (c) => {
    const { t, f, S } = c;
    const r = S.T.ringPremier - S.shots[21].start;
    const lit = clamp((t - r) / 0.1);
    const shake = t >= r ? Math.sin(f * 4.1) * 8 : 0;
    return {
      cam: { zoom: 1.02 + 0.05 * c.u },
      scene: (
        <>
          <Back c0="#d2bd8c" c1="#4a3820" id="tbl2" />
          <Hatch2 />
          <ellipse cx={540} cy={1330} rx={300} ry={30} fill={C.ink} opacity={0.4} />
          <PhoneBody x={540} y={800} s={0.9} rot={-3 + shake * 0.4} shake={shake} glow={lit}>
            <LockScreen f={Math.round((t - r) * FPSN)} lit={lit} />
          </PhoneBody>
        </>
      ),
    };
  },
  // 23. face down, end card
  phoneDown: (c) => {
    const { t, f, S } = c;
    const t0 = 0.15;
    const p = clamp((t - t0) / 0.22);
    const land = t - (t0 + 0.22);
    const sx = Math.max(0.05, Math.abs(Math.cos(p * Math.PI)));
    const sq = land > 0 && land < 0.2 ? 1 - 0.1 * Math.sin((land / 0.2) * Math.PI) : 1;
    const gx = lerp(1300, 560, easeIO(t / (t0 + 0.1))), gy = 1250 - 330 * ease(t / t0);
    return {
      cam: { zoom: 1.02 + pz(t, t0 + 0.22, 0.07, 0.3) }, shake: kick(t, t0 + 0.22, 18, 0.1), card: t - S.T.card + S.shots[22].start,
      scene: (
        <>
          <Back c0="#d2bd8c" c1="#4a3820" id="tbl3" />
          <Hatch2 />
          <ellipse cx={540} cy={1330} rx={300} ry={30} fill={C.ink} opacity={0.4} />
          <g transform={`translate(540 ${f1(780 + (sq < 1 ? 20 : 0))}) scale(${f1(sx * 0.82 * 1000) / 1000} ${f1(0.82 * sq * 1000) / 1000}) translate(-540 -800)`}>
            <PhoneBody x={540} y={800} s={1}>{p < 0.5 ? <LockScreen f={f} lit={1} /> : <PhoneBack />}</PhoneBody>
          </g>
          {p < 1 && <><Hose a={[1300, 1900]} b={[gx + 30, gy + 70]} bend={-80} w={46} color={C.mid} /><Glove x={gx} y={gy} rot={20 - p * 50} s={1.6} pose="open" /></>}
        </>
      ),
    };
  },
};

// the wooden table top of the close-ups
const Hatch2 = () => (
  <g stroke={C.dark} strokeWidth={6} opacity={0.35} strokeLinecap="round">{Array.from({ length: 16 }, (_, i) => <path key={i} d={`M-40 ${100 + i * 120} q540 ${i % 2 ? 14 : -14} 1160 0`} fill="none" />)}</g>
);
const ChairBand = () => (
  <g>
    {Array.from({ length: 7 }, (_, i) => <Bk key={i} d={rrect(-30 + i * 170, 1080, 150, 220, 16)} fill={C.dark} sw={11} />)}
    <Bk d="M-60 1300 H1140 V2000 H-60Z" fill={C.deep} sw={12} />
  </g>
);
const GymFront = () => (
  <g>
    <Bk d="M-60 900 H1140 V2000 H-60Z" fill={C.tan} sw={14} />
    <g stroke={C.mid} strokeWidth={8} opacity={0.8}>{[1180, 1480, 1780].map((y) => <path key={y} d={`M-60 ${y} H1140`} />)}</g>
  </g>
);

// Denise on the phone, in the shower, for the talking shots
function deniseTalk(c: Ctx, o: { eyes: DeniseP["eyes"]; mood: number; zoom: number; look: [number, number]; brow?: number }): Out {
  return {
    cam: { x: 540, y: 880, zoom: o.zoom },
    scene: (
      <>
        {bathBack(c)}
        {dBath(c, { eyes: o.eyes, look: o.look, mood: o.mood, foam: 0.9, foamEye: 0.6, chin: 1.4, towel: true, shiver: 0.5, goose: 1, armR: EAR_ARM, mid: <EarPhone glow={1} />, mouth: dMouth(c) })}
        <Curtain />
      </>
    ),
  };
}
// Gary in the van, for his four shots
function garyShot(c: Ctx, o: { zoom: number; pick?: boolean; talk?: boolean; slow?: boolean; key?: boolean }): Out {
  const { t, f, S, g } = c;
  const gm = mouthAt(S, "GARY", g);
  const chew = gm > 0.05 ? 0 : 0.7 * Math.abs(Math.sin(f * 0.5));
  const pickAt = S.T.pickup - S.shots[13].start;
  const engAt = S.T.engine - S.shots[19].start;
  const sh: Pt = o.pick ? kick(t, pickAt, 22, 0.14) : o.key ? kick(t, engAt, 16, 0.5) : [0, 0];
  return {
    cam: { x: 620, y: 860, zoom: o.zoom + (o.pick ? pz(t, pickAt, 0.08, 0.3) : 0) }, shake: sh,
    scene: (
      <>
        <VanCab f={f} rumble={o.key && t > engAt ? 1 : 0} />
        <Gary f={f} x={680} y={800} s={0.95} seed={7} look={[-0.7, 0.1]} blink={blinkAt(g, 7)} mouth={0} chew={Math.max(gm * 1.2, chew)}
          lid={0.0} mood={-0.4}
          mid={
            <g>
              {/* phone at the ear (one phone) */}
              <g transform="translate(250 10) rotate(10)"><Bk d={rrect(-34, -84, 68, 168, 16)} fill={C.cream} sw={9} /><rect x={-22} y={-62} width={44} height={110} rx={6} fill={C.dark} /></g>
              {/* the burrito, at the mouth or on the dash */}
              {!o.key && <g transform={`translate(${o.talk ? -230 : -120} ${o.talk ? 330 : 230}) rotate(${o.talk ? -10 : 28})`}><Burrito /></g>}
              {o.key && <g transform="translate(-300 420) rotate(-20)"><Burrito /></g>}
            </g>
          }
          armR={{ to: [262, 70], bend: -70, pose: "fist" }}
          armL={o.key ? { to: [330, 560], bend: 40, pose: "fist" } : { to: o.talk ? [-228, 360] : [-110, 240], bend: 50, pose: "fist" }} />
        {o.key && <Key f={f} turn={t > engAt - 0.25 ? 50 : 0} />}
        <Wheel f={f} />
      </>
    ),
  };
}
const Key = ({ f, turn }: { f: number; turn: number }) => (
  <g transform="translate(990 1250)"><Bk d={ell(0, 0, 64, 64)} fill={C.mid} sw={11} /><g transform={`rotate(${turn})`}><Bk d="M-18 -70 H18 V10 H-18Z" fill={C.cream} sw={9} /><Bk d={ell(0, -86, 36, 30)} fill={C.cream} sw={9} /></g></g>
);
