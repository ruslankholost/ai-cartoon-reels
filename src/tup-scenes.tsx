import React from "react";
import { Glow, Inked, Panel, ellipsePts, xf } from "./sp-puppet";
import { ContactShadow, Vignette, inkAt, useImages } from "./sp-fx";
import { lerp } from "./sp-math";
import rig from "./pen-rig.json";
import { GARAGE_TINT, GarageBg, Seated, type Extra } from "./pen-scenes";
import { SourceLine, Stamp, drawBring, drawInvite } from "./tup-ui";
import { FX, FY, H, HAND_PHONE, Prop, Spray, TPlane, W, atHead, bg, focusOn, handScreen, onPuppet, plateAt, useHandPhone, view } from "./pen-stage";
import { DEN, END, HANDPH, RHO, STAMP_FR, SOURCE_FR, BOWL_PW, DIVE_Z } from "./tup-layout";
import { CRUMBS, FPS, KEY_T, SHOT_IDS, T, TYPED, bigStampAt, buzzAt, crumbAt, diveK, ease, fingerAt, holdPush, sentK, stampShake, typedN, type ShotId } from "./tup-sched";
import { ACT, BOWL, BOWL_FRONT, OPEN, Placeholder, shot } from "./tup-shared";
import { STORY_SCENES } from "./tup-story";

// The three.js scenes of "I'm Just Supporting a Friend" (docs/x05-supporting-a-friend.md): the garage (this file) and the story's sepia shots (src/tup-story.tsx), one full-frame ortho canvas per shot (the stage of
// src/pen-stage.tsx), hard cuts. The pose of every puppet is this episode's (src/tup-sched.ts poseAt); the garage's plate, the lawn chairs and the light are Pen's (src/pen-scenes.tsx). Everything that moves hangs on
// a take or on a measured sound peak (src/tup-sched.ts T and HITS); this file only draws it. Order of the layers: plate 0, back props 10-30, shadows 28-30, puppets 40+ (a puppet takes 20), strips 150, front props
// 160+, effects 300, the vignette 400.
// ── the bowl on Denise's lap: the pieces of the new art (src/tup-props.json), the chips between its back and its front lip
/** where the bowl's foot is on Denise's lap for a head placed at `head` with scale E, and the bowl's scale k (frame px per bowl px) */
export function lapBowlAt(head: [number, number], E: number) {
  const at = atHead("denisePen", head[0], head[1], E), [x, y] = onPuppet(at, -6, 300);
  return { x, y, k: (BOWL_PW * at.scale) / BOWL.w, S: at.scale };
}
const CHIP_COLORS = ["#e4bf45", "#d9b13a"];
function LapBowl({ head, E }: { head: [number, number]; E: number }) {
  const b = lapBowlAt(head, E), [back, front] = useImages([BOWL.file, BOWL_FRONT.file]), k = b.k, w = inkAt(b.S) * 0.8;
  const ox = b.x + (OPEN[0] - BOWL.pivot[0]) * k, oy = b.y + (BOWL.pivot[1] - OPEN[1]) * k; // the opening's middle (panel px)
  const chips: [number, number, number, number, number][] = []; // dx, dy (up) in bowl px from the opening's middle, rx, ry, rot
  const rows = [[-330, -180, -30, 120, 300, 20], [-250, -100, 40, 190, 20], [-170, -30, 110, 200], [-100, 40, 130], [-30, 70], [10]];
  rows.forEach((row, j) => row.forEach((x, i) => chips.push([x + 14 * Math.sin(j * 3 + i * 5), -50 + j * 38 + 6 * Math.cos(j + i * 2), 66 + 6 * Math.sin(i + j), 34 + 3 * Math.cos(i * 2 + j), 24 * Math.sin(i * 4 + j * 2)])));
  return (
    <>
      <ContactShadow x={b.x + 6 * b.S} y={b.y + 14 * b.S} w={BOWL_PW * b.S * 1.15} h={34 * b.S} blur={10 * b.S} op={0.4} round color="#05070a" order={42} />
      <Prop tex={back} def={BOWL} x={b.x} y={b.y} k={k} order={43} tint={GARAGE_TINT} />
      {chips.map(([dx, dy, rx, ry, rot], i) => <Inked key={i} pts={xf(ellipsePts(0, 0, rx, ry, 18), ox + dx * k, oy + dy * k, rot, k)} color={CHIP_COLORS[i % 2]} ink="#7a5a0e" w={w} order={44 + i * 0.01} />)}
      <Prop tex={front} def={BOWL_FRONT} x={b.x} y={b.y} k={k} order={46} tint={GARAGE_TINT} />
    </>
  );
}
/** the crumbs of the bite: small golden chips thrown from Denise's mouth on the crunch, on gravity */
const crumbs = (head: [number, number], E: number): Extra => (f) => {
  const at = atHead("denisePen", head[0], head[1], E), R = RIGD, [mx, my] = onPuppet(at, R.mouth.cx - R.pivot[0], R.mouth.cy - R.pivot[1]);
  return <>{Array.from({ length: CRUMBS }, (_, i) => { const q = crumbAt(i, f); return q.on ? <Inked key={i} pts={xf(ellipsePts(0, 0, 13, 9, 10), mx + q.x * E, my + q.y * E, q.rot, E)} color="#f0bf45" ink="#5c3d0e" w={inkAt(E)} order={95} op={q.a} /> : null; })}</>;
};
const RIGD = (rig as unknown as Record<string, { mouth: { cx: number; cy: number }; pivot: [number, number] }>).denisePen;

