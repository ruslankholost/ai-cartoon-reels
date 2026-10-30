import { Fill, G, Stroke, ell, poly, rnd, rrect, type Pt } from "./flat";
import { ellPts } from "./chars";
import { Rain, Boot, spikesShape } from "./street";
import { burst, pajamaTex } from "./props";
import { BOOT_HIT, WRENCH_SNAP } from "./sched";

// The close-up inserts: a boot into a puddle, a wrench on the pipe, the drain from above. Same flat look; each is a
// function of the seconds since its shot began (t), so a cut can land on any frame.
const R = rrect;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ── a boot steps into a puddle, in the rain ──
const PUDDLE = "#34415F";
export function BootPuddle({ t, g }: { t: number; g: number }) {
  const T0 = BOOT_HIT;
  const fall = clamp(t / T0, 0, 1);
  const since = Math.max(0, t - T0);
  const y = lerp(820, -276, fall * fall) - (since > 0 ? 26 * (1 - Math.exp(-since * 14)) : 0);
  const crown = clamp(since / 0.1, 0, 1);
  return (
    <>
      <Fill s={R(1200, 2000, 0)} fill="#232837" ow={0} z={0} />
      {[[-300, 600, 120], [260, 380, 90], [-120, 120, 70]].map(([sx, sy, sw], i) => <Stroke key={i} pts={[[sx, sy], [sx + 14, sy - sw]]} w={22} color="#2D3550" op={0.8} z={0.2} />)}
      <G z={3}>
        <Fill s={ell(470, 150)} fill={PUDDLE} ow={5.5} x={0} y={-330} />
        <Fill s={ell(380, 112)} fill="#3C4D75" ow={0} x={0} y={-330} z={0.1} />
        <Stroke pts={ellPts(300, 80, 40).slice(26, 38)} w={8} color="#7E92BC" x={0} y={-326} z={0.2} />
        <Stroke pts={ellPts(240, 62, 40).slice(26, 37)} w={6} color="#7E92BC" x={-10} y={-322} z={0.2} />
      </G>
      <Boot x={-40} y={y} z={10} r={-2} />
      {/* once the boot is in, the puddle closes round its sole, and splashes */}
      {since > 0 && (
        <>
          <G x={-30} y={-290} z={12}>
            <Fill s={ell(250, 34)} fill={PUDDLE} ow={0} y={-8} />
            <Stroke pts={ellPts(250, 34, 40).slice(20, 40)} w={5} color="#9DB2DA" y={-8} />
          </G>
          <Fill s={spikesShape(430, 170, 6)} fill="#CFE3F8" ow={5.5} x={-30} y={-282} sx={crown} sy={crown} z={13} />
          {Array.from({ length: 11 }, (_, i) => {
            const v = 620 + rnd(i, 1) * 520, vx = (i - 5) * 70 + (rnd(i, 2) - 0.5) * 40;
            const dy = v * since - 0.5 * 2600 * since * since;
            return dy > -20 ? <Fill key={i} s={ell(1, 1.2, 14)} fill="#DCEAFB" ow={5.5} x={-30 + vx * since * 1.3} y={-282 + dy} sx={10 + rnd(i, 3) * 8} z={13.5} /> : null;
          })}
          {[0, 1, 2].map((k) => {
            const ph = clamp((since - k * 0.07) / 0.5, 0, 1);
            return ph > 0 && ph < 1 ? <G key={k} x={-30} y={-300} sx={0.35 + ph * 1.1} sy={(0.35 + ph * 1.1) * 0.3} z={11}><Stroke pts={ellPts(300, 300, 48)} closed w={9} color="#9DB2DA" op={1 - ph} /></G> : null;
          })}
        </>
      )}
      <Rain g={g} n={90} z={60} />
    </>
  );
}

