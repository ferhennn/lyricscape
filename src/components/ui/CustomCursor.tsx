"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isTouchDevice, prefersReducedMotion } from "@/lib/utils";

const subscribe = () => () => {};
const canRenderCursor = () =>
  !isTouchDevice() && !prefersReducedMotion() && window.innerWidth >= 900;

/**
 * Subtle desktop cursor: a small dot that expands over interactive elements and
 * changes shape while dragging. Hidden on touch and for reduced-motion users.
 */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<"idle" | "interactive" | "drag">("idle");
  // Client-only capability check — server snapshot is always false, so no mismatch.
  const enabled = useSyncExternalStore(subscribe, canRenderCursor, () => false);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("no-cursor");

    let rx = window.innerWidth / 2;
    let ry = window.innerHeight / 2;
    let x = rx;
    let y = ry;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const el = e.target as HTMLElement | null;
      const interactive = !!el?.closest(
        "a, button, [role='button'], input, [data-cursor='interactive'], .cursor-interactive",
      );
      setVariant((v) => (v === "drag" ? v : interactive ? "interactive" : "idle"));
    };
    const onDown = () => setVariant("drag");
    const onUp = () => setVariant("idle");
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("no-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  const ringSize = variant === "interactive" ? 46 : variant === "drag" ? 22 : 30;

  return (
    <>
      <div
        ref={dot}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-ink mix-blend-difference"
      />
      <div
        ref={ring}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[100] rounded-full border border-white/60 mix-blend-difference transition-[width,height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          width: ringSize,
          height: ringSize,
          marginLeft: -ringSize / 2,
          marginTop: -ringSize / 2,
          opacity: variant === "drag" ? 0.9 : 0.5,
          borderRadius: variant === "drag" ? 6 : 999,
        }}
      />
    </>
  );
}
