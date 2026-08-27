"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useSearch } from "@/stores/search";
import { useHistory } from "@/stores/history";
import { SongArtwork } from "./SongArtwork";
import { LocalFileButton } from "./LocalFileButton";
import { formatTime } from "@/lib/utils";
import { LOCAL_TRACKS } from "@/data/tracks";
import type { Song } from "@/types";

const ease = [0.16, 1, 0.3, 1] as const;

function ResultRow({ song, index, onPick }: { song: Song; index: number; onPick: () => void }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.4, ease }}
    >
      <button
        onClick={onPick}
        data-cursor="interactive"
        className="group flex w-full items-center gap-5 border-b border-line/60 py-3.5 text-left"
      >
        <div className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]">
          <SongArtwork src={song.artworkUrl} alt={song.albumName || song.title} seed={song.id} size={52} />
        </div>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-medium tracking-tight text-ink transition-transform duration-500 group-hover:translate-x-1">
            {song.title}
          </span>
          <span className="meta block truncate text-muted">
            {song.artistName}
            {song.albumName ? ` · ${song.albumName}` : ""}
          </span>
        </span>
        {song.provider === "synthetic" && (
          <span className="label rounded-full border border-line px-2 py-1">Demo</span>
        )}
        {song.durationMs > 0 && (
          <span className="meta text-muted">{formatTime(song.durationMs / 1000)}</span>
        )}
      </button>
    </motion.li>
  );
}

export function SearchOverlay() {
  const router = useRouter();
  const { open, query, results, loading, error, source, setOpen, setQuery, run, clear } =
    useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const push = useHistory((s) => s.push);
  const recent = useHistory((s) => s.recent);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void run(), 280);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, open, run]);

  function choose(song: Song) {
    push(song);
    setOpen(false);
    clear();
    router.push(`/experience/${song.id}`);
  }

  const hasQuery = query.trim().length > 0;
  const localIds = new Set(LOCAL_TRACKS.map((t) => t.id));
  const recentTrimmed = recent.filter((s) => !localIds.has(s.id)).slice(0, 8);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            aria-label="Close search"
            className="absolute inset-0 bg-void/80 backdrop-blur-xl"
            onClick={() => setOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Search music"
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.4, ease }}
            className="relative w-full max-w-2xl"
          >
            <div className="mb-4 flex items-baseline justify-between">
              <span className="label">Search music</span>
              <span className="label">
                {source === "demo"
                  ? "Demo catalog"
                  : source === "apple-music"
                    ? "Apple Music"
                    : source === "jamendo"
                      ? "Jamendo"
                      : source === "local"
                        ? "Your tracks"
                        : ""}
              </span>
            </div>

            <div className="border-b border-line pb-4">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) choose(results[0]);
                }}
                placeholder="What do you want to hear?"
                className="w-full bg-transparent text-display text-3xl font-medium tracking-tight text-ink placeholder:text-muted/50 focus:outline-none sm:text-4xl"
              />
            </div>

            <div className="edge-fade-y mt-6 max-h-[52vh] overflow-y-auto">
              {hasQuery ? (
                <>
                  {loading && <p className="meta px-1 py-3 text-muted">Searching…</p>}
                  {error && <p className="meta px-1 py-3 text-accent-2">{error}</p>}
                  {!loading && !error && results.length === 0 && (
                    <p className="meta px-1 py-3 text-muted">Nothing found.</p>
                  )}
                  <ul className="flex flex-col">
                    {results.map((song, i) => (
                      <ResultRow key={song.id} song={song} index={i} onPick={() => choose(song)} />
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex flex-col gap-6">
                  {LOCAL_TRACKS.length > 0 && (
                    <section>
                      <p className="label mb-1 px-1">Your tracks</p>
                      <ul className="flex flex-col">
                        {LOCAL_TRACKS.map((song, i) => (
                          <ResultRow
                            key={song.id}
                            song={song}
                            index={i}
                            onPick={() => choose(song)}
                          />
                        ))}
                      </ul>
                    </section>
                  )}
                  {recentTrimmed.length > 0 && (
                    <section>
                      <p className="label mb-1 px-1">Recently played</p>
                      <ul className="flex flex-col">
                        {recentTrimmed.map((song, i) => (
                          <ResultRow
                            key={song.id}
                            song={song}
                            index={i}
                            onPick={() => choose(song)}
                          />
                        ))}
                      </ul>
                    </section>
                  )}
                  {LOCAL_TRACKS.length === 0 && recentTrimmed.length === 0 && (
                    <p className="meta px-1 py-3 text-muted">
                      Start typing, or drop an audio file in <code>public/tracks/</code>.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <LocalFileButton label="Or open a local file →" onDone={() => setOpen(false)} />
              <span className="label">Enter to play the first result</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
