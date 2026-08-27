"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useSettings } from "@/stores/settings";
import { useHistory } from "@/stores/history";
import { LoadingExperience } from "./LoadingExperience";
import { ErrorExperience } from "./ErrorExperience";
import { Chrome } from "./Chrome";
import { EndCard } from "./EndCard";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { AccentBridge } from "./AccentBridge";
import { LyricsView } from "@/components/lyrics/LyricsView";
import { KineticLyrics } from "@/components/lyrics/KineticLyrics";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { ParticleCanvas } from "@/components/ui/ParticleCanvas";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { detectWebGL } from "@/lib/visuals/quality";
import { bindPointer } from "@/lib/experience/pointer";

const ExperienceCanvas = dynamic(() => import("@/components/three/ExperienceCanvas"), {
  ssr: false,
});

export function ExperienceRoot({ songId }: { songId: string }) {
  const {
    status,
    error,
    loadingLabel,
    song,
    prepare,
    play,
    teardown,
    controlsVisible,
    setControlsVisible,
  } = useExperience();
  const autoplay = useSettings((s) => s.autoplay);
  const visualMode = useSettings((s) => s.visualMode);
  const showLyrics = useSettings((s) => s.showLyrics);
  const pushHistory = useHistory((s) => s.push);
  const reducedPref = useReducedMotion();

  // Client-only WebGL probe — server renders the fallback, client upgrades.
  const webgl = useSyncExternalStore(
    () => () => {},
    () => detectWebGL(),
    () => false as boolean,
  );
  const [introDone, setIntroDone] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => bindPointer(), []);

  useEffect(() => {
    void prepare(songId);
    return () => teardown();
  }, [songId, prepare, teardown]);

  // Cinematic intro, then autoplay.
  useEffect(() => {
    if (status !== "ready") return;
    if (song) pushHistory(song);
    const t = setTimeout(() => {
      setIntroDone(true);
      if (autoplay) play();
    }, 1700);
    return () => clearTimeout(t);
  }, [status, song, autoplay, play, pushHistory]);

  // Autoplay across a route navigation loses the user-gesture that Web Audio and
  // MusicKit need. Retry playback on the first interaction if it didn't start.
  useEffect(() => {
    if (status !== "ready" && status !== "paused") return;
    if (!autoplay) return;
    const kick = () => {
      const st = useExperience.getState().status;
      if (st !== "playing" && st !== "ended") play();
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
      window.removeEventListener("touchstart", kick);
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    window.addEventListener("touchstart", kick);
    return cleanup;
  }, [status, autoplay, play]);

  // Controls dim (never fully hide) after a stretch of inactivity while playing.
  useEffect(() => {
    const bump = () => {
      setControlsVisible(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (useExperience.getState().status === "playing") setControlsVisible(false);
      }, 6000);
    };
    const evts = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    evts.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();
    return () => {
      evts.forEach((e) => window.removeEventListener(e, bump));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [setControlsVisible]);

  if (status === "idle" || status === "preparing") {
    return (
      <LoadingExperience
        label={loadingLabel}
        title={song?.title}
        artist={song?.artistName}
      />
    );
  }

  if (status === "error") {
    return <ErrorExperience message={error ?? "Something went wrong."} onRetry={() => prepare(songId)} />;
  }

  const use3D = (visualMode === "cinematic" || visualMode === "3d") && webgl === true;
  const lyricVariant =
    visualMode === "lyric-only" ? "reader" : visualMode === "minimal" ? "minimal" : "center";

  const world =
    visualMode === "kinetic" ? (
      <KineticLyrics showLyrics={showLyrics} />
    ) : (
      <>
        {use3D ? (
          <ExperienceCanvas />
        ) : (
          <div className="absolute inset-0 bg-void">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 45%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 65%)",
              }}
            />
            {visualMode !== "lyric-only" && (
              <ParticleCanvas
                className="absolute inset-0 h-full w-full opacity-60"
                color="232,185,143"
                intensity={0.5}
              />
            )}
          </div>
        )}

        {showLyrics && <LyricsView variant={lyricVariant} />}

        {visualMode !== "lyric-only" && (
          <FilmGrain opacity={visualMode === "minimal" ? 0.03 : 0.05} />
        )}
      </>
    );

  return (
    <div className="fixed inset-0 overflow-hidden bg-void text-ink">
      <CustomCursor />
      <AccentBridge />
      <KeyboardShortcuts />

      {/* cinematic intro overlay */}
      <AnimatePresence>
        {!introDone && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-void"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
          >
            <motion.div
              initial={{ scale: reducedPref ? 1 : 0.6, opacity: 0 }}
              animate={{ scale: reducedPref ? 1 : 1.05, opacity: 1 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6"
            >
              {song?.artworkUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={song.artworkUrl}
                  alt=""
                  className="h-40 w-40 object-cover"
                  style={{ boxShadow: "0 0 120px 20px color-mix(in srgb, var(--accent) 24%, transparent)" }}
                />
              )}
              <div className="text-center">
                <p className="text-display text-2xl font-semibold tracking-tight">{song?.title}</p>
                <p className="meta mt-2 text-muted">{song?.artistName}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {world}

      {status === "ended" && <EndCard />}

      {visualMode !== "lyric-only" && status !== "ended" && (
        <Chrome visible={controlsVisible} />
      )}

      {visualMode === "lyric-only" && status !== "ended" && <MinimalExit />}
    </div>
  );
}

function MinimalExit() {
  const router = useRouter();
  const teardown = useExperience((s) => s.teardown);
  const togglePlay = useExperience((s) => s.togglePlay);
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-0 z-20 flex items-center justify-between p-6">
      <button className="label hover:text-ink" onClick={togglePlay}>
        Play / Pause
      </button>
      <button
        className="label hover:text-ink"
        onClick={() => {
          teardown();
          router.push("/library");
        }}
      >
        Exit
      </button>
    </div>
  );
}
