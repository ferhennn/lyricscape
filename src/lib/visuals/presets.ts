// Lyric animation presets. Each returns motion values for the three states a line
// passes through: enter -> active -> exit. Consumed by <LyricLine> via Framer Motion.

import type { Transition, TargetAndTransition } from "motion/react";
import type { LyricPresetName } from "@/types";

export interface PresetStates {
  initial: TargetAndTransition;
  active: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

const spring: Transition = { type: "spring", stiffness: 140, damping: 22, mass: 0.9 };
const smooth: Transition = { duration: 0.9, ease: [0.16, 1, 0.3, 1] };

export const LYRIC_PRESETS: Record<LyricPresetName, PresetStates> = {
  fade: {
    initial: { opacity: 0, y: 24, filter: "blur(12px)" },
    active: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -24, filter: "blur(12px)" },
    transition: smooth,
  },
  slide: {
    initial: { opacity: 0, x: -80, filter: "blur(8px)" },
    active: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: 80, filter: "blur(8px)" },
    transition: spring,
  },
  scale: {
    initial: { opacity: 0, scale: 0.7, filter: "blur(10px)" },
    active: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 1.25, filter: "blur(14px)" },
    transition: spring,
  },
  blur: {
    initial: { opacity: 0, filter: "blur(28px)", letterSpacing: "0.3em" },
    active: { opacity: 1, filter: "blur(0px)", letterSpacing: "-0.02em" },
    exit: { opacity: 0, filter: "blur(28px)", letterSpacing: "0.3em" },
    transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
  },
  whisper: {
    initial: { opacity: 0, y: 12, filter: "blur(6px)", scale: 0.96 },
    active: { opacity: 0.82, y: 0, filter: "blur(0.4px)", scale: 1 },
    exit: { opacity: 0, y: -8, filter: "blur(6px)" },
    transition: { duration: 1.4, ease: "easeInOut" },
  },
  scream: {
    initial: { opacity: 0, scale: 0.4, filter: "blur(4px)" },
    active: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 1.6, filter: "blur(20px)" },
    transition: { type: "spring", stiffness: 260, damping: 16 },
  },
  echo: {
    initial: { opacity: 0, y: 40, filter: "blur(14px)" },
    active: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -40, filter: "blur(14px)" },
    transition: { duration: 1, ease: [0.22, 1, 0.36, 1] },
  },
  explode: {
    initial: { opacity: 0, scale: 0.6, filter: "blur(6px)" },
    active: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 1.4, filter: "blur(24px)", rotate: 1.5 },
    transition: { type: "spring", stiffness: 200, damping: 18 },
  },
  float: {
    initial: { opacity: 0, y: 60, filter: "blur(10px)" },
    active: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -60, filter: "blur(10px)" },
    transition: { duration: 1.3, ease: [0.16, 1, 0.3, 1] },
  },
  typewriter: {
    initial: { opacity: 0 },
    active: { opacity: 1 },
    exit: { opacity: 0, filter: "blur(8px)" },
    transition: { duration: 0.4 },
  },
  glitch: {
    initial: { opacity: 0, x: -6, skewX: 8, filter: "blur(3px)" },
    active: { opacity: 1, x: 0, skewX: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: 6, skewX: -8, filter: "blur(6px)" },
    transition: { duration: 0.5, ease: "easeOut" },
  },
  cinematic: {
    initial: { opacity: 0, y: 36, scale: 1.04, filter: "blur(18px)" },
    active: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, y: -24, scale: 0.98, filter: "blur(18px)" },
    transition: { duration: 1.15, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Pick a preset for a line: explicit override, else by section, else emphasis-scaled. */
export function resolvePreset(
  explicit: LyricPresetName | undefined,
  section: string | undefined,
  emphasis: number | undefined,
): LyricPresetName {
  if (explicit) return explicit;
  if ((emphasis ?? 0) >= 0.85) return "scream";
  switch (section) {
    case "chorus":
      return "scale";
    case "bridge":
      return "whisper";
    case "intro":
      return "cinematic";
    case "outro":
      return "echo";
    case "pre_chorus":
      return "slide";
    default:
      return "fade";
  }
}
