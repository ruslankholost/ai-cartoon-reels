import React from "react";
import { Plane, inkAt, useCanvasTexture } from "./sp-fx";
import { heart } from "./tip-screens";
import { SHARE, capAt, capBand, shareK, shotAt } from "./pen-sched";

// The 2D parts of "I'm Just Not a Sales Person": the captions and the share line over the last shot (DOM, no card, no handle: Ross 10-20), the cover, and the pieces that are drawn in code and placed in a
// shot's canvas (the two phone screens, the card DETROIT, 1949, the 1958 newspaper, the card reader's screen, the contract, the yacht poster's words, the boxes' labels, Brandon's badge). Text is never painted
// (scripts/pen-art-gen.py); the pieces are drawn here in their own design units, once per state, and laid on a plane. Everything is a function of the frame. The right 130 px and the bottom 400 px of the
// 1080x1920 frame stay free of anything that matters (Instagram covers them): captions sit at y 1295-1455, the share line and the cover's title at y 270-560.
export const FONT = "Arial, Helvetica, sans-serif";
export const SERIF = "'Times New Roman', Times, serif";
export const OUT: React.CSSProperties = { fontFamily: FONT, fontWeight: 900, color: "#fff", WebkitTextStroke: "13px #000", paintOrder: "stroke fill" as React.CSSProperties["paintOrder"], whiteSpace: "nowrap", textAlign: "center" };

export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const band = capBand(shotAt(f).id), size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  return <div style={{ position: "absolute", left: 30, width: 920, top: band[0], height: band[1] - band[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.1, ...OUT }}>{c.text}</div>;
}

// "Send this to the friend who just got a 'hey girl' text." in three lines over the top of the last shot (clear of the faces and of the captions below), popping in over 5 frames once the last caption is gone
const SHARE_LINES = ["Send this to the friend", "who just got a", "'hey girl' text."];
export function ShareLine({ f }: { f: number }) {
  const k = shareK(f);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 30, width: 920, top: 270, height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 68, lineHeight: 1.18, opacity: k, transform: `scale(${0.92 + 0.08 * k})`, ...OUT }}>
      {SHARE_LINES.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}
if (SHARE_LINES.join(" ") !== SHARE) throw new Error("the share line's lines are not the share line");

