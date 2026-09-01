import type { Metadata } from "next";
import { SceneCaption } from "@/components/sync/SceneCaption";

export const metadata: Metadata = { title: "Nebula — Sync" };

export default function NebulaPage() {
  return <SceneCaption title="Nebula" sub="Audio sync · scene 01" />;
}
