// When a song has no hand-authored scene metadata (i.e. anything that isn't the
// built-in demo), synthesize a plausible section map from its duration and, if
// available, the density of its lyric lines. This is explicitly an approximation —
// it does not claim to know the song's real structure or meaning.

import type { LyricLine, SceneMeta, SongSection, SongSectionType, VisualSceneType } from "@/types";

const SCENE_CYCLE: VisualSceneType[] = ["stars", "room", "hallway", "ocean", "smoke", "void"];

const TEMPLATE: Array<{ type: SongSectionType; weight: number; intensity: number }> = [
  { type: "intro", weight: 0.1, intensity: 0.2 },
  { type: "verse", weight: 0.18, intensity: 0.42 },
  { type: "pre_chorus", weight: 0.08, intensity: 0.58 },
  { type: "chorus", weight: 0.16, intensity: 0.86 },
  { type: "verse", weight: 0.16, intensity: 0.46 },
  { type: "chorus", weight: 0.14, intensity: 0.9 },
  { type: "bridge", weight: 0.1, intensity: 0.34 },
  { type: "outro", weight: 0.08, intensity: 0.16 },
];

const SCENE_FOR: Record<SongSectionType, VisualSceneType> = {
  intro: "stars",
  verse: "room",
  pre_chorus: "hallway",
  chorus: "ocean",
  bridge: "smoke",
  outro: "void",
  unknown: "void",
};

export function autoSceneMeta(durationSec: number, lyrics: LyricLine[] = []): SceneMeta {
  const total = Math.max(30, durationSec || 180);
  const sum = TEMPLATE.reduce((a, s) => a + s.weight, 0);
  let cursor = 0;
  const sections: SongSection[] = TEMPLATE.map((tpl, i) => {
    const span = (tpl.weight / sum) * total;
    const start = cursor;
    const end = i === TEMPLATE.length - 1 ? total : cursor + span;
    cursor = end;

    // Nudge intensity by local lyric density.
    const inWindow = lyrics.filter((l) => l.timestamp >= start && l.timestamp < end).length;
    const density = span > 0 ? inWindow / (span / 8) : 0;
    const intensity = clamp01(tpl.intensity * 0.8 + Math.min(0.3, density * 0.08));

    return {
      type: tpl.type,
      start,
      end,
      scene: SCENE_FOR[tpl.type] ?? SCENE_CYCLE[i % SCENE_CYCLE.length],
      intensity,
      label: tpl.type.replace("_", " ").toUpperCase(),
    };
  });

  return { sections, defaultScene: "stars" };
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
