import React, { useLayoutEffect } from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ZoomScale } from "./flat";

// One orthographic camera, looking straight at the flat set. Units are px of the 1080x1920 frame at zoom 1.
export type Cam = { x?: number; y?: number; zoom?: number; rot?: number };
function CameraRig({ x = 0, y = 0, zoom = 1, rot = 0 }: Cam) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  useLayoutEffect(() => {
    camera.position.set(x, y, 500);
    camera.rotation.set(0, 0, (rot * Math.PI) / 180);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
  });
  return null;
}
export function Stage({ cam, bg = "#000", children }: { cam?: Cam; bg?: string; children?: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ background: bg }}>
      <ThreeCanvas orthographic flat width={1080} height={1920} camera={{ position: [0, 0, 500], zoom: 1, near: 0.1, far: 2000 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <CameraRig {...cam} />
        <ZoomScale k={cam?.zoom ?? 1}>{children}</ZoomScale>
      </ThreeCanvas>
    </AbsoluteFill>
  );
}
