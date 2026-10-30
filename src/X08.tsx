import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Caption, Cover } from "./x08-ui";
import { FRAMES, shotAt } from "./x08-sched";
import { SCENES } from "./x08-scenes";

// x08 "Just Let Me Pay" (docs/x08-just-let-me-pay.md, "Script v4 and build spec v2"): Ross buys a pair of socks at midnight. His thumb goes for CHECKOUT ("Aaand... checkout."), four pop-ups slap onto his face, the checkout wants a
// password with his grandma's blood type, a captcha of nine pictures of his own face, a voice check that calls him a robot, and the ghost on his shoulder ticks "I'm not a robot" and passes. Out of stock; he rockets through the ceiling;
// next morning the shop sends a reminder, his thumb slams CHECKOUT again and the reel loops into the first shot. The South Park puppets of Lips8's family (his own, src/x08-rig.json), hard cuts, one scene per shot (src/x08-scenes.tsx), the shot chosen by the frame (src/x08-sched.ts SHOTS);
// the sound is mixed later (scripts/sp-mix.py, scripts/render-x08.sh) and muxed in, so the render is silent. No share line, no end card.
export const X08_FRAMES = FRAMES;
const W = 1080, H = 1920;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, overflow: "hidden" };

export const X08: React.FC<{ noCaps?: boolean; cover?: boolean }> = ({ noCaps, cover }) => {
  const f = useCurrentFrame();
  const Scene = SCENES[shotAt(f).id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      {!noCaps && <Caption f={f} />}
      {cover && <Cover />}
    </AbsoluteFill>
  );
};
