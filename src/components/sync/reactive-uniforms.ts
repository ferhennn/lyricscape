import * as THREE from "three";
import type { Bands } from "@/lib/audio/reactive-engine";

/**
 * The uniform block every sync scene shares. Scenes add their own on top.
 * `uWave` / `uSpec` are handed over as DataTextures so a fragment shader can
 * sample them at any resolution without a 128-wide uniform array.
 */
export type ReactiveUniforms = ReturnType<typeof makeReactiveUniforms>;

export function makeReactiveUniforms() {
  const waveTex = new THREE.DataTexture(
    new Float32Array(128),
    128,
    1,
    THREE.RedFormat,
    THREE.FloatType,
  );
  // Float textures can't be linearly filtered everywhere — nearest is safe.
  waveTex.minFilter = THREE.NearestFilter;
  waveTex.magFilter = THREE.NearestFilter;
  waveTex.needsUpdate = true;

  const specTex = new THREE.DataTexture(
    new Float32Array(64),
    64,
    1,
    THREE.RedFormat,
    THREE.FloatType,
  );
  specTex.minFilter = THREE.NearestFilter;
  specTex.magFilter = THREE.NearestFilter;
  specTex.needsUpdate = true;

  return {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uLevel: { value: 0 },
    uEnergy: { value: 0 },
    uBeat: { value: 0 },
    uLoud: { value: 0 }, // auto-gained loudness
    uDynamics: { value: 0.5 }, // section energy: <0.5 quiet, >0.5 loud
    uDrop: { value: 0 }, // chorus / drop hit
    uBright: { value: 0.5 }, // spectral centroid
    uCalm: { value: 1 }, // 1 = sparse / gentle passage
    uFade: { value: 0 }, // 0 → 1 scene entrance / crossfade
    uRes: { value: new THREE.Vector2(1, 1) },
    uWave: { value: waveTex },
    uSpec: { value: specTex },
  };
}

/** Copy the latest band data into the uniform block. Call from useFrame. */
export function pushReactiveUniforms(
  u: ReactiveUniforms,
  bands: Bands,
  elapsed: number,
) {
  u.uTime.value = elapsed;
  u.uBass.value = bands.bass;
  u.uMid.value = bands.mid;
  u.uTreble.value = bands.treble;
  u.uLevel.value = bands.level;
  u.uEnergy.value = bands.energy;
  u.uBeat.value = bands.beat;
  u.uLoud.value = bands.loudNorm;
  u.uDynamics.value = bands.dynamics;
  u.uDrop.value = bands.drop;
  u.uBright.value = bands.brightness;
  u.uCalm.value = bands.calm;

  const wave = u.uWave.value as THREE.DataTexture;
  (wave.image.data as Float32Array).set(bands.waveform);
  wave.needsUpdate = true;

  const spec = u.uSpec.value as THREE.DataTexture;
  (spec.image.data as Float32Array).set(bands.spectrum);
  spec.needsUpdate = true;
}

/** GLSL helpers shared by the fragment shaders. */
export const REACTIVE_GLSL = /* glsl */ `
uniform float uTime, uBass, uMid, uTreble, uLevel, uEnergy, uBeat, uFade;
uniform float uLoud, uDynamics, uDrop, uBright, uCalm;
uniform vec2 uRes;
uniform sampler2D uWave, uSpec;

float wave(float x){ return texture2D(uWave, vec2(clamp(x,0.0,1.0), 0.5)).r; }
float spec(float x){ return texture2D(uSpec, vec2(clamp(x,0.0,1.0), 0.5)).r; }

mat2 rot(float a){ float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }

vec3 hash3(vec3 p){
  p = vec3(dot(p,vec3(127.1,311.7,74.7)),
           dot(p,vec3(269.5,183.3,246.1)),
           dot(p,vec3(113.5,271.9,124.6)));
  return fract(sin(p)*43758.5453123);
}

float noise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  float n000 = dot(hash3(i+vec3(0,0,0))-0.5, f-vec3(0,0,0));
  float n100 = dot(hash3(i+vec3(1,0,0))-0.5, f-vec3(1,0,0));
  float n010 = dot(hash3(i+vec3(0,1,0))-0.5, f-vec3(0,1,0));
  float n110 = dot(hash3(i+vec3(1,1,0))-0.5, f-vec3(1,1,0));
  float n001 = dot(hash3(i+vec3(0,0,1))-0.5, f-vec3(0,0,1));
  float n101 = dot(hash3(i+vec3(1,0,1))-0.5, f-vec3(1,0,1));
  float n011 = dot(hash3(i+vec3(0,1,1))-0.5, f-vec3(0,1,1));
  float n111 = dot(hash3(i+vec3(1,1,1))-0.5, f-vec3(1,1,1));
  return 0.5 + mix(mix(mix(n000,n100,u.x), mix(n010,n110,u.x), u.y),
                   mix(mix(n001,n101,u.x), mix(n011,n111,u.x), u.y), u.z);
}

float fbm(vec3 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
`;
