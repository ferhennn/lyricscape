import type { Metadata } from "next";
import { SceneCaption } from "@/components/sync/SceneCaption";

export const metadata: Metadata = { title: "Soothing — Sync" };

export default function SoothingPage() {
  return <SceneCaption title="Soothing" sub="for ambient & acoustic" />;
}
