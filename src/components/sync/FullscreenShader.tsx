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

// three's ShaderMaterial prelude declares `attribute vec3 position`, so slice .xy.
const VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

type SceneUniforms = ReactiveUniforms & Record<string, THREE.IUniform>;

type Props = {
  /** Fragment shader body. Must define `void main()` and may use REACTIVE_GLSL helpers. */
  frag: string;
  /** Extra uniforms merged into the reactive block. */
  uniforms?: Record<string, THREE.IUniform>;
  /** Called every frame after reactive uniforms are pushed. */
  onFrame?: (u: SceneUniforms, dt: number) => void;
};

export function FullscreenShader({ frag, uniforms: extra, onFrame }: Props) {
  const size = useThree((s) => s.size);
  const { bandsRef } = useAudio();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // Created once. Only ever mutated later through `matRef`, never here.
  const uniforms = useMemo(
    () => ({ ...makeReactiveUniforms(), ...(extra ?? {}) }) as SceneUniforms,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fragment = useMemo(
    () => `precision highp float;\nvarying vec2 vUv;\n${REACTIVE_GLSL}\n${frag}`,
    [frag],
  );

  useEffect(() => {
    const u = matRef.current?.uniforms as SceneUniforms | undefined;
    u?.uRes.value.set(size.width, size.height);
  }, [size]);

  useEffect(() => {
    const mat = matRef.current;
    return () => {
      const u = mat?.uniforms as SceneUniforms | undefined;
      (u?.uWave.value as THREE.DataTexture | undefined)?.dispose();
      (u?.uSpec.value as THREE.DataTexture | undefined)?.dispose();
    };
  }, []);

  useFrame((_, dt) => {
    const mat = matRef.current;
    if (!mat) return;
    const u = mat.uniforms as SceneUniforms;
    const bands = bandsRef.current;
    pushReactiveUniforms(u, bands, bands.time);
    u.uFade.value = Math.min(1, u.uFade.value + dt / 1.1);
    onFrame?.(u, dt);
  });

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  );
}
