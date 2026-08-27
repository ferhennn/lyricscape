"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useExperienceFrame } from "@/hooks/useExperienceFrame";
import { LyricsEngine } from "@/lib/lyrics/engine";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { mulberry32, slugSeed } from "@/lib/utils";
import type { ExperienceFrame } from "@/lib/experience/frame";
import type { LyricLine } from "@/types";

/**
 * Kinetic / brutalist lyric mode. A dark gradient churns behind oversized type
 * that lands anywhere on the screen — whole lines slammed into a corner and
 * cropped by the viewport, or the line broken word-by-word and scattered.
 */

type Anchor = {
  x: number;
  y: number;
  align: "left" | "right" | "center";
  /** which edge of the text sits on (x,y): "top" | "mid" | "bot". */
  vy: "top" | "mid" | "bot";
};

// y stays within the viewport; vy pins the right text edge so tall type never
// runs far past the top/bottom. A word may sit ~half-cut at an edge, no more.
const ANCHORS: Anchor[] = [
  { x: 4, y: 10, align: "left", vy: "top" },
  { x: 96, y: 12, align: "right", vy: "top" },
  { x: 3, y: 90, align: "left", vy: "bot" },
  { x: 97, y: 88, align: "right", vy: "bot" },
  { x: 50, y: 50, align: "center", vy: "mid" },
  { x: 6, y: 50, align: "left", vy: "mid" },
  { x: 94, y: 48, align: "right", vy: "mid" },
  { x: 50, y: 14, align: "center", vy: "top" },
  { x: 50, y: 88, align: "center", vy: "bot" },
];

interface LineLayout {
  mode: "line" | "words";
  anchor: Anchor;
  /** vw font size for the whole-line mode. */
  size: number;
  nowrap: boolean;
  invertWord: number; // index of a word to render as an inverted block, or -1
  /** Per-word absolute positions (0..100) for the words mode. */
  spots: Array<{ x: number; y: number; size: number; rot: number }>;
  upper: boolean;
}

function planLine(line: LyricLine, index: number): LineLayout {
  const rand = mulberry32(slugSeed(line.id) ^ (index * 2654435761));
  const wordCount = line.words.length;
  const useWords = wordCount >= 2 && wordCount <= 7 && rand() > 0.42;
  const anchor = ANCHORS[Math.floor(rand() * ANCHORS.length)];
  const emphasis = line.emphasis ?? 0;
  const baseSize = 8 + rand() * 7 + emphasis * 5;

  const spots = line.words.map(() => ({
    x: 12 + rand() * 70,
    y: 20 + rand() * 58,
    size: 6 + rand() * 8 + emphasis * 4,
    rot: (rand() - 0.5) * 5,
  }));

  return {
    mode: useWords ? "words" : "line",
    anchor,
    size: Math.min(22, baseSize + (line.text.length < 14 ? 6 : 0)),
    nowrap: rand() > 0.55 && line.text.length < 26,
    invertWord: rand() > 0.7 && wordCount > 1 ? Math.floor(rand() * wordCount) : -1,
    spots,
    upper: rand() > 0.25,
  };
}

interface Snapshot {
  index: number;
  line: LyricLine | null;
  activeWord: number;
}

