"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneFrame, pointer } from "./frame-context";
import { damp } from "@/lib/visuals/timeline";
import type { SongSectionType } from "@/types";

interface Move {
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
}

// Section-driven camera intent. Progress within the section interpolates pos.
const MOVES: Record<SongSectionType, (p: number) => Move> = {
  intro: (p) => ({ pos: [0, 0.2, 9 - p * 1.5], look: [0, 0, 0], fov: 42 }),
  verse: (p) => ({ pos: [0, 0, 7.5 - p * 2.2], look: [0, 0, 0], fov: 40 }),
  pre_chorus: (p) => ({ pos: [p * 0.6, 0.1, 6 - p * 0.8], look: [0, 0, 0], fov: 44 }),
  chorus: (p) => ({ pos: [0, 0.1, 6.5 + p * 2.5], look: [0, 0, 0], fov: 52 + p * 4 }),
  bridge: (p) => ({
    pos: [Math.sin(p * Math.PI) * 2.4, 0.4, 7],
    look: [0, 0, 0],
    fov: 46,
  }),
  outro: (p) => ({ pos: [0, p * 0.6, 5.5 - p * 3], look: [0, 0.3, -4], fov: 38 }),
  unknown: () => ({ pos: [0, 0, 8], look: [0, 0, 0], fov: 42 }),
};

export function CameraController({ reduced }: { reduced: boolean }) {
  const frame = useSceneFrame();
  const { camera } = useThree();
  const shake = useRef(0);
  const lookTarget = useRef(new THREE.Vector3());
  const secProgress = useRef(0);

  useFrame((_, dt) => {
    const { timeline } = frame.current;
    const cam = camera as THREE.PerspectiveCamera;

    // Track progress inside the current section without needing its bounds here:
    // approximate via intensity envelope is unreliable, so ramp a local clock that
    // resets on section change.
    secProgress.current = Math.min(1, secProgress.current + dt * 0.06);
    const move = (MOVES[timeline.section] ?? MOVES.unknown)(secProgress.current);

    const parX = reduced ? 0 : pointer.x * 0.6;
    const parY = reduced ? 0 : -pointer.y * 0.35;

    const lambda = 1.4;
    cam.position.x = damp(cam.position.x, move.pos[0] + parX, lambda, dt);
    cam.position.y = damp(cam.position.y, move.pos[1] + parY, lambda, dt);
    cam.position.z = damp(cam.position.z, move.pos[2], lambda, dt);

    // Subtle shake scales with intensity; spikes on lyric change.
    const targetShake = reduced ? 0 : timeline.intensity * 0.03 + timeline.transitionPulse * 0.05;
    shake.current = damp(shake.current, targetShake, 3, dt);
    const t = performance.now() * 0.001;
    cam.position.x += Math.sin(t * 13.1) * shake.current;
    cam.position.y += Math.cos(t * 11.7) * shake.current;

    lookTarget.current.set(move.look[0], move.look[1], move.look[2]);
    cam.lookAt(lookTarget.current);

    const targetFov = move.fov + timeline.intensity * 3;
    cam.fov = damp(cam.fov, targetFov, 1.2, dt);
    cam.updateProjectionMatrix();
  });

  // Reset section clock on scene/section change.
  const lastSection = useRef(frame.current.timeline.section);
  useFrame(() => {
    if (frame.current.timeline.section !== lastSection.current) {
      lastSection.current = frame.current.timeline.section;
      secProgress.current = 0;
    }
  });

  return null;
}
