import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BackDenWide, CashMc, CashPush, DenClose, DenEyes, DenSay, DenSwear, DenTray, DenWide, RhondaMc, Screen, Swap, WideEnd, W } from "./because-scenes";
import { Caption, Cover, Hud, ShareLine } from "./because-ui";
import { Grain } from "./sp-fx";
import { FRAMES, shotAt, type ShotId } from "./because-sched";

// "Because" (docs/x03-because.md, script v5): 24 shots in the South Park puppet look, hard cuts, one scene per framing. The shot is chosen by the frame (because-sched.ts SHOTS); the sound is mixed
// later (scripts/sp-mix.py from scratch/cues.json, scripts/render-because.sh) and muxed in, so the render is silent. No end card: the last shot carries the share line (Ross 10-20).
export const BECAUSE_FRAMES = FRAMES;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: 1920, overflow: "hidden" };
const SCENE: Record<ShotId, React.FC<{ f: number }>> = {
  denWide: DenWide, cash2: CashMc, den3: DenClose, cash4: CashMc, denTray: DenTray, cash6: CashMc, den7: DenClose, cash8: CashMc, den9: DenClose, cash10: CashMc, den11: DenClose, cash12: CashMc,
  den13: DenClose, cashLook: CashMc, cashPush: CashPush, den15: DenClose, screen: Screen, swap: Swap, backDen: BackDenWide, rhonda: RhondaMc, denSay: DenSay, denEyes: DenEyes, denSwear: DenSwear, wideEnd: WideEnd,
};

export const Because: React.FC<{ noCaps?: boolean; noShare?: boolean; noHud?: boolean; grain?: boolean; cover?: boolean }> = ({ noCaps, noShare, noHud, grain, cover }) => {
  const f = useCurrentFrame();
  const Scene = SCENE[shotAt(f).id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      <Grain f={f} on={!!grain} />
      {!noHud && <Hud f={f} />}
      {!noCaps && <Caption f={f} />}
      {!noShare && <ShareLine f={f} />}
      {cover && <Cover />}
    </AbsoluteFill>
  );
};
