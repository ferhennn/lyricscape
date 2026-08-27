"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { useSceneFrame } from "./frame-context";
import type { QualityProfile } from "@/lib/visuals/quality";

export function PostFX({ profile, reduced }: { profile: QualityProfile; reduced: boolean }) {
  const frame = useSceneFrame();
  const ca = useRef<{ offset: THREE.Vector2 } | null>(null);

  useFrame(() => {
    const { timeline } = frame.current;
    if (ca.current) {
      const amt = reduced ? 0 : 0.0004 + timeline.transitionPulse * 0.0016;
      ca.current.offset.set(amt, amt);
    }
  });

  const effects = [
    <Vignette key="vig" eskil={false} offset={0.18} darkness={0.72} />,
    <Noise key="noise" opacity={0.03} blendFunction={BlendFunction.OVERLAY} />,
  ];

  if (profile.postprocessing) {
    if (profile.bloom) {
      effects.unshift(
        <Bloom
          key="bloom"
          intensity={0.8}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.9}
          mipmapBlur
        />,
      );
    }
    if (profile.chromaticAberration && !reduced) {
      effects.unshift(
        <ChromaticAberration
          key="ca"
          ref={ca as never}
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0005, 0.0005)}
          radialModulation={false}
          modulationOffset={0}
        />,
      );
    }
  }

  return (
    <EffectComposer multisampling={profile.level === "high" ? 2 : 0}>{effects}</EffectComposer>
  );
}
