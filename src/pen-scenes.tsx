import React from "react";
import * as THREE from "three";
import { Glow, Inked, Poly, ellipsePts, grow, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { ContactShadow, Plane, Vignette, inkAt, useCanvasTexture, useImages, type SteamCfg } from "./sp-fx";
import { lerp } from "./sp-math";
import { CARD, DEN, DEN_HEAD, ENDVIEW, FINE, LAB_MID, OFFD, READER, WIDE, bandOf, denAt, endBoxes, heldBox, type Box } from "./pen-layout";
import { Badge, Contract, POSTER, PosterText, ReaderScreen, drawFinePrint, drawHeyGirl, drawJobAd, drawLabel, drawPosterTitle, fineWidth, signPoint } from "./pen-ui";
import {
  FPS, T, TOSS, bodyAt, boxAt, buzzAt, cardAt, clickK, contractOnDesk, contractSlide, dustAt, ease, fineP, jiggleAt, joltAt, palletAt, penDropAt, penSlide, poseAt, popP, popScale, posterAt, shakeAt, signP, squashAt, swipeP, walk41P, walk41Step, type Char, type Pose, type ShotId,
} from "./pen-sched";
import {
  Actor, D2R, DustCloud, Foot, FX, FY, H, HAND_PHONE, PR, Prop, RIG, Sheet, Spray, Squash, TPlane, W, atHead, atPlate, below, bg, handScreen, onPuppet, plateAt, shot, strip, useHandPhone, view, type PropDef, type View,
} from "./pen-stage";

// The three.js scenes of "I'm Just Not a Sales Person" v2, the satire cut (docs/x04-sell-me-this-pen.md): 29 shots, one full-frame ortho canvas each (src/pen-stage.tsx), hard cuts. The garage is a dark plate
// with one bare bulb (the puppets are tinted dim and warm, the bulb glows); the office is Brandon's side (the wall with the yacht poster) and Denise's side (the glass door), the white desk between them over
// the puppets' waists. Everything that moves hangs on a take or on a measured sound peak (src/pen-sched.ts T and HITS); this file only draws it. Order of the layers: plate 0, back props 10-30, shadows 28-30,
// puppets 40+ (a puppet takes 20), strips 150, front props 160+, effects 300, the vignette 400. The numbers in the comments are v1's shot numbers (V1_NO in src/pen-sched.ts). The story's shots of v1 (the
// 1949 store, the 1950s living room, the hall, the newspaper, the garage with Rhonda) were drawn again for the Tup episode (src/tup-scenes.tsx, src/tup-story.tsx).

// ═════════════════════════════════════════════════════ the garage at night: the opening (v1 shots 1, 24) and the two phone inserts (2, 23)
export const GARAGE_TINT = "#cdb9a0"; // the puppets in the bulb's dim warm light
export function GarageBg({ m }: { m: View }) {
  return (
    <>
      {bg(m, "sp/pen-bg-garage.jpg", 0)}
      <Glow x={m.X(383)} y={m.Y(147)} rx={340 * m.s} ry={310 * m.s} op={0.5} order={1} color="rgba(255,206,130,1)" />
    </>
  );
}
/** Denise or Rhonda in her lawn chair, placed by the head; when the chair's feet are in the frame they stand in a pool of light with a soft shadow */
/** another episode's acting for the seated puppets (the Tup episode, src/tup-shared.tsx): its poses on top of the generic one, and which body picture it wears */
export type Acting = { tweak?: (c: Char, f: number, p: Pose) => Pose; body?: (c: Char, f: number) => string | undefined };
export function Seated({ c, f, head, E, acting }: { c: "denisePen" | "rhondaPen"; f: number; head: [number, number]; E: number; acting?: Acting }) {
  const at = atHead(c, head[0], head[1], E), b = (acting?.body ?? bodyAt)(c, f) ?? "", L = RIG[c].bodies![b];
  const mx = at.x + (L.x + L.w / 2 - RIG[c].pivot[0]) * E, fy = at.y - below(c, b) * E;
  return (
    <>
      <Glow x={mx} y={fy} rx={L.w * E * 0.8} ry={L.w * E * 0.2} op={0.2} order={28} color="rgba(255,196,110,1)" />
      <Foot x={mx} y={fy + 3} w={L.w * E * 0.95} op={0.55} />
      <Actor c={c} f={f} {...at} tint={GARAGE_TINT} tweak={acting?.tweak ? (p) => acting.tweak!(c, f, p) : undefined} />
    </>
  );
}
export type Extra = (f: number, m: View) => React.ReactNode;
export const garage = (c: "denisePen" | "rhondaPen", head: [number, number], E: number, s: number, u0: number, v0: number, extra?: Extra, acting?: Acting) =>
  shot(({ f }) => {
    const m = view(s, u0, v0);
    return (
      <>
        <GarageBg m={m} />
        <Seated c={c} f={f} head={head} E={E} acting={acting} />
        {extra?.(f, m)}
        <Vignette w={W} h={H} op={0.5} order={400} />
      </>
    );
  }, head);
/** the bowl of chips on Denise's lap (shot 1; in v1 the chairBeer picture carried the painted one for the garage's story shots): a light blue bowl with a pile of chips, drawn in the same flat style */
const bowlOnLap = (head: [number, number], E: number): Extra => () => {
  const at = atHead("denisePen", head[0], head[1], E), S = at.scale, [cx, cy] = onPuppet(at, -5, 268), w = inkAt(S);
  const chips: [number, number, number, number, number][] = [[-52, 26, 30, 16, 12], [-18, 36, 32, 17, -18], [20, 32, 30, 16, 20], [52, 24, 26, 14, -10], [-32, 22, 28, 15, -26], [8, 24, 30, 16, 8], [38, 18, 22, 12, 30]];
  return (
    <>
      <ContactShadow x={cx + 6 * S} y={cy - 48 * S} w={200 * S} h={34 * S} blur={10 * S} op={0.4} round color="#05070a" order={43} />
      <Inked pts={xf(ellipsePts(0, 0, 96, 54, 40), cx, cy - 8 * S, 0, S)} color="#9bd4f1" ink="#2a4a5c" w={w} order={44} />
      <Inked pts={xf(ellipsePts(0, 0, 92, 27, 40), cx, cy + 20 * S, 0, S)} color="#b9e8f8" ink="#2a4a5c" w={w} order={44.6} />
      {chips.map(([dx, dy, rx, ry, rot], i) => <Inked key={i} pts={xf(ellipsePts(0, 0, rx, ry, 18), cx + dx * S, cy + (dy + 6) * S, rot, S)} color={i % 2 ? "#fbe36a" : "#f5d44f"} ink="#8a6a10" w={w * 0.8} order={45 + i * 0.05} />)}
    </>
  );
};
const GarageMed = garage("denisePen", [410, 1010], 0.8, 1.5, 0, 0, bowlOnLap([410, 1010], 0.8)); // 1: Denise in the chair with her phone and the bowl of chips on her lap, the bulb over her
const DenBoss = garage("denisePen", [470, 800], 1.5, 1.8, 0, 200); // 24

// ── the two phone inserts: Denise's hand in the grey sleeve of her hoodie holds the phone (public/sp/tip-handPhone.png), the screens of src/pen-ui.tsx drawn on its glass, over the garage's dark wall, soft; the
// screen's light spills round it
const e3 = (x: number) => x * x * (3 - 2 * x); // the smoothstep that src/pen-ui.tsx drags the card with
const PhoneAd = shot(({ f }) => { // 2: the job ad; the finger of her other hand drags it off (the same grey sleeve, Tip's painted hand)
  const m = view(3, 120, 470), t = f / FPS, sw = swipeP(f);
  const tex = useHandPhone((g) => drawJobAd(g, sw), String(Math.round(sw * 90)));
  const [hand] = useImages(["sp/tip-hand.png"]);
  const k = 2.1, hx = 595, hy = 1572, [scx, scy] = handScreen(hx, hy, k, 150, 357);
  const come = ease((t - (T.swipe0 - 0.22)) / 0.17), leave = ease((t - (T.swipe1 + 0.02)) / 0.12), press = ease((t - (T.swipe0 - 0.05)) / 0.05) * (1 - leave);
  const [tx, ty] = handScreen(hx, hy, k, 225 - 340 * e3(sw), 250);
  return (
    <>
      {bg(m, "sp/pen-bg-garage.jpg", 0, "#a0a0a0")}
      <Glow x={scx} y={scy} rx={560} ry={800} op={0.3} order={5} color="rgba(190,215,255,1)" />
      <TPlane tex={tex} x={FX(hx)} y={FY(hy)} w={HAND_PHONE.w * k} h={HAND_PHONE.h * k} order={20} />
      <ContactShadow x={tx + 22} y={ty - 40 - 900 * (1 - come) - 700 * leave} w={150} h={90} blur={26} op={0.3} round color="#05070a" order={29} />
      <Prop tex={hand} def={{ file: "", w: 372, h: 1101, pivot: [140, 4] }} x={tx} y={ty - 900 * (1 - come) - 900 * leave} k={1.93 * (1 - 0.04 * press)} rot={-6} order={30} />
      <Vignette w={W} h={H} op={0.55} order={400} />
    </>
  );
}, [560, 900]);
const PhoneMsg = shot(({ f }) => { // 23: the phone buzzes in her hand and the message pops in
  const m = view(3, 120, 470), b = buzzAt(f);
  const tex = useHandPhone((g) => drawHeyGirl(g, b.pop), String(Math.round(b.pop * 90)));
  const k = 2.1, hx = 575 + b.wig, hy = 1572, [scx, scy] = handScreen(hx, hy, k, 150, 357);
  return (
    <>
      {bg(m, "sp/pen-bg-garage.jpg", 0, "#a0a0a0")}
      <Glow x={scx} y={scy} rx={640} ry={900} op={0.34} order={5} color="rgba(130,190,255,1)" />
      <TPlane tex={tex} x={FX(hx)} y={FY(hy)} w={HAND_PHONE.w * k} h={HAND_PHONE.h * k} rot={b.wig * 0.3} order={20} />
      <Vignette w={W} h={H} op={0.55} order={400} />
    </>
  );
}, [540, 920]);

// ═════════════════════════════════════════════════════ the glass office (25-40): Brandon's side (the wall with the yacht poster, the white desk in front of him) and Denise's side (the glass door), the
// desk over both their waists
type At = { x: number; y: number; scale: number };
const DESK_TOP = PR.stripDesk.y0 as number; // the desk's far edge, plate row 1022
const BOX = PR.box as PropDef, PEN = PR.pen as PropDef, PAL = PR.pallet as PropDef;
const mulTint = (c: string, t: string) => { const a = parseInt(c.slice(1), 16), b = parseInt(t.slice(1), 16), ch = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255); return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); };
const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y - h], [x, y - h]]; // a rect from its top left (panel px)
/** the labels on the boxes, PENS and STARTER KIT (src/pen-ui.tsx drawLabel): one texture each, shared by every box of a scene */
function useLabels() {
  const pens = useCanvasTexture(440, 220, (g) => { g.scale(2, 2); drawLabel(g, 1.4, "PENS"); }, []);
  const kit = useCanvasTexture(440, 220, (g) => { g.scale(2, 2); drawLabel(g, 1.4, "STARTER KIT"); }, []);
  return { pens, kit };
}
const BOX_RECT: Pt[] = xf(roundRect(636, 605, 5), -1.5, 302.5, 0); // the box's silhouette about its bottom middle (picture px, y up)
/** a painted box with its label on its face, standing on its bottom middle at (x, y) of the parent group, k panel px per picture px; inkPx: the outline line (frame px), kp: the scale of the parent group;
 * lab: the label's height (its centre above the box's bottom, picture px; null: no label), where src/pen-layout.ts keeps it clear of the captions */
