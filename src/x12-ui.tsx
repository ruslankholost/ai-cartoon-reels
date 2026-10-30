import React from "react";
import { OUT } from "./pen-ui";
import { capAt, capBand, capX, shotAt } from "./x12-sched";

// The 2D parts of x12 "Speak to the Manager": the captions and the cover (DOM, as src/x10-ui.tsx). Everything that is written on a canvas and laid on a plane in a shot (the name tag's MANAGER) is in src/x12-draw.tsx; text is never painted into the art
// (scripts/x12-art-gen.py): all of it is drawn here, and every state is a function of the frame.

// ── the captions: one plain line at a time (two lines when it would not fit at a readable size), the band and the box across of the shot (src/x12-sched.ts capBand, capX)
const CHAR_W = 0.6; // an Arial 900 capital is about 0.6 em wide on average
function layout(textIn: string, w: number): { lines: string[]; size: number } {
  const one = Math.min(84, Math.floor(w / (textIn.length * CHAR_W)));
  if (one >= 56 || !textIn.includes(" ")) return { lines: [textIn], size: Math.max(44, one) };
  const words = textIn.split(" ");
  let best = { lines: [textIn], worst: 1e9 };
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(" "), b = words.slice(k).join(" "), worst = Math.max(a.length, b.length);
    if (worst < best.worst) best = { lines: [a, b], worst };
  }
  return { lines: best.lines, size: Math.min(66, Math.floor(w / (best.worst * CHAR_W))) };
}
export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const id = shotAt(f).id, band = capBand(id), [x0, x1] = capX(id), { lines, size } = layout(c.text, x1 - x0 - 20);
  return (
    <div style={{ position: "absolute", left: x0, width: x1 - x0, top: band[0], height: band[1] - band[0], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.08, ...OUT }}>
      {lines.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}
/** the cover's title (a frame of shot 2, Chuck's purple face just snapped): over the top, above his head, inside the 3:4 crop of the profile grid (y 240-1680) */
export const COVER_LINES12 = ["I WANT THE", "MANAGER"];
export function Cover() {
  return (
    <div style={{ position: "absolute", left: 30, width: 1020, top: 170, height: 290, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 130, lineHeight: 1.06, ...OUT }}>
      {COVER_LINES12.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}
