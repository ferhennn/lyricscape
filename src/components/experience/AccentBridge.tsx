"use client";

import { useEffect } from "react";
import { useExperience } from "@/stores/experience";
import { useSettings } from "@/stores/settings";
import { mixHex } from "@/lib/visuals/color";

/** Pushes the active palette into CSS custom properties on <html>. */
export function AccentBridge() {
  const palette = useExperience((s) => s.palette);
  const theme = useSettings((s) => s.theme);
  const accentMode = useSettings((s) => s.accentMode);
  const customAccent = useSettings((s) => s.customAccent);

  useEffect(() => {
    const root = document.documentElement;
    let accent = palette.accent;
    let secondary = palette.secondary;
    let deep = palette.deep;
    let light = palette.light;

    if (theme === "monochrome") {
      accent = "#D9D6D0";
      secondary = "#6C6A72";
      deep = "#141018";
      light = "#F2F0EC";
    }
    if (accentMode === "custom") {
      accent = customAccent;
      secondary = mixHex(customAccent, "#000000", 0.35);
      light = mixHex(customAccent, "#ffffff", 0.6);
    }

    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-2", secondary);
    root.style.setProperty("--accent-deep", deep);
    root.style.setProperty("--accent-light", light);

    return () => {
      root.style.setProperty("--accent", "#e8b98f");
      root.style.setProperty("--accent-2", "#b9663f");
    };
  }, [palette, theme, accentMode, customAccent]);

  return null;
}
