import React from "react";
import * as THREE from "three";
import { Fill, G, Stroke, bezier, clamp, ell, mirrored, paint, pathPts, poly, roundPts, rpoly, rrect, scallopPts, shp, type Pt } from "./flat";
import { HEART, PhoneBack } from "./props";

// Our cast, drawn the cut-out way: big round head, short rounded body, stub arms with mitten hands, two big white eyes
// that touch in the middle with a small black dot each, a plain black mouth. Front-on, flat colour, black outline.
// Each character is one component with props (face, pose) so the episode can act with them: `lid` is how shut the eyes
// are (blinks), `mouth` how open (driven by the voice), `look` where the pupils point. The light on them is drawn by the
// set, as flat translucent zones laid over the whole scene.

export const SKIN = "#F4CDA6";
export const ellPts = (rx: number, ry: number, n = 36): Pt[] => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * rx, Math.sin((i / n) * Math.PI * 2) * ry] as Pt);

// ── face parts ──
const eyeShp = (rx: number, ry: number, lid: number) =>
  shp(`eye${rx},${ry},${Math.round(lid * 24)}`, () => {
    const cut = ry * (1 - 2 * lid);
    return Array.from({ length: 56 }, (_, i) => {
      const a = (i / 56) * Math.PI * 2;
      return [Math.cos(a) * rx, Math.min(Math.sin(a) * ry, cut)] as Pt;
    });
  });
const pupilShp = (r: number, px: number, py: number, cut: number) =>
  shp(`pu${r},${px.toFixed(1)},${py.toFixed(1)},${cut.toFixed(1)}`, () =>
    Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return [px + Math.cos(a) * r, Math.min(py + Math.sin(a) * r, cut)] as Pt;
    }));

export type EyesProps = { rx?: number; ry?: number; gap?: number; y?: number; lid?: number; look?: Pt; pupil?: number; ow?: number; heart?: boolean };
export function Eyes({ rx = 44, ry = 52, gap = 43, y = 8, lid = 0, look = [0, 0], pupil = 7, ow = 4, heart = false }: EyesProps) {
  const closed = lid >= 0.96;
  return (
    <>
      {[-1, 1].map((sd) => {
        const cx = sd * gap;
        if (closed) {
          // shut: a downward arc where each eye would be
          const pts: Pt[] = Array.from({ length: 13 }, (_, k) => {
            const a = (k / 12) * Math.PI;
            return [cx + Math.cos(a) * rx * 0.75, y - 4 - Math.sin(a) * 15] as Pt;
          });
          return <Stroke key={sd} pts={pts} w={8} z={2} />;
        }
        const cut = ry * (1 - 2 * lid);
        const px = clamp(look[0] * rx * 0.55, -(rx - pupil - 6), rx - pupil - 6);
        const py = clamp(look[1] * ry * 0.55, -(ry - pupil - 6), cut - pupil * 0.2);
        return (
          <G key={sd} x={cx} y={y} z={1}>
            <Fill s={eyeShp(rx, ry, lid)} fill="#ffffff" ow={ow} />
            {heart ? <Fill s={HEART} fill="#E8588C" ow={0} x={px} y={py} sx={pupil * 2.3} z={1} /> : <Fill s={pupilShp(pupil, px, py, cut)} fill="#000000" ow={0} z={1} />}
          </G>
        );
      })}
    </>
  );
}

// a thin black stroke above each eye; tilt > 0 worried (inner end up), < 0 cross (inner end down); raise lifts one brow
export function Brows({ y = 78, len = 76, inner = 6, tilt = 0, raise = [0, 0], w = 8, color = "#000" }: { y?: number; len?: number; inner?: number; tilt?: number; raise?: [number, number]; w?: number; color?: string }) {
  return (
    <>
      {[-1, 1].map((sd, k) => {
        const yi = y + tilt * 20 + raise[k], yo = y - tilt * 12 + raise[k];
        const pts: Pt[] = Array.from({ length: 9 }, (_, i) => {
          const u = i / 8;
          return [sd * (inner + len * u), yi + (yo - yi) * u + Math.sin(u * Math.PI) * 7] as Pt;
        });
        return <Stroke key={sd} pts={pts} w={w} color={color} z={3} />;
      })}
    </>
  );
}

