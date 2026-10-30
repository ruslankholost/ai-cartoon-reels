import React from "react";
import { useCanvasTexture, useImages } from "./sp-fx";
import { Glow } from "./sp-puppet";
import { D2R, FX, FY, HAND_PHONE, TPlane, handScreen } from "./pen-stage";
import { FONT, OUT, clamp, rr, text, type G } from "./pen-ui";
import { REVIEW, SHARE, capAt, capBand, cardK, shareK, shotAt, typedN, starAt, postedK, pressK } from "./lips-sched";
import { CARD_BOX, CARD_LINES, COVER_BOX, COVER_TITLE, FIX, HAND_FR, PHONE, REVIEW_UI, SHARE_BOX, SHARE_LINES } from "./lips-layout";

// The 2D parts of "Cold Lips": the captions and the share line (DOM, as src/tup-ui.tsx), the cover, and the pieces that are drawn in code and placed in a shot's canvas: the review on her phone (a generic review
// screen: stars, text, a Post button) and the card NEXT MORNING, 6:00 AM. Text is never painted; everything is a function of the frame. The right 130 px and the bottom 400 px of the 1080x1920 frame stay free of
// anything that matters (Instagram covers them): captions sit at y 1295-1455, the share line at y 330-490, the cover's title at the top.
export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const band = capBand(shotAt(f).id), size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  return <div style={{ position: "absolute", left: 30, width: 920, top: band[0], height: band[1] - band[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.1, ...OUT }}>{c.text}</div>;
}
// "Send this to someone who's served her." in two lines over the top of the last shot (clear of the faces and of the captions), popping in over 5 frames
export function ShareLine({ f }: { f: number }) {
  const k = shareK(f);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: SHARE_BOX.left, width: SHARE_BOX.width, top: SHARE_BOX.top, height: SHARE_BOX.height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: SHARE_BOX.size, lineHeight: SHARE_BOX.lineHeight, opacity: k, transform: `scale(${0.92 + 0.08 * k})`, ...OUT }}>
      {SHARE_LINES.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}
if (SHARE_LINES.join(" ") !== SHARE) throw new Error("the share line's lines are not the share line");
// ── the cover (scripts/render-lips.sh, a frame of shot 1 with no captions): the first line of the story in curly quotes, big, at the top of the picture, inside the 3:4 crop of the profile grid (y 240-1680)
export function Cover() {
  return (
    <div style={{ position: "absolute", left: COVER_BOX.left, width: COVER_BOX.width, top: COVER_BOX.top, height: COVER_BOX.height, display: "flex", alignItems: "center", justifyContent: "center", fontSize: COVER_BOX.size, lineHeight: 1.1, ...OUT }}>{COVER_TITLE}</div>
  );
}

