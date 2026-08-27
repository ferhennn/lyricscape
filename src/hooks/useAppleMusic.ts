"use client";

import { useCallback, useEffect, useState } from "react";
import { appleMusic, type AppleMusicStatus } from "@/lib/apple-music/service";

export interface UseAppleMusic {
  status: AppleMusicStatus;
  /** null until the first probe resolves. */
  available: boolean | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useAppleMusic(): UseAppleMusic {
  const [status, setStatus] = useState<AppleMusicStatus>(appleMusic.getStatus());
  const [available, setAvailable] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => appleMusic.onStatus(setStatus), []);

  useEffect(() => {
    let cancelled = false;
    // Probe whether the server can issue a developer token (i.e. creds are set).
    fetch("/api/apple-developer-token", { method: "GET", cache: "no-store" })
      .then((r) => {
        if (!cancelled) setAvailable(r.ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await appleMusic.authorize();
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await appleMusic.unauthorize();
  }, []);

  return { status, available, connecting, connect, disconnect };
}
