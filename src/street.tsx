import { ChadHead } from "./chars";
import { Fill, G, Stroke, Txt, ell, path, poly, rnd, rpoly, rrect, shp, type Pt } from "./flat";
import { pajamaTex } from "./props";

// The street at night, in the rain: Chad van pulls up with its headlights on. The van is drawn from the side (a vehicle
// is flat in profile); Chad sits at the wheel in his sleep mask. Rain is a few hundred cached strokes moved by the frame.
const R = rrect;
const SKY = "#182036";

// rain: the same short stroke, moved; down and to the left
export function Rain({ g, n = 110, z = 60, speed = 1400, op = 0.7, len = 56 }: { g: number; n?: number; z?: number; speed?: number; op?: number; len?: number }) {
  return (
    <G z={z}>
      {Array.from({ length: n }, (_, i) => {
        const sp = speed * (0.85 + 0.3 * rnd(i, 3));
        const y = ((((1100 - rnd(i, 2) * 2200 - g * sp) % 2200) + 2200) % 2200) - 1100;
        const x = -640 + rnd(i, 1) * 1280 + (1100 - y) * 0.25;
        return <G key={i} x={x} y={y} r={14}><Stroke pts={[[0, 0], [0, -len]]} w={4} color="#BFD8F2" op={op} /></G>;
      })}
    </G>
  );
}

function Wheel({ x, rot }: { x: number; rot: number }) {
  return (
    <G x={x} y={54} z={4}>
      <Fill s={ell(54, 54)} fill="#1C1F29" ow={5.5} />
      <Fill s={ell(28, 28, 32)} fill="#9AA3B2" ow={5.5} z={1} />
      <G r={rot} z={2}>
        {[0, 72, 144, 216, 288].map((a) => <G key={a} r={a}><Stroke pts={[[0, 0], [0, 22]]} w={6} color="#6A7384" /></G>)}
      </G>
      <Fill s={ell(7, 7, 10)} fill="#3A4150" ow={0} z={3} />
    </G>
  );
}

// the plumbing van, from the side, nose to the right; origin on the ground in the middle
const VAN_BODY = path("M -320 40 L -320 236 C -320 262 -302 270 -272 270 L 96 270 C 134 270 152 254 178 220 L 250 152 C 262 140 280 134 300 132 L 316 130 C 326 128 330 118 330 102 L 330 40 Z", 12);
export function Van({ x = 0, y = 0, z = 0, sx = 1, wheel = 0, lights = 1, brake = 0, driver = true, r = 0 }: { x?: number; y?: number; z?: number; sx?: number; wheel?: number; lights?: number; brake?: number; driver?: boolean; r?: number }) {
  return (
    <G x={x} y={y} z={z} sx={sx} r={r}>
      {lights > 0 && (
        <>
          <Fill s={poly("beamA", [[326, 112], [326, 84], [1000, -40], [1000, 250]])} fill="#FFF1B0" ow={0} op={0.2 * lights} z={-3} />
          <Fill s={poly("beamB", [[326, 106], [326, 90], [760, 20], [760, 170]])} fill="#FFF1B0" ow={0} op={0.2 * lights} z={-2.9} />
        </>
      )}
      <Wheel x={-190} rot={wheel} />
      <Wheel x={190} rot={wheel} />
      {/* roof rack with two lengths of pipe */}
      <G z={-1}>
        {[-230, -40].map((rx) => <Stroke key={rx} pts={[[rx, 266], [rx, 290]]} w={8} color="#3A4150" ow={4} round={false} />)}
        <Stroke pts={[[-280, 304], [60, 304]]} w={18} color="#C9803F" ow={5.5} round={false} />
        <Stroke pts={[[-250, 330], [30, 330]]} w={18} color="#B8713A" ow={5.5} round={false} />
      </G>
      <Fill s={VAN_BODY} fill="#EEF1F6" ow={5.5} />
      <Fill s={poly("stripe", [[-318, 56], [328, 56], [328, 100], [-318, 100]])} fill="#2E6BB8" ow={0} z={1} />
      <Txt text={"CHAD'S\nPLUMBING"} size={34} color="#2E6BB8" x={-130} y={178} z={2} font="Arial Black, Arial, sans-serif" weight={900} />
      <Stroke pts={[[96, 262], [96, 108]]} w={4} color="#98A2B2" z={1} round={false} />
      <Fill s={R(34, 12, 5)} fill="#98A2B2" ow={3.5} x={72} y={168} z={1.2} />
      {/* the cab window, and Chad at the wheel, asleep */}
      <G z={1.5}>
        <Fill s={poly("cabwin", [[112, 244], [178, 244], [232, 164], [112, 164]])} fill="#BFD9F2" ow={5.5} />
        {driver && <G x={156} y={204} sx={0.25} z={0.5}><ChadHead faceLight={false} smile={1} mouth={0.3} /></G>}
      </G>
      <Fill s={ell(15, 24, 16)} fill={lights > 0 ? "#FFF3B0" : "#C8CFD8"} ow={4} x={325} y={96} z={2} />
      <Fill s={R(14, 38, 4)} fill={brake > 0 ? "#FF3B30" : "#9E2A2A"} ow={4} x={-322} y={116} z={2} />
      {brake > 0 && <Fill s={ell(46, 46)} fill="#FF3B30" ow={0} op={0.25 * brake} x={-330} y={116} z={-1} />}
    </G>
  );
}

