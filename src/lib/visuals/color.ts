// Derive a sophisticated accent palette from album artwork.
// Not a blurred copy of the cover — a small set of tones sampled and tuned.

import type { AccentPalette } from "@/types";

export const FALLBACK_PALETTE: AccentPalette = {
  accent: "#C8C2BA",
  secondary: "#6E6A78",
  deep: "#1A1620",
  light: "#F0EDE8",
};

interface HSL {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToHex({ h, s, l }: HSL): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Load an image (CORS-permitting) and extract a palette. Resolves to fallback on failure. */
export async function extractPalette(url: string): Promise<AccentPalette> {
  if (typeof window === "undefined") return FALLBACK_PALETTE;
  try {
    const img = await loadImage(url);
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return FALLBACK_PALETTE;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Bucket by hue, weight by saturation and mid-lightness.
    const buckets = new Map<number, { count: number; h: number; s: number; l: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue;
      const hsl = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      if (hsl.l < 0.08 || hsl.l > 0.95) continue;
      const key = Math.round(hsl.h / 18) * 18;
      const w = 0.3 + hsl.s * 1.4;
      const e = buckets.get(key) ?? { count: 0, h: 0, s: 0, l: 0 };
      e.count += w;
      e.h += hsl.h * w;
      e.s += hsl.s * w;
      e.l += hsl.l * w;
      buckets.set(key, e);
    }
    if (buckets.size === 0) return FALLBACK_PALETTE;

    const ranked = [...buckets.values()]
      .map((e) => ({ h: e.h / e.count, s: e.s / e.count, l: e.l / e.count, count: e.count }))
      .sort((a, b) => b.count - a.count);

    const primary = ranked[0];
    const secondarySrc = ranked[1] ?? primary;

    const accent = hslToHex({
      h: primary.h,
      s: clamp(primary.s * 1.05, 0.25, 0.8),
      l: clamp(primary.l * 1.15 + 0.08, 0.5, 0.78),
    });
    const secondary = hslToHex({
      h: secondarySrc.h,
      s: clamp(secondarySrc.s, 0.2, 0.7),
      l: clamp(secondarySrc.l, 0.35, 0.6),
    });
    const deep = hslToHex({
      h: primary.h,
      s: clamp(primary.s * 0.7, 0.15, 0.5),
      l: clamp(primary.l * 0.35, 0.08, 0.16),
    });
    const light = hslToHex({
      h: primary.h,
      s: clamp(primary.s * 0.3, 0, 0.25),
      l: 0.92,
    });
    return { accent, secondary, deep, light };
  } catch {
    return FALLBACK_PALETTE;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Mix two hex colors, t in 0..1. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const to = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${to(pa.r + (pb.r - pa.r) * t)}${to(pa.g + (pb.g - pa.g) * t)}${to(pa.b + (pb.b - pa.b) * t)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}