// the mouth: a line (closed, `smile` bends it) or a black D with a strip of white teeth (open)
export function Mouth({ open = 0, w = 70, smile = 0, teeth = false, tongue = false, x = 0, y = 0, z = 2 }: { open?: number; w?: number; smile?: number; teeth?: boolean; tongue?: boolean; x?: number; y?: number; z?: number }) {
  if (open < 0.06) {
    const pts: Pt[] = Array.from({ length: 13 }, (_, i) => {
      const u = i / 12 - 0.5;
      return [u * w, -smile * 12 * (1 - 4 * u * u)] as Pt;
    });
    return <Stroke pts={pts} w={7} x={x} y={y} z={z} />;
  }
  const H = (Math.round(open * 12) / 12) * 60;
  const yt = (u: number) => -smile * 9 * (1 - u * u);
  const D = shp(`mo${w},${Math.round(H)},${Math.round(smile * 10)}`, () => {
    const top: Pt[] = Array.from({ length: 13 }, (_, i) => { const u = -1 + (2 * i) / 12; return [(u * w) / 2, yt(u)] as Pt; });
    const bot: Pt[] = Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI; const u = Math.cos(a); return [(u * w) / 2, yt(u) - Math.sin(a) * H] as Pt; });
    return [...top, ...bot.slice(1, -1)];
  });
  const th = Math.min(16, H * 0.42);
  const T = shp(`mt${w},${Math.round(th)},${Math.round(smile * 10)}`, () => {
    const top: Pt[] = Array.from({ length: 13 }, (_, i) => { const u = -0.9 + (1.8 * i) / 12; return [(u * w) / 2, yt(u)] as Pt; });
    const bot: Pt[] = Array.from({ length: 13 }, (_, i) => { const u = 0.9 - (1.8 * i) / 12; return [(u * w) / 2, yt(u) - th * Math.sqrt(1 - u * u * 0.5)] as Pt; });
    return [...top, ...bot];
  });
  return (
    <G x={x} y={y} z={z}>
      <Fill s={D} fill="#000000" ow={0} />
      {teeth && <Fill s={T} fill="#ffffff" ow={0} z={0.5} />}
      {tongue && H > 22 && <Fill s={ell(w * 0.28, Math.min(14, H * 0.28))} fill="#E8737C" ow={0} y={-H * 0.72} z={0.5} />}
    </G>
  );
}

// a mitten: a circle and a thumb
export function Mitten({ r = 30, color = SKIN, thumb = 1, z = 0 }: { r?: number; color?: string; thumb?: 1 | -1; z?: number }) {
  return (
    <G z={z}>
      <Fill s={ell(r * 0.42, r * 0.6)} fill={color} ow={5} x={thumb * r * 0.88} y={r * 0.25} r={thumb * -28} z={-0.6} />
      <Fill s={ell(r, r)} fill={color} ow={5.5} />
    </G>
  );
}

// an arm hangs from the shoulder: `a` degrees swing it away from the body (negative = across the front)
const CUFF = shp("cuff", () => scallopPts(ellPts(42, 22, 40), 4, 10));
export function Arm({ side, a = 10, len = 96, w = 54, sleeve = "#C73A2F", map, mapId, hand = SKIN, thumb, z = 0, cuff, children }: { side: 1 | -1; a?: number; len?: number; w?: number; sleeve?: string; map?: THREE.Texture; mapId?: string; hand?: string; thumb?: 1 | -1; z?: number; cuff?: string; children?: React.ReactNode }) {
  return (
    <G z={z} r={side * a}>
      <Fill s={rrect(w, len, w / 2)} fill={sleeve} map={map} mapId={mapId} y={-len / 2 + 14} ow={5.5} />
      {cuff && <Fill s={CUFF} fill={cuff} ow={5.5} y={-len + 12} z={0.5} />}
      <G y={-len - 6} r={-side * a} z={1}>
        <Mitten color={hand} thumb={thumb ?? (-side as 1 | -1)} />
        {children}
      </G>
    </G>
  );
}
// where the hand is for an arm from `sh` (the shoulder, in the frame) at angle a and length len, drawn at scale s
export const handAt = (sh: Pt, side: 1 | -1, a: number, len: number, s = 1): Pt => {
  const r = (side * a * Math.PI) / 180;
  return [sh[0] + Math.sin(r) * (len + 6) * s, sh[1] - Math.cos(r) * (len + 6) * s];
};
// the angle and length that put the hand of an arm from `sh` on the point `to`
export const armToward = (sh: Pt, side: 1 | -1, to: Pt, s = 1): { a: number; len: number } => {
  const dx = to[0] - sh[0], dy = to[1] - sh[1];
  return { a: (side * Math.atan2(dx, -dy) * 180) / Math.PI, len: Math.hypot(dx, dy) / s - 6 };
};

