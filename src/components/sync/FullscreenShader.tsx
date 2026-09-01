"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useAudio } from "./AudioProvider";
import {
  makeReactiveUniforms,
  pushReactiveUniforms,
  REACTIVE_GLSL,
  type ReactiveUniforms,
} from "./reactive-uniforms";

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

type Props = {
  /** Fragment shader body. Must define `void main()` and may use REACTIVE_GLSL helpers. */
  frag: string;
  /** Extra uniforms merged into the reactive block. */
  uniforms?: Record<string, THREE.IUniform>;
  /** Called every frame after reactive uniforms are pushed. */
  onFrame?: (u: ReactiveUniforms & Record<string, THREE.IUniform>, dt: number) => void;
};

export function FullscreenShader({ frag, uniforms, onFrame }: Props) {
  const size = useThree((s) => s.size);
  const { bandsRef } = useAudio();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uni = useMemo(() => {
    return { ...makeReactiveUniforms(), ...(uniforms ?? {}) } as ReactiveUniforms &
      Record<string, THREE.IUniform>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    uni.uRes.value.set(size.width, size.height);
  }, [size, uni]);

  const fragment = useMemo(
    () => `precision highp float;\nvarying vec2 vUv;\n${REACTIVE_GLSL}\n${frag}`,
    [frag],
  );

  useFrame((_, dt) => {
    const bands = bandsRef.current;
    pushReactiveUniforms(uni, bands, bands.time);
    uni.uFade.value = Math.min(1, uni.uFade.value + dt / 1.1);
    onFrame?.(uni, dt);
  });

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={fragment}
        uniforms={uni}
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  );
}
