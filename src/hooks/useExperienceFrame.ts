"use client";

import { useEffect } from "react";
import { useExperience } from "@/stores/experience";
import { createFrameSampler, type ExperienceFrame } from "@/lib/experience/frame";

/**
 * Runs a private rAF loop and calls `onFrame` with the derived ExperienceFrame.
 * Nothing here touches React state, so subscribers re-render only when they
 * choose to (e.g. via their own refs). Pass a stable `onFrame` (useCallback).
 */
export function useExperienceFrame(onFrame: (frame: ExperienceFrame) => void, active = true) {
  const engine = useExperience((s) => s.engine);
  const timeline = useExperience((s) => s.timeline);
  const provider = useExperience((s) => s.provider);

  useEffect(() => {
    if (!active || !provider) return;
    const sampler = createFrameSampler({
      engine,
      timeline,
      getTime: () => provider.getTime(),
      isPlaying: () => provider.getSnapshot().status === "playing",
    });
    let raf = 0;
    const loop = () => {
      onFrame(sampler());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine, timeline, provider, active, onFrame]);
}
