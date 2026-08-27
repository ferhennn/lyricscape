"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useSearch } from "@/stores/search";
import { useHistory } from "@/stores/history";
import { SongArtwork } from "./SongArtwork";
import { LocalFileButton } from "./LocalFileButton";
import { formatTime } from "@/lib/utils";
import type { Song } from "@/types";

const ease = [0.16, 1, 0.3, 1] as const;

export function SearchOverlay() {
  const router = useRouter();
  const { open, query, results, loading, error, source, setOpen, setQuery, run, clear } =
    useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const push = useHistory((s) => s.push);

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

            <div className="edge-fade-y mt-6 max-h-[46vh] overflow-y-auto">
              {loading && <p className="meta px-1 py-3 text-muted">Searching…</p>}
              {error && <p className="meta px-1 py-3 text-accent-2">{error}</p>}
              {!loading && !error && query && results.length === 0 && (
                <p className="meta px-1 py-3 text-muted">Nothing found.</p>
              )}

              <ul className="flex flex-col">
                {results.map((song, i) => (
                  <motion.li
                    key={song.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.4, ease }}
                  >
                    <button
                      onClick={() => choose(song)}
                      data-cursor="interactive"
                      className="group flex w-full items-center gap-5 border-b border-line/60 py-3.5 text-left"
                    >
                      <div className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]">
                        <SongArtwork
                          src={song.artworkUrl}
                          alt={song.albumName || song.title}
                          seed={song.id}
                          size={52}
                        />
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
                ))}
              </ul>
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
