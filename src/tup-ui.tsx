import { heart } from "./tip-screens";
import { FONT, OUT, Piece, SERIF, fit, rnd, rr, text, clamp, PHONE, type G, type Place } from "./pen-ui";
import { SHARE, TYPED, capAt, capBand, shareK, shotAt } from "./tup-sched";
import { INVITE_FONT } from "./tup-layout";

// The 2D parts of "I'm Just Supporting a Friend": the captions and the share line (DOM, as src/pen-ui.tsx), the cover, and the pieces that are drawn in code and placed in a shot's canvas: the two phone
// screens (the invite and her typing, the "Bring a friend!!" text), the card SOLD AT HOME PARTIES ONLY, the 1958 newspaper REXALL BUYS TUPPERWARE FOR $16,000,000, the stamp 47% LOST MONEY and its source.
// Text is never painted; everything is a function of the frame. The right 130 px and the bottom 400 px of the 1080x1920 frame stay free of anything that matters (Instagram covers them): captions sit at
// y 1295-1455, the share line and the cover's title at y 270-560.
export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const band = capBand(shotAt(f).id), size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  return <div style={{ position: "absolute", left: 30, width: 920, top: band[0], height: band[1] - band[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.1, ...OUT }}>{c.text}</div>;
}
// "Send this to the friend who always says yes to the candle party." in three lines over the top of the last shot (clear of the faces and of the captions), popping in over 5 frames once the last caption is gone
const SHARE_LINES = ["Send this to the friend", "who always says yes", "to the candle party."];
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
// ── the cover (scripts/render-tup.sh, a frame of the last shot, the wide with Denise and Rhonda in their chairs, 0.2 s before the end): the belief in quotes as the title, in two lines over their heads, inside the
// 3:4 crop of the profile grid (y 240-1680). The same two characters are on every cover of the series (docs/format.md)
const COVER_LINES = ["“I’m just supporting", "a friend.”"];
export function Cover() {
  return (
    <div style={{ position: "absolute", left: 30, width: 1020, top: 262, height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 82, lineHeight: 1.12, ...OUT }}>
      {COVER_LINES.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════ the pieces
// ── the candle (an emoji drawn as a path: cream wax, a flame) and the chat's frame (the group chat of src/pen-ui.tsx drawHeyGirl)
function candle(g: G, cx: number, cy: number, s: number) {
  g.fillStyle = "#f3e7c9"; rr(g, cx - 5 * s, cy - 2 * s, 10 * s, 15 * s, 2 * s); g.fill();
  g.strokeStyle = "#8a7a52"; g.lineWidth = 1; g.stroke();
  g.fillStyle = "#2b2b2b"; g.fillRect(cx - 0.6 * s, cy - 6 * s, 1.2 * s, 4 * s);
  g.fillStyle = "#ffb02e"; g.beginPath(); g.moveTo(cx, cy - 15 * s); g.quadraticCurveTo(cx + 6 * s, cy - 8 * s, cx, cy - 3 * s); g.quadraticCurveTo(cx - 6 * s, cy - 8 * s, cx, cy - 15 * s); g.fill();
  g.fillStyle = "#fff3b0"; g.beginPath(); g.moveTo(cx, cy - 10 * s); g.quadraticCurveTo(cx + 2.4 * s, cy - 7 * s, cx, cy - 4.6 * s); g.quadraticCurveTo(cx - 2.4 * s, cy - 7 * s, cx, cy - 10 * s); g.fill();
}
const chatFrame = (g: G) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, PHONE.w, PHONE.h);
  g.fillStyle = "#f4f5f7"; g.fillRect(0, 0, 300, 96);
  g.fillStyle = "#cfd5dc"; g.fillRect(0, 96, 300, 2);
  g.strokeStyle = "#2f7df6"; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(30, 50); g.lineTo(20, 62); g.lineTo(30, 74); g.stroke();
  g.fillStyle = "#b9c3d1"; g.beginPath(); g.arc(150, 36, 18, 0, Math.PI * 2); g.fill();
  text(g, "Group chat", 150, 80, 17, "#1b2430", { weight: 700 });
};
type Item = { kind: "text"; s: string } | { kind: "heart" } | { kind: "candle" };
/** a chat bubble of lines of text (each line may end with an icon), the bottom left (or right) corner at (ax, ay); `pop` 0..1.15 is its size (it pops in from its corner) */
function bubble(g: G, lines: Item[][], ax: number, ay: number, right: boolean, pop: number, size = INVITE_FONT) {
  const pad = 12, lh = size + 9;
  g.font = `400 ${size}px ${FONT}`;
  const wOf = (l: Item[]) => l.reduce((w, it) => w + (it.kind === "text" ? g.measureText(it.s).width : size + 6), 0);
  const bw = Math.max(...lines.map(wOf)) + 2 * pad + 2, bh = lines.length * lh + 2 * pad - 6, p = clamp(pop, 0, 1.15);
  g.save();
  g.translate(ax, ay); g.scale(p, p); g.globalAlpha = clamp(pop * 3);
  const x0 = right ? -bw : 0;
  rr(g, x0, -bh, bw, bh, 18); g.fillStyle = right ? "#2f7df6" : "#e6e6eb"; g.fill();
  lines.forEach((l, i) => {
    let x = x0 + pad;
    const y = -bh + pad + size * 0.82 + i * lh;
    for (const it of l) {
      if (it.kind === "text") { text(g, it.s, x, y, size, right ? "#ffffff" : "#101418", { weight: 400, align: "left" }); x += g.measureText(it.s).width; }
      else if (it.kind === "heart") { heart(g, x + size / 2 + 3, y - size * 0.3, size * 0.46, right ? "#ffd0e0" : "#f0457a"); x += size + 6; }
      else { const s = size * 0.044; candle(g, x + size / 2 + 3, y - size * 0.3 + s, s); x += size + 6; }
    }
  });
  g.restore();
  g.globalAlpha = 1;
  return { w: bw, h: bh };
}
const avatar = (g: G, x: number, y: number) => { g.fillStyle = "#b9c3d1"; g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); }; // the sender's dot of a group chat, at the bubble's bottom left
const T_ = (s: string): Item => ({ kind: "text", s });
export const INVITE: Item[][] = [[T_("I sell candles")], [T_("now!!"), { kind: "candle" }], [T_("Party at mine")], [T_("Friday"), { kind: "heart" }], [T_("No pressure!!")]];
export const SENT: Item[][] = [[T_("I'm in!!"), { kind: "heart" }]];
export const BRING: Item[][] = [[T_("Bring a friend!!")], [T_("I get a free")], [T_("candle"), { kind: "heart" }]];
/** the screen text of each phone shot, for the layout check: where the words are on the 300 x 715 screen (design units) */

