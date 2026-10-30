import React from "react";
import { measureText } from "@remotion/layout-utils";
import { OUT } from "./pen-ui";
import { BLEEPS, COINS_T, FPS, capAt, capBand, capMax, capX, lastBleep, money, shotAt, type Bleep, type Cap } from "./x15-sched";
import { hash } from "./sp-math";

// The 2D parts of x15 "Bleep Fee": the captions, the red pops that come out of each mosaic with the price of the bleep, the red counter in the top right corner that rolls to every new total like a slot machine, the minuses that pay out on the
// last bleep of the peak, and the cover (DOM over the canvas, the shape of src/x14-ui.tsx). Everything is a function of the frame. Text is never painted into the art (scripts/x15-art-gen.py): all of it is drawn here.

const RED = "#ff2d2d", WHITE = "#fff";
/** the advance of a character of Arial Bold in em (the captions' face at weight 900): a table by class, close enough to fit a line to its box */
const adv = (c: string) => {
  if (c === " ") return 0.278;
  if ("!.,:;'".includes(c)) return c === "!" ? 0.333 : 0.278;
  if (c === "?") return 0.611;
  if ("-".includes(c)) return 0.333;
  if ("#".includes(c)) return 0.556;
  if ("@".includes(c)) return 1.0;
  if ("$%".includes(c)) return c === "%" ? 0.889 : 0.556;
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

// ═════════════════════════════════════════════════════ captions: one plain line at a time (white, black stroke); the bleeped words are grawlix in red, a little bigger, and pop on the frame their tone starts
type Layout = { lines: { d: string; t: number; emph: boolean }[][]; size: number };
/** the words in one line when that is big enough (`oneMin` px), else in two lines of about the same width; the size is the biggest that fits the box (a red word is 1.15 times as wide as the rest, a word is 0.2 em from the next, the stroke adds 13 px) */
function layout(c: Cap, w: number, max: number, oneMin: number, bandH: number): Layout {
  const ws = c.words, wd = (a: typeof ws) => a.reduce((s, x, i) => s + emOf(x.d) * (x.emph ? 1.15 : 1) + (i ? 0.2 : 0), 0);
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
  const id = shotAt(f).id, ross = c.who === "ROSS", band = capBand(id, c.who !== "CHUCK"), [x0, x1] = capX(id), t = f / FPS;
  const { lines, size } = layout(c, x1 - x0, ross ? capMax(id) : c.who === "MACHINE" ? 96 : 84, ross ? 92 : 60, band[1] - band[0]);   // (the robot's and Chuck's are the plain smaller ones, Ross's the boldest)
  return (
    <div style={{ position: "absolute", left: x0, width: x1 - x0, top: band[0], height: band[1] - band[0], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.06, ...OUT }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2em" }}>
          {l.map((w, j) => {
            const a = t - w.t, pop = w.emph && a >= 0 ? 1 + 0.2 * Math.exp(-a / 0.09) * Math.cos(a * 26) : 1;
            return <span key={j} style={{ display: "inline-block", color: w.emph ? RED : WHITE, fontSize: `${w.emph ? 1.15 : 1}em`, margin: w.emph ? "0 0.1em" : 0, transform: `scale(${pop})`, transformOrigin: "50% 60%" }}>{w.d}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════ the red pop of a bleep: "-$4.99" ... "-$1,277.44" springs out of the mosaic on the tone's first frame, rises a little to the side and fades. Its size grows with the price (104 px of text, 12 px more for each bleep)
export const POP_LIFE = 0.8;
const popSize = (b: Bleep) => 104 + 12 * b.i;
const popLabel = (b: Bleep) => `-$${money(b.price)}`;
/** where the pop ends up from where it starts (frame px): up and out to one side, so that it clears the eyes; the sides alternate */
const popRise = (b: Bleep): [number, number] => (b.i === 8 ? [0, -60] : [(b.i % 2 ? 1 : -1) * (120 + 26 * b.i), -(120 + 8 * b.i)]);
export const popAge = (b: Bleep, f: number) => (f - b.f0) / FPS;
export function Pops({ f, at }: { f: number; at: (f: number) => [number, number] }) {
  return (
    <>
      {BLEEPS.map((b) => {
        const a = popAge(b, f);
        if (a < 0 || a > POP_LIFE) return null;
        const [ox, oy] = at(b.f0), [rx, ry] = popRise(b), u = 1 - Math.pow(1 - Math.min(1, a / 0.7), 3), sc = Math.max(0.01, 1 - Math.exp(-a / 0.035) * Math.cos(a * 52)), fade = a > 0.56 ? 1 - (a - 0.56) / (POP_LIFE - 0.56) : 1;
        // the width of the text in the face it is set in (the biggest are wider than the frame at their size: they are squeezed across, not made smaller, so that the price still grows in height), and where it stands: inside the frame
        const w0 = measureText({ text: popLabel(b), fontFamily: OUT.fontFamily as string, fontWeight: 900, fontSize: popSize(b) }).width + 36, kx = Math.min(1, 1010 / w0), hw = (w0 * kx) / 2 + 8, x = Math.min(1080 - hw, Math.max(hw, ox + rx * u));
        return (
          <div key={b.i} style={{ position: "absolute", left: x, top: Math.max(380, oy + ry * u), width: 0, height: 0, opacity: Math.max(0, fade), transform: `rotate(${b.i % 2 ? -5 : 4}deg)` }}>
            <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(-50%, -50%) scale(${sc * kx}, ${sc})`, whiteSpace: "nowrap", fontFamily: OUT.fontFamily, fontWeight: 900, fontSize: popSize(b), lineHeight: 1, color: RED, WebkitTextStroke: "16px #fff", paintOrder: "stroke fill" as React.CSSProperties["paintOrder"], filter: "drop-shadow(0 9px 0 rgba(0,0,0,0.55))" }}>{popLabel(b)}</div>
          </div>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the minuses that pay out like a slot machine (the last bleep of the peak, shot 21): red "-$" tokens thrown out of the mosaic to both sides and down (the price's own pop is above), on gravity, turning, gone in 0.8 s
const PAY = 12;
export function Payout({ f, at }: { f: number; at: [number, number] }) {
  const a0 = f / FPS - COINS_T;
  if (a0 < 0 || a0 > 0.8) return null;
  return (
    <>
      {Array.from({ length: PAY }, (_, i) => {
        const h = (q: number) => hash(i * q + 4.7), a = a0 - 0.05 * h(1.3);
        if (a < 0) return null;
        const ang = (-20 + 220 * h(2.1)) * (Math.PI / 180), v = 640 + 820 * h(3.7), x = at[0] + Math.cos(ang) * v * a, y = at[1] + Math.sin(ang) * v * a + 0.5 * 2600 * a * a, rot = 540 * (h(4.9) - 0.5) * a * 2;
        return <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg)`, opacity: Math.min(1, (0.8 - a0) * 4), whiteSpace: "nowrap", fontFamily: OUT.fontFamily, fontWeight: 900, fontSize: 70 + 50 * h(5.3), lineHeight: 1, color: RED, WebkitTextStroke: "9px #fff", paintOrder: "stroke fill" as React.CSSProperties["paintOrder"] }}>-$</div>;
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════ the counter: a small red readout in the top right (below Instagram's top bar, y 252-336, right edge x 1050): the running total, "-$4.99" to "-$2,549.89". Every digit is a reel; on each bleep every
// reel turns once round and stops on the new digit, the left ones first, with a little overshoot (a slot machine); a new digit that the total has grown into starts blank
const CW = { digit: 0.6, sep: 0.3, sign: 0.62 }, CSIZE = 60, CPAD = 24, CR = 1050, CTOP = 252, CH = 84;
const cellW = (c: string) => (/[0-9]/.test(c) ? CW.digit : c === "," || c === "." ? CW.sep : CW.sign) * CSIZE;
const rollEase = (u: number) => { const x = Math.min(1, Math.max(0, u)); return x >= 1 ? 1 : 1 - Math.pow(1 - x, 3) + 0.05 * Math.sin(x * Math.PI) * (1 - x) * 3; };
export function Counter({ f, settled = false }: { f: number; settled?: boolean }) {
  const b = lastBleep(f), out = 0;
  if (!b || shotAt(f).id === "ring2") return null;   // (the next call rings and the counter is gone, so that the loop starts without it)
  const now = money(b.total), was = b.i ? money(BLEEPS[b.i - 1].total) : "0.00", L = now.length, pad = was.padStart(L, " "), a = settled ? 9 : (f - b.f0) / FPS;
  const chars = ["-", "$", ...now], cw = chars.map(cellW), W = cw.reduce((x, y) => x + y, 0) + 2 * CPAD;
  const pulse = settled ? 0 : Math.max(0, Math.exp(-a / 0.12) * Math.cos(a * 38)), appear = b.i === 0 ? Math.min(1, a / 0.1) : 1;
  let x = 0;
  return (
    <div style={{ position: "absolute", left: CR - W, top: CTOP, width: W, height: CH, transform: `scale(${(0.9 + 0.1 * appear) * (1 + 0.05 * pulse) * (1 - out)})`, transformOrigin: "100% 50%", opacity: appear, background: "#16060a", border: "4px solid #ff3b3b", borderRadius: 18, boxShadow: `0 0 ${22 + 18 * Math.max(0, pulse)}px rgba(255,40,40,0.65)`, overflow: "hidden" }}>
      {chars.map((c, k) => {
        const left = CPAD + cw.slice(0, k).reduce((s, v) => s + v, 0);
        const common: React.CSSProperties = { position: "absolute", left, top: 0, width: cw[k], height: CH - 8, textAlign: "center", fontFamily: OUT.fontFamily, fontWeight: 900, fontSize: CSIZE, lineHeight: `${CH - 8}px`, color: "#ff4a3d" };
        void x;
        if (k < 2 || !/[0-9]/.test(c)) return <div key={k} style={common}>{c}</div>;
        const p = k - 2, nd = Number(c), od = pad[p] === " " ? -1 : Number(pad[p]), D = 0.28 + 0.05 * p, u = rollEase(a / D);
        const travel = 10 + ((nd - Math.max(0, od) + 10) % 10), pos = Math.max(0, od) + travel * u, base = Math.floor(pos), fr = pos - base, dg = (n: number) => ((n % 10) + 10) % 10;
        if (od < 0 && a < 0.04) return <div key={k} style={common} />;
        return (
          <div key={k} style={{ ...common, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: -fr * (CH - 8), width: "100%" }}>
              <div style={{ height: CH - 8 }}>{dg(base)}</div><div style={{ height: CH - 8 }}>{dg(base + 1)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════ the cover's title (a frame of shot 6, Ross purple with the mosaic over his mouth and the red "-$9.98"): under his chin, on his shirt, inside the 3:4 crop of the profile grid (y 240-1680): the face, the mosaic and the pop stay clear
export const COVER_LINES15: { d: string; red: boolean }[][] = [[{ d: "EVERYBODY'S", red: false }], [{ d: "TRYING TO", red: false }], [{ d: "#@$%", red: true }, { d: "ME", red: false }]];
export function Cover({ top = 1272, size = 122 }: { top?: number; size?: number }) {
  return (
    <div style={{ position: "absolute", left: 30, width: 1020, top, display: "flex", flexDirection: "column", alignItems: "center", fontSize: size, lineHeight: 1.0, ...OUT }}>
      {COVER_LINES15.map((l, i) => <div key={i} style={{ display: "flex", gap: "0.22em" }}>{l.map((w, j) => <span key={j} style={{ color: w.red ? RED : WHITE }}>{w.d}</span>)}</div>)}
    </div>
  );
}
