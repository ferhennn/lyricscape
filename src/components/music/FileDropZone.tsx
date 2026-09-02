"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { stageLocalFile } from "@/lib/audio/local-file";

const AUDIO_RE = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac)$/i;

/** Drop an audio file anywhere on a browsing page to play it. */
export function FileDropZone() {
  const router = useRouter();
  const [over, setOver] = useState(false);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setOver(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      const file = Array.from(e.dataTransfer?.files ?? []).find(
        (f) => f.type.startsWith("audio/") || AUDIO_RE.test(f.name),
      );
      if (!file) return;
      router.push(`/experience/${stageLocalFile(file)}`);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [router]);

  return (
    <AnimatePresence>
      {over && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed inset-3 z-[95] flex items-center justify-center rounded-3xl border-2 border-dashed border-line bg-void/85 backdrop-blur"
        >
          <p className="text-display text-2xl tracking-tight text-ink">
            Drop an audio file to play it
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