// ── Dave: cap, big mustache, plaid shirt, belly ──
let PLAID: THREE.CanvasTexture | null = null;
export const plaid = () => {
  if (!PLAID) {
    PLAID = paint("plaid2", 128, 128, (g) => {
      g.fillStyle = "#B63B37";
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#8A2B2A";
      g.fillRect(0, 0, 64, 64);
      g.fillRect(64, 64, 64, 64);
    });
    PLAID.wrapS = PLAID.wrapT = THREE.RepeatWrapping;
    PLAID.repeat.set(1 / 100, 1 / 100);
  }
  return PLAID;
};

const DAVE_TORSO = shp("daveTorso", () => mirrored(pathPts("M 0 174 C 64 174 106 152 124 104 C 144 56 168 8 152 -26 C 138 -54 80 -64 0 -64", 18)));
// the mustache; `droop` bends the two ends down
const MUST_HALF: Pt[] = [[0, 16], [32, 20], [62, 12], [86, -6], [96, -36], [78, -30], [56, -20], [30, -18], [0, -24]];
const mustache = (droop: number) => shp(`mustache${Math.round(droop * 10)}`, () => mirrored(roundPts(MUST_HALF.map(([x, y]) => [x, y - droop * 0.007 * x * x] as Pt), 8, 5)));
const CAP_DOME = shp("capDome", () => Array.from({ length: 41 }, (_, i) => [Math.cos((i / 40) * Math.PI) * 130, Math.sin((i / 40) * Math.PI) * 82] as Pt));
const BRIM = shp("capBrim", () => {
  const pts: Pt[] = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([-142 + 284 * u, 14 * Math.sin(u * Math.PI)]); }
  for (let i = 30; i >= 0; i--) { const u = i / 30; pts.push([-142 + 284 * u, -20 - 12 * Math.sin(u * Math.PI)]); }
  return pts;
});
const CAP = "#4F7A4A";
const CAP_D = "#3B5C37";

