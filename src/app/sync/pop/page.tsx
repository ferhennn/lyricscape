import type { Metadata } from "next";
import { SceneCaption } from "@/components/sync/SceneCaption";

export const metadata: Metadata = { title: "Pop — Sync" };

export default function PopPage() {
  return <SceneCaption title="Pop" sub="for pop, electronic, hip-hop" />;
}
