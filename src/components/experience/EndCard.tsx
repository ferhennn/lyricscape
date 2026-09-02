"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useSearch } from "@/stores/search";
import { useHistory } from "@/stores/history";
import { useSettings } from "@/stores/settings";
import { useQueue } from "@/stores/queue";
import { Button } from "@/components/ui/Button";
import { SongArtwork } from "@/components/music/SongArtwork";
import { LOCAL_TRACKS } from "@/data/tracks";
import type { Song } from "@/types";

export function EndCard() {
  const router = useRouter();
  const song = useExperience((s) => s.song);
  const restart = useExperience((s) => s.restart);
  const teardown = useExperience((s) => s.teardown);
  const openSearch = useSearch((s) => s.setOpen);
  const push = useHistory((s) => s.push);
  const autoAdvance = useSettings((s) => s.autoplay);
  const queued = useQueue((s) => s.items);
  const dequeue = useQueue((s) => s.remove);
  const enqueue = useQueue((s) => s.add);

  const fallback = useMemo<Song[]>(() => {
    const pool = LOCAL_TRACKS.filter((t) => t.id !== song?.id);
    const sameArtist = pool.filter((t) => t.artistName === song?.artistName);
    const rest = pool.filter((t) => t.artistName !== song?.artistName);
    return [...sameArtist, ...rest].slice(0, 3);
  }, [song?.id, song?.artistName]);

  // The queue wins; otherwise suggest tracks from the local library.
  const fromQueue = queued.length > 0;
  const upNext = fromQueue ? queued.slice(0, 5) : fallback;

  function playNext(next: Song) {
    dequeue(next.id);
    push(next);
    teardown();
    router.push(`/experience/${next.id}`);
  }

  // Auto-advance: when autoplay is on and there's a track lined up, count down
  // and roll into it. Any of the buttons below cancels it.
  const [countdown, setCountdown] = useState<number | null>(() =>
    autoAdvance && upNext.length > 0 ? 8 : null,
  );

  useEffect(() => {
    if (countdown === null) return;
    const iv = setInterval(() => {
      setCountdown((c) => (c !== null && c > 0 ? c - 1 : c));
    }, 1000);
    return () => clearInterval(iv);
    // Runs once — EndCard is remounted fresh each time a song ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown === 0 && upNext[0]) playNext(upNext[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const cancelAuto = () => setCountdown(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-void px-8 py-16 text-center"
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="label mb-8"
      >
        Song complete
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 14, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.8, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-display text-4xl font-semibold tracking-tight sm:text-6xl"
      >
        {song?.title}
      </motion.h1>
      <p className="meta mt-4 text-muted">{song?.artistName}</p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-4"
      >
        <Button
          variant="primary"
          onClick={() => {
            cancelAuto();
            restart();
          }}
        >
          Play again
        </Button>
        <Button
          variant="line"
          onClick={() => {
            cancelAuto();
            teardown();
            router.push("/library");
            openSearch(true);
          }}
        >
          Choose another song
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            cancelAuto();
            teardown();
            router.push("/");
          }}
        >
          Exit
        </Button>
      </motion.div>

      {upNext.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="mt-16 w-full max-w-lg"
        >
          <div className="mb-4 flex items-baseline justify-between">
            <p className="label">{fromQueue ? "In your queue" : "Play next"}</p>
            {countdown !== null && (
              <span className="label text-muted">
                auto in {countdown}s ·{" "}
                <button
                  onClick={cancelAuto}
                  data-cursor="interactive"
                  className="text-ink hover:underline"
                >
                  cancel
                </button>
              </span>
            )}
          </div>
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {upNext.map((next) => (
              <li key={next.id} className="group flex items-center gap-3">
                <button
                  onClick={() => {
                    cancelAuto();
                    playNext(next);
                  }}
                  data-cursor="interactive"
                  className="flex min-w-0 flex-1 items-center gap-4 py-3 text-left"
                >
                  <SongArtwork
                    src={next.artworkUrl}
                    alt={next.albumName || next.title}
                    seed={next.id}
                    size={44}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium tracking-tight text-ink transition-transform duration-300 group-hover:translate-x-1">
                      {next.title}
                    </span>
                    <span className="meta block truncate text-muted">{next.artistName}</span>
                  </span>
                  <span className="label text-muted opacity-0 transition-opacity group-hover:opacity-100">
                    Play
                  </span>
                </button>
                {fromQueue ? (
                  <button
                    onClick={() => dequeue(next.id)}
                    data-cursor="interactive"
                    aria-label={`Remove ${next.title} from queue`}
                    className="label shrink-0 px-2 py-1 text-muted hover:text-ink"
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    onClick={() => enqueue(next)}
                    disabled={queued.some((q) => q.id === next.id)}
                    data-cursor="interactive"
                    aria-label={`Add ${next.title} to queue`}
                    className="label shrink-0 whitespace-nowrap px-2 py-1 text-muted hover:text-ink disabled:opacity-50"
                  >
                    {queued.some((q) => q.id === next.id) ? "Queued" : "+ Queue"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
