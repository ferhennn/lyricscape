"use client";

import { create } from "zustand";
import type { Song } from "@/types";
import { appleMusic } from "@/lib/apple-music/service";
import { DEMO_CONFIG } from "@/data/demo";

interface SearchStore {
  open: boolean;
  query: string;
  results: Song[];
  loading: boolean;
  error: string | null;
  source: "apple-music" | "demo" | null;

  setOpen(open: boolean): void;
  toggle(): void;
  setQuery(q: string): void;
  run(): Promise<void>;
  clear(): void;
}

let seq = 0;

export const useSearch = create<SearchStore>((set, get) => ({
  open: false,
  query: "",
  results: [],
  loading: false,
  error: null,
  source: null,

  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
  setQuery: (query) => {
    set({ query });
  },

  run: async () => {
    const q = get().query.trim();
    const id = ++seq;
    if (!q) {
      set({ results: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });

    const configured = appleMusic.getStatus().configured || appleMusic.getStatus().authorized;
    try {
      if (configured) {
        const songs = await appleMusic.search(q);
        if (id !== seq) return;
        set({ results: songs, loading: false, source: "apple-music" });
      } else {
        // Demo mode — the built-in experience is the only catalog entry.
        await new Promise((r) => setTimeout(r, 260));
        if (id !== seq) return;
        set({
          results: [DEMO_CONFIG.song],
          loading: false,
          source: "demo",
        });
      }
    } catch (err) {
      if (id !== seq) return;
      set({
        loading: false,
        error: (err as Error).message || "Search failed.",
        results: configured ? [] : [DEMO_CONFIG.song],
        source: configured ? "apple-music" : "demo",
      });
    }
  },

  clear: () => set({ query: "", results: [], error: null, source: null }),
}));
