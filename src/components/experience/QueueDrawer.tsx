"use client";

import { AnimatePresence, motion } from "motion/react";
import { useQueue } from "@/stores/queue";
import { SongArtwork } from "@/components/music/SongArtwork";
import type { Song } from "@/types";

export function QueueDrawer({
  open,
  onClose,
  onPlay,
}: {
  open: boolean;
  onClose: () => void;
  onPlay: (song: Song) => void;
}) {
  const items = useQueue((s) => s.items);
  const move = useQueue((s) => s.move);
  const remove = useQueue((s) => s.remove);
  const shuffle = useQueue((s) => s.shuffle);
  const clear = useQueue((s) => s.clear);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Close queue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-void/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-40 flex h-dvh w-[min(88vw,22rem)] flex-col border-l border-line bg-void-2/95 backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="label">Queue · {items.length}</span>
              <div className="flex items-center gap-4">
                {items.length > 1 && (
                  <button
                    onClick={shuffle}
                    data-cursor="interactive"
                    className="label text-muted hover:text-ink"
                  >
                    Shuffle
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={clear}
                    data-cursor="interactive"
                    className="label text-muted hover:text-ink"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={onClose}
                  data-cursor="interactive"
                  className="label text-muted hover:text-ink"
                >
                  Close
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="meta px-5 py-8 text-muted">
                Nothing queued. Add tracks from search or the library.
              </p>
            ) : (
              <ul className="edge-fade-y flex-1 overflow-y-auto">
                {items.map((song, i) => (
                  <li
                    key={song.id}
                    className="group flex items-center gap-3 border-b border-line/50 px-5 py-3"
                  >
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(song.id, -1)}
                        disabled={i === 0}
                        data-cursor="interactive"
                        aria-label="Move up"
                        className="text-muted hover:text-ink disabled:opacity-25"
                      >
                        ▴
                      </button>
                      <button
                        onClick={() => move(song.id, 1)}
                        disabled={i === items.length - 1}
                        data-cursor="interactive"
                        aria-label="Move down"
                        className="text-muted hover:text-ink disabled:opacity-25"
                      >
                        ▾
                      </button>
                    </div>
                    <button
                      onClick={() => onPlay(song)}
                      data-cursor="interactive"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <SongArtwork
                        src={song.artworkUrl}
                        alt={song.albumName || song.title}
                        seed={song.id}
                        size={36}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium tracking-tight text-ink">
                          {song.title}
                        </span>
                        <span className="meta block truncate text-muted">
                          {song.artistName}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => remove(song.id)}
                      data-cursor="interactive"
                      aria-label={`Remove ${song.title}`}
                      className="label shrink-0 text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
