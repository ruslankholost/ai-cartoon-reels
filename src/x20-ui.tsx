import React from "react";
import { measureText } from "@remotion/layout-utils";
import { OUT } from "./pen-ui";
import { FPS, WHIRL1, capAt, capBand, capMax, capOneMin, capX, clockHours, labelBig, pillP, readout, shotAt } from "./x20-sched";

// The 2D parts of x20 "One Coffee": the captions, the label POV: YOU OWN A CAFÉ (big on the first frame, a small pill at the top from 1.15 s: no PART line), the readout of the wall clock in shot 2 (8:00 AM rolling to 3:00 PM) and the cover (DOM over the
// canvas, the shape of src/x19-ui.tsx). Everything is a function of the frame. Text is never painted into the art (scripts/x20-art-gen.py): all of it is drawn here.

const WHITE = "#fff", YELLOW = "#ffd400";
/** the advance of a character of Arial Bold in em (the captions' face at weight 900): a table by class, close enough to fit a line to its box */
const adv = (c: string) => {
  if (c === " ") return 0.278;
  if (c === "—") return 1;
  if ("!.,:;'".includes(c)) return c === "!" ? 0.333 : 0.278;
  if (c === "?") return 0.611;
  if ("-".includes(c)) return 0.333;
  if (/[0-9]/.test(c)) return 0.556;
  if (/[A-Z]/.test(c)) return "IJ".includes(c) ? 0.4 : c === "M" ? 0.833 : c === "W" ? 0.944 : "FELT".includes(c) ? 0.62 : 0.72;
  if ("il".includes(c)) return 0.278;
  if ("jt".includes(c)) return 0.333;
  if ("fr".includes(c)) return 0.37;
  if (c === "m") return 0.889;
  if (c === "w") return 0.778;
  return 0.6;
};
const emOf = (s: string) => [...s].reduce((a, c) => a + adv(c), 0);