export type DaveProps = {
  x?: number; y?: number; z?: number; s?: number;
  belly?: number; can?: boolean; canTilt?: number;
  lid?: number; look?: Pt; pupil?: number; brow?: number; raise?: [number, number]; droop?: number; turn?: number;
  mouth?: number; teeth?: boolean; smile?: number; tongue?: boolean;
  tilt?: number; legs?: boolean; capUp?: number;
  armL?: number; armR?: number; armLLen?: number; armRLen?: number; handL?: React.ReactNode; handR?: React.ReactNode;
  smear?: number; held?: React.ReactNode;
};
export function Dave({ x = 0, y = 0, z = 0, s = 1, belly = 0, can = true, canTilt = 5, lid = 1, look = [0, 0], pupil = 7, brow = 0.2, raise = [0, 0], droop = 0, turn = 0, mouth = 0.55, teeth = false, smile = 0, tongue = true, tilt = 7, legs = true, capUp = 0, armL = 6, armR = 22, armLLen = 96, armRLen = 96, handL, handR, smear = 0, held }: DaveProps) {
  const tex = plaid();
  return (
    <G x={x} y={y} z={z} sx={s}>
      {legs && (
        <G z={0}>
          {[-1, 1].map((sd) => (
            <G key={sd} x={sd * 64}>
              <Fill s={rrect(88, 150, 36)} fill="#36527F" y={-96} ow={5.5} />
            </G>
          ))}
        </G>
      )}
      {/* torso: plaid, with the belly */}
      <G z={3} sy={1 + belly * 0.025}>
        <Fill s={DAVE_TORSO} fill="#ffffff" map={tex} mapId="plaid2" ow={5.5} />
        {smear > 0 && (
          <G z={1} sx={smear}>
            <Fill s={ell(58, 36)} fill="#7FA83A" ow={0} x={20} y={60} r={-24} />
            <Fill s={ell(30, 20)} fill="#7FA83A" ow={0} x={-30} y={28} r={20} />
            <Fill s={ell(18, 26)} fill="#7FA83A" ow={0} x={64} y={22} />
          </G>
        )}
      </G>
      {held && <G z={4}>{held}</G>}
      {/* arms hang from the shoulders (the right one can be long: a cartoon arm that flops onto the table) */}
      <G x={-106} y={150}><Arm side={-1} a={armL} len={armLLen} sleeve="#ffffff" map={tex} mapId="plaid2" z={5}>{handL}</Arm></G>
      <G x={106} y={150}><Arm side={1} a={armR} len={armRLen} sleeve="#ffffff" map={tex} mapId="plaid2" z={5}>{handR}</Arm></G>
      {/* the head: `turn` slides the face and the cap toward one side, like turning the head */}
      <G x={0} y={266} r={tilt + turn * 6} z={12}>
        <Fill s={ell(126, 114)} fill={SKIN} ow={5.5} />
        <G x={turn * 40}>
          <Eyes lid={lid} look={look} pupil={pupil} />
          <Brows tilt={brow} raise={raise} y={74} />
          <Mouth open={mouth} w={74} tongue={tongue} teeth={teeth} smile={smile} y={-76} z={2} />
          <G z={5}>
            <Fill s={mustache(droop)} fill="#33210F" ow={5.5} y={-50 - droop * 8} />
            <Fill s={rpoly("chip", [[0, 0], [52, -9], [12, -54]], 7)} fill="#F0B640" ow={4} x={62} y={-56 - droop * 30} r={-18 - droop * 25} z={1} />
          </G>
        </G>
        <G z={8} y={capUp} x={turn * 16}>
          <Fill s={CAP_DOME} fill={CAP} ow={5.5} y={56} />
          <Fill s={BRIM} fill={CAP_D} ow={5.5} y={58} z={2} />
        </G>
      </G>
      {/* the beer can balanced on the belly */}
      {can && (
        <G x={4} y={-2 + belly * 5} r={canTilt} z={8}>
          <Fill s={rrect(62, 104, 10)} fill="#E3B23C" ow={5.5} />
          <Fill s={rrect(62, 36, 0)} fill="#F4EEDD" ow={0} z={1} />
          <Fill s={ell(31, 9)} fill="#CFD6DC" ow={4} y={52} z={1} />
        </G>
      )}
    </G>
  );
}