function BoxProp({ tex, label, x, y, k, rot = 0, sx = 1, sy = 1, order, tint, inkPx = 0, kp = 1, lab = LAB_MID }: { tex: THREE.Texture; label: THREE.Texture; x: number; y: number; k: number; rot?: number; sx?: number; sy?: number; order: number; tint?: string; inkPx?: number; kp?: number; lab?: number | null }) {
  const [x0, , x1] = BOX.face as number[], fw = x1 - x0;
  return (
    <group position={[x, y, 0]} rotation={[0, 0, rot * D2R]} scale={[k * sx, k * sy, 1]}>
      {inkPx > 0 && <Poly pts={grow(BOX_RECT, inkPx / (k * kp))} color={tint ? mulTint("#2a2118", tint) : "#2a2118"} order={order - 0.05} />}
      <TPlane tex={tex} x={BOX.w / 2 - BOX.pivot[0]} y={BOX.pivot[1] - BOX.h / 2} w={BOX.w} h={BOX.h} order={order} tint={tint} />
      {lab !== null && <TPlane tex={label} x={(x0 + x1) / 2 - BOX.pivot[0]} y={lab} w={fw * 0.56} h={fw * 0.28} order={order + 0.1} tint={tint} />}
    </group>
  );
}
/** the yacht poster with its words baked in (the title in the sky, the fine print in the navy band): one texture for the wall and the rip; the inserts draw the words crisp on top of the plain picture */
function usePosterTex(): THREE.Texture {
  const [img] = useImages([PR.poster.file]);
  return useCanvasTexture(768, 1344, (g) => {
    g.drawImage(img.image as CanvasImageSource, 0, 0);
    g.save(); g.translate(0, POSTER.title.top); drawPosterTitle(g); g.restore();
    g.save(); g.translate((768 - 400) / 2, POSTER.fineY - 20); drawFinePrint(g, 400, 40); g.restore();
  }, [img]);
}
/** four bits of tape at a poster's corners (panel px; w x h the poster's size, turned by rot); `skip`: the one that is gone */
const Tape = ({ x, y, w, h, rot = 0, order, tint = "#ffffff", skip = -1, op = 1 }: { x: number; y: number; w: number; h: number; rot?: number; order: number; tint?: string; skip?: number; op?: number }) => {
  const c = Math.cos(rot * D2R), s = Math.sin(rot * D2R), t = w * 0.12;
  return (
    <>
      {([[-1, 1, -42], [1, 1, 42], [-1, -1, 42], [1, -1, -42]] as [number, number, number][]).map(([sx, sy, a], i) => {
        if (i === skip || op <= 0.01) return null;
        const dx = sx * (w / 2 - t * 0.2), dy = sy * (h / 2 - t * 0.2);
        return <Poly key={i} pts={xf(roundRect(t, t * 0.38, 2), x + dx * c - dy * s, y + dx * s + dy * c, a + rot)} color={mulTint("#e9dcae", tint)} op={0.85 * op} order={order} />;
      })}
    </>
  );
};
/** the poster on a wall: plate centre (u, v), width w plate px, taped, with a soft shadow on the wall */
function WallPoster({ tex, m, u, v, w, order = 12, tint }: { tex: THREE.Texture; m: View; u: number; v: number; w: number; order?: number; tint?: string }) {
  const h = (w * 1344) / 768, x = m.X(u), y = m.Y(v), W_ = w * m.s, H_ = h * m.s;
  return (
    <>
      <ContactShadow x={x + 5 * m.s} y={y - 7 * m.s} w={W_} h={H_} r={2} blur={7 * m.s} op={0.34} color="#2a2f38" order={order - 1} />
      <TPlane tex={tex} x={x} y={y} w={W_} h={H_} order={order} tint={tint} />
      <Tape x={x} y={y} w={W_} h={H_} order={order + 1} tint={tint} />
    </>
  );
}

