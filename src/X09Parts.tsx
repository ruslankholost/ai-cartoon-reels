import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Poly, Panel, ellipsePts, roundRect, xf } from "./sp-puppet";
import { Goo } from "./sp-fx";
import { AngerMark } from "./lips8-fx";
import { Cork, PopBurst } from "./x08-fx";
import { Banknote, CashFan, ClockDebris, ClockFace, IceCube, IceHit, IceShower, Pen, Pyro, RingMarks, SpeedLines, Tape, TapeRip, WaterSplash, YellowGlass, earSteam } from "./x09-draw";
import { BOARD, BoardInk, LabelText, NOTE, NotebookInk, ReaderScreen, ScreenTitle, useHandFonts } from "./x09-ui";

// A test card for the parts of x09 that are drawn in code (src/x09-draw.tsx, src/x09-ui.tsx), laid on flat colours, one `part` at a time at an `age` (s since its start) or a progress `p` (scripts/x09-stills.mts PARTS=1 renders them as stills).
// It is not part of the film: it is how the code-drawn parts are looked at before the art they sit on exists, and kept for the next time one is changed.
const W = 1080, H = 1920;
const bg = (color: string) => <Poly pts={[[-W, H], [W, H], [W, -H], [-W, -H]]} color={color} order={0} />;
export type PartsProps = { part: string; age?: number; p?: number };
export const X09Parts: React.FC<PartsProps> = ({ part, age = 0.3, p = 1 }) => {
  const f = useCurrentFrame() + Math.round(age * 30), ok = useHandFonts();
  let body: React.ReactNode = null;
  switch (part) {
    case "ice":
      body = <>{bg("#241a3a")}{[0.5, 0.8, 1.2, 1.8, 2.6].map((s, i) => <IceCube key={i} x={-380 + 190 * i} y={500 - 60 * i} s={s} rot={i * 17} order={10 + i} />)}<IceShower at={[0, -300]} age={age} k={1} order={30} /><IceHit to={[-100, 300]} age={age - 0.5} order={60} /></>;
      break;
    case "splash":
      body = <>{bg("#3a2f55")}<Poly pts={xf(ellipsePts(0, 0, 330, 90, 40), 0, -380)} color="#9fb4c8" order={1} /><WaterSplash at={[0, -330]} age={age} order={20} /><IceShower at={[0, -330]} age={age} order={40} /></>;
      break;
    case "pyro":
      body = <>{bg("#17122a")}<Pyro x={-420} base={-700} age={age} f={f} order={10} seed={1} /><Pyro x={420} base={-700} age={age} f={f} order={12} seed={2} /></>;
      break;
    case "clock":
      body = <>{bg("#3b3b52")}<Poly pts={xf(ellipsePts(0, 0, 220, 220, 48), 0, 0)} color="#d82b34" order={1} /><Poly pts={xf(ellipsePts(0, 0, 170, 170, 48), 0, 0)} color="#fbfbf6" order={2} /><ClockFace x={0} y={0} r={170} order={10} /><RingMarks x={0} y={250} s={2} f={f} order={10} /><ClockDebris at={[0, -250]} age={age} k={1.2} order={20} /></>;
      break;
    case "tape":
      body = <>{bg("#7a5a3a")}<Tape x={0} y={500} pop={1 + 0.3 * (1 - p)} order={10} /><Tape x={0} y={300} bulge={p} order={10} /><TapeRip x={0} y={0} a={p} order={10} /><Tape x={0} y={-300} rot={-4} order={10} /></>;
      break;
    case "glass":
      body = <>{bg("#2a4a3a")}{[0, 0.35, 0.8].map((l, i) => <YellowGlass key={i} x={-300 + 300 * i} y={450} s={2} level={l} order={10 + i} />)}<YellowGlass x={0} y={150} s={2} rot={-70} level={0.5} order={20} /><CashFan x={-250} y={-150} s={1.3} order={30} /><CashFan x={150} y={-150} s={1.3} n={5} rot={20} order={32} /><Banknote x={-300} y={-500} s={2} order={40} /><Pen x={100} y={-500} s={2} rot={20} order={40} /><Pen x={250} y={-500} s={2} rot={-10} color="#d6336c" order={40} /></>;
      break;
    case "board":
      body = <>{bg("#cfd6dd")}<Poly pts={roundRect(BOARD.w * 1.5 + 30, BOARD.h * 1.5 + 30, 10)} color="#8a97a6" order={1} /><Poly pts={roundRect(BOARD.w * 1.5, BOARD.h * 1.5, 6)} color="#fbfcfd" order={2} />
        <BoardInk x={0} y={0} w={BOARD.w * 1.5} h={BOARD.h * 1.5} order={10} ready={ok} st={{ title: 1, lines: [1, 1, 1, p, p, p, p, p, p, p], eleven: 1, lit: 3, blur: 1 }} /></>;
      break;
    case "notebook":
      body = <>{bg("#5b4a3a")}<Poly pts={roundRect(NOTE.w * 1.1, NOTE.h * 1.1, 10)} color="#fbf7ea" order={1} /><NotebookInk x={0} y={0} w={NOTE.w * 1.1} h={NOTE.h * 1.1} order={10} ready={ok} st={{ mmf: [1, 1, p], under: [p, 0], hire: p, heart: p }} /></>;
      break;
    case "title":
      body = <>{bg("#101018")}<Poly pts={roundRect(1000, 520, 14)} color="#1e1f26" order={1} /><ScreenTitle x={0} y={0} w={940} h={470} shine={p} order={10} /></>;
      break;
    case "label":
      body = <>{bg("#6b5434")}<Poly pts={roundRect(520, 220, 12)} color="#ecdcb4" order={1} /><LabelText x={0} y={300} w={400} h={160} label="TAX" rot={-3} order={10} /><ReaderScreen x={-150} y={-300} w={400} h={280} tap={0} order={10} /><ReaderScreen x={250} y={-300} w={400} h={280} tap={1} order={10} /></>;
      break;
    case "speed":
      body = <>{bg("#c93a3a")}<SpeedLines cx={0} cy={0} f={f} r0={140} r1={620} order={10} /></>;
      break;
    case "steam":
      body = <>{bg("#2b3a66")}<Goo sprites={[...earSteam([-180, 0], -1, age + 9.73, 1.2, 1), ...earSteam([180, 0], 1, age + 9.73, 1.2, 2)]} order={10} fill="#f6f9fd" ink="#7d8aa3" ow={3} th={0.4} res={0.5} blur={2} maxN={600} /><Cork at={[-180, 0]} dir={-1} t={age} t0={0.05} r={30} order={20} /><PopBurst at={[180, 0]} t={age} t0={0.05} R={34} order={20} /><AngerMark x={0} y={300} r={50} k={1} color="#a8321a" order={20} /></>;
      break;
    default: body = bg("#ff00ff");
  }
  return <AbsoluteFill style={{ background: "#000" }}><Panel w={W} h={H} zoom={1} focus={[0, 0]}>{body}</Panel></AbsoluteFill>;
};