// ── Barb: curlers, cardigan, reading glasses, knitting ──
const BARB_TORSO = shp("barbTorso", () => mirrored(pathPts("M 0 172 C 52 172 84 160 96 124 C 108 90 118 40 112 4 C 106 -24 60 -30 0 -30", 14)));
export type BarbProps = { x?: number; y?: number; z?: number; s?: number; tilt?: number; look?: Pt; lid?: number; needle?: number; mouth?: number; knit?: number; brow?: number };
export function Barb({ x = 0, y = 0, z = 0, s = 1, tilt = -2, look = [0.05, -0.85], lid = 0.42, needle = 0, mouth = 0, knit = 0, brow = 0.1 }: BarbProps) {
  const CARD = "#9C8DCB";
  const curlers: { p: Pt; r: number }[] = [-50, -25, 0, 25, 50].map((a) => ({ p: [Math.sin((a * Math.PI) / 180) * 140, 26 + Math.cos((a * Math.PI) / 180) * 118] as Pt, r: -a }));
  const k1 = Math.sin(knit * 6.3), k2 = Math.sin(knit * 6.3 + 1.7);
  return (
    <G x={x} y={y} z={z} sx={s}>
      {/* cardigan over a blouse */}
      <G z={3}>
        <Fill s={BARB_TORSO} fill={CARD} ow={5.5} />
        <Fill s={poly("vneck", [[-46, 176], [46, 176], [10, 76], [-10, 76]])} fill="#EFE6D2" ow={5.5} z={1} />
      </G>
      {/* arms: both hands meet in front, holding the needles, and knit */}
      <G x={-92} y={146}><Arm side={-1} a={-46 + 4 * k1} len={104} sleeve={CARD} z={8} /></G>
      <G x={92} y={146}><Arm side={1} a={-46 + 4 * k2} len={104} sleeve={CARD} z={8} /></G>
      <G x={0} y={44} z={8.5}>
        <Stroke pts={[[-74, -4], [66, 96]]} w={9} color="#C8CFD8" ow={5.5} r={needle + 5 * k1} />
        <Stroke pts={[[74, -4], [-66, 96]]} w={9} color="#C8CFD8" ow={5.5} r={-needle - 5 * k2} z={0.5} />
        <Fill s={ell(11, 11)} fill="#D9534F" ow={4} x={68} y={98} z={1} />
        <Fill s={ell(11, 11)} fill="#D9534F" ow={4} x={-68} y={98} z={1} />
      </G>
      {/* the head */}
      <G x={0} y={264} r={tilt} z={12}>
        <Fill s={ell(150, 128)} fill="#9A5434" ow={5.5} y={26} z={-3} />
        <Fill s={ell(124, 112)} fill={SKIN} ow={5.5} />
        <Eyes lid={lid} look={look} pupil={7} />
        <Brows y={76} raise={[0, 10]} tilt={brow} />
        <Mouth open={mouth} w={56} smile={-0.4} y={-70} />
        <G z={6}>
          {[-1, 1].map((sd) => <Stroke key={sd} pts={ellPts(48, 57, 40)} closed w={7} color="#A5343B" ow={4} x={sd * 43} y={6} />)}
          <Stroke pts={[[-96, 24], [-124, 32]]} w={6} color="#A5343B" ow={3.5} />
          <Stroke pts={[[96, 24], [124, 32]]} w={6} color="#A5343B" ow={3.5} />
        </G>
        <G z={8}>
          {curlers.map(({ p, r }, i) => (
            <G key={i} x={p[0]} y={p[1]} r={r}>
              <Fill s={rrect(50, 84, 22)} fill="#E58AAE" ow={5.5} />
              <Fill s={rrect(50, 16, 0)} fill="#F6C1D4" ow={0} y={10} z={1} />
            </G>
          ))}
        </G>
      </G>
    </G>
  );
}

