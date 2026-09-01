"use client";

import { FullscreenShader } from "../FullscreenShader";

const FRAG = /* glsl */ `
// ── Pop ────────────────────────────────────────────────────────────────────
// Loud, saturated, beat-locked — for pop, electronic, hip-hop. Every beat is
// driven by uPulse (a tempo-locked, latency-compensated pulse that never
// misses a beat) reinforced by the raw onset uBeat: the core punches, a ring
// fires outward, and the whole frame flashes. A drop (uDrop) kicks the frame
// in with a shockwave and a palette flip; treble throws sparks; the hue rides
// the brightness of the mix (uBright).

vec3 hue(float h){
  return 0.55 + 0.45*cos(6.2831*(h + vec3(0.0, 0.33, 0.67)));
}

float n2(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5);
  float b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5);
  float c=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5);
  float d=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  // the beat: grid-locked pulse, floored by the raw onset so accents still snap
  float hit = max(uPulse, uBeat);
  float hit2 = hit*hit;                       // punchier curve

  // beat punch-in + drop kick-in
  p *= 1.0 - hit*0.13 - uDrop*0.14;
  // spin, faster on louder sections, a kick of rotation on every beat
  p *= rot(uTime*(0.12 + uDynamics*0.5) + uDrop*1.5 + hit2*0.25);

  float rad = length(p);
  float ang = atan(p.y, p.x);

  float baseHue = uBright*0.6 + uTime*0.03;
  // palette flips hard on a drop
  baseHue += step(0.5, uDrop) * 0.5;

  vec3 col = vec3(0.0);

  // ── kaleidoscopic petals ────────────────────────────────────────────
  float petals = 6.0 + floor(uDynamics*6.0);
  float ka = abs(fract(ang/6.2831*petals + uTime*0.05) - 0.5);
  float arm = smoothstep(0.42, 0.0, ka) ;
  float armLen = 0.33 + uBass*0.45 + hit2*0.30 + uDrop*0.4;
  float petal = arm * smoothstep(armLen, armLen*0.2, rad);
  petal *= 0.6 + 0.6*n2(vec2(ang*3.0, rad*8.0 - uTime*3.0));
  col += hue(baseHue + rad*0.6) * petal * (1.0 + uLevel*1.5 + hit*0.8);

  // ── core sun — punches on every beat ───────────────────────────────
  float core = 0.14 + uBass*0.09 + hit2*0.18;
  float sun = smoothstep(core, 0.0, rad);
  col += hue(baseHue + 0.15) * sun * (1.4 + hit*4.0 + uDrop*2.0);
  col += vec3(1.0) * smoothstep(core*0.4, 0.0, rad) * (0.4 + hit*1.5);

  // ── waveform ring around the core ──────────────────────────────────
  float wr = 0.30 + uEnergy*0.10;
  float w = wave(fract(ang/6.2831 + uTime*0.02)) * (0.05 + uMid*0.12);
  float ring = exp(-pow((rad - (wr + w)) * 26.0, 2.0));
  col += hue(baseHue + 0.5) * ring * (1.0 + hit*3.0);

  // ── a bright ring fired outward on EVERY beat ─────────────────────
  float bw = exp(-pow((rad - (1.0 - hit)*1.5) * 6.0, 2.0)) * hit;
  float dw = exp(-pow((rad - (1.0 - uDrop)*1.9) * 4.0, 2.0)) * uDrop;
  col += hue(baseHue + 0.7) * (bw*2.2 + dw*2.2);

  // ── treble sparks ────────────────────────────────────────────────
  float sp = n2(p*22.0 + uTime*6.0);
  sp = pow(sp, 8.0) * step(0.5, spec(rad*0.7));
  col += vec3(1.0,0.95,0.9) * sp * uTreble * 3.0;

  // full-frame flash — unmistakable on every beat, bigger on a drop
  col += hue(baseHue) * uDrop * 0.4;
  col += vec3(1.0) * hit2 * 0.22;

  // vignette so the middle pops
  col *= 1.0 - dot(p,p)*0.35;

  col = 1.0 - exp(-col*1.7);
  col = pow(col, vec3(0.82));   // punchy contrast
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function PopScene() {
  return <FullscreenShader frag={FRAG} />;
}
