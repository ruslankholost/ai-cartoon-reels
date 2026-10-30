import * as THREE from "three";
import { Arm, Barb, Dave, armToward, plaid, type DaveProps, type BarbProps } from "./chars";
import { BowlBack, BowlFront, Scarf } from "./living";
import { Fill, G, Stroke, Txt, bezier, ell, paint, poly, rrect, type Pt } from "./flat";
import { PhoneBack } from "./props";

// Dave kitchen, Monday morning, sun in the window. Dave and Barb at the table in front of the camera; the dip bowl with
// his phone in it; the "#1 PLUMBER" mug. Light is flat warm zones from the window. The wall calendar flips FRI to MON.
const R = rrect;
const WARMSUN = "#FFE9A0";

let CHECK: THREE.CanvasTexture | null = null;
const checkTex = () => {
  if (!CHECK) {
    CHECK = paint("check", 128, 128, (g) => {
      g.fillStyle = "#FFFFFF";
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#D9453B";
      g.fillRect(0, 0, 64, 64);
      g.fillRect(64, 64, 64, 64);
    });
    CHECK.wrapS = CHECK.wrapT = THREE.RepeatWrapping;
    CHECK.repeat.set(1 / 128, 1 / 128);
  }
  return CHECK;
};

// the wall calendar: `p` is how many pages have flipped (0 = FRI, 3 = MON); the page flipping shrinks up to its hinge
const DAYS: [string, string, string][] = [["FRI", "9", "#2B2F3A"], ["SAT", "10", "#C8372D"], ["SUN", "11", "#C8372D"], ["MON", "12", "#2B2F3A"]];
export function Calendar({ x, y, s = 1, p = 3 }: { x: number; y: number; s?: number; p?: number }) {
  const idx = Math.min(3, Math.floor(p));
  const f = idx >= 3 ? 0 : p - idx;
  const page = (k: number, flip: number) => (
    <G key={k} y={150} sy={Math.max(0.001, 1 - flip)} z={k === idx ? 3 : 1 + (3 - k) * 0.01}>
      <Fill s={R(272, 300, 8)} fill="#FBF6E6" ow={5.5} y={-150} />
      <Txt text={DAYS[k][0]} size={62} color={DAYS[k][2]} y={-72} z={0.5} font="Arial Black, Arial, sans-serif" weight={900} />
      <Txt text={DAYS[k][1]} size={118} color={DAYS[k][2]} y={-196} z={0.5} font="Arial Black, Arial, sans-serif" weight={900} />
    </G>
  );
  return (
    <G x={x} y={y} sx={s} z={8}>
      <Fill s={R(300, 400, 14)} fill="#C9A044" ow={5.5} y={0} />
      <Fill s={R(300, 74, 14)} fill="#C8372D" ow={5.5} y={163} z={0.5} />
      <Txt text="OCTOBER" size={28} color="#FFFFFF" y={163} z={1} font="Arial Black, Arial, sans-serif" weight={900} />
      {[-70, 70].map((rx) => <Fill key={rx} s={ell(9, 9, 12)} fill="#2B2F3A" ow={0} x={rx} y={196} z={1.6} />)}
      {page(Math.min(3, idx + 1), 0)}
      {idx < 3 && page(idx, f)}
    </G>
  );
}

function Mug({ x, y, z, steam }: { x: number; y: number; z: number; steam: number }) {
  return (
    <G x={x} y={y} z={z}>
      <Stroke pts={bezier([[60, 22], [108, 34], [108, -34], [60, -22]], 14)} w={16} color="#FFFFFF" ow={5.5} z={-0.3} round={false} />
      <Fill s={R(124, 116, 22)} fill="#FFFFFF" ow={5.5} />
      <Txt text={"#1\nPLUMBER"} size={15} color="#2E6BB8" y={-2} z={1} font="Arial Black, Arial, sans-serif" weight={900} />
      <Fill s={ell(52, 12)} fill="#6B4A2E" ow={5.5} y={58} z={0.5} />
      {[0, 1].map((k) => <Stroke key={k} pts={Array.from({ length: 10 }, (_, i) => [(k ? 14 : -14) + Math.sin(i * 0.9 + steam * 4 + k) * 7, 70 + i * 11 + ((steam * 40) % 12)] as Pt)} w={7} color="#FFFFFF" op={0.55} z={1} />)}
    </G>
  );
}

