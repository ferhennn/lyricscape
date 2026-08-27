"use client";

import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { FrameProvider } from "./frame-context";
import { CameraController } from "./CameraController";
import { SceneManager } from "./SceneManager";
import { ParticleField } from "./ParticleField";
import { PostFX } from "./PostFX";
import { useExperience } from "@/stores/experience";
import { useSettings } from "@/stores/settings";
import { resolveProfile } from "@/lib/visuals/quality";

export default function ExperienceCanvas() {
  const palette = useExperience((s) => s.palette);
  const quality = useSettings((s) => s.quality);
  const motionPref = useSettings((s) => s.motion);
  const systemReduced = useReducedMotion();
  const reduced = motionPref === "reduced" || !!systemReduced;

  const profile = useMemo(() => resolveProfile(quality), [quality]);
  const particleCount = reduced ? Math.round(profile.particleCount * 0.5) : profile.particleCount;

  return (
    <Canvas
      className="absolute inset-0"
      dpr={profile.dpr}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{ position: [0, 0, 8], fov: 42, near: 0.1, far: 120 }}
      frameloop="always"
    >
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 14, 52]} />
      <FrameProvider>
        <CameraController reduced={reduced} />
        <SceneManager palette={palette} reduced={reduced} detail={profile.sceneDetail} />
        <ParticleField count={particleCount} color={palette.accent} />
        <PostFX profile={profile} reduced={reduced} />
      </FrameProvider>
    </Canvas>
  );
}
