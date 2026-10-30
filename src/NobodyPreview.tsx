import React from "react";
import { useCurrentFrame } from "remotion";
import { Stage } from "./Stage";
import { Bathroom, SinkKitchen, VanCab } from "./nobody-sets";

// Stills for "Nobody Picks Up": scene 1 = shot 1 (bathroom), 2 = shot 4 (under the sink), 3 = shot 14 (the van).
const BG = ["#000", "#A8D5D1", "#EBDDBE", "#2F3440"];
export const NobodyPreview: React.FC<{ scene: 1 | 2 | 3 }> = ({ scene }) => {
  const frame = useCurrentFrame();
  return (
    <Stage bg={BG[scene]}>
      {scene === 1 && <Bathroom frame={frame} />}
      {scene === 2 && <SinkKitchen frame={frame} />}
      {scene === 3 && <VanCab frame={frame} />}
    </Stage>
  );
};
