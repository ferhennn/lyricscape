import type { Metadata } from "next";
import { SceneCaption } from "@/components/sync/SceneCaption";

export const metadata: Metadata = { title: "Smooth — Sync" };

export default function SmoothPage() {
  return <SceneCaption title="Smooth" sub="for calm, relaxed listening" />;
}