// ═══════════════════════════════════════════════════════════ the pieces
// ── the card NEXT MORNING, 6:00 AM (shot 16): two lines of big white letters with the captions' outline, over the wall above the door, popping in on the shot's first frame
export function MorningCard({ f }: { f: number }) {
  const k = cardK(f);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: CARD_BOX.left, width: CARD_BOX.width, top: CARD_BOX.top, height: CARD_BOX.height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: CARD_BOX.size, lineHeight: CARD_BOX.lineHeight, opacity: clamp(k * 2), transform: `scale(${0.8 + 0.2 * k})`, ...OUT }}>
      {CARD_LINES.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

// ── her phone (shot 16): a generic review screen, 300 x 715 design units: a header, five stars (the first one filled, popping in one by one), the text she types, a Post button (grey until she has typed it, pressed on
// postT, a green "Posted" after the ding). No brand, no logo: stars, text, a button. It is drawn on the glass of the phone in her hand (public/sp/lips-handphone.png)
function star(g: G, cx: number, cy: number, r: number, fill: string | null, line: string, lw: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr_ = i % 2 ? r * 0.44 : r; g[i ? "lineTo" : "moveTo"](cx + rr_ * Math.cos(a), cy + rr_ * Math.sin(a)); }
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  g.lineWidth = lw; g.lineJoin = "round"; g.strokeStyle = line; g.stroke();
}
/** the review's lines for a text box of `maxW` design units: the typed letters, wrapped at spaces */
export function wrapReview(g: G, s: string, size: number, maxW: number): string[] {
  g.font = `500 ${size}px ${FONT}`;
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
export function drawReview(g: G, typed: number, starsOn: number[], press: number, posted: number) {
  g.fillStyle = "#f6f7f9"; g.fillRect(0, 0, PHONE.w, PHONE.h);
  g.fillStyle = "#f4f5f7"; g.fillRect(0, 0, 300, 92);
  g.fillStyle = "#cfd5dc"; g.fillRect(0, 92, 300, 2); // the header's divider (the notch and the status bar are the phone picture's)
  g.strokeStyle = "#2f7df6"; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(30, 46); g.lineTo(20, 58); g.lineTo(30, 70); g.stroke();
  text(g, "Write a review", 160, 66, 24, "#1b2430", { weight: 800 });
  text(g, "Your rating", 24, 142, 17, "#6a7686", { weight: 700, align: "left" });
  for (let i = 0; i < 5; i++) {
    const p = starsOn[i] ?? 0;
    if (p <= 0.01) continue;
    g.save(); g.translate(46 + i * 52, 196); g.scale(Math.min(1.15, p), Math.min(1.15, p));
    star(g, 0, 0, 23, i === 0 ? "#f5b50a" : null, i === 0 ? "#b27d00" : "#b4bcc7", 2.6);
    g.restore();
  }
  text(g, "Your review", 24, 276, 17, "#6a7686", { weight: 700, align: "left" });
  rr(g, 18, 292, 264, 250, 12); g.strokeStyle = "#cfd5dc"; g.lineWidth = 2; g.fillStyle = "#fbfbfc"; g.fill(); g.stroke();
  const shown = REVIEW.slice(0, typed), lines = wrapReview(g, shown, REVIEW_UI.font, 232);
  lines.forEach((l, i) => text(g, l, 32, 336 + i * 40, REVIEW_UI.font, "#101418", { weight: 500, align: "left" }));
  // the post button
  const y = 600 + 6 * press;
  if (posted > 0.02) { rr(g, 18, y, 264, 62, 31); g.fillStyle = "#2a9d5c"; g.fill(); text(g, "Posted", 150, y + 41, 28, "#ffffff", { weight: 800 }); }
  else { rr(g, 18, y, 264, 62, 31); g.fillStyle = typed >= REVIEW.length ? "#2f7df6" : "#c4ccd6"; g.fill(); text(g, "Post", 150, y + 41, 28, "#ffffff", { weight: 800 }); }
}
// the hand's picture (public/sp/lips-handphone.png and lips-handphone-hand.png: src/pen-stage.tsx useHandPhone's two pictures, recoloured to her skin and her coat by scripts/lips-fix-art.py) with the screen drawn on the phone's glass:
// useHandPhone's own drawing, on these files
function useLipsHandPhone(draw: (g: G) => void, key: string) {
  const [pic, hand] = useImages([FIX.hand.phone, FIX.hand.fingers]), P = HAND_PHONE, K = 2;
  return useCanvasTexture(P.w * K, P.h * K, (g) => {
    g.drawImage(pic.image as CanvasImageSource, 0, 0, P.w * K, P.h * K);
    const ui = document.createElement("canvas"); ui.width = P.w * K; ui.height = P.h * K;
    const u = ui.getContext("2d")!, x0 = -P.sw / 2, y0 = -P.sh / 2;
    u.save(); u.scale(K, K); u.translate(P.cx, P.cy); u.rotate(P.rot * D2R);
    u.beginPath(); u.roundRect(x0, y0, P.sw, P.sh, P.r); u.clip();
    u.fillStyle = "#ffffff"; u.fillRect(x0, y0, P.sw, P.sh);
    u.save(); u.translate(x0, y0 + P.top); u.scale(P.sw / PHONE.w, (P.sh - P.top) / PHONE.h); draw(u); u.restore(); // the screen, under the notch
    u.fillStyle = "#111"; u.font = "700 10.5px Arial, Helvetica, sans-serif"; u.textAlign = "left"; u.fillText("9:41", x0 + 22, y0 + 16); // the status bar's ears
    for (let i = 0; i < 4; i++) u.fillRect(P.sw / 2 - 40 + i * 3.4, y0 + 17 - (3 + i * 2), 2.2, 3 + i * 2);
    u.beginPath(); u.roundRect(P.sw / 2 - 23, y0 + 10, 14, 7, 2); u.fill(); u.fillRect(P.sw / 2 - 8.7, y0 + 12, 1.6, 3);
    u.fillStyle = "#08090b"; u.beginPath(); u.roundRect(-46, y0 - 1, 92, 23, [0, 0, 11, 11]); u.fill(); // the notch, a clean shape
    u.fillStyle = "#26272c"; u.beginPath(); u.roundRect(-25, y0 + 8, 34, 5.5, 2.7); u.fill();
    u.fillStyle = "#171a22"; u.beginPath(); u.arc(27, y0 + 10.5, 4.4, 0, Math.PI * 2); u.fill();
    u.fillStyle = "#2c3a55"; u.beginPath(); u.arc(26, y0 + 9.5, 1.5, 0, Math.PI * 2); u.fill();
    u.restore();
    g.drawImage(ui, 0, 0);
    g.drawImage(hand.image as CanvasImageSource, 0, 0, P.w * K, P.h * K); // the fingers and the palm stay in front of the screen
  }, [pic, hand, key]);
}
/** her hand with the phone, coming up from below the frame, the review on its glass; the screen's light spills round it softly */
export function ReviewHandPhone({ f, order }: { f: number; order: number }) {
  const typed = typedN(f), stars = [0, 1, 2, 3, 4].map((i) => (starAt(i, f).on ? starAt(i, f).p : 0)), press = pressK(f), posted = postedK(f);
  const key = `${typed}|${stars.map((s) => Math.round(s * 20)).join(",")}|${Math.round(press * 4)}|${Math.round(posted * 8)}`;
  const tex = useLipsHandPhone((g) => drawReview(g, typed, stars, press, posted), key);
  const { k, hx, hy } = HAND_FR, [scx, scy] = handScreen(hx, hy, k, 150, 357);
  return (
    <>
      <Glow x={scx} y={scy} rx={640} ry={900} op={0.26} order={order - 1} color="rgba(190,215,255,1)" />
      <TPlane tex={tex} x={FX(hx)} y={FY(hy)} w={HAND_PHONE.w * k} h={HAND_PHONE.h * k} order={order} />
    </>
  );
}
