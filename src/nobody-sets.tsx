import React from "react";
import * as THREE from "three";
import { Fill, G, Pic, Stroke, Txt, bezier, ell, paint, poly, rnd, rrect, shp, type Pt } from "./flat";
import { Denise, Gary, TonyLegs, type DeniseProps, type GaryProps } from "./nobody-cast";

// The sets of "Nobody Picks Up": Denise's bathroom (shot 1), a stranger's kitchen under the sink (shot 4) and Gary's van
// at the taco place (shot 14). Same rules as the other sets: flat polygons, black outlines, light as flat zones.
const R = rrect;
const CHROME = "#D5DCE3", CHROME_D = "#9EA9B5";

const repeating = (key: string, size: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const t = paint(key, size, size, draw);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / size, 1 / size);
  return t;
};

// ── 1. Denise's bathroom ──
const DENISE_AT = { x: -20, y: -300, s: 1.5 };
const CURTAIN_TOP = -372; // where the curtain meets her shoulders
const tiles = () =>
  paint("bath-tiles", 1100, 1980, (g) => {
    g.fillStyle = "#A8D5D1";
    g.fillRect(0, 0, 1100, 1980);
    let n = 0;
    for (let r = 0; r < 17; r++) for (let c = 0; c < 10; c++) {
      const v = rnd(n++, 3);
      g.fillStyle = v < 0.25 ? "#9FCEC9" : v < 0.5 ? "#B0DBD7" : "#A8D5D1";
      g.fillRect(c * 120 + 4, r * 120 + 4, 112, 112);
    }
    g.fillStyle = "#7FB0AB";
    for (let r = 0; r <= 17; r++) g.fillRect(0, r * 120 - 2, 1100, 5);
    for (let c = 0; c <= 10; c++) g.fillRect(c * 120 - 2, 0, 5, 1980);
  });
