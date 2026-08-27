"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { stageLocalFile } from "@/lib/audio/local-file";
import { cn } from "@/lib/utils";

/** Lets the user drop in their own audio file and enter the experience with it. */
export function LocalFileButton({
  label = "Open a local file",
  className,
  onDone,
}: {
  label?: string;
  className?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const id = stageLocalFile(file);
          onDone?.();
          router.push(`/experience/${id}`);
        }}
      />
      <button
        type="button"
        data-cursor="interactive"
        onClick={() => input.current?.click()}
        className={cn("label text-muted transition-colors hover:text-ink", className)}
      >
        {label}
      </button>
    </>
  );
}
