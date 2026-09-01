import type { Metadata } from "next";
import { SceneCaption } from "@/components/sync/SceneCaption";

export const metadata: Metadata = { title: "Liquid — Sync" };

export default function LiquidPage() {
  return <SceneCaption title="Liquid" sub="Audio sync · scene 03" />;
}
