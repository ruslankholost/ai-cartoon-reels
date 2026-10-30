import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BOT_H, BathWide, CrowdPanel, DIV, LIVING, LivingWide, OfficePanel, PremierTable, RECEIPT, TOP_H, TonyPanel, TopDenise, VanPanel, W } from "./nv3-scenes";
import { Caption, EndCard, PhoneList, PhoneReview } from "./nv3-ui";
import { Grain } from "./sp-fx";
import { FRAMES, shotAt } from "./nv3-sched";

// "Nobody Picks Up" v3: eight shots in the South Park puppet look (docs/x01-nobody-picks-up.md, section v3). The shots are chosen by the frame
// (nv3-sched.ts); the split screens put Denise on top and the other end of the call below; the sound is mixed later (scripts/nv3-mix.py) and
// muxed in (scripts/render-nobody-v3.sh), so the render is silent.
export const NV3_FRAMES = FRAMES;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: 1920, overflow: "hidden" };

function Split({ f, bottom }: { f: number; bottom: React.ReactNode }) {
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: TOP_H, overflow: "hidden" }}><TopDenise f={f} /></div>
      <div style={{ position: "absolute", left: 0, top: TOP_H + DIV, width: W, height: BOT_H, overflow: "hidden" }}>{bottom}</div>
    </>
  );
}

// grain: a very light seeded film grain over the picture (src/sp-fx.tsx Grain); off in the episode, on only for the stills that compare it (scripts/render-fx-test.sh)
export const NobodyV3: React.FC<{ noCaps?: boolean; noCard?: boolean; grain?: boolean }> = ({ noCaps, noCard, grain }) => {
  const f = useCurrentFrame();
  const sh = shotAt(f);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {sh.id === "bath" && <div style={full}><BathWide f={f} /></div>}
      {sh.id === "list" && <PhoneList f={f} which="list" />}
      {sh.id === "tony" && <Split f={f} bottom={<TonyPanel f={f} />} />}
      {sh.id === "office" && <Split f={f} bottom={<OfficePanel f={f} />} />}
      {sh.id === "crowd" && <Split f={f} bottom={<CrowdPanel f={f} />} />}
      {sh.id === "scroll" && <PhoneList f={f} which="scroll" />}
      {sh.id === "van" && <Split f={f} bottom={<VanPanel f={f} />} />}
      {sh.id === "living" && <div style={full}><LivingWide f={f} /><Receipt /></div>}
      {sh.id === "review" && <PhoneReview f={f} />}
      {sh.id === "premier" && <div style={full}><PremierTable f={f} /></div>}
      <Grain f={f} on={!!grain} />
      {!noCaps && <Caption f={f} split={sh.split} />}
      {!noCard && <EndCard f={f} />}
    </AbsoluteFill>
  );
};

// the receipt on the coffee table (shot 8): "$1,500 CASH", placed with the same view as the living-room picture
function Receipt() {
  const { u, v, w, h } = RECEIPT;
  const m = LIVING;
  const k = m.s / 1.686; // text sizes are drawn for a view scale of 1.686
  return (
    <div style={{ position: "absolute", left: (u - 60) * m.s, top: (v - 206) * m.s, width: w * m.s, height: h * m.s, background: "#fbfaf4", border: `${Math.round(5 * k)}px solid #2a1d12`, boxSizing: "border-box", transform: "rotate(6deg)", fontFamily: "Arial, Helvetica, sans-serif", textAlign: "center", color: "#2a1d12", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: 17 * k, fontWeight: 900, letterSpacing: 1 }}>GARY'S</div>
      <div style={{ fontSize: 45 * k, fontWeight: 900, color: "#b3261e", lineHeight: 1.04 }}>$1,500</div>
      <div style={{ fontSize: 28 * k, fontWeight: 900 }}>CASH</div>
    </div>
  );
}
