"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AccentMode,
  MotionLevel,
  QualityLevel,
  Settings,
  ThemeMode,
  VisualMode,
} from "@/types";

interface SettingsStore extends Settings {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
  reset(): void;
}

const DEFAULTS: Settings = {
  quality: "auto",
  motion: "full",
  volume: 0.8,
  autoplay: true,
  showControls: true,
  showLyrics: true,
  theme: "dynamic",
  accentMode: "auto",
  customAccent: "#E8B98F",
  visualMode: "cinematic",
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "lyricscape.settings",
      version: 2,
      partialize: (state) => {
        const persisted = { ...state } as Partial<SettingsStore>;
        delete persisted.set;
        delete persisted.reset;
        return persisted as Settings;
      },
    },
  ),
);

export type { QualityLevel, MotionLevel, ThemeMode, AccentMode, VisualMode };
