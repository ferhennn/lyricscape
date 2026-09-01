"use client";

import { FullscreenShader } from "../FullscreenShader";

const FRAG = /* glsl */ `
// ── Smooth ─────────────────────────────────────────────────────────────────
// Slow-flowing fields of colour — silk / ink in water — for relaxed listening.
// Nothing snaps to the beat. The flow speed follows the section energy
// (uDynamics), the palette warms and brightens with the mix (uBright), the
// whole field breathes on the long swells (uLoud), and a chorus (uDrop) opens
// a slow wash of light. Calm passages (uCalm) slow it further and desaturate.

float n2(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453);
  float b = fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5453);
  float c = fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5453);
  float d = fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5453);
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm2(vec2 p){
  float v=0.0, a=0.55;
  for(int i=0;i<6;i++){ v+=a*n2(p); p=p*1.9+vec2(1.7,-2.3); a*=0.5; }
  return v;
}

vec3 ramp(float x){
  x = clamp(x, 0.0, 1.0);
  // deep indigo → petrol → rose → warm sand : a calm, wide gradient
  vec3 c0 = vec3(0.06, 0.08, 0.20);
  vec3 c1 = vec3(0.10, 0.34, 0.42);
  vec3 c2 = vec3(0.55, 0.32, 0.48);
  vec3 c3 = vec3(0.95, 0.78, 0.62);
  vec3 a = mix(c0, c1, smoothstep(0.0, 0.4, x));
  vec3 b = mix(c2, c3, smoothstep(0.55, 1.0, x));
  return mix(a, b, smoothstep(0.3, 0.7, x));
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float calm = clamp(uCalm, 0.0, 1.0);
  float rate = mix(0.10, 0.028, calm) * (0.7 + uDynamics*0.9);
  float t = uTime * rate;

  // breathing zoom on the long swells
  float breathe = 1.0 - (uLoud*0.06 + uDrop*0.05);
  p *= breathe;

  // two-stage domain warp for that liquid-silk fold
  vec2 q = vec2(
    fbm2(p*1.3 + vec2(0.0, t)),
    fbm2(p*1.3 + vec2(3.2, -t*0.8))
  );
  vec2 r = vec2(
    fbm2(p*1.6 + 2.4*q + vec2(1.7, 9.2) + t*0.5),
    fbm2(p*1.6 + 2.4*q + vec2(8.3, 2.8) - t*0.4)
  );
  float f = fbm2(p*1.2 + 3.0*r + t*0.3);

  // very soft waveform ripple, wide and slow
  f += (wave(fract(uv.x*0.5 + t*0.1)) - 0.0) * 0.05 * uMid;

  float shade = f + (uv.y - 0.5)*0.25 + uEnergy*0.15;
  vec3 col = ramp(shade + uBright*0.15);

  // gentle iridescent banding in the folds
  float bands = 0.5 + 0.5*sin(f*10.0 + t*2.0 + uBright*3.0);
  col += ramp(shade + 0.2).zyx * bands * 0.06 * (0.4 + uEnergy);

  // chorus wash — a slow diagonal sweep of light
  float sweep = smoothstep(0.9, 0.0, abs(dot(uv, vec2(0.7,0.7)) - fract(uTime*0.05)*1.4));
  col += ramp(0.8) * sweep * uDrop * 0.25;

  // desaturate + settle in the calmest passages
  float lum = dot(col, vec3(0.299,0.587,0.114));
  col = mix(col, vec3(lum), calm*0.25);

  // soft vignette
  col *= 1.0 - dot(p,p)*0.10;

  col += uLoud*0.03;
  col = 1.0 - exp(-col*1.5);
  col = pow(col, vec3(0.92));
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function SmoothScene() {
  return <FullscreenShader frag={FRAG} />;
}
