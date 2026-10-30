import React from "react";
import { Inked, Picture, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { Squash, bg, strip, view } from "./pen-stage";
import { BACK, BELOW_LINE, CAFE, COUNTER_WIDE, FIX, LINEUP, TODD, VAULT, WIDE, WV, WIDE_FR, UP } from "./lips-layout";
import { ApronTag, Chalk, FootShadow, ToddBadge } from "./lips-shared";
import { FX, FY, H, L8Actor, Dog8, Sweat, W, shot8 } from "./lips8-shared";
import { FPS, LINE, SHOT_IDS, T, billAt, bumpAt, ease, flightAt, footAt, jarAt, lerp, poseAt, puddleAge, reachAt, rubAt, scrubAt, shakeAt, sipAt, slideAt, splashAge, swingAt, twos, vaultAt, type ShotId } from "./lips8-sched";
import { AirTo, Bill, COAT, COFFEE, CoffeeBody, CoffeeWall, Cup, Foot, INK, LensDrops, Mitten, OverShoulder, PostPhone, PuddleSplash, SKIN, Smoke, TipJar } from "./lips8-fx";
import { ReviewHandPhone8 } from "./lips8-ui";

// The three.js scenes of "Cold Lips" v8 (docs/x06-cold-lips.md, Script v8): one ortho canvas per shot, hard cuts. Her shots look over the counter at the room (the cafe-back plate of v2); Denise's and Todd's shots look the other
// way, at the back wall ("Tip?"'s counter plates), so the cut alone tells who faces whom. Layers: plate 0, chalkboard 2, shadows 3-9, the line behind her 10-58, Denise 40, Todd behind the counter 60-74, her 90 (the dog 95),
// the counter's strip 150, whatever lies on the counter 170, Todd in front of it 120, effects 200+, the lens 300. Every scene is made by shot8() (src/lips8-shared.tsx).
type VW = { s: number; X: (u: number) => number; Y: (v: number) => number };
const TB = (b: string | undefined) => { const L = TODD.bodies[b ?? "beg"]; return L.y + L.h - TODD.pivot[1]; }; // puppet px from Todd's neck pivot to the bottom of the body picture of pose b
const F2 = (x: number, y: number): [number, number] => [FX(x), FY(y)];
const rect = (w: number, h: number): Pt[] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
const TROUSER8 = "#3c3c42";

// ── the line behind her (v2): the four of "Tip?" in the doorway and on the sidewalk outside it
function LineUp({ m, f }: { m: VW; f: number }) {
  return (
    <>
      {LINEUP.map((q, i) => {
        const E = q.k * m.s, fx = m.X(q.u) + W / 2, fy = H / 2 - m.Y(q.v);
        return (
          <React.Fragment key={q.c}>
            <FootShadow x={fx} y={fy} w={288 * E} order={3 + i} />
            <L8Actor c={q.c} f={f} nx={fx} ny={fy - BELOW_LINE[q.c] * E} E={E} order={10 + 16 * i} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ── her shots: the cafe-back plate, the line behind her, her at the counter (the counter's strip hides her lower half), the dog in her purse. `extra` draws what is in front of her
type HerFr = { s: number; u0: number; v0: number; neck: [number, number]; E: number; dog: boolean; line: boolean };
const HER: Record<string, HerFr> = {
  med: { s: 2, u0: 228, v0: 359, neck: [680, 765], E: 1.4, dog: true, line: true }, // v2's hook
  medL: { s: 2, u0: 228, v0: 359, neck: [600, 765], E: 1.4, dog: true, line: true }, // v2's review, ugh
  c18: { s: 2, u0: 228, v0: 384, neck: [560, 924], E: 1.8, dog: false, line: true }, // v2's free
  c18m: { s: 2, u0: 228, v0: 384, neck: [540, 905], E: 1.8, dog: false, line: true },
  c19: { s: 2, u0: 228, v0: 384, neck: [540, 906], E: 1.9, dog: false, line: true }, // v2's coldLips
  c20: { s: 2, u0: 228, v0: 384, neck: [540, 886], E: 2.0, dog: false, line: true }, // v2's anythingQ
  c215: { s: 2, u0: 228, v0: 384, neck: [540, 912], E: 2.15, dog: false, line: true }, // v2's kissAss
};
const her = (F: HerFr, extra?: React.FC<{ f: number; F: HerFr }>) => shot8(({ f }) => {
  const m = view(F.s, F.u0, F.v0), p = poseAt("customer", f);
  const X = extra;
  return (
    <>
      {bg(m, BACK.file)}
      {F.line && <LineUp m={m} f={f} />}
      <L8Actor c="customer" f={f} nx={F.neck[0]} ny={F.neck[1]} E={F.E} order={90} />
      {F.dog && <Dog8 nx={F.neck[0]} ny={F.neck[1]} E={F.E} p={p} f={f} order={95} />}
      {strip(m, BACK.strip, BACK.y0, 150)}
      {X && <X f={f} F={F} />}
    </>
  );
}, [F.neck[0], F.neck[1] - 140 * F.E]);

// ── Denise at the counter (the counter plate of "Tip?"): the chalkboard, her in the apron with her name tag, coffee on her once it has hit her, the counter's strip in front. `goggles`: the next morning
type DenFr = { neck: [number, number]; E: number; m?: [number, number, number] };
const DEN: Record<string, DenFr> = {
  c11: { neck: [540, 901], E: 1.1 }, // v2's denCoffee
  c125: { neck: [540, 990], E: 1.25 },
};
function Denise({ f, F, goggles, dx = 0, dy = 0 }: { f: number; F: DenFr; goggles?: boolean; dx?: number; dy?: number }) {
  const p = poseAt("deniseHood", f), wet = f / FPS >= T.hit && !goggles;
  const nx = F.neck[0] + dx, ny = F.neck[1] + dy;
  return (
    <>
      <L8Actor c="deniseHood" f={f} nx={nx} ny={ny} E={F.E} order={40} goggles={goggles} />
      <ApronTag nx={nx} ny={ny} E={F.E} p={p} order={45} />
      {wet && (
        <group position={[FX(nx) + (p.dx ?? 0), FY(ny) + p.breath * F.E, 0]} scale={[F.E, F.E, 1]}>
          <CoffeeBody order={46} />
        </group>
      )}
    </>
  );
}
const den = (F: DenFr, extra?: React.FC<{ f: number }>, o: { goggles?: boolean; bump?: (f: number) => [number, number] } = {}) => shot8(({ f }) => {
  const m = view(2, 90, 110), b = o.bump ? o.bump(f) : [0, 0];
  const X = extra;
  return (
    <group position={[b[0], b[1], 0]}>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <Denise f={f} F={F} goggles={o.goggles} />
      {strip(m, "sp/tip-fg-cafe.png", CAFE.counterTop, 150)}
      {X && <X f={f} />}
    </group>
  );
}, [F.neck[0], F.neck[1] - 190 * F.E]);

// ═════════════════════════════════════════════════════════════ 1-4: the hook
// ── 1 throw: Denise over her shoulder; the arm whips forward, the wall of coffee flies from the cup and hits her face on `hit`; the frame shakes and drops hit the lens. 31 windup: the same framing the next morning (Denise in her
// goggles, braced), the arm cocks back with a full cup: the reel loops into the first frame
const DEN_FACE: [number, number] = [540, 901 - 173 * 1.1];
const Throw = shot8(({ f }) => {
  const m = view(2, 90, 110), sh = shakeAt(f), sw = swingAt(f), age = splashAge(f);
  const target: [number, number] = [740, 1230];
  return (
    <>
      <group position={[sh[0], sh[1], 0]}>
        {bg(m, "sp/tip-bg-cafe.jpg")}
        <Chalk m={m} rect={CAFE.chalk} />
        <Denise f={f} F={DEN.c11} />
        {strip(m, "sp/tip-fg-cafe.png", CAFE.counterTop, 150)}
        <CoffeeWall from={[655, 887]} to={DEN_FACE} u={flightAt(f)} age={age} order={160} />
        <OverShoulder swing={sw} target={target} full={false} order={200} />
      </group>
      <LensDrops age={age} order={300} />
    </>
  );
});
const Windup = shot8(({ f }) => {
  const m = view(2, 90, 110), sw = swingAt(f);
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <Denise f={f} F={DEN.c11} goggles />
      {strip(m, "sp/tip-fg-cafe.png", CAFE.counterTop, 150)}
      <OverShoulder swing={sw} target={[740, 1230]} full order={200} />
    </>
  );
});
// ── 2 soaked: Denise close, frozen mid-blink, coffee running down her face; the empty cup drops onto her head like a hat
const Soaked = den(DEN.c125);
// ── 3 tooHot: her, purple, shaking, screaming; the dog snarls in her purse. 4 postJab: the same, with her phone jabbed at Denise (at the camera): one star, TOO HOT, the giant red POST button
const TooHot = her(HER.med);
const HotClose = her(HER.c215);
const PhoneJab = ({ f }: { f: number }) => {
  const t = f / FPS, a = t - T.s4, k = 1 + 0.25 * Math.exp(-a / 0.08) * Math.cos(a * 40) * (a > 0 ? 1 : 0);
  const pulse = Math.max(0, 1 - Math.abs(t - T.badT) / 0.15);
  return <PostPhone x={FX(420)} y={FY(1330)} k={1.28 * k + 0.06 * pulse} rot={-6} glow={pulse > 0.3 ? 1 : 0} order={200} />;
};
const PostJab = her(HER.med, PhoneJab);

// ═════════════════════════════════════════════════════════════ 5-7: Todd
// ── 5 vault: the wide counter plate; Denise behind the counter (soaked, the cup on her head); Todd springs up from behind it, flies over it tucked and lands on his knees in the coffee in front of it: a squash, a splash, a bump
const PUDDLE: [number, number] = [VAULT.x1, VAULT.feet1];
const Vault = shot8(({ f }) => {
  const m = view(WV.s, WV.u0, WV.v0), D = WIDE_FR.den, cc = COUNTER_WIDE;
  const v = vaultAt(f), pv = poseAt("todd", f), bk = bumpAt(f, T.land);
  const u = v.u, nx = lerp(VAULT.x0, VAULT.x1, u) + 30 * v.skid, feet = lerp(VAULT.feet0, VAULT.feet1, u) - VAULT.apex * v.h, E = lerp(VAULT.E0, VAULT.E1, u);
  const ny = feet - TB(pv.body) * E, front = u >= 0.5;
  const sx = 1 + 0.18 * v.sq + 0.18 * v.crouch, sy = lerp(1, VAULT.crouch, v.crouch) - 0.18 * v.sq;
  return (
    <group position={[bk[0], bk[1], 0]}>
      {bg(m, "sp/tip-bg-cafeWide.jpg")}
      <Chalk m={m} rect={WIDE.chalk} />
      <Denise f={f} F={{ neck: D.neck, E: D.E }} />
      <Inked pts={xf(ellipsePts(0, 0, 230, 46, 40), ...F2(PUDDLE[0] + 20, PUDDLE[1] + 10))} color={COFFEE.fill} ink={COFFEE.ink} w={3} order={20} op={0.9} />
      <FootShadow x={nx} y={feet + 6} w={300 * E} order={30} op={0.4 * u * u} />
      <Squash x={FX(nx)} y={FY(feet)} sx={sx} sy={sy}>
        <L8Actor c="todd" f={f} nx={nx} ny={ny} E={E} order={front ? 120 : 60} />
        <ToddBadge nx={nx} ny={ny} E={E} p={pv} order={front ? 125 : 65} />
      </Squash>
      <Picture file="sp/tip-fg-cafe-counter.png" w={cc.w * m.s} h={cc.h * m.s} x={m.X(cc.x0 + cc.w / 2)} y={m.Y(cc.y0 + cc.h / 2)} order={100} alpha />
      <PuddleSplash at={[PUDDLE[0] + 20, PUDDLE[1]]} age={puddleAge(f)} order={140} k={1.2} />
    </group>
  );
}, [540, 1000]);
// ── 6 shoe: the floor, her black flat with one brown drop on its toe, his red tie scrubbing it back and forth (his hand holding the tie); the puddle round it. His "MA'AM!" is over it
const SHOE: Pt[] = [[-330, -40], [-300, 40], [-180, 70], [-40, 80], [60, 110], [190, 120], [250, 90], [262, 10], [250, -60], [-330, -60]]; // a flat, toe to the left, the heel at the right (frame px about its middle, y up)
const Shoe = shot8(({ f }) => {
  const sc = scrubAt(f), planks = Array.from({ length: 18 }, (_, i) => i), floor = 1330;
  const toe: [number, number] = [330, floor - 70], tieTip: [number, number] = [toe[0] + 40 + 50 * sc, toe[1] - 30];
  return (
    <>
      <Poly pts={xf(rect(1300, 2000), ...F2(540, 960))} color="#efe3c8" order={0} />
      {planks.map((i) => <Inked key={i} pts={xf(rect(1400, 90), ...F2(540 + (i % 2) * 40, floor + 45 + i * 90))} color={i % 2 ? "#c8975e" : "#bd8c55"} ink="#7a5634" w={3} order={1} />)}
      <Inked pts={xf(ellipsePts(0, 0, 520, 70, 48), ...F2(600, floor + 30))} color={COFFEE.fill} ink={COFFEE.ink} w={3} order={2} op={0.9} />
      <Inked pts={ribbon([[...F2(690, -60), 330], [...F2(680, 700), 320], [...F2(660, floor - 170), 300]])} color={TROUSER8} ink="#18181c" w={5} order={5} />
      <Inked pts={xf(ellipsePts(0, 0, 120, 70, 30), ...F2(640, floor - 130))} color={SKIN.customer} ink={INK.customer} w={4} order={6} />
      <Inked pts={xf(SHOE, ...F2(600, floor - 60), 0, 1.25)} color="#1c1c20" ink="#060608" w={5} order={7} />
      <Poly pts={xf(ribbon([[-280, 30, 12], [-120, 62, 14]]), ...F2(600, floor - 60), 0, 1.25)} color="#ffffff" order={7.4} op={0.3} />
      <Inked pts={xf(ellipsePts(0, 0, 34, 26, 20), ...F2(toe[0] + 30, toe[1] - 40))} color={COFFEE.fill} ink={COFFEE.ink} w={3} order={8} />
      <Poly pts={xf(ellipsePts(0, 0, 9, 6, 12), ...F2(toe[0] + 20, toe[1] - 50))} color="#fff4e4" order={8.1} op={0.85} />
      <Inked pts={ribbon([[...F2(-80, 260), 150], [...F2(120, 700), 140], [...F2(tieTip[0] - 40, tieTip[1] - 180), 120], [...F2(tieTip[0], tieTip[1] - 40), 80]])} color="#d01b1b" ink="#6b0a0a" w={5} order={20} />
      <Mitten x={FX(tieTip[0] - 70)} y={FY(tieTip[1] - 230)} rot={150} s={2.8} skin={SKIN.todd} ink={INK.todd} order={22} lw={5} />
      <Inked pts={ribbon([[...F2(tieTip[0] - 120, tieTip[1] - 330), 120], [...F2(-200, 300), 150]])} color={SKIN.todd} ink={INK.todd} w={5} order={21} />
    </>
  );
});
// ── 7 didAny: Todd on his knees in the puddle in front of the counter (the counter plate), looking up at her, shrieking; sweat flies off on every loud syllable
const TODD_K = { s: 2, u0: 90, v0: 300, neck: [560, 1040] as [number, number], E: 1.3 };
const DidAny = shot8(({ f }) => {
  const F = TODD_K, m = view(F.s, F.u0, F.v0), p = poseAt("todd", f), feet = F.neck[1] + TB(p.body) * F.E;
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <Inked pts={xf(ellipsePts(0, 0, 420, 70, 40), ...F2(F.neck[0], feet - 10))} color={COFFEE.fill} ink={COFFEE.ink} w={3} order={20} op={0.9} />
      <L8Actor c="todd" f={f} nx={F.neck[0]} ny={F.neck[1]} E={F.E} order={40} />
      <ToddBadge nx={F.neck[0]} ny={F.neck[1]} E={F.E} p={p} order={45} />
      <Sweat hx={F.neck[0] + p.dx * F.E} hy={F.neck[1] - UP.todd * F.E} E={F.E} f={f} ts={LINE(2).peaks.flatMap((q) => [q.f / FPS, q.f / FPS])} />
    </>
  );
}, [560, 700]);

// ═════════════════════════════════════════════════════════════ 8-14: the money, the tip, the jar
const Money = her(HER.c18);
// ── 9 bill: her open palm (her sleeve from the left), his hand slaps a bill into it from above
const BillShot = shot8(({ f }) => {
  const m = view(2.4, 200, 520), palm: [number, number] = [470, 1150];
  return (
    <>
      {bg(m, BACK.file)}
      <Poly pts={rect(W * 1.2, H * 1.2)} color="#1a1008" op={0.25} order={3} />
      <Inked pts={ribbon([[...F2(-120, 1330), 230], [...F2(200, 1240), 200], [...F2(palm[0] - 110, palm[1] + 30), 170]])} color={COAT.fill} ink={COAT.ink} w={4} order={10} />
      <Mitten x={FX(palm[0])} y={FY(palm[1])} rot={-35} s={3.1} skin={SKIN.customer} ink={INK.customer} order={12} lw={5} flip />
      <BillOnPalm f={f} palm={palm} />
    </>
  );
}, [540, 1100]);
function BillOnPalm({ f, palm }: { f: number; palm: [number, number] }) {
  const b = billAt(f), y = palm[1] - 70 - 420 * (1 - b.down);
  return (
    <>
      <BillPlane x={palm[0] + 30} y={y} />
      <Mitten x={FX(palm[0] + 60)} y={FY(y - 60)} rot={200} s={3.0} skin={SKIN.todd} ink={INK.todd} order={30} lw={5} />
      <Inked pts={ribbon([[...F2(palm[0] + 120, y - 200), 140], [...F2(palm[0] + 360, y - 620), 160], [...F2(palm[0] + 600, y - 1100), 175]])} color={SKIN.todd} ink={INK.todd} w={4} order={28} />
    </>
  );
}
const BillPlane = ({ x, y }: { x: number; y: number }) => <Bill x={FX(x)} y={FY(y)} s={2.1} rot={-8} order={26} />;
const MyTip = her(HER.c18);
// ── 11 didntTip: Denise, dripping, the cup on her head, one eye twitching
const DidntTip = den(DEN.c11);
// ── 12 inMyHead: Denise's view: she leans in until her face fills the frame (the shot's push), a whisper
const InMyHead = her(HER.c18m);
// ── 13 jar: the tip jar comes in from the right, shoved by his two hands into her arms; the coins jingle on the landing. 14 betterHome: she holds it
const JarIn = ({ f }: { f: number }) => {
  const j = jarAt(f), x = lerp(1250, 640, j.u), y = lerp(1000, 1080, j.u);
  return (
    <>
      <Squash x={FX(x)} y={FY(y + 230)} sx={1 + 0.08 * j.sq} sy={1 - 0.08 * j.sq}>
        <TipJar x={FX(x)} y={FY(y)} k={0.5} rot={-6 + 6 * j.u} order={200} />
      </Squash>
      <Mitten x={FX(x + 150)} y={FY(y + 20)} rot={100} s={1.8} skin={SKIN.todd} ink={INK.todd} order={205} lw={4} flip />
      <Mitten x={FX(x + 120)} y={FY(y + 200)} rot={80} s={1.8} skin={SKIN.todd} ink={INK.todd} order={205} lw={4} flip />
      <Inked pts={ribbon([[...F2(x + 230, y + 30), 70], [...F2(1180, y + 60), 80]])} color={SKIN.todd} ink={INK.todd} w={3} order={204} />
      <Inked pts={ribbon([[...F2(x + 200, y + 210), 70], [...F2(1180, y + 260), 80]])} color={SKIN.todd} ink={INK.todd} w={3} order={204} />
    </>
  );
};
const Jar = her(HER.med, JarIn);
const JarHeld = () => <TipJar x={FX(560)} y={FY(1150)} k={0.5} rot={-3} order={200} />;
const BetterHome = her(HER.c18, JarHeld);

// ═════════════════════════════════════════════════════════════ 15-18: Denise explodes, the turn, his hand over her mouth
const Vein = den(DEN.c125);
const WhyHere = den(DEN.c125, undefined, { bump: (f) => bumpAt(f, T.cork, 10) });
const TurnPhone = ({ f }: { f: number }) => {
  const t = f / FPS, up = ease((t - T.turn0) / 0.25), glow = twos(f) % 8 < 4 ? 1 : 0;
  return <PostPhone x={FX(420)} y={FY(1330 + 300 * (1 - up))} k={1.2} rot={-4} glow={up > 0.9 ? glow : 0} order={200} />;
};
const TurnPost = her(HER.medL, TurnPhone);
// ── 18 hands: the counter plate, Denise on the left; Todd flies in from the right in his pointing pose and his reaching hand claps over her mouth; he shrieks at her (at the camera), sweating
const HANDS = { den: { neck: [360, 901] as [number, number], E: 1.05 }, todd: { from: [1350, 700] as [number, number], to: [750, 820] as [number, number], E: 1.3 }, hand: [-297, -6] as [number, number] }; // the pointing hand's middle, puppet px of the point pose (measured on its picture)
const Hands = shot8(({ f }) => {
  const m = view(2, 90, 110), r = reachAt(f), p = poseAt("todd", f);
  const tx = lerp(HANDS.todd.from[0], HANDS.todd.to[0], r.u), ty = lerp(HANDS.todd.from[1], HANDS.todd.to[1], r.u) - 80 * Math.sin(Math.PI * r.u);
  const E = HANDS.todd.E, hx = tx + HANDS.hand[0] * E, hy = ty - HANDS.hand[1] * E, on = r.u >= 1;
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <Denise f={f} F={HANDS.den} />
      <Squash x={FX(tx)} y={FY(ty)} sx={1 + 0.05 * r.sq} sy={1 - 0.05 * r.sq}>
        <L8Actor c="todd" f={f} nx={tx} ny={ty} E={E} order={60} pose={(q) => ({ ...q, tilt: q.tilt - 6 * (1 - r.u) })} />
        <ToddBadge nx={tx} ny={ty} E={E} p={p} order={65} />
      </Squash>
      <Mitten x={FX(hx + 10)} y={FY(hy)} rot={95} s={2.2} skin={SKIN.todd} ink={INK.todd} order={70} lw={4} flip />
      {on && <Mitten x={FX(hx + 40)} y={FY(hy + 46)} rot={80} s={2.1} skin={SKIN.todd} ink={INK.todd} order={71} lw={4} flip />}
      {strip(m, "sp/tip-fg-cafe.png", CAFE.counterTop, 150)}
      <Sweat hx={tx + p.dx * E} hy={ty - UP.todd * E} E={E} f={f} ts={LINE(10).peaks.flatMap((q) => [q.f / FPS, q.f / FPS])} />
    </>
  );
}, [600, 800]);

// ═════════════════════════════════════════════════════════════ 19-25: the foot
const AnythingQ = her(HER.c20);
const RubFeet = her(HER.c215);
// ── 21 foot: her bare foot comes up from below and slaps onto the counter right in front of Denise's face, the sole toward us, the toes wiggling; Denise recoils
const FOOT_ON = { x: 805, s: 1.45, heel: 1300 };
const FootUp = ({ f }: { f: number }) => {
  const a = footAt(f), y0 = FOOT_ON.heel - 172 * FOOT_ON.s, y = lerp(2500, y0, a.u);
  return (
    <Squash x={FX(FOOT_ON.x)} y={FY(FOOT_ON.heel)} sx={1 + 0.07 * a.sq} sy={1 - 0.07 * a.sq}>
      <Foot x={FX(FOOT_ON.x)} y={FY(y)} s={FOOT_ON.s} rot={-6} wig={a.wig} order={170} />
    </Squash>
  );
};
const FootShot = den(DEN.c11, FootUp);
// ── 22 rub: Todd behind the counter, his sweating face over the toes of the foot on the counter; his hands rub its sides up and down like he is starting a fire (each hand drawn three times along its stroke: a blur); smoke
const RUB = { foot: [540, 1190] as [number, number], s: 2.5, todd: { neck: [540, 640] as [number, number], E: 0.95 } };
const Rub = shot8(({ f }) => {
  const m = view(2, 90, 110), p = poseAt("todd", f), ph = rubAt(f), t0 = f / FPS - T.s22;
  const hw = 98 * RUB.s;
  void p;
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <L8Actor c="todd" f={f} nx={RUB.todd.neck[0]} ny={RUB.todd.neck[1]} E={RUB.todd.E} order={60} />
      <Foot x={FX(RUB.foot[0])} y={FY(RUB.foot[1])} s={RUB.s} wig={Math.sin(ph * 0.5)} leg={false} order={170} />
      {[-1, 1].map((side) => [0.5, 0.25, 0].map((lag, j) => {
        const y = RUB.foot[1] - 40 + 150 * Math.sin(ph - lag * 2.2) * side;
        return <Mitten key={`${side}${j}`} x={FX(RUB.foot[0] + side * (hw + 10))} y={FY(y)} rot={side * 90} s={2.7} skin={SKIN.todd} ink={INK.todd} flip={side > 0} order={190 + j} op={[0.25, 0.5, 1][j]} lw={5} />;
      }))}
      <Smoke at={[RUB.foot[0] - hw - 20, RUB.foot[1] - 60]} hw={50} t={t0} order={210} k={1.7} />
      <Smoke at={[RUB.foot[0] + hw + 20, RUB.foot[1] - 60]} hw={50} t={t0 - 0.05} order={211} k={1.7} />
      <Sweat hx={RUB.todd.neck[0]} hy={RUB.todd.neck[1] - UP.todd * RUB.todd.E} E={RUB.todd.E} f={f} ts={Array.from({ length: 6 }, (_, i) => T.s22 + 0.06 + i * 0.13)} />
    </>
  );
}, [540, 900]);
// ── 23 melt: her, the dog in her purse; her eyes roll back, the purple drains out of her face, the dog's back leg kicks
const Melt = her(HER.medL);
const Twitch = den(DEN.c125);
// ── 25 coldHands: her, flat again; the smoke still curls up past her face from the foot below the frame
const SmokeUp = ({ f }: { f: number }) => (
  <>
    <Smoke at={[300, 1700]} hw={60} t={f / FPS - T.s22} order={210} k={1.3} op={0.8} />
    <Smoke at={[780, 1700]} hw={60} t={f / FPS - T.s22 - 0.2} order={211} k={1.3} op={0.8} />
  </>
);
const ColdHands = her(HER.c19, SmokeUp);

// ═════════════════════════════════════════════════════════════ 26-31: the review, the next morning, the loop
const Review = shot8(({ f }) => {
  const m = view(2, 228, 320);
  return (
    <>
      {bg(m, BACK.file)}
      <Poly pts={rect(W * 1.2, H * 1.2)} color="#06080c" op={0.66} order={5} />
      <ReviewHandPhone8 f={f} order={20} />
    </>
  );
});
// ── 27 morning: the counter plate; Denise in swim goggles on the left, Todd on the right blasting his raised hand with the hair dryer; the door bangs open off screen (the card is DOM, src/lips8-ui.tsx)
const DY = FIX.todd.dryer;
const MORN = { den: { neck: [370, 930] as [number, number], E: 1.0 }, todd: { neck: [770, 1000] as [number, number], E: 1.05 } };
const Morning = shot8(({ f }) => {
  const m = view(2, 90, 110), p = poseAt("todd", f), T2 = MORN.todd;
  const nozzle: [number, number] = [T2.neck[0] + (DY.endX - TODD.pivot[0]) * T2.E, T2.neck[1] - (TODD.pivot[1] - DY.endY) * T2.E - p.breath * T2.E];
  const handAt: [number, number] = [T2.neck[0] + 30 * T2.E, T2.neck[1] - 120 * T2.E - p.breath * T2.E];
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <Denise f={f} F={MORN.den} goggles />
      <L8Actor c="todd" f={f} nx={T2.neck[0]} ny={T2.neck[1]} E={T2.E} order={60} />
      <ToddBadge nx={T2.neck[0]} ny={T2.neck[1]} E={T2.E} p={p} order={65} />
      <group position={[FX(T2.neck[0]) + (p.dx ?? 0), FY(T2.neck[1]) + p.breath * T2.E, 0]} scale={[T2.E, T2.E, 1]}>
        <Picture file={DY.file} w={DY.w} h={DY.h} x={DY.x + DY.w / 2 - TODD.pivot[0]} y={TODD.pivot[1] - (DY.y + DY.h / 2)} order={76} alpha />
      </group>
      <Mitten x={FX(handAt[0])} y={FY(handAt[1])} rot={-100 + 6 * Math.sin(twos(f) * 0.9)} s={1.9} skin={SKIN.todd} ink={INK.todd} order={78} lw={4} />
      <AirTo from={nozzle} to={[handAt[0] - 20, handAt[1]]} t={twos(f) / FPS} order={80} />
      {strip(m, "sp/tip-fg-cafe.png", CAFE.counterTop, 150)}
    </>
  );
}, [540, 800]);
const Usual = her(HER.med);
// ── 29 slide: the counter top; Denise's hand slides a steaming coffee across it toward her
const Slide = shot8(({ f }) => {
  const m = view(3, 100, 321), u = slideAt(f), x = lerp(330, 690, u), top = (CAFE.counterTop - 321) * 3, cs = 2.6;
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      {strip(m, "sp/tip-fg-cafe.png", CAFE.counterTop, 150)}
      <Cup x={FX(x)} y={FY(top - 75 * cs)} s={cs} order={170} />
      <Smoke at={[x, top - 170 * cs]} hw={24} t={f / FPS - T.s29 + 0.6} order={180} k={0.8} op={0.55} />
      <Inked pts={ribbon([[...F2(-200, top - 150), 190], [...F2(x - 300, top - 140), 160]])} color="#8e8f96" ink="#3f4046" w={5} order={168} />
      <Mitten x={FX(x - 52 * cs - 70)} y={FY(top - 120)} rot={-90} s={2.8} skin={SKIN.denise} ink={INK.denise} order={175} lw={5} />
    </>
  );
}, [540, 960]);
// ── 30 sip: her, the cup at her lips; it comes down and her face snaps purple, the vein throbs
const SipCup = ({ f, F }: { f: number; F: HerFr }) => {
  const s = sipAt(f), mouth: [number, number] = [F.neck[0] + 0.5 * F.E, F.neck[1] - 43.5 * F.E];
  const cx = mouth[0] + lerp(120, 92, s.up), cy = mouth[1] + lerp(330, 78, s.up), rot = lerp(0, 32, s.up);
  return (
    <>
      <Cup x={FX(cx)} y={FY(cy)} s={1.6} rot={rot} order={200} />
      <Mitten x={FX(cx + 40)} y={FY(cy + 70)} rot={-60 + rot} s={2.0} skin={SKIN.customer} ink={INK.customer} order={201} lw={4} />
    </>
  );
};
const Sip = her(HER.c18, SipCup);

// ═════════════════════════════════════════════════════ the scenes of this file
const DRAWN: Record<ShotId, React.FC<{ f: number }>> = {
  throw: Throw, soaked: Soaked, tooHot: TooHot, hotClose: HotClose, postJab: PostJab, vault: Vault, shoe: Shoe, didAny: DidAny, money: Money, bill: BillShot, myTip: MyTip,
  didntTip: DidntTip, inMyHead: InMyHead, jar: Jar, betterHome: BetterHome, vein: Vein, whyHere: WhyHere, turnPost: TurnPost, hands: Hands, anythingQ: AnythingQ, rubFeet: RubFeet,
  foot: FootShot, rub: Rub, melt: Melt, twitch: Twitch, coldHands: ColdHands, review: Review, morning: Morning, usual: Usual, slide: Slide, sip: Sip, windup: Windup,
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = Object.fromEntries(SHOT_IDS.map((id) => [id, DRAWN[id]])) as Record<ShotId, React.FC<{ f: number }>>;
