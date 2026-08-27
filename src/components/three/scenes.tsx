"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneFrame } from "./frame-context";
import type { AccentPalette, VisualSceneType } from "@/types";
import { mulberry32 } from "@/lib/utils";

export interface SceneProps {
  opacity: number;
  palette: AccentPalette;
  reduced: boolean;
  detail: number;
}

/* -------------------------------------------------------------------------- */
/* STARS                                                                      */
/* -------------------------------------------------------------------------- */
export function StarsScene({ opacity, palette, detail }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const frame = useSceneFrame();
  const count = Math.round(1400 * detail);

  const geo = useMemo(() => {
    const rand = mulberry32(88);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 12 + rand() * 26;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph) - 10;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useFrame((_, dt) => {
    if (!group.current) return;
    const { timeline } = frame.current;
    group.current.rotation.y += dt * (0.006 + timeline.intensity * 0.02);
    group.current.rotation.x += dt * 0.002;
  });

  return (
    <group ref={group}>
      <points geometry={geo} frustumCulled={false}>
        <pointsMaterial
          size={0.06}
          color={palette.light}
          transparent
          opacity={opacity * 0.9}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <mesh position={[0, 0, -14]}>
        <sphereGeometry args={[9, 32, 32]} />
        <meshBasicMaterial
          color={palette.deep}
          side={THREE.BackSide}
          transparent
          opacity={opacity * 0.5}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* VOID                                                                       */
/* -------------------------------------------------------------------------- */
export function VoidScene({ opacity, palette, detail }: SceneProps) {
  const frame = useSceneFrame();
  const rings = useRef<THREE.Group>(null);
  const count = Math.round(700 * detail);

  const geo = useMemo(() => {
    const rand = mulberry32(191);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 20;
      pos[i * 3 + 1] = (rand() - 0.5) * 14;
      pos[i * 3 + 2] = (rand() - 0.5) * 16 - 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useFrame((_, dt) => {
    if (!rings.current) return;
    rings.current.rotation.z += dt * 0.05 * (0.4 + frame.current.timeline.intensity);
  });

  return (
    <group>
      <points geometry={geo} frustumCulled={false}>
        <pointsMaterial
          size={0.045}
          color={palette.accent}
          transparent
          opacity={opacity * 0.7}
          depthWrite={false}
        />
      </points>
      <group ref={rings} position={[0, 0, -3]}>
        {[3.5, 5, 6.8].map((r, i) => (
          <mesh key={i} rotation={[Math.PI / 2 + i * 0.3, i * 0.4, 0]}>
            <torusGeometry args={[r, 0.008, 8, 120]} />
            <meshBasicMaterial
              color={palette.secondary}
              transparent
              opacity={opacity * (0.35 - i * 0.08)}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* DARK ROOM                                                                  */
/* -------------------------------------------------------------------------- */
export function RoomScene({ opacity, palette }: SceneProps) {
  const frame = useSceneFrame();
  const light = useRef<THREE.SpotLight>(null);
  const dust = useRef<THREE.Points>(null);

  const dustGeo = useMemo(() => {
    const rand = mulberry32(55);
    const n = 240;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rand() - 0.5) * 8;
      pos[i * 3 + 1] = (rand() - 0.5) * 6;
      pos[i * 3 + 2] = (rand() - 0.5) * 6 - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((state, dt) => {
    if (light.current) {
      light.current.intensity = 1.5 + frame.current.timeline.intensity * 3;
    }
    if (dust.current) {
      dust.current.rotation.y += dt * 0.02;
      dust.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
    }
  });

  return (
    <group>
      {/* room shell */}
      <mesh position={[0, 0, -6]}>
        <boxGeometry args={[24, 16, 24]} />
        <meshStandardMaterial
          color={palette.deep}
          side={THREE.BackSide}
          roughness={1}
          metalness={0}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* window */}
      <mesh position={[0, 0.5, -17.6]}>
        <planeGeometry args={[4.5, 7]} />
        <meshBasicMaterial color={palette.light} transparent opacity={opacity * 0.9} />
      </mesh>
      <spotLight
        ref={light}
        position={[0, 1, -16]}
        target-position={[0, 0, 2]}
        angle={0.5}
        penumbra={1}
        distance={40}
        color={palette.accent}
      />
      <ambientLight intensity={0.06} />
      <points ref={dust} geometry={dustGeo} frustumCulled={false}>
        <pointsMaterial
          size={0.03}
          color={palette.light}
          transparent
          opacity={opacity * 0.5}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* HALLWAY                                                                    */
/* -------------------------------------------------------------------------- */
export function HallwayScene({ opacity, palette, detail }: SceneProps) {
  const frame = useSceneFrame();
  const group = useRef<THREE.Group>(null);
  const frames = Math.round(14 * Math.max(0.5, detail));

  useFrame((_, dt) => {
    if (!group.current) return;
    const speed = 1.2 + frame.current.timeline.intensity * 2;
    for (const child of group.current.children) {
      child.position.z += dt * speed;
      if (child.position.z > 6) child.position.z -= frames * 3;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 2, 2]} intensity={2} color={palette.accent} distance={20} />
      <group ref={group}>
        {Array.from({ length: frames }).map((_, i) => (
          <mesh key={i} position={[0, 0, -i * 3]}>
            <torusGeometry args={[3.4, 0.12, 4, 4]} />
            <meshStandardMaterial
              color={palette.secondary}
              emissive={palette.deep}
              roughness={0.7}
              transparent
              opacity={opacity}
            />
          </mesh>
        ))}
      </group>
      <mesh position={[0, -3.4, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 60]} />
        <meshStandardMaterial color={palette.deep} roughness={0.4} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* OCEAN                                                                      */
/* -------------------------------------------------------------------------- */
const oceanVert = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying float vH;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.4 + uTime) * 0.3 + cos(p.y * 0.3 - uTime * 0.8) * 0.3;
    w += sin(p.x * 1.2 + p.y * 0.7 + uTime * 1.6) * 0.12 * (1.0 + uIntensity);
    p.z += w;
    vH = w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const oceanFrag = /* glsl */ `
  precision mediump float;
  uniform vec3 uDeep;
  uniform vec3 uAccent;
  uniform float uOpacity;
  varying float vH;
  void main() {
    float m = smoothstep(-0.4, 0.5, vH);
    vec3 c = mix(uDeep, uAccent, m * 0.5);
    gl_FragColor = vec4(c, uOpacity);
  }
`;

export function OceanScene({ opacity, palette, detail }: SceneProps) {
  const frame = useSceneFrame();
  const mat = useRef<THREE.ShaderMaterial>(null);
  const seg = Math.round(80 * Math.max(0.4, detail));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.3 },
      uDeep: { value: new THREE.Color(palette.deep) },
      uAccent: { value: new THREE.Color(palette.accent) },
      uOpacity: { value: opacity },
    }),
    [palette.deep, palette.accent, opacity],
  );

  useFrame((_, dt) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value += dt * 0.6;
    mat.current.uniforms.uIntensity.value = frame.current.timeline.intensity;
    mat.current.uniforms.uOpacity.value = opacity;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2.1, 0, 0]} position={[0, -3, -4]}>
        <planeGeometry args={[60, 60, seg, seg]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={oceanVert}
          fragmentShader={oceanFrag}
          transparent
          wireframe={false}
        />
      </mesh>
      <pointLight position={[0, 4, 6]} intensity={1.5} color={palette.accent} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* SMOKE                                                                      */
/* -------------------------------------------------------------------------- */
export function SmokeScene({ opacity, palette, detail }: SceneProps) {
  const frame = useSceneFrame();
  const group = useRef<THREE.Group>(null);
  const n = Math.max(3, Math.round(7 * detail));

  const planes = useMemo(() => {
    const rand = mulberry32(321);
    return Array.from({ length: n }, () => ({
      pos: [(rand() - 0.5) * 10, (rand() - 0.5) * 6, -2 - rand() * 6] as [number, number, number],
      rot: rand() * Math.PI,
      scale: 4 + rand() * 6,
      speed: 0.02 + rand() * 0.05,
    }));
  }, [n]);

  useFrame((_, dt) => {
    if (!group.current) return;
    const boost = 0.5 + frame.current.timeline.intensity;
    group.current.children.forEach((c, i) => {
      c.rotation.z += dt * planes[i].speed * boost;
    });
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.2} color={palette.accent} />
      {planes.map((pl, i) => (
        <mesh key={i} position={pl.pos} rotation={[0, 0, pl.rot]} scale={pl.scale}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial
            color={i % 2 ? palette.secondary : palette.deep}
            transparent
            opacity={opacity * 0.12}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */

export const SCENE_COMPONENTS: Record<VisualSceneType, (p: SceneProps) => React.ReactNode> = {
  stars: StarsScene,
  void: VoidScene,
  room: RoomScene,
  hallway: HallwayScene,
  ocean: OceanScene,
  smoke: SmokeScene,
};
