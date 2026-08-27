"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneFrame } from "./frame-context";
import { SCENE_COMPONENTS, type SceneProps } from "./scenes";
import type { AccentPalette, VisualSceneType } from "@/types";

interface Props {
  palette: AccentPalette;
  reduced: boolean;
  detail: number;
}

interface TransitionState {
  current: VisualSceneType;
  previous: VisualSceneType | null;
  mix: number; // 0..1, 1 => current fully shown
}

/**
 * Cross-fades between visual scenes as the timeline's `scene` field changes.
 * Re-renders only during the ~1.6s fade; steady state is render-free.
 */
export function SceneManager({ palette, reduced, detail }: Props) {
  const frame = useSceneFrame();
  const [t, setT] = useState<TransitionState>({
    current: frame.current.timeline.scene,
    previous: null,
    mix: 1,
  });

  useFrame((_, dt) => {
    const target = frame.current.timeline.scene;
    if (target !== t.current) {
      setT({ current: target, previous: t.current, mix: 0 });
      return;
    }
    if (t.mix < 1) {
      const next = Math.min(1, t.mix + dt / 1.6);
      setT((s) => ({ ...s, mix: next, previous: next >= 1 ? null : s.previous }));
    }
  });

  const Current = SCENE_COMPONENTS[t.current];
  const Previous = t.previous ? SCENE_COMPONENTS[t.previous] : null;
  const shared: Omit<SceneProps, "opacity"> = { palette, reduced, detail };

  return (
    <group>
      {Previous && <Previous {...shared} opacity={1 - t.mix} />}
      <Current {...shared} opacity={t.previous ? t.mix : 1} />
    </group>
  );
}
