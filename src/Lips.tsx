import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover, MorningCard, ShareLine } from "./lips-ui";
import { FRAMES, shotAt } from "./lips-sched";
import { SCENES } from "./lips-scenes";

// "Cold Lips" (docs/x06-cold-lips.md, script v2): a customer finds fault with everything a coffee shop does for her, the manager takes "kiss my ass" literally, and she still leaves one star and is first in line the next
// morning. In the South Park puppet look, hard cuts, one scene per shot (src/lips-scenes.tsx). The shot is chosen by the frame (src/lips-sched.ts SHOTS); the sound is mixed later (scripts/sp-mix.py from scratch/cues.json,
// scripts/render-lips.sh) and muxed in, so the render is silent. No end card: the last shot carries the share line (Ross 10-20).
export const LIPS_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const Lips: React.FC<{ noCaps?: boolean; noShare?: boolean; cover?: boolean }> = ({ noCaps, noShare, cover }) => {
  const f = useCurrentFrame();
  const Scene = SCENES[shotAt(f).id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      {shotAt(f).id === "morning" && <MorningCard f={f} />}
      {!noCaps && <Caption f={f} />}
      {!noShare && <ShareLine f={f} />}
      {cover && <Cover />}
    </AbsoluteFill>
  );
};
