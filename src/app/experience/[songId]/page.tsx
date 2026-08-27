import type { Metadata } from "next";
import { ExperienceRoot } from "@/components/experience/ExperienceRoot";
import { DEMO_CONFIG, DEMO_SONG_ID } from "@/data/demo";
import { localTrack } from "@/data/tracks";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ songId: string }>;
}): Promise<Metadata> {
  const { songId } = await params;
  if (songId === DEMO_SONG_ID || songId === "demo") {
    return {
      title: `${DEMO_CONFIG.song.title} — ${DEMO_CONFIG.song.artistName}`,
      description: "The built-in LYRICSCAPE demo experience.",
    };
  }
  const local = localTrack(songId);
  if (local) {
    return {
      title: `${local.title} — ${local.artistName}`,
      description: "An immersive cinematic lyrics experience.",
    };
  }
  return {
    title: "Experience",
    description: "An immersive cinematic lyrics experience.",
  };
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ songId: string }>;
}) {
  const { songId } = await params;
  return <ExperienceRoot songId={songId} />;
}
