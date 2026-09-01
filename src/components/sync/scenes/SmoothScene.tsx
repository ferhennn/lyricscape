"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { useAudio } from "../AudioProvider";

/**
 * ── Smooth ────────────────────────────────────────────────────────────────
 * A Rutt-Etra scanline landscape — the sound sculpted into a ridge of light
 * that scrolls away into the dark, one line per frame of history. Inspired by
 * the Rutt-Etra video synthesiser and the "Unknown Pleasures" plot. Calm by
 * design: the ridge height follows loudness, the scroll slows right down in
 * sparse passages, the palette warms with the mix, and every beat sends one
 * soft swell along the front edge.
 */

const COLS = 128;
const ROWS = 110;
const WIDTH = 17;
const DEPTH = 13;

const VERT = /* glsl */ `
uniform sampler2D uHist;
uniform float uAmp, uPulse, uFade;
varying float vH;
varying vec2 vGrid;
void main(){
  vGrid = uv;
  float h = texture2D(uHist, uv).r;
  vH = h;
  vec3 p = position;
  p.y += h * uAmp;
  // horizon: far rows settle downward so the ridge reads as terrain
  p.y -= pow(uv.y, 2.0) * 1.6;
  // a soft swell travelling along the newest row on each beat
  p.y += uPulse * 0.5 * exp(-uv.y * 40.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec3 uLow, uHigh;
uniform float uPulse, uFade;
varying float vH;
varying vec2 vGrid;
void main(){
  vec3 col = mix(uLow, uHigh, clamp(vH * 1.6, 0.0, 1.0));
  col += uLow * 0.6;                                   // floor so flat lines read
  float depth = mix(1.0, 0.12, vGrid.y);               // dim into the distance
  col *= depth * 1.7;
  col += uHigh * uPulse * 0.5 * smoothstep(0.16, 0.0, vGrid.y);
  gl_FragColor = vec4(col * uFade, 1.0);
}
`;

function buildLineGrid() {
  const segsPerRow = COLS - 1;
  const count = ROWS * segsPerRow * 2;
  const pos = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    const v = r / (ROWS - 1);
    const z = (v - 0.5) * DEPTH;
    for (let c = 0; c < segsPerRow; c++) {
      for (let k = 0; k < 2; k++) {
        const cc = c + k;
        const u = cc / (COLS - 1);
        pos[i * 3] = (u - 0.5) * WIDTH;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = z;
        uv[i * 2] = u;
        uv[i * 2 + 1] = v;
        i++;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function makeUniforms() {
  // RGBA/UnsignedByte — the one texture format guaranteed everywhere.
  const data = new Uint8Array(COLS * ROWS * 4);
  const tex = new THREE.DataTexture(data, COLS, ROWS);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return {
    uHist: { value: tex },
    uAmp: { value: 2.2 },
    uPulse: { value: 0 },
    uFade: { value: 0 },
    uLow: { value: new THREE.Color("#1b2f6b") },
    uHigh: { value: new THREE.Color("#f2ddc2") },
  };
}

export function SmoothScene() {
  const { bandsRef } = useAudio();
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const scroll = useRef(0);
  const sway = useRef(0);

  const geometry = useMemo(() => buildLineGrid(), []);
  const uniforms = useMemo(() => makeUniforms(), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const mat = matRef.current;
    if (!mat) return;
    const u = mat.uniforms;
    const b = bandsRef.current;
    const activity = 1 - b.calm;

    const amp = 1.1 + b.loudNorm * 2.4 + b.energy * 2.0 + b.drop * 1.2;
    u.uAmp.value += (amp - u.uAmp.value) * 0.05;
    u.uPulse.value = b.pulse;
    u.uFade.value = Math.min(1, u.uFade.value + dt / 1.3);

    (u.uLow.value as THREE.Color).setHSL(
      0.62 - (0.15 + b.brightness * 0.7) * 0.12,
      0.55,
      0.16 + b.energy * 0.05,
    );
    (u.uHigh.value as THREE.Color).setHSL(0.09 + b.brightness * 0.04, 0.35, 0.78);

    // scroll the history: rows/sec slows right down when the track is sparse
    const rowsPerSec = THREE.MathUtils.lerp(7, 26, activity * (0.5 + b.dynamics));
    scroll.current += dt * rowsPerSec;
    const tex = u.uHist.value as THREE.DataTexture;
    const data = tex.image.data as Uint8Array;
    let dirty = false;
    while (scroll.current >= 1) {
      scroll.current -= 1;
      dirty = true;
      const row = COLS * 4;
      data.copyWithin(row, 0, row * (ROWS - 1)); // push history back one row
      const spec = b.spectrum;
      const wave = b.waveform;
      for (let c = 0; c < COLS; c++) {
        const t = c / COLS;
        const s = spec[Math.min(spec.length - 1, Math.floor(t * spec.length))];
        const w = Math.abs(
          wave[Math.min(wave.length - 1, Math.floor(t * wave.length))],
        );
        const h = Math.sqrt(s) * 0.85 + w * 0.15;
        data[c * 4] = Math.max(0, Math.min(255, h * 255));
        data[c * 4 + 3] = 255;
      }
    }
    if (dirty) tex.needsUpdate = true;

    sway.current += dt;
    if (camRef.current) {
      camRef.current.position.x = Math.sin(sway.current * 0.06) * 1.1;
      camRef.current.position.y = 3.4 + Math.sin(sway.current * 0.05) * 0.3;
      camRef.current.lookAt(0, 0.4, -1.5);
    }
  });

  return (
    <>
      <color attach="background" args={["#04040c"]} />
      <PerspectiveCamera ref={camRef} makeDefault fov={56} position={[0, 3.4, 7.2]} />
      <lineSegments geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <EffectComposer>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.12}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.82} />
      </EffectComposer>
    </>
  );
}
