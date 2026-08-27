// SyntheticAudioProvider — a fully original generative ambient score rendered live
// with the Web Audio API. Used for the built-in demo so LYRICSCAPE has a complete,
// copyright-free experience with sample-accurate timing. No audio files involved.

import type { PlaybackSnapshot, Song } from "@/types";
import { idleSnapshot, type AudioProvider, type PlaybackListener } from "./types";

interface ChordEvent {
  /** Seconds from start. */
  at: number;
  /** Midi note numbers. */
  notes: number[];
  /** 0..1 pad level. */
  level: number;
}

export interface SyntheticRecipe {
  id: string;
  durationSec: number;
  bpm: number;
  root: number;
  chords: ChordEvent[];
}

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// "AFTERLIGHT" — original ambient progression. i – VI – III – VII in A minor-ish,
// swelling through the chorus, sparse in the bridge.
export const RECIPES: Record<string, SyntheticRecipe> = {
  afterlight: {
    id: "afterlight",
    durationSec: 168,
    bpm: 72,
    root: 57, // A3
    chords: [
      { at: 0, notes: [45, 57, 64, 69], level: 0.28 }, // intro pad
      { at: 16, notes: [45, 57, 64, 72], level: 0.34 },
      { at: 28, notes: [41, 53, 60, 68], level: 0.4 }, // verse
      { at: 40, notes: [48, 55, 64, 71], level: 0.42 },
      { at: 52, notes: [43, 55, 62, 70], level: 0.46 }, // pre-chorus lift
      { at: 64, notes: [45, 57, 64, 69, 76], level: 0.62 }, // chorus
      { at: 76, notes: [41, 53, 60, 69, 77], level: 0.66 },
      { at: 88, notes: [48, 55, 64, 72, 79], level: 0.64 },
      { at: 100, notes: [43, 55, 62, 70, 74], level: 0.6 },
      { at: 112, notes: [45, 57, 64, 69], level: 0.3 }, // bridge — sparse
      { at: 128, notes: [40, 52, 59, 67], level: 0.26 },
      { at: 140, notes: [45, 57, 64, 71, 76], level: 0.66 }, // final chorus
      { at: 152, notes: [41, 53, 60, 69, 77], level: 0.6 },
      { at: 162, notes: [45, 57, 64], level: 0.16 }, // outro decay
    ],
  },
};

export class SyntheticAudioProvider implements AudioProvider {
  readonly kind = "synthetic" as const;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private voices: OscillatorNode[] = [];
  private voiceGains: GainNode[] = [];
  private airNode: AudioBufferSourceNode | null = null;
  private recipe: SyntheticRecipe = RECIPES.afterlight;

  private listeners = new Set<PlaybackListener>();
  private snap: PlaybackSnapshot = { ...idleSnapshot };

  // Position tracking.
  private startCtxTime = 0;
  private offset = 0; // seconds into the piece at last (re)start
  private running = false;
  private tickHandle: number | null = null;
  private chordTimer: number | null = null;

  async load(song: Song): Promise<void> {
    const recipe = (song.demoId && RECIPES[song.demoId]) || RECIPES.afterlight;
    this.recipe = recipe;
    this.snap = {
      ...idleSnapshot,
      status: "ready",
      duration: recipe.durationSec,
      volume: this.snap.volume,
      muted: this.snap.muted,
    };
    this.emit();
  }

  private ensureContext() {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    filter.connect(master);
    this.filter = filter;

    // Slow filter LFO for movement.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 420;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    // A short generated reverb tail.
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse(ctx, 2.6, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    convolver.connect(wet).connect(master);

    // Pad voices — 5 detuned oscillators through their own gains.
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.detune.value = (i - 2) * 4;
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(filter);
      g.connect(convolver);
      osc.start();
      this.voices.push(osc);
      this.voiceGains.push(g);
    }

    // "Air" — filtered noise bed.
    const noise = ctx.createBufferSource();
    noise.buffer = this.makeNoise(ctx, 4);
    noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = 4200;
    nf.Q.value = 0.5;
    const ng = ctx.createGain();
    ng.gain.value = 0.015;
    noise.connect(nf).connect(ng).connect(master);
    noise.start();
    this.airNode = noise;
  }