// ── a wrench turns on the pipe: clank ──
const WALL_D = "#2B3546";
export function WrenchMacro({ t }: { t: number }) {
  const snap = WRENCH_SNAP;
  const turn = clamp((t - snap) / 0.07, 0, 1);
  const wob = t < snap ? Math.sin(t * 38) * 1.4 * (t / snap) : 0;
  const ang = -50 - turn * 14 + wob;
  const after = t - snap;
  const dripY = (k: number) => ((t * 520 + k * 130) % 330);
  return (
    <>
      <Fill s={R(1200, 2000, 0)} fill={WALL_D} ow={0} z={0} />
      {[-3, -2, -1, 0, 1, 2, 3].map((i) => <Stroke key={i} pts={[[i * 220, 1000], [i * 220, -1000]]} w={5} color="#222B3A" round={false} z={0.2} />)}
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => <Stroke key={i} pts={[[-700, i * 190 + 60], [700, i * 190 + 60]]} w={5} color="#222B3A" round={false} z={0.2} />)}
      {/* the pipe and its fitting */}
      <G z={5}>
        <Stroke pts={[[-700, 40], [700, 40]]} w={200} color="#B8713A" ow={5.5} round={false} />
        <Stroke pts={[[-700, 112], [700, 112]]} w={34} color="#E0A266" round={false} z={0.2} />
        <Stroke pts={[[-700, -36], [700, -36]]} w={26} color="#9C5B2A" round={false} z={0.2} />
        <Fill s={R(260, 280, 26)} fill="#9C5B2A" ow={5.5} z={1} y={40} />
        <Fill s={R(260, 40, 8)} fill="#C98B50" ow={0} z={1.2} y={140} />
        <Fill s={poly("nut", Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * Math.PI * 2 + 0.5) * 124, Math.sin((i / 6) * Math.PI * 2 + 0.5) * 124] as Pt))} fill="#C9A25C" ow={5.5} z={2} y={40} />
        <Fill s={ell(58, 58)} fill="#8E6A34" ow={5.5} z={2.2} y={40} />
      </G>
      {/* drips, until the wrench bites */}
      {t < snap + 0.04 && [0, 1].map((k) => <Fill key={k} s={ell(1, 1.3, 14)} fill="#BFE3FF" ow={5.5} x={-210 + k * 380} y={-120 - dripY(k)} sx={13} z={6} />)}
      {/* the wrench, and the arm in the pajama sleeve that turns it */}
      <G x={-6} y={40} r={ang} z={8}>
        <Fill s={R(640, 120, 44)} fill="#B7C0CC" ow={5.5} x={390} y={0} />
        <Fill s={R(600, 22, 10)} fill="#E4EAF2" ow={0} x={390} y={26} z={0.2} />
        <Fill s={R(150, 50, 16)} fill="#B7C0CC" ow={5.5} x={110} y={92} z={0.4} />
        <Fill s={R(150, 50, 16)} fill="#B7C0CC" ow={5.5} x={110} y={-92} z={0.4} />
        <Fill s={ell(150, 150)} fill="#B7C0CC" ow={5.5} x={250} y={0} z={0.6} />
        <Fill s={ell(46, 46)} fill="#7E8999" ow={5.5} x={250} y={0} z={0.8} />
        <Fill s={ell(18, 18)} fill="#B7C0CC" ow={0} x={250} y={0} z={0.9} />
        <Fill s={R(620, 104, 40)} fill="#ffffff" map={pajamaTex()} mapId="pajamas" ow={5.5} x={890} y={0} z={1} />
        <Fill s={ell(60, 60)} fill="#F4CDA6" ow={5.5} x={590} y={0} z={1.5} />
      </G>
      {/* clank */}
      {after > 0 && after < 0.4 && <Fill s={burst(250, 250, 10, 0.5)} fill="#FFE9A0" ow={5.5} x={-6} y={40} sx={clamp(after / 0.08, 0, 1)} sy={clamp(after / 0.08, 0, 1)} r={after * 60} z={9} />}
    </>
  );
}

