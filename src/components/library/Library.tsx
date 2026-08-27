"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { SongArtwork } from "@/components/music/SongArtwork";
import { Button } from "@/components/ui/Button";
import { useHistory } from "@/stores/history";
import { useSearch } from "@/stores/search";
import { useAppleMusic } from "@/hooks/useAppleMusic";
import { appleMusic } from "@/lib/apple-music/service";
import { DEMO_CONFIG } from "@/data/demo";
import type { Song } from "@/types";
import { formatTime } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

function Shelf({ title, songs }: { title: string; songs: Song[] }) {
  const router = useRouter();
  const push = useHistory((s) => s.push);
  if (songs.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="label mb-6">{title}</h2>
      <div className="edge-fade-y -mx-6 flex gap-8 overflow-x-auto px-6 pb-4">
        {songs.map((song, i) => (
          <motion.button
            key={`${title}-${song.id}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.6, ease }}
            onClick={() => {
              push(song);
              router.push(`/experience/${song.id}`);
            }}
            data-cursor="interactive"
            className="group w-[46vw] shrink-0 text-left sm:w-64"
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
          </motion.button>
        ))}
      </div>
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

      <Shelf title="Featured demo" songs={[DEMO_CONFIG.song]} />
      <Shelf title="Recently played" songs={recent} />
      <Shelf title="From your library" songs={librarySongs} />
      <Shelf title="Trending on Jamendo" songs={trending} />
    </main>
  );
}
