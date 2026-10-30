import React from "react";
import { Composition } from "remotion";
import { Preview } from "./Preview";
import { EPISODE_FRAMES, FridayNightLead } from "./Episode";
import { BE_CHAD_FRAMES, BeChad } from "./BeChad";
import { MEET_THE_FAMILY_FRAMES, MeetTheFamily } from "./MeetTheFamily";
import { NobodyPreview } from "./NobodyPreview";
import { NOBODY_FRAMES, Nobody } from "./Nobody";
import { StyleTest } from "./styletest";
import { STYLEFLAT_FRAMES, StyleFlat, type FlatLook } from "./styleflat";
import { TRIPLE_A_FRAMES, TripleA } from "./TripleA";
import { SP_COMP_FRAMES, SpCallTest } from "./SpCallTest";
import { NV3_FRAMES, NobodyV3 } from "./NobodyV3";
import { TIP_FRAMES, Tip } from "./Tip";
import { SHEET, TipSheet } from "./TipSheet";
import { BECAUSE_FRAMES, Because } from "./Because";
import { PEN_FRAMES, Pen } from "./Pen";
import { PEN_SHEET, PenSheet } from "./PenSheet";
import { TUP_FRAMES, Tup } from "./Tup";
import { LIPS_FRAMES, Lips } from "./Lips";
import { LIPS8_FRAMES, Lips8 } from "./Lips8";
import { X08_FRAMES, X08 } from "./X08";
import { X09Parts } from "./X09Parts";
import { X09_FRAMES, X09 } from "./X09";
import { X10_FRAMES, X10 } from "./X10";
import { X11_FRAMES, X11 } from "./X11";
import { X12_FRAMES, X12 } from "./X12";
import { X13_FRAMES, X13 } from "./X13";
import { X14_FRAMES, X14 } from "./X14";
import { X15_FRAMES, X15 } from "./X15";
import { X16_FRAMES, X16 } from "./X16";
import { X17_FRAMES, X17 } from "./X17";
import { X18_FRAMES, X18 } from "./X18";
import { X19_FRAMES, X19 } from "./X19";
import { X20_FRAMES, X20 } from "./X20";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FridayNightLead" component={FridayNightLead} width={1080} height={1920} fps={30} durationInFrames={EPISODE_FRAMES} />
    <Composition id="BeChad" component={BeChad} width={1080} height={1920} fps={30} durationInFrames={BE_CHAD_FRAMES} />
    <Composition id="MeetTheFamily" component={MeetTheFamily} width={1080} height={1920} fps={30} durationInFrames={MEET_THE_FAMILY_FRAMES} />
    <Composition id="TripleA" component={TripleA} width={1080} height={1920} fps={30} durationInFrames={TRIPLE_A_FRAMES} />
    <Composition id="Nobody" component={Nobody} width={1080} height={1920} fps={30} durationInFrames={NOBODY_FRAMES} />
    <Composition id="Preview" component={Preview} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{ scene: 1 }} />
    <Composition id="NobodyPreview" component={NobodyPreview} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{ scene: 1 as 1 | 2 | 3 }} />
    <Composition id="StyleTest" component={StyleTest} width={1080} height={1920} fps={30} durationInFrames={90} defaultProps={{ look: "ink" as "ink" | "clay" | "verse" }} />
    <Composition id="SpCallTest" component={SpCallTest} width={1080} height={1920} fps={30} durationInFrames={SP_COMP_FRAMES} />
    <Composition id="NobodyV3" component={NobodyV3} width={1080} height={1920} fps={30} durationInFrames={NV3_FRAMES} />
    <Composition id="Tip" component={Tip} width={1080} height={1920} fps={30} durationInFrames={TIP_FRAMES} />
    <Composition id="Because" component={Because} width={1080} height={1920} fps={30} durationInFrames={BECAUSE_FRAMES} />
    <Composition id="Pen" component={Pen} width={1080} height={1920} fps={30} durationInFrames={PEN_FRAMES} />
    <Composition id="Tup" component={Tup} width={1080} height={1920} fps={30} durationInFrames={TUP_FRAMES} />
    <Composition id="Lips" component={Lips} width={1080} height={1920} fps={30} durationInFrames={LIPS_FRAMES} />
    <Composition id="Lips8" component={Lips8} width={1080} height={1920} fps={30} durationInFrames={LIPS8_FRAMES} />
    <Composition id="X08" component={X08} width={1080} height={1920} fps={30} durationInFrames={X08_FRAMES} />
    <Composition id="X09" component={X09} width={1080} height={1920} fps={30} durationInFrames={X09_FRAMES} />
    <Composition id="X10" component={X10} width={1080} height={1920} fps={30} durationInFrames={X10_FRAMES} />
    <Composition id="X11" component={X11} width={1080} height={1920} fps={30} durationInFrames={X11_FRAMES} />
    <Composition id="X12" component={X12} width={1080} height={1920} fps={30} durationInFrames={X12_FRAMES} />
    <Composition id="X13" component={X13} width={1080} height={1920} fps={30} durationInFrames={X13_FRAMES} />
    <Composition id="X14" component={X14} width={1080} height={1920} fps={30} durationInFrames={X14_FRAMES} />
    <Composition id="X15" component={X15} width={1080} height={1920} fps={30} durationInFrames={X15_FRAMES} />
    <Composition id="X16" component={X16} width={1080} height={1920} fps={30} durationInFrames={X16_FRAMES} />
    <Composition id="X17" component={X17} width={1080} height={1920} fps={30} durationInFrames={X17_FRAMES} />
    <Composition id="X18" component={X18} width={1080} height={1920} fps={30} durationInFrames={X18_FRAMES} />
    <Composition id="X19" component={X19} width={1080} height={1920} fps={30} durationInFrames={X19_FRAMES} />
    <Composition id="X20" component={X20} width={1080} height={1920} fps={30} durationInFrames={X20_FRAMES} />
    <Composition id="X09Parts" component={X09Parts} width={1080} height={1920} fps={30} durationInFrames={1} defaultProps={{ part: "ice", age: 0.3, p: 1 }} />
    <Composition id="TipSheet" component={TipSheet} width={SHEET.w} height={SHEET.h} fps={30} durationInFrames={1} />
    <Composition id="PenSheet" component={PenSheet} width={PEN_SHEET.w} height={PEN_SHEET.h} fps={30} durationInFrames={1} defaultProps={{ talk: false }} />
    <Composition id="StyleFlat" component={StyleFlat} width={1080} height={1920} fps={30} durationInFrames={STYLEFLAT_FRAMES} defaultProps={{ look: "adultswim" as FlatLook }} />
  </>
);