/** a garage shot: the plate, a seated puppet placed by the head (frame px) at scale E, the lap bowl when it is Denise, what `extra` adds, the vignette */
const garage = (c: "denisePen" | "rhondaPen", head: [number, number], E: number, s: number, u0: number, v0: number, extra?: Extra, bowl = c === "denisePen") =>
  shot(({ f }) => {
    const m = view(s, u0, v0);
    return (
      <>
        <GarageBg m={m} />
        <Seated c={c} f={f} head={head} E={E} acting={ACT} />
        {bowl && <LapBowl head={head} E={E} />}
        {extra?.(f, m)}
        <Vignette w={W} h={H} op={0.5} order={400} />
      </>
    );
  }, head);
// Denise at the left of the plate, Rhonda at the right (the framings are src/tup-layout.ts DEN and RHO: every Denise shot keeps the bowl on her lap above the captions' band, y 1295-1455)
const den = (id: ShotId, extra?: Extra) => { const F = DEN[id]!; return garage("denisePen", F.head, F.E, F.s, F.u0, F.v0, extra); };
const rho = (id: ShotId) => { const F = RHO[id]!; return garage("rhondaPen", F.head, F.E, F.s, F.u0, F.v0); };
const DenSupport = den("denSupport"), DenParty = den("denParty"), DenChew = den("denChew", crumbs(DEN.denChew!.head, DEN.denChew!.E)), DenLooks = den("denLooks"), DenPhone = den("denPhone"), DenMarketing = den("denMarketing");
const RhoBrow = rho("rhoBrow"), RhoStore = rho("rhoStore"), RhoLook = rho("rhoLook"), RhoGroup = rho("rhoGroup"), RhoSurvey = rho("rhoSurvey");

// ── the dive (shot 7): the camera goes into the bowl on her lap (a zoom of DIVE_Z about the bowl, which ends in the middle of the frame, filling it)
function DiveShot({ f }: { f: number }) {
  const FR = DEN.dive!, m = view(FR.s, FR.u0, FR.v0), k = diveK(f), z = Math.pow(DIVE_Z, k), b = lapBowlAt(FR.head, FR.E);
  const B: [number, number] = [b.x + (BOWL.w / 2 - BOWL.pivot[0]) * b.k, b.y + (BOWL.pivot[1] - BOWL.h / 2) * b.k], e = ease(k), c: [number, number] = [lerp(B[0], 0, e), lerp(B[1], 0, e)]; // the bowl's middle goes from where it is to the middle of the frame
  const F: [number, number] = z < 1.001 ? B : [(c[0] - z * B[0]) / (1 - z), (c[1] - z * B[1]) / (1 - z)];
  return (
    <Panel w={W} h={H} zoom={z} focus={F}>
      <GarageBg m={m} />
      <Seated c="denisePen" f={f} head={FR.head} E={FR.E} acting={ACT} />
      <LapBowl head={FR.head} E={FR.E} />
      <Vignette w={W} h={H} op={0.5} order={400} />
    </Panel>
  );
}
/** where the bowl's middle is in the dive's last frame: the matching frame of the store (src/tup-story.tsx) puts its bowl there at the same size */

// ── the hook (shot 1): the phone is big, the invite is on it from frame 0; her other hand's finger taps the keys of "I'm in!!" and the heart, and sends it
// Every scene that loads a picture (useImages, useHandPhone) is made by `shot()`, which puts the scene inside the canvas: a hook that suspends outside the canvas, in the page's tree, hangs Remotion's render (see the note at `shot`).
const HookShot = shot(({ f }) => {
  const m = view(3, 120, 470), t = f / FPS, typed = typedN(f), sent = sentK(f), fg = fingerAt(f);
  const pressedIdx = KEY_T.findIndex((k) => Math.abs(t - k) < 0.045), pressed = pressedIdx >= 0 ? TYPED[pressedIdx] : null;
  const tex = useHandPhone((g) => drawInvite(g, typed, pressed, sent), `${typed}|${pressed}|${Math.round(sent * 90)}`);
  const [hand] = useImages(["sp/tip-hand.png"]);
  const { hx, hy, k } = HANDPH, [scx, scy] = handScreen(hx, hy, k, 150, 357);
  const [tx, ty] = handScreen(hx, hy, k, fg.ux, fg.uy), fk = 2.6 * (1 - 0.04 * fg.press), below = 1500 * (1 - fg.come);
  return (
    <>
      {bg(m, "sp/pen-bg-garage.jpg", 0, "#a0a0a0")}
      <Glow x={scx} y={scy} rx={900} ry={1200} op={0.3} order={5} color="rgba(190,215,255,1)" />
      <PhoneTex tex={tex} hx={hx} hy={hy} k={k} />
      <ContactShadow x={tx + 34} y={ty - 56 - below} w={230} h={140} blur={32} op={0.3} round color="#05070a" order={29} />
      <Prop tex={hand} def={{ file: "", w: 372, h: 1101, pivot: [140, 4] }} x={tx} y={ty - below - 10 * fg.press} k={fk} rot={-6} order={30} />
      <Vignette w={W} h={H} op={0.55} order={400} />
    </>
  );
}, [540, 900]);
const PhoneTex = ({ tex, hx, hy, k, wig = 0 }: { tex: import("three").Texture; hx: number; hy: number; k: number; wig?: number }) => <TPlane tex={tex} x={FX(hx) + wig} y={FY(hy)} w={HAND_PHONE.w * k} h={HAND_PHONE.h * k} rot={wig * 0.3} order={20} />;

