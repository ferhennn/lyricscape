"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useExperience } from "@/stores/experience";
import { useSearch } from "@/stores/search";
import { Button } from "@/components/ui/Button";

export function EndCard() {
  const router = useRouter();
  const song = useExperience((s) => s.song);
  const restart = useExperience((s) => s.restart);
  const teardown = useExperience((s) => s.teardown);
  const openSearch = useSearch((s) => s.setOpen);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-void px-8 text-center"
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="label mb-8"
      >
        Song complete
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 14, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.8, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-display text-4xl font-semibold tracking-tight sm:text-6xl"
      >
        {song?.title}
      </motion.h1>
      <p className="meta mt-4 text-muted">{song?.artistName}</p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-4"
      >
        <Button variant="primary" onClick={restart}>
          Play again
        </Button>
        <Button
          variant="line"
          onClick={() => {
            teardown();
            router.push("/library");
            openSearch(true);
          }}
        >
          Choose another song
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            teardown();
            router.push("/");
          }}
        >
          Exit
        </Button>
      </motion.div>
    </motion.div>
  );
}
