"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { Library } from "@/components/library/Library";
import { useSearch } from "@/stores/search";

export default function SearchPage() {
  const setOpen = useSearch((s) => s.setOpen);
  useEffect(() => {
    setOpen(true);
  }, [setOpen]);
  return (
    <AppShell>
      <Library />
    </AppShell>
  );
}
