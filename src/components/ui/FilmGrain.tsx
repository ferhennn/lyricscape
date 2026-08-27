"use client";

import { useReducedMotion } from "motion/react";

/** Fixed, non-interactive film grain layer. Cheap — a tiled SVG noise texture. */
export function FilmGrain({ opacity = 0.045 }: { opacity?: number }) {
  const reduced = useReducedMotion();
  return (
    <div
      aria-hidden
      className="grain-layer"
      style={{ opacity: reduced ? opacity * 0.5 : opacity }}
    />
  );
}