// ═════════════════════════════════════════════════════ captions: one plain line at a time (white, black stroke); a word can be marked `emph` (red, a little bigger, popping on the frame its word starts): x20 marks none
type Layout = { lines: { d: string; t: number; emph: boolean }[][]; size: number };
/** the words in one line when that is big enough (`oneMin` px), else in two lines of about the same width; the size is the biggest that fits the box (a red word is 1.15 times as wide as the rest, a word is 0.2 em from the next, the stroke adds 13 px) */
function layout(ws: { d: string; t: number; emph: boolean }[], w: number, max: number, oneMin: number, bandH: number): Layout {
  const wd = (a: typeof ws) => a.reduce((s, x, i) => s + emOf(x.d) * (x.emph ? 1.15 : 1) + (i ? 0.2 : 0), 0);
  const fit = (em: number) => Math.floor((w - 30) / (em * 1.17)), tall = (n: number) => Math.floor((bandH - 30) / (n * 1.06));   // (the width is fitted with a margin, the height to the band: the stroke adds 13 px each way)
  const one = Math.min(max, fit(wd(ws)), tall(1));
  if (one >= oneMin || ws.length < 2) return { lines: [ws], size: Math.max(44, one) };
  let best = { k: 1, worst: 1e9 };
  for (let k = 1; k < ws.length; k++) { const worst = Math.max(wd(ws.slice(0, k)), wd(ws.slice(k))); if (worst < best.worst) best = { k, worst }; }
  return { lines: [ws.slice(0, best.k), ws.slice(best.k)], size: Math.min(max - 14, fit(best.worst), tall(2)) };
}
export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const id = shotAt(f).id, band = capBand(id), [x0, x1] = capX(id), t = f / FPS;
  const { lines, size } = layout(c.words, x1 - x0, capMax(id), capOneMin(id), band[1] - band[0]);
  return (
    <div style={{ position: "absolute", left: x0, width: x1 - x0, top: band[0], height: band[1] - band[0], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.06, ...OUT }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2em" }}>
          {l.map((w, j) => {
            const a = t - w.t, pop = w.emph && a >= 0 ? 1 + 0.2 * Math.exp(-a / 0.09) * Math.cos(a * 26) : 1;
            return <span key={j} style={{ display: "inline-block", color: w.emph ? "#ff2d2d" : WHITE, fontSize: `${w.emph ? 1.1 : 1}em`, margin: w.emph ? "0 0.08em" : 0, transform: `scale(${pop})`, transformOrigin: "50% 60%" }}>{w.d}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════ the label: "POV: YOU OWN A CAFÉ" in two rows of white heavy letters with a black outline over y about 300-600 on the first frame (a stamp: a little over its size at first); from 1.15 s one small
// pill at the top (y about 254-316, below Instagram's top bar), which stays to the end, as POV videos keep theirs. No PART line (x20 is not a part of anything)
const LABEL_FACE = OUT.fontFamily as string;
const BIG_ROWS = ["POV: YOU", "OWN A CAFÉ"], BIG_W = 900, BIG_MAX = [200, 200], BIG_TOP = 300, PILL = { text: "POV: YOU OWN A CAFÉ", size: 38, y: 254, h: 62 };
const widthOf = (s: string, px: number) => measureText({ text: s, fontFamily: LABEL_FACE, fontWeight: 900, fontSize: px }).width;
const bigSize = (row: number) => Math.min(BIG_MAX[row], Math.floor((BIG_W / widthOf(BIG_ROWS[row], 100)) * 100));
export function Label({ f, cover = false }: { f: number; cover?: boolean }) {
  const top = BIG_TOP;
  const p = cover ? 0 : pillP(f), pop = cover ? 1 : labelBig(f), sizes = BIG_ROWS.map((_, i) => bigSize(i));
  const pw = widthOf(PILL.text, PILL.size) + 56;
  const bigH = sizes[0] + sizes[1] + 14;
  return (
    <>
      {p < 0.995 && (
        <div style={{ position: "absolute", left: 0, width: 1080, top, height: bigH, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: LABEL_FACE, fontWeight: 900, lineHeight: 1.0, color: WHITE, WebkitTextStroke: "18px #000", paintOrder: "stroke fill" as React.CSSProperties["paintOrder"], whiteSpace: "nowrap", opacity: Math.max(0, 1 - 1.5 * p), transform: `translateY(${-(top + bigH / 2 - (PILL.y + PILL.h / 2)) * p}px) scale(${pop * (1 - 0.65 * p)})`, transformOrigin: "50% 50%" }}>
          {BIG_ROWS.map((r, i) => <div key={i} style={{ fontSize: sizes[i], height: sizes[i] }}>{r}</div>)}
        </div>
      )}
      {p > 0.02 && !cover && (
        <div style={{ position: "absolute", left: 540 - pw / 2, width: pw, top: PILL.y, height: PILL.h, borderRadius: PILL.h / 2, background: "rgba(10,10,14,0.78)", boxShadow: "0 0 0 3px rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: LABEL_FACE, fontWeight: 900, fontSize: PILL.size, color: WHITE, whiteSpace: "nowrap", opacity: Math.min(1, p * 1.4), transform: `scale(${0.7 + 0.3 * p})`, transformOrigin: "50% 50%" }}>
          <span>{PILL.text}</span>
        </div>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════ the readout of the wall clock (shot 2): "8:00 AM" in fat white letters beside the clock, the hour rolling (the number slides up out of its place while the next slides in from below) as the hands
// whirl, AM turning to PM at noon, "3:00 PM" when they land (a pop on the landing). (x, y): the middle of the hour digits (frame px); the colon, the minutes and AM / PM stand to the right of the hour, which is right-aligned to its box
export const READOUT = { x: 800, y: 872, size: 160 };
export function ClockReadout({ f }: { f: number }) {
  const h = clockHours(f), k = Math.floor(h + 1e-6), fr = Math.min(1, h - k), [hour, ap] = readout(k), [nextHour, nextAp] = readout(Math.min(7, k + 1));
  const S = READOUT.size, land = f >= WHIRL1 ? 1 + 0.1 * Math.exp(-(f - WHIRL1) / 2.2) * Math.cos((f - WHIRL1) * 2.4) : 1, pm = fr > 0.5 ? nextAp : ap;
  const stroke = `${Math.round(S * 0.085)}px #000`, base: React.CSSProperties = { fontFamily: LABEL_FACE, fontWeight: 900, WebkitTextStroke: stroke, paintOrder: "stroke fill" as React.CSSProperties["paintOrder"], whiteSpace: "nowrap", lineHeight: 1 };
  return (
    <div style={{ position: "absolute", left: READOUT.x - 260, width: 520, top: READOUT.y - S * 0.62, height: S * 1.9, transform: `scale(${land})`, transformOrigin: "50% 40%" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 520, height: S, display: "flex", justifyContent: "center", alignItems: "center", color: WHITE, fontSize: S, ...base }}>
        <span style={{ display: "inline-block", width: S * 1.12, textAlign: "right", position: "relative", height: S }}>
          <span style={{ position: "absolute", right: 0, top: -fr * S * 0.5, opacity: 1 - fr * 0.9 }}>{hour}</span>
          {fr > 0 && <span style={{ position: "absolute", right: 0, top: (1 - fr) * S * 0.5, opacity: fr }}>{nextHour}</span>}
        </span>
        <span>:00</span>
      </div>
      <div style={{ position: "absolute", left: 0, top: S * 1.0, width: 520, textAlign: "center", color: YELLOW, fontSize: S * 0.62, ...base }}>{pm}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════ the cover: shot 3 (the camper at his laptop in cobwebs) with the label in big text over the wall at the top: inside the 3:4 crop of the profile grid (y 240-1680), clear of his face
export function Cover() {
  return <Label f={0} cover />;
}
export { FPS };
