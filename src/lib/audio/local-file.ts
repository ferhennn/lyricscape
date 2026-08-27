// Holds a user-picked audio File between the picker and the experience route.
// A File can't travel in a URL, so it lives here keyed by a short id.

import type { Song } from "@/types";

interface PendingLocal {
  id: string;
  file: File;
  song: Song;
}

let pending: PendingLocal | null = null;

export function stageLocalFile(file: File): string {
  const id = `local-${Date.now().toString(36)}`;
  const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  pending = {
    id,
    file,
    song: {
      id,
      title: title || "Local track",
      artistName: "Local file",
      albumName: "",
      durationMs: 0,
      provider: "local",
    },
  };
  return id;
}

export function takeLocalFile(id: string): PendingLocal | null {
  if (pending?.id === id) return pending;
  return null;
}

export function clearLocalFile(): void {
  pending = null;
}