const dots = () =>
  repeating("curtain-dots", 220, (g) => {
    g.fillStyle = "#FFD54A";
    g.fillRect(0, 0, 220, 220);
    g.fillStyle = "#2FB6A8";
    g.beginPath(); g.arc(55, 55, 28, 0, Math.PI * 2); g.arc(165, 165, 28, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#FF7FA6";
    g.beginPath(); g.arc(165, 55, 13, 0, Math.PI * 2); g.arc(55, 165, 13, 0, Math.PI * 2); g.fill();
  });
const curtainShp = (top: number) =>
  shp(`curtain${top}`, () => {
    const pts: Pt[] = [];
    for (let px = -600; px <= 600; px += 40) pts.push([px, top + 12 * Math.sin(px / 70) - 14 * Math.exp(-(px * px) / 40000)]);
    pts.push([600, -1100], [-600, -1100]);
    return pts;
  });
const icicle = (len: number) => shp(`icicle${len}`, () => [[-15, 0], [15, 0], [5, -len * 0.7], [0, -len], [-5, -len * 0.7]]);

export function Bathroom({ frame = 0, denise }: { frame?: number; denise?: DeniseProps }) {
  const shiver = Math.sin(frame * 1.9) * 3; // the cold hit: she trembles
  return (
    <>
      <Pic tex={tiles()} w={1100} h={1980} z={0} />
      <Fill s={R(1100, 56, 0)} fill="#2F8F8C" ow={5.5} y={330} z={1} />
      {/* the shower arm out of the wall, the head, the icicles */}
      <Stroke pts={[[-570, 790], [-330, 790], [-330, 740]]} w={26} color={CHROME} ow={5.5} round={false} z={2} />
      <Fill s={ell(105, 30)} fill={CHROME} ow={5.5} x={-330} y={716} r={-8} z={3} />
      <Fill s={ell(88, 14)} fill={CHROME_D} ow={0} x={-324} y={704} r={-8} z={3.5} />
      {[-52, -26, 0, 26, 52].map((dx) => <Fill key={dx} s={ell(4, 4, 8)} fill="#000000" ow={0} x={-324 + dx} y={704 - dx * 0.14} z={3.6} />)}
      {[[-372, 70], [-318, 148], [-262, 54]].map(([ix, il]) => <Fill key={ix} s={icicle(il)} fill="#DDF3FF" ow={5} x={ix} y={700 - (ix + 372) * 0.0} z={2.8} />)}
      <Stroke pts={[[-320, 690], [-317, 600]]} w={5} color="#ffffff" round={false} z={4} />
      {[[-420, 600, 26], [-190, 640, 20], [-240, 560, 14]].map(([sx, sy, sz]) => (
        <Fill key={sx} s={poly("sparkle", [[0, 1], [0.22, 0.22], [1, 0], [0.22, -0.22], [0, -1], [-0.22, -0.22], [-1, 0], [-0.22, 0.22]])} fill="#ffffff" ow={4} x={sx} y={sy} sx={sz} z={4} />
      ))}
      <Denise {...DENISE_AT} x={DENISE_AT.x + shiver} z={10} {...denise} />
      {/* the curtain, up to her shoulders */}
      <Fill s={curtainShp(CURTAIN_TOP)} fill="#ffffff" map={dots()} mapId="curtain-dots" ow={5.5} z={40} />
      {[-440, -250, -60, 140, 330, 480].map((cx) => <Stroke key={cx} pts={[[cx, CURTAIN_TOP - 20], [cx + 14, -1000]]} w={9} color="#C99A1E" op={0.35} round={false} z={41} />)}
      {/* cold, drawn as a flat zone over the whole room */}
      <Fill s={R(1100, 1980, 0)} fill="#BFE3FF" ow={0} op={0.1} z={60} />
    </>
  );
}

// ── 4. A stranger's kitchen, the cabinet under the sink ──
const brick = () =>
  paint("kitchen-subway", 1100, 560, (g) => {
    g.fillStyle = "#F2EEE4";
    g.fillRect(0, 0, 1100, 560);
    g.fillStyle = "#CFC8B8";
    for (let r = 0; r <= 8; r++) g.fillRect(0, r * 70 - 2, 1100, 5);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 8; c++) g.fillRect(c * 150 + (r % 2) * 75 - 2, r * 70, 5, 70);
  });
const floorTiles = () =>
  paint("kitchen-floor", 1100, 640, (g) => {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      g.fillStyle = (r + c) % 2 ? "#D9C9A6" : "#EFE4CB";
      g.fillRect(c * 160, r * 160, 160, 160);
    }
  });
export const SINK_FLOOR = -360;