/** Brandon's badge: the blank white rectangle of each of his poses (puppet px from the neck pivot: centre x, y, width, height) gets DIAMOND DIRECTOR */
const BADGE_AT: Record<string, [number, number, number, number]> = { stand: [96, 107, 66, 44], point: [97, 82, 68, 33], reader: [96, 94, 75, 39], rip: [82, 129, 75, 42] };
function BrandonBadge({ at, f, order = 45 }: { at: At; f: number; order?: number }) {
  const p = poseAt("brandon", f), [bx, by, bw, bh] = BADGE_AT[p.body ?? "stand"];
  return <Badge x={at.x + p.dx + bx * at.scale} y={at.y + p.breath * at.scale - by * at.scale} s={(bw * at.scale) / 180} sy={bh / 76 / (bw / 180)} k={0.8} ink={0.9} order={order} />;
}

/** Brandon behind the desk: the wall, the poster, his shadow on the desk, him, the desk over his waist; `children` get his place to draw what is on the desk or in his hand */
function OfficeB({ m, f, E, u, children }: { m: View; f: number; E: number; u: number; children?: (at: At) => React.ReactNode }) {
  const at = atPlate(m, u, DESK_TOP, E / m.s, 300), tex = usePosterTex(), pa = { ...at, scale: at.scale * popScale(f) };
  return (
    <>
      {bg(m, "sp/pen-bg-office.jpg")}
      <WallPoster tex={tex} m={m} u={275} v={440} w={240} />
      <Foot x={at.x} y={m.Y(DESK_TOP + 15)} w={330 * at.scale} h={22 * m.s} op={0.3} order={152} />
      <Actor c="brandon" f={f} {...pa} order={40} />
      <BrandonBadge at={pa} f={f} />
      {strip(m, PR.stripDesk.file, DESK_TOP, 150)}
      {children?.(at)}
    </>
  );
}
const OB = () => view(1.8, 137, 216); // Brandon's side: the desk's far edge is at frame y 1451
/** the contract on the desk, foreshortened (the desk is seen from its edge), with a contact shadow: plate (u, v) is the middle of the page */
function DeskContract({ m, u, v, sign = 0, order = 160 }: { m: View; u: number; v: number; sign?: number; order?: number }) {
  return (
    <>
      <ContactShadow x={m.X(u) + 5} y={m.Y(v) - 6} w={190 * m.s} h={46 * m.s} r={3} blur={5 * m.s} op={0.38} color="#4a4f58" order={order - 3} />
      <Contract x={m.X(u)} y={m.Y(v)} s={0.38 * m.s} sy={0.17} sign={sign} order={order} ink={inkAt(m.s)} />
    </>
  );
}
const CONTRACT_REST = { u: 335, v: 1050 }; // where the shove of shot 27 leaves it in Brandon's view of the desk (plate px)

