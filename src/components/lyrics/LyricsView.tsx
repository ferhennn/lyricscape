"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useExperienceFrame } from "@/hooks/useExperienceFrame";
import { LYRIC_PRESETS, resolvePreset } from "@/lib/visuals/presets";
import type { ExperienceFrame } from "@/lib/experience/frame";
import type { LyricLine } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  /** "center" for cinematic/3d overlay, "reader" for lyric-only. */
  variant?: "center" | "reader" | "minimal";
}

interface ViewState {
  index: number;
  current: LyricLine | null;
  previous: LyricLine | null;
  next: LyricLine | null;
}

export function LyricsView({ variant = "center" }: Props) {
  const lyrics = useExperience((s) => s.lyrics);
  const lyricsUnavailable = useExperience((s) => s.lyricsUnavailable);
  const continueWithoutLyrics = useExperience((s) => s.continueWithoutLyrics);
  const acceptNoLyrics = useExperience((s) => s.acceptNoLyrics);
  const reduced = useReducedMotion();

  const [view, setView] = useState<ViewState>({
    index: -1,
    current: null,
    previous: null,
    next: null,
  });
  const wordSpans = useRef<Array<HTMLSpanElement | null>>([]);
  const lastIndex = useRef(-1);

  const onFrame = useCallback(
    (frame: ExperienceFrame) => {
      const { lyric, time } = frame;
      if (lyric.index !== lastIndex.current) {
        lastIndex.current = lyric.index;
        wordSpans.current = [];
        setView({
          index: lyric.index,
          current: lyric.current,
          previous: lyric.previous,
          next: lyric.next,
        });
        return;
      }
      // Word-level highlight — DOM only, no React churn.
      const words = lyric.current?.words;
      if (words && words.length) {
        for (let i = 0; i < words.length; i++) {
          const span = wordSpans.current[i];
          if (!span) continue;
          const w = words[i];
          const lead = 0.12;
          const on = time >= w.start - lead;
          const p = on ? Math.min(1, (time - w.start + lead) / Math.max(0.18, w.end - w.start)) : 0;
          span.style.opacity = String(0.22 + 0.78 * (on ? 0.35 + 0.65 * p : 0));
          span.style.filter = on ? `blur(${(1 - p) * 3}px)` : "blur(4px)";
          span.style.transform = `translateY(${(1 - (on ? p : 0)) * 0.14}em)`;
        }
      }
    },
    [],
  );

  useExperienceFrame(onFrame);

  if (lyricsUnavailable && !continueWithoutLyrics) {
    return (
      <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-6 text-center">
        <p className="label">Lyrics unavailable</p>
        <button
          onClick={acceptNoLyrics}
          data-cursor="interactive"
          className="label rounded-full border border-line px-5 py-3 text-ink hover:border-white/30"
        >
          Continue without lyrics
        </button>
      </div>
    );
  }

  if (!lyrics?.synced) {
    // Unsynced plain text — quiet scroller.
    if (!lyrics || lyrics.lines.length === 0) return null;
    return (
      <div className="edge-fade-y pointer-events-auto absolute inset-0 overflow-y-auto px-6 py-[24vh]">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          {lyrics.lines.map((l) => (
            <p key={l.id} className="text-2xl leading-relaxed text-ink/70">
              {l.text}
            </p>
          ))}
        </div>
      </div>
    );
  }

  const { current, previous, next } = view;
  const preset = LYRIC_PRESETS[resolvePreset(current?.preset, current?.section, current?.emphasis)];
  const emphasis = current?.emphasis ?? 0;

  const currentFontSize =
    variant === "reader"
      ? "clamp(32px, 6vw, 84px)"
      : `clamp(44px, ${(8 + emphasis * 2).toFixed(2)}vw, ${Math.round(120 + emphasis * 40)}px)`;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 sm:px-16">
      <div className="relative flex w-full max-w-6xl flex-col items-center gap-6 text-center">
        {/* previous */}
        <AnimatePresence mode="wait">
          {previous && !previous.instrumental && (
            <motion.p
              key={`p-${previous.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-display max-w-3xl text-[clamp(18px,2.6vw,34px)] font-medium leading-tight text-ink blur-[2px]"
            >
              {previous.text}
            </motion.p>
          )}
        </AnimatePresence>

        {/* current — lines crossfade (overlap) without shifting layout */}
        <div className="relative flex min-h-[1.4em] w-full items-center justify-center">
          <AnimatePresence initial={false}>
            {current && (
              <motion.p
                key={`c-${current.id}`}
                initial={reduced ? { opacity: 0 } : preset.initial}
                animate={reduced ? { opacity: 1 } : preset.active}
                exit={reduced ? { opacity: 0 } : preset.exit}
                transition={reduced ? { duration: 0.2 } : preset.transition}
                style={{ fontSize: currentFontSize }}
                className={cn(
                  "text-display absolute inset-x-0 mx-auto max-w-5xl font-semibold leading-[0.98] text-ink",
                  emphasis >= 0.85 && "uppercase",
                )}
              >
                {current.instrumental ? (
                  <span className="text-muted">— · —</span>
                ) : current.words.length ? (
                  current.words.map((w, i) => (
                    <span key={i} className="inline-block">
                      <span
                        ref={(el) => {
                          wordSpans.current[i] = el;
                        }}
                        className="inline-block will-change-[transform,opacity,filter]"
                        style={{ opacity: 0.22, filter: "blur(4px)" }}
                      >
                        {w.text}
                      </span>
                      {i < current.words.length - 1 ? " " : ""}
                    </span>
                  ))
                ) : (
                  current.text
                )}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* next */}
        <AnimatePresence mode="wait">
          {next && !next.instrumental && (
            <motion.p
              key={`n-${next.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-display max-w-3xl text-[clamp(18px,2.6vw,34px)] font-medium leading-tight text-ink blur-[2px]"
            >
              {next.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
