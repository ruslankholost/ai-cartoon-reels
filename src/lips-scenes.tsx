import React from "react";
import { Inked, Picture, Poly, ribbon, xf, type Pt } from "./sp-puppet";

import { inkAt } from "./sp-fx";
import { Squash, bg, strip, view } from "./pen-stage";
import { BACK, BELOW_LINE, CAFE, COUNTER_WIDE, CUS, DEN_FR, FIRED_LIFT, FIX, KNEEL, LINEUP, MORNING, SIDE, SIDE_RIG, TODD, TODD_FR, UP, VAULT, WIDE, WIDE_FR, WV, type CusFr } from "./lips-layout";
import { DROP_SIZE, SHOT_IDS, SWEAT_T, bumpAt, doorAngle, dogAt, kissAt, lerp, poseAt, sideAt, sweatAt, twos, vaultAt, type ShotId } from "./lips-sched";
import { ApronTag, Chalk, Dog, FX, FY, FootShadow, H, LActor, LipsDoor, Placeholder, SideDog, ToddBadge, W, shot } from "./lips-shared";
import { ReviewHandPhone } from "./lips-ui";

// The three.js scenes of "Cold Lips" (docs/x06-cold-lips.md): one full-frame ortho canvas per shot (the stage of src/pen-stage.tsx), hard cuts, one scene per framing. Her shots look over the counter at the room (the
// cafe-back plate, src/lips-layout.ts CUS); Denise's and Todd's shots look the other way, at the back wall behind the counter ("Tip?"'s plates), so the cut alone tells who faces whom. The pose of every puppet is this
// episode's (src/lips-sched.ts poseAt). Everything that moves hangs on a take or on a measured sound peak (src/lips-sched.ts T and HITS); this file only draws it. Order of the layers (a puppet takes 15: its body at
// `order`, its head at +10, its face up to +14.6): plate 0, chalkboard 2, shadows 3-9, the line behind her 10-58 (16 apart), Denise 40, Todd behind a counter 60-74, her 90 (body 90, the dog 95, head 100), the counter's
// strip 100-150, Todd in front of it 120, effects 200+. Every scene that loads a picture is made by shot() (src/lips-shared.tsx), never by a component that renders <Panel> itself.
type VW = { s: number; X: (u: number) => number; Y: (v: number) => number };
const TB = (b: string | undefined) => { const L = TODD.bodies[b ?? "beg"]; return L.y + L.h - TODD.pivot[1]; }; // puppet px from Todd's neck pivot to the bottom of the body picture of pose b
const feetOf = (pose: string | undefined, E: number, ny: number) => ny + TB(pose) * E;
const rect = (w: number, h: number): Pt[] => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];

