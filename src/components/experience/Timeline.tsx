"use client";

import { useEffect, useRef, useState } from "react";
import { useExperience } from "@/stores/experience";
import { formatTime, clamp } from "@/lib/utils";

export function Timeline({ visible }: { visible: boolean }) {
  const timeline = useExperience((s) => s.timeline);
  const seek = useExperience((s) => s.seek);
  const clock = useExperience((s) => s.clock);

  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);

  const duration = clock.duration || 1;
  const sections = timeline?.sectionList ?? [];

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (!dragging) {
        const d = clock.duration || 1;
        const p = clamp(clock.time / d, 0, 1);
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
        if (headRef.current) headRef.current.style.left = `${p * 100}%`;
        if (timeRef.current) timeRef.current.textContent = formatTime(clock.time);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clock, dragging]);

  const pointerToTime = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1) * duration;
  };

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 px-4 pb-3 transition-opacity duration-500 sm:px-8"
      style={{ opacity: visible ? 1 : 0.5 }}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span ref={timeRef} className="meta tabular-nums text-muted">
          0:00
        </span>
        <div className="flex gap-3">
          {sections.map((s, i) => (
            <span key={i} className="label text-[0.6rem]! text-muted/70">
              {s.label}
            </span>
          ))}
        </div>
        <span className="meta tabular-nums text-muted">{formatTime(duration)}</span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(clock.time)}
        tabIndex={0}
        data-cursor="interactive"
        className="group relative h-6 cursor-pointer"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
          const t = pointerToTime(e.clientX);
          if (fillRef.current) fillRef.current.style.transform = `scaleX(${t / duration})`;
          if (headRef.current) headRef.current.style.left = `${(t / duration) * 100}%`;
        }}
        onPointerMove={(e) => {
          const rect = trackRef.current!.getBoundingClientRect();
          setHover({ x: e.clientX - rect.left, t: pointerToTime(e.clientX) });
          if (!dragging) return;
          const t = pointerToTime(e.clientX);
          if (fillRef.current) fillRef.current.style.transform = `scaleX(${t / duration})`;
          if (headRef.current) headRef.current.style.left = `${(t / duration) * 100}%`;
          if (timeRef.current) timeRef.current.textContent = formatTime(t);
        }}
        onPointerUp={(e) => {
          if (dragging) seek(pointerToTime(e.clientX));
          setDragging(false);
        }}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") seek(clock.time - 5);
          if (e.key === "ArrowRight") seek(clock.time + 5);
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/12" />
        {/* section ticks */}
        {sections.map((s, i) => (
          <div
            key={i}
            className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-white/15"
            style={{ left: `${(s.start / duration) * 100}%` }}
          />
        ))}
        <div
          ref={fillRef}
          className="absolute inset-x-0 top-1/2 h-px origin-left -translate-y-1/2 bg-[var(--accent)]"
          style={{ transform: "scaleX(0)" }}
        />
        <div
          ref={headRef}
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] transition-[height,width] group-hover:h-3 group-hover:w-3"
          style={{ left: "0%" }}
        />
        {hover && !dragging && (
          <div
            className="pointer-events-none absolute -top-6 -translate-x-1/2 meta text-muted"
            style={{ left: hover.x }}
          >
            {formatTime(hover.t)}
          </div>
        )}
      </div>
    </div>
  );
}