// ── the phone buzzes in her hand (shot 32): the same phone, the same hand as the hook, a bubble pops in on the buzz
const BuzzShot = shot(({ f }) => {
  const m = view(3, 120, 470), b = buzzAt(f);
  const tex = useHandPhone((g) => drawBring(g, b.pop), String(Math.round(b.pop * 90)));
  const { hx, hy, k } = HANDPH, [scx, scy] = handScreen(hx, hy, k, 150, 357);
  return (
    <>
      {bg(m, "sp/pen-bg-garage.jpg", 0, "#a0a0a0")}
      <Glow x={scx} y={scy} rx={900} ry={1200} op={0.34} order={5} color="rgba(130,190,255,1)" />
      <PhoneTex tex={tex} hx={hx} hy={hy} k={k} wig={b.wig} />
      <Vignette w={W} h={H} op={0.55} order={400} />
    </>
  );
}, [540, 900]);
// ── the stamp (shot 35): "47% LOST MONEY" slams in over Denise, with a thud and a small shake of the frame; the source line comes under it and stays
function StampShot({ f }: { f: number }) {
  const F = DEN.denStamp!, m = view(F.s, F.u0, F.v0), [dx, dy] = stampShake(f), st = bigStampAt(f);
  return (
    <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(F.head[0], F.head[1])}>
      <group position={[dx, dy, 0]}>
        <GarageBg m={m} />
        <Seated c="denisePen" f={f} head={F.head} E={F.E} acting={ACT} />
        <LapBowl head={F.head} E={F.E} />
        <Vignette w={W} h={H} op={0.5} order={400} />
        {st.on && <Stamp x={0} y={FY(STAMP_FR.y + st.dy)} s={0.95 * st.s} rot={st.rot} sx={st.sx} sy={st.sy} order={320} ink={inkAt(1.2)} />}
        <SourceLine x={0} y={FY(SOURCE_FR.y)} s={0.8} op={st.src} order={330} />
      </group>
    </Panel>
  );
}
// ── the last wide (shot 37): both in their lawn chairs, Denise with the bowl on her lap, Rhonda cracks another beer
const END_E = END.E, END_DEN = END.den, END_RHO = END.rho;
const WideEnd = shot(({ f }) => {
  const m = view(END.s, END.u0, END.v0), at = atHead("rhondaPen", END_RHO[0], END_RHO[1], END_E), [cx, cy] = onPuppet(at, -87, -2);
  return (
    <>
      <GarageBg m={m} />
      <Seated c="denisePen" f={f} head={END_DEN} E={END_E} acting={ACT} />
      <LapBowl head={END_DEN} E={END_E} />
      <Seated c="rhondaPen" f={f} head={END_RHO} E={END_E} acting={ACT} />
      <Spray m={m} f={f} at={plateAt(m, cx, cy)} t0={T.crack} seed={1} k={END_E / m.s} order={300} />
      <Vignette w={W} h={H} op={0.5} order={400} />
    </>
  );
}, [540, 960]);

// ═════════════════════════════════════════════════════ the scenes of this file
const GARAGE_SCENES: Partial<Record<ShotId, React.FC<{ f: number }>>> = {
  hook: HookShot, rhoBrow: RhoBrow, denSupport: DenSupport, rhoStore: RhoStore, denParty: DenParty, rhoLook: RhoLook, dive: DiveShot, denChew: DenChew, denLooks: DenLooks, rhoGroup: RhoGroup, rhoSurvey: RhoSurvey, denPhone: DenPhone,
  denMarketing: DenMarketing, phoneBuzz: BuzzShot, denStamp: StampShot, wideEnd: WideEnd,
};
export const SCENES: Record<ShotId, React.FC<{ f: number }>> = Object.fromEntries(SHOT_IDS.map((id) => [id, GARAGE_SCENES[id] ?? STORY_SCENES[id] ?? Placeholder(id)])) as Record<ShotId, React.FC<{ f: number }>>;