const PenSlide = shot(({ f }) => { // 25: the pen slides across the desk toward us and stops dead
  const m = OB(), [pen] = useImages([PEN.file]), p = penSlide(f);
  const u = lerp(412, 300, p), v = lerp(1030, 1056, p), k = lerp(0.17, 0.24, p) * m.s, rot = lerp(-7, 4, p);
  return (
    <OfficeB m={m} f={f} E={1.2} u={470}>
      {() => (
        <>
          <Foot x={m.X(u) + 5} y={m.Y(v) - 8} w={PEN.w * k * 0.95} h={12 * m.s} op={0.42} order={158} />
          <Prop tex={pen} def={PEN} x={m.X(u)} y={m.Y(v)} k={k} rot={rot} order={160} />
        </>
      )}
    </OfficeB>
  );
}, [600, 860]);
const ContractShot = shot(({ f }) => { // 27: he pulls the pen back (it goes into his hand) and slides the contract over
  const m = OB(), [pen] = useImages([PEN.file]), t = f / FPS;
  const pull = ease((t - T.penPull) / 0.14), gone = ease((t - (T.penPull + 0.1)) / 0.05), c = contractSlide(f);
  const pu = lerp(300, 410, pull), pv = lerp(1056, 1030, pull), pk = lerp(0.24, 0.17, pull) * m.s * (1 - gone);
  const cu = lerp(432, CONTRACT_REST.u, c), cv = lerp(1033, CONTRACT_REST.v, c);
  return (
    <OfficeB m={m} f={f} E={0.95} u={470}>
      {() => (
        <>
          {pk > 0.002 && <><Foot x={m.X(pu) + 5} y={m.Y(pv) - 8} w={PEN.w * pk * 0.95} h={12 * m.s} op={0.42} order={158} /><Prop tex={pen} def={PEN} x={m.X(pu)} y={m.Y(pv)} k={pk} rot={lerp(4, -7, pull)} order={160} /></>}
          <DeskContract m={m} u={cu} v={cv} />
        </>
      )}
    </OfficeB>
  );
}, [600, 960]);
const ReaderUp = shot(({ f }) => { // 29: the card reader pops up in his hand on "bucks": he winds up (a dip over three frames), the pose swaps on the pop frame, he overshoots on a spring (src/pen-sched.ts popScale), five pop lines
  const m = OB(), a = f / FPS - T.readerPop;
  return (
    <OfficeB m={m} f={f} E={0.95} u={470}>
      {(at) => {
        const [rx, ry] = onPuppet(at, -253, -34), k = 1 - a / 0.17;
        return <>{contractOnDesk(f) && <DeskContract m={m} u={CONTRACT_REST.u} v={CONTRACT_REST.v} />}{a >= 0 && k > 0 && [200, 170, 140, 110, 80].map((deg, i) => {
          const r0 = (70 + 14 * (1 - k)) * at.scale, r1 = (112 + 30 * (1 - k)) * at.scale, c = Math.cos(deg * D2R), s = Math.sin(deg * D2R);
          return <Poly key={i} pts={ribbon([[rx + c * r0, ry + s * r0, 7 * at.scale * k], [rx + c * r1, ry + s * r1, 3 * at.scale * k]])} color="#1b1b1f" order={170} />;
        })}</>;
      }}
    </OfficeB>
  );
}, [600, 960]);
const KitSays = shot(({ f }) => <OfficeB m={view(1.8, 150, 216)} f={f} E={1.15} u={490} />, [620, 880]); // 32: Starter kit's three hundred
const Diamond = shot(({ f }) => <OfficeB m={OB()} f={f} E={0.95} u={500} />, [640, 1000]); // 34: his thumb over his shoulder, at the poster
const MathCut = shot(({ f }) => <OfficeB m={view(1.8, 150, 216)} f={f} E={1.25} u={500} />, [560, 860]); // 36

// ── the two inserts of the payment (30, 31): the card reader (a black handheld one like the one in his hand) stands on the desk, the contract lies on it with the pen on it
const CardTap = shot(({ f }) => { // 30: the card reader stands on the desk; a hand off the frame brings the card in from the right edge, taps the reader on the beep ($20.00 APPROVED, a white flash) and takes it back out
  const t = f / FPS, a = t - T.tap30, c = cardAt(f), m = view(3.2, 200, 553); // the desk's far edge at frame y 1500
  const [card] = useImages(["sp/tip-card.png"]);
  const flash = a >= 0 ? Math.max(0, 1 - a / 0.12) : 0, u = READER.w / 560, bw = READER.w, bh = READER.h, ink = inkAt(2.4 * u);
  const cx = FX(READER.x), base = FY(READER.base), by = base + bh / 2; // the reader's middle and its foot on the desk (panel px)
  const px = lerp(CARD.offX, CARD.tapX, c.p), py = CARD.tapY + 70 * (1 - c.p), rot = lerp(-9, -3, c.p), k = (CARD.w / 668) * (1 - 0.04 * c.press);
  return (
    <>
      {bg(m, "sp/pen-bg-office.jpg", 0, "#7d7d7d")}
      {strip(m, PR.stripDesk.file, DESK_TOP, 8)}
      <ContactShadow x={cx + 30 * u} y={by - 30 * u} w={bw} h={bh} r={70 * u} blur={36 * u} op={0.2} color="#0a0c10" order={9} />
      <ContactShadow x={cx + 22 * u} y={base - 4} w={bw * 0.94} h={52 * u} blur={16 * u} op={0.6} round color="#1a1d24" order={9.5} />
      <Inked pts={xf(roundRect(bw, bh, 70 * u), cx, by, 0)} color="#23272f" ink="#0a0b0e" w={ink} order={10} />
      <Poly pts={xf(roundRect(bw - 28 * u, bh - 28 * u, 58 * u), cx, by, 0)} color="#2c313a" order={10.6} />
      <Poly pts={xf(roundRect(30 * u, bh - 150 * u, 14 * u), cx - bw / 2 + 36 * u, by - 10 * u, 0)} color="#3a414c" op={0.55} order={10.8} />
      <Inked pts={xf(roundRect(468 * u, 318 * u, 22 * u), cx, by + 190 * u, 0)} color="#0b1017" ink="#07090c" w={ink * 0.8} order={11} />
      <ReaderScreen x={cx} y={by + 190 * u} s={2.3 * u} approved={a >= 0} flash={flash} order={12} ink={ink} />
      {[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((q) => <Inked key={r * 3 + q} pts={xf(roundRect(112 * u, 70 * u, 22 * u), cx + (q - 1) * 142 * u, by - 120 * u - r * 92 * u, 0)} color={r === 3 && q === 1 ? "#3a6f3e" : "#3d444f"} ink="#0a0b0e" w={ink * 0.6} order={11} />))}
      {[1, 2, 3].map((i) => <Poly key={i} pts={ribbon(Array.from({ length: 9 }, (_, j) => { const aa = (-35 + (70 * j) / 8) * D2R, r = (22 + i * 17) * u; return [Math.cos(aa) * r + cx + 70 * u, Math.sin(aa) * r + by + 372 * u, 5 * u]; }))} color={a >= 0 ? "#5ad46f" : "#9aa5b3"} op={0.9} order={12} />)}
      {c.p > 0 && <ContactShadow x={FX(px) + 16} y={FY(py) - 30} w={CARD.w * 0.94} h={CARD.h * 0.9} r={22} rot={rot} blur={26} op={0.38 * Math.min(1, c.p * 2)} color="#05070a" order={29} />}
      {c.p > 0 && <Prop tex={card} def={{ file: "", w: 668, h: 426, pivot: [334, 213] }} x={FX(px)} y={FY(py)} k={k} rot={rot} order={30} />}
      {flash > 0 && <Poly pts={roundRect(W * 1.2, H * 1.2, 2)} color="#ffffff" op={0.6 * flash} order={350} />}
    </>
  );
}, [540, 960]);
const Signed = shot(({ f }) => { // 31: the pen signs the contract: a fast scribble; the contract lies on the desk, seen from above
  const p = signP(f), [pen] = useImages([PEN.file]);
  const s = 1.7, cx = 0, cy = FY(840), ink = inkAt(1.8), wob = 4 * Math.sin(p * 60);
  const [sx, sy] = signPoint(p), tx = cx + (sx - 260) * s, ty = cy - (sy - 350) * s, k = 1.0, ang = (225 + wob) * D2R;
  const dx = 396.3 * k, dy = -1.5 * k, rx = dx * Math.cos(ang) - dy * Math.sin(ang), ry = dx * Math.sin(ang) + dy * Math.cos(ang);
  return (
    <>
      <Poly pts={roundRect(W * 1.2, H * 1.2, 2)} color="#e5e7eb" order={0} />
      <Poly pts={rectPts(-W / 2 - 10, FY(1735), W + 20, H)} color="#c7ccd4" order={1} />
      <Poly pts={rectPts(-W / 2 - 10, FY(1735), W + 20, 12)} color="#f4f5f8" order={1.1} />
      <ContactShadow x={cx + 14} y={cy - 16} w={520 * s} h={700 * s} r={4} blur={18} op={0.3} color="#3a3f48" order={9} />
      <ContactShadow x={cx + 4} y={cy - 5} w={520 * s} h={700 * s} r={4} blur={4} op={0.3} color="#3a3f48" order={9.5} />
      <Contract x={cx} y={cy} s={s} sign={p} order={10} ink={ink} />
      <ContactShadow x={tx + 18} y={ty - 12} w={120} h={42} blur={14} op={0.3} round color="#0a0a10" order={19} />
      <Prop tex={pen} def={PEN} x={tx - rx} y={ty - ry} k={k} rot={225 + wob} order={20} />
      <Vignette w={W} h={H} op={0.25} order={400} />
    </>
  );
}, [540, 900]);

