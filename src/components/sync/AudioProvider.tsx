"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ReactiveEngine,
  makeBands,
  type AudioSource,
  type Bands,
} from "@/lib/audio/reactive-engine";
import { useSettings } from "@/stores/settings";

type Status = "idle" | "starting" | "running" | "error";

type AudioContextValue = {
  /** Live band data — mutated in place every frame, never triggers a render. */
  bandsRef: RefObject<Bands>;
  status: Status;
  source: AudioSource | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
};

const Ctx = createContext<AudioContextValue | null>(null);

export function useAudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAudio must be used inside <AudioProvider>");
  return v;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const bandsRef = useRef<Bands>(makeBands());
  const engineRef = useRef<ReactiveEngine | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [source, setSource] = useState<AudioSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sensitivity = useSettings((s) => s.syncSensitivity);

  useEffect(() => {
    if (engineRef.current) engineRef.current.sensitivity = sensitivity;
  }, [sensitivity]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    bandsRef.current = makeBands();
    setStatus("idle");
    setSource(null);
  }, []);

  const start = useCallback(async () => {
    if (engineRef.current) return;
    setStatus("starting");
    setError(null);
    const engine = new ReactiveEngine();
    engine.sensitivity = useSettings.getState().syncSensitivity;
    try {
      const src = await engine.start();
      // Share the engine's live band object directly.
      bandsRef.current = engine.bands;
      engine.onSourceEnded(() => stop());
      engineRef.current = engine;
      setSource(src);
      setStatus("running");
    } catch (err) {
      engine.stop();
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Audio share was dismissed. Click start and pick a tab / tick “Share system audio”."
          : name === "NotFoundError"
            ? "No audio input found."
            : err instanceof Error
              ? err.message
              : "Could not start audio.",
      );
      setStatus("error");
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  const value = useMemo<AudioContextValue>(
    () => ({ bandsRef, status, source, error, start, stop }),
    [status, source, error, start, stop],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
