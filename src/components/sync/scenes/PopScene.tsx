"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { useAudio } from "../AudioProvider";

/**
 * ── Pop ───────────────────────────────────────────────────────────────────
 * A resonator: a ring of light bars stood up by the spectrum, around a core
 * that spikes on the beat, shot through heavy bloom and chromatic aberration.
 * Built for pop / electronic / hip-hop — every beat kicks the camera in,
 * punches the bars up off a floor and notches the ring around; a drop flips
 * the palette, blows out the bloom and shears the whole frame with colour.
 */

const COUNT = 72;
const RADIUS = 4.6;

// compact 3D value noise for the core displacement
const NOISE = /* glsl */ `
vec3 h3(vec3 p){
  p = vec3(dot(p,vec3(127.1,311.7,74.7)),
           dot(p,vec3(269.5,183.3,246.1)),
           dot(p,vec3(113.5,271.9,124.6)));
  return fract(sin(p)*43758.5453123);
}
float n3(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  float n000 = dot(h3(i+vec3(0.0,0.0,0.0))-0.5, f-vec3(0.0,0.0,0.0));
  float n100 = dot(h3(i+vec3(1.0,0.0,0.0))-0.5, f-vec3(1.0,0.0,0.0));
  float n010 = dot(h3(i+vec3(0.0,1.0,0.0))-0.5, f-vec3(0.0,1.0,0.0));
  float n110 = dot(h3(i+vec3(1.0,1.0,0.0))-0.5, f-vec3(1.0,1.0,0.0));
  float n001 = dot(h3(i+vec3(0.0,0.0,1.0))-0.5, f-vec3(0.0,0.0,1.0));
  float n101 = dot(h3(i+vec3(1.0,0.0,1.0))-0.5, f-vec3(1.0,0.0,1.0));
  float n011 = dot(h3(i+vec3(0.0,1.0,1.0))-0.5, f-vec3(0.0,1.0,1.0));
  float n111 = dot(h3(i+vec3(1.0,1.0,1.0))-0.5, f-vec3(1.0,1.0,1.0));
  return 0.5 + mix(mix(mix(n000,n100,u.x), mix(n010,n110,u.x), u.y),
                   mix(mix(n001,n101,u.x), mix(n011,n111,u.x), u.y), u.z);
}
float fbm3(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*n3(p); p*=2.03; a*=0.5; } return v; }
`;

const CORE_VERT = /* glsl */ `
uniform float uTime, uBass, uPulse, uSpike;
varying float vD;
varying vec3 vN;
${NOISE}
void main(){
  float n = fbm3(normalize(position) * 2.4 + uTime * 0.5);
  float d = (n - 0.5) * (0.35 + uBass * 0.9 + uPulse * 0.7) + uSpike * n;
  vec3 p = position + normal * d;
  vD = d;
  vN = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const CORE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColA, uColB;
uniform float uPulse, uFade;
varying float vD;
varying vec3 vN;
void main(){
  float rim = pow(1.0 - abs(normalize(vN).z), 2.0);
  vec3 col = mix(uColA, uColB, clamp(vD * 2.0 + 0.5, 0.0, 1.0));
  col += rim * 1.5;
  col += uPulse * 0.6;
  gl_FragColor = vec4(col * uFade, 1.0);
}
`;

function makeBarsGeo() {
  const geo = new THREE.BoxGeometry(0.16, 1, 0.16);
  geo.translate(0, 0.5, 0); // grow upward from the base
  return geo;
}

function makeCoreUniforms() {
  return {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uPulse: { value: 0 },
    uSpike: { value: 0 },
    uFade: { value: 0 },
    uColA: { value: new THREE.Color("#ff2d6f") },
    uColB: { value: new THREE.Color("#37e6ff") },
  };
}

