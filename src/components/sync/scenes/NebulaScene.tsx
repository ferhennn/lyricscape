"use client";

import { FullscreenShader } from "../FullscreenShader";

const FRAG = /* glsl */ `
// ── Nebula ─────────────────────────────────────────────────────────────────
// Domain-warped fbm clouds drifting forever. Bass swells the density, treble
// pushes the palette toward ice, a beat blooms a soft flash from the core.

vec3 palette(float t){
  vec3 a = vec3(0.18, 0.10, 0.28);
  vec3 b = vec3(0.55, 0.35, 0.65);
  vec3 c = vec3(1.0, 0.9, 0.75);
  vec3 warm = a + b*cos(6.2831*(c*t + vec3(0.0,0.15,0.35)));
  vec3 cool = vec3(0.10,0.32,0.55) + 0.45*cos(6.2831*(vec3(0.9)*t + vec3(0.1,0.2,0.45)));
  return mix(warm, cool, clamp(uTreble*1.6, 0.0, 1.0));
}

float starfield(vec2 uv, float density, float tw){
  vec2 g = floor(uv*density);
  vec3 h = hash3(vec3(g, 0.0));
  float star = step(0.985, h.x);
  vec2 c = fract(uv*density) - 0.5;
  float d = length(c);
  float m = star * smoothstep(0.14, 0.0, d);
  m *= 0.55 + 0.45*sin(uTime*3.0 + h.y*40.0 + tw);
  return m;
}

void main(){
  vec2 uv = (vUv - 0.5) * vec2(uRes.x/uRes.y, 1.0);
  float t = uTime * 0.06;

  // drifting, slowly rotating sample space
  vec3 p = vec3(uv * (2.2 - uEnergy*0.5), t);
  p.xy *= rot(t*0.3 + uMid*0.6);

  // domain warp
  vec3 q = vec3(fbm(p + vec3(0.0, t, 0.0)),
                fbm(p + vec3(5.2, 1.3, t)),
                fbm(p + vec3(1.7, 9.2, 0.0)));
  float density = fbm(p + 2.4*q + vec3(0.0, 0.0, t*1.5));
  density = pow(density, 2.2 - uBass*1.3);

  float glow = 1.0 / (0.35 + 6.0*length(uv));       // core light
  glow *= 0.6 + uBeat*1.4;

  vec3 col = palette(density + uEnergy*0.4 + t);
  col *= density * (1.4 + uBass*2.2);
  col += palette(0.6).zyx * glow * 0.5;

  // stars sit behind the gas
  float s = starfield(vUv*vec2(uRes.x/uRes.y,1.0), 60.0, 0.0)
          + starfield(vUv*vec2(uRes.x/uRes.y,1.0), 120.0, 2.0)*0.5;
  col += vec3(0.8,0.85,1.0) * s * (1.0 - clamp(density*2.0,0.0,1.0));

  // beat flash + treble sparkle
  col += vec3(0.9,0.7,1.0) * uBeat * 0.25;
  col += spec(length(uv)*0.5) * uTreble * vec3(0.4,0.6,1.0) * 0.3;

  col = 1.0 - exp(-col * 1.6);            // tonemap
  col = pow(col, vec3(0.85));
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function NebulaScene() {
  return <FullscreenShader frag={FRAG} />;
}
