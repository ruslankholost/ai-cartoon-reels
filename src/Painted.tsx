import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Captions, EndCard, Stamps } from "./inserts";
import { FPS, buildCaps, type Take } from "./sched";

// An episode made of generated shots (scripts/shots.py -> public/<episode>/edit.json) laid on the table read's clock, with the captions,
// stamps and end card on top. Silent: the sound is mixed by scripts/mix.py and muxed after (scripts/render-ep.sh).
type Shot = { id: string; kind: string; at: number; end: number; src: string; fx?: string };
type Edit = { shots: Shot[]; stamps: { text: string; t0: number; t1: number }[]; endcard: { dur: number; lines: string[]; size?: number; overlay?: boolean }; end: number };
type Timings = { takes: unknown[]; tableRead: { cues: { n: number; at: number }[] } };

const fill: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };

export function painted(timings: Timings, edit: Edit) {
  const tk = [...(timings.takes as Take[])].sort((a, b) => a.n - b.n);
  const at = Object.fromEntries(timings.tableRead.cues.map((c) => [c.n, c.at]));
  const S = { caps: buildCaps(tk, tk.map((t) => at[t.n])), stamps: edit.stamps };
  const f = (s: number) => Math.round(s * FPS);
  const Episode: React.FC<{ noCaps?: boolean }> = ({ noCaps }) => {
    const g = useCurrentFrame() / FPS;
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        {edit.shots.map((s) => {
          const p = (g - s.at) / (s.end - s.at);
          const shake = s.fx === "buzz" ? `translate(${Math.sin(g * 95) * 7}px, ${Math.cos(g * 71) * 4}px) ` : ""; // a phone buzzing on a cushion
          return (
            <Sequence key={s.id} from={f(s.at)} durationInFrames={f(s.end) - f(s.at)}>
              {s.kind === "still"
                ? <Img src={staticFile(s.src)} style={{ ...fill, transform: `${shake}scale(${1 + 0.08 * p})` }} />
                : <OffthreadVideo src={staticFile(s.src)} muted style={fill} />}
            </Sequence>
          );
        })}
        <Sequence from={f(edit.end)}>
          <EndCard t={g - edit.end} lines={edit.endcard.lines} size={edit.endcard.size ?? 120} overlay={edit.endcard.overlay} />
        </Sequence>
        {g < edit.end && <Stamps S={S} g={g} />}
        {!noCaps && g < edit.end && <Captions S={S} g={g} />}
      </AbsoluteFill>
    );
  };
  return { Episode, frames: f(edit.end + edit.endcard.dur) };
}