// ── Denise's side: the glass door behind her, the desk over her waist; once the box has landed she holds it in front of her chest. The places (src/pen-layout.ts OFFD) keep her résumé and the box's label out of
// the captions' band. On the pallet's slam she hops and lands with a squash (src/pen-sched.ts joltAt)
/** the box in her arms: where src/pen-layout.ts heldBox puts it (it falls, lands with a squash, sinks and jumps with her) */
function HeldBox({ id, f, order = 70 }: { id: ShotId; f: number; order?: number }) {
  const [tex] = useImages([BOX.file]), L = useLabels(), b = heldBox(id, f)!, d = OFFD[id]!, S = d.E, drop = boxAt(f).drop, sq = f / FPS >= T.boxLand ? boxAt(f).sq : 0;
  return (
    <>
      <ContactShadow x={b.x - W / 2} y={H / 2 - (denAt(d).y + 150 * S)} w={BOX.w * b.k * 0.9 * (1 - 0.45 * drop)} h={150 * S} r={10} blur={26 * S} op={0.4 * (1 - drop)} color="#10141c" order={order - 2} />
      <BoxProp tex={tex} label={L.kit} x={b.x - W / 2} y={H / 2 - b.y} k={b.k} sx={1 + 0.1 * sq} sy={1 - 0.13 * sq} order={order} inkPx={inkAt(S)} lab={b.lab} />
    </>
  );
}
function OfficeD({ id, f, behind, desk }: { id: ShotId; f: number; behind?: React.ReactNode; desk?: React.ReactNode }) {
  const d = OFFD[id]!, m = view(d.m.s, d.m.u0, d.m.v0), at = atPlate(m, d.u, DESK_TOP, d.E / m.s, d.cut), j = joltAt(f);
  return (
    <>
      {bg(m, "sp/pen-bg-officeBack.jpg")}
      {behind}
      <Foot x={at.x} y={m.Y(DESK_TOP + 15)} w={300 * at.scale} h={22 * m.s} op={0.3} order={152} />
      <Squash x={at.x} y={m.Y(DESK_TOP)} sx={1 + 0.07 * j.sq} sy={1 - 0.1 * j.sq}>
        <Actor c="denisePen" f={f} {...at} order={40} />
        {d.box && <HeldBox id={id} f={f} />}
      </Squash>
      {strip(m, PR.stripDesk.file, DESK_TOP, 150)}
      {desk}
    </>
  );
}
const DenResume = shot(({ f }) => <OfficeD id="denResume" f={f} />, [540, 880]); // 26: It writes?
const DenPockets = shot(({ f }) => <OfficeD id="denPockets" f={f} desk={contractOnDesk(f) && <DeskContract m={view(OFFD.denPockets!.m.s, OFFD.denPockets!.m.u0, OFFD.denPockets!.m.v0)} u={373} v={1038} />} />, [540, 880]); // 28: she pats her pockets (two pats, her body dips on each: src/pen-sched.ts poseAt)
const BoxCatch = shot(({ f }) => <OfficeD id="boxCatch" f={f} />, [540, 1000]); // 33: the STARTER KIT box falls into her arms; she dips under its weight and springs back
const DenCount = shot(({ f }) => <OfficeD id="denCount" f={f} />, [540, 780]); // 35
const DenSure = shot(({ f }) => <OfficeD id="denSure" f={f} />, [560, 800]); // 38