export function SinkKitchen({ frame = 0 }: { frame?: number }) {
  const t = frame / 30;
  const drop = (t * 1.6) % 1; // a drip from the trap, falling
  const WOOD = "#A9743F", WOOD_D = "#8E5F31";
  return (
    <>
      <Fill s={R(1100, 2000, 0)} fill="#EBDDBE" ow={0} z={0} />
      <Pic tex={brick()} w={1100} h={560} y={480} z={0.5} />
      <Fill s={R(1100, 260, 0)} fill="#7A4F2A" ow={5.5} y={860} z={1} />
      {[-300, 100, 480].map((dx) => <Stroke key={dx} pts={[[dx, 730], [dx, 960]]} w={6} color="#5C3A1E" round={false} z={1.5} />)}
      {/* the counter, the tap */}
      <Fill s={R(1100, 70, 0)} fill="#B8BDC7" ow={5.5} y={232} z={3} />
      <Stroke pts={bezier([[-60, 267], [-60, 440], [20, 470], [90, 400]], 14)} w={26} color={CHROME} ow={5.5} z={2} />
      <Fill s={R(60, 30, 8)} fill={CHROME} ow={5.5} x={-60} y={282} z={2.5} />
      {/* the cabinet: doors swung open, a dark inside, pipes */}
      <Fill s={R(720, 560, 0)} fill={WOOD} ow={5.5} x={-60} y={-80} z={4} />
      <Fill s={R(640, 480, 0)} fill="#2A2420" ow={5.5} x={-60} y={-90} z={5} />
      <Fill s={poly("doorL", [[-420, 200], [-486, 176], [-486, -334], [-420, -360]])} fill={WOOD_D} ow={5.5} z={5.5} />
      <Fill s={poly("doorR", [[300, 200], [366, 176], [366, -334], [300, -360]])} fill={WOOD_D} ow={5.5} z={5.5} />
      <Fill s={ell(9, 9, 14)} fill={CHROME} ow={4} x={-470} y={-6} z={6} />
      <Fill s={ell(9, 9, 14)} fill={CHROME} ow={4} x={350} y={-6} z={6} />
      <Stroke pts={bezier([[200, 140], [200, -80], [190, -170], [120, -190]], 16)} w={30} color="#8C95A0" ow={5.5} round={false} z={6} />
      <Stroke pts={[[120, -190], [40, -190]]} w={30} color="#8C95A0" ow={5.5} z={6} />
      <Fill s={R(46, 30, 6)} fill="#C9A24A" ow={5.5} x={200} y={-10} z={6.2} />
      <Fill s={ell(7, 10)} fill="#6FB8E0" ow={4} x={120} y={-230 - drop * 70} z={6.4} />
      <Fill s={R(720, 50, 0)} fill={WOOD} ow={5.5} x={-60} y={175} z={30} />
      {/* the floor and what is on it: the wrench, the bucket */}
      <Fill s={R(1100, 640, 0)} fill="#EFE4CB" ow={0} y={SINK_FLOOR - 320} z={2} />
      <Pic tex={floorTiles()} w={1100} h={640} y={SINK_FLOOR - 320} z={2.5} />
      <Fill s={R(1100, 14, 0)} fill="#C9B88F" ow={5.5} y={SINK_FLOOR} z={3} />
      <PipeWrench x={-350} y={-530} />
      <Bucket x={320} y={-470} />
      <TonyLegs x={-60} y={0} s={1.2} z={20} buzz={t > 0 ? t : 0.001} />
      <Fill s={poly("kitchenLight", [[-540, 960], [-200, 960], [-540, 200]])} fill="#FFF3C4" ow={0} op={0.12} z={60} />
    </>
  );
}
function PipeWrench({ x, y }: { x: number; y: number }) {
  return (
    <G x={x} y={y} r={8} z={9}>
      <Fill s={R(230, 30, 12)} fill="#C73A2F" ow={5.5} />
      <Fill s={poly("wrenchHead", [[-34, 0], [-34, 64], [10, 76], [32, 52], [32, 24], [8, 24], [8, 0]])} fill="#8C95A0" ow={5.5} x={-96} y={0} z={0.5} />
      <Fill s={poly("wrenchJaw", [[0, 0], [20, 0], [20, 34], [0, 34]])} fill="#C9CED6" ow={5.5} x={-66} y={22} z={0.8} />
    </G>
  );
}
function Bucket({ x, y }: { x: number; y: number }) {
  return (
    <G x={x} y={y} z={9}>
      <Stroke pts={bezier([[-64, 70], [-50, 150], [50, 150], [64, 70]], 14)} w={8} color="#5B6470" ow={4} round={false} z={-0.5} />
      <Fill s={poly("bucket", [[-70, 70], [70, 70], [56, -70], [-56, -70]])} fill="#E0A423" ow={5.5} />
      <Fill s={R(150, 18, 4)} fill="#C48A12" ow={4} y={70} z={0.5} />
      <Fill s={ell(52, 12)} fill="#6FB8E0" ow={0} y={64} z={0.6} />
    </G>
  );
}

