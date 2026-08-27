"use client";

import { useEffect } from "react";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { SearchOverlay } from "@/components/music/SearchOverlay";
import { useSearch } from "@/stores/search";
import { useSettings } from "@/stores/settings";

/** Shared chrome for the browsing pages (landing, library, settings). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const toggle = useSearch((s) => s.toggle);
  const setOpen = useSearch((s) => s.setOpen);
  const motionPref = useSettings((s) => s.motion);

  useEffect(() => {
    document.documentElement.dataset.motion = motionPref;
  }, [motionPref]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = /^(input|textarea|select)$/i.test(target.tagName) || target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, setOpen]);

  return (
    <>
      <CustomCursor />
      {children}
      <SearchOverlay />
    </>
  );
}
