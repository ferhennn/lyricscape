"use client";

import { FullscreenShader } from "../FullscreenShader";

const FRAG = /* glsl */ `
// ── Soothing ───────────────────────────────────────────────────────────────
// Slow aurora curtains for ambient, acoustic, downtempo. Motion scales down as
// the track gets sparser (uCalm), the veil rises on the loud swells (uLoud),
// and a chorus lift (uDrop) sends one gentle wave of brightness through it.
// Beats are barely felt — this is for listening, not dancing.

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
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*n2(p); p*=2.0; a*=0.5; }
  return v;
}

vec3 pal(float t){
  // teal → green → soft violet → dusk rose, nudged warmer when the mix is bright
  vec3 cool = 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.30,0.55) + t) + vec3(0.4,2.0,4.2));
  vec3 warm = 0.5 + 0.5*cos(6.2831*(vec3(0.05,0.22,0.40) + t) + vec3(0.9,1.6,3.0));
  return mix(cool, warm, clamp(uBright, 0.0, 1.0));
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  // slower when the passage is calm; never fast
  float rate = mix(0.11, 0.05, clamp(uCalm, 0.0, 1.0));
  float t = uTime * rate;

  vec3 col = mix(vec3(0.02,0.03,0.055), vec3(0.05,0.03,0.08), uv.y);
  float star = step(0.9982, n2(uv*vec2(uRes.x,uRes.y)*0.32));
  col += vec3(0.55,0.65,0.85) * star * (0.3 + 0.5*sin(uTime*0.8 + uv.x*60.0));

  float pulse = uPulse;
  float swell = uLoud*0.5 + uEnergy*0.9 + uDrop*0.6 + pulse*0.5;

  const int LAYERS = 5;
  for(int i=0;i<LAYERS;i++){
    float fi = float(i);
    float depth = fi / float(LAYERS);

    float x = p.x*0.75 + t*(0.22 + depth*0.35) + fi*1.9;

    // gentle folds — amplitude shrinks in calm passages, no waveform jitter
    float amp = mix(0.18, 0.30, 1.0 - clamp(uCalm,0.0,1.0));
    float fold =
        sin(x*1.1 + t*0.6) * 0.13
      + sin(x*2.1 + t*1.4) * 0.06
      + (fbm2(vec2(x*0.45, t*1.1 + fi)) - 0.5) * amp
      + (wave(fract(x*0.12)) - 0.0) * uMid * 0.12;

    float centre = 0.12 - depth*0.32 + fold + swell*0.12;

    float width = 0.055 + uMid*0.03 + depth*0.07 + uDrop*0.02;
    float d = (p.y - centre) / width;
    float sheet = exp(-d*d);

    float rays = fbm2(vec2(x*2.2, p.y*1.6 - t*2.2));
    sheet *= 0.6 + 0.7*rays;
    sheet *= smoothstep(-0.55, 0.2, p.y - centre + 0.18);

    vec3 c = pal(depth*0.4 + uEnergy*0.2 + t*0.35 + uBright*0.25);
    float bright = (0.42 + swell*0.9) * (1.0 - depth*0.5);
    col += c * sheet * bright * 0.5;
  }

  col += pal(uEnergy*0.3) * smoothstep(0.0, -0.6, p.y) * 0.05 * (0.4 + swell);

  // a single soft bloom across the whole sky on a chorus lift
  col += pal(0.6) * uDrop * 0.12;

  // every beat: a band of light that rises through the sky in time with it
  float band = exp(-pow((uv.y - mix(0.1, 0.95, uPhase)) * 5.0, 2.0));
  col += pal(0.35 + uBright*0.3) * band * pulse * 0.16;
  // and a whole-frame lift so the beat always reads
  col += pal(0.5) * pulse * 0.05;

  col = 1.0 - exp(-col * 1.6);
  col = pow(col, vec3(0.9));
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function SoothingScene() {
  return <FullscreenShader frag={FRAG} />;
}
