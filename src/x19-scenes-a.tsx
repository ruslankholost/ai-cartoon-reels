import React from "react";
import { Poly, ribbon, type Pt } from "./sp-puppet";
import { type View } from "./pen-stage";
import { Wash, FR, Impact } from "./x13-draw";
import { WindStreaks } from "./x17-draw";
import { Brow, LookPupils } from "./x18-draw";
import { BlastRing, HairTufts, ScreenLight, ScreenSun, Shards, SugarJar, ToddlerFinger, TrembleLip } from "./x19-draw";
import { GlazePupils, MuffinPlate, RossFlat, Tablet19, TAB, mulHex, tabKey } from "./x19-art";
import { blastShake, jit, momLid, rossMouthW, rossPose19, windK } from "./x19-act";
import { CounterFront, Flat, PL, PX, PY, PlateM, RG18, RG19, RossP, TalkMouth, cam, counterView, kid, rossAt, type Pic, type RossBody } from "./x19-stage";
import { BAR_FRAMES, BLAST_T, FPS, HOP_T, SMASH_T, clamp01, dimAt, ease, lerp, mouthAt, squashAt, tabletVol, talkMove, type ShotId } from "./x19-sched";

// The first half of the scenes of x19 "Screen Time" (the second is src/x19-scenes.tsx, which imports the helpers): the tablet, Ross in the hurricane, the toddler, Ross in the wind, the mom at her table, the muffin, the mom's brow, the rack. One canvas per shot,
// hard cuts. Each is the art of the shot (the pictures cut by scripts/x19-prep.py, src/x19-rig.json; x10's counter wall and apron body, x18's seating plate and mom) under the effects and writing drawn in code (src/x19-draw.tsx), with the pictures that are
// placed (the tablet, the muffin, the hands, the customers) in src/x19-art.tsx. Plates are seen through a view `m` (src/x09-stage.tsx cam: plate px -> frame px); the flat people (a picture cut out, lids, brows and pupils drawn over it) are placed by a picture point
// and a scale (src/x17-stage.tsx Flat); Ross is a puppet placed by the frame point of the middle of his head and a scale, or a flat picture placed the same way (RossFlat). A shot's `m` never moves: the camera's push-in and shake come from the canvas
// (src/x19-shared.tsx). Frame px: x right, y down, 1080 x 1920.
export const t = (f: number) => f / FPS;
export const W = 1080, H = 1920;
export const fp = (m: View, u: number, v: number): [number, number] => [W / 2 + m.X(u), H / 2 - m.Y(v)];   // a plate point as a frame point
export const pp = (x: number, y: number): Pt => [PX(x), PY(y)];                                           // a frame point as a panel point
export const EDGE_COUNTER = { top: "#eace9a", bottom: "#966430", side: "#54391d" };
export const EDGE_SEAT = { top: "#d2b677", bottom: "#7f5c33", side: "#ecd391", sideLow: "#7f5c33", split: 1155 };
export const sm = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const PLT = RG18.plates;
/** a picture of the cast by its name: x19's own first, then x18's (the mom at her phone and shocked) */
export const pic = (k: string) => (RG19.people[k] ?? RG18.people[k]) as Pic;
export const num = (d: Pic, k: string) => d[k] as unknown as number[];
export const HEAD_R = 195;   // Ross's head radius in the rig's px
const hx2 = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export const mixHex = (a: string, b: string, u: number) => { const p = hx2(a), q = hx2(b); return "#" + p.map((v, i) => Math.round(v + (q[i] - v) * u).toString(16).padStart(2, "0")).join(""); };
/** the people in the dim café are lit by the screen: they are drawn over the dim, tinted, while the room under them is dimmed (src/x19-scenes.tsx Dim); `LIT` the tint where a screen is on, `LIT_DARK` where none is */
export const LIT = "#cfdaff", LIT_DARK = "#aab9f0";
/** the tint of a person at frame f: white until the switch is flipped, `c` after it (over the three frames of the dim) */
export const litTint = (f: number, c = LIT, k = 1): string | undefined => { const d = dimAt(f) * k; return d <= 0.004 ? undefined : mixHex("#ffffff", c, d); };

