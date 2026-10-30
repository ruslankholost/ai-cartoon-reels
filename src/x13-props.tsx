import React from "react";
import { Inked, Picture, Poly, ellipsePts, ribbon, roundRect, xf, type Pt } from "./sp-puppet";
import { Group } from "./pen-stage";
import { hash, steamSprites, type Sprite, type SteamCfg } from "./sp-fx";
import { InkPlane, MARKER_FONT, drawSign } from "./x10-ui";
import { rr, text, type G } from "./pen-ui";
import { Cloud } from "./x08-fx";
import { PRICES, displayScale, priceAt, steamLevel } from "./x13-sched";
import { PX, PY, drawDisplayScreen } from "./x13-draw";
import { RG13 } from "./x13-stage";

// The props of x13 "Cheaper" drawn on the painted pictures (src/x13-scenes.tsx places them): the register's customer display with its digits, Chuck's phone with his profile, the shop sign with the marker strike and CHUCK'S, the coins and bills that fly
// out of the till drawer, the steam out of Ross's ear holes. Everything is a function of the frame.
const W = 1080, H = 1920;
const INK = "#1c1008";

// ═════════════════════════════════════════════════════ the customer display: the painted one (a monitor on a stand, a dark-green screen) with the digits of src/x13-draw.tsx on its screen; `w` its width in frame px, (x, y) the middle of the picture in frame px;
// it bounces on every KA-CHING (src/x13-sched.ts displayScale) and flashes its digits for a moment. `bounce` off draws it still (the inserts)
export function DisplayProp({ f, x, y, w, order, bounce = true, rot = 0, ready = true }: { f: number; x: number; y: number; w: number; order: number; bounce?: boolean; rot?: number; ready?: boolean }) {
  const D = RG13.props.display, [sx0, sy0, sx1, sy1] = D.screen, { i, age } = priceAt(f);
  if (i < 0) return null;
  const k = (w / D.w) * (bounce ? displayScale(f) : 1), sw = sx1 - sx0 - 4, sh = sy1 - sy0 - 4;
  return (
    <Group x={PX(x)} y={PY(y)} rot={rot} sx={k} sy={k}>
      <Picture file={D.file} w={D.w} h={D.h} x={0} y={0} order={order} alpha />
      <InkPlane x={(sx0 + sx1) / 2 - D.w / 2} y={D.h / 2 - (sy0 + sy1) / 2} w={sw} h={sh} cw={sw} ch={sh} order={order + 1} state={{ w: sw, h: sh, text: PRICES[i], flash: age < 0.1 ? 1 : 0 }} draw={drawDisplayScreen} ready={ready} k={1} />
    </Group>
  );
}
/** the display's height in frame px for a width */
export const displayH = (w: number) => (w * RG13.props.display.h) / RG13.props.display.w;

