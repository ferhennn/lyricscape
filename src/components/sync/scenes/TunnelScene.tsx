"use client";

import { FullscreenShader } from "../FullscreenShader";

const FRAG = /* glsl */ `
// ── Waveform Tunnel ────────────────────────────────────────────────────────
// Flight through an endless faceted corridor. The cross-section is pushed
// around by the live waveform, bass drives the speed, mid the roll, every
// beat throws a bright ring down the tube.

float corridor(vec3 p, out float ring){
  // polar
  float a = atan(p.y, p.x);
  float r = length(p.xy);

  // waveform ripples the wall radius around the ring
  float w = wave(fract(a/6.2831 + uTime*0.05)) * (0.25 + uMid*0.5);
  float facets = 6.0 + floor(uEnergy*6.0);
  float fac = 0.12 * cos(a*facets + uTime*0.6);

  float wall = 1.6 - w - fac - uBass*0.25;

  // bright rings marching toward the camera, one spawned per beat era
  float z = p.z * 0.5;
  ring = smoothstep(0.06, 0.0, abs(fract(z) - 0.5)) * 0.0;
  ring = pow(max(0.0, sin(z*3.14159)), 40.0);

  return wall - r;
}

void main(){
  vec2 uv = (vUv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  float speed = 1.2 + uBass*4.0 + uEnergy*1.5;
  float z = uTime * speed;

  vec3 ro = vec3(0.0, 0.0, z);
  vec3 rd = normalize(vec3(uv, 1.0));
  rd.xy *= rot(uTime*0.15 + uMid*1.2);

  float d = 0.0;
  float hit = 0.0;
  float ringAcc = 0.0;
  vec3 pos;
  for(int i=0;i<64;i++){
    pos = ro + rd*d;
    float ring;
    float dist = corridor(pos, ring);
    ringAcc += ring * 0.03 / (1.0 + d*d*0.15);
    if(dist < 0.001 || d > 40.0){ hit = 1.0; break; }
    d += dist * 0.75;
  }

  float a = atan(pos.y, pos.x);
  float fog = 1.0 - exp(-d*0.12);

  // wall shading from angle + depth bands
  vec3 base = mix(vec3(0.9,0.35,0.15), vec3(0.15,0.45,0.95),
                  0.5+0.5*sin(a*3.0 + uTime*0.5));
  base = mix(base, vec3(1.0,0.85,0.6), uTreble*0.6);

  float stripes = 0.5 + 0.5*sin(pos.z*4.0 - uTime*speed*2.0);
  vec3 col = base * (0.25 + 0.75*stripes) * hit;
  col *= (1.0 - fog*0.9);

  // beat rings + center glow
  col += vec3(1.0,0.95,0.9) * ringAcc * (1.0 + uBeat*3.0);
  col += vec3(0.3,0.5,1.0) * uBeat * 0.4 * (1.0 - hit);
  col += vec3(0.05,0.08,0.16) * (1.0-hit);   // deep vignette haze

  col = 1.0 - exp(-col*1.5);
  col = pow(col, vec3(0.9));
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function TunnelScene() {
  return <FullscreenShader frag={FRAG} />;
}
