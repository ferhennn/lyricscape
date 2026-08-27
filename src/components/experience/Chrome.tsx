"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useSettings } from "@/stores/settings";
import { useHistory } from "@/stores/history";
import { Timeline } from "./Timeline";
import { cn } from "@/lib/utils";
import { LOCAL_TRACKS } from "@/data/tracks";
import type { Song, VisualMode } from "@/types";

const MODES: { value: VisualMode; label: string }[] = [
  { value: "cinematic", label: "Cinematic" },
  { value: "3d", label: "3D" },
  { value: "kinetic", label: "Kinetic" },
  { value: "minimal", label: "Minimal" },
  { value: "lyric-only", label: "Lyric only" },
];

type IconName =
  | "play"
  | "pause"
  | "back"
  | "fwd"
  | "mute"
  | "sound"
  | "exit"
  | "expand"
  | "compress";

function Icon({ name }: { name: IconName }) {
  const p: Record<IconName, string> = {
    play: "M8 5v14l11-7z",
    pause: "M6 5h4v14H6zM14 5h4v14h-4z",
    back: "M11 12 20 6v12zM4 6v12h2V6z",
    fwd: "M13 12 4 6v12zM18 6v12h2V6z",
    exit: "M6 6l12 12M18 6 6 18",
    mute: "M4 9v6h4l5 4V5L8 9zM16 9l4 6M20 9l-4 6",
    sound: "M4 9v6h4l5 4V5L8 9zM16 8a5 5 0 0 1 0 8",
    expand: "M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5",
    compress: "M9 3v5H4M20 8h-5V3M15 21v-5h5M4 16h5v5",
  };
  const filled = name === "play" || name === "pause" || name === "back" || name === "fwd";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={p[name]} fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} />
    </svg>
  );
}

function NavButton({
  icon,
  target,
  onSeek,
  onGo,
  label,
}: {
  icon: "back" | "fwd";
  target: Song | null;
  onSeek: () => void;
  onGo: (s: Song | null) => void;
  label: string;
}) {
  return (
    <span className="group relative">
      <button
        onClick={() => (target ? onGo(target) : onSeek())}
        data-cursor="interactive"
        className="p-2 text-ink/70 hover:text-ink"
        aria-label={target ? `${label}: ${target.title}` : label}
      >
        <Icon name={icon} />
      </button>
      {target && (
        <span
          className={cn(
            "pointer-events-none absolute -top-10 whitespace-nowrap rounded-md border border-line bg-void-2/95 px-2.5 py-1.5 meta text-ink opacity-0 backdrop-blur transition-opacity duration-200 group-hover:opacity-100",
            icon === "back" ? "left-0" : "right-0",
          )}
        >
          <span className="text-muted">{icon === "back" ? "Prev · " : "Next · "}</span>
          {target.title}
          <span className="text-muted"> — {target.artistName}</span>
        </span>
      )}
    </span>
  );
}

export function Chrome({ visible }: { visible: boolean }) {
  const router = useRouter();
  const {
    song,
    status,
    snapshot,
    togglePlay,
    seekBy,
    toggleMute,
    teardown,
  } = useExperience();
  const pushHistory = useHistory((s) => s.push);

  // Prev / next walk the local track library (wraps around).
  const { prev, next } = useMemo(() => {
    if (LOCAL_TRACKS.length === 0) return { prev: null, next: null };
    const i = LOCAL_TRACKS.findIndex((t) => t.id === song?.id);
    const at = (n: number) =>
      LOCAL_TRACKS[((n % LOCAL_TRACKS.length) + LOCAL_TRACKS.length) % LOCAL_TRACKS.length];
    return i === -1
      ? { prev: at(-1), next: at(0) }
      : { prev: at(i - 1), next: at(i + 1) };
  }, [song?.id]);

  const goTo = (t: Song | null) => {
    if (!t) return;
    pushHistory(t);
    teardown();
    router.push(`/experience/${t.id}`);
  };

  const showLyrics = useSettings((s) => s.showLyrics);
  const setSetting = useSettings((s) => s.set);
  const visualMode = useSettings((s) => s.visualMode);
  const [modeOpen, setModeOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  const exit = () => {
    teardown();
    router.push("/library");
  };

  const playing = status === "playing";

  return (
    <>
      {/* top */}
      <motion.header
        animate={{ opacity: visible ? 1 : 0.25, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex items-start justify-between p-5 sm:p-8"
      >
        <div className="min-w-0">
          <p className="text-display truncate text-lg font-semibold tracking-tight sm:text-xl">
            {song?.title}
          </p>
          <p className="meta truncate text-muted">{song?.artistName}</p>
        </div>
        <button onClick={exit} data-cursor="interactive" className="label flex items-center gap-2 hover:text-ink">
          Exit <Icon name="exit" />
        </button>
      </motion.header>

      {/* bottom cluster */}
      <motion.div
        animate={{ opacity: visible ? 1 : 0.3, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
      >
        <div className="pointer-events-auto flex items-center justify-between px-5 pb-12 sm:px-8 sm:pb-14">
          <div className="flex items-center gap-2">
            <NavButton
              icon="back"
              target={prev}
              onSeek={() => seekBy(-10)}
              label="Previous track"
              onGo={goTo}
            />
            <button
              onClick={togglePlay}
              data-cursor="interactive"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink hover:border-white/30"
              aria-label={playing ? "Pause" : "Play"}
            >
              <Icon name={playing ? "pause" : "play"} />
            </button>
            <NavButton
              icon="fwd"
              target={next}
              onSeek={() => seekBy(10)}
              label="Next track"
              onGo={goTo}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSetting("showLyrics", !showLyrics)}
              data-cursor="interactive"
              className={cn("label", showLyrics ? "text-ink" : "text-muted")}
            >
              Lyrics
            </button>

            <div className="relative">
              <button
                onClick={() => setModeOpen((v) => !v)}
                data-cursor="interactive"
                className="label text-ink/80 hover:text-ink"
              >
                {MODES.find((m) => m.value === visualMode)?.label}
              </button>
              <AnimatePresence>
                {modeOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute bottom-8 right-0 flex flex-col gap-1 rounded-xl border border-line bg-void-2/95 p-2 backdrop-blur"
                  >
                    {MODES.map((m) => (
                      <li key={m.value}>
                        <button
                          onClick={() => {
                            setSetting("visualMode", m.value);
                            setModeOpen(false);
                          }}
                          className={cn(
                            "label w-full whitespace-nowrap rounded-lg px-3 py-2 text-left",
                            visualMode === m.value ? "bg-ink text-void" : "text-muted hover:text-ink",
                          )}
                        >
                          {m.label}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <button onClick={toggleMute} data-cursor="interactive" className="p-2 text-ink/70 hover:text-ink" aria-label={snapshot.muted ? "Unmute" : "Mute"}>
              <Icon name={snapshot.muted ? "mute" : "sound"} />
            </button>

            <button
              onClick={toggleFullscreen}
              data-cursor="interactive"
              className="p-2 text-ink/70 hover:text-ink"
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <Icon name={fullscreen ? "compress" : "expand"} />
            </button>
          </div>
        </div>
        <Timeline visible={visible} />
      </motion.div>
    </>
  );
}
