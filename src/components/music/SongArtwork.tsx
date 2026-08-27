"use client";

import Image from "next/image";
import { useState } from "react";
import { cn, slugSeed, mulberry32 } from "@/lib/utils";

interface Props {
  src?: string;
  alt: string;
  seed: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

/** Album artwork with a deterministic procedural fallback (no stock imagery). */
export function SongArtwork({ src, alt, seed, size = 96, className, priority }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  const rand = mulberry32(slugSeed(seed));
  const h1 = Math.floor(rand() * 360);
  const h2 = (h1 + 40 + Math.floor(rand() * 80)) % 360;

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden bg-void-2", className)}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${size}px`}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
          unoptimized={src.startsWith("http")}
        />
      ) : (
        <div
          aria-hidden
          className="h-full w-full"
          style={{
            background: `radial-gradient(120% 120% at 30% 20%, hsl(${h1} 45% 22%), hsl(${h2} 35% 8%) 70%)`,
          }}
        >
          <div
            className="h-full w-full opacity-40 mix-blend-overlay"
            style={{ backgroundImage: "url(/textures/grain.svg)", backgroundSize: "120px" }}
          />
        </div>
      )}
    </div>
  );
}
