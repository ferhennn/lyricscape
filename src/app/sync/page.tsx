import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sync — live audio-reactive visuals",
  description:
    "Three WebGL scenes that react in real time to whatever your machine is playing. No lyrics, just motion.",
};

const SCENES = [
  {
    slug: "nebula",
    label: "Nebula",
    copy: "Domain-warped gas clouds drifting through deep space. Bass swells the density, treble cools the palette, every kick blooms the core.",
  },
  {
    slug: "tunnel",
    label: "Tunnel",
    copy: "Flight through an endless faceted corridor. The live waveform bends the walls, bass drives the speed, beats fire rings down the tube.",
  },
  {
    slug: "liquid",
    label: "Liquid",
    copy: "A raymarched metaball blob breathing in place. Bass inflates it, the spectrum ripples its skin, a beat sends a shell outward.",
  },
] as const;

export default function SyncIndex() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <p className="label mb-4">Audio → light</p>
      <h1 className="text-display mb-5 text-5xl sm:text-6xl">Sync</h1>
      <p className="meta mb-3 max-w-lg text-muted">
        Three shader scenes wired to a live analyser. Point them at any tab or at
        your whole system audio and they move with the music — no lyrics, no
        track data, pure reaction.
      </p>
      <p className="meta mb-12 max-w-lg text-muted">
        Best in Chrome or Edge (real system audio). Elsewhere it falls back to the
        microphone. The audio session carries across all three scenes — grant it
        once.
      </p>

      <ul className="space-y-3">
        {SCENES.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/sync/${s.slug}`}
              className="group block rounded-2xl border border-line p-5 transition hover:bg-ink/5"
            >
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-display text-2xl">{s.label}</span>
                <span className="label transition group-hover:text-ink">
                  open ▸
                </span>
              </div>
              <p className="meta text-muted">{s.copy}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
