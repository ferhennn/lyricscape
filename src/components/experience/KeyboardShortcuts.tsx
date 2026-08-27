"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExperience } from "@/stores/experience";
import { useSettings } from "@/stores/settings";
import type { VisualMode } from "@/types";

const MODE_CYCLE: VisualMode[] = ["cinematic", "3d", "kinetic", "minimal", "lyric-only"];

export function KeyboardShortcuts() {
  const router = useRouter();
  const { togglePlay, seekBy, toggleMute, teardown } = useExperience();
  const setSetting = useSettings((s) => s.set);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/^(input|textarea|select)$/i.test(target.tagName) || target.isContentEditable) return;

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
          seekBy(-5);
          break;
        case "arrowright":
          seekBy(5);
          break;
        case "l":
          setSetting("showLyrics", !useSettings.getState().showLyrics);
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen().catch(() => {});
          break;
        case "v": {
          const cur = useSettings.getState().visualMode;
          const next = MODE_CYCLE[(MODE_CYCLE.indexOf(cur) + 1) % MODE_CYCLE.length];
          setSetting("visualMode", next);
          break;
        }
        case "escape":
          teardown();
          router.push("/library");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleMute, teardown, router, setSetting]);

  return null;
}
