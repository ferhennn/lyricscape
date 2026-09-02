"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useSettings } from "@/stores/settings";
import type { VisualMode } from "@/types";

const MODE_CYCLE: VisualMode[] = ["cinematic", "3d", "kinetic", "minimal", "lyric-only"];

const SHORTCUTS: [string, string][] = [
  ["Space", "Play / pause"],
  ["← / →", "Seek 5 seconds"],
  ["L", "Toggle lyrics"],
  ["M", "Mute"],
  ["F", "Fullscreen"],
  ["V", "Cycle visual mode"],
  ["Esc", "Back to library (keep playing)"],
  ["?", "Show this help"],
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const { togglePlay, seekBy, toggleMute } = useExperience();
  const setSetting = useSettings((s) => s.set);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/^(input|textarea|select)$/i.test(target.tagName) || target.isContentEditable) return;

      if (e.key === "?") {
        setHelpOpen((v) => !v);
        return;
      }

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
          if (helpOpen) setHelpOpen(false);
          // Leave the immersive view but keep the track playing (mini-player).
          else router.push("/library");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleMute, router, setSetting, helpOpen]);

  return (
    <AnimatePresence>
      {helpOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setHelpOpen(false)}
          className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-void/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-line bg-void-2/95 p-6 backdrop-blur"
          >
            <p className="label mb-5">Keyboard</p>
            <dl className="flex flex-col gap-2.5">
              {SHORTCUTS.map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <dt className="meta text-muted">{desc}</dt>
                  <dd>
                    <kbd className="label rounded-md border border-line px-2 py-1 text-ink">
                      {key}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
