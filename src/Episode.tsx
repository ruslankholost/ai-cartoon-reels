import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Stage } from "./Stage";
import { Captions, Stamps } from "./inserts";
import { FPS, buildSched, shotAt, type Timings } from "./sched";
import { SHOT_FNS } from "./shots";
import timings from "../public/friday/timings.json";
import amps from "./amp.json";

// "Friday Night Lead": the episode. The schedule comes from the voice takes (public/friday/timings.json); every frame is
// one shot function (shots.tsx) plus the captions and stamps. The voices are placed by the schedule; the rest of the sound
// (sfx, bed) is mixed later from `cues`.
export const SCHED = buildSched(timings as unknown as Timings, amps);
export const EPISODE_FRAMES = SCHED.frames;

export const FridayNightLead: React.FC<{ noCaps?: boolean }> = ({ noCaps }) => {
  const frame = useCurrentFrame();
  const g = frame / FPS;
  const { shot } = shotAt(SCHED, g);
  const t = g - shot.start, d = shot.end - shot.start;
  const out = SHOT_FNS[shot.key]({ S: SCHED, g, t, d, u: Math.min(1, Math.max(0, t / d)) });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Stage cam={out.cam} bg={out.bg ?? "#000"}>{out.scene}</Stage>
      {out.dom}
      {!out.hideStamp && <Stamps S={SCHED} g={g} />}
      {!noCaps && <Captions S={SCHED} g={g} />}
      {SCHED.voice.map((v) => (
        <Sequence key={v.file} from={Math.round(v.at * FPS)}>
          <Audio src={staticFile(v.file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
