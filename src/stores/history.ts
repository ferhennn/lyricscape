"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Song } from "@/types";

interface HistoryStore {
  recent: Song[];
  favorites: string[];
  /** songId → last playback position in seconds, for resume. */
  progress: Record<string, number>;
  push(song: Song): void;
  toggleFavorite(id: string): void;
  isFavorite(id: string): boolean;
  setProgress(id: string, seconds: number): void;
  clearProgress(id: string): void;
  clear(): void;
}

export const useHistory = create<HistoryStore>()(
  persist(
    (set, get) => ({
      recent: [],
      favorites: [],
      progress: {},
      push: (song) =>
        set((s) => ({
          recent: [song, ...s.recent.filter((x) => x.id !== song.id)].slice(0, 24),
        })),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [id, ...s.favorites],
        })),
      isFavorite: (id) => get().favorites.includes(id),
      setProgress: (id, seconds) =>
        set((s) => {
          const entries = Object.entries({ ...s.progress, [id]: Math.round(seconds) });
          // Keep the map from growing without bound.
          return { progress: Object.fromEntries(entries.slice(-80)) };
        }),
      clearProgress: (id) =>
        set((s) => {
          if (!(id in s.progress)) return s;
          const next = { ...s.progress };
          delete next[id];
          return { progress: next };
        }),
      clear: () => set({ recent: [], favorites: [], progress: {} }),
    }),
    { name: "lyricscape.history", version: 1 },
  ),
);
