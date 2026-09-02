"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { SongArtwork } from "@/components/music/SongArtwork";
import { Button } from "@/components/ui/Button";
import { useHistory } from "@/stores/history";
import { useQueue } from "@/stores/queue";
import { useSearch } from "@/stores/search";
import { useAppleMusic } from "@/hooks/useAppleMusic";
import { appleMusic } from "@/lib/apple-music/service";
import { DEMO_CONFIG } from "@/data/demo";
import { LOCAL_TRACKS } from "@/data/tracks";
import type { Song } from "@/types";
import { formatTime } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

function Shelf({ title, songs }: { title: string; songs: Song[] }) {
  const router = useRouter();
  const push = useHistory((s) => s.push);
  const addToQueue = useQueue((s) => s.add);
  const queued = useQueue((s) => s.items);
  if (songs.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="label mb-6">{title}</h2>
      <div className="edge-fade-y -mx-6 flex gap-8 overflow-x-auto px-6 pb-4">
        {songs.map((song, i) => {
          const isQueued = queued.some((q) => q.id === song.id);
          return (
            <motion.div
              key={`${title}-${song.id}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.6, ease }}
              className="group relative w-[46vw] shrink-0 text-left sm:w-64"
            >
              <button
                onClick={() => {
                  push(song);
                  router.push(`/experience/${song.id}`);
                }}
                data-cursor="interactive"
                className="block w-full text-left"
              >
                <div className="overflow-hidden">
                  <div className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]">
                    <SongArtwork
                      src={song.artworkUrl}
                      alt={song.albumName || song.title}
                      seed={song.id}
                      size={256}
                      className="aspect-square w-full"
                    />
                  </div>
                </div>
                <p className="mt-4 truncate text-lg font-medium tracking-tight">{song.title}</p>
                <p className="meta truncate text-muted">
                  {song.artistName}
                  {song.durationMs ? ` · ${formatTime(song.durationMs / 1000)}` : ""}
                </p>
              </button>
              <button
                onClick={() => addToQueue(song)}
                disabled={isQueued}
                data-cursor="interactive"
                aria-label={isQueued ? "Already queued" : `Add ${song.title} to queue`}
                className="label absolute right-2 top-2 rounded-full border border-line bg-void/80 px-2.5 py-1 text-ink opacity-0 backdrop-blur transition-opacity hover:bg-void focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-100 disabled:text-muted"
              >
                {isQueued ? "Queued" : "+ Queue"}
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function QueuePanel() {
  const router = useRouter();
  const items = useQueue((s) => s.items);
  const remove = useQueue((s) => s.remove);
  const shuffle = useQueue((s) => s.shuffle);
  const clear = useQueue((s) => s.clear);
  const push = useHistory((s) => s.push);
  if (items.length === 0) return null;

  const play = (song: Song) => {
    remove(song.id);
    push(song);
    router.push(`/experience/${song.id}`);
  };

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="label">Up next · {items.length}</h2>
        <div className="flex items-center gap-4">
          {items.length > 1 && (
            <button
              className="label text-muted hover:text-ink"
              onClick={shuffle}
              data-cursor="interactive"
            >
              Shuffle
            </button>
          )}
          <button className="label text-muted hover:text-ink" onClick={clear} data-cursor="interactive">
            Clear queue
          </button>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {items.map((song, i) => (
          <li key={song.id} className="group flex items-center gap-4 py-3">
            <span className="label w-5 shrink-0 text-muted">{i + 1}</span>
            <button
              onClick={() => play(song)}
              data-cursor="interactive"
              className="flex min-w-0 flex-1 items-center gap-4 text-left"
            >
              <SongArtwork
                src={song.artworkUrl}
                alt={song.albumName || song.title}
                seed={song.id}
                size={40}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium tracking-tight text-ink transition-transform duration-300 group-hover:translate-x-1">
                  {song.title}
                </span>
                <span className="meta block truncate text-muted">{song.artistName}</span>
              </span>
            </button>
            <button
              onClick={() => remove(song.id)}
              data-cursor="interactive"
              className="label shrink-0 px-2 py-1 text-muted hover:text-ink"
              aria-label={`Remove ${song.title} from queue`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Library() {
  const recent = useHistory((s) => s.recent);
  const openSearch = useSearch((s) => s.setOpen);
  const { status } = useAppleMusic();
  const [librarySongs, setLibrarySongs] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jamendo/search?limit=12")
      .then((r) => (r.ok ? r.json() : { songs: [] }))
      .then((b: { songs?: Song[] }) => {
        if (!cancelled) setTrending(b.songs ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!status.authorized) return;
    let cancelled = false;
    appleMusic
      .initialize()
      .then((instance) => instance.api.music("/v1/me/library/songs", { limit: 20 }))
      .then((res) => {
        if (cancelled) return;
        const songs: Song[] = (res.data.data ?? []).map((r) => ({
          id: r.attributes?.playParams?.catalogId ?? r.id,
          title: r.attributes?.name ?? "Unknown",
          artistName: r.attributes?.artistName ?? "",
          albumName: r.attributes?.albumName ?? "",
          durationMs: r.attributes?.durationInMillis ?? 0,
          artworkUrl: r.attributes?.artwork?.url
            ?.replace("{w}", "500")
            .replace("{h}", "500"),
          provider: "apple-music",
        }));
        setLibrarySongs(songs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status.authorized]);

  return (
    <main className="relative min-h-dvh bg-void px-6 pb-32 pt-8 sm:px-10">
      <FilmGrain />
      <header className="flex items-center justify-between">
        <Link href="/" className="label tracking-[0.34em]!">
          LYRICSCAPE
        </Link>
        <div className="flex items-center gap-6">
          <button className="label" onClick={() => openSearch(true)} data-cursor="interactive">
            Search /
          </button>
          <Link href="/settings" className="label">
            Settings
          </Link>
        </div>
      </header>

      <motion.h1
        initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1, ease }}
        className="text-display mt-24 max-w-4xl text-[12vw] font-semibold leading-[0.95] sm:text-[6rem]"
      >
        {status.authorized ? "Your library," : "Choose a song,"}
        <br />
        <span className="text-muted">enter the world.</span>
      </motion.h1>

      {!status.authorized && (
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button variant="primary" onClick={() => openSearch(true)}>
            Search music
          </Button>
          <Link href={`/experience/${DEMO_CONFIG.song.id}`}>
            <Button variant="line">Play the demo</Button>
          </Link>
        </div>
      )}

      <QueuePanel />

      <Shelf title="Your tracks" songs={LOCAL_TRACKS} />
      <Shelf title="Featured demo" songs={[DEMO_CONFIG.song]} />
      <Shelf title="Recently played" songs={recent} />
      <Shelf title="From your library" songs={librarySongs} />
      <Shelf title="Trending on Jamendo" songs={trending} />
    </main>
  );
}
