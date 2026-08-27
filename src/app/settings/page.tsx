import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  description: "Visual quality, motion, theme and Apple Music connection.",
};

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsPanel />
    </AppShell>
  );
}