export function KineticLyrics({ showLyrics = true }: { showLyrics?: boolean }) {
  const lyrics = useExperience((s) => s.lyrics);
  const palette = useExperience((s) => s.palette);
  const reduced = useReducedMotion();

  const [snap, setSnap] = useState<Snapshot>({ index: -1, line: null, activeWord: -1 });
  const lastIndex = useRef(-1);
  const lastWord = useRef(-1);
  const timeRef = useRef<HTMLSpanElement>(null);

  const onFrame = useCallback((frame: ExperienceFrame) => {
    const { lyric, time } = frame;
    if (timeRef.current) {
      const s = Math.floor(time % 60)
        .toString()
        .padStart(2, "0");
      timeRef.current.textContent = `${Math.floor(time / 60)}:${s}`;
    }
    const active = lyric.current ? LyricsEngine.activeWordIndex(lyric.current, time) : -1;
    if (lyric.index !== lastIndex.current || active !== lastWord.current) {
      lastIndex.current = lyric.index;
      lastWord.current = active;
      setSnap({ index: lyric.index, line: lyric.current, activeWord: active });
    }
  }, []);

  useExperienceFrame(onFrame);

  const layout = useMemo(
    () => (snap.line ? planLine(snap.line, snap.index) : null),
    [snap.line, snap.index],
  );

  const gradient = useMemo(
    () => ({
      background: `radial-gradient(60% 50% at 20% 20%, ${hexA(palette.deep, 0.9)}, transparent 60%),
                   radial-gradient(50% 60% at 85% 75%, ${hexA(palette.secondary, 0.5)}, transparent 60%),
                   radial-gradient(80% 80% at 60% 40%, ${hexA(palette.accent, 0.12)}, transparent 70%),
                   #050505`,
    }),
    [palette],
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-void">
      {/* churning gradient */}
      <motion.div
        aria-hidden
        className="absolute -inset-[40%]"
        style={gradient}
        animate={
          reduced
            ? undefined
            : { rotate: [0, 8, -6, 0], scale: [1, 1.15, 1.05, 1], x: ["-4%", "3%", "-2%", "-4%"] }
        }
        transition={{ duration: 44, ease: "easeInOut", repeat: Infinity }}
      />
      <div className="absolute inset-0 bg-void/30" />
      <FilmGrain opacity={0.06} />

      {/* brutalist frame + timecode */}
      <div className="pointer-events-none absolute inset-6 border border-line" />
      <span
        ref={timeRef}
        className="meta pointer-events-none absolute bottom-8 left-9 tabular-nums text-muted"
      >
        0:00
      </span>
      <span className="label pointer-events-none absolute right-9 top-8 text-muted">KINETIC</span>

      {showLyrics && layout && snap.line && !snap.line.instrumental && (
        <AnimatePresence>
          {layout.mode === "line" ? (
            <motion.h2
              key={`k-${snap.index}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 100% 0 0)" }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, clipPath: "inset(0 0% 0 0)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 0 0 100%)" }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="text-display absolute font-semibold leading-[0.85] text-ink"
              style={{
                left: `${layout.anchor.x}%`,
                top: `${layout.anchor.y}%`,
                transform: `translate(${anchorShift(layout.anchor)}, ${anchorShiftY(layout.anchor)})`,
                textAlign: layout.anchor.align,
                fontSize: `clamp(48px, ${layout.size}vw, 230px)`,
                letterSpacing: "-0.04em",
                textTransform: layout.upper ? "uppercase" : "none",
                whiteSpace: layout.nowrap ? "nowrap" : "normal",
                maxWidth: "92vw",
              }}
            >
              {snap.line.text}
            </motion.h2>
          ) : (
            <motion.div
              key={`kw-${snap.index}`}
              className="absolute inset-0"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {snap.line.words.map((w, i) => {
                const shown = i <= snap.activeWord;
                const spot = layout.spots[i] ?? { x: 50, y: 50, size: 12, rot: 0 };
                const invert = i === layout.invertWord;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: reduced ? 1 : 0.7 }}
                    animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduced ? 1 : 0.7 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="text-display absolute font-semibold leading-none"
                    style={{
                      left: `${spot.x}%`,
                      top: `${spot.y}%`,
                      transform: `translate(-50%, -50%) rotate(${spot.rot}deg)`,
                      fontSize: `clamp(36px, ${spot.size}vw, 170px)`,
                      whiteSpace: "nowrap",
                      maxWidth: "84vw",
                      letterSpacing: "-0.04em",
                      textTransform: layout.upper ? "uppercase" : "none",
                      color: invert ? "#050505" : "var(--color-ink)",
                      background: invert ? "var(--color-ink)" : "transparent",
                      padding: invert ? "0 0.12em" : 0,
                    }}
                  >
                    {w.text}
                  </motion.span>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {(!lyrics || lyrics.lines.length === 0) && (
        <p className="label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted">
          No lyrics — gradient only
        </p>
      )}
    </div>
  );
}

function anchorShift(a: Anchor): string {
  if (a.align === "left") return "0";
  if (a.align === "right") return "-100%";
  return "-50%";
}

function anchorShiftY(a: Anchor): string {
  // pin the text so the far edge stays ~in view (a partial crop is fine)
  if (a.vy === "top") return "-10%";
  if (a.vy === "bot") return "-90%";
  return "-50%";
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
