import * as THREE from "three";
import { ChadHead, SKIN } from "./chars";
import { Fill, G, Stroke, Txt, bezier, ell, paint, path, poly, rpoly, rrect, type Pt } from "./flat";
import { Colon, Digit, Phone, Z, burst, pajamaTex as pajamas, roundRect } from "./props";

// Chad's bedroom, Friday 9:05 PM. He sleeps on his side facing us, head on the pillow, hugging a plunger like a teddy bear.
// The nightstand is at his head: the phone glows (its light is on his face), the alarm clock reads 9:05. Moonlight comes in
// through the window. Perspective is drawn in; light is flat zones.
const R = rrect;
const WALL = "#2B2A4A", WALL_B = "#272646";
const COOL = "#BFE3FF";

let BL: THREE.CanvasTexture | null = null;
const blanket = () => {
  if (!BL) {
    BL = paint("blanket", 128, 128, (g) => {
      g.fillStyle = "#40679E";
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#37609A";
      g.fillRect(0, 56, 128, 56);
      g.fillStyle = "#E3E0EE";
      g.fillRect(0, 50, 128, 6);
      g.fillRect(0, 112, 128, 6);
    });
    BL.wrapS = BL.wrapT = THREE.RepeatWrapping;
    BL.repeat.set(1 / 128, 1 / 128);
  }
  return BL;
};