// ── Linda: bob haircut, fluffy bathrobe, a snorkel mask, a phone ──
const LINDA_ROBE = shp("lindaRobe", () => scallopPts(mirrored(pathPts("M 0 172 C 56 172 92 156 108 120 C 124 82 134 34 128 -4 C 122 -34 64 -40 0 -40", 14)), 5, 22));
const LINDA_COLLAR = shp("lindaCollar", () => scallopPts(ellPts(80, 30, 60), 5, 14));
const LINDA_BOB = shp("lindaBob", () => mirrored(pathPts("M 0 132 C 90 132 152 96 154 14 L 152 -64 C 150 -98 132 -112 110 -110 L 0 -110", 16)));
const LINDA_BANGS = shp("lindaBangs", () => pathPts("M -130 36 C -128 146 128 146 130 36 C 104 98 44 104 0 98 C -44 104 -104 98 -130 36", 14));
const HAIR_L = "#3B2418", ROBE = "#EDE7D8";
export type LindaPose = "up" | "type" | "hug";
export type LindaProps = {
  x?: number; y?: number; z?: number; s?: number; pose?: LindaPose; phone?: boolean;
  look?: Pt; mouth?: number; lid?: number; brow?: number; tilt?: number; teeth?: boolean; tongue?: boolean;
  mask?: "on" | "up"; heartEyes?: boolean; hearts?: number; faceLight?: boolean;
};
export function Linda({ x = 0, y = 0, z = 0, s = 1, pose = "up", phone = true, look = [-0.65, 0.3], mouth = 0.85, lid = 0, brow = 0.8, tilt = -5, teeth = false, tongue = true, mask = "on", heartEyes = false, hearts = 0, faceLight = true }: LindaProps) {
  const arms = pose === "up" ? { l: 150, r: 40, ll: 122, rl: 102 } : pose === "type" ? { l: -52, r: -52, ll: 104, rl: 104 } : { l: -64, r: -64, ll: 112, rl: 112 };
  const maskY = mask === "on" ? 0 : 106;
  return (
    <G x={x} y={y} z={z} sx={s}>
      {/* the bathrobe */}
      <G z={3}>
        <Fill s={LINDA_ROBE} fill={ROBE} ow={5.5} />
        <Stroke pts={[[-122, 42], [122, 42]]} w={20} color="#E86A9A" ow={5.5} round={false} z={1} />
        <Fill s={ell(22, 16)} fill="#E86A9A" ow={5.5} x={36} y={36} z={2} />
        <Fill s={poly("beltTail", [[28, 30], [52, 30], [62, -26], [42, -30]])} fill="#E86A9A" ow={5.5} z={1.5} />
        <Fill s={LINDA_COLLAR} fill="#F6F1E4" ow={5.5} y={150} z={3} />
      </G>
      {/* the phone: held up (we see its back), or in front of her chest */}
      {phone && pose === "type" && <PhoneBack x={0} y={50} s={0.9} z={7} glow={false} />}
      {phone && pose === "hug" && <PhoneBack x={0} y={74} s={0.6} z={7} glow={false} />}
      <G x={-98} y={146}><Arm side={-1} a={arms.l} len={arms.ll} w={66} sleeve={ROBE} cuff="#F6F1E4" z={8}>{phone && pose === "up" ? <PhoneBack x={-26} y={118} /> : null}</Arm></G>
      <G x={98} y={146}><Arm side={1} a={arms.r} len={arms.rl} w={66} sleeve={ROBE} cuff="#F6F1E4" z={8} /></G>
      {/* the head: bob, bangs, the snorkel mask over the eyes (or pushed up), the snorkel */}
      <G x={0} y={262} r={tilt} z={12}>
        <Fill s={LINDA_BOB} fill={HAIR_L} ow={5.5} y={0} z={-3} />
        <Fill s={ell(124, 112)} fill={SKIN} ow={5.5} />
        {faceLight && <Fill s={shp("faceL", () => ellPts(124, 112, 64).map(([px, py]) => [Math.min(px, -34), py] as Pt))} fill="#BFE3FF" ow={0} op={0.2} z={0.5} />}
        <Fill s={LINDA_BANGS} fill={HAIR_L} ow={5.5} z={3} />
        <G z={4}><Brows y={mask === "on" ? 86 : 80} len={mask === "on" ? 50 : 70} inner={8} tilt={brow} /></G>
        <Mouth open={mouth} w={46} tongue={tongue} teeth={teeth} y={-64} />
        {mask === "on" ? (
          <G z={5}>
            <Stroke pts={[[-112, 10], [-142, 18]]} w={16} color="#1F7E7C" ow={5.5} round={false} />
            <Stroke pts={[[112, 10], [142, 18]]} w={16} color="#1F7E7C" ow={5.5} round={false} />
            <Fill s={rrect(232, 136, 56)} fill="#2A9D9B" ow={5.5} y={6} />
            <Fill s={rrect(198, 104, 44)} fill="#D4F1F8" ow={4} y={6} z={0.5} />
            <G z={1}><Eyes rx={40} ry={44} gap={40} y={6} lid={lid} look={look} pupil={5.5} ow={4} heart={heartEyes} /></G>
            <Stroke pts={[[40, 40], [70, 14]]} w={7} color="#FFFFFF" op={0.8} z={5} />
            <Stroke pts={[[78, 40], [92, 26]]} w={7} color="#FFFFFF" op={0.8} z={5} />
          </G>
        ) : (
          <>
            <G z={5}><Eyes lid={lid} look={look} pupil={7} heart={heartEyes} /></G>
            <G z={7} y={maskY} r={-5}>
              <Fill s={rrect(232, 136, 56)} fill="#2A9D9B" ow={5.5} y={6} />
              <Fill s={rrect(198, 104, 44)} fill="#D4F1F8" ow={4} y={6} z={0.5} />
              <Stroke pts={[[40, 40], [70, 14]]} w={7} color="#FFFFFF" op={0.8} z={5} />
            </G>
          </>
        )}
        <G z={6}>
          <Stroke pts={bezier([[116, 36 + maskY], [172, 40 + maskY], [182, 120 + maskY], [150, 226 + maskY]], 18)} w={26} color="#D9AE3E" ow={5.5} round={false} />
          <Fill s={rrect(36, 58, 12)} fill="#D96A2B" ow={5.5} x={146} y={238 + maskY} r={-14} />
          <Fill s={rrect(30, 44, 8)} fill="#C79A33" ow={5.5} x={132} y={30 + maskY} z={0.5} />
        </G>
      </G>
      {hearts > 0 && [0, 1, 2].map((i) => <Fill key={i} s={HEART} fill="#E8588C" ow={5.5} x={-150 + i * 110} y={400 + ((hearts * 60 + i * 55) % 150)} sx={22 + i * 5} r={-10 + i * 12} z={20} />)}
    </G>
  );
}

