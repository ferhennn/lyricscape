"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Song } from "@/types";

interface QueueStore {
  items: Song[];
  /** Append a song, ignoring duplicates. */
  add(song: Song): void;
  remove(id: string): void;
  clear(): void;
  /** Pop the head off the queue and return it. */
  shift(): Song | undefined;
  has(id: string): boolean;
}

export const useQueue = create<QueueStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (song) =>
        set((s) =>
          s.items.some((x) => x.id === song.id)
            ? s
            : { items: [...s.items, song] },
        ),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
      shift: () => {
        const [head, ...rest] = get().items;
        if (head) set({ items: rest });
        return head;
      },
      has: (id) => get().items.some((x) => x.id === id),
    }),
    { name: "lyricscape.queue", version: 1 },
  ),
);
