import React from "react";
import { AbsoluteFill } from "remotion";
import { Panel, Picture, Puppet } from "./sp-puppet";
import rig3 from "./tip-rig.json";
import type { Char } from "./tip-sched";

// The preview sheet of "Tip?": the cast (with the code-drawn faces) and the sets and props, one still (`npx remotion still src/index.ts TipSheet out/tip-v3-preview-sheet.jpg --gl=angle`).
export const SHEET = { w: 2400, h: 2330 };
const PR = (rig3 as unknown as { props: Record<string, { file: string; w: number; h: number }> }).props;
const base = { tilt: 0, bob: 0, breath: 0, mouth: "closed" as const, mood: "flat" as const, lid: 0.2, angry: 0, sad: 0, lift: 0, asym: 0, pupil: 1, gaze: [0, 0] as [number, number], dx: 0 };
// [char, body pose, label]
const CAST: [Char, string | undefined, string][] = [
  ["deniseHood", "neutral", "Denise (hoodie)"], ["deniseHood", "bottle", "Denise: the bottle"], ["deniseHood", "apron", "Denise: the apron"], ["deniseHood", "apronOut", "Denise: the apron, arm out"], ["kyle", undefined, "Kyle (the cashier)"],
  ["kyleJ", undefined, "Kyle (the customer)"], ["attendant", "stand", "the attendant"], ["attendant", "me", "the attendant: me"], ["lineA", undefined, "line A"], ["lineB", undefined, "line B"], ["lineC", undefined, "line C"], ["lineD", undefined, "line D"],
];
const SCALE = 0.37, CELL = 330, GAP = 10, COLS = 7, ROW = 600;
const SETS: [string, string][] = [["sp/tip-bg-store.jpg", "corner store"], ["sp/tip-bg-fridges.jpg", "store, fridge wall"], ["sp/tip-bg-selfcheck.jpg", "self-checkout"], ["sp/tip-bg-cafe.jpg", "coffee shop, counter"], ["sp/tip-bg-cafeWide.jpg", "coffee shop, wide"]];
const PROPS: [string, string][] = [["terminal", "card terminal"], ["kiosk", "kiosk"], ["bag", "bag"], ["hand", "hand: hoodie"], ["handJ", "hand: jacket"], ["jar", "tip jar"]];

export const TipSheet: React.FC = () => {
  const { w, h } = SHEET;
  const X = (px: number) => px - w / 2, Y = (py: number) => h / 2 - py;
  return (
    <AbsoluteFill style={{ background: "#ececea", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <Panel w={w} h={h}>
        {CAST.map(([c, body, label], i) => {
          const col = i % COLS, row = Math.floor(i / COLS);
          const x = 30 + col * (CELL + GAP) + CELL / 2, top = 60 + row * ROW;
          const piv = (rig3 as unknown as Record<string, { pivot: [number, number] }>)[c].pivot;
          return <Puppet key={label} char={c} pose={{ ...base, body }} x={X(x)} y={Y(top + (piv[1] - 20) * SCALE + 60)} scale={SCALE} order={10} />;
        })}
        {SETS.map(([f], i) => <Picture key={f} file={f} w={384} h={672} x={X(60 + i * 470 + 192)} y={Y(1315 + 336)} order={1} />)}
        {PROPS.map(([n], i) => {
          const d = PR[n], k = 270 / Math.max(d.w, d.h), cx = 30 + i * 295 + 140;
          return <Picture key={n} file={d.file} w={d.w * k} h={d.h * k} x={X(cx)} y={Y(2030 + 135)} order={1} alpha />;
        })}
      </Panel>
      {CAST.map(([, , label], i) => <div key={label} style={{ position: "absolute", left: 30 + (i % COLS) * (CELL + GAP), top: 60 + Math.floor(i / COLS) * ROW + 10, width: CELL, textAlign: "center", fontSize: 30, fontWeight: 700, color: "#222" }}>{label}</div>)}
      {SETS.map(([, label], i) => <div key={label} style={{ position: "absolute", left: 60 + i * 470, top: 1275, width: 384, textAlign: "center", fontSize: 30, fontWeight: 700, color: "#222" }}>{label}</div>)}
      {PROPS.map(([, label], i) => <div key={label} style={{ position: "absolute", left: 30 + i * 295, top: 1995, width: 280, textAlign: "center", fontSize: 28, fontWeight: 700, color: "#222" }}>{label}</div>)}
      <div style={{ position: "absolute", left: 60, top: 12, fontSize: 28, color: "#555" }}>"Tip?": the cast, the sets and the painted props (Qwen, recipe C; faces, screens and signs are drawn in code)</div>
    </AbsoluteFill>
  );
};
