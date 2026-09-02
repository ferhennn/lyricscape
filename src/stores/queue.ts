"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Song } from "@/types";

interface QueueStore {
  items: Song[];
  /** Append a song to the end of the queue, ignoring duplicates. */
  add(song: Song): void;
  /** Put a song at the front of the queue (plays after the current track). */
  playNext(song: Song): void;
  remove(id: string): void;
  /** Shift a song one slot earlier (-1) or later (+1) in the queue. */
  move(id: string, delta: -1 | 1): void;
  /** Randomise the order of the queue. */
  shuffle(): void;
  clear(): void;
  /** Pop the head off the queue and return it. */
  shift(): Song | undefined;
  has(id: string): boolean;
}

const withoutId = (items: Song[], id: string) => items.filter((x) => x.id !== id);

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
      playNext: (song) =>
        set((s) => ({ items: [song, ...withoutId(s.items, song.id)] })),
      remove: (id) => set((s) => ({ items: withoutId(s.items, id) })),
      move: (id, delta) =>
        set((s) => {
          const i = s.items.findIndex((x) => x.id === id);
          const j = i + delta;
          if (i === -1 || j < 0 || j >= s.items.length) return s;
          const items = [...s.items];
          [items[i], items[j]] = [items[j], items[i]];
          return { items };
        }),
      shuffle: () =>
        set((s) => {
          const items = [...s.items];
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
          }
          return { items };
        }),
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
