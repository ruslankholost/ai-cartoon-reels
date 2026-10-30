import React from "react";
import { AbsoluteFill } from "remotion";
import { Panel, Picture, Puppet, type Char, type MouthShape } from "./sp-puppet";
import rig5 from "./pen-rig.json";

// The preview sheet of "I'm Just Not a Sales Person": the cast in every pose with the code-drawn faces, the painted props and the six plates
// (`npx remotion still src/index.ts PenSheet out/pen-preview-sheet.jpg --gl=angle`). With `talk` every head is tilted 2.5 degrees and dipped and every mouth is open: the worst case for a seam
// between the master's head and a pose's body, and for the mouth's place.
export const PEN_SHEET = { w: 2400, h: 2960 };
const R5 = rig5 as unknown as { props: Record<string, { file: string; w: number; h: number }>; scenes: Record<string, { file: string }> };
const PIVOT = rig5 as unknown as Record<string, { pivot: [number, number] }>;
const base = { tilt: 0, bob: 0, breath: 0, mouth: "closed" as MouthShape, mood: "flat" as const, lid: 0.2, angry: 0, sad: 0, lift: 0, asym: 0, pupil: 1, gaze: [0, 0] as [number, number], dx: 0 };
// [char, body pose, label]
const CAST: [Char, string | undefined, string][] = [
  ["denisePen", "chairPhone", "Denise: chair, phone"], ["denisePen", "chairBeer", "Denise: beer and chips"], ["denisePen", "blazer", "Denise: blazer, resume"], ["denisePen", "blazerPat", "Denise: blazer, pats"], ["denisePen", "blazerFist", "Denise: blazer, fist"],
  ["rhondaPen", "chair", "Rhonda: chair, beer"], ["rhondaPen", "beers", "Rhonda: two beers"],
  ["brandon", "stand", "Brandon: stands"], ["brandon", "point", "Brandon: points"], ["brandon", "reader", "Brandon: card reader"], ["brandon", "rip", "Brandon: rips"],
  ["clerk", "stand", "the clerk"], ["clerk", "bowl", "the clerk: bowl"],
  ["hostess", "stand", "the hostess"], ["hostess", "bowl", "the hostess: bowl"], ["hostess", "box", "the hostess: box"],
  ["guest1", undefined, "guest 1"], ["guest2", undefined, "guest 2"], ["guest3", undefined, "guest 3"],
];
const SCALE = 0.37, CELL = 330, GAP = 10, COLS = 7, ROW = 600;
const SETS: [string, string][] = [["garage", "garage"], ["office", "office, Brandon's side"], ["officeBack", "office, Denise's side"], ["store", "1949 store"], ["living", "1950 living room"], ["hall", "1950 hall"]];
const PROPS: [string, string][] = [["pen", "pen"], ["box", "box"], ["pallet", "pallet"], ["poster", "poster"], ["pileStore", "bowl stacks"], ["doorGarage", "garage door leaf"], ["doorHall", "hall door leaf"]];

export const PenSheet: React.FC<{ talk?: boolean }> = ({ talk = false }) => {
  const { w, h } = PEN_SHEET;
  const X = (px: number) => px - w / 2, Y = (py: number) => h / 2 - py;
  const setTop = 60 + Math.ceil(CAST.length / COLS) * ROW + 40, propTop = setTop + 672 + 90;
  return (
    <AbsoluteFill style={{ background: "#ececea", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <Panel w={w} h={h}>
        {CAST.map(([c, body, label], i) => {
          const col = i % COLS, row = Math.floor(i / COLS);
          const x = 30 + col * (CELL + GAP) + CELL / 2, top = 60 + row * ROW;
          const tilt = talk ? (i % 2 ? -2.5 : 2.5) : 0;
          return <Puppet key={label} char={c} pose={{ ...base, body, tilt, bob: talk ? -2 : 0, mouth: talk ? "mid" : "closed", mood: talk ? "neutral" : "flat" }} x={X(x)} y={Y(top + (PIVOT[c].pivot[1] - 20) * SCALE + 60)} scale={SCALE} order={10} />;
        })}
        {SETS.map(([k], i) => <Picture key={k} file={R5.scenes[k].file} w={384} h={672} x={X(60 + i * 395 + 192)} y={Y(setTop + 336)} order={1} />)}
        {PROPS.map(([n], i) => {
          const d = R5.props[n], k = 270 / Math.max(d.w, d.h), cx = 30 + i * 295 + 140;
          return <Picture key={n} file={d.file} w={d.w * k} h={d.h * k} x={X(cx)} y={Y(propTop + 135)} order={1} alpha />;
        })}
      </Panel>
      {CAST.map(([, , label], i) => <div key={label} style={{ position: "absolute", left: 30 + (i % COLS) * (CELL + GAP), top: 60 + Math.floor(i / COLS) * ROW + 10, width: CELL, textAlign: "center", fontSize: 30, fontWeight: 700, color: "#222" }}>{label}</div>)}
      {SETS.map(([, label], i) => <div key={label} style={{ position: "absolute", left: 60 + i * 395, top: setTop - 40, width: 384, textAlign: "center", fontSize: 30, fontWeight: 700, color: "#222" }}>{label}</div>)}
      {PROPS.map(([, label], i) => <div key={label} style={{ position: "absolute", left: 30 + i * 295, top: propTop - 36, width: 280, textAlign: "center", fontSize: 28, fontWeight: 700, color: "#222" }}>{label}</div>)}
      <div style={{ position: "absolute", left: 60, top: 12, fontSize: 28, color: "#555" }}>"I'm Just Not a Sales Person": the cast, the props and the plates (Qwen; faces are drawn in code){talk ? " - talking: heads tilted, mouths open" : ""}</div>
    </AbsoluteFill>
  );
};