  private makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  private makeNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private applyChord(atPieceTime: number, immediate = false) {
    if (!this.ctx || !this.master) return;
    const chords = this.recipe.chords;
    let active = chords[0];
    for (const c of chords) if (c.at <= atPieceTime + 0.001) active = c;
    const now = this.ctx.currentTime;
    const glide = immediate ? 0.01 : 6;

    for (let i = 0; i < this.voices.length; i++) {
      const note = active.notes[i];
      const g = this.voiceGains[i];
      if (note === undefined) {
        g.gain.cancelScheduledValues(now);
        g.gain.setTargetAtTime(0, now, glide / 3);
        continue;
      }
      const freq = midiToFreq(note);
      this.voices[i].frequency.setTargetAtTime(freq, now, glide / 2);
      const per = (active.level / Math.max(3, active.notes.length)) * (i === 0 ? 1.4 : 1);
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(per, now, glide / 3);
    }
  }

  private scheduleChords() {
    if (this.chordTimer) window.clearInterval(this.chordTimer);
    this.applyChord(this.getTime(), true);
    this.chordTimer = window.setInterval(() => {
      if (!this.running) return;
      this.applyChord(this.getTime());
    }, 500);
  }

  async play(): Promise<void> {
    this.ensureContext();
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === "suspended") await this.ctx.resume();

    if (this.snap.status === "ended" || this.getTime() >= this.recipe.durationSec) {
      this.offset = 0;
    }
    this.startCtxTime = this.ctx.currentTime;
    this.running = true;
    const target = this.snap.muted ? 0 : this.snap.volume * 0.9;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 1.4);

    this.scheduleChords();
    this.loop();
    this.setStatus("playing");
  }

  pause(): void {
    if (!this.ctx || !this.master || !this.running) return;
    this.offset = this.getTime();
    this.running = false;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    if (this.tickHandle) cancelAnimationFrame(this.tickHandle);
    this.setStatus("paused");
  }

  seek(seconds: number): void {
    const clamped = Math.max(0, Math.min(seconds, this.recipe.durationSec));
    this.offset = clamped;
    if (this.ctx) this.startCtxTime = this.ctx.currentTime;
    if (this.running) this.applyChord(clamped, true);
    this.snap = { ...this.snap, currentTime: clamped };
    this.emit();
  }

  setVolume(v: number): void {
    this.snap = { ...this.snap, volume: v };
    if (this.ctx && this.master && this.running && !this.snap.muted) {
      this.master.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.2);
    }
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.snap = { ...this.snap, muted };
    if (this.ctx && this.master) {
      const target = muted ? 0 : this.running ? this.snap.volume * 0.9 : 0;
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);
    }
    this.emit();
  }

  getTime(): number {
    if (!this.ctx || !this.running) return this.offset;
    return Math.min(this.recipe.durationSec, this.offset + (this.ctx.currentTime - this.startCtxTime));
  }

  getSnapshot(): PlaybackSnapshot {
    return { ...this.snap, currentTime: this.getTime(), duration: this.recipe.durationSec };
  }

  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.running = false;
    if (this.tickHandle) cancelAnimationFrame(this.tickHandle);
    if (this.chordTimer) window.clearInterval(this.chordTimer);
    this.listeners.clear();
    try {
      this.voices.forEach((v) => v.stop());
      this.airNode?.stop();
      void this.ctx?.close();
    } catch {
      /* already torn down */
    }
    this.ctx = null;
  }

  private loop = () => {
    if (!this.running) return;
    const t = this.getTime();
    this.snap = { ...this.snap, currentTime: t };
    if (t >= this.recipe.durationSec) {
      this.running = false;
      this.offset = this.recipe.durationSec;
      if (this.ctx && this.master) {
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 1.2);
      }
      this.setStatus("ended");
      return;
    }
    this.emit();
    this.tickHandle = requestAnimationFrame(this.loop);
  };

  private setStatus(status: PlaybackSnapshot["status"]) {
    this.snap = { ...this.snap, status, currentTime: this.getTime() };
    this.emit();
  }

  private emit() {
    const s = this.getSnapshot();
    for (const l of this.listeners) l(s);
  }
}
