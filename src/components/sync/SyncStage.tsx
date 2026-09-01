"use client";

import { Canvas } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAudio } from "./AudioProvider";
import { NebulaScene } from "./scenes/NebulaScene";
import { TunnelScene } from "./scenes/TunnelScene";
import { LiquidScene } from "./scenes/LiquidScene";

const SCENES = [
  { slug: "nebula", label: "Nebula", hint: "particle gas · bass swell" },
  { slug: "tunnel", label: "Tunnel", hint: "waveform corridor · beat rings" },
  { slug: "liquid", label: "Liquid", hint: "metaball blob · skin ripple" },
] as const;

type Slug = (typeof SCENES)[number]["slug"];

function sceneFor(pathname: string): Slug | null {
  const m = pathname.match(/\/sync\/(nebula|tunnel|liquid)/);
  return (m?.[1] as Slug) ?? null;
}

export function SyncStage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = sceneFor(pathname);
  const { status, source, error, start, stop } = useAudio();

  // fade-through-black on scene change
  const [veil, setVeil] = useState(false);
  const prev = useRef<Slug | null>(active);
  useEffect(() => {
    if (active && prev.current && active !== prev.current) {
      setVeil(true);
      const t = setTimeout(() => setVeil(false), 420);
      return () => clearTimeout(t);
    }
    prev.current = active;
  }, [active]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  const running = status === "running";

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-void text-ink">
      {active && (
        <div className="fixed inset-0 z-0">
          <Canvas
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
            }}
            dpr={[1, 1.75]}
            camera={{ position: [0, 0, 1], fov: 50 }}
          >
            {active === "nebula" && <NebulaScene key="nebula" />}
            {active === "tunnel" && <TunnelScene key="tunnel" />}
            {active === "liquid" && <LiquidScene key="liquid" />}
          </Canvas>
        </div>
      )}

      {/* transition veil */}
      <div
        className="pointer-events-none fixed inset-0 z-30 bg-void transition-opacity duration-300"
        style={{ opacity: veil ? 1 : 0 }}
      />

      {/* idle / permission gate */}
      {active && !running && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-void/70 backdrop-blur-sm">
          <div className="max-w-sm px-6 text-center">
            <p className="label mb-3">Audio sync</p>
            <h2 className="text-display mb-4 text-3xl">Feed it the sound.</h2>
            <p className="meta mb-6 text-muted">
              Pick a browser tab and tick <em>Share tab audio</em>, or choose your
              whole screen and tick <em>Share system audio</em>. Nothing is
              recorded or uploaded — it stays in this tab.
            </p>
            <button
              onClick={() => void start()}
              disabled={status === "starting"}
              className="rounded-full border border-line bg-ink px-6 py-2.5 font-mono text-sm text-void transition hover:opacity-90 disabled:opacity-50"
            >
              {status === "starting" ? "Waiting for picker…" : "Start audio"}
            </button>
            {error && <p className="meta mt-4 text-accent-2">{error}</p>}
          </div>
        </div>
      )}

      {/* chrome */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
        <Link href="/sync" className="label hover:text-ink">
          ◂ Lyricscape / Sync
        </Link>
        <div className="flex items-center gap-3">
          {running && (
            <button onClick={stop} className="meta text-muted hover:text-ink">
              {source === "system" ? "● system audio" : "● mic"} — stop
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="meta text-muted hover:text-ink"
            aria-label="Toggle fullscreen"
          >
            ⤢
          </button>
        </div>
      </header>

      {active && (
        <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-1 p-4">
          {SCENES.map((s) => {
            const on = s.slug === active;
            return (
              <Link
                key={s.slug}
                href={`/sync/${s.slug}`}
                className={`group rounded-full border px-4 py-2 font-mono text-xs transition ${
                  on
                    ? "border-line bg-ink/10 text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {s.label}
                <span className="ml-2 hidden text-[10px] text-muted group-hover:inline">
                  {s.hint}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
