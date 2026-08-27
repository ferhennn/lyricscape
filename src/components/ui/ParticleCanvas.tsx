"use client";

import { useEffect, useRef } from "react";
import { mulberry32 } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/utils";

interface Props {
  /** 0..1 — scales count and drift speed. */
  intensity?: number;
  density?: number;
  className?: string;
  color?: string;
}

/**
 * A calm 2D particle field. Canvas, not DOM — used on the landing page and as the
 * WebGL-unavailable fallback for the experience.
 */
export function ParticleCanvas({
  intensity = 0.4,
  density = 1,
  className,
  color = "255,255,255",
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rand = mulberry32(9137);

    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const count = Math.round((reduced ? 26 : 80) * density * (0.6 + intensity));
    const pts = Array.from({ length: count }, () => ({
      x: rand() * w,
      y: rand() * h,
      z: 0.2 + rand() * 0.8,
      vx: (rand() - 0.5) * 0.12,
      vy: -0.05 - rand() * 0.12,
      r: 0.3 + rand() * 1.4,
      tw: rand() * Math.PI * 2,
    }));

    let mx = 0.5;
    let my = 0.5;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth;
      my = e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let t = 0;
    const speed = reduced ? 0.15 : 0.5 + intensity;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += (p.vx + (mx - 0.5) * 0.1 * p.z) * speed;
        p.y += (p.vy + (my - 0.5) * 0.06 * p.z) * speed;
        if (p.y < -10) p.y = h + 10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        const flicker = 0.5 + 0.5 * Math.sin(t * 1.4 + p.tw);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${0.05 + flicker * 0.28 * p.z})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [intensity, density, color]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
