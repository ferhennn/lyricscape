import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { Library } from "@/components/library/Library";

export const metadata: Metadata = {
  title: "Library",
  description: "Your recently played songs and Apple Music library in LYRICSCAPE.",
};

export default function LibraryPage() {
  return (
    <AppShell>
      <Library />
    </AppShell>
  );
}
