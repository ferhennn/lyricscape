"use client";

import { createContext, useContext, useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useExperience } from "@/stores/experience";
import { createFrameSampler, type ExperienceFrame } from "@/lib/experience/frame";
import { stepPointer, pointer } from "@/lib/experience/pointer";
import type { TimelineState } from "@/types";

const DEFAULT_FRAME: ExperienceFrame = {
  time: 0,
  timeline: {
    progress: 0,
    currentTime: 0,
    duration: 0,
    lyricIndex: -1,
    lyricProgress: 0,
    section: "unknown",
    scene: "void",
    intensity: 0.4,
    transitionPulse: 0,
    isPlaying: false,
  },
  lyric: {
    index: -1,
    current: null,
    previous: null,
    next: null,
    progress: 0,
    timeToNext: Infinity,
    justChanged: false,
  },
};

const FrameContext = createContext<MutableRefObject<ExperienceFrame> | null>(null);

/** Drives one sampler per experience and exposes the result to all scene children. */
export function FrameProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<ExperienceFrame>(DEFAULT_FRAME);
  const engine = useExperience((s) => s.engine);
  const timeline = useExperience((s) => s.timeline);
  const provider = useExperience((s) => s.provider);
  const samplerRef = useRef<() => ExperienceFrame>(() => DEFAULT_FRAME);
  useEffect(() => {
    samplerRef.current = provider
      ? createFrameSampler({
          engine,
          timeline,
          getTime: () => provider.getTime(),
          isPlaying: () => provider.getSnapshot().status === "playing",
        })
      : () => DEFAULT_FRAME;
  }, [engine, timeline, provider]);

  useFrame((_, dt) => {
    stepPointer(dt);
    ref.current = samplerRef.current();
  });

  return <FrameContext.Provider value={ref}>{children}</FrameContext.Provider>;
}

export function useSceneFrame(): MutableRefObject<ExperienceFrame> {
  const ctx = useContext(FrameContext);
  if (!ctx) throw new Error("useSceneFrame must be used inside <FrameProvider>");
  return ctx;
}

export function useTimelineRef(): () => TimelineState {
  const ref = useSceneFrame();
  return () => ref.current.timeline;
}

export { pointer };
