"use client";

import { useEffect, useState } from "react";

/** Small title card that shows on scene entry then fades out of the way. */
export function SceneCaption({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShown(false), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="pointer-events-none fixed left-5 top-16 z-20 transition-all duration-700"
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(-6px)",
        filter: shown ? "blur(0)" : "blur(6px)",
      }}
    >
      <p className="label mb-1">{sub}</p>
      <h1 className="text-display text-4xl">{title}</h1>
    </div>
  );
}
