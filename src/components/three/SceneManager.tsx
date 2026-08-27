"use client";

import { useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
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
 * A persistent deep backdrop sits behind every scene so the screen never drops
 * to black mid-transition. Re-renders only during the ~1.6s fade.
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

  // Overlapped fade: incoming rises fast, outgoing holds then falls — so total
  // coverage never dips and no black shows through.
  const inOpacity = t.previous ? Math.min(1, t.mix * 1.9) : 1;
  const outOpacity = Math.max(0, 1 - Math.max(0, t.mix - 0.3) * 1.7);

  const deep = useMemo(() => new THREE.Color(palette.deep), [palette.deep]);

  return (
    <group>
      {/* persistent ground — always fully opaque, so a transition never shows black */}
      <mesh scale={80} renderOrder={-10}>
        <sphereGeometry args={[1, 40, 24]} />
        <meshBasicMaterial color={deep} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      {Previous && <Previous {...shared} opacity={outOpacity} />}
      <Current {...shared} opacity={inOpacity} />
    </group>
  );
}
