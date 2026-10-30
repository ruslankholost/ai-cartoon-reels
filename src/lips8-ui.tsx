import React from "react";
import { useCanvasTexture, useImages } from "./sp-fx";
import { Glow } from "./sp-puppet";
import { D2R, FX, FY, HAND_PHONE, TPlane, handScreen } from "./pen-stage";
import { OUT, clamp, rr, text, type G } from "./pen-ui";
import { wrapReview } from "./lips-ui";
import { CAP_BAND, REVIEW, capAt, cardK, postedK, pressK, starAt, typedN } from "./lips8-sched";
import { CARD_BOX, CARD_LINES, COVER_BOX, FIX, HAND_FR, PHONE, REVIEW_UI } from "./lips-layout";

// The 2D parts of "Cold Lips" v8 (as src/lips-ui.tsx for v2): the captions (DOM), the card NEXT MORNING, 6:00 AM, the cover's title, and the review on her phone (drawn in the shot's canvas). No share line (Ross 10-23:
// "remove the send"): the last shot loops into the first. The right 130 px and the bottom 400 px of the frame stay free of anything that matters.
export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  return <div style={{ position: "absolute", left: 30, width: 920, top: CAP_BAND[0], height: CAP_BAND[1] - CAP_BAND[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.1, ...OUT }}>{c.text}</div>;
}
export const COVER_TITLE8 = "“TOO HOT!”";
export function Cover() {
  return <div style={{ position: "absolute", left: COVER_BOX.left, width: COVER_BOX.width, top: COVER_BOX.top, height: COVER_BOX.height, display: "flex", alignItems: "center", justifyContent: "center", fontSize: COVER_BOX.size, lineHeight: 1.1, ...OUT }}>{COVER_TITLE8}</div>;
}
export function MorningCard({ f }: { f: number }) {
  const k = cardK(f);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: CARD_BOX.left, width: CARD_BOX.width, top: CARD_BOX.top, height: CARD_BOX.height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: CARD_BOX.size, lineHeight: CARD_BOX.lineHeight, opacity: clamp(k * 2), transform: `scale(${0.8 + 0.2 * k})`, ...OUT }}>
      {CARD_LINES.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

// ── her phone (shot 26): the review screen of v2 (src/lips-ui.tsx drawReview) with this episode's review, typed two letters a frame
function star(g: G, cx: number, cy: number, r: number, fill: string | null, line: string, lw: number) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr_ = i % 2 ? r * 0.44 : r; g[i ? "lineTo" : "moveTo"](cx + rr_ * Math.cos(a), cy + rr_ * Math.sin(a)); }
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  g.lineWidth = lw; g.lineJoin = "round"; g.strokeStyle = line; g.stroke();
}
function drawReview(g: G, typed: number, starsOn: number[], press: number, posted: number) {
  g.fillStyle = "#f6f7f9"; g.fillRect(0, 0, PHONE.w, PHONE.h);
  g.fillStyle = "#f4f5f7"; g.fillRect(0, 0, 300, 92);
  g.fillStyle = "#cfd5dc"; g.fillRect(0, 92, 300, 2);
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
  const lines = wrapReview(g, REVIEW.slice(0, typed), REVIEW_UI.font, 232);
  lines.forEach((l, i) => text(g, l, 32, 336 + i * 40, REVIEW_UI.font, "#101418", { weight: 500, align: "left" }));
  const y = 600 + 6 * press;
  if (posted > 0.02) { rr(g, 18, y, 264, 62, 31); g.fillStyle = "#2a9d5c"; g.fill(); text(g, "Posted", 150, y + 41, 28, "#ffffff", { weight: 800 }); }
  else { rr(g, 18, y, 264, 62, 31); g.fillStyle = typed >= REVIEW.length ? "#e3121b" : "#c4ccd6"; g.fill(); text(g, "POST", 150, y + 41, 28, "#ffffff", { weight: 900 }); }
}
export function ReviewHandPhone8({ f, order }: { f: number; order: number }) {
  const typed = typedN(f), stars = [0, 1, 2, 3, 4].map((i) => (starAt(i, f).on ? starAt(i, f).p : 0)), press = pressK(f), posted = postedK(f);
  const key = `${typed}|${stars.map((s) => Math.round(s * 20)).join(",")}|${Math.round(press * 4)}|${Math.round(posted * 8)}`;
  const [pic, hand] = useImages([FIX.hand.phone, FIX.hand.fingers]), P = HAND_PHONE, K = 2;
  const tex = useCanvasTexture(P.w * K, P.h * K, (g) => {
    g.drawImage(pic.image as CanvasImageSource, 0, 0, P.w * K, P.h * K);
    const ui = document.createElement("canvas"); ui.width = P.w * K; ui.height = P.h * K;
    const u = ui.getContext("2d")!, x0 = -P.sw / 2, y0 = -P.sh / 2;
    u.save(); u.scale(K, K); u.translate(P.cx, P.cy); u.rotate(P.rot * D2R);
    u.beginPath(); u.roundRect(x0, y0, P.sw, P.sh, P.r); u.clip();
    u.fillStyle = "#ffffff"; u.fillRect(x0, y0, P.sw, P.sh);
    u.save(); u.translate(x0, y0 + P.top); u.scale(P.sw / PHONE.w, (P.sh - P.top) / PHONE.h); drawReview(u, typed, stars, press, posted); u.restore();
    u.fillStyle = "#08090b"; u.beginPath(); u.roundRect(-46, y0 - 1, 92, 23, [0, 0, 11, 11]); u.fill();
    u.restore();
    g.drawImage(ui, 0, 0);
    g.drawImage(hand.image as CanvasImageSource, 0, 0, P.w * K, P.h * K);
  }, [pic, hand, key]);
  const { k, hx, hy } = HAND_FR, [scx, scy] = handScreen(hx, hy, k, 150, 357);
  return (
    <>
      <Glow x={scx} y={scy} rx={640} ry={900} op={0.26} order={order - 1} color="rgba(190,215,255,1)" />
      <TPlane tex={tex} x={FX(hx)} y={FY(hy)} w={HAND_PHONE.w * k} h={HAND_PHONE.h * k} order={order} />
    </>
  );
}
