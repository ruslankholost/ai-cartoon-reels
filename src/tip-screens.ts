// The screens of "Tip?" drawn in code (the pictures of the machines are painted with blank dark screens, scripts/tip-art-gen.py): the card terminal and the self-checkout. Every text
// is exact (docs/x02-tip.md) and drawn here, never painted. Each function draws one state into a canvas of W x H px in the design units of its screen (DESIGN), so a state is a
// texture that is drawn once (src/tip-scenes.tsx useScreens) and chosen by the frame. The jar's label, the name tag and the chalkboard are drawn in src/tip-scenes.tsx.
type G = CanvasRenderingContext2D;
const FONT = "Arial, Helvetica, sans-serif";
export const DESIGN = { terminal: [300, 520], kiosk: [400, 344] } as const; // the aspect of each painted glass

const rr = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const text = (g: G, s: string, x: number, y: number, size: number, color: string, o: { weight?: number; align?: CanvasTextAlign; font?: string } = {}) => {
  g.font = `${o.weight ?? 900} ${size}px ${o.font ?? FONT}`; g.textAlign = o.align ?? "center"; g.textBaseline = "alphabetic"; g.fillStyle = color; g.fillText(s, x, y);
};
/** a heart, drawn as a path (no glyph of a font to rely on): its middle at (cx, cy), `s` the half width */
export function heart(g: G, cx: number, cy: number, s: number, color: string) {
  g.beginPath();
  g.moveTo(cx, cy + 0.95 * s);
  g.bezierCurveTo(cx - 1.25 * s, cy + 0.1 * s, cx - 1.1 * s, cy - 0.95 * s, cx - 0.5 * s, cy - 0.95 * s);
  g.bezierCurveTo(cx - 0.2 * s, cy - 0.95 * s, cx - 0.05 * s, cy - 0.75 * s, cx, cy - 0.55 * s);
  g.bezierCurveTo(cx + 0.05 * s, cy - 0.75 * s, cx + 0.2 * s, cy - 0.95 * s, cx + 0.5 * s, cy - 0.95 * s);
  g.bezierCurveTo(cx + 1.1 * s, cy - 0.95 * s, cx + 1.25 * s, cy + 0.1 * s, cx, cy + 0.95 * s);
  g.closePath(); g.fillStyle = color; g.fill();
}
const prep = (g: G, W: number, H: number, w: number, h: number, bg: string) => { g.save(); g.scale(W / w, H / h); g.fillStyle = bg; g.fillRect(0, 0, w, h); };
const button = (g: G, x: number, y: number, w: number, h: number, label: string, size: number, o: { fill: string; text: string; line: string }) => {
  rr(g, x, y, w, h, 14); g.fillStyle = o.fill; g.fill(); g.lineWidth = 4; g.strokeStyle = o.line; g.stroke();
  text(g, label, x + w / 2, y + h / 2 + size * 0.36, size, o.text);
};

// ── the card terminal (portrait): TOTAL $2.49, ADD A TIP? 25% 30% 35%, and a tiny grey "no tip" under them; BAD TIP in red when somebody presses "no tip"
export type TerminalState = "ask" | "askNo" | "bad" | "badDark";
export function drawTerminal(g: G, W: number, H: number, s: TerminalState) {
  const [w, h] = DESIGN.terminal;
  if (s === "bad" || s === "badDark") {
    prep(g, W, H, w, h, s === "bad" ? "#d11f1f" : "#7d0e0e");
    text(g, "BAD", 150, 238, 124, "#ffffff"); text(g, "TIP", 150, 372, 124, "#ffffff");
    return g.restore();
  }
  prep(g, W, H, w, h, "#10243a");
  text(g, "TOTAL", 150, 60, 28, "#8fb0d0", { weight: 700 });
  text(g, "$2.49", 150, 152, 96, "#ffffff");
  g.fillStyle = "#2e4d73"; g.fillRect(24, 178, 252, 3);
  text(g, "ADD A TIP?", 150, 226, 44, "#ffd23f");
  ["25%", "30%", "35%"].forEach((l, i) => button(g, 30, 252 + i * 74, 240, 64, l, 44, { fill: "#2a8a5c", text: "#ffffff", line: "#08131f" }));
  if (s === "askNo") { rr(g, 96, 480, 108, 28, 8); g.fillStyle = "#33465a"; g.fill(); }
  text(g, "no tip", 150, 500, 16, s === "askNo" ? "#d5dee8" : "#6d7c8c", { weight: 600 });
  g.restore();
}

// ── the self-checkout (landscape): TOTAL $63.18, ADD A TIP? 15% 18% 20%, "no tip" tiny in the corner
export type KioskState = "ask" | "askNo";
export function drawKiosk(g: G, W: number, H: number, s: KioskState) {
  const [w, h] = DESIGN.kiosk;
  prep(g, W, H, w, h, "#f1f5fa");
  g.fillStyle = "#1c4f91"; g.fillRect(0, 0, w, 74);
  text(g, "TOTAL $63.18", 200, 52, 48, "#ffffff");
  text(g, "ADD A TIP?", 200, 126, 42, "#16324f");
  ["15%", "18%", "20%"].forEach((l, i) => button(g, 14 + i * 128, 146, 116, 84, l, 46, { fill: "#2b6cb0", text: "#ffffff", line: "#0e2238" }));
  if (s === "askNo") { rr(g, 8, 292, 76, 34, 8); g.fillStyle = "#c9d3de"; g.fill(); }
  text(g, "no tip", 18, 318, 17, s === "askNo" ? "#16324f" : "#8b97a5", { weight: 600, align: "left" });
  g.restore();
}
