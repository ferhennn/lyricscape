"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { useSettings } from "@/stores/settings";
import { useAppleMusic } from "@/hooks/useAppleMusic";
import { useMusicSources } from "@/hooks/useMusicSources";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Settings } from "@/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-6 sm:flex-row sm:items-center sm:justify-between">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1 rounded-full border border-line p-1">
      {[
        { v: true, label: "On" },
        { v: false, label: "Off" },
      ].map((o) => (
        <button
          key={o.label}
          onClick={() => onChange(o.v)}
          data-cursor="interactive"
          className={cn(
            "label rounded-full px-3 py-1.5 transition-colors",
            value === o.v ? "bg-ink text-void" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-line p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          data-cursor="interactive"
          className={cn(
            "label rounded-full px-3 py-1.5 transition-colors",
            value === o.value ? "bg-ink text-void" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel() {
  const s = useSettings();
  const set = s.set;
  const { status, available, connect, disconnect, connecting } = useAppleMusic();
  const sources = useMusicSources();

  const seg = <K extends keyof Settings>(key: K, opts: { value: Settings[K]; label: string }[]) => (
    <Segment
      value={s[key] as string}
      options={opts as { value: string; label: string }[]}
      onChange={(v) => set(key, v as Settings[K])}
    />
  );

  return (
    <main className="relative min-h-dvh bg-void px-6 py-8 sm:px-10">
      <FilmGrain />
      <Link href="/" className="label tracking-[0.34em]!">
        LYRICSCAPE
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto mt-20 max-w-2xl"
      >
        <h1 className="text-display text-[11vw] font-semibold leading-none sm:text-6xl">Settings</h1>

        <section className="mt-16">
          <h2 className="label mb-2 tracking-[0.3em]! text-ink">Music sources</h2>
          <Row label="Apple Music">
            {available === false ? (
              <span className="meta text-muted">Not configured on this deployment.</span>
            ) : status.authorized ? (
              <Button variant="line" onClick={disconnect}>
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" onClick={connect} disabled={connecting}>
                {connecting ? "Connecting…" : "Connect"}
              </Button>
            )}
          </Row>
          <Row label="Jamendo">
            <span className="meta text-muted">
              {sources.jamendo === null
                ? "Checking…"
                : sources.jamendo
                  ? "Connected — search is live"
                  : "Not configured (set JAMENDO_CLIENT_ID)"}
            </span>
          </Row>
          <Row label="Local files">
            <span className="meta text-muted">
              Always available — open one from search or the home screen.
            </span>
          </Row>
        </section>

        <section className="mt-14">
          <h2 className="label mb-2 tracking-[0.3em]! text-ink">Visual</h2>
          <Row label="Quality">
            {seg("quality", [
              { value: "auto", label: "Auto" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ])}
          </Row>
          <Row label="Default mode">
            {seg("visualMode", [
              { value: "cinematic", label: "Cinematic" },
              { value: "minimal", label: "Minimal" },
              { value: "3d", label: "3D" },
              { value: "lyric-only", label: "Lyric only" },
            ])}
          </Row>
          <Row label="Motion">
            {seg("motion", [
              { value: "full", label: "Full" },
              { value: "reduced", label: "Reduced" },
            ])}
          </Row>
          <Row label="Theme">
            {seg("theme", [
              { value: "dynamic", label: "Dynamic" },
              { value: "monochrome", label: "Monochrome" },
            ])}
          </Row>
          <Row label="Accent">
            {seg("accentMode", [
              { value: "auto", label: "Auto" },
              { value: "custom", label: "Custom" },
            ])}
            {s.accentMode === "custom" && (
              <input
                type="color"
                value={s.customAccent}
                onChange={(e) => set("customAccent", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-full border border-line bg-transparent"
                aria-label="Custom accent colour"
              />
            )}
          </Row>
        </section>

        <section className="mt-14">
          <h2 className="label mb-2 tracking-[0.3em]! text-ink">Audio &amp; interface</h2>
          <Row label={`Volume — ${Math.round(s.volume * 100)}%`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.volume}
              onChange={(e) => set("volume", Number(e.target.value))}
              className="w-48 accent-[var(--accent)]"
              aria-label="Volume"
            />
          </Row>
          <Row label="Autoplay on enter">
            <Toggle value={s.autoplay} onChange={(v) => set("autoplay", v)} />
          </Row>
          <Row label="Scroll mode by default">
            <Toggle value={s.scrollMode} onChange={(v) => set("scrollMode", v)} />
          </Row>
        </section>

        <div className="mt-16 flex items-center justify-between">
          <button className="label text-muted hover:text-ink" onClick={s.reset}>
            Reset to defaults
          </button>
          <Link href="/about" className="label hover:text-ink">
            Shortcuts &amp; about
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
