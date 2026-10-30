import React from "react";
import { Panel, Puppet, type Char as PChar } from "./sp-puppet";
import props from "./tup-props.json";
import type { Acting } from "./pen-scenes";
import { H, W, focusOn, type PropDef } from "./pen-stage";
import { bodyAt, holdPush, poseAt, type Char, type ShotId } from "./tup-sched";

// What the garage's scenes (src/tup-scenes.tsx) and the story's scenes (src/tup-story.tsx) share: the acting of this episode, a puppet drawn with it, the shot's camera, the pieces of the new art
// (src/tup-props.json) as props with pivots, and a stand-in for a shot that is not drawn yet.
/** the acting of src/tup-sched.ts for the seated puppets of src/pen-scenes.tsx: its pose on top of the generic one, and which body picture it wears */
export const ACT: Acting = { tweak: (c, f) => poseAt(c as Char, f), body: bodyAt as Acting["body"] };
/** a puppet of this episode: its pose is src/tup-sched.ts poseAt */
export const TActor = ({ c, f, ...p }: { c: Char; f: number; x: number; y: number; scale: number; order?: number; flip?: boolean; tint?: string }) => <Puppet char={c as PChar} pose={poseAt(c, f)} {...p} />;
/** a shot: its canvas, a slow push in on a frame point (the hold's 2-3.5 %, src/tup-sched.ts holdPush), the scene inside. Every scene that loads pictures (useImages, useHandPhone) is made by this and never by a component that renders
 * <Panel> itself: a load that suspends outside the canvas, in the page's tree, makes React hold back the new <Panel> (its reveal is throttled by 300 ms), and Remotion's <ThreeCanvas/> asks for its delayRender while it renders, in
 * a useState initializer; when the next frame comes in before React reveals it, that render is thrown away, the delayRender is never cleared and the render dies at the shot's first frame (the lid shot, "Waiting for
 * <ThreeCanvas/> to be created", 28 s). Inside the canvas the same load suspends in the canvas's own Suspense, which clears its delay from an effect. tup-check holds src/tup-scenes.tsx and src/tup-story.tsx to this. */
export const shot = (Inner: React.FC<{ f: number }>, focus: [number, number] = [W / 2, H / 2]): React.FC<{ f: number }> => ({ f }) => (
  <Panel w={W} h={H} zoom={holdPush(f)} focus={focusOn(focus[0], focus[1])}><Inner f={f} /></Panel>
);

// ── the pieces of the new art as props: the pivot is the point that the scene places (a fingertip, the foot of the bowl, the middle of the lid); every number is in px of the piece's own picture
const PB = props.props;
export const BOWL: PropDef = { file: PB.bowl.file, w: PB.bowl.w, h: PB.bowl.h, pivot: PB.bowl.pivot as [number, number] };
export const BOWL_FRONT: PropDef = { ...BOWL, file: "sp/tup-bowl-front.png" };
/** the lid, pivot in its middle (its top ellipse's centre); it sits on the bowl with its pivot at (492.4, 114.7) of the bowl's picture (the middle of the bowl's far rim) */
export const LID_PROP: PropDef = { file: PB.lid.file, w: PB.lid.w, h: PB.lid.h, pivot: PB.lid.centre as [number, number] };
export const LID_ON_BOWL: [number, number] = [PB.lid.seat[0] + PB.lid.centre[0], PB.lid.seat[1] + PB.lid.centre[1]];
export const HAND_SHOPPER: PropDef = { file: PB.handShopper.file, w: PB.handShopper.w, h: PB.handShopper.h, pivot: PB.handShopper.tip as [number, number] };
export const HAND_HOSTESS: PropDef = { file: PB.handHostess.file, w: PB.handHostess.w, h: PB.handHostess.h, pivot: PB.handHostess.tip as [number, number] };
export const HAND_MAN: PropDef = { file: PB.handMan.file, w: PB.handMan.w, h: PB.handMan.h, pivot: PB.handMan.boxBottom as [number, number] };
export const GIFT: PropDef = { file: PB.giftBox.file, w: PB.giftBox.w, h: PB.giftBox.h, pivot: PB.giftBox.pivot as [number, number] };
export const OPEN = [488.5, 131.5, 443, 107.5] as const; // the opening of the bowl in its own px (scripts/tup-plates.py)

/** a shot that is not drawn yet: a dark panel with its name */
export const Placeholder = (id: ShotId): React.FC<{ f: number }> => () => (
  <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, background: "#2a2f3a", color: "#fff", font: "900 90px Arial", display: "flex", alignItems: "center", justifyContent: "center" }}>{id}</div>
);
