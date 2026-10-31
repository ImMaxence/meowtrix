export type MicResult = 'ok' | 'denied' | 'unavailable';

/**
 * Listens to the room and reports sudden sounds above the background level.
 * Nothing is recorded or sent anywhere: only the instantaneous loudness is read.
 */
export class Mic {
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private readonly buf = new Float32Array(1024);
  /** Adaptive background level in dB: constant noise is gradually ignored. */
  private floor = -55;
  private cooldown = 0;
  private warmup = 1.5;

  get active(): boolean {
    return this.analyser !== null;
  }

  async start(ctx: AudioContext): Promise<MicResult> {
    if (!navigator.mediaDevices?.getUserMedia) return 'unavailable';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      return e instanceof DOMException && e.name === 'NotAllowedError' ? 'denied' : 'unavailable';
    }
    const src = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = this.buf.length;
    // Some browsers only process nodes that reach the destination; route it there silently.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    src.connect(this.analyser).connect(sink).connect(ctx.destination);
    this.warmup = 1.5;
    return 'ok';
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.analyser?.disconnect();
    this.stream = null;
    this.analyser = null;
  }

  /** Returns 0 (nothing), 1 (noticeable sound) or 2 (loud sound). */
  update(dt: number, gated: boolean): 0 | 1 | 2 {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const db = 20 * Math.log10(Math.max(Math.sqrt(sum / this.buf.length), 1e-5));

    if (this.warmup > 0) {
      this.warmup -= dt;
      this.floor += (db - this.floor) * Math.min(1, dt * 4);
      return 0;
    }
    const rate = db < this.floor ? 1.5 : 0.12;
    this.floor += (db - this.floor) * Math.min(1, rate * dt);
    this.cooldown -= dt;
    if (gated || this.cooldown > 0) return 0;

    const over = db - this.floor;
    if (over > 24) {
      this.cooldown = 1.5;
      return 2;
    }
    if (over > 13) {
      this.cooldown = 1.2;
      return 1;
    }
    return 0;
  }
}