// ── the keyboard of the hook (shot 1): four rows of keys over the bottom of the screen; the key being tapped is pressed
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
function keyboard(g: G, pressed: string | null) {
  const y0 = 440;
  g.fillStyle = "#d4d8de"; g.fillRect(0, y0, 300, 715 - y0);
  const key = (x: number, y: number, w: number, label: string, on: boolean, dark = false) => {
    rr(g, x, y, w, 46, 7); g.fillStyle = on ? "#aeb4bd" : dark ? "#b5bac3" : "#ffffff"; g.fill();
    text(g, label, x + w / 2, y + 30, 18, "#1b2430", { weight: 500 });
  };
  ROWS.forEach((row, r) => [...row].forEach((ch, i) => key(((r === 1 ? 17 : r === 2 ? 47 : 4) + i * 29.4) | 0, y0 + 8 + r * 56, 26, ch, pressed === (ch === "i" || ch === "m" || ch === "n" ? ch : "")))); // the letters of the typed words light up
  key(4, y0 + 8 + 2 * 56, 40, "⇧", false, true); key(256, y0 + 8 + 2 * 56, 40, "⌫", false, true);
  key(4, y0 + 8 + 3 * 56, 40, "123", false, true); key(48, y0 + 8 + 3 * 56, 40, "☺", pressed === "♥", true);
  key(92, y0 + 8 + 3 * 56, 110, "space", pressed === " "); key(206, y0 + 8 + 3 * 56, 90, "return", false, true);
}
/** the hook's screen: the invite on top (from frame 0), the input bar with what she has typed, the keyboard, and her "I'm in!! (heart)" once sent (`sent` 0..1.15 is its pop) */
export function drawInvite(g: G, typed: number, pressed: string | null, sent: number) {
  chatFrame(g);
  bubble(g, INVITE, 44, 308, false, 1);
  avatar(g, 24, 292);
  if (sent > 0) bubble(g, SENT, 286, 372, true, sent);
  keyboard(g, pressed);
  // the input bar: the typed text (the keys she has tapped so far), a send button once there is some
  rr(g, 10, 388, 236, 40, 20); g.strokeStyle = "#cfd5dc"; g.lineWidth = 2; g.stroke();
  let x = 24;
  const shown = sent > 0 ? 0 : typed;
  for (let i = 0; i < shown; i++) {
    const ch = TYPED[i];
    if (ch === "♥") heart(g, x + 9, 404, 9, "#f0457a");
    else text(g, ch, x, 414, INVITE_FONT, "#101418", { weight: 400, align: "left" });
    g.font = `400 ${INVITE_FONT}px ${FONT}`; x += ch === "♥" ? 24 : g.measureText(ch).width;
  }
  if (!shown && !sent) text(g, "Message", 24, 414, 18, "#9aa5b3", { weight: 400, align: "left" });
  g.fillStyle = typed >= TYPED.length && !sent ? "#2f7df6" : "#c4ccd6"; g.beginPath(); g.arc(268, 408, 17, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(268, 417); g.lineTo(268, 399); g.moveTo(260, 406); g.lineTo(268, 398); g.lineTo(276, 406); g.stroke();
}
/** the later screen (shot 32): the invite and her answer above, the new text popping in at the bottom */
export function drawBring(g: G, pop: number) {
  chatFrame(g);
  bubble(g, INVITE, 44, 308, false, 1);
  avatar(g, 24, 292);
  bubble(g, SENT, 286, 372, true, 1);
  bubble(g, BRING, 44, 510, false, pop);
  g.globalAlpha = clamp(pop * 3); avatar(g, 24, 494); g.globalAlpha = 1;
  rr(g, 20, 655, 260, 40, 20); g.strokeStyle = "#cfd5dc"; g.lineWidth = 2; g.stroke();
  text(g, "Message", 40, 681, 17, "#9aa5b3", { weight: 400, align: "left" });
}

// ── the card SOLD AT HOME PARTIES ONLY (520 x 230): a store sign, cream card, a dark border, a hole at the top for the string
export const DOORCARD = { w: 520, h: 230 } as const;
export function drawDoorCard(g: G, lw: number) {
  g.fillStyle = "#efe6cb"; g.fillRect(0, 0, DOORCARD.w, DOORCARD.h);
  g.strokeStyle = "#17120c"; g.lineWidth = lw * 1.5; g.strokeRect(6, 6, DOORCARD.w - 12, DOORCARD.h - 12);
  g.lineWidth = lw * 0.9; g.strokeRect(18, 18, DOORCARD.w - 36, DOORCARD.h - 36);
  const a = "SOLD AT HOME", b = "PARTIES ONLY", s = Math.min(fit(g, a, 430, 76, { font: SERIF }), fit(g, b, 430, 76, { font: SERIF }));
  text(g, a, DOORCARD.w / 2, 104, s, "#17120c", { font: SERIF, spacing: 2 }); text(g, b, DOORCARD.w / 2, 104 + s * 1.05, s, "#7a1d14", { font: SERIF, spacing: 2 });
  g.fillStyle = "#17120c"; g.beginPath(); g.arc(DOORCARD.w / 2, 12, 5, 0, Math.PI * 2); g.fill();
}
// ── the 1958 front page (600 x 800): REXALL BUYS TUPPERWARE FOR $16,000,000, the sum in a banner that fills the width (the close shot shows the banner)
export const PAPER = { w: 600, h: 800, banner: [300, 414] as const }; // the middle of the banner, in design units from the page's top left
export function drawPaper(g: G, lw: number) {
  const ink = "#1a1710";
  g.fillStyle = "#e9dfc3"; g.fillRect(0, 0, 600, 800);
  g.strokeStyle = "#b3a581"; g.lineWidth = lw * 2; g.strokeRect(0, 0, 600, 800);
  text(g, "THE DAILY TIMES", 300, 82, fit(g, "THE DAILY TIMES", 520, 60, { font: SERIF }), ink, { font: SERIF });
  g.fillStyle = ink; g.fillRect(30, 100, 540, 3); g.fillRect(30, 107, 540, 1.5);
  text(g, "1958", 32, 132, 18, ink, { font: SERIF, align: "left" }); text(g, "5¢", 568, 132, 18, ink, { font: SERIF, align: "right" });
  g.fillRect(30, 142, 540, 1.5);
  text(g, "REXALL BUYS", 300, 236, fit(g, "REXALL BUYS", 540, 104, { font: SERIF }), ink, { font: SERIF });
  text(g, "TUPPERWARE", 300, 322, fit(g, "TUPPERWARE", 540, 100, { font: SERIF }), ink, { font: SERIF });
  g.fillRect(30, 336, 540, 5); g.fillRect(30, 470, 540, 5);
  text(g, "FOR", 34, 452, 32, ink, { font: SERIF, align: "left" });
  text(g, "$16,000,000", 572, 452, fit(g, "$16,000,000", 440, 150, { font: SERIF }), ink, { font: SERIF, align: "right" });
  g.fillStyle = "#b9b09a"; g.fillRect(30, 496, 240, 170);
  g.save(); g.beginPath(); g.rect(30, 496, 240, 170); g.clip();
  g.strokeStyle = "rgba(26,23,16,0.28)"; g.lineWidth = 1.5;
  for (let x = 0; x < 410; x += 12) { g.beginPath(); g.moveTo(30 + x - 170, 666); g.lineTo(30 + x, 496); g.stroke(); }
  g.restore();
  g.strokeStyle = ink; g.lineWidth = lw; g.strokeRect(30, 496, 240, 170);
  g.fillStyle = "rgba(26,23,16,0.5)";
  for (let i = 0; i < 12; i++) g.fillRect(292, 498 + i * 14, 278 - 40 * rnd(i + 3), 6);
  for (let i = 0; i < 6; i++) { g.fillRect(30, 690 + i * 14, 255 - 30 * rnd(i + 21), 6); g.fillRect(315, 690 + i * 14, 255 - 30 * rnd(i + 41), 6); }
}
// ── the stamp 47% LOST MONEY (760 x 330): red rubber-stamp block letters in a double frame, the ink a little uneven (flecks of the paper show through)
export const STAMP = { w: 760, h: 330 } as const;
export function drawStamp(g: G, lw: number) {
  const red = "#c2171d";
  g.strokeStyle = red; g.lineWidth = lw * 5; g.strokeRect(12, 12, STAMP.w - 24, STAMP.h - 24);
  g.lineWidth = lw * 2.2; g.strokeRect(30, 30, STAMP.w - 60, STAMP.h - 60);
  text(g, "47%", STAMP.w / 2, 172, fit(g, "47%", 640, 150), red, { spacing: 4 });
  text(g, "LOST MONEY", STAMP.w / 2, 270, fit(g, "LOST MONEY", 640, 96), red, { spacing: 3 });
  g.globalCompositeOperation = "destination-out"; // the flecks: small bits where the ink did not take
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${0.35 + 0.5 * rnd(i + 7)})`; g.beginPath(); g.arc(20 + rnd(i * 3 + 1) * (STAMP.w - 40), 20 + rnd(i * 5 + 2) * (STAMP.h - 40), 0.8 + 2.4 * rnd(i + 11), 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = "destination-over"; // the paper patch goes under the red (the flecks show paper, not the picture behind): off-white, a thin dark edge
  g.fillStyle = "#f6f0dc"; rr(g, 4, 4, STAMP.w - 8, STAMP.h - 8, 14); g.fill();
  g.fillStyle = "#2a2118"; rr(g, 0, 0, STAMP.w, STAMP.h, 16); g.fill();
  g.globalCompositeOperation = "source-over";
}
export const SOURCE = "AARP Foundation survey of MLM sellers, 2018";
export const SOURCE_PX = { w: 900, h: 70 } as const;
export function drawSource(g: G) {
  rr(g, 0, 0, SOURCE_PX.w, SOURCE_PX.h, 12); g.fillStyle = "rgba(12,12,14,0.78)"; g.fill();
  text(g, SOURCE, SOURCE_PX.w / 2, 46, fit(g, SOURCE, 840, 38, { weight: 700 }), "#ffffff", { weight: 700 });
}

// ── the pieces as components
export const PhoneInvite = ({ typed, pressed, sent, ...p }: Place & { typed: number; pressed: string | null; sent: number }) => <Piece w={PHONE.w} h={PHONE.h} draw={(g) => drawInvite(g, typed, pressed, sent)} deps={[typed, pressed, Math.round(sent * 60)]} {...p} />;
export const PhoneBring = ({ pop, ...p }: Place & { pop: number }) => <Piece w={PHONE.w} h={PHONE.h} draw={(g) => drawBring(g, pop)} deps={[Math.round(pop * 60)]} {...p} />;
export const DoorCard = (p: Place) => <Piece w={DOORCARD.w} h={DOORCARD.h} draw={drawDoorCard} deps={[]} {...p} />;
export const Newspaper = ({ k = 3, ...p }: Place) => <Piece w={PAPER.w} h={PAPER.h} draw={drawPaper} deps={[]} k={k} {...p} />;
export const Stamp = ({ k = 2, ...p }: Place) => <Piece w={STAMP.w} h={STAMP.h} draw={drawStamp} deps={[]} k={k} {...p} />;
export const SourceLine = (p: Place) => <Piece w={SOURCE_PX.w} h={SOURCE_PX.h} draw={drawSource} deps={[]} k={2} {...p} />;
