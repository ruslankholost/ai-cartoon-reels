import { OUT } from "./pen-ui";
import { FPS, capAt, capBand, capMax, capX, shotAt, type Cap } from "./x14-sched";

// The 2D parts of x14 "Four Stars": the captions and the cover (DOM, as src/x13-ui.tsx). Everything that is written on a canvas and laid on a plane in a shot (the review on the phone) is in src/x14-props.tsx; text is never painted into the art
// (scripts/x14-art-gen.py): all of it is drawn here, and every state is a function of the frame.
// Ross's captions are the boldest in the reel (the categorical tone at its maximum, Ross 10-26): up to 130 px, and the words that carry the statement (STARS?!, ONE, MANNERS!, FIVE) are gold, bigger and pop on the frame their word starts.
// Chuck's are the plain white ones (at most 84 px).

const GOLD = "#ffd21f";
/** the advance of a character of Arial Bold in em (the captions' face at weight 900): a table by class, close enough to fit a line to its box */
const adv = (c: string) => {
  if (c === " ") return 0.278;
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
type Layout = { lines: { d: string; t: number; emph: boolean }[][]; size: number };
/** the words in one line when that is big enough (`oneMin` px), else in two lines of about the same width; the size is the biggest that fits the box (a gold word is 1.2 times as wide as the rest, a word is 0.2 em from the next, the stroke adds 13 px) */
function layout(c: Cap, w: number, max: number, oneMin: number): Layout {
  const ws = c.words, wd = (a: typeof ws) => a.reduce((s, x, i) => s + emOf(x.d) * (x.emph ? 1.2 : 1) + (i ? 0.2 : 0), 0);
  const fit = (em: number) => Math.floor((w - 14) / (em * 1.1));
  const one = Math.min(max, fit(wd(ws)));
  if (one >= oneMin || ws.length < 2) return { lines: [ws], size: Math.max(44, one) };
  let best = { k: 1, worst: 1e9 };
  for (let k = 1; k < ws.length; k++) { const worst = Math.max(wd(ws.slice(0, k)), wd(ws.slice(k))); if (worst < best.worst) best = { k, worst }; }
  return { lines: [ws.slice(0, best.k), ws.slice(best.k)], size: Math.min(max - 14, fit(best.worst)) };
}
export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const id = shotAt(f).id, ross = c.who === "ROSS", band = capBand(id, ross), [x0, x1] = capX(id), t = f / FPS;
  const { lines, size } = layout(c, x1 - x0, ross ? capMax(id) : 84, ross ? 92 : 56);
  return (
    <div style={{ position: "absolute", left: x0, width: x1 - x0, top: band[0], height: band[1] - band[0], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.06, ...OUT }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2em" }}>
          {l.map((w, j) => {
            const a = t - w.t, pop = w.emph && a >= 0 ? 1 + 0.2 * Math.exp(-a / 0.09) * Math.cos(a * 26) : 1;
            return <span key={j} style={{ display: "inline-block", color: w.emph ? GOLD : "#fff", fontSize: `${w.emph ? 1.2 : 1}em`, transform: `scale(${pop})`, transformOrigin: "50% 60%" }}>{w.d}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

/** the cover's title (a frame of shot 4, Ross's purple face shouting FOUR STARS?!): over the top, above his head, inside the 3:4 crop of the profile grid (y 240-1680) */
export const COVER_LINES14: { d: string; gold: boolean }[][] = [[{ d: "4", gold: true }, { d: "STARS", gold: false }], [{ d: "=", gold: false }, { d: "1", gold: true }, { d: "STAR", gold: false }]];
export function Cover() {
  return (
    <div style={{ position: "absolute", left: 30, width: 1020, top: 250, height: 330, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 150, lineHeight: 1.02, ...OUT }}>
      {COVER_LINES14.map((l, i) => <div key={i} style={{ display: "flex", gap: "0.22em" }}>{l.map((w, j) => <span key={j} style={{ color: w.gold ? GOLD : "#fff" }}>{w.d}</span>)}</div>)}
    </div>
  );
}