function House({ x, w, h, body, roof }: { x: number; w: number; h: number; body: string; roof: string }) {
  return (
    <G x={x} z={2}>
      <Fill s={poly(`roof${w},${h}`, [[-w / 2 - 24, h], [w / 2 + 24, h], [0, h + 150]])} fill={roof} ow={5.5} z={-0.2} />
      <Fill s={R(w, h, 0)} fill={body} ow={5.5} y={h / 2} />
      {[-1, 1].map((sd) => <Fill key={sd} s={R(86, 100, 6)} fill="#F2C86A" ow={5.5} x={sd * w * 0.27} y={h * 0.62} z={0.5} />)}
      {[-1, 1].map((sd) => <Stroke key={sd} pts={[[sd * w * 0.27, h * 0.62 - 46], [sd * w * 0.27, h * 0.62 + 46]]} w={5} color="#2D3A5E" z={0.7} round={false} />)}
      <Fill s={R(70, 130, 6)} fill="#3B2F4F" ow={5.5} y={65} z={0.5} />
    </G>
  );
}

export type StreetState = { g?: number; van?: { x: number; wheel: number; r: number; brake: number } };
export const STREET_VAN_STOP = -20;
export function Street({ st = {}, frame = 0 }: { st?: StreetState; frame?: number }) {
  const g = st.g ?? frame / 30;
  const van = st.van ?? { x: STREET_VAN_STOP, wheel: 0, r: 0, brake: 1 };
  return (
    <>
      <Fill s={R(1200, 1300, 0)} fill={SKY} ow={0} y={500} z={0} />
      {[[-300, 740, 380], [160, 800, 440], [-520, 840, 300]].map(([cx, cy, w], i) => <Fill key={i} s={ell(w, 60)} fill="#222C47" ow={0} x={cx} y={cy} z={0.5} />)}
      <House x={-400} w={380} h={250} body="#2D3A5E" roof="#222B48" />
      <House x={70} w={420} h={290} body="#34406A" roof="#262F52" />
      <House x={520} w={380} h={240} body="#2B3558" roof="#212A46" />
      {/* the sidewalk, the road, a lamp with its warm light */}
      <Fill s={R(1200, 130, 0)} fill="#4D566B" ow={5.5} y={-95} z={3} />
      <Fill s={R(1200, 800, 0)} fill="#262B3A" ow={0} y={-560} z={3.2} />
      {[-4, -2, 0, 2, 4].map((i) => <Fill key={i} s={R(150, 18, 4)} fill="#B7A560" ow={0} x={i * 230} y={-820} z={3.4} />)}
      {[[-290, -640, 170], [330, -560, 130], [-30, -850, 200]].map(([px, py, pw], i) => (
        <G key={i} z={3.6}>
          <Fill s={ell(pw, pw * 0.2)} fill="#34415F" ow={0} x={px} y={py} />
          <Stroke pts={[[px - pw * 0.5, py + 8], [px - pw * 0.1, py + 14], [px + pw * 0.4, py + 6]]} w={5} color="#6B7FA8" />
        </G>
      ))}
      <G x={-440} z={5}>
        <Stroke pts={[[0, -40], [0, 520]]} w={16} color="#2B2F3A" ow={5.5} round={false} />
        <Fill s={poly("lamphead", [[-50, 520], [50, 520], [34, 470], [-34, 470]])} fill="#FFE3A0" ow={5.5} y={0} z={1} />
        <Fill s={ell(190, 150)} fill="#FFC474" ow={0} op={0.08} y={440} z={-0.5} />
        <Fill s={ell(120, 96)} fill="#FFC474" ow={0} op={0.1} y={440} z={-0.4} />
        <Fill s={poly("lampcone", [[-34, 470], [34, 470], [260, -150], [-260, -150]])} fill="#FFC474" ow={0} op={0.09} z={-0.6} />
      </G>
      <Van x={van.x} y={-420} z={10} wheel={van.wheel} r={van.r} brake={van.brake} />
      <Rain g={g} />
    </>
  );
}

// a boot, from the side, nose to the right: origin under the middle of the sole. The trouser leg is pajama.
const BOOT = rpoly("boot", [[-120, 0], [200, 0], [244, 40], [232, 96], [118, 116], [84, 146], [84, 420], [-92, 420], [-112, 150], [-132, 42]], 26);
export function Boot({ x = 0, y = 0, z = 0, r = 0 }: { x?: number; y?: number; z?: number; r?: number }) {
  return (
    <G x={x} y={y} z={z} r={r}>
      <Fill s={R(176, 1600, 40)} fill="#ffffff" map={pajamaTex()} mapId="pajamas" ow={5.5} x={-4} y={1170} z={-0.5} />
      <Fill s={BOOT} fill="#F0C13A" ow={5.5} />
      <Fill s={R(380, 34, 14)} fill="#2B2F3A" ow={5.5} x={50} y={14} z={1} />
      <Fill s={R(34, 230, 14)} fill="#FFE08A" ow={0} x={46} y={290} r={-2} z={1} />
      <Fill s={R(176, 40, 10)} fill="#D9A52A" ow={5.5} x={-4} y={410} z={1} />
    </G>
  );
}
export const spikesShape = (w: number, h: number, n: number) => shp(`crownS${w},${h},${n}`, () => {
  const p: Pt[] = [];
  for (let i = 0; i <= n * 2; i++) p.push([-w / 2 + (w * i) / (n * 2), i % 2 ? h * (0.55 + 0.45 * rnd(i, 5)) : 6]);
  p.push([w / 2, -14], [-w / 2, -14]);
  return p;
});
