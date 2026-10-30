import React from "react";
import { capAt, shareK } from "./tip-sched";

// The DOM parts of "Tip?": the captions and the share line over the last shot (no card, no handle: Ross 10-20). Everything is a function of the frame. The right 130 px and the
// bottom 400 px of the 1080x1920 frame stay free of anything that matters (Instagram covers them): captions sit at y 1295-1455 and the share line at y 270-550, left of x 950.
const FONT = "Arial, Helvetica, sans-serif";
const OUT: React.CSSProperties = { fontFamily: FONT, fontWeight: 900, color: "#fff", WebkitTextStroke: "13px #000", paintOrder: "stroke fill" as React.CSSProperties["paintOrder"], whiteSpace: "nowrap", textAlign: "center" };

export function Caption({ f }: { f: number }) {
  const c = capAt(f);
  if (!c) return null;
  const size = Math.max(60, Math.min(84, Math.floor(900 / (c.text.length * 0.6))));
  return <div style={{ position: "absolute", left: 30, width: 920, top: 1295, height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size, lineHeight: 1.1, ...OUT }}>{c.text}</div>;
}

// "Send this to someone who's been on both sides of the counter." in three lines over the top of the last shot (clear of Denise's face and of the captions below), popping in over 5 frames
// once the last caption is gone
const SHARE_LINES = ["Send this to someone", "who's been on both", "sides of the counter."];
export function ShareLine({ f }: { f: number }) {
  const k = shareK(f);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 30, width: 920, top: 270, height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 72, lineHeight: 1.14, opacity: k, transform: `scale(${0.92 + 0.08 * k})`, ...OUT }}>
      {SHARE_LINES.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}
