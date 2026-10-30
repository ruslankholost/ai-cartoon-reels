import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Aisle, AttMc, AttSag, Callback, CafeWide, Close, DenCafe, DenClose, DenJar, DenKiosk, Insert, InsertNo, Kiosk, KioskTap, KioskTap2, KyleCafe, KyleMc, Reverse, ScanWide, Store, Two, W } from "./tip-scenes";
import { Caption, ShareLine } from "./tip-ui";
import { Grain } from "./sp-fx";
import { FRAMES, shotAt, type ShotId } from "./tip-sched";

// "Tip?" (docs/x02-tip.md, script v3): 21 shots in the South Park puppet look, hard cuts, one scene per framing. The shot is chosen by the frame (tip-sched.ts SHOTS); the sound is mixed later
// (scripts/sp-mix.py from scratch/cues.json, scripts/render-tip.sh) and muxed in, so the render is silent. No end card: the last shot carries the share line (Ross 10-20).
export const TIP_FRAMES = FRAMES;
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: 1920, overflow: "hidden" };
const SCENE: Record<ShotId, React.FC<{ f: number }>> = {
  close: Close, reverse: Reverse, insert: Insert, store: Store, kyleMc: KyleMc, scanWide: ScanWide, kioskTap: KioskTap, kiosk: Kiosk, aisle: Aisle, two: Two, denKiosk: DenKiosk, attMc: AttMc,
  kioskTap2: KioskTap2, attSag: AttSag, callback: Callback, kyleCafe: KyleCafe, insertNo: InsertNo, denCafe: DenCafe, cafeWide: CafeWide, denClose: DenClose, denJar: DenJar,
};

export const Tip: React.FC<{ noCaps?: boolean; noShare?: boolean; grain?: boolean }> = ({ noCaps, noShare, grain }) => {
  const f = useCurrentFrame();
  const Scene = SCENE[shotAt(f).id];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <div style={full}><Scene f={f} /></div>
      <Grain f={f} on={!!grain} />
      {!noCaps && <Caption f={f} />}
      {!noShare && <ShareLine f={f} />}
    </AbsoluteFill>
  );
};
