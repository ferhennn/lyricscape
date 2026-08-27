"use client";

import { useEffect, useRef } from "react";
import { useExperience } from "@/stores/experience";

/**
 * Cinematic scroll mode: scroll position scrubs the visual timeline. Audio is
 * paused while scrubbing so the world responds directly to the wheel.
 */
export function ScrollMode({ children }: { children: React.ReactNode }) {
  const provider = useExperience((s) => s.provider);
  const seek = useExperience((s) => s.seek);
  const pause = useExperience((s) => s.pause);
  const clock = useExperience((s) => s.clock);
  const spacer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pause();
    const duration = clock.duration || 180;
    const pxPerSecond = 44;
    const totalHeight = duration * pxPerSecond + window.innerHeight;
    if (spacer.current) spacer.current.style.height = `${totalHeight}px`;

    // Position the scroll to match current time.
    window.scrollTo(0, (clock.time / duration) * (totalHeight - window.innerHeight));

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = totalHeight - window.innerHeight;
        const p = Math.max(0, Math.min(1, window.scrollY / max));
        seek(p * duration);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.body.style.overflow = "auto";
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
      window.scrollTo(0, 0);
    };
  }, [provider, seek, pause, clock]);

  return (
    <>
      <div className="fixed inset-0 z-0">{children}</div>
      <div ref={spacer} aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 text-center">
        <span className="label">Scroll to move through the song</span>
      </div>
    </>
  );
}