// ── the cover (scripts/render-pen.sh, a frame of the last shot, the wide with Denise on the boxes and Rhonda in the door, 0.2 s before the end): the belief in quotes as the title, in two lines over their heads, inside
// the 3:4 crop of the profile grid (y 240-1680). The same two characters are on every cover of the series (docs/format.md)
const COVER_LINES = ["“I’m just not", "a sales person.”"];
export function Cover() {
  return (
    <div style={{ position: "absolute", left: 30, width: 1020, top: 262, height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 100, lineHeight: 1.12, ...OUT }}>
      {COVER_LINES.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════ the pieces: drawn in code, laid on a plane in a shot's canvas (src/sp-fx.tsx Plane, the way src/because-scenes.tsx BoardText does it)
export type G = CanvasRenderingContext2D;
export const rr = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
export type TextOpts = { weight?: number; align?: CanvasTextAlign; font?: string; spacing?: number };
export const text = (g: G, s: string, x: number, y: number, size: number, color: string, o: TextOpts = {}) => {
  g.font = `${o.weight ?? 900} ${size}px ${o.font ?? FONT}`; g.textAlign = o.align ?? "center"; g.textBaseline = "alphabetic"; g.fillStyle = color;
  g.letterSpacing = `${o.spacing ?? 0}px`; g.fillText(s, x, y); g.letterSpacing = "0px";
};
/** the biggest font size, at most `max`, at which `s` is at most `w` wide */
export const fit = (g: G, s: string, w: number, max: number, o: TextOpts = {}) => { g.font = `${o.weight ?? 900} 100px ${o.font ?? FONT}`; g.letterSpacing = "0px"; return Math.min(max, Math.floor((100 * w) / g.measureText(s).width)); };
/** where a piece goes in a canvas of the shot: (x, y) its middle in panel px (y up), s the frame px per design unit, ink the width of the painted ink line at the scale of the shot (src/sp-fx.tsx inkAt) */
export type Place = { x: number; y: number; s?: number; rot?: number; sx?: number; sy?: number; op?: number; order: number; ink?: number; k?: number };
const INK = inkAt(1.4);
export function Piece({ w, h, draw, deps, x, y, s = 1, rot, sx, sy, op, order, ink = INK, k = 2 }: Place & { w: number; h: number; draw: (g: G, lw: number) => void; deps: unknown[] }) {
  const lw = ink / s; // the ink line in design units
  const tex = useCanvasTexture(Math.round(w * k), Math.round(h * k), (g) => { g.scale(k, k); draw(g, lw); }, [...deps, lw, k]);
  return <Plane tex={tex} x={x} y={y} w={w * s} h={h * s} rot={rot} sx={sx} sy={sy} op={op} order={order} />;
}
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease3 = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
/** a stable pseudo-random number in 0..1 from an integer (the grey bars of body copy get different lengths) */
export const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ── the two phone screens (portrait, 300 x 715: the aspect of the painted phone's glass, public/sp/fx-phone-front.png). Shot 2: Denise scrolls job ads and swipes the SALES REP one away; shot 23: the group chat's message
export const PHONE = { w: 300, h: 715 } as const;
const phoneBg = (g: G, bg: string) => { g.fillStyle = bg; g.fillRect(0, 0, PHONE.w, PHONE.h); };
/** the job list; `swipe` 0..1 is how far the thumb has dragged the SALES REP card off to the left (it turns a little and fades; the cards below move up into its place) */
export function drawJobAd(g: G, swipe: number) {
  phoneBg(g, "#e9ecf0");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 300, 96);
  text(g, "Jobs near you", 20, 62, 26, "#1b2430", { weight: 800, align: "left" });
  g.fillStyle = "#cfd5dc"; g.fillRect(0, 96, 300, 2);
  const e = ease3(swipe);
  const cards: [string, string][] = [["SALES REP", "Hiring now · Full time"], ["OFFICE ASSISTANT", "Part time"], ["DELIVERY DRIVER", "Hiring now"]];
  [1, 2, 0].forEach((i) => { // the swiped card is drawn last: it is thrown over the others
    const [title, sub] = cards[i];
    g.save();
    if (i === 0) { g.translate(150, 122 + 75); g.translate(-340 * e, 0); g.rotate((-9 * e * Math.PI) / 180); g.globalAlpha = 1 - clamp((swipe - 0.55) / 0.45); g.translate(-150, -(122 + 75)); }
    const y = 122 + (i ? (i - e) * 168 : 0);
    g.shadowColor = "rgba(0,0,0,0.18)"; g.shadowBlur = 10; g.shadowOffsetY = 3;
    rr(g, 16, y, 268, 152, 14); g.fillStyle = "#ffffff"; g.fill();
    g.shadowColor = "transparent";
    const big = i === 0;
    text(g, title, 32, y + (big ? 62 : 54), big ? fit(g, title, 236, 44) : 25, big ? "#111a24" : "#4b5663", { weight: big ? 900 : 700, align: "left" });
    text(g, sub, 32, y + (big ? 94 : 86), 19, "#6b7684", { weight: 400, align: "left" });
    rr(g, 32, y + 106, 96, 30, 8); g.fillStyle = big ? "#1e66f5" : "#c4ccd6"; g.fill();
    text(g, "APPLY", 80, y + 127, 16, "#ffffff", { weight: 800 });
    g.restore();
  });
}
/** the group chat with the one message: "Hey girl!! (two hearts) Wanna be your own boss?"; `pop` is the bubble's size, 0..1.15 (it pops in on the buzz). The hearts are paths, not a font's emoji */
export function drawHeyGirl(g: G, pop: number) {
  phoneBg(g, "#ffffff");
  g.fillStyle = "#f4f5f7"; g.fillRect(0, 0, 300, 96);
  g.fillStyle = "#cfd5dc"; g.fillRect(0, 96, 300, 2);
  g.strokeStyle = "#2f7df6"; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(30, 50); g.lineTo(20, 62); g.lineTo(30, 74); g.stroke();
  g.fillStyle = "#b9c3d1"; g.beginPath(); g.arc(150, 36, 18, 0, Math.PI * 2); g.fill();
  text(g, "Group chat", 150, 80, 17, "#1b2430", { weight: 700 });
  // the received bubble, anchored at its bottom left
  const lines = ["Hey girl!!", "Wanna be your", "own boss?"], size = 26, pad = 14, lh = 34, ax = 50, ay = 276;
  g.font = `400 ${size}px ${FONT}`;
  const w0 = g.measureText(lines[0]).width, bw = Math.max(w0 + 8 + 2 * 22 + 2, g.measureText(lines[1]).width) + 2 * pad, bh = lines.length * lh + 2 * pad - 6;
  const p = clamp(pop, 0, 1.15);
  g.save();
  g.translate(ax, ay); g.scale(p, p); g.globalAlpha = clamp(pop * 3);
  rr(g, 0, -bh, bw, bh, 20); g.fillStyle = "#e6e6eb"; g.fill();
  lines.forEach((l, i) => text(g, l, pad, -bh + pad + 22 + i * lh, size, "#101418", { weight: 400, align: "left" }));
  heart(g, pad + w0 + 8 + 11, -bh + pad + 13, 11, "#f0457a"); heart(g, pad + w0 + 8 + 11 + 26, -bh + pad + 13, 11, "#ff7aa2");
  g.restore();
  g.globalAlpha = 1;
  g.fillStyle = "#b9c3d1"; g.beginPath(); g.arc(30, ay - 20, 16, 0, Math.PI * 2); g.fill();
  rr(g, 20, 655, 260, 40, 20); g.strokeStyle = "#cfd5dc"; g.lineWidth = 2; g.stroke();
  text(g, "Message", 40, 681, 17, "#9aa5b3", { weight: 400, align: "left" });
}

// ── the card DETROIT, 1949 (640 x 210): the title card of the story, stamped in on "Detroit" (src/pen-sched.ts stampAt gives its size, squash and turn)
export const CARD = { w: 640, h: 210 } as const;
export function drawCard(g: G, lw: number) {
  g.fillStyle = "#efe6cb"; g.fillRect(0, 0, CARD.w, CARD.h);
  g.strokeStyle = "#17120c"; g.lineWidth = lw * 1.5; g.strokeRect(6, 6, CARD.w - 12, CARD.h - 12);
  g.lineWidth = lw * 0.9; g.strokeRect(18, 18, CARD.w - 36, CARD.h - 36);
  text(g, "DETROIT, 1949", CARD.w / 2, 134, fit(g, "DETROIT, 1949", 520, 92, { font: SERIF }), "#17120c", { font: SERIF, spacing: 4 });
}

// ── the 1958 front page (600 x 800): TUPPERWARE SOLD, and a banner with $16,000,000 that fills the width (the extreme close shows only that)
export const PAPER = { w: 600, h: 800, banner: [300, 402] as const }; // the middle of the banner, in design units from the page's top left
export function drawPaper(g: G, lw: number) {
  const ink = "#1a1710";
  g.fillStyle = "#e9dfc3"; g.fillRect(0, 0, 600, 800);
  g.strokeStyle = "#b3a581"; g.lineWidth = lw * 2; g.strokeRect(0, 0, 600, 800);
  text(g, "THE DAILY TIMES", 300, 82, fit(g, "THE DAILY TIMES", 520, 60, { font: SERIF }), ink, { font: SERIF });
  g.fillStyle = ink; g.fillRect(30, 100, 540, 3); g.fillRect(30, 107, 540, 1.5);
  text(g, "1958", 32, 132, 18, ink, { font: SERIF, align: "left" }); text(g, "5¢", 568, 132, 18, ink, { font: SERIF, align: "right" });
  g.fillRect(30, 142, 540, 1.5);
  text(g, "TUPPERWARE", 300, 232, fit(g, "TUPPERWARE", 540, 120, { font: SERIF }), ink, { font: SERIF });
  text(g, "SOLD", 300, 322, fit(g, "SOLD", 540, 96, { font: SERIF }), ink, { font: SERIF });
  // the banner: a thick rule above and below, the sum between them
  g.fillRect(30, 340, 540, 5); g.fillRect(30, 460, 540, 5);
  text(g, "$16,000,000", 300, 436, fit(g, "$16,000,000", 520, 150, { font: SERIF }), ink, { font: SERIF });
  // a photograph (hatched grey) and columns of body copy as grey bars
  g.fillStyle = "#b9b09a"; g.fillRect(30, 488, 240, 170);
  g.save(); g.beginPath(); g.rect(30, 488, 240, 170); g.clip();
  g.strokeStyle = "rgba(26,23,16,0.28)"; g.lineWidth = 1.5;
  for (let x = 0; x < 410; x += 12) { g.beginPath(); g.moveTo(30 + x - 170, 658); g.lineTo(30 + x, 488); g.stroke(); }
  g.restore();
  g.strokeStyle = ink; g.lineWidth = lw; g.strokeRect(30, 488, 240, 170);
  g.fillStyle = "rgba(26,23,16,0.5)";
  for (let i = 0; i < 12; i++) g.fillRect(292, 490 + i * 14, 278 - 40 * rnd(i + 3), 6);
  for (let i = 0; i < 8; i++) { g.fillRect(30, 682 + i * 14, 255 - 30 * rnd(i + 21), 6); g.fillRect(315, 682 + i * 14, 255 - 30 * rnd(i + 41), 6); }
}

// ── the card reader's screen (200 x 130): $20.00, then APPROVED on the beep; `flash` 0..1 is the white flash of the beep
export const READER = { w: 200, h: 130 } as const;
export function drawReader(g: G, approved: boolean, flash: number) {
  g.fillStyle = "#0b1017"; g.fillRect(0, 0, READER.w, READER.h);
  text(g, "$20.00", 100, 62, fit(g, "$20.00", 160, 52), "#ffffff");
  if (!approved) text(g, "TAP CARD", 100, 108, 19, "#8a96a6", { weight: 700, spacing: 2 });
  else {
    text(g, "APPROVED", 112, 108, 22, "#4cd964", { spacing: 1 });
    g.strokeStyle = "#4cd964"; g.lineWidth = 5; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(14, 100); g.lineTo(23, 109); g.lineTo(37, 91); g.stroke();
  }
  if (flash > 0) { g.fillStyle = `rgba(255,255,255,${0.7 * clamp(flash)})`; g.fillRect(0, 0, READER.w, READER.h); }
}

// ── the contract (520 x 700): CONTRACT, grey bars for the small print, a yellow SIGN HERE flag, and the signature line where the scribble is drawn (`sign` 0..1 is how much of it is on the page)
export const CONTRACT = { w: 520, h: 700, line: [230, 630, 476] as const };
/** where the pen's tip is on the page (design units) when `p` of the signature is drawn */
export function signPoint(p: number): [number, number] {
  const u = clamp(p), [x0, y0, x1] = CONTRACT.line;
  return [x0 + 6 + (x1 - x0 - 12) * u + 16 * Math.sin(u * 34), y0 - 14 + 22 * Math.sin(u * 28 + 1) * (0.55 + 0.45 * Math.sin(u * 5))];
}
export function drawContract(g: G, lw: number, sign: number) {
  const ink = "#1a1d26";
  g.fillStyle = "#fbf9f2"; g.fillRect(0, 0, 520, 700);
  g.strokeStyle = "#bdb7a5"; g.lineWidth = lw * 2; g.strokeRect(0, 0, 520, 700);
  text(g, "CONTRACT", 260, 96, 56, ink, { font: SERIF, spacing: 6 });
  g.fillStyle = ink; g.fillRect(44, 116, 432, 3);
  g.fillStyle = "rgba(26,29,38,0.38)";
  for (let i = 0; i < 12; i++) g.fillRect(44, 150 + i * 22, 432 - 90 * rnd(i + 7), 8);
  for (let i = 0; i < 5; i++) g.fillRect(44, 440 + i * 22, 432 - 90 * rnd(i + 61), 8);
  g.fillStyle = "#ffd23f"; g.beginPath(); g.moveTo(44, 566); g.lineTo(190, 566); g.lineTo(206, 590); g.lineTo(190, 614); g.lineTo(44, 614); g.closePath(); g.fill();
  text(g, "SIGN HERE", 116, 598, 21, "#2b2410", { weight: 800 });
  text(g, "X", 212, 640, 38, ink, { font: SERIF, align: "right" });
  g.fillStyle = ink; g.fillRect(CONTRACT.line[0], CONTRACT.line[1], CONTRACT.line[2] - CONTRACT.line[0], 3);
  if (sign > 0) {
    g.strokeStyle = "#1c2a8a"; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
    for (let i = 0; i <= 80; i++) { const u = (i / 80) * clamp(sign), [x, y] = signPoint(u); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
}

// ── the labels on the boxes (220 x 110): PENS on the pallet's boxes, STARTER KIT on the one that lands in her arms
export const LABEL = { w: 220, h: 110 } as const;
export function drawLabel(g: G, lw: number, word: string) {
  rr(g, 2, 2, LABEL.w - 4, LABEL.h - 4, 8); g.fillStyle = "#fbfaf5"; g.fill(); g.strokeStyle = "#2a2118"; g.lineWidth = lw * 1.5; g.stroke();
  text(g, word, LABEL.w / 2, LABEL.h / 2 + fit(g, word, 184, 70) * 0.36, fit(g, word, 184, 70), "#14181f");
}

// ── Brandon's badge (180 x 76): DIAMOND DIRECTOR, with a small diamond
export const BADGE = { w: 180, h: 76 } as const;
export function drawBadge(g: G, lw: number) {
  rr(g, 2, 2, BADGE.w - 4, BADGE.h - 4, 7); g.fillStyle = "#fbfbf7"; g.fill(); g.strokeStyle = "#2a2118"; g.lineWidth = lw * 1.5; g.stroke();
  g.fillStyle = "#1d6fd1"; g.beginPath(); g.moveTo(26, 22); g.lineTo(44, 38); g.lineTo(26, 56); g.lineTo(8, 38); g.closePath(); g.fill();
  text(g, "DIAMOND", 112, 36, fit(g, "DIAMOND", 108, 28), "#123a6e");
  text(g, "DIRECTOR", 112, 62, fit(g, "DIRECTOR", 108, 24), "#123a6e");
}

// ── the yacht poster's words (the painted poster is 768 x 1344, src/pen-rig.json props.poster: a royal-blue band over rows 0-49, sky above the yacht, a navy band over rows 1298-1344):
// BE YOUR OWN BOSS large in the sky, in two lines with a navy outline, and one line of fine print in the navy band, 14 poster px tall: too small to read when the poster fills the frame (shot 37),
// the whole frame at about 6 times (shot 45)
export const POSTER = { w: 768, h: 1344, topBand: 49, bottomBand: 46, title: { top: 62, h: 290 }, fineY: 1321 } as const;
export const FINE = { text: "*RESULTS NOT TYPICAL.", size: 14 } as const;
/** the width of the fine print in poster design units (measured with the font in a scratch canvas) */
export function fineWidth(): number {
  const g = document.createElement("canvas").getContext("2d")!;
  g.font = `400 ${FINE.size}px ${FONT}`; g.letterSpacing = "0.5px";
  return g.measureText(FINE.text).width;
}
export function drawPosterTitle(g: G) {
  const lines = ["BE YOUR", "OWN BOSS"], size = Math.min(...lines.map((l) => fit(g, l, 620, 128)));
  g.lineJoin = "round"; g.strokeStyle = "#0a2c78"; g.lineWidth = size * 0.14;
  lines.forEach((l, i) => {
    const y = 118 + i * size * 1.02;
    g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.letterSpacing = "2px";
    g.strokeText(l, POSTER.w / 2, y); g.fillStyle = "#ffffff"; g.fillText(l, POSTER.w / 2, y);
  });
  g.letterSpacing = "0px";
}
export function drawFinePrint(g: G, w: number, h: number) {
  text(g, FINE.text, w / 2, h / 2 + FINE.size * 0.36, FINE.size, "#cdd7ea", { weight: 400, spacing: 0.5 });
}

// ── the pieces as components. `w`/`h` of the poster are the size the poster picture is shown at (frame px), (x, y) its middle
export const JobAd = ({ swipe, ...p }: Place & { swipe: number }) => <Piece w={PHONE.w} h={PHONE.h} draw={(g) => drawJobAd(g, swipe)} deps={[Math.round(swipe * 60)]} {...p} />;
export const HeyGirl = ({ pop, ...p }: Place & { pop: number }) => <Piece w={PHONE.w} h={PHONE.h} draw={(g) => drawHeyGirl(g, pop)} deps={[Math.round(pop * 60)]} {...p} />;
export const DetroitCard = (p: Place) => <Piece w={CARD.w} h={CARD.h} draw={drawCard} deps={[]} {...p} />;
export const Newspaper = ({ k = 3, ...p }: Place) => <Piece w={PAPER.w} h={PAPER.h} draw={drawPaper} deps={[]} k={k} {...p} />;
export const ReaderScreen = ({ approved, flash = 0, ...p }: Place & { approved: boolean; flash?: number }) => <Piece w={READER.w} h={READER.h} draw={(g) => drawReader(g, approved, flash)} deps={[approved, Math.round(flash * 20)]} {...p} />;
export const Contract = ({ sign = 0, ...p }: Place & { sign?: number }) => <Piece w={CONTRACT.w} h={CONTRACT.h} draw={(g, lw) => drawContract(g, lw, sign)} deps={[Math.round(sign * 60)]} {...p} />;
export const BoxLabel = ({ word, ...p }: Place & { word: "PENS" | "STARTER KIT" }) => <Piece w={LABEL.w} h={LABEL.h} draw={(g, lw) => drawLabel(g, lw, word)} deps={[word]} {...p} />;
export const Badge = (p: Place) => <Piece w={BADGE.w} h={BADGE.h} draw={drawBadge} deps={[]} {...p} />;
/** the poster's words on the poster picture shown at w x h frame px, its middle at (x, y) (panel px, y up), turned by rot degrees about that middle: the title in the sky and the fine print in the navy band
 * (its own sharp canvas, 8 canvas px to a design unit) */
export function PosterText({ x, y, w, h, order, op, rot = 0 }: { x: number; y: number; w: number; h: number; order: number; op?: number; rot?: number }) {
  const u = w / POSTER.w, FW = 400, FH = 40, th = POSTER.title.h, c = Math.cos((rot * Math.PI) / 180), sn = Math.sin((rot * Math.PI) / 180);
  const at = (rowFromTop: number): [number, number] => { const dy = h / 2 - rowFromTop * u; return [x - sn * dy, y + c * dy]; }; // a poster row, turned about its middle
  const [tx, ty] = at(POSTER.title.top + th / 2), [fx, fy] = at(POSTER.fineY);
  return (
    <>
      <Piece w={POSTER.w} h={th} draw={(g) => drawPosterTitle(g)} deps={[]} x={tx} y={ty} s={u} rot={rot} order={order} op={op} />
      <Piece w={FW} h={FH} k={8} draw={(g) => drawFinePrint(g, FW, FH)} deps={[]} x={fx} y={fy} s={u} rot={rot} order={order} op={op} />
    </>
  );
}
