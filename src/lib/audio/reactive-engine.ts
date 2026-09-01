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

  // ── "smart" dynamics ─────────────────────────────────────────────────────
  /** loudness auto-gained against a slow running peak, 0..1 — quiet songs
   *  still fill the range, loud ones don't clip. */
  loudNorm: number;
  /** short-term energy ÷ long-term energy, remapped so 0.5 ≈ "typical",
   *  <0.5 a breakdown / quiet verse, >0.5 a chorus / drop. 0..1 */
  dynamics: number;
  /** decaying pulse (0..1) fired when the track jumps from a lull into a
   *  sustained loud section — a chorus hit or an EDM drop. */
  drop: number;
  /** spectral centroid, 0 = bass-heavy / dark mix, 1 = bright / airy. */
  brightness: number;
  /** 0..1, rises during sparse, gentle passages and falls when busy —
   *  scenes use it to decide how calm to be. */
  calm: number;

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
    loudNorm: 0,
    dynamics: 0.5,
    drop: 0,
    brightness: 0.5,
    calm: 1,
    time: 0,
    waveform: new Float32Array(128),
    spectrum: new Float32Array(64),
  };
}

const HISTORY = 90; // ~1.5s at 60fps — local average for beat detection

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

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
  private prevBass = 0;
  private onEnded: (() => void) | null = null;

  // running envelopes for the smart signals
  private loudPeak = 0.15; // slow-decaying loudness ceiling for auto-gain
  private shortEnergy = 0; // ~0.5s energy
  private longEnergy = 0; // ~8s energy
  private fluxAvg = 0; // rolling spectral-flux activity
  private prevSpectrum = new Float32Array(64);
  private dropCooldown = 0;

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
    // Low smoothing keeps transients intact so kicks are actually detectable.
    analyser.smoothingTimeConstant = 0.45;
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
    b.bass += (bass - b.bass) * 0.4;
    b.mid += (mid - b.mid) * 0.35;
    b.treble += (treble - b.treble) * 0.45;
    b.level += (level - b.level) * 0.35;
    b.energy += (level - b.energy) * 0.04;

    // ── Beat / onset ──────────────────────────────────────────────────────
    // Two signals, either fires: (1) bass sits well above its recent local
    // average (works on compressed masters with little variance), (2) a sharp
    // positive jump in bass energy frame-to-frame (a real transient).
    const flux = Math.max(0, bass - this.prevBass);
    this.prevBass = bass;

    const hist = this.bassHistory;
    hist.push(bass);
    if (hist.length > HISTORY) hist.shift();
    const mean = hist.reduce((s, v) => s + v, 0) / hist.length;

    this.beatCooldown = Math.max(0, this.beatCooldown - 1);
    const overAverage = bass > mean * 1.32 && bass > 0.08;
    const transient = flux > 0.055;
    if (this.beatCooldown === 0 && (overAverage || transient)) {
      b.beat = 1;
      this.beatCooldown = 6; // ~100ms lockout — up to ~10 beats/s
    } else {
      // Slower release so a shader actually has frames to animate on.
      b.beat *= 0.86;
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

    // ── smart dynamics ───────────────────────────────────────────────────
    // Auto-gain: a slowly decaying loudness ceiling so a quiet acoustic track
    // still uses the full range and a loud master doesn't sit pinned at 1.
    this.loudPeak = Math.max(level, this.loudPeak * 0.9996, 0.06);
    b.loudNorm += (clamp01(level / this.loudPeak) - b.loudNorm) * 0.2;

    // Section dynamics: short-term energy against a long-term baseline.
    this.shortEnergy += (level - this.shortEnergy) * 0.08; // ~0.4s window
    this.longEnergy += (level - this.longEnergy) * 0.006; // ~5s window
    const ratio =
      this.longEnergy > 0.001 ? this.shortEnergy / this.longEnergy : 1;
    const dyn = clamp01(0.5 + (ratio - 1) * 0.6); // 0.5 ≈ typical
    b.dynamics += (dyn - b.dynamics) * 0.1;

    // Spectral flux → how busy the track is right now → calm factor.
    let sflux = 0;
    for (let i = 0; i < sp.length; i++) {
      sflux += Math.max(0, sp[i] - this.prevSpectrum[i]);
      this.prevSpectrum[i] = sp[i];
    }
    sflux /= sp.length;
    this.fluxAvg += (sflux - this.fluxAvg) * 0.03;
    const calmTarget = clamp01(1 - this.fluxAvg * 22 - (b.dynamics - 0.5) * 0.6);
    b.calm += (calmTarget - b.calm) * 0.05;

    // Spectral centroid → brightness of the mix.
    let cNum = 0;
    let cDen = 0;
    for (let i = 1; i < this.freq.length; i++) {
      cNum += i * this.freq[i];
      cDen += this.freq[i];
    }
    const centroid = cDen > 0 ? cNum / cDen : 0;
    const brightNorm = clamp01(
      Math.pow(centroid / (this.freq.length * 0.33), 0.6),
    );
    b.brightness += (brightNorm - b.brightness) * 0.05;

    // Drop / chorus-hit: a sustained jump out of a quieter stretch.
    this.dropCooldown = Math.max(0, this.dropCooldown - 1);
    if (
      this.dropCooldown === 0 &&
      ratio > 1.35 &&
      this.shortEnergy > 0.12 &&
      b.dynamics > 0.62
    ) {
      b.drop = 1;
      this.dropCooldown = 90; // ~1.5s lockout
    } else {
      b.drop *= 0.965; // slow, cinematic decay
    }

    b.time = (performance.now() - this.startedAt) / 1000;
  };
}
