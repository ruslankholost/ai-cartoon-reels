import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Panel, Picture, Puppet } from "./sp-puppet";
import { SP_FRAMES, capAt, garyHere, garySettle, poseAt, zoomDenise, zoomGary } from "./sp-sched";

// SpCallTest: the phone call of "Nobody Picks Up" (lines 9-15) as a South Park style split screen, vertical. Denise in her bathroom on
// top, Gary in his van below, a thin black divider, one plain caption line on the divider. Each half is its own three.js canvas with its
// own orthographic camera; the puppets are cut-outs of the Qwen pictures (scripts/sp-prep.py) moved by src/sp-sched.ts.
// Keep the faces left of x 950 and above y 1520 (Instagram covers the right 130 px and the bottom 400 px).
export const TOP_H = 854, DIV = 12, BOT_H = 1054;
const W = 1080;
const SB = W / 768; // both backgrounds are 768 px wide pictures scaled to the frame width
export const SP_COMP_FRAMES = SP_FRAMES;

const FONT = "Arial, Helvetica, sans-serif";
function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  return (
    <div style={{ position: "absolute", left: 30, width: 920, top: TOP_H + DIV / 2 - 80, height: 160, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", whiteSpace: "nowrap", fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.1, color: "#fff", WebkitTextStroke: "13px #000", paintOrder: "stroke fill" }}>
      {c.text}
    </div>
  );
}

export const SpCallTest: React.FC<{ noCaps?: boolean }> = ({ noCaps }) => {
  const f = useCurrentFrame();
  const pd = poseAt("DENISE", f);
  const pg = poseAt("GARY", f);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: TOP_H, overflow: "hidden" }}>
        <Panel w={W} h={TOP_H} zoom={zoomDenise(f)} focus={[0, -120]}>
          {/* the bathroom: the picture's row 29 sits on the panel's top edge, so the window is hidden behind her head */}
          <Picture file="sp/bg-bathroom.jpg" w={768 * SB} h={1344 * SB} y={TOP_H / 2 - (672 - 29) * SB} order={0} />
          <Puppet char="denise" pose={pd} x={0} y={-300} scale={1.35} />
        </Panel>
      </div>
      <div style={{ position: "absolute", left: 0, top: TOP_H + DIV, width: W, height: BOT_H, overflow: "hidden" }}>
        <Panel w={W} h={BOT_H} zoom={zoomGary(f)} focus={[0, 60]}>
          {/* the van: TACOS (picture row 300) sits 70 px under the panel's top edge */}
          <Picture file="sp/bg-van.jpg" w={768 * SB} h={1344 * SB} y={BOT_H / 2 - 70 - (672 - 300) * SB} order={0} />
          <Puppet char="gary" pose={pg} x={0} y={-101 - garySettle(f)} scale={0.92} visible={garyHere(f)} />
        </Panel>
      </div>
      {!noCaps && <Caption f={f} />}
    </AbsoluteFill>
  );
};
