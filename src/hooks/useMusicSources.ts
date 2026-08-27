"use client";

import { useEffect, useState } from "react";

export interface MusicSources {
  /** null until probed. */
  apple: boolean | null;
  jamendo: boolean | null;
  /** true once at least one probe has resolved. */
  ready: boolean;
}

let cache: { apple: boolean | null; jamendo: boolean | null } = { apple: null, jamendo: null };

/** Probes which real music sources this deployment has configured. */
export function useMusicSources(): MusicSources {
  const [state, setState] = useState(cache);

  useEffect(() => {
    let cancelled = false;
    const set = (patch: Partial<typeof cache>) => {
      cache = { ...cache, ...patch };
      if (!cancelled) setState(cache);
    };
    if (cache.apple === null) {
      fetch("/api/apple-developer-token", { cache: "no-store" })
        .then((r) => set({ apple: r.ok }))
        .catch(() => set({ apple: false }));
    }
    if (cache.jamendo === null) {
      fetch("/api/jamendo/status", { cache: "no-store" })
        .then((r) => r.json())
        .then((b: { configured?: boolean }) => set({ jamendo: !!b.configured }))
        .catch(() => set({ jamendo: false }));
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, ready: state.apple !== null || state.jamendo !== null };
}