// ═════════════════════════════════════════════════════ Chuck's phone: his profile, 40 followers (560 x 1150 design units: a black phone with its screen, an avatar, the three counts with the followers' one big)
export const PHONE = { w: 560, h: 1150 };
function avatar(g: G, cx: number, cy: number, r: number) {
  g.save();
  g.fillStyle = "#fedd9a"; g.strokeStyle = "#1c1008"; g.lineWidth = 5;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = "#9a9a9e";
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.98, cy + r * 0.1, r * 0.13, r * 0.28, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#fff";
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.28, cy - r * 0.06, r * 0.26, r * 0.3, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.fillStyle = "#111";
  for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * r * 0.2, cy - r * 0.03, r * 0.06, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#14141a"; g.beginPath(); g.roundRect(cx - r * 0.62, cy - r * 1.02, r * 1.24, r * 0.34, r * 0.1); g.fill();
  g.strokeStyle = "#1c1008"; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy + r * 0.38, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.restore();
}
export function drawPhone(g: G) {
  g.save();
  rr(g, 0, 0, PHONE.w, PHONE.h, 64); g.fillStyle = "#121216"; g.fill();
  rr(g, 20, 20, PHONE.w - 40, PHONE.h - 40, 46); g.fillStyle = "#ffffff"; g.fill();
  text(g, "9:41", 74, 70, 26, "#111", { weight: 900, align: "left" });
  g.fillStyle = "#111"; g.beginPath(); g.roundRect(440, 50, 56, 24, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.roundRect(444, 54, 40, 16, 4); g.fill();
  text(g, "chuck_says", PHONE.w / 2, 140, 40, "#111", { weight: 900 });
  g.strokeStyle = "#111"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(66, 120); g.lineTo(46, 138); g.lineTo(66, 156); g.stroke();
  avatar(g, 118, 280, 84);
  // the counts: posts, followers (the big one, in a pale yellow box), following
  g.fillStyle = "#fff3b0"; g.beginPath(); g.roundRect(266, 206, 150, 150, 22); g.fill();
  text(g, "12", 228, 300, 40, "#555", { weight: 900 }); text(g, "posts", 228, 332, 22, "#777", { weight: 700 });
  text(g, "40", 342, 306, 84, "#c8202b", { weight: 900 }); text(g, "followers", 342, 344, 25, "#111", { weight: 900 });
  text(g, "208", 482, 300, 40, "#555", { weight: 900 }); text(g, "following", 482, 332, 22, "#777", { weight: 700 });
  text(g, "Chuck", 124, 420, 36, "#111", { weight: 900 });
  text(g, "Opinions on everything.", 284, 462, 26, "#555", { weight: 700 });
  g.fillStyle = "#2f7bf6"; g.beginPath(); g.roundRect(40, 506, 350, 64, 14); g.fill(); text(g, "Follow", 215, 550, 30, "#fff", { weight: 900 });
  g.fillStyle = "#e9ebf0"; g.beginPath(); g.roundRect(404, 506, 116, 64, 14); g.fill(); g.fillStyle = "#555"; g.beginPath(); g.roundRect(440, 528, 44, 22, 5); g.fill();
  const cols = ["#f4c9a0", "#cfe3f5", "#d9efc9", "#f5d6e6", "#ffe9a8", "#d8d2f2", "#c7ecec", "#f7ccc3", "#e3e3e8"];
  for (let i = 0; i < 9; i++) { const x = 40 + (i % 3) * 160, y = 606 + Math.floor(i / 3) * 160; g.fillStyle = cols[i]; g.beginPath(); g.roundRect(x, y, 152, 152, 8); g.fill(); g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(x + 76, y + 76, 30, 0, 7); g.fill(); }
  g.fillStyle = "#d7d9de"; g.fillRect(20, 1052, PHONE.w - 40, 3);
  for (let i = 0; i < 5; i++) { g.fillStyle = i === 4 ? "#111" : "#b4b7be"; g.beginPath(); g.arc(70 + i * 105, 1096, 14, 0, 7); g.fill(); }
  g.restore();
}
/** the phone big in the frame: its middle at frame (x, y), `w` wide, turned `rot` degrees */
export function PhoneBig({ x, y, w, rot = 0, order, ready = true }: { x: number; y: number; w: number; rot?: number; order: number; ready?: boolean }) {
  void ready;
  return <InkPlane x={PX(x)} y={PY(y)} w={w} h={(w * PHONE.h) / PHONE.w} cw={PHONE.w} ch={PHONE.h} rot={rot} order={order} state={{}} draw={drawPhone} />;
}

// ═════════════════════════════════════════════════════ the shop's sign with the marker: ROSS'S COFFEE on the board, a red strike through ROSS'S, CHUCK'S scrawled above it. A canvas of plate px (680 x 300: the board is at (23, 136) in it, as in
// src/x10-ui.tsx drawSign), laid over the plate; `strike` and `scrawl` 0..1 how far each has been drawn
export const SIGNX = { w: 680, h: 300, bx: 23, by: 136, x0: 40, y0: 170 };
export function drawSignX(g: G, s: { strike: number; scrawl: number }) {
  g.save();
  g.translate(SIGNX.bx, SIGNX.by); drawSign(g); g.restore();
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  // the strike: two passes through ROSS'S (the left half of the board's text), the red of the marker
  g.font = `400 88px ${MARKER_FONT}`;
  const full = g.measureText("ROSS'S COFFEE").width, ross = g.measureText("ROSS'S").width, a = SIGNX.bx + (640 - full) / 2, b = a + ross;
  const pts: [number, number][] = [[a - 14, SIGNX.by + 84], [b + 14, SIGNX.by + 58], [b + 6, SIGNX.by + 70], [a - 8, SIGNX.by + 96], [a - 2, SIGNX.by + 104], [b + 12, SIGNX.by + 82]];
  const segs = pts.length - 1, up = Math.min(1, s.strike) * segs;
  g.strokeStyle = "#d0151f"; g.lineWidth = 19;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < segs; i++) { const u = Math.max(0, Math.min(1, up - i)); if (u <= 0) break; g.lineTo(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u); }
  g.stroke();
  // CHUCK'S: big cream paint-marker capitals with a dark outline, on a slant over the board, revealed from the left
  if (s.scrawl > 0) {
    g.save();
    g.translate(SIGNX.w / 2 - 4, 112); g.rotate(-0.07);
    g.font = `400 132px ${MARKER_FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic";
    const tw = g.measureText("CHUCK'S").width;
    g.beginPath(); g.rect(-tw / 2 - 20, -150, (tw + 40) * Math.min(1, s.scrawl), 200); g.clip();
    g.lineWidth = 14; g.strokeStyle = "#2a1408"; g.strokeText("CHUCK'S", 0, 0);
    g.fillStyle = "#ffe9a8"; g.fillText("CHUCK'S", 0, 0);
    g.restore();
  }
  g.restore();
}
/** the sign canvas laid on the plate: `m` the view of the plate (src/x09-stage.tsx cam), over the plate's pixels (SIGNX.x0, SIGNX.y0) */
export function SignMarker({ m, strike, scrawl, order, ready = true }: { m: { s: number; X: (u: number) => number; Y: (v: number) => number }; strike: number; scrawl: number; order: number; ready?: boolean }) {
  const u = SIGNX.x0 + SIGNX.w / 2, v = SIGNX.y0 + SIGNX.h / 2;
  return <InkPlane x={m.X(u)} y={m.Y(v)} w={SIGNX.w * m.s} h={SIGNX.h * m.s} cw={SIGNX.w} ch={SIGNX.h} order={order} state={{ strike: Math.round(strike * 24) / 24, scrawl: Math.round(scrawl * 24) / 24 }} draw={drawSignX} ready={ready} />;
}

// ═════════════════════════════════════════════════════ coins and bills out of the drawer (frame px): thrown up from `from` at t0, on gravity, the coins turning (a coin seen edge-on is a thin sliver), the bills fluttering; they land on the row `floorY` and
// lie there. `t` seconds
const GOLD = { fill: "#f4c93a", ink: "#4a3206", ring: "#c99a1c", light: "#fff0a0" };
function Coin({ x, y, r, sx, rot, order, flat }: { x: number; y: number; r: number; sx: number; rot: number; order: number; flat: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot, sx, flat);
  return (
    <>
      <Inked pts={T(ellipsePts(0, 0, r, r, 22))} color={GOLD.fill} ink={GOLD.ink} w={3} order={order} />
      <Poly pts={T(ribbon(Array.from({ length: 23 }, (_, i) => { const a = (i / 22) * Math.PI * 2; return [Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68, 3.2]; })))} color={GOLD.ring} order={order + 0.1} />
      <Poly pts={T(ribbon([[-r * 0.5, r * 0.42, 3.4], [-r * 0.1, r * 0.6, 3.4], [r * 0.3, r * 0.46, 3.4]]))} color={GOLD.light} order={order + 0.15} op={0.9} />
    </>
  );
}
function Bill({ x, y, rot, sx, order, flat }: { x: number; y: number; rot: number; sx: number; order: number; flat: number }) {
  const T = (p: Pt[]) => xf(p, x, y, rot, sx, flat);
  return (
    <>
      <Inked pts={T(roundRect(86, 40, 5))} color="#8fcf7a" ink="#24501e" w={3} order={order} />
      <Poly pts={T(ellipsePts(0, 0, 15, 11, 16))} color="#bfe8ac" order={order + 0.1} />
      <Poly pts={T(roundRect(14, 8, 2).map(([a, b]) => [a - 32, b + 10] as Pt))} color="#4e9a3c" order={order + 0.1} />
      <Poly pts={T(roundRect(14, 8, 2).map(([a, b]) => [a + 32, b - 10] as Pt))} color="#4e9a3c" order={order + 0.1} />
    </>
  );
}
export function CoinShower({ from, t, t0, floorY, order, n = 22, bills = 6 }: { from: [number, number]; t: number; t0: number; floorY: number; order: number; n?: number; bills?: number }) {
  const a0 = t - t0;
  if (a0 < 0) return null;
  const items: React.ReactNode[] = [];
  for (let i = 0; i < n + bills; i++) {
    const isBill = i >= n, h = (q: number) => hash(i * q + 8.3), g = isBill ? 1700 : 3300;
    const ang = (-90 + (h(1.7) - 0.5) * (isBill ? 130 : 120)) * (Math.PI / 180), v = (isBill ? 760 : 900) + (isBill ? 500 : 800) * h(2.9);
    const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v, born = 0.04 * h(4.1), a = a0 - born;
    if (a < 0) continue;
    const fy = floorY + (h(5.3) - 0.5) * 60, tl = (vy + Math.sqrt(vy * vy + 2 * g * (fy - from[1]))) / g;   // when it reaches the floor row
    const ac = Math.min(a, tl), landed = a >= tl;
    const x = from[0] + vx * ac + (isBill ? 38 * Math.sin(ac * 9 + i) : 0), y = Math.min(fy, from[1] + vy * ac + 0.5 * g * ac * ac);
    const spin = landed ? 0.4 : ac * (9 + 7 * h(6.7)) + h(7.1) * 6, sx = landed ? 1 : Math.max(isBill ? 0.6 : 0.2, Math.abs(Math.cos(spin))), flat = landed ? 0.3 : 1;
    const rot = isBill ? (landed ? (h(9.1) - 0.5) * 50 : Math.sin(ac * 7 + i) * 60 + h(8.8) * 90) : (h(9.1) - 0.5) * 30;
    const bounce = landed ? Math.max(0, 40 * Math.exp(-(a - tl) / 0.08) * Math.abs(Math.sin((a - tl) * 26))) * (isBill ? 0.3 : 1) : 0;
    items.push(isBill ? <Bill key={i} x={PX(x)} y={PY(y) + bounce} rot={rot} sx={sx} flat={flat} order={order + (i % 7) * 0.02} /> : <Coin key={i} x={PX(x)} y={PY(y) + bounce} r={27 + 12 * h(3.3)} sx={sx} rot={rot} flat={flat} order={order + (i % 7) * 0.02} />);
  }
  return <>{items}</>;
}

// ═════════════════════════════════════════════════════ the steam out of an ear hole: an ordinary kettle plume thrown out and up (the cloud kit of src/sp-fx.tsx, one batch of particles per tenth of a second, thick as the steam level of that moment)
const cloud = (s: Sprite) => ({ x: s.x - W / 2, y: H / 2 - s.y, r: s.r * 1.55, a: s.a });
export function plumeSprites(at: [number, number], dir: -1 | 1, t: number, k: number, seed: number, lvk = 1): Sprite[] {
  const out: Sprite[] = [];
  for (let b = Math.floor((t - 1.6) / 0.1); b <= Math.floor(t / 0.1); b++) {
    const tb = b * 0.1, lv = steamLevel(Math.round((tb + 0.05) * 30)) * lvk;
    if (lv <= 0.01 || tb < 0) continue;
    const n = Math.floor(lv * 1.15 + hash(b * 3.7 + seed));
    if (n <= 0) continue;
    const cfg: SteamCfg = { t0: tb, t1: tb + 0.1, stop: 1e9, seed: b * 7 + seed, emitters: [{ seg: [at[0], at[1], at[0] + dir * 8, at[1] - 6, 6], n, r: [(12 + 3 * lv) * k, (40 + 13 * lv) * k], rise: [300 * (0.7 + 0.3 * lv) * k, 640 * (0.7 + 0.3 * lv) * k], life: [0.8, 1.4], strength: 0.95, drift: 460 * k, burst: 2.2, dir, lobes: 4 }] };
    out.push(...steamSprites(cfg, t));
  }
  return out.map(cloud);
}
export function EarPlumes({ left, right, t, k, order }: { left: [number, number]; right: [number, number]; t: number; k: number; order: number }) {
  const sp = [...plumeSprites(left, -1, t, k, 1), ...plumeSprites(right, 1, t, k, 2)];
  return sp.length ? <Cloud sprites={sp} order={order} /> : null;
}