// ── the line behind her: the four of "Tip?" in the doorway and on the sidewalk outside it (a line out of the door), smaller the farther they stand, each with its contact shadow
function LineUp({ m, f }: { m: VW; f: number }) {
  return (
    <>
      {LINEUP.map((q, i) => {
        const E = q.k * m.s, fx = m.X(q.u) + W / 2, fy = H / 2 - m.Y(q.v);
        return (
          <React.Fragment key={q.c}>
            <FootShadow x={fx} y={fy} w={288 * E} order={3 + i} />
            <LActor c={q.c} f={f} nx={fx} ny={fy - BELOW_LINE[q.c] * E} E={E} order={10 + 16 * i} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ── her shots: the cafe-back plate, the line behind her, her at the counter (her lower half is hidden by the counter's strip), the dog in her purse
const her = (id: ShotId, o: { line?: boolean } = {}) => shot(({ f }) => {
  const F = CUS[id] as CusFr, m = view(F.s, F.u0, F.v0), p = poseAt("customer", f);
  return (
    <>
      {bg(m, BACK.file)}
      {o.line !== false && <LineUp m={m} f={f} />}
      <LActor c="customer" f={f} nx={F.neck[0]} ny={F.neck[1]} E={F.E} order={90} />
      {F.dog && <Dog nx={F.neck[0]} ny={F.neck[1]} E={F.E} p={p} d={dogAt(f)} order={95} />}
      {strip(m, BACK.strip, BACK.y0, 150)}
    </>
  );
}, [CUS[id]!.neck[0], CUS[id]!.neck[1] - 140 * CUS[id]!.E]);
const Hook = her("hook"), Review = her("review"), Free = her("free"), Liked = her("liked"), Ugh = her("ugh"), AnythingQ = her("anythingQ"), KissAss = her("kissAss"), ColdLips = her("coldLips"), Usual = her("usual", { line: false });

// ── Denise at the counter, looking at the back wall's side (the counter plate of "Tip?"): the chalkboard, her in the apron with her name tag, the counter's strip in front
const den = (id: "denCoffee" | "denTurn") => shot(({ f }) => {
  const F = DEN_FR[id]!, m = view(F.s, F.u0, F.v0), p = poseAt("deniseHood", f);
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <LActor c="deniseHood" f={f} nx={F.neck[0]} ny={F.neck[1]} E={F.E} order={40} />
      <ApronTag nx={F.neck[0]} ny={F.neck[1]} E={F.E} p={p} order={45} />
      {strip(m, "sp/tip-fg-cafe.png", CAFE.counterTop, 150)}
    </>
  );
}, [DEN_FR[id]!.neck[0], DEN_FR[id]!.neck[1] - 180]);
const DenCoffee = den("denCoffee"), DenTurn = den("denTurn");

// ── a sweat drop: a teardrop of pale blue with the show's ink line, flung off Todd's head on a loud syllable; its tail trails behind it
const DROP: Pt[] = (() => { // the apex (0, 2.2), the circle of radius 1, joined along the two tangents from the apex (they touch the circle 63 degrees from the axis)
  const a0 = (27 * Math.PI) / 180, a1 = ((153 - 360) * Math.PI) / 180, n = 20;
  return [[0, 2.2], ...Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [Math.cos(a), Math.sin(a)] as Pt; })];
})();
function Sweat({ nx, ny, E, f }: { nx: number; ny: number; E: number; f: number }) {
  const hx = nx, hy = ny - UP.todd * E; // the middle of his head, frame px
  return (
    <>
      {SWEAT_T.map((_, i) => {
        const q = sweatAt(i, f);
        if (!q.on) return null;
        return <Inked key={i} pts={xf(DROP, FX(hx + q.x * E), FY(hy - q.y * E), 180 - q.rot, DROP_SIZE * E)} color="#a9ddff" ink="#2d6c9c" w={inkAt(E) * 1.1} order={220} op={q.a} />;
      })}
    </>
  );
}
// ── Todd close, begging, in front of the counter (the plate's floor under his feet), his badge, the sweat
const Anything = shot(({ f }) => {
  const F = TODD_FR.anything!, m = view(F.s, F.u0, F.v0), p = poseAt("todd", f), feet = feetOf(p.body, F.E, F.neck[1]);
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <FootShadow x={F.neck[0] + p.dx * F.E} y={feet + 6} w={300 * F.E} order={30} />
      <LActor c="todd" f={f} nx={F.neck[0]} ny={F.neck[1]} E={F.E} order={40} />
      <ToddBadge nx={F.neck[0]} ny={F.neck[1]} E={F.E} p={p} order={45} />
      <Sweat nx={F.neck[0] + p.dx * F.E} ny={F.neck[1]} E={F.E} f={f} />
    </>
  );
}, [560, 700]);

// ── the hair dryer (shot 20): Todd behind the counter, in the dryer pose. The dryer is drawn over his head (src/lips-fix.json: the whole dryer cut out of the picture the prep cut his body from, its nozzle made longer so that it ends a few
// px short of his puckered lips); his head has slid into the stream and the pucker is at the nozzle's height. Hot air: a few thin translucent white strokes that wave from the nozzle's end past the lips, no outline. The hair
// flutters in it: strands streaming from the top and the left temple of his head
const DY = FIX.todd.dryer;
function DryerFg({ nx, ny, E, p, order }: { nx: number; ny: number; E: number; p: { dx?: number; breath: number }; order: number }) {
  return (
    <group position={[FX(nx) + (p.dx ?? 0), FY(ny) + p.breath * E, 0]} scale={[E, E, 1]}>
      <Picture file={DY.file} w={DY.w} h={DY.h} x={DY.x + DY.w / 2 - TODD.pivot[0]} y={TODD.pivot[1] - (DY.y + DY.h / 2)} order={order} alpha />
    </group>
  );
}
function Air({ nx, ny, E, f, hdx }: { nx: number; ny: number; E: number; f: number; hdx: number }) {
  const t = twos(f) / 30;
  const ex = nx + (DY.endX - TODD.pivot[0]) * E + 2, ey = ny + (DY.endY - TODD.pivot[1]) * E; // the nozzle's end, frame px
  const lx = nx + (TODD.mouth.cx - TODD.pivot[0] + hdx) * E + 0.4 * TODD.mouthW * E; // the right edge of his pucker (its half width is 0.4 of the mouth's width: src/sp-puppet.tsx puckerPts)
  const SPREAD: [number, number][] = [[-17, -34], [-6, -12], [6, 12], [17, 34]]; // where each stroke starts at the nozzle and ends past the lips (puppet px up/down from the nozzle's middle)
  return (
    <>
      {SPREAD.map(([y0, y1], i) => {
        const pts: number[][] = [], n = 14, ph = t * 22 + i * 1.9;
        for (let k = 0; k <= n; k++) {
          const u = k / n, wob = Math.sin(u * 8 + ph) * (2.5 + 7 * u) * E;
          pts.push([FX(lerp(ex, lx + 26 * E, u)), FY(ey + lerp(y0, y1, u * u) * E + wob), (1.6 + 3.2 * Math.sin(Math.PI * Math.min(1, u * 1.25))) * E]);
        }
        return <Poly key={i} pts={ribbon(pts)} color="#ffffff" op={0.66 + 0.08 * Math.sin(ph * 0.7)} order={231 + i} />;
      })}
    </>
  );
}
function Wisps({ f }: { f: number }) {
  // hair that the air has caught: strands rising from the top of the head and from its left temple, streaming away from the dryer (puppet px from the neck pivot, y up); drawn inside the head's own group
  const t = twos(f) / 30;
  const strand = (x0: number, y0: number, L: number, ang: number, sway: number, w: number, i: number) => {
    const pts = [0, 1, 2, 3, 4, 5].map((k) => { const u = k / 5, a = ang + 0.22 * Math.sin(u * 3 + t * 22 + i), r = L * u; return [x0 + r * Math.cos(a) + sway * u * u, y0 + r * Math.sin(a) + Math.sin(u * 4 + t * 20 + i) * 5 * u, w * (1 - u * 0.75)]; });
    return <Poly key={i} pts={ribbon(pts)} color="#7a5a2c" order={120} />;
  };
  return (
    <>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => strand(-150 + i * 40, 392 - 16 * Math.abs(i - 3), 78 + 20 * (i % 3), 0.35 - 0.06 * i, Math.sin(t * 24 + i * 1.7) * 11, 7, i))}
      {[0, 1, 2].map((i) => strand(-168 + i * 6, 250 + 36 * i, 62 + 14 * i, -0.12 + 0.05 * i, Math.sin(t * 26 + i * 2.3) * 9, 6, 20 + i))}
    </>
  );
}
const Dryer = shot(({ f }) => {
  const F = TODD_FR.dryer!, m = view(F.s, F.u0, F.v0), p = poseAt("todd", f);
  return (
    <>
      {bg(m, "sp/tip-bg-cafe.jpg")}
      <Chalk m={m} rect={CAFE.chalk} />
      <LActor c="todd" f={f} nx={F.neck[0]} ny={F.neck[1]} E={F.E} order={40} headAttach={<Wisps f={f} />} />
      <ToddBadge nx={F.neck[0]} ny={F.neck[1]} E={F.E} p={p} order={45} />
      <DryerFg nx={F.neck[0]} ny={F.neck[1]} E={F.E} p={p} order={56} />
      <Air nx={F.neck[0]} ny={F.neck[1]} E={F.E} f={f} hdx={p.hdx} />
      {strip(m, "sp/tip-fg-cafe.png", CAFE.counterTop, 150)}
    </>
  );
}, [600, 800]);

// ── the wide counter plate (the vault, the two-shot, the open arms): Denise behind the counter on the left (she does not move), Todd in front of it on the right. The counter's strip hides Denise's lower half and Todd
// while he is behind the counter. In "You're fired!" he stands FIRED_LIFT px nearer the counter: his badge would sit in the captions' band
const wide = (id: "vault" | "fired" | "hired") => shot(({ f }) => {
  const m = view(WV.s, WV.u0, WV.v0), D = WIDE_FR.den, cc = COUNTER_WIDE;
  const v = vaultAt(f), pv = poseAt("todd", f), bk = id === "vault" ? bumpAt(f) : [0, 0];
  // where Todd is: crouched behind the counter, the vault's parabola over it (his feet's path), then at rest in front of it; the neck hangs TB(pose) * E over the feet
  const u = id === "vault" ? v.u : 1, h = id === "vault" ? v.h : 0, lift = id === "fired" ? FIRED_LIFT : 0;
  const nx = lerp(VAULT.x0, VAULT.x1, u), feet = lerp(VAULT.feet0, VAULT.feet1, u) - VAULT.apex * h - lift, E = lerp(VAULT.E0, VAULT.E1, u);
  const ny = feet - TB(pv.body) * E;
  const front = id !== "vault" || u >= 0.5;
  const crouch = id === "vault" ? v.crouch : 0;
  const sx = 1 + 0.16 * v.sq + 0.18 * crouch, sy = lerp(1, VAULT.crouch, crouch) - 0.16 * v.sq + (v.air ? 0.06 * v.stretch : 0);
  const pd = poseAt("deniseHood", f);
  return (
    <group position={[bk[0], bk[1], 0]}>
      {bg(m, "sp/tip-bg-cafeWide.jpg")}
      <Chalk m={m} rect={WIDE.chalk} />
      <LActor c="deniseHood" f={f} nx={D.neck[0]} ny={D.neck[1]} E={D.E} order={40} />
      <ApronTag nx={D.neck[0]} ny={D.neck[1]} E={D.E} p={pd} order={45} />
      <FootShadow x={nx} y={feet + 6} w={300 * E} order={30} op={0.4 * u * u} />
      <Squash x={FX(nx)} y={FY(feet)} sx={sx} sy={sy}>
        <LActor c="todd" f={f} nx={nx} ny={ny} E={E} order={front ? 120 : 60} />
        <ToddBadge nx={nx} ny={ny} E={E} p={pv} order={front ? 125 : 65} />
      </Squash>
      <Picture file="sp/tip-fg-cafe-counter.png" w={cc.w * m.s} h={cc.h * m.s} x={m.X(cc.x0 + cc.w / 2)} y={m.Y(cc.y0 + cc.h / 2)} order={100} alpha />
    </group>
  );
}, [540, 1000]);
const Vault = wide("vault"), Fired = wide("fired"), Hired = wide("hired");

// ── the kiss, front wide (shot 13a): wide, from the counter side. She stands with her whole body in the frame, the line behind her, Todd behind her and to her right: standing (the open arms), then on his knees (a fall of 4
// frames, a thud), his head beside her hip, then moved in against her coat at seat height; then the cut to the side view
const KneelA = shot(({ f }) => {
  const K = KNEEL, m = view(K.s, K.u0, K.v0), ka = kissAt(f), tp = poseAt("todd", f), cp = poseAt("customer", f), d = dogAt(f);
  const kneelNeck = K.seatY + UP.todd * K.tE;
  const ty = lerp(K.tStand[1], kneelNeck, ka.drop), tx = lerp(lerp(K.tStand[0], K.tPeekX, ka.drop), K.tKissX, ka.head);
  const feet = feetOf(tp.body, K.tE, ty), cx = K.neck[0], floorT = (985 - K.v0) * K.s;
  return (
    <>
      {bg(m, BACK.file)}
      <LineUp m={m} f={f} />
      <FootShadow x={tx} y={floorT} w={330 * K.tE} order={9} />
      <Squash x={FX(tx)} y={FY(feet)} sx={1 + 0.14 * ka.sq} sy={1 - 0.14 * ka.sq}>
        <LActor c="todd" f={f} nx={tx} ny={ty} E={K.tE} order={74} />
        <ToddBadge nx={tx} ny={ty} E={K.tE} p={tp} order={79} />
      </Squash>
      <FootShadow x={cx} y={K.neck[1] + 823 * K.E + 4} w={300 * K.E} order={10} />
      <LActor c="customer" f={f} nx={cx} ny={K.neck[1]} E={K.E} order={90} />
      <Dog nx={cx} ny={K.neck[1]} E={K.E} p={cp} d={d} order={95} />
      {strip(m, BACK.strip, BACK.y0, 150)}
    </>
  );
}, [540, 800]);

// ── the kiss, side view (shot 13b): the two profile pieces (public/sp/lips-customer-side.png, lips-todd-side.png), both facing the left of the picture, over the same plate, both on one floor. She stands at the left with the purse on her
// near side and the dog in it; he kneels behind her. He creeps in over the hold, and on the smooch's frame his lips are on her seat; the contact's spring (his face pushes in 5 px, he squashes 5 % against her, she is bumped 3 px forward)
// rings out in 0.2 s, then nothing moves but the dog (src/lips-sched.ts sideAt, dogAt)
const KneelB = shot(({ f }) => {
  const S = SIDE, m = view(S.s, S.u0, S.v0), sd = sideAt(f), d = dogAt(f);
  const c = SIDE_RIG.customer, t = SIDE_RIG.todd;
  const bump = 3 * sd.sq, push = 5 * sd.sq;
  const herX = S.herLeft - bump, lipsX = S.seatX - bump + S.gap0 * sd.creep - push, toddLeft = lipsX - t.lips[0] * S.tE;
  const squash = { sx: 1 - 0.05 * sd.sq, sy: 1 + 0.015 * sd.sq };
  return (
    <>
      {bg(m, BACK.file)}
      <FootShadow x={herX + 190 * S.E} y={S.floorY + 4} w={330 * S.E} order={9} />
      <FootShadow x={toddLeft + 330 * S.tE} y={S.floorY + 4} w={470 * S.tE} order={9} />
      <Picture file={c.file} w={c.w * S.E} h={c.h * S.E} x={FX(herX + (c.w * S.E) / 2)} y={FY(S.floorY - (c.feet - c.h / 2) * S.E)} order={90} alpha />
      <SideDog x={herX + c.purse.x * S.E} y={S.floorY - (c.feet - c.purse.y) * S.E} E={S.E} d={d} order={95} />
      <Squash x={FX(lipsX)} y={FY(S.seatY)} sx={squash.sx} sy={squash.sy}>
        <Picture file={t.file} w={t.w * S.tE} h={t.h * S.tE} x={FX(toddLeft + (t.w * S.tE) / 2)} y={FY(S.floorY - (t.feet - t.h / 2) * S.tE)} order={100} alpha />
      </Squash>
      {strip(m, BACK.strip, BACK.y0, 150)}
    </>
  );
}, [540, 800]);

// ── her phone, big: the review (src/lips-ui.tsx), in her hand coming up from below (the hand and sleeve of "Tip?", recoloured to her skin and her coat), over the cafe's plate darkened
const ReviewShot = shot(({ f }) => {
  const m = view(2, 228, 320);
  return (
    <>
      {bg(m, BACK.file)}
      <Poly pts={rect(W * 1.2, H * 1.2)} color="#06080c" op={0.66} order={5} />
      <ReviewHandPhone f={f} order={20} />
    </>
  );
});

// ── the next morning: the doorway of the cafe-back plate, the glass door shut and then swinging out with its bell (in 4 frames, nearly edge-on: she stands clear in the doorway), and her standing outside at the threshold, first in line
// (the card is DOM, src/lips-ui.tsx MorningCard). The leaf is in front of her until it is past 35 degrees, then behind her
const Morning = shot(({ f }) => {
  const M = MORNING, m = view(M.s, M.u0, M.v0), p = poseAt("customer", f), feetY = M.neck[1] + 823 * M.E;
  return (
    <>
      {bg(m, BACK.file)}
      <FootShadow x={M.neck[0]} y={feetY + 3} w={300 * M.E} order={8} />
      <LActor c="customer" f={f} nx={M.neck[0]} ny={M.neck[1]} E={M.E} order={40} />
      <Dog nx={M.neck[0]} ny={M.neck[1]} E={M.E} p={p} d={dogAt(f)} order={45} />
      <LipsDoor m={m} f={f} order={doorAngle(f) > 35 ? 30 : 120} rect={BACK.door} />
      {strip(m, BACK.strip, BACK.y0, 150)}
    </>
  );
}, [540, 800]);

// ═════════════════════════════════════════════════════ the scenes of this file
const DRAWN: Partial<Record<ShotId, React.FC<{ f: number }>>> = {
  hook: Hook, denCoffee: DenCoffee, review: Review, vault: Vault, free: Free, fired: Fired, liked: Liked, hired: Hired, ugh: Ugh, anything: Anything, anythingQ: AnythingQ, kissAss: KissAss, kneelA: KneelA, kneelB: KneelB, coldLips: ColdLips,
  reviewPhone: ReviewShot, morning: Morning, usual: Usual, denTurn: DenTurn, dryer: Dryer,
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = Object.fromEntries(SHOT_IDS.map((id) => [id, DRAWN[id] ?? Placeholder(id)])) as Record<ShotId, React.FC<{ f: number }>>;

