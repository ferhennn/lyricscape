"use client";

import { create } from "zustand";
import type { Song } from "@/types";
import { appleMusic } from "@/lib/apple-music/service";
import { DEMO_CONFIG } from "@/data/demo";

export type SearchSource = "apple-music" | "jamendo" | "demo";

interface SearchStore {
  open: boolean;
  query: string;
  results: Song[];
  loading: boolean;
  error: string | null;
  source: SearchSource | null;

  setOpen(open: boolean): void;
  toggle(): void;
  setQuery(q: string): void;
  run(): Promise<void>;
  clear(): void;
}

let seq = 0;
let jamendoReady: boolean | null = null;

async function jamendoConfigured(): Promise<boolean> {
  if (jamendoReady !== null) return jamendoReady;
  try {
    const res = await fetch("/api/jamendo/status", { cache: "no-store" });
    const body = (await res.json()) as { configured?: boolean };
    jamendoReady = !!body.configured;
  } catch {
    jamendoReady = false;
  }
  return jamendoReady;
}

async function searchJamendo(q: string): Promise<Song[]> {
  const res = await fetch(`/api/jamendo/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Jamendo search failed.");
  return ((await res.json()) as { songs: Song[] }).songs;
}

export const useSearch = create<SearchStore>((set, get) => ({
  open: false,
  query: "",
  results: [],
  loading: false,
  error: null,
  source: null,

  setOpen: (open) => set({ open }),
  toggle: () => set({ open: !get().open }),
  setQuery: (query) => set({ query }),

  run: async () => {
    const q = get().query.trim();
    const id = ++seq;
    if (!q) {
      set({ results: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });

    const apple = appleMusic.getStatus().configured || appleMusic.getStatus().authorized;
    try {
      if (apple) {
        const songs = await appleMusic.search(q);
        if (id !== seq) return;
        set({ results: songs, loading: false, source: "apple-music" });
        return;
      }
      if (await jamendoConfigured()) {
        const songs = await searchJamendo(q);
        if (id !== seq) return;
        set({ results: songs, loading: false, source: "jamendo" });
        return;
      }
      // Demo mode — the built-in experience is the only catalog entry.
      await new Promise((r) => setTimeout(r, 220));
      if (id !== seq) return;
      set({ results: [DEMO_CONFIG.song], loading: false, source: "demo" });
    } catch (err) {
      if (id !== seq) return;
      set({
        loading: false,
        error: (err as Error).message || "Search failed.",
        results: apple ? [] : [DEMO_CONFIG.song],
        source: apple ? "apple-music" : "demo",
      });
    }
  },

  clear: () => set({ query: "", results: [], error: null, source: null }),
}));