function Chair({ x, z }: { x: number; z: number }) {
  return (
    <G x={x} z={z}>
      <Fill s={R(330, 400, 22)} fill="#B07A45" ow={5.5} y={-10} />
      {[-90, 0, 90].map((sy) => <Stroke key={sy} pts={[[-130, sy], [130, sy]]} w={8} color="#8F5F32" round={false} z={1} y={0} />)}
    </G>
  );
}

export type KitchenState = {
  g?: number;
  dave?: DaveProps;
  barb?: BarbProps;
  // the phone: where it is, whether it sits in the bowl (inside = between the back and the front of the bowl), goo on it
  phone?: { x: number; y: number; inside?: boolean; goo?: boolean; held?: boolean } | null;
  fish?: { to: Pt } | null; // the left arm of Dave reaching a point (drawn above the table)
  held?: boolean; // the phone is in both hands in front of Dave
  bubbles?: number;
  calendar?: number;
  steam?: number;
};
export const KDAVE = { x: -200, y: -170, s: 1.2 };
export const KDAVE_SHOULDER_L: Pt = [KDAVE.x - 106 * KDAVE.s, KDAVE.y + 150 * KDAVE.s];
export const KBOWL: Pt = [-330, -400];

export function Kitchen({ frame = 0, st = {} }: { frame?: number; st?: KitchenState }) {
  const g = st.g ?? frame / 30;
  const breathe = 0.5 + 0.5 * Math.sin(g * 1.7);
  const phone = st.phone === undefined ? { x: KBOWL[0], y: KBOWL[1] - 60, inside: true, goo: true } : st.phone;
  const fish = st.fish ? armToward(KDAVE_SHOULDER_L, -1, st.fish.to, KDAVE.s) : null;
  const tiles = Array.from({ length: 17 }, (_, i) => <Stroke key={`tv${i}`} pts={[[-560 + i * 70, 20], [-560 + i * 70, -330]]} w={4} color="#B3D1CA" round={false} />);
  const rows = Array.from({ length: 5 }, (_, i) => <Stroke key={`th${i}`} pts={[[-560, 20 - i * 70], [560, 20 - i * 70]]} w={4} color="#B3D1CA" round={false} />);
  const planks = Array.from({ length: 19 }, (_, i) => {
    const bx = (i - 9) * 130;
    const f = 1000 / 1660;
    return <Stroke key={i} pts={[[f * bx, -332], [bx, -960]]} w={4} color="#A98456" round={false} />;
  });
  const drape: Pt[] = [[560, -560], [-560, -560], ...Array.from({ length: 30 }, (_, i) => [-560 + i * 38, -652 + 14 * Math.sin(i * 1.7)] as Pt)];
  return (
    <>
      {/* the wall, the tiles, the floor */}
      <Fill s={R(1100, 1320, 0)} fill="#EAD7A8" ow={0} y={328} z={0} />
      <G z={1}>
        <Fill s={R(1100, 350, 0)} fill="#CFE5E0" ow={0} y={-155} />
        {tiles}{rows}
        <Fill s={R(1100, 24, 0)} fill="#9CB8B2" ow={5.5} y={20} z={0.2} />
      </G>
      <G z={1}>
        <Fill s={R(1100, 700, 0)} fill="#C7A06E" ow={0} y={-682} />
        {planks}
      </G>
      <Fill s={R(1100, 40, 0)} fill="#E9E0C8" ow={5.5} y={-312} z={2} />

      {/* cabinets, the calendar, the window with the sun */}
      <G z={6}>
        {[-1, 1].map((sd) => <Fill key={sd} s={R(150, 250, 14)} fill="#5FA3A8" ow={5.5} x={-400 + sd * 80} y={560} />)}
        {[-1, 1].map((sd) => <Fill key={sd} s={ell(7, 18, 10)} fill="#2B4F52" ow={4} x={-400 + sd * 80 - sd * 52} y={540} z={0.5} />)}
      </G>
      <Calendar x={-100} y={610} s={0.52} p={st.calendar ?? 3} />
      <G x={190} y={600} z={6}>
        {[-1, 1].map((sd) => <Fill key={sd} s={R(86, 110, 8)} fill="#F3D56B" ow={5.5} x={sd * 118} y={150} z={3} />)}
        <Fill s={R(330, 430, 10)} fill="#FFFFFF" ow={5.5} />
        <Fill s={R(294, 394, 0)} fill="#8ED1F7" ow={4} z={1} />
        <Fill s={ell(58, 58)} fill="#FFE27A" ow={5.5} x={-40} y={80} z={2} />
        {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <Stroke key={i} pts={[[-40 + Math.cos(a) * 80, 80 + Math.sin(a) * 80], [-40 + Math.cos(a) * 112, 80 + Math.sin(a) * 112]]} w={9} color="#FFE27A" z={2} />; })}
        <Fill s={poly("roofs", [[-147, -197], [147, -197], [147, -90], [60, -60], [-20, -110], [-147, -80]])} fill="#6FA8D8" ow={0} z={2} />
        <Fill s={R(12, 394, 0)} fill="#FFFFFF" ow={0} z={4} />
        <Fill s={R(294, 12, 0)} fill="#FFFFFF" ow={0} y={-10} z={4} />
        <Fill s={R(380, 28, 8)} fill="#FFFFFF" ow={5.5} y={-226} z={2} />
        <G x={110} y={-250} z={3}><Fill s={R(60, 56, 10)} fill="#C8423A" ow={5.5} /><Fill s={ell(34, 26)} fill="#4F9A52" ow={5.5} y={52} z={-0.2} /></G>
      </G>
      <G x={-470} y={-30} z={6}>
        <Fill s={R(110, 170, 16)} fill="#C8423A" ow={5.5} />
        <Fill s={R(70, 64, 10)} fill="#BFD9F2" ow={5.5} y={-30} z={0.5} />
      </G>

      {/* Barb and Dave at the table, chairs behind them */}
      <Chair x={330} z={22} />
      <Chair x={KDAVE.x} z={22} />
      <Dave x={KDAVE.x} y={KDAVE.y} z={40} s={KDAVE.s} belly={breathe} can={false} legs={false} tilt={0} lid={0.3} brow={0} mouth={0} tongue={false} armL={fish ? 0 : 6} armLLen={fish ? 20 : 96} held={st.held ? <PhoneBack x={0} y={74} s={1.0} glow={false} goo /> : undefined} {...st.dave} />
      <Barb x={330} y={-190} z={40} s={1} knit={g * 1.3} {...st.barb} />
      <G x={-30}><Scarf /></G>

      {/* the table, with its checked cloth */}
      <G z={70}>
        <Fill s={poly("cloth", [[-440, -330], [440, -330], [560, -560], [-560, -560]])} fill="#ffffff" map={checkTex()} mapId="check" ow={5.5} />
        <Fill s={poly("drape", drape)} fill="#ffffff" map={checkTex()} mapId="check" ow={5.5} z={1} />
      </G>
      <Mug x={-40} y={-440} z={80} steam={st.steam ?? g} />
      <BowlBack x={KBOWL[0]} y={KBOWL[1]} z={80} chips={false} />
      {phone && <PhoneBack x={phone.x} y={phone.y} s={1.1} glow={false} goo={phone.goo} z={phone.inside ? 81 : 94} />}
      <BowlFront x={KBOWL[0]} y={KBOWL[1]} z={82} bubbles={st.bubbles} />

      {/* Dave reaches into the bowl: his left arm, above the table */}
      {fish && (
        <G x={KDAVE_SHOULDER_L[0]} y={KDAVE_SHOULDER_L[1]} z={95} sx={KDAVE.s}>
          <Arm side={-1} a={fish.a} len={fish.len} sleeve="#ffffff" map={plaid()} mapId="plaid2" />
        </G>
      )}

      {/* the light: sun from the window, flat warm zones */}
      <Fill s={poly("sunA", [[10, 392], [350, 392], [600, -330], [-330, -330]])} fill={WARMSUN} ow={0} op={0.15} z={85} />
      <Fill s={poly("sunB", [[60, 392], [300, 392], [430, -330], [-120, -330]])} fill={WARMSUN} ow={0} op={0.12} z={85.1} />
    </>
  );
}