// the phone's screen: the assistant's smiley, and a new message from Linda
function phoneScreen() {
  return paint("phone-chad-3", 360, 640, (g) => {
    g.fillStyle = "#0F1B3D";
    g.fillRect(0, 0, 360, 640);
    g.fillStyle = "#FFFFFF";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "700 70px Arial, Helvetica, sans-serif";
    g.fillText("9:05", 180, 80);
    g.fillStyle = "#FFD43B";
    g.beginPath();
    g.arc(180, 285, 122, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1A1A1A";
    g.beginPath();
    g.ellipse(138, 250, 15, 24, 0, 0, Math.PI * 2);
    g.ellipse(222, 250, 15, 24, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#1A1A1A";
    g.lineWidth = 15;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(112, 318);
    g.quadraticCurveTo(180, 388, 248, 318);
    g.stroke();
    g.fillStyle = "#FFFFFF";
    roundRect(g, 18, 466, 324, 112, 50);
    g.fill();
    g.fillStyle = "#0A0A0A";
    g.font = "800 38px Arial, Helvetica, sans-serif";
    g.fillText("New message", 180, 504);
    g.fillStyle = "#555555";
    g.font = "700 30px Arial, Helvetica, sans-serif";
    g.fillText("· Linda ·", 180, 546);
    g.fillStyle = "#FFFFFF";
    roundRect(g, 110, 612, 140, 8, 4);
    g.fill();
  });
}

// the plunger: a red rubber cup (open side up, under his chin) and a wooden handle
function Plunger({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <G x={x} y={y} r={r}>
      <Fill s={R(24, 150, 10)} fill="#C99A5B" ow={5.5} y={-72} />
      <Fill s={path("M -20 0 C -30 30 -66 40 -72 78 L 72 78 C 66 40 30 30 20 0 Z", 12)} fill="#C23B35" ow={5.5} z={1} />
      <Fill s={ell(72, 15)} fill="#A02B27" ow={5.5} y={78} z={2} />
      <Fill s={ell(58, 9)} fill="#7A1F1D" ow={0} y={80} z={2.5} />
    </G>
  );
}
// a pajama sleeve from a to b
function Limb({ a, b, w = 54, z = 0 }: { a: Pt; b: Pt; w?: number; z?: number }) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return <Fill s={R(L + w * 0.7, w, w / 2)} fill="#ffffff" map={pajamas()} mapId="pajamas" ow={5.5} x={(a[0] + b[0]) / 2} y={(a[1] + b[1]) / 2} r={ang} z={z} />;
}
function Mitt({ x, y, z, thumb = 1 }: { x: number; y: number; z: number; thumb?: 1 | -1 }) {
  return (
    <G x={x} y={y} z={z}>
      <Fill s={ell(13, 18)} fill={SKIN} ow={5} x={thumb * 26} y={8} r={thumb * -28} z={-0.6} />
      <Fill s={ell(30, 30)} fill={SKIN} ow={5.5} />
    </G>
  );
}

function Window() {
  return (
    <G x={290} y={600} z={8}>
      {[-1, 1].map((sd) => (
        <G key={sd} x={sd * 176} z={4}>
          <Fill s={rpoly(`bdrape${sd}`, [[-34, 230], [34, 230], [44, -210], [-44, -210]], 14)} fill="#3C666A" ow={5.5} />
          <Stroke pts={[[-10, 212], [-6 * sd, -190]]} w={5} color="#315558" z={1} />
          <Stroke pts={[[12, 212], [14 * sd, -190]]} w={5} color="#315558" z={1} />
        </G>
      ))}
      <Fill s={R(280, 400, 10)} fill="#B8C4D9" ow={5.5} />
      <Fill s={R(244, 364, 0)} fill="#141C33" ow={4} z={1} />
      <Fill s={ell(38, 38)} fill="#EFE3B3" ow={5.5} x={-48} y={96} z={2} />
      {[[40, 130], [70, 40], [-60, -30], [30, -80], [-20, 40]].map(([sx, sy], i) => <Fill key={i} s={ell(5, 5, 10)} fill="#EFE3B3" ow={0} x={sx} y={sy} z={3} />)}
      <Fill s={R(12, 364, 0)} fill="#B8C4D9" ow={0} z={4} />
      <Fill s={R(244, 12, 0)} fill="#B8C4D9" ow={0} y={-8} z={4} />
      <Fill s={R(318, 26, 8)} fill="#B8C4D9" ow={5.5} y={-212} z={2} />
    </G>
  );
}

// Chad's certificate on the wall
function Certificate() {
  return (
    <G x={-330} y={450} z={8}>
      <Fill s={R(214, 156, 8)} fill="#C9A044" ow={5.5} />
      <Fill s={R(180, 122, 2)} fill="#EFE6D2" ow={4} z={1} />
      <Txt text="BEST" size={36} color="#243066" y={26} z={2} />
      <Txt text="PLUMBER IN TOWN" size={13} color="#243066" y={-12} z={2} />
      <Fill s={ell(15, 15)} fill="#C23B35" ow={4} x={0} y={-42} z={2} />
    </G>
  );
}

export type BedroomState = { g?: number; smile?: number; mouth?: number; buzz?: number; zs?: boolean };
export function Bedroom({ frame = 0, st = {} }: { frame?: number; st?: BedroomState }) {
  const g = st.g ?? frame / 30;
  const buzz = st.buzz ?? 0;
  const DY = -150; // the floor line, the bed and everything on it sit lower, so Chad is in the middle of the frame
  const planks = Array.from({ length: 19 }, (_, i) => {
    const bx = (i - 9) * 130;
    const f = (700 - (-332 + DY)) / 1660;
    return <Stroke key={i} pts={[[f * bx, -332 + DY], [bx, -960]]} w={4} color="#2F272D" round={false} />;
  });
  const sleepZ = 0.5 + 0.5 * Math.sin(g * 2);
  return (
    <>
      {/* wall and floor */}
      <Fill s={R(1100, 1320, 0)} fill={WALL} ow={0} y={328} z={0} />
      {[-4, -2, 0, 2, 4].map((i) => <Fill key={i} s={R(90, 1320, 0)} fill={WALL_B} ow={0} x={i * 90 + 45} y={328} z={0.2} />)}
      <G z={1}>
        <Fill s={R(1100, 700, 0)} fill="#3B3238" ow={0} y={-682 + DY / 2 - 0} />
        {planks}
      </G>
      <Fill s={R(1100, 40, 0)} fill="#3A3A66" ow={5.5} y={-312 + DY} z={2} />
      <G y={-60}>
        <Window />
        <Certificate />
      </G>

      <G y={DY}>
        {/* the bed, from the side: headboard, base, mattress, blanket, pillow */}
        <Fill s={ell(520, 22)} fill="#000" ow={0} op={0.28} x={160} y={-350} z={6} />
        <G z={20}>
          {[-170, 440].map((lx) => <Fill key={lx} s={R(36, 64, 6)} fill="#4A3523" ow={5.5} x={lx} y={-350} z={-1} />)}
          <Fill s={R(54, 640, 22)} fill="#2F3A66" ow={5.5} x={-165} y={30} z={-0.5} />
          <Fill s={R(900, 70, 14)} fill="#6A4A2E" ow={5.5} x={140} y={-300} />
          <Fill s={R(780, 150, 36)} fill="#E4E1EE" ow={5.5} x={190} y={-160} z={1} />
          <Fill s={poly("blanket2", [[-200, -195], [-200, 40], ...bezier([[-200, 40], [-150, 52], [-60, 66], [20, 76]], 10).slice(1), ...bezier([[20, 76], [140, 90], [250, 60], [350, -10]], 12).slice(1), ...bezier([[350, -10], [420, -55], [500, -50], [580, -50]], 12).slice(1), [580, -195]])} fill="#ffffff" map={blanket()} mapId="blanket" ow={5.5} z={2} />
        </G>

        {/* the nightstand: the clock (9:05) and the phone, both lit */}
        <G z={22}>
          <Fill s={R(445, 300, 10)} fill="#7A5636" ow={5.5} x={-417} y={-180} />
          <Fill s={R(330, 90, 8)} fill="#6A4A2E" ow={5.5} x={-417} y={-96} z={1} />
          <Fill s={ell(12, 12, 14)} fill="#C9A044" ow={4} x={-417} y={-96} z={2} />
          <Fill s={R(466, 26, 6)} fill="#8A6340" ow={5.5} x={-417} y={-24} z={1} />
        </G>
        <Fill s={burst(150, 110, 12, 0.62)} fill="#FF8A5C" ow={0} op={0.35} x={-410} y={42} z={55} />
        <Fill s={burst(160, 128, 12, 0.7)} fill="#CFE6FF" ow={0} op={0.8} x={-262} y={96} z={56} />
        <G x={-410} y={41} z={60}>
          <Fill s={R(160, 106, 20)} fill="#252831" ow={5.5} />
          <Fill s={R(136, 78, 12)} fill="#0D0E13" ow={0} z={1} />
          <G z={2} sx={0.68}>
            <Digit ch="9" x={-58} />
            <Colon x={-28} />
            <Digit ch="0" x={4} />
            <Digit ch="5" x={48} />
          </G>
          <Fill s={R(28, 14, 4)} fill="#252831" ow={5.5} x={-48} y={-58} z={-1} />
          <Fill s={R(28, 14, 4)} fill="#252831" ow={5.5} x={48} y={-58} z={-1} />
        </G>
        <Phone x={-262 + (buzz ? Math.sin(g * 95) * 3 * buzz : 0)} y={96} r={7 + (buzz ? Math.sin(g * 83) * 2 * buzz : 0)} w={124} tex={phoneScreen()} z={64} />

        {/* Chad: head on the pillow, pajamas, a plunger in his arms */}
        <G z={30}>
          <Fill s={R(312, 132, 58)} fill="#F4F2F8" ow={5.5} x={-30} y={34} />
        </G>
        <G z={36}>
          {[-100, 122].map((bx) => <Fill key={bx} s={ell(74, 40)} fill="#ffffff" map={pajamas()} mapId="pajamas" ow={5.5} x={bx} y={62} />)}
          <Fill s={poly("pjcollar", [[-44, 108], [64, 108], [10, 36]])} fill="#EEF3FA" ow={5.5} z={1} />
        </G>
        <G x={10} y={176} z={40}>
          <ChadHead tilt={-4} smile={st.smile ?? 1} mouth={st.mouth ?? 0.4} />
        </G>
        <Limb a={[-96, 54]} b={[10, -62]} z={42} />
        <Limb a={[118, 54]} b={[92, -62]} z={42.5} />
        <G z={44}><Plunger x={50} y={-18} r={8} /></G>
        <G z={50}>
          <Mitt x={10} y={-62} z={0} thumb={-1} />
          <Mitt x={92} y={-62} z={0.2} thumb={1} />
        </G>
      </G>
      {(st.zs ?? true) && <G z={52}>
        <Z x={-100} y={380} size={44 + sleepZ * 3} r={-10} fill="#DCEBFF" />
        <Z x={-52} y={456} size={60} r={-14} fill="#DCEBFF" />
        <Z x={4} y={546} size={82} r={-18} fill="#DCEBFF" />
      </G>}

      {/* the light: moonlight from the window across the bed, flat zones over everything */}
      <Fill s={poly("moonA", [[150, 332], [420, 332], [190, -480], [-310, -480]])} fill={COOL} ow={0} op={0.09} z={85} />
      <Fill s={poly("moonB", [[200, 332], [370, 332], [250, -480], [-100, -480]])} fill={COOL} ow={0} op={0.07} z={85.1} />
    </>
  );
}