// ── 14. Gary's van at the taco place, camera on the dash looking back at the driver ──
// behind him: the seat and the dark van; the taco place is out of his side window, to screen left
const sideWindow = shp("vanSideWindow", () => [[-520, 90], [-150, 90], [-150, 700], [-520, 700]]);
export function VanCab({ frame = 0, gary }: { frame?: number; gary?: GaryProps }) {
  const bob = Math.sin(frame * 0.35) * 2; // he chews while he talks
  return (
    <>
      <Fill s={R(1100, 2000, 0)} fill="#2F3440" ow={0} z={0} />
      <Fill s={R(1100, 260, 0)} fill="#4A4F5A" ow={5.5} y={830} z={1} />
      {[-90, 250, 480].map((px) => <Stroke key={px} pts={[[px, 700], [px, -300]]} w={6} color="#3A3F4A" round={false} z={1.5} />)}
      {/* the side window: sky, the taco place, its sign */}
      <Fill s={sideWindow} fill="#8FCBEF" ow={5.5} z={2} />
      <Fill s={R(370, 160, 0)} fill="#E7C98F" ow={5.5} x={-335} y={190} z={2.2} />
      <Fill s={poly("awning", [[-520, 290], [-150, 290], [-150, 250], [-170, 250], [-190, 290], [-230, 290], [-250, 250], [-290, 250], [-310, 290], [-350, 290], [-370, 250], [-410, 250], [-430, 290], [-470, 290], [-490, 250], [-520, 250]])} fill="#D22B2B" ow={5.5} z={2.4} />
      <Fill s={R(370, 40, 0)} fill="#6B7078" ow={5.5} x={-335} y={104} z={2.6} />
      <Stroke pts={[[-335, 380], [-335, 290]]} w={16} color="#5B6470" ow={5.5} round={false} z={2.7} />
      <Fill s={R(320, 140, 22)} fill="#F2C230" ow={5.5} x={-335} y={470} z={3} />
      <Fill s={R(288, 110, 14)} fill="#D22B2B" ow={0} x={-335} y={470} z={3.2} />
      <Txt text="TACOS" size={62} color="#FFE27A" stroke="#000000" strokeW={3} x={-335} y={470} z={3.5} />
      <Fill s={poly("glareA", [[-480, 700], [-400, 700], [-190, 90], [-270, 90]])} fill="#ffffff" ow={0} op={0.14} z={4} />
      {/* the seat behind him */}
      <Fill s={R(600, 760, 90)} fill="#6A5646" ow={5.5} x={-30} y={-20} z={5} />
      <Fill s={R(330, 260, 70)} fill="#5A4A3C" ow={5.5} x={-30} y={330} z={5.5} />
      <Gary x={-30} y={-340 + bob} s={1.45} z={10} {...gary} />
      {/* the dashboard in front of him, with the wrapper */}
      <G z={60}>
        <Fill s={R(1100, 700, 0)} fill="#23262E" ow={5.5} y={-650} />
        <Fill s={R(1100, 76, 0)} fill="#3A3E49" ow={0} y={-338} z={0.5} />
        {[-380, 330].map((vx) => <Fill key={vx} s={R(170, 80, 14)} fill="#15171C" ow={5.5} x={vx} y={-520} z={0.6} />)}
        {[-1, 0, 1].map((k) => [-380, 330].map((vx) => <Stroke key={`${vx}${k}`} pts={[[vx - 66, -520 + k * 22], [vx + 66, -520 + k * 22]]} w={5} color="#3A3E49" round={false} z={1} />))}
        <Fill s={poly("wrapper", [[-48, -6], [-18, 26], [18, 14], [52, 30], [64, -4], [40, -22], [58, -40], [10, -46], [-24, -34], [-56, -38]])} fill="#F2C230" ow={5.5} x={270} y={-334} z={1} />
        <Stroke pts={[[250, -318], [276, -326], [290, -344]]} w={4} color="#C48A12" round={false} z={1.5} />
        <Stroke pts={[[262, -340], [286, -352]]} w={4} color="#C48A12" round={false} z={1.5} />
      </G>
      <Fill s={poly("sunZone", [[-540, 700], [-100, 700], [-540, 100]])} fill="#FFD98A" ow={0} op={0.1} z={70} />
    </>
  );
}
