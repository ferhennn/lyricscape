"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useQueue } from "@/stores/queue";
import { useHistory } from "@/stores/history";
import { SongArtwork } from "@/components/music/SongArtwork";
import { clamp, formatTime } from "@/lib/utils";

function Glyph({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export function MiniPlayer() {
  const pathname = usePathname();
  const router = useRouter();
  const song = useExperience((s) => s.song);
  const status = useExperience((s) => s.status);
  const clock = useExperience((s) => s.clock);
  const togglePlay = useExperience((s) => s.togglePlay);
  const teardown = useExperience((s) => s.teardown);
  const queueHead = useQueue((s) => s.items[0]);
  const dequeue = useQueue((s) => s.remove);
  const pushHistory = useHistory((s) => s.push);

  // Hidden inside the immersive experience (it has its own chrome) and when
  // nothing is loaded.
  const onExperience = pathname?.startsWith("/experience") ?? false;
  const active = !!song && status !== "idle" && status !== "error" && !onExperience;

  const fillRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      const d = clock.duration || 1;
      if (fillRef.current)
        fillRef.current.style.transform = `scaleX(${clamp(clock.time / d, 0, 1)})`;
      if (timeRef.current) timeRef.current.textContent = formatTime(clock.time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, clock]);

  const expand = () => song && router.push(`/experience/${song.id}`);
  const playNextInQueue = () => {
    if (!queueHead) return;
    dequeue(queueHead.id);
    pushHistory(queueHead);
    router.push(`/experience/${queueHead.id}`);
  };

  const playing = status === "playing";

  return (
    <AnimatePresence>
      {active && song && (
        <motion.div
          initial={{ y: 96 }}
          animate={{ y: 0 }}
          exit={{ y: 96 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-void-2/95 backdrop-blur"
        >
          <div className="h-px w-full bg-white/10">
            <div
              ref={fillRef}
              className="h-full origin-left bg-[var(--accent)]"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5 sm:gap-4">
            <button
              onClick={expand}
              data-cursor="interactive"
              aria-label={`Open ${song.title}`}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <SongArtwork
                src={song.artworkUrl}
                alt={song.albumName || song.title}
                seed={song.id}
                size={40}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium tracking-tight text-ink">
                  {song.title}
                </span>
                <span className="meta block truncate text-muted">{song.artistName}</span>
              </span>
            </button>

            <span className="meta hidden shrink-0 tabular-nums text-muted sm:block">
              <span ref={timeRef}>0:00</span> / {formatTime(clock.duration || 0)}
            </span>

            <button
              onClick={togglePlay}
              data-cursor="interactive"
              aria-label={playing ? "Pause" : "Play"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:border-white/30"
            >
              <Glyph d={playing ? "M6 5h4v14H6zM14 5h4v14h-4z" : "M8 5v14l11-7z"} fill />
            </button>

            {queueHead && (
              <button
                onClick={playNextInQueue}
                data-cursor="interactive"
                aria-label={`Next: ${queueHead.title}`}
                className="hidden h-9 w-9 shrink-0 items-center justify-center text-ink/70 hover:text-ink sm:flex"
              >
                <Glyph d="M13 12 4 6v12zM18 6v12h2V6z" fill />
              </button>
            )}

            <button
              onClick={expand}
              data-cursor="interactive"
              aria-label="Expand player"
              className="flex h-9 w-9 shrink-0 items-center justify-center text-ink/70 hover:text-ink"
            >
              <Glyph d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" />
            </button>

            <button
              onClick={teardown}
              data-cursor="interactive"
              aria-label="Stop playback"
              className="flex h-9 w-9 shrink-0 items-center justify-center text-ink/70 hover:text-ink"
            >
              <Glyph d="M6 6l12 12M18 6 6 18" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