// ── the pallet (39): a wide of her side of the office; the pallet of PENS boxes falls from above the frame behind her and lands on the slam (the desk hides its feet), the camera shakes, the boxes jiggle on
// springs and a low dust puff runs along the desk's far edge
const PALLET_K = 0.8, BK = 0.34;
function PalletStack({ m, f, u, v }: { m: View; f: number; u: number; v: number }) {
  const [pal, box] = useImages([PAL.file, BOX.file]), L = useLabels(), p = palletAt(f), k = PALLET_K * (m.s / 1.4286);
  const x = m.X(u), y = m.Y(v) + p.drop * 1700, sx = 1 + 0.1 * p.sq, sy = 1 - 0.12 * p.sq;
  return (
    <>
      <Foot x={x} y={m.Y(v) - 3} w={PAL.w * k * 1.05 * (1 - 0.35 * p.drop)} h={PAL.w * k * 0.12} op={0.5 * (1 - p.drop)} order={19} />
      <group position={[x, y, 0]} scale={[k * sx, k * sy, 1]}>
        <TPlane tex={pal} x={PAL.w / 2 - PAL.pivot[0]} y={PAL.pivot[1] - PAL.h / 2} w={PAL.w} h={PAL.h} order={20} />
        {Array.from({ length: 6 }, (_, i) => {
          const r = Math.floor(i / 3), c = i % 3, j = jiggleAt(i, f);
          return <BoxProp key={i} tex={box} label={L.pens} x={(c - 1) * 224 + (r ? 18 : 0)} y={170 + r * 188 + j.dy / k} k={BK} rot={j.rot} order={21 + r} inkPx={inkAt(m.s)} kp={k} />;
        })}
      </group>
    </>
  );
}
const PalletWide = shot(({ f }) => {
  const m = view(1.4286, 6, 0), [dx, dy] = shakeAt(f), pu = 400, pv = 1050;
  const cfg: SteamCfg = {
    ...dustAt(T.pallet), seed: 11, breakDur: 0.45, stop: T.pallet + 0.3,
    emitters: [-1, 1].map((d) => ({ seg: [pu + d * 30, pv - 16, pu + d * 190, pv - 16, 4] as [number, number, number, number, number], n: 14, r: [10, 24] as [number, number], rise: [14, 40] as [number, number], life: [0.35, 0.6] as [number, number], strength: 0.85, drift: 230, dir: d as 1 | -1, burst: 3.2, lobes: 3 })),
  };
  return (
    <group position={[dx, dy, 0]}>
      <OfficeD id="palletWide" f={f} behind={<PalletStack m={m} f={f} u={pu} v={pv} />} />
      <DustCloud m={m} f={f} cfg={cfg} order={158} />
    </group>
  );
}, [540, 1000]);

// ── the poster (37, 40): the plain picture with its words drawn crisp over it for the insert; for the rip, one sheet that bends
const PosterIns = shot(() => { // 37: BE YOUR OWN BOSS, and a line of fine print too small to read
  const m = view(1.8, 137, 216), [tex] = useImages([PR.poster.file]), W_ = 900, H_ = (W_ * 1344) / 768;
  return (
    <>
      {bg(m, "sp/pen-bg-office.jpg", 0, "#d8d8d8")}
      <ContactShadow x={10} y={-12} w={W_} h={H_} r={2} blur={16} op={0.4} color="#2a2f38" order={9} />
      <Plane tex={tex} x={0} y={0} w={W_} h={H_} order={10} />
      <PosterText x={0} y={0} w={W_} h={H_} order={11} />
      <Tape x={0} y={0} w={W_} h={H_} order={12} />
    </>
  );
}, [540, 960]);
const PosterRip = shot(({ f }) => { // 40: his fist holds the poster's lower right corner; he pulls (the corner peels off the wall), the tape lets go, the poster swings free, rolls up into a tube and flies down onto the box in her arms (the lid at the bottom of the frame)
  const m = view(1.8, 128, 150), E = 0.8, t = f / FPS, tex = usePosterTex(), pos = posterAt(f), [boxTex] = useImages([BOX.file]), L = useLabels();
  const w = 240 * m.s, h = (w * 1344) / 768, cx = m.X(275), cy = m.Y(440);
  const peel = pos.hinge / 58, fr = pos.free, roll = pos.roll, land = ease((t - T.posterRolled) / (T.posterLay - T.posterRolled)), sq = t >= T.posterLay ? squashAt(t, T.posterLay, 0.3, 40) : 0;
  const base = atPlate(m, 572, DESK_TOP, E / m.s, 400), pull: [number, number] = [34 * peel, -52 * peel];
  const at = { x: base.x + pull[0], y: base.y + pull[1], scale: base.scale };
  const fist = onPuppet(at, -365, -484);
  const S = lerp(1, 1.45, land), lidY = 1700, rest: [number, number] = [FX(540) + 0.5 * w * 1.45, FY(lidY + 52)]; // where the tube's right end ends up on the lid
  const F: [number, number] = [lerp(fist[0], rest[0], land), lerp(fist[1], rest[1], land) + 90 * Math.sin(Math.PI * land)];
  const A = lerp(70 * fr, -3, land) * D2R, c = Math.cos(A), s = Math.sin(A);
  const sheet = (a: number, b: number): [number, number] => {
    const d = Math.pow(a, 1.6) * Math.pow(b, 2), v = 1 - b;
    let lx = (a - 1) * w * (1 - 0.05 * roll), ly = v * h * (1 - 0.92 * roll); // the sheet about its held corner (right, bottom): rolled up toward the held edge
    ly += 10 * Math.sin(b * 9 + t * 38) * fr * (1 - roll) * (0.3 + a); lx += 6 * Math.sin(b * 7 + t * 31 + 1) * fr * (1 - roll); // the flutter once it is free
    lx *= S; ly *= S * (1 - 0.12 * sq);
    return [F[0] + lx * c - ly * s + (1 - fr) * pull[0] * (d - 1), F[1] + lx * s + ly * c + (1 - fr) * pull[1] * (d - 1)];
  };
  const shade = (a: number, b: number) => 1 - 0.28 * peel * Math.pow(a, 1.6) * Math.pow(b, 2) * (1 - fr) - 0.4 * roll * Math.pow(2 * Math.abs(1 - b - 0.4), 1.5);
  return (
    <>
      {bg(m, "sp/pen-bg-office.jpg")}
      <ContactShadow x={cx + 5 * m.s + 14 * peel} y={cy - 7 * m.s - 8 * peel} w={w} h={h} r={2} blur={7 * m.s} op={0.34 * (1 - Math.min(1, fr * 6))} color="#2a2f38" order={11} />
      <Sheet tex={tex} at={sheet} shade={shade} order={land > 0 ? 205 : 12} />
      <Tape x={cx} y={cy} w={w} h={h} order={13} skip={t >= T.rip ? 3 : -1} op={1 - Math.min(1, fr * 6)} />
      <Foot x={at.x} y={m.Y(DESK_TOP + 15)} w={330 * at.scale} h={22 * m.s} op={0.3} order={152} />
      <Actor c="brandon" f={f} {...at} order={40} />
      <BrandonBadge at={at} f={f} />
      {strip(m, PR.stripDesk.file, DESK_TOP, 150)}
      <BoxProp tex={boxTex} label={L.kit} x={0} y={FY(lidY + 615 * 1.3)} k={1.3} order={200} tint="#e2dccf" inkPx={inkAt(1.8)} />
      {land > 0.3 && <ContactShadow x={rest[0] - 0.5 * w * 1.45 + 8} y={rest[1] - 10} w={w * 1.45 * 0.95} h={36} blur={14} op={0.4 * Math.min(1, (land - 0.3) / 0.7)} round color="#2a1c0a" order={203} />}
    </>
  );
}, [540, 900]);

