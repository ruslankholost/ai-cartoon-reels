import { Arm, Barb, Dave, ellPts, plaid } from "./chars";
import { Fill, G, Stroke, bezier, ell, paint, path, poly, rpoly, rrect, shp, type Pt } from "./flat";
import { Clock, Phone, PhoneBack, Z, burst, roundRect } from "./props";
import { spikesShape } from "./street";

// Dave living room at night. Dave and Barb face the camera, so the TV stands where the camera is: only its dark back
// shows, in the bottom-left corner. Its cool light falls on the left of everything; the warm lamp between the couch and
// the armchair lights the other side. Light is drawn as flat translucent zones. Perspective is drawn in.
const R = rrect;
const WALL = "#222F49", WALL_B = "#1F2B43";
const COOL = "#8EC9FF", WARM = "#FFC474";

// ── the phone lock screen: a new message ──
function phoneScreen() {
  return paint("phone-newmsg-4", 360, 640, (g) => {
    g.fillStyle = "#0B1238";
    g.fillRect(0, 0, 360, 640);
    g.fillStyle = "#FFFFFF";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "700 104px Arial, Helvetica, sans-serif";
    g.fillText("9:04", 180, 96);
    g.fillStyle = "#9FB4E8";
    g.font = "600 34px Arial, Helvetica, sans-serif";
    g.fillText("Friday", 180, 162);
    g.fillStyle = "#FFFFFF";
    roundRect(g, 12, 214, 336, 322, 30);
    g.fill();
    g.fillStyle = "#34C759";
    g.beginPath();
    g.arc(52, 262, 24, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#FFFFFF";
    roundRect(g, 38, 251, 28, 21, 7);
    g.fill();
    g.beginPath();
    g.moveTo(42, 268);
    g.lineTo(40, 281);
    g.lineTo(54, 270);
    g.fill();
    g.textAlign = "left";
    g.fillStyle = "#777777";
    g.font = "700 26px Arial, Helvetica, sans-serif";
    g.fillText("MESSAGES", 88, 262);
    g.textAlign = "right";
    g.fillText("now", 330, 262);
    g.textAlign = "left";
    g.fillStyle = "#0A0A0A";
    g.font = "800 41px Arial, Helvetica, sans-serif";
    g.fillText("New message", 28, 332);
    g.fillStyle = "#333333";
    g.font = "800 40px Arial, Helvetica, sans-serif";
    g.fillText("Linda", 28, 392);
    g.font = "600 36px Arial, Helvetica, sans-serif";
    g.fillStyle = "#555555";
    g.fillText("My basement is", 28, 442);
    g.fillText("flooding!!", 28, 486);
    g.fillStyle = "#FFFFFF";
    roundRect(g, 110, 612, 140, 8, 4);
    g.fill();
  });
}

const Chip = ({ x, y, r = 0, s = 1, z = 0 }: { x: number; y: number; r?: number; s?: number; z?: number }) => (
  <G x={x} y={y} r={r} sx={s} z={z}>
    <Fill s={rpoly("chipT", [[-34, -26], [34, -26], [0, 40]], 7)} fill="#E8B04A" ow={5.5} />
  </G>
);

const BOWL_BODY = path("M -124 0 C -118 -72 -64 -106 0 -106 C 64 -106 118 -72 124 0 Z", 12);
const lowerHalf = (rx: number, ry: number, cut = 0) => shp(`lowerhalf${rx},${ry},${cut}`, () => ellPts(rx, ry, 56).map(([px, py]) => [px, Math.min(py, cut)] as Pt));
const lowerArc = (rx: number, ry: number): Pt[] => Array.from({ length: 29 }, (_, i) => { const a = Math.PI + (i / 28) * Math.PI; return [Math.cos(a) * rx, Math.sin(a) * ry] as Pt; });
// the bowl and the dip, behind whatever sinks into it
export function BowlBack({ x, y, z = 0, chips = true }: { x: number; y: number; z?: number; chips?: boolean }) {
  return (
    <G x={x} y={y} z={z}>
      <Fill s={BOWL_BODY} fill="#4C86B0" ow={5.5} />
      <Fill s={ell(126, 32)} fill="#EDE6D2" ow={5.5} z={1} />
      <Fill s={ell(108, 25)} fill="#7FA83A" ow={5.5} y={-2} z={2} />
      {chips && (
        <>
          <Chip x={-44} y={42} r={16} s={0.95} z={4} />
          <Chip x={20} y={54} r={-9} s={1} z={3.5} />
          <Chip x={76} y={30} r={36} s={0.9} z={4.2} />
        </>
      )}
    </G>
  );
}
// the front of the bowl and of the dip, in front of it: what is between them is inside
export function BowlFront({ x, y, z = 0, bubbles = 0 }: { x: number; y: number; z?: number; bubbles?: number }) {
  return (
    <G x={x} y={y} z={z}>
      <Fill s={BOWL_BODY} fill="#4C86B0" ow={0} />
      <Fill s={lowerHalf(126, 32)} fill="#EDE6D2" ow={0} z={1} />
      <Stroke pts={lowerArc(126, 32)} w={5} z={1.1} />
      <Fill s={lowerHalf(108, 25, -2)} fill="#7FA83A" ow={0} z={2} />
      <Stroke pts={lowerArc(108, 25).map(([px, py]) => [px, py - 2] as Pt)} w={5} z={2.1} />
      {bubbles > 0 && [0, 1, 2, 3, 4].map((i) => {
        const ph = (bubbles * 1.4 - i * 0.12) / 0.55;
        if (ph <= 0 || ph >= 1) return null;
        return <Fill key={i} s={ell(1, 1, 16)} fill="#A4C95A" ow={5.5} x={-60 + i * 30 + Math.sin(i * 2) * 12} y={-12 + ph * 46} sx={9 + ph * 16 + i} z={3} />;
      })}
    </G>
  );
}

// ── furniture, front view ──
function Couch({ x, z }: { x: number; z: number }) {
  const C = "#386068", CL = "#497A85", Cb = "#3E6A74";
  return (
    <G x={x} z={z}>
      {[-1, 1].map((sd) => <Fill key={sd} s={R(34, 40, 6)} fill="#2A2128" ow={5.5} x={sd * 290} y={-338} z={-1} />)}
      <Fill s={R(560, 300, 70)} fill={Cb} ow={5.5} y={-10} />
      {[-1, 1].map((sd) => <Fill key={sd} s={R(250, 190, 44)} fill={CL} ow={5.5} x={sd * 125} y={20} z={2} />)}
      <Fill s={R(700, 150, 44)} fill={C} ow={5.5} y={-245} z={3} />
      {[-1, 1].map((sd) => <Fill key={sd} s={R(300, 100, 38)} fill={CL} ow={5.5} x={sd * 150} y={-190} z={4} />)}
      {[-1, 1].map((sd) => (
        <G key={sd} x={sd * 295} z={6}>
          <Fill s={R(110, 290, 52)} fill={C} ow={5.5} y={-150} />
          <Fill s={ell(54, 22)} fill={CL} ow={5.5} y={-2} z={1} />
        </G>
      ))}
    </G>
  );
}
function Armchair({ x, z }: { x: number; z: number }) {
  const C = "#86703F", CL = "#947B45", CD = "#6F5C33";
  return (
    <G x={x} z={z}>
      {[-1, 1].map((sd) => <Fill key={sd} s={R(30, 40, 6)} fill="#2A2128" ow={5.5} x={sd * 120} y={-338} z={-1} />)}
      <Fill s={R(290, 400, 84)} fill={C} ow={5.5} y={0} />
      <Fill s={R(200, 260, 56)} fill={CL} ow={5.5} y={44} z={2} />
      <Fill s={R(320, 130, 40)} fill={CD} ow={5.5} y={-240} z={3} />
      <Fill s={R(236, 74, 30)} fill={CL} ow={5.5} y={-190} z={4} />
      {[-1, 1].map((sd) => (
        <G key={sd} x={sd * 124} z={6}>
          <Fill s={R(66, 230, 34)} fill={CD} ow={5.5} y={-165} />
          <Fill s={ell(33, 14)} fill={CL} ow={5.5} y={-52} z={1} />
        </G>
      ))}
    </G>
  );
}

// the TV, seen from behind in the corner of the frame: a dark slab cut off by the edge, its light leaking round the top and right
function TvBack() {
  const rim: Pt[] = [...bezier([[-590, -450], [-340, -450], [-300, -452], [-292, -500]], 10), [-292, -980]];
  return (
    <G z={96}>
      <Stroke pts={rim} w={34} color="#BFE3FF" op={0.18} round={false} z={-0.5} />
      <Stroke pts={rim} w={18} color="#BFE3FF" op={0.3} round={false} z={-0.4} />
      <Fill s={R(284, 600, 38)} fill="#1A1E28" ow={5.5} x={-440} y={-760}>
        <Fill s={R(220, 500, 24)} fill="#232834" ow={0} y={-10} z={1} />
        {[0, 1, 2, 3, 4, 5].map((i) => <Fill key={i} s={R(140, 11, 5)} fill="#12151C" ow={0} x={-6} y={168 - i * 30} z={2} />)}
        <Fill s={R(74, 50, 8)} fill="#12151C" ow={0} x={44} y={-52} z={2} />
        <Stroke pts={bezier([[44, -80], [40, -160], [-10, -230], [-80, -300]], 14)} w={12} color="#12151C" z={2} />
      </Fill>
    </G>
  );
}

// the endless scarf: from the needles of Barb, over the chair, across the floor and out of the frame
export function Scarf({ z = 45 }: { z?: number }) {
  const P: Pt[] = [
    ...bezier([[360, -150], [364, -250], [360, -300], [358, -360]], 14),
    ...bezier([[358, -360], [356, -440], [446, -470], [430, -550]], 14).slice(1),
    ...bezier([[430, -550], [414, -630], [300, -626], [238, -700]], 14).slice(1),
    ...bezier([[238, -700], [190, -752], [120, -800], [96, -900]], 14).slice(1),
  ];
  const cum: number[] = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const stripes: { a: Pt; b: Pt; c: string }[] = [];
  const cols = ["#9E3B3A", "#3A6F76"];
  for (let s = 40, k = 0; s < cum[cum.length - 1] - 10; s += 44, k++) {
    let i = 1;
    while (cum[i] < s) i++;
    const u = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
    const p: Pt = [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u];
    let dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    stripes.push({ a: [p[0] - dy * 27, p[1] + dx * 27], b: [p[0] + dy * 27, p[1] - dx * 27], c: cols[k % 2] });
  }
  return (
    <G z={z}>
      <Stroke pts={P} w={54} color="#DDD3BC" ow={5.5} round={false} />
      {stripes.map((s, i) => <Stroke key={i} pts={[s.a, s.b]} w={18} color={s.c} round={false} z={0.2} />)}
    </G>
  );
}

function Window() {
  return (
    <G x={290} y={650} z={8}>
      {[-1, 1].map((sd) => (
        <G key={sd} x={sd * 178} z={4}>
          <Fill s={rpoly(`drape${sd}`, [[-36, 250], [36, 250], [46, -220], [-46, -220]], 14)} fill="#55435F" ow={5.5} />
          <Stroke pts={[[-10, 232], [-6 * sd, -200]]} w={5} color="#46364F" z={1} />
          <Stroke pts={[[12, 232], [14 * sd, -200]]} w={5} color="#46364F" z={1} />
        </G>
      ))}
      <Fill s={R(290, 440, 10)} fill="#B8C4D9" ow={5.5} />
      <Fill s={R(254, 404, 0)} fill="#141C33" ow={4} z={1} />
      <Fill s={ell(42, 42)} fill="#EFE3B3" ow={5.5} x={50} y={110} z={2} />
      {[[-70, 140], [-30, 40], [-80, -50], [20, -80], [80, -20]].map(([sx, sy], i) => <Fill key={i} s={ell(5, 5, 10)} fill="#EFE3B3" ow={0} x={sx} y={sy} z={3} />)}
      <Fill s={R(12, 404, 0)} fill="#B8C4D9" ow={0} z={4} />
      <Fill s={R(254, 12, 0)} fill="#B8C4D9" ow={0} y={-10} z={4} />
      <Fill s={R(330, 28, 8)} fill="#B8C4D9" ow={5.5} y={-236} z={2} />
    </G>
  );
}

// the warm floor lamp between the couch and the armchair
function Lamp() {
  return (
    <G x={130} z={14}>
      <Fill s={ell(150, 100)} fill={WARM} ow={0} op={0.07} y={300} z={-0.6} />
      <Fill s={ell(100, 66)} fill={WARM} ow={0} op={0.09} y={300} z={-0.5} />
      <Stroke pts={[[0, -332], [0, 280]]} w={14} color="#2B2F3A" ow={5.5} round={false} />
      <Fill s={ell(48, 14)} fill="#2B2F3A" ow={5.5} y={-334} />
      <Fill s={poly("lampshade", [[-35, 110], [35, 110], [66, 0], [-66, 0]])} fill="#D6A04A" ow={5.5} y={275} z={1} />
      <Fill s={ell(66, 13)} fill="#FFE3A0" ow={5.5} y={275} z={2} />
    </G>
  );
}

export type LivingState = {
  g?: number;
  daveMouth?: number; daveLid?: number; daveTilt?: number; daveBrow?: number; daveLook?: Pt;
  barbMouth?: number; barbLid?: number; barbLook?: Pt;
  phone?: { x: number; y: number; r: number; buzz?: number; z?: number; flip?: number; scale?: number } | null;
  reach?: { a: number; len: number } | null; // the right arm of Dave reaching for the phone, drawn above the table
  bubbles?: number;
  splash?: number; // 0..1: the dip splashes up where the phone went in
  zs?: boolean;
};
export const DAVE_AT = { x: -250, y: -190, s: 1.2 };
export const DAVE_SHOULDER_R: Pt = [DAVE_AT.x + 106 * DAVE_AT.s, DAVE_AT.y + 150 * DAVE_AT.s];
export const PHONE_REST = { x: 60, y: -389, r: -6 };
export const BOWL_AT: Pt = [-165, -376];

export function LivingRoom({ frame = 0, st = {} }: { frame?: number; st?: LivingState }) {
  const g = st.g ?? frame / 30;
  const breathe = 0.5 + 0.5 * Math.sin(g * 2.2);
  const phone = st.phone === undefined ? { ...PHONE_REST, buzz: 1 } : st.phone;
  const planks = Array.from({ length: 19 }, (_, i) => {
    const bx = (i - 9) * 130;
    const f = 1000 / 1660;
    return <Stroke key={i} pts={[[f * bx, -332], [bx, -960]]} w={4} color="#372824" round={false} />;
  });
  const buzz = phone?.buzz ?? 0;
  const jx = buzz ? Math.sin(g * 95) * 3.2 * buzz : 0, jr = buzz ? Math.sin(g * 83) * 2.2 * buzz : 0;
  const px = phone ? phone.x + jx : 0, py = phone ? phone.y : 0;
  const flip = phone?.flip ?? 0;
  const sc = phone?.scale ?? 1;
  return (
    <>
      {/* wall and floor */}
      <Fill s={R(1100, 1320, 0)} fill={WALL} ow={0} y={328} z={0} />
      {[-4, -2, 0, 2, 4].map((i) => <Fill key={i} s={R(90, 1320, 0)} fill={WALL_B} ow={0} x={i * 90 + 45} y={328} z={0.2} />)}
      <G z={1}>
        <Fill s={R(1100, 700, 0)} fill="#45332F" ow={0} y={-682} />
        {planks}
      </G>
      <Fill s={R(1100, 40, 0)} fill="#33415E" ow={5.5} y={-312} z={2} />

      {/* the wall: a clock at 9:04, the window with the moon, the warm lamp */}
      <Clock x={-330} y={690} r={82} h={9} m={3.7} />
      <Window />
      <Lamp />

      {/* floor: the rug under the coffee table */}
      <G z={4}>
        <Fill s={ell(560, 214)} fill="#5A4150" ow={5.5} x={-120} y={-560} />
        <Stroke pts={ellPts(500, 168, 60)} closed w={10} color="#85705F" x={-120} y={-560} z={1} />
      </G>
      <Fill s={ell(350, 22)} fill="#000" ow={0} op={0.28} x={-250} y={-340} z={6} />
      <Fill s={ell(190, 18)} fill="#000" ow={0} op={0.28} x={310} y={-340} z={6} />

      {/* the couch with Dave, asleep, a can on his belly */}
      <Couch x={-250} z={20} />
      <Dave x={DAVE_AT.x} y={DAVE_AT.y} z={40} s={DAVE_AT.s} belly={breathe} mouth={st.daveMouth ?? 0.1 + 0.45 * breathe} lid={st.daveLid ?? 1} tilt={st.daveTilt ?? 7} brow={st.daveBrow ?? 0.2} look={st.daveLook} armR={st.reach ? 0 : 22} armRLen={st.reach ? 20 : 96} />

      {/* the armchair with Barb, knitting the endless scarf */}
      <Armchair x={310} z={20} />
      <Barb x={310} y={-190} z={40} s={1} mouth={st.barbMouth ?? 0} lid={st.barbLid ?? 0.42} look={st.barbLook} knit={g * 1.3} />
      <G x={-50}><Scarf /></G>

      {/* coffee table, in front of the couch */}
      <G z={70}>
        {[-1, 1].map((sd) => <Fill key={sd} s={R(40, 120, 8)} fill="#5E4129" ow={5.5} x={-120 + sd * 250} y={-650} z={-1} />)}
        <Fill s={R(580, 40, 6)} fill="#6B4A2E" ow={5.5} x={-120} y={-580} />
        <Fill s={poly("tabletop2", [[-330, -340], [110, -340], [170, -560], [-410, -560]])} fill="#86603A" ow={5.5} z={1} />
      </G>
      <BowlBack x={BOWL_AT[0]} y={BOWL_AT[1]} z={80} />
      {/* the phone: lit, buzzing; or sunk in the dip, face down */}
      {phone && (
        <>
          {flip < 0.5 && <Fill s={burst(230, 150)} fill="#DCEBFF" ow={0} op={0.9} x={px} y={py - 3} z={78} sx={sc} />}
          {buzz > 0 && [-1, 1].map((sd) => [0, 1].map((k) => (
            <Stroke key={`${sd}${k}`} pts={Array.from({ length: 9 }, (_, i) => { const a = (i / 8 - 0.5) * 1.1; return [Math.cos(a) * (112 + k * 30) * sd, Math.sin(a) * (112 + k * 30)] as Pt; })} w={7} color="#10131C" x={px} y={py} z={91} />
          )))}
          {flip < 0.5
            ? <Phone x={px} y={py} r={phone.r + jr} w={150 * sc} tex={phoneScreen()} z={phone.z ?? 90} />
            : <PhoneBack x={px} y={py} s={1.29 * sc} glow={false} z={phone.z ?? 90} />}
        </>
      )}
      <BowlFront x={BOWL_AT[0]} y={BOWL_AT[1]} z={82} bubbles={st.bubbles} />
      {(st.splash ?? 0) > 0 && (st.splash ?? 0) < 1 && (
        <G x={BOWL_AT[0]} y={BOWL_AT[1] - 6} z={83}>
          <Fill s={spikesShape(230, 120, 5)} fill="#8DB84A" ow={5.5} sx={Math.sin((st.splash ?? 0) * Math.PI) * 1.1} sy={Math.sin((st.splash ?? 0) * Math.PI) * 1.1} />
          {Array.from({ length: 7 }, (_, i) => {
            const p = st.splash ?? 0, v = 480 + i * 70, dy = v * p * 0.5 - 900 * p * p * 0.5;
            return dy > 0 ? <Fill key={i} s={ell(1, 1.2, 14)} fill="#8DB84A" ow={5.5} x={(i - 3) * 38} y={dy + 20} sx={9 + (i % 3) * 3} z={0.5} /> : null;
          })}
        </G>
      )}

      {/* the long arm of Dave, flopped onto the table (above the table, so it is drawn here, not on Dave) */}
      {st.reach && (
        <G x={DAVE_SHOULDER_R[0]} y={DAVE_SHOULDER_R[1]} z={95} sx={DAVE_AT.s}>
          <Arm side={1} a={st.reach.a} len={st.reach.len} sleeve="#ffffff" map={plaid()} mapId="plaid2" />
        </G>
      )}

      {/* the light: cool from the TV in the corner, warm from the lamp; flat zones laid over everything */}
      <Fill s={poly("tvzoneA", [[-640, -1000], [152, -1000], [-568, 1000], [-640, 1000]])} fill={COOL} ow={0} op={0.11} z={85} />
      <Fill s={poly("tvzoneB", [[-640, -1000], [2, -1000], [-718, 1000], [-740, 1000]])} fill={COOL} ow={0} op={0.08} z={85.1} />
      <Fill s={poly("lampzoneA", [[59, 272], [201, 272], [395, -420], [-135, -420]])} fill={WARM} ow={0} op={0.13} z={85.2} />
      <Fill s={poly("lampzoneB", [[87, 272], [173, 272], [285, -420], [-25, -420]])} fill={WARM} ow={0} op={0.11} z={85.3} />

      {/* sleeping Zs */}
      {(st.zs ?? true) && (
        <>
          <Z x={-96} y={345 + Math.sin(g * 2) * 4} size={44} r={-10} fill="#DCEBFF" />
          <Z x={-44} y={430 + Math.sin(g * 2 + 1) * 5} size={60} r={-14} fill="#DCEBFF" />
          <Z x={22} y={530 + Math.sin(g * 2 + 2) * 6} size={82} r={-18} fill="#DCEBFF" />
        </>
      )}

      {/* the TV, from behind, in the corner of the frame */}
      <TvBack />
    </>
  );
}
