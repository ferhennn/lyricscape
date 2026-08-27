"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneFrame, pointer } from "./frame-context";
import { mulberry32 } from "@/lib/utils";

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPulse;
  uniform vec2 uPointer;
  attribute float aScale;
  attribute vec3 aSeed;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float t = uTime * 0.12;
    p.x += sin(t + aSeed.x * 6.2831) * (0.4 + aSeed.y);
    p.y += cos(t * 0.8 + aSeed.y * 6.2831) * (0.3 + aSeed.z) + t * 0.15 * aSeed.z;
    p.z += sin(t * 0.6 + aSeed.z * 6.2831) * 0.5;

    // wrap vertically
    p.y = mod(p.y + 6.0, 12.0) - 6.0;

    // pointer influence + pulse burst
    p.xy += uPointer * (0.6 + aScale) * 0.4;
    p += normalize(p + 0.001) * uPulse * (1.0 + aSeed.x) * 1.4;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aScale * (18.0 + uIntensity * 40.0);
    gl_PointSize = size / -mv.z;
    vAlpha = clamp(0.15 + uIntensity * 0.6, 0.05, 0.85) * (0.4 + aScale);
  }
`;

const fragment = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export function ParticleField({
  count = 2200,
  color = "#e8b98f",
}: {
  count?: number;
  color?: string;
}) {
  const frame = useSceneFrame();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, scales, seeds } = useMemo(() => {
    const rand = mulberry32(4211);
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 16;
      positions[i * 3 + 1] = (rand() - 0.5) * 12;
      positions[i * 3 + 2] = (rand() - 0.5) * 10 - 1;
      scales[i] = 0.15 + rand() * rand() * 1.1;
      seeds[i * 3] = rand();
      seeds[i * 3 + 1] = rand();
      seeds[i * 3 + 2] = rand();
    }
    return { positions, scales, seeds };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.3 },
      uPulse: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Color(color) },
    }),
    [color],
  );

  useFrame((_, dt) => {
    const m = matRef.current;
    if (!m) return;
    const { timeline } = frame.current;
    m.uniforms.uTime.value += dt;
    m.uniforms.uIntensity.value +=
      (timeline.intensity - m.uniforms.uIntensity.value) * Math.min(1, dt * 2);
    m.uniforms.uPulse.value +=
      (timeline.transitionPulse * 0.25 - m.uniforms.uPulse.value) * Math.min(1, dt * 6);
    m.uniforms.uPointer.value.set(pointer.x, -pointer.y);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
