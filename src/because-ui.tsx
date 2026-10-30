import React from "react";
import { Img, staticFile } from "remotion";
import rig4 from "./because-rig.json";
import { FINAL, SHARE, STAGES, SUB, capAt, hudAt, screenText, shareK } from "./because-sched";

// The DOM parts of "Because": the captions, the total in the corner of the ladder's shots (the customer-facing screen again), and the share line over the last shot (no card, no handle: Ross 10-20). The screen of the
// insert (shot 17) is drawn on a canvas by drawScreen() and laid over the painted monitor's glass in src/because-scenes.tsx. Everything is a function of the frame. The right 130 px and
// the bottom 400 px of the 1080x1920 frame stay free of anything that matters (Instagram covers them): captions sit at y 1295-1455, the total at y 70-250 left of x 950, the share line at y 270-550.
const FONT = "Arial, Helvetica, sans-serif";
const OUT: React.CSSProperties = { fontFamily: FONT, fontWeight: 900, color: "#fff", WebkitTextStroke: "13px #000", paintOrder: "stroke fill" as React.CSSProperties["paintOrder"], whiteSpace: "nowrap", textAlign: "center" };

export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  return <div style={{ position: "absolute", left: 30, width: 920, top: 1295, height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.1, ...OUT }}>{c.text}</div>;
}

// "Send this to the friend who always says 'sure'." in two lines over the top of the last shot (clear of the faces and of the captions below), popping in over 5 frames once the last caption is gone
const SHARE_LINES = ["Send this to the friend", "who always says 'sure'."];
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

// ── the cover (scripts/render-because.sh, frame 780: the realisation close-up in the paper hat): the final total on a wide screen over her head and her first line under it. The screen sits
// on the dark menu board above the hat and the line in the caption band, both inside the 3:4 crop of the profile grid (y 240-1680)
export function Cover() {
  return (
    <>
      <div style={{ position: "absolute", left: 50, top: 256, width: 980, height: 250, boxSizing: "border-box", background: "#10243a", border: "14px solid #d9dde2", borderRadius: 28, boxShadow: "0 0 0 5px #000, 0 14px 0 5px rgba(0,0,0,0.38)", textAlign: "center", fontFamily: FONT, fontWeight: 900 }}>
        <div style={{ fontSize: 40, letterSpacing: 6, color: "#8fb0d0", lineHeight: 1, paddingTop: 26 }}>TOTAL</div>
        <div style={{ fontSize: 112, color: "#7dffb0", lineHeight: 1.1, marginTop: 8 }}>{FINAL}</div>
      </div>
      <div style={{ position: "absolute", left: 30, width: 1020, top: 1295, height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 84, lineHeight: 1.1, ...OUT }}>Just a cheeseburger.</div>
    </>
  );
}

// ── the total in the corner: the customer-facing screen again (the painted monitor, its head only, over the shot) with the total drawn on its glass. It pops in with the first ask and flips
// on every "Sure." (a flap: the old number folds away, the new one folds in over 0.2 s); at the sixth "Sure." the free month turns into a subscription line
const SCR = (rig4 as unknown as { props: { screen: { file: string; w: number; h: number; screen: number[] } } }).props.screen;
const HUD_W = 380, HUD_K = HUD_W / SCR.w, HUD_H = Math.round(436 * HUD_K); // the monitor's head: the first 436 layer rows (the stand below is cut off)
export function Hud({ f }: { f: number }) {
  const h = hudAt(f);
  if (!h.show || h.pop <= 0) return null;
  const flipping = h.stage > 0 && h.k < 1;
  const shown = flipping && h.k < 0.5 ? h.prev : h.stage;
  const sy = flipping ? Math.abs(1 - 2 * h.k) : 1;
  const sub = h.stage >= 6 && !(flipping && h.k < 0.5);
  const [gx0, gy0, gx1, gy1] = SCR.screen;
  return (
    <div style={{ position: "absolute", left: 570, top: 56, width: HUD_W, height: HUD_H, overflow: "hidden", transform: `scale(${0.82 + 0.18 * h.pop})`, transformOrigin: "100% 0%", opacity: Math.min(1, h.pop * 2), filter: "drop-shadow(0 6px 0 rgba(0,0,0,0.38))" }}>
      <Img src={staticFile(SCR.file)} style={{ position: "absolute", left: 0, top: 0, width: HUD_W }} />
      <div style={{ position: "absolute", left: gx0 * HUD_K, top: gy0 * HUD_K, width: (gx1 - gx0) * HUD_K, height: (gy1 - gy0) * HUD_K, background: "#10243a", textAlign: "center", fontFamily: FONT, fontWeight: 900 }}>
        <div style={{ fontSize: 20, letterSpacing: 3, color: "#8fb0d0", lineHeight: 1, paddingTop: 11 }}>TOTAL</div>
        <div style={{ fontSize: 74, color: "#ffffff", lineHeight: 1.1, marginTop: 4, transform: `scaleY(${sy})` }}>{STAGES[shown]}</div>
        {sub && <div style={{ fontSize: 28, color: "#ffd23f", lineHeight: 1.1, marginTop: 0 }}>{SUB}</div>}
      </div>
    </div>
  );
}

// ── the customer-facing screen of shot 17 (the painted monitor's dark glass, 588 x 358 layer px): "TOTAL" and the number; at $14.99 the subscription line is under it; when it stops on
// two million the whole number fits the glass
export const GLASS = [588, 358] as const;
export function drawScreen(g: CanvasRenderingContext2D, W: number, H: number, text: string, sub: boolean, locked: boolean) {
  const [w, h] = GLASS;
  g.save(); g.scale(W / w, H / h);
  g.fillStyle = "#10243a"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#1c3a5c"; g.fillRect(0, 0, w, 6);
  g.font = `700 30px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#8fb0d0"; g.fillText("TOTAL", w / 2, 58);
  g.font = `900 100px ${FONT}`;
  const size = Math.min(120, Math.floor((100 * 0.86 * w) / g.measureText(text).width)); // the biggest number that fits the glass with a margin
  g.font = `900 ${size}px ${FONT}`; g.fillStyle = locked ? "#7dffb0" : "#ffffff"; g.fillText(text, w / 2, sub ? 186 : 214);
  if (sub) { g.font = `900 46px ${FONT}`; g.fillStyle = "#ffd23f"; g.fillText(SUB, w / 2, 262); }
  g.fillStyle = "#2e4d73"; g.fillRect(28, h - 40, w - 56, 3);
  g.restore();
}
export { FINAL, screenText };
