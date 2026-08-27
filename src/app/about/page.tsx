import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { FilmGrain } from "@/components/ui/FilmGrain";

export const metadata: Metadata = {
  title: "About",
  description: "What LYRICSCAPE is and how it works.",
};

const shortcuts: Array<[string, string]> = [
  ["Space", "Play / pause"],
  ["← / →", "Seek 5 seconds"],
  ["L", "Toggle lyrics"],
  ["M", "Mute"],
  ["F", "Fullscreen"],
  ["V", "Cycle visual mode"],
  ["Esc", "Exit experience"],
  ["/", "Search"],
];

export default function AboutPage() {
  return (
    <AppShell>
      <main className="relative min-h-dvh bg-void px-6 py-8 sm:px-10">
        <FilmGrain />
        <Link href="/" className="label tracking-[0.34em]!">
          LYRICSCAPE
        </Link>

        <div className="mx-auto mt-24 max-w-2xl">
          <h1 className="text-display text-[10vw] font-semibold leading-none sm:text-6xl">
            Music, but visual.
          </h1>
          <div className="mt-10 space-y-6 text-lg leading-relaxed text-ink/80">
            <p>
              LYRICSCAPE turns a song into a place. It plays through Apple Music, pulls
              time-synced lyrics, and renders them inside a cinematic WebGL world that
              breathes with the structure of the track.
            </p>
            <p>
              Without Apple Music credentials it runs in <span className="accent-text">demo mode</span>{" "}
              — <em>Afterlight</em>: original lyrics and scene direction set to{" "}
              <a
                href="https://incompetech.com/music/royalty-free/mp3-royaltyfree/Ossuary%206%20-%20Air.mp3"
                className="accent-text underline-offset-4 hover:underline"
              >
                &ldquo;Ossuary 6 &ndash; Air&rdquo;
              </a>{" "}
              by{" "}
              <a href="https://incompetech.com" className="accent-text underline-offset-4 hover:underline">
                Kevin MacLeod
              </a>
              , licensed{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="accent-text underline-offset-4 hover:underline"
              >
                CC BY 4.0
              </a>
              .
            </p>
            <p className="text-muted">
              Lyrics for catalog songs come from{" "}
              <a href="https://lrclib.net" className="accent-text underline-offset-4 hover:underline">
                LRCLIB
              </a>
              , a community lyric database. Word timing is estimated from line timing when
              the source only provides line-level stamps.
            </p>
          </div>

          <h2 className="label mt-16">Keyboard</h2>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {shortcuts.map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between py-3">
                <dt className="meta text-ink">{key}</dt>
                <dd className="meta text-muted">{desc}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-16 flex gap-6">
            <Link href="/settings" className="label hover:text-ink">
              Settings
            </Link>
            <Link href="/library" className="label hover:text-ink">
              Library
            </Link>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
