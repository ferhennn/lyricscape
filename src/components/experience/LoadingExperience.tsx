"use client";

import { motion } from "motion/react";

export function LoadingExperience({
  title,
  artist,
  label = "PREPARING EXPERIENCE",
}: {
  title?: string;
  artist?: string;
  label?: string;
}) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-void px-8 text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="label mb-8"
      >
        {label}
      </motion.p>

      {title && (
        <motion.h1
          initial={{ opacity: 0, y: 14, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-display text-4xl font-semibold tracking-tight sm:text-6xl"
        >
          {title}
        </motion.h1>
      )}
      {artist && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="meta mt-4 text-muted"
        >
          {artist}
        </motion.p>
      )}

      <div className="mt-12 h-px w-56 overflow-hidden bg-white/10">
        <motion.div
          className="h-full bg-[var(--accent)]"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          style={{ width: "60%" }}
        />
      </div>
    </div>
  );
}
