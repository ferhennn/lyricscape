"use client";

import { type CSSProperties, useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useReducedMotion } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useExperienceFrame } from "@/hooks/useExperienceFrame";
import { LyricsEngine } from "@/lib/lyrics/engine";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { mulberry32, slugSeed } from "@/lib/utils";
import type { ExperienceFrame } from "@/lib/experience/frame";
import type { LyricLine } from "@/types";

/**
 * Kinetic / brutalist lyric mode. A dark gradient drifts continuously behind
 * oversized type that lands anywhere on the screen — whole lines slammed into a
 * corner, or the line broken word-by-word and scattered, each word fading as the
 * next arrives.
 */

type Anchor = {
  x: number;
  y: number;
  align: "left" | "right" | "center";
  vy: "top" | "mid" | "bot";
};

// Kept well inside the viewport; vy pins the near text edge.
const ANCHORS: Anchor[] = [
  { x: 12, y: 18, align: "left", vy: "top" },
  { x: 88, y: 20, align: "right", vy: "top" },
  { x: 12, y: 82, align: "left", vy: "bot" },
  { x: 88, y: 80, align: "right", vy: "bot" },
  { x: 50, y: 50, align: "center", vy: "mid" },
  { x: 16, y: 50, align: "left", vy: "mid" },
  { x: 84, y: 48, align: "right", vy: "mid" },
  { x: 50, y: 20, align: "center", vy: "top" },
  { x: 50, y: 80, align: "center", vy: "bot" },
];

interface LineLayout {
  mode: "line" | "words";
  anchor: Anchor;
  size: number;
  invertWord: number;
  spots: Array<{ x: number; y: number; size: number; rot: number }>;
  upper: boolean;
}

function planLine(line: LyricLine, index: number): LineLayout {
  const rand = mulberry32(slugSeed(line.id) ^ (index * 2654435761));
  const wordCount = line.words.length;
  const useWords = wordCount >= 2 && wordCount <= 7 && rand() > 0.42;
  const anchor = ANCHORS[Math.floor(rand() * ANCHORS.length)];
  const emphasis = line.emphasis ?? 0;
  const baseSize = 6 + rand() * 5 + emphasis * 4;

  const spots = line.words.map(() => ({
    x: 20 + rand() * 60,
    y: 26 + rand() * 46,
    size: 4.5 + rand() * 5 + emphasis * 3,
    rot: (rand() - 0.5) * 4,
  }));

  return {
    mode: useWords ? "words" : "line",
    anchor,
    size: Math.min(15, baseSize + (line.text.length < 14 ? 4 : 0)),
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
  const gradientRef = useRef<HTMLDivElement>(null);

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

  // Continuous, non-repeating gradient drift — layered sines at unrelated rates.
  useAnimationFrame((t) => {
    const el = gradientRef.current;
    if (!el || reduced) return;
    const s = t / 1000;
    const x = Math.sin(s * 0.11) * 6 + Math.sin(s * 0.037) * 5;
    const y = Math.cos(s * 0.09) * 5 + Math.sin(s * 0.023) * 6;
    const rot = Math.sin(s * 0.05) * 7 + Math.sin(s * 0.017) * 4;
    const scale = 1.12 + Math.sin(s * 0.07) * 0.1 + Math.sin(s * 0.013) * 0.05;
    el.style.transform = `translate3d(${x}%, ${y}%, 0) rotate(${rot}deg) scale(${scale})`;
  });

  const layout = useMemo(
    () => (snap.line ? planLine(snap.line, snap.index) : null),
    [snap.line, snap.index],
  );

  const gradient = useMemo<CSSProperties>(
    () => ({
      background: `radial-gradient(55% 45% at 22% 22%, ${hexA(palette.deep, 0.9)}, transparent 60%),
                   radial-gradient(45% 55% at 82% 72%, ${hexA(palette.secondary, 0.5)}, transparent 60%),
                   radial-gradient(75% 75% at 58% 42%, ${hexA(palette.accent, 0.12)}, transparent 70%),
                   #050505`,
    }),
    [palette],
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-void">
      <div ref={gradientRef} aria-hidden className="absolute -inset-[45%]" style={gradient} />
      <div className="absolute inset-0 bg-void/30" />
      <FilmGrain opacity={0.06} />

      <div className="pointer-events-none absolute inset-6 border border-line" />
      <span
        ref={timeRef}
        className="meta pointer-events-none absolute bottom-8 left-9 tabular-nums text-muted"
      >
        0:00
      </span>

      {showLyrics && layout && snap.line && !snap.line.instrumental && (
        <AnimatePresence>
          {layout.mode === "line" ? (
            <motion.h2
              key={`k-${snap.index}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 100% 0 0)" }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, clipPath: "inset(0 0% 0 0)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 0 0 100%)" }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="text-display absolute font-semibold leading-[0.9] text-ink"
              style={{
                left: `${layout.anchor.x}%`,
                top: `${layout.anchor.y}%`,
                transform: `translate(${anchorShift(layout.anchor)}, ${anchorShiftY(layout.anchor)})`,
                textAlign: layout.anchor.align,
                fontSize: `clamp(40px, ${layout.size}vw, 150px)`,
                letterSpacing: "-0.04em",
                textTransform: layout.upper ? "uppercase" : "none",
                maxWidth: "68vw",
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
                // Trailing fade: brightest at the active word, fading as newer
                // words arrive, gone ~2 words back.
                const behind = snap.activeWord - i;
                const wordOpacity =
                  behind < 0 ? 0 : behind === 0 ? 1 : behind === 1 ? 0.4 : behind === 2 ? 0.14 : 0;
                const spot = layout.spots[i] ?? { x: 50, y: 50, size: 10, rot: 0 };
                const invert = i === layout.invertWord && behind === 0;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: reduced ? 1 : 0.8 }}
                    animate={{
                      opacity: wordOpacity,
                      scale: behind === 0 || reduced ? 1 : 0.92,
                    }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="text-display absolute font-semibold leading-none"
                    style={{
                      left: `${spot.x}%`,
                      top: `${spot.y}%`,
                      transform: `translate(-50%, -50%) rotate(${spot.rot}deg)`,
                      fontSize: `clamp(30px, ${spot.size}vw, 120px)`,
                      letterSpacing: "-0.04em",
                      whiteSpace: "nowrap",
                      maxWidth: "72vw",
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
  if (a.vy === "top") return "0";
  if (a.vy === "bot") return "-100%";
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