export function PopScene() {
  const { bandsRef } = useAudio();
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const ringRef = useRef<THREE.Group>(null);
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const coreMatRef = useRef<THREE.ShaderMaterial>(null);
  const caRef = useRef<{ offset: THREE.Vector2 } | null>(null);
  const bloomRef = useRef<{ intensity: number } | null>(null);

  const acc = useRef({ spin: 0, hue: 0, t: 0, colorInit: false });
  const heights = useRef(new Float32Array(COUNT));

  const barsGeo = useMemo(() => makeBarsGeo(), []);
  const barsMat = useMemo(
    () => new THREE.MeshBasicMaterial({ toneMapped: false }),
    [],
  );
  const coreUniforms = useMemo(() => makeCoreUniforms(), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const a0 = acc.current;
    a0.t += dt;
    const b = bandsRef.current;
    const hit = Math.max(b.pulse, b.beat);
    const bars = barsRef.current;
    const h = heights.current;

    // ── bars ────────────────────────────────────────────────────────────
    if (bars) {
      const spec = b.spectrum;
      const floor = 0.15 + hit * 0.9 + b.drop * 0.6;
      a0.spin += dt * (0.15 + b.dynamics * 0.6) + hit * 0.04;
      a0.hue += dt * 0.03 + b.drop * 0.1;
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      for (let i = 0; i < COUNT; i++) {
        const bin = spec[Math.round((i / COUNT) * (spec.length - 1))] || 0;
        const target = 0.2 + Math.pow(bin, 0.75) * 3.4 + floor;
        h[i] += (target - h[i]) * 0.3;
        const a = (i / COUNT) * Math.PI * 2 + a0.spin;
        dummy.position.set(Math.cos(a) * RADIUS, 0, Math.sin(a) * RADIUS);
        dummy.rotation.y = -a;
        dummy.scale.set(1, h[i], 1);
        dummy.updateMatrix();
        bars.setMatrixAt(i, dummy.matrix);
        col.setHSL((i / COUNT + a0.hue + b.drop * 0.5) % 1, 0.85, 0.5 + hit * 0.25);
        bars.setColorAt(i, col);
      }
      bars.instanceMatrix.needsUpdate = true;
      if (bars.instanceColor) bars.instanceColor.needsUpdate = true;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = Math.sin(a0.t * 0.1) * 0.05;
      ringRef.current.position.y = -1.1 + hit * 0.15;
    }

    // ── core ────────────────────────────────────────────────────────────
    const cm = coreMatRef.current;
    if (cm) {
      const cu = cm.uniforms;
      cu.uTime.value = a0.t;
      cu.uBass.value = b.bass;
      cu.uPulse.value = hit;
      cu.uSpike.value += (hit * 0.9 - cu.uSpike.value) * 0.4;
      cu.uFade.value = Math.min(1, cu.uFade.value + dt / 1.1);
      (cu.uColA.value as THREE.Color).setHSL(
        (0.92 + b.brightness * 0.1 + b.drop * 0.4) % 1,
        0.85,
        0.55,
      );
      (cu.uColB.value as THREE.Color).setHSL(
        (0.52 + b.brightness * 0.15 + b.drop * 0.4) % 1,
        0.9,
        0.6,
      );
    }

    // ── camera: orbit + beat punch-in + drop dolly ──────────────────────
    if (camRef.current) {
      const cam = camRef.current;
      const orb = a0.t * 0.1;
      const dist = 13 - hit * 0.9 - b.drop * 2.0;
      cam.position.set(
        Math.cos(orb) * dist,
        4.2 + Math.sin(a0.t * 0.15) * 0.8,
        Math.sin(orb) * dist,
      );
      cam.lookAt(0, 1.2, 0);
      cam.fov = 46 - hit * 4 - b.drop * 3;
      cam.updateProjectionMatrix();
    }

    // ── post ────────────────────────────────────────────────────────────
    if (caRef.current) {
      const amt = 0.0006 + hit * 0.002 + b.drop * 0.006;
      caRef.current.offset.set(amt, amt);
    }
    if (bloomRef.current) {
      bloomRef.current.intensity = 0.9 + hit * 0.8 + b.drop * 1.6;
    }
  });

  return (
    <>
      <color attach="background" args={["#050308"]} />
      <PerspectiveCamera ref={camRef} makeDefault fov={46} position={[0, 4.2, 13]} />

      <group ref={ringRef} position={[0, -1.1, 0]}>
        <instancedMesh
          ref={barsRef}
          args={[barsGeo, barsMat, COUNT]}
          frustumCulled={false}
        />
      </group>

      <mesh>
        <icosahedronGeometry args={[1.35, 4]} />
        <shaderMaterial
          ref={coreMatRef}
          vertexShader={CORE_VERT}
          fragmentShader={CORE_FRAG}
          uniforms={coreUniforms}
          wireframe
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <EffectComposer>
        <Bloom
          ref={bloomRef as never}
          intensity={1.1}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          ref={caRef as never}
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0006, 0.0006)}
          radialModulation={false}
          modulationOffset={0}
        />
        <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
        <Vignette eskil={false} offset={0.15} darkness={0.85} />
      </EffectComposer>
    </>
  );
}