// ═════════════════════════════════════════════════════ the garage again (41-49): PENS boxes to the ceiling, the poster taped to the wall, Denise in the blazer behind a front row of boxes with the pen in her
// fist, Rhonda in the side door with a beer in each hand. Everything is placed on the plate (src/pen-layout.ts: Denise at plate (215, 773) at plate scale 0.38, Rhonda in the doorway), a close-up is the same
// world at a bigger view; the boxes' labels are kept out of the captions' band
/** the dim warm light of the bulb on the cardboard: brighter high up, dimmer at the floor */
const rowTint = (r: number) => { const t = Math.min(1, r / 6), a = [0x8f, 0x82, 0x72], b = [0xd9, 0xc7, 0xad]; return "#" + a.map((x, i) => Math.round(lerp(x, b[i], t)).toString(16).padStart(2, "0")).join(""); };

/** the garage's plate, the doorway (dark; the leaf swings in front of it, `door` degrees open), the wall of boxes, the poster */
function GarageEndBg({ m, boxes, door }: { m: View; boxes: Box[]; door: number }) {
  const [leaf, box] = useImages([PR.doorGarage.file, BOX.file]), L = useLabels(), ptex = usePosterTex();
  const D = PR.doorGarage as { x0: number; y0: number; w: number; h: number }, c = Math.cos(door * D2R);
  return (
    <>
      <GarageBg m={m} />
      <Poly pts={rectPts(m.X(D.x0), m.Y(D.y0), D.w * m.s, D.h * m.s)} color="#04070c" order={3} />
      {door > 8 && <Glow x={m.X(D.x0 + D.w / 2)} y={m.Y(D.y0 + D.h * 0.55)} rx={D.w * m.s * 0.55} ry={D.h * m.s * 0.5} op={0.16} order={3.5} color="rgba(110,140,190,1)" />}
      <Plane tex={leaf} x={m.X(D.x0) + (D.w * m.s * c) / 2} y={m.Y(D.y0 + D.h / 2)} w={D.w * m.s} h={D.h * m.s} sx={c} order={4} />
      <WallPoster tex={ptex} m={m} u={468} v={617} w={180} order={12} tint={GARAGE_TINT} />
      <Foot x={m.X(205)} y={m.Y(985) + 2 * m.s} w={330 * m.s} h={26 * m.s} op={0.6} order={7} />
      <Foot x={m.X(412)} y={m.Y(985) + 2 * m.s} w={210 * m.s} h={22 * m.s} op={0.6} order={7} />
      {boxes.filter((b) => b.r >= 0).map((b, i) => <BoxProp key={i} tex={box} label={L.pens} x={b.x - W / 2} y={H / 2 - b.y} k={b.k} rot={b.rot} order={8 + b.r * 0.3 + i * 0.001} tint={rowTint(b.r)} inkPx={inkAt(m.s)} lab={b.lab} />)}
    </>
  );
}

// ── Denise: the pen in her fist (it is under her fist, so the fist closes round its middle; the button end clicks), then the toss and the clatter on the front row (src/pen-sched.ts penDropAt)
const PEN_LEN = 300; // the pen in her fist, puppet px
function FistPen({ at, f, tint }: { at: At; f: number; tint?: string }) {
  const [pen] = useImages([PEN.file]), d = penDropAt(f), click = clickK(f), S = at.scale, k = (PEN_LEN / PEN.w) * S;
  const [fx, fy] = onPuppet(at, TOSS.fist[0], TOSS.fist[1]), x = fx + d.x * S, y = fy + d.y * S, sh = Math.min(1, Math.max(0, d.y + TOSS.floor) / 700);
  return (
    <>
      {d.on && <Foot x={x + 4 * S} y={fy - TOSS.floor * S + 4 * S} w={PEN_LEN * S * (1 - 0.5 * sh)} h={22 * S * (1 - 0.4 * sh)} op={0.45 * (1 - 0.7 * sh)} order={158} />}
      <Prop tex={pen} def={PEN} x={x} y={y} k={k} sx={1 - 0.05 * click} rot={d.rot} order={d.on ? 160 : 38} tint={tint} />
      {!d.on && click > 0.05 && [50, 70, 90, 110, 130].map((deg) => {
        const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R), r0 = (PEN_LEN / 2 + 22 + 10 * (1 - click)) * S, r1 = r0 + 58 * S;
        return <Poly key={deg} pts={ribbon([[fx + c * r0, fy + s * r0, 9 * S], [fx + c * r1, fy + s * r1, 4 * S]])} color="#14100a" order={170} />;
      })}
    </>
  );
}
/** the front row of boxes (400 puppet px wide each, the top of the lids 383 puppet px below her neck): it hides her below the waist, she "sits on a box" */
function FrontRow({ boxes, m }: { boxes: Box[]; m: View }) {
  const [box] = useImages([BOX.file]), L = useLabels(), row = boxes.filter((b) => b.r < 0), mid = row[1], S = mid.k / 0.609;
  return (
    <>
      <Foot x={mid.x - W / 2} y={H / 2 - mid.y - 4 * S} w={1300 * S} h={80 * S} op={0.6} order={149} />
      {row.map((b, i) => <BoxProp key={i} tex={box} label={L.pens} x={b.x - W / 2} y={H / 2 - b.y} k={b.k} rot={b.rot} order={150 + i * 0.1} tint={rowTint(2)} inkPx={inkAt(m.s)} lab={b.lab} />)}
    </>
  );
}
function DenEndScene({ id, f, door = 78 }: { id: ShotId; f: number; door?: number }) {
  const v = ENDVIEW[id]!, m = view(v.s, v.u0, v.v0), at = atPlate(m, DEN.u, DEN.v, DEN.sc, 0), boxes = endBoxes(v, bandOf(id));
  return (
    <>
      <GarageEndBg m={m} boxes={boxes} door={door} />
      <FistPen at={at} f={f} tint={GARAGE_TINT} />
      <Actor c="denisePen" f={f} {...at} tint={GARAGE_TINT} order={40} />
      <FrontRow boxes={boxes} m={m} />
      <Vignette w={W} h={H} op={0.5} order={400} />
    </>
  );
}
/** a Denise close-up: the same garage at the scale of src/pen-layout.ts DEN_HEAD, her head's middle where it says */
const denEnd = (id: ShotId) => shot(({ f }) => <DenEndScene id={id} f={f} />, DEN_HEAD[id]!.head);
const DenClick = denEnd("denClick"); // 43
const DenEyes = denEnd("denEyes"); // 46: her eyes go wide (her fist, with the pen, is off the frame to the left); the pen slips out of it off the frame
const DenSwear = denEnd("denSwear"); // 47: the pen falls into the frame and lands on the front row on the clatter's frame

