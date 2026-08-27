// Lightweight quality manager. AUTO inspects the device; an adaptive monitor can
// drop a level when frame time degrades.

import type { QualityLevel } from "@/types";

export interface QualityProfile {
  level: Exclude<QualityLevel, "auto">;
  dpr: [number, number];
  particleCount: number;
  postprocessing: boolean;
  bloom: boolean;
  depthOfField: boolean;
  chromaticAberration: boolean;
  shadowMap: boolean;
  sceneDetail: number; // 0..1 multiplier for geometry / segments
}

export const PROFILES: Record<QualityProfile["level"], QualityProfile> = {
  high: {
    level: "high",
    dpr: [1, 2],
    particleCount: 4200,
    postprocessing: true,
    bloom: true,
    depthOfField: true,
    chromaticAberration: true,
    shadowMap: false,
    sceneDetail: 1,
  },
  medium: {
    level: "medium",
    dpr: [1, 1.5],
    particleCount: 2200,
    postprocessing: true,
    bloom: true,
    depthOfField: false,
    chromaticAberration: false,
    shadowMap: false,
    sceneDetail: 0.7,
  },
  low: {
    level: "low",
    dpr: [1, 1],
    particleCount: 900,
    postprocessing: false,
    bloom: false,
    depthOfField: false,
    chromaticAberration: false,
    shadowMap: false,
    sceneDetail: 0.45,
  },
};

let webglCache: boolean | null = null;

/**
 * Cached once per page: repeatedly creating throwaway contexts can exhaust the
 * browser's WebGL context limit and start returning false, which would make the
 * experience flicker between the 3D canvas and the fallback.
 */
export function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    const ctx =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    webglCache = !!(window.WebGLRenderingContext && ctx);
    // Release the probe context immediately.
    const lose = (ctx as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context");
    lose?.loseContext?.();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export function autoQuality(): QualityProfile["level"] {
  if (typeof window === "undefined") return "medium";
  const dpr = window.devicePixelRatio || 1;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  if (mobile || small || cores <= 4 || mem <= 3) {
    return cores <= 3 || mem <= 2 ? "low" : "medium";
  }
  if (cores >= 8 && dpr <= 2.5) return "high";
  return "medium";
}

export function resolveProfile(level: QualityLevel): QualityProfile {
  if (level === "auto") return PROFILES[autoQuality()];
  return PROFILES[level];
}

/** Rolling FPS meter that suggests a downgrade after sustained poor frames. */
export class AdaptivePerf {
  private samples: number[] = [];
  private last = performance.now();
  private cooldown = 0;

  /** Call once per frame. Returns true when a downgrade is warranted. */
  sample(now = performance.now()): boolean {
    const dt = now - this.last;
    this.last = now;
    if (dt <= 0 || dt > 500) return false;
    this.samples.push(1000 / dt);
    if (this.samples.length > 120) this.samples.shift();
    if (this.cooldown > 0) {
      this.cooldown--;
      return false;
    }
    if (this.samples.length < 90) return false;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    if (avg < 34) {
      this.cooldown = 240;
      this.samples.length = 0;
      return true;
    }
    return false;
  }
}