// ═════════════════════════════════════════════════════ the plates: the counter wall (2, 4, 8, 14, 20, 28, 29), the seating corner with its big window (5, 7, 9, 12, 15, 17, 18, 21, 25 and the inserts)
export const CounterBg = ({ m }: { m: View }) => <PlateM m={m} file={PL.counter.file} edge={EDGE_COUNTER} />;
export const SeatBg = ({ m }: { m: View }) => <PlateM m={m} file={PLT.seating.file} edge={EDGE_SEAT} />;
/** the café's floor in code, from the frame row `y` down (the seating plate's own is too low for a close shot): the plate's brown planks and their seams */
export function Floor({ y, s, order = 6 }: { y: number; s: number; order?: number }) {
  return (
    <>
      <Poly pts={FR(-40, y, W + 40, H + 60)} color="#7f5c33" order={order} />
      <Poly pts={FR(-40, y - 3, W + 40, y + 3)} color="#5b3d1b" order={order + 0.1} />
      {[1, 2, 3, 4].map((i) => <Poly key={i} pts={FR(-40, y + 36 * s * i - 2, W + 40, y + 36 * s * i + 2)} color="#6a4a22" order={order + 0.1} />)}
    </>
  );
}
/** a café table seen from the side, as a band across the frame from row `y`: a light top edge, a wooden front */
export function Table({ y, order = 8 }: { y: number; order?: number }) {
  return (
    <>
      <Poly pts={FR(-40, y, W + 40, H + 60)} color="#8f5f2e" order={order} />
      <Poly pts={FR(-40, y, W + 40, y + 26)} color="#d7a35f" order={order + 0.1} />
      <Poly pts={FR(-40, y + 26, W + 40, y + 36)} color="#5a3a18" order={order + 0.1} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 1: INSERT, the tablet on a café table leaning on the sugar jar, a cartoon sun bouncing on its screen; the toddler's finger holds the volume key and the overlay's bars climb from three to MAX in 0.3 s (a bar a frame);
// the label slams on; at the blast (0.30) the frame flashes, rings of sound run out of the tablet and it shakes
export const TAB1 = { cx: 548, cy: 1060, rot: -3.5, s: 0.88 };
export function TabletShot({ f }: { f: number }) {
  const tt = t(f), vol = tabletVol(f), a = tt - BLAST_T, jx = a >= 0 && a < 0.3 ? 5 * jit(f, 3) * (1 - a / 0.3) : 0, jy = a >= 0 && a < 0.3 ? 4 * jit(f, 7) * (1 - a / 0.3) : 0;
  const { cx, cy, rot, s } = TAB1, key = tabKey(cx + jx, cy + jy, rot, s, 0, false, 4);
  const press = f >= BAR_FRAMES[0] && f <= BAR_FRAMES[BAR_FRAMES.length - 1] + 1 ? 8 : 4;
  return (
    <>
      <SeatBg m={cam(1.43, 384, 672)} />
      <Wash color="#3a2a14" op={0.18} order={4} />
      <Table y={1410} />
      <SugarJar x={66} y={1424} k={1.9} order={9} />
      <Tablet19 x={cx + jx} y={cy + jy} rot={rot} s={s} order={20} press={[press > 6 ? 10 : 0, 0]}>
        {(o) => <ScreenSun t={tt} vol={vol} order={o} W={TAB.wd} />}
      </Tablet19>
      <ToddlerFinger x={key[0]} y={key[1]} rot={52} k={0.9} press={press} order={40} />
      {f >= Math.round(BLAST_T * FPS) && [0, 0.07].map((d, i) => <BlastRing key={i} cx={cx} cy={cy} r0={260} r1={1100} u={(a - d) / 0.4} order={60 + i} />)}
      {f === Math.round(BLAST_T * FPS) && <Wash color="#ffffff" op={0.6} order={300} />}
      {f === Math.round(BLAST_T * FPS) + 1 && <Wash color="#ffffff" op={0.28} order={300} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 2: CLOSE, Ross behind the counter in the blast (ross-blown: his hair and apron blown to one side, both fists gripping the air, a polite strained smile); three cups fly off the shelf behind him and smash at 0.78
// (the cups hit the wall at the right: shards, a hit star). Wind streaks race past; he shakes on twos
const CUP = (RG18.props as Record<string, Pic>).cup as Pic;
export const R2 = { E: 1.0, yc: 1590, cx: 520, cy: 1090 };
export const VIEW_S = (E: number) => (E * HEAD_R) / 80;
export const rossView = (E: number, yc: number, u = 384) => counterView(VIEW_S(E), yc, u);
export function RossCounter({ f, m, cx, cy, E, body, hair = 0, order = 40, attach, tint }: { f: number; m: View; cx: number; cy: number; E: number; body: RossBody; hair?: number; order?: number; attach?: React.ReactNode; tint?: string }) {
  const r = rossAt(cx, cy, E), pose = rossPose19(f, body);
  return (
    <>
      <RossP x={r.x} y={r.y} E={E} order={order} body={body} pose={pose} mouthW={rossMouthW(f)} tint={tint} attach={hair > 0 || attach ? <>{hair > 0 && <HairTufts w={hair} f={f} />}{attach}</> : undefined} />
      <CounterFront m={m} order={80} />
    </>
  );
}
const CUPS: { x0: number; y0: number; x1: number; y1: number; arc: number; spin: number; start: number; land: number }[] = [
  { x0: -120, y0: 1070, x1: 960, y1: 960, arc: 110, spin: 900, start: 15, land: 22 }, { x0: -200, y0: 1100, x1: 1000, y1: 1010, arc: 90, spin: -700, start: 15, land: 23 }, { x0: -60, y0: 1040, x1: 930, y1: 930, arc: 100, spin: 1100, start: 16, land: 24 },
];
export function HurricaneShot({ f }: { f: number }) {
  const m = rossView(R2.E, R2.yc), tt = t(f), j = [jit(f, 3), jit(f, 6)];
  return (
    <>
      <CounterBg m={m} />
      {CUPS.map((c, i) => {
        const u = clamp01((f - c.start) / (c.land - c.start)), x = lerp(c.x0, c.x1, u), y = lerp(c.y0, c.y1, u) - c.arc * Math.sin(Math.PI * u), done = f >= c.land;
        return done ? null : <Flat key={i} d={CUP} apx={513} apy={650} x={x} y={y} k={0.25} rot={(c.spin * (f - c.start)) / FPS} order={30 + i} />;
      })}
      <WindStreaks t={tt} box={[0, 700, W, 1500]} n={16} dir={1} speed={3400} len={[280, 760]} thick={9} order={25} op={0.55} seed={3} />
      <RossFlat d={pic("ross_blown")} cx={R2.cx + 5 * j[0]} cy={R2.cy + 4 * j[1]} E={R2.E} rot={-3.5 + 1.8 * jit(f, 9)} order={40} />
      <CounterFront m={m} order={80} />
      <WindStreaks t={tt} box={[0, 780, W, 1500]} n={12} dir={1} speed={3800} len={[260, 700]} thick={8} order={95} op={0.7} seed={8} />
      {CUPS.map((c, i) => f >= c.land && f < c.land + 12 ? (
        <React.Fragment key={i}>
          <Impact cx={c.x1} cy={c.y1} r={70} age={t(f) - t(c.land)} order={92} />
          <Shards x={c.x1} y={c.y1} age={t(f) - t(c.land)} n={9} order={96 + i} />
        </React.Fragment>
      ) : null)}
      {f >= Math.round(SMASH_T * FPS) && f < Math.round(SMASH_T * FPS) + 3 && <Wash color="#ffffff" op={0.12} order={300} />}
    </>
  );
}

// ═════════════════════════════════════════════════════ 3, 11, 22, 26: the toddler at his table (toddler-sit: his mouth hangs open in a small round o, his eyes wide and glazed; toddler-popcorn: the bucket in his arms) lit blue by the screen (code glow and a
// flicker); 11 and 26 his bottom lip trembles (a code mouth over his face). (x, y) the frame point of the middle of his eyes, k the picture's scale
export function ToddlerFlat({ f, who = "toddler_sit", x = 540, y = 800, k = 1.3, lip = -1, lit = 1, tint, bob = 0, tiltD = 0, order = 30, children }: { f: number; who?: "toddler_sit" | "toddler_popcorn"; x?: number; y?: number; k?: number; lip?: number; lit?: number; tint?: string; bob?: number; tiltD?: number; order?: number; children?: React.ReactNode }) {
  const d = pic(who), a = num(d, "anchor"), g = d.grin!, fl = lit * (0.88 + 0.12 * jit(f, 9)), blue = tint ?? (lit > 0 ? mixHex("#ffffff", "#d2e8ff", 0.55 * fl) : undefined);
  return (
    <>
      <Flat d={d} apx={a[0]} apy={a[1]} x={x} y={y + bob} k={k} rot={tiltD} order={order} tint={blue}>
        {({ ax, ay }) => {
          const [mx, my] = kid(d, ax, ay, g.cx, g.cy);
          return (
            <>
              <GlazePupils apx={a[0]} apy={a[1]} eyes={d.eyes!} pupils={d.pupils!} white={(d.white as string) ?? "#fdfdfb"} order={order + 1} lit={fl} tint={blue} />
              {lip >= 0 && <TrembleLip cx={mx} cy={my} w={g.w * 1.5} skin={mulHex(d.skin ?? "#fddb9d", blue)} lip={mulHex("#e8a08a", blue)} build={lip} f={f} order={order + 3} />}
            </>
          );
        }}
      </Flat>
      {lit > 0 && <ScreenLight x={x} y={y + bob + 60} rx={400 * (k / 1.3)} ry={440 * (k / 1.3)} op={0.2 * fl} order={order + 8} />}
      {children}
    </>
  );
}
/** the seating plate's view for a person at scale k: the plate's scale s is her scale over 0.51 (her table as wide as the plate's own was), the window's sill (row 775) a little under her anchor and above her table; also where the floor starts (her table's foot) */
export function seatView(k: number, ay: number, ax = 540): { m: View; s: number; floor: number } {
  const s = k / 0.51, sill = ay + 330 * k, v0 = 775 - (sill - 960) / s;
  return { m: cam(s, 415 + (540 - ax) / s, v0), s, floor: ay + (960 - 360) * k };
}
export const TOD3 = { k: 1.3, y: 800 };
export function ToddlerShot({ f }: { f: number }) {
  const v = seatView(TOD3.k, TOD3.y), a = num(pic("toddler_sit"), "anchor"), k = TOD3.k;
  // the muffin on the table in front of him: the table top's middle is at picture (514, 652), the plate sits on it between his hands
  const px = 540 + (514.5 - a[0]) * k, py = TOD3.y + (652 - a[1]) * k;
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      <ToddlerFlat f={f} y={TOD3.y} k={k} order={30} />
      <MuffinPlate x={px} y={py} k={0.235 * k} order={40} />
    </>
  );
}

// ═════════════════════════════════════════════════════ 4: CLOSE, Ross still in the wind, polite (x10's apron body: he holds its straps): the head tilts downwind, tufts of hair stream, the streaks are lighter
export const R4 = { E: 1.0, yc: 1010, cx: 560 };
export function RossWindShot({ f }: { f: number }) {
  const m = rossView(R4.E, R4.yc), tt = t(f), w = windK(f), cy = R4.yc - 137 * m.s;
  return (
    <>
      <CounterBg m={m} />
      <WindStreaks t={tt} box={[0, 560, W, 1260]} n={9} dir={1} speed={3000} len={[260, 640]} thick={7} order={25} op={0.4} seed={5} />
      <RossCounter f={f} m={m} cx={R4.cx} cy={cy} E={R4.E} body="apron" hair={w}  />
      <WindStreaks t={tt} box={[0, 640, W, 1180]} n={6} dir={1} speed={3400} len={[240, 600]} thick={6} order={95} op={0.5} seed={11} />
    </>
  );
}

// ═════════════════════════════════════════════════════ the mom at her table by the window (5, 7, 9; 12, 15, 23, 27): a flat cut-out; her lids, brows and (the mom at her phone) a talking mouth are drawn over the painted face. The new pictures (panic, proud, plead) keep
// the mouths they were painted with
type Eye = { cx: number; cy: number; rx: number; ry: number };
function EyeLids({ eyes, d, ax, ay, skin, c, order }: { eyes: Eye[]; d: Pic; ax: number; ay: number; skin: string; c: number; order: number }) {
  if (c <= 0.02) return null;
  return (
    <>
      {eyes.map((e, i) => {
        const [x, y] = kid(d, ax, ay, e.cx, e.cy), rx = e.rx + 3.5, ry = e.ry + 3.5, yl = y + ry - 2 * ry * Math.min(1, c), a0 = Math.asin(Math.max(-1, Math.min(1, (yl - y) / ry)));
        const arc: Pt[] = Array.from({ length: 29 }, (_, j) => { const a = a0 + ((Math.PI - 2 * a0) * j) / 28; return [x + rx * Math.cos(a), y + ry * Math.sin(a)] as Pt; });
        const xr = x + rx * Math.cos(a0), xl = x - rx * Math.cos(a0), line = Array.from({ length: 9 }, (_, j) => { const u = j / 8; return [xl + (xr - xl) * u, yl - 0.09 * ry * Math.sin(Math.PI * u), 4.2] as number[]; });
        return (
          <React.Fragment key={i}>
            <Poly pts={arc} color={skin} order={order} />
            <Poly pts={ribbon(line)} color="#2a1a0a" order={order + 0.1} />
          </React.Fragment>
        );
      })}
    </>
  );
}
const MOM_A: Record<string, [number, number]> = { mom_phone: [485, 360], mom_shock: [487, 345] };
const BROW_COL = "#8c5f20";
type BrowSet = "none" | "flat" | "one" | "smug";
const BROWS: Record<Exclude<BrowSet, "none">, { dy: number; rot: number; arch: number }[]> = {
  flat: [{ dy: 0, rot: 3, arch: 5 }, { dy: 0, rot: -3, arch: 5 }],
  one: [{ dy: 0, rot: 4, arch: 6 }, { dy: 28, rot: -9, arch: 17 }],
  smug: [{ dy: -3, rot: 0, arch: 5 }, { dy: 16, rot: -6, arch: 12 }],
};
export type MomWho = "mom_phone" | "mom_shock" | "mom_panic" | "mom_proud" | "mom_plead";
export function Mom({ f, who, x, y, k, flip = false, rot = 0, sx = 1, sy = 1, order, brows = "none", lidBase = 0, gaze, talk = false, pr, anchor, tint }: { f: number; who: MomWho; x: number; y: number; k: number; flip?: boolean; rot?: number; sx?: number; sy?: number; order: number; brows?: BrowSet; lidBase?: number; gaze?: [number, number]; talk?: boolean; pr?: number; anchor?: [number, number]; tint?: string }) {
  const d = pic(who), [apx, apy] = anchor ?? (d.anchor ? (d.anchor as unknown as [number, number]) : MOM_A[who]), eyes = d.eyes!, skin = pic("mom_phone").skin ?? "#ffdca2", lid = momLid(f, lidBase);
  return (
    <Flat d={d} apx={apx} apy={apy} x={x} y={y} k={k} rot={rot} sx={sx} sy={sy} flip={flip} order={order} tint={tint}>
      {({ ax, ay }) => (
        <>
          {gaze && d.pupils && <LookPupils apx={apx} apy={apy} eyes={eyes} pupils={d.pupils} gaze={gaze} pr={pr} white={(d.white as string) ?? "#fdfdfb"} order={order + 1} />}
          {talk && d.grin && <TalkMouth grin={{ ...d.grin, skin }} d={d} ax={ax} ay={ay} shape={mouthAt("MOM", f)} order={order + 2} />}
          {lid > 0.02 && <EyeLids eyes={eyes} d={d} ax={ax} ay={ay} skin={mulHex(d.skin ?? skin, tint)} c={lid} order={order + 3} />}
          {brows !== "none" && eyes.map((e, i) => { const [bx, by] = kid(d, ax, ay, e.cx, e.cy - e.ry - 18), b = BROWS[brows][i]; return <Brow key={i} x={bx} y={by + b.dy} w={e.rx * 1.55} th={11} rot={b.rot} arch={b.arch} color={BROW_COL} order={order + 4} />; })}
        </>
      )}
    </Flat>
  );
}
export function SeatScene({ f, who = "mom_phone", k, ay, flip = false, ax = 540, brows = "none", lidBase = 0, gaze, talk = true, shake = 0, children, tint }: { f: number; who?: MomWho; k: number; ay: number; flip?: boolean; ax?: number; brows?: BrowSet; lidBase?: number; gaze?: [number, number]; talk?: boolean; shake?: number; children?: React.ReactNode; tint?: string }) {
  const v = seatView(k, ay, ax), mv = talkMove("MOM", f), [bx, by] = blastShake(f, shake, 4);
  return (
    <>
      <SeatBg m={v.m} />
      <Floor y={v.floor} s={v.s} />
      {children}
      <Mom f={f} who={who} x={ax + bx} y={ay - mv.bob * k + by} k={k} rot={mv.tilt * 0.35 + (shake ? (0.7 * jit(f, 5) * shake) / 3 : 0)} flip={flip} order={20} brows={brows} lidBase={lidBase} gaze={gaze} talk={talk} tint={tint} />
    </>
  );
}
/** 5: the mom at her table, eyes on her phone, the tumbler; her bun and sunglasses shake in the blast; the stroller is parked beside her, canopy down */
export function MomEatShot({ f }: { f: number }) {
  const k = 1.12, ay = 770, v = seatView(k, ay), S = RG19.props.stroller as Pic;
  return (
    <SeatScene f={f} k={k} ay={ay} brows="flat" shake={4}>
      <Flat d={S} apx={S.ox + S.w / 2} apy={S.oy + S.h} x={985} y={v.floor + 8} k={0.66} order={10} />
    </SeatScene>
  );
}
/** 7: she does not look up, one brow up (Do you have—) */
export const MomBrowShot = ({ f }: { f: number }) => <SeatScene f={f} k={1.5} ay={800} brows="one" shake={3} />;
/** 9: smug, mirrored, half lids (Then you wouldn't understand.) */
export const MomSmugShot = ({ f }: { f: number }) => <SeatScene f={f} k={1.25} ay={860} flip ax={600} brows="smug" lidBase={0.42} shake={2} />;

// ═════════════════════════════════════════════════════ 6: INSERT, the blueberry muffin on its little plate hops across the plate on the bass: three hops with a squash on each landing
/** the muffin's place and shape at time `tt`: it sits at the plate's left, takes off at each of HOP_T (airborne 0.2 s, 250 px high, 140 px to the right), lands with a squash that settles; `x` its foot's place (px to the right of where it started), `lift` px up,
 * `sq` 0 .. 1 how squashed, `air` whether it is in the air (it is stretched then) */
export function muffinAt(tt: number): { x: number; lift: number; sq: number; air: boolean; rot: number } {
  let r = { x: 0, lift: 0, sq: 0, air: false, rot: 0 };
  HOP_T.forEach((h, i) => {
    const a = tt - h;
    if (a < 0) return;
    if (a < 0.2) { const u = a / 0.2; r = { x: 140 * (i + ease(u)), lift: 250 * 4 * u * (1 - u), sq: 0, air: true, rot: 6 * Math.sin(Math.PI * u) * (i % 2 ? -1 : 1) }; }
    else r = { x: 140 * (i + 1), lift: 0, sq: squashAt(tt, h + 0.2, 0.3, 36), air: false, rot: 0 };
  });
  return r;
}
export function MuffinShot({ f }: { f: number }) {
  const m = muffinAt(t(f)), k = 0.86;   // the plate's middle at (640, 1150); the muffin starts 230 px left of it and hops to the right
  return (
    <>
      <SeatBg m={cam(2.0, 384, 760)} />
      <Wash color="#3a2a14" op={0.2} order={4} />
      <Table y={990} />
      <MuffinPlate x={640} y={1150} k={k} dx={-230 + m.x} dy={-m.lift} sx={m.air ? 0.92 : 1 + 0.18 * m.sq} sy={m.air ? 1.1 : 1 - 0.22 * m.sq} rot={m.rot} order={20} />
    </>
  );
}
export type { ShotId };
