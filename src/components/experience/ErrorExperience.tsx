"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { DEMO_SONG_ID } from "@/data/demo";

export function ErrorExperience({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-void px-8 text-center">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="label mb-6">
        Experience interrupted
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-display max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl"
      >
        {message}
      </motion.h1>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button variant="line" onClick={() => router.push(`/experience/${DEMO_SONG_ID}`)}>
          Play the demo
        </Button>
        <Button variant="ghost" onClick={() => router.push("/library")}>
          Back to library
        </Button>
      </div>
    </div>
  );
}
