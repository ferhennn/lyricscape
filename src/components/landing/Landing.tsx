"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ParticleCanvas } from "@/components/ui/ParticleCanvas";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { Button } from "@/components/ui/Button";
import { useAppleMusic } from "@/hooks/useAppleMusic";
import { DEMO_SONG_ID } from "@/data/demo";

const ease = [0.16, 1, 0.3, 1] as const;

export function Landing() {
  const router = useRouter();
  const { available, connecting, connect, status } = useAppleMusic();
  const [note, setNote] = useState<string | null>(null);

  async function onConnect() {
    if (available === false) {
      setNote("Apple Music isn't configured on this deployment. Try the demo.");
      return;
    }
    await connect();
    router.push("/library");
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-void">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 40%, rgba(232,185,143,0.06), transparent 60%)",
        }}
      />
      <ParticleCanvas className="absolute inset-0 h-full w-full opacity-70" intensity={0.35} />
      <FilmGrain />

      {/* Top chrome — deliberately tiny */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10"
      >
        <span className="label tracking-[0.34em]! text-ink/80">LYRICSCAPE</span>
        <nav className="flex items-center gap-6">
          <Link href="/about" className="label hover:text-ink/90">
            About
          </Link>
          <Link href="/settings" className="label hover:text-ink/90">
            Settings
          </Link>
        </nav>
      </motion.header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 18, filter: "blur(14px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.5, duration: 1.3, ease }}
          className="text-display text-[13vw] font-semibold leading-none sm:text-[9vw] lg:text-[7.5rem]"
        >
          LYRICSCAPE
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 1, ease }}
          className="mt-6 label text-[0.7rem]! tracking-[0.5em]! text-muted"
        >
          Music, but visual.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1, ease }}
          className="mt-16 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Button
            variant="primary"
            onClick={onConnect}
            disabled={connecting}
            data-cursor="interactive"
          >
            {connecting ? "Connecting…" : status.authorized ? "Enter Library" : "Connect Apple Music"}
          </Button>
          <Button variant="line" onClick={() => router.push(`/experience/${DEMO_SONG_ID}`)}>
            Try Demo
          </Button>
        </motion.div>

        {note && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 max-w-xs meta text-muted"
          >
            {note}
          </motion.p>
        )}
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10"
      >
        <span className="label">
          {available === null
            ? "Checking sources…"
            : available
              ? "Apple Music ready"
              : "Demo mode"}
        </span>
        <span className="label hidden sm:block">Press / to search</span>
      </motion.footer>
    </main>
  );
}