// ── Chad: slick hair, a sleep mask, a grin. The body is the bed's business (see bedroom.tsx). Without the mask: a portrait. ──
const CHAD_HAIR = shp("chadHair", () => roundPts([[-130, 52], [-134, 108], [-104, 146], [-40, 168], [30, 172], [92, 154], [130, 110], [132, 52], [98, 74], [50, 90], [0, 80], [-50, 92], [-98, 76]], 16, 6));
export type ChadHeadProps = { smile?: number; mouth?: number; tilt?: number; faceLight?: boolean; mask?: boolean };
export function ChadHead({ smile = 1, mouth = 0.4, tilt = 0, faceLight = true, mask = true }: ChadHeadProps) {
  return (
    <G r={tilt}>
      <Fill s={ell(126, 114)} fill="#EFC49C" ow={5.5} />
      {faceLight && <Fill s={shp("faceC", () => ellPts(126, 114, 64).map(([px, py]) => [Math.min(px, -40), py] as Pt))} fill="#BFE3FF" ow={0} op={0.2} z={0.5} />}
      {[-1, 1].map((sd) => <Fill key={sd} s={ell(22, 13)} fill="#F28F8F" ow={0} op={0.85} x={sd * 92} y={-34} z={1} />)}
      <Mouth open={mouth} w={106} smile={smile} teeth y={-64} />
      {mask ? (
        <G z={4}>
          <Fill s={rrect(262, 104, 46)} fill="#243066" ow={5.5} y={8} />
          <Stroke pts={[[-100, 44], [0, 52], [100, 44]]} w={7} color="#34469A" z={1} />
          <Fill s={poly("star4", [[0, 14], [4, 4], [14, 0], [4, -4], [0, -14], [-4, -4], [-14, 0], [-4, 4]])} fill="#F0D27A" ow={0} x={-72} y={10} z={1} />
          <Fill s={poly("star4", [[0, 14], [4, 4], [14, 0], [4, -4], [0, -14], [-4, -4], [-14, 0], [-4, 4]])} fill="#F0D27A" ow={0} x={66} y={-2} z={1} sx={0.7} />
        </G>
      ) : (
        <G z={4}><Eyes lid={0} look={[0.1, 0]} pupil={7} /><Brows y={78} raise={[0, 8]} /></G>
      )}
      <Fill s={CHAD_HAIR} fill="#2B2018" ow={5.5} z={6} />
      <Stroke pts={bezier([[-74, 140], [-30, 160], [30, 160], [84, 138]], 14)} w={9} color="#6A5648" z={7} />
    </G>
  );
}
