"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Song } from "@/types";

interface HistoryStore {
  recent: Song[];
  favorites: string[];
  push(song: Song): void;
  toggleFavorite(id: string): void;
  isFavorite(id: string): boolean;
  clear(): void;
}

export const useHistory = create<HistoryStore>()(
  persist(
    (set, get) => ({
      recent: [],
      favorites: [],
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
      clear: () => set({ recent: [], favorites: [] }),
    }),
    { name: "lyricscape.history", version: 1 },
  ),
);