// ── Rhonda in the side door: the doorway behind her, the poster at the left of the frame (her eyes go to it in shot 44), the little stack of boxes under it
function RhoDoorScene({ id, f, extra }: { id: ShotId; f: number; extra?: (m: View, at: At, f: number) => React.ReactNode }) {
  const v = ENDVIEW[id]!, m = view(v.s, v.u0, v.v0), at = atPlate(m, 656, 985, 0.33, below("rhondaPen", "beers"));
  return (
    <>
      <GarageEndBg m={m} boxes={endBoxes(v, bandOf(id))} door={78} />
      <Foot x={at.x} y={m.Y(985) + 4} w={260 * at.scale} op={0.55} order={30} />
      <Actor c="rhondaPen" f={f} {...at} tint={GARAGE_TINT} order={40} />
      {extra?.(m, at, f)}
      <Vignette w={W} h={H} op={0.5} order={400} />
    </>
  );
}
const rhoDoor = (id: ShotId, extra?: (m: View, at: At, f: number) => React.ReactNode) => shot(({ f }) => <RhoDoorScene id={id} f={f} extra={extra} />, [767, 985]);
const RhoPens = rhoDoor("rhoPens"); // 42
const RhoWall = rhoDoor("rhoWall"); // 44: her eyes go to the wall (src/pen-sched.ts gazeAt)
const RhoCrack2 = rhoDoor("rhoCrack2", (m, at, f) => { // 48: she cracks the can in her right hand
  const [px, py] = onPuppet(at, 87, 36);
  return <Spray m={m} f={f} at={plateAt(m, px, py)} t0={T.crack48} seed={2} k={at.scale / m.s} order={300} />;
});

// ── the wide of the garage (41, 49): Denise behind the boxes, the poster, Rhonda stepping into the doorway as the door swings open (41), then she stands there (49)
const garageWide = (id: "garageEnd" | "wideEnd") => shot(({ f }) => {
  const open = id === "wideEnd", m = view(WIDE.s, WIDE.u0, WIDE.v0), t = f / FPS;
  const a = open ? 78 : t < T.door41 ? 0 : Math.min(86, 78 * popP(t, T.door41, 0.55, 44)), p = open ? 1 : walk41P(f), st = open ? 0 : walk41Step(f);
  const u = lerp(642, 656, p), feet = lerp(960, 985, p) - 3 * Math.abs(st), at = atPlate(m, u, feet, lerp(0.25, 0.27, p), below("rhondaPen", "beers"));
  const lit = open ? 1 : ease((t - T.door41 - 0.04) / 0.3), g = Math.round(255 * (0.12 + 0.88 * lit)).toString(16).padStart(2, "0"); // she steps out of the dark of the doorway into the bulb's light
  return (
    <>
      <DenEndScene id={id} f={f} door={a} />
      {(open || t >= T.door41 + 0.04) && <><Foot x={at.x} y={m.Y(feet) + 4} w={260 * at.scale} op={0.55 * lit} order={30} /><Actor c="rhondaPen" f={f} {...at} tint={mulTint(GARAGE_TINT, `#${g}${g}${g}`)} order={41} /></>}
    </>
  );
}, [540, 1000]);
const GarageEnd = garageWide("garageEnd"); // 41
const WideEnd = garageWide("wideEnd"); // 49

// ── the fine print (45): the camera slides down the poster from the yacht to "*RESULTS NOT TYPICAL." and pushes in, in 0.46 s (src/pen-sched.ts fineP), and stops dead on the sting with the line in the middle of the
// frame, FINE.w px wide; then it is held there for 1.8 s, still but for a slow 2 % push (holdPush)
const PosterFine = shot(({ f }) => {
  const e = fineP(f), [tex] = useImages([PR.poster.file]), m = view(3, 120, 470);
  const k = Math.exp(lerp(Math.log(1.25), Math.log(FINE.w / fineWidth()), e)), r = lerp(330, 1321, e);
  const py = FY(FINE.y) - (672 - r) * k, w = 768 * k, h = 1344 * k;
  return (
    <>
      {bg(m, "sp/pen-bg-garage.jpg", 0, "#a0a0a0")}
      {k < 2.4
        ? <ContactShadow x={10 * k} y={py - 12 * k} w={w} h={h} r={2} blur={16 * k} op={0.4} color="#05070a" order={9} />
        : <ContactShadow x={10} y={py - h / 2 - 16} w={1500} h={44} r={2} blur={14} op={0.4} color="#05070a" order={9} />}
      <TPlane tex={tex} x={0} y={py} w={w} h={h} order={10} tint="#e6dccb" />
      <PosterText x={0} y={py} w={w} h={h} order={11} />
      <Tape x={0} y={py} w={w} h={h} order={12} tint="#e6dccb" />
      <Vignette w={W} h={H} op={0.5} order={400} />
    </>
  );
}, [540, FINE.y]);

export const SCENES: Record<ShotId, React.FC<{ f: number }>> = {
  garageMed: GarageMed, phoneAd: PhoneAd, phoneMsg: PhoneMsg, denBoss: DenBoss, penSlide: PenSlide, denResume: DenResume, contract: ContractShot, denPockets: DenPockets, readerUp: ReaderUp, cardTap: CardTap,
  signed: Signed, kitSays: KitSays, boxCatch: BoxCatch, diamond: Diamond, denCount: DenCount, mathCut: MathCut, posterIns: PosterIns, denSure: DenSure, palletWide: PalletWide, posterRip: PosterRip,
  garageEnd: GarageEnd, rhoPens: RhoPens, denClick: DenClick, rhoWall: RhoWall, posterFine: PosterFine, denEyes: DenEyes, denSwear: DenSwear, rhoCrack2: RhoCrack2, wideEnd: WideEnd,
};
