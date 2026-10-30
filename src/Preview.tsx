import React from "react";
import { useCurrentFrame } from "remotion";
import { Stage } from "./Stage";
import { LivingRoom } from "./living";
import { Basement } from "./basement";
import { Bedroom } from "./bedroom";

const BG = ["#222F49", "#222F49", "#3A4658", "#2B2A4A"];
export const Preview: React.FC<{ scene: number }> = ({ scene }) => {
  const frame = useCurrentFrame();
  return (
    <Stage bg={BG[scene]}>
      {scene === 1 && <LivingRoom frame={frame} />}
      {scene === 2 && <Basement frame={frame} />}
      {scene === 3 && <Bedroom frame={frame} />}
    </Stage>
  );
};
