"use client";

import { FullscreenShader } from "../FullscreenShader";

const FRAG = /* glsl */ `
// ── Liquid ─────────────────────────────────────────────────────────────────
// A blob of raymarched metaballs breathing in place. Bass inflates it, the
// spectrum ripples its skin, a beat sends a shell of displacement outward.

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}

float map(vec3 p){
  p.xz *= rot(uTime*0.2);
  p.xy *= rot(uTime*0.15 + uMid*0.8);

  float t = uTime*0.6;
  float d = 1e5;
  float R = 0.55 + uBass*0.45;
  for(int i=0;i<5;i++){
    float fi = float(i);
    vec3 o = 0.75 * vec3(
      sin(t + fi*1.7),
      cos(t*1.1 + fi*2.3),
      sin(t*0.9 + fi*3.1)
    );
    float s = length(p - o) - (R * (0.6 + 0.4*sin(fi + t)));
    d = smin(d, s, 0.5 + uEnergy*0.3);
  }

  // skin detail from spectrum + treble
  float skin = fbm(p*2.4 + t) - 0.5;
  d += skin * (0.06 + uTreble*0.12);

  // beat shell
  d += sin(length(p)*6.0 - uTime*8.0) * uBeat * 0.04;
  return d;
}

vec3 normal(vec3 p){
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p+e.xyy)-map(p-e.xyy),
    map(p+e.yxy)-map(p-e.yxy),
    map(p+e.yyx)-map(p-e.yyx)
  ));
}

void main(){
  vec2 uv = (vUv - 0.5) * vec2(uRes.x/uRes.y, 1.0);

  vec3 ro = vec3(0.0, 0.0, 3.2);
  vec3 rd = normalize(vec3(uv, -1.4));

  float d = 0.0; float hit = 0.0; vec3 p;
  for(int i=0;i<80;i++){
    p = ro + rd*d;
    float dist = map(p);
    if(dist < 0.001){ hit = 1.0; break; }
    if(d > 8.0) break;
    d += dist * 0.85;
  }

  vec3 col = vec3(0.02, 0.03, 0.05);          // background
  col += pow(max(0.0, 1.0 - length(uv)*0.8), 3.0) * vec3(0.06,0.04,0.10);

  if(hit > 0.5){
    vec3 n = normal(p);
    vec3 ld = normalize(vec3(0.6, 0.8, 0.4));
    float diff = clamp(dot(n, ld), 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    float spc = pow(clamp(dot(reflect(-ld, n), -rd), 0.0, 1.0), 40.0);

    vec3 deep = mix(vec3(0.55,0.15,0.35), vec3(0.15,0.35,0.75),
                    0.5+0.5*sin(uTime*0.3 + uEnergy*3.0));
    deep = mix(deep, vec3(0.95,0.7,0.4), uTreble*0.5);

    col = deep * (0.15 + diff*0.9);
    col += vec3(0.6,0.8,1.0) * fres * (0.6 + uBeat);
    col += vec3(1.0) * spc * 0.8;
    col += deep * spec(clamp(length(p)*0.4,0.0,1.0)) * 0.4;
  }

  col += vec3(0.4,0.5,1.0) * uBeat * 0.15;
  col = 1.0 - exp(-col*1.7);
  col = pow(col, vec3(0.88));
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function LiquidScene() {
  return <FullscreenShader frag={FRAG} />;
}