// ── the drain, from above: the water shrinks round the grate, the duck spins down ──
const SPIRAL: Pt[] = Array.from({ length: 70 }, (_, k) => [Math.cos(k * 0.17) * k * 7.6, Math.sin(k * 0.17) * k * 7.6] as Pt);
export function DrainTop({ t, dur }: { t: number; dur: number }) {
  const u = clamp(t / dur, 0, 1);
  const k = Math.max(0.001, 1 - clamp((u - 0.12) / 0.8, 0, 1) ** 1.6 * 0.97); // the water size
  const DR: Pt = [0, 40];
  const spin = u * 420;
  const duckU = clamp((u - 0.05) / 0.8, 0, 1);
  const rad = 340 * (1 - duckU) ** 1.1;
  const ang = Math.PI * 2 * (0.2 + 1.5 * duckU ** 1.3);
  const dx = DR[0] + Math.cos(ang) * rad * k * 1.0, dy = DR[1] + Math.sin(ang) * rad * k * 1.0;
  const dscale = 0.35 + 0.65 * (1 - duckU) ** 0.8;
  const gone = duckU >= 0.98;
  return (
    <>
      <Fill s={R(1200, 2000, 0)} fill="#6B7689" ow={0} z={0} />
      {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((i) => <Stroke key={`v${i}`} pts={[[i * 230, 1000], [i * 230, -1000]]} w={6} color="#5A6577" round={false} z={0.2} />)}
      {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((i) => <Stroke key={`h${i}`} pts={[[-700, i * 230 + 40], [700, i * 230 + 40]]} w={6} color="#5A6577" round={false} z={0.2} />)}
      {/* the grate */}
      <G x={DR[0]} y={DR[1]} z={2}>
        <Fill s={ell(112, 112)} fill="#232A36" ow={5.5} />
        <Fill s={ell(86, 86)} fill="#151A23" ow={0} z={0.1} />
        {[-60, -30, 0, 30, 60].map((o) => <Stroke key={o} pts={[[o, -78], [o, 78]]} w={9} color="#58637A" round={false} z={0.2} />)}
        <Stroke pts={ellPts(112, 112, 40)} closed w={10} color="#58637A" z={0.3} />
      </G>
      {/* the water */}
      <G x={DR[0]} y={DR[1]} z={4} sx={k}>
        <Fill s={ell(540, 540, 72)} fill="#2B78AB" ow={5.5} />
        <Stroke pts={ellPts(430, 430, 60)} closed w={10} color="#6FB8E0" z={0.1} />
        <Stroke pts={ellPts(300, 300, 60)} closed w={9} color="#6FB8E0" z={0.1} />
        <G r={spin} z={0.2}>
          {[0, 120, 240].map((a) => <G key={a} r={a}><Stroke pts={SPIRAL} w={13} color="#CFEAFB" op={0.95} /></G>)}
        </G>
      </G>
      {/* the duck, from above, going round and down */}
      {!gone && (
        <G x={dx} y={dy} z={6} sx={dscale} r={(ang * 180) / Math.PI + 180}>
          <Fill s={ell(70, 54)} fill="#EDBE3A" ow={5.5} />
          <Fill s={ell(36, 24)} fill="#D8A62E" ow={0} x={16} y={26} r={20} z={0.2} />
          <Fill s={ell(36, 24)} fill="#D8A62E" ow={0} x={16} y={-26} r={-20} z={0.2} />
          <Fill s={ell(38, 36)} fill="#EDBE3A" ow={5.5} x={-62} y={0} z={0.4} />
          <Fill s={R(40, 20, 9)} fill="#E8762E" ow={5.5} x={-104} y={0} z={0.3} />
          {[-1, 1].map((sd) => <Fill key={sd} s={ell(5, 5, 10)} fill="#000" ow={0} x={-66} y={sd * 16} z={0.6} />)}
        </G>
      )}
      {/* bubbles at the end */}
      {u > 0.82 && [0, 1, 2, 3].map((i) => <Fill key={i} s={ell(1, 1, 14)} fill="#CFEAFB" ow={5.5} x={DR[0] + (i - 1.5) * 34} y={DR[1] + 20 + ((u - 0.82) * 420 * (0.6 + 0.2 * i))} sx={8 + i * 4} z={7} />)}
    </>
  );
}
