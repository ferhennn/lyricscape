import type { Metadata } from "next";
import { SceneCaption } from "@/components/sync/SceneCaption";

export const metadata: Metadata = { title: "Tunnel — Sync" };

export default function TunnelPage() {
  return <SceneCaption title="Tunnel" sub="Audio sync · scene 02" />;
}
