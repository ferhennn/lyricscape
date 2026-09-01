/**
 * ReactiveEngine — captures whatever audio the machine is playing and turns it
 * into a small bundle of numbers a shader can read every frame.
 *
 * Source priority:
 *   1. getDisplayMedia({ audio: true })  → real system / tab audio (Chrome, Edge).
 *      The user must tick "Share system audio" (or share a tab with audio) in the
 *      browser's picker — there is no way to skip that prompt.
 *   2. getUserMedia({ audio: true })     → microphone; picks up the speakers
 *      ambiently. Lower fidelity but works everywhere and needs one grant.
 */

export type AudioSource = "system" | "mic";

export type Bands = {
  /** 20–160 Hz, 0..1 */
  bass: number;
  /** 160–2000 Hz, 0..1 */
  mid: number;
  /** 2–8 kHz, 0..1 */
  treble: number;
  /** full-band loudness, 0..1 */
  level: number;
  /** slow-smoothed loudness, 0..1 — good for ambient drift */
  energy: number;
  /** transient pulse that spikes to 1 on a kick and decays */
  beat: number;
  /** seconds since the engine started */
  time: number;
  /** normalised waveform, -1..1, length 128 */
  waveform: Float32Array;
  /** normalised spectrum, 0..1, length 64 */
  spectrum: Float32Array;
};

export function makeBands(): Bands {
  return {
    bass: 0,
    mid: 0,
    treble: 0,
    level: 0,
    energy: 0,
    beat: 0,
    time: 0,
    waveform: new Float32Array(128),
    spectrum: new Float32Array(64),
  };
}

const HISTORY = 43; // ~0.7s at 60fps — rolling window for beat detection

export class ReactiveEngine {
  readonly bands: Bands = makeBands();

  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private freq = new Uint8Array(0);
  private time = new Uint8Array(0);
  private startedAt = 0;
  private bassHistory: number[] = [];
  private beatCooldown = 0;
  private onEnded: (() => void) | null = null;

  source: AudioSource | null = null;

  async start(): Promise<AudioSource> {
    let stream: MediaStream;
    let source: AudioSource;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("no-audio-track");
      }
      // We only ever wanted the audio.
      stream.getVideoTracks().forEach((t) => t.stop());
      source = "system";
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        // User dismissed the share picker — surface that rather than silently
        // grabbing the mic.
        throw err;
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      source = "mic";
    }

    this.stream = stream;
    this.source = source;

    const AC: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    await this.ctx.resume();

    const src = this.ctx.createMediaStreamSource(stream);
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.72;
    src.connect(analyser);
    this.analyser = analyser;

    this.freq = new Uint8Array(analyser.frequencyBinCount);
    this.time = new Uint8Array(analyser.fftSize);
    this.startedAt = performance.now();

    // If the user stops sharing from the browser chrome, tell the host.
    const track = stream.getAudioTracks()[0];
    if (track) track.addEventListener("ended", () => this.onEnded?.());

    this.loop();
    return source;
  }

  onSourceEnded(cb: () => void) {
    this.onEnded = cb;
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.source = null;
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const analyser = this.analyser;
    if (!analyser) return;

    analyser.getByteFrequencyData(this.freq);
    analyser.getByteTimeDomainData(this.time);

    const rate = this.ctx?.sampleRate ?? 44100;
    const nyquist = rate / 2;
    const binHz = nyquist / this.freq.length;
    const bin = (hz: number) => Math.min(this.freq.length - 1, Math.round(hz / binHz));

    const avg = (from: number, to: number) => {
      let sum = 0;
      for (let i = from; i <= to; i++) sum += this.freq[i];
      return sum / (to - from + 1) / 255;
    };

    const bass = avg(bin(20), bin(160));
    const mid = avg(bin(160), bin(2000));
    const treble = avg(bin(2000), bin(8000));
    const level = avg(1, this.freq.length - 1);

    const b = this.bands;
    // Per-band easing so nothing snaps.
    b.bass += (bass - b.bass) * 0.35;
    b.mid += (mid - b.mid) * 0.3;
    b.treble += (treble - b.treble) * 0.4;
    b.level += (level - b.level) * 0.3;
    b.energy += (level - b.energy) * 0.04;

    // Beat: compare instantaneous bass energy to the rolling average.
    const hist = this.bassHistory;
    hist.push(bass);
    if (hist.length > HISTORY) hist.shift();
    const mean = hist.reduce((s, v) => s + v, 0) / hist.length;
    let variance = 0;
    for (const v of hist) variance += (v - mean) * (v - mean);
    variance /= hist.length;
    const threshold = mean + Math.max(0.045, 1.4 * Math.sqrt(variance));

    this.beatCooldown = Math.max(0, this.beatCooldown - 1);
    if (bass > threshold && this.beatCooldown === 0 && bass > 0.12) {
      b.beat = 1;
      this.beatCooldown = 8; // ~130ms lockout
    } else {
      b.beat *= 0.9;
    }

    // Down-sample waveform + spectrum for cheap shader uniforms.
    const wf = b.waveform;
    const step = this.time.length / wf.length;
    for (let i = 0; i < wf.length; i++) {
      wf[i] = (this.time[Math.floor(i * step)] - 128) / 128;
    }
    const sp = b.spectrum;
    const sstep = Math.floor(this.freq.length / 2 / sp.length);
    for (let i = 0; i < sp.length; i++) {
      let sum = 0;
      for (let j = 0; j < sstep; j++) sum += this.freq[i * sstep + j];
      sp[i] = sum / sstep / 255;
    }

    b.time = (performance.now() - this.startedAt) / 1000;
  };
}
