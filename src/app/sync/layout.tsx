"use client";

import type { ReactNode } from "react";
import { AudioProvider } from "@/components/sync/AudioProvider";
import { SyncStage } from "@/components/sync/SyncStage";

export default function SyncLayout({ children }: { children: ReactNode }) {
  return (
    <AudioProvider>
      <SyncStage>{children}</SyncStage>
    </AudioProvider>
  );
}
