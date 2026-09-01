import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sync — live audio-reactive visuals",
  description:
    "Three WebGL scenes that react in real time to whatever your machine is playing. No lyrics, just motion.",
};

const SCENES = [
  {
    slug: "smooth",
    label: "Smooth",
    tag: "for calm, relaxed listening",
    copy: "Slow-flowing fields of colour, like ink in water. Nothing snaps to the beat — the flow follows the section energy, the palette warms with the mix, and a chorus opens a soft wash of light.",
  },
  {
    slug: "soothing",
    label: "Soothing",
    tag: "for ambient & acoustic",
    copy: "Slow aurora curtains. Motion winds down as the track gets sparser, the veil rises on the swells, and a lift sends one gentle wave of brightness through the sky. Beats are barely felt.",
  },
  {
    slug: "pop",
    label: "Pop",
    tag: "for pop, electronic, hip-hop",
    copy: "Loud and beat-locked. The core punches on every kick, a drop kicks the whole frame in with a shockwave and a palette flip, treble throws sparks, and the hue rides the brightness of the mix.",
  },
] as const;

export default function SyncIndex() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <p className="label mb-4">Audio → light</p>
      <h1 className="text-display mb-5 text-5xl sm:text-6xl">Sync</h1>
      <p className="meta mb-3 max-w-lg text-muted">
        Three shader scenes wired to a live analyser that tracks loudness,
        dynamics, brightness and drops — not just raw volume. Point them at any
        tab or at your whole system audio and they move with the music. No
        lyrics, no track data, pure reaction.
      </p>
      <p className="meta mb-12 max-w-lg text-muted">
        Pick the one that fits what you&apos;re playing. Best in Chrome or Edge
        (real system audio); elsewhere it falls back to the microphone. The audio
        session carries across all three — grant it once.
      </p>

      <ul className="space-y-3">
        {SCENES.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/sync/${s.slug}`}
              className="group block rounded-2xl border border-line p-5 transition hover:bg-ink/5"
            >
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-display text-2xl">
                  {s.label}
                  <span className="label ml-3 align-middle">{s.tag}</span>
                </span>
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
