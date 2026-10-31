import { rand } from '../game/math';

type AudioContextCtor = typeof AudioContext;

/**
 * Lizard sounds synthesised with the Web Audio API: gecko-like chirps, a distress squeak
 * and claw ticks on each footfall.
 */
export class Voice {
  ctx: AudioContext | null = null;
  /** performance.now() until which our own sounds may be picked up by the microphone. */
  loudUntil = 0;

  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private muted = true;

  /** Must be called from a user gesture (browsers block audio until then). */
  init(): AudioContext | null {
    if (!this.ctx) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      this.ctx = ctx;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.ratio.value = 6;
      comp.connect(ctx.destination);
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      this.out.connect(comp);

      const len = ctx.sampleRate * 2;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
    return this.ctx;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.applyGain();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain();
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  /** A series of short gecko chirps. */
  chirp(pan: number): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const now = ctx.currentTime + 0.02;
    const count = 3 + Math.floor(Math.random() * 4);
    const gap = rand(0.1, 0.14);
    const f0 = rand(2300, 3000);
    let vol = 0.5;
    for (let i = 0; i < count; i++) {
      const t = now + i * gap;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f0 * 1.3, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.75, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.08);
      this.burst(dest, t, 0.012, 3800, 4, vol * 0.6);
      vol *= 0.82;
    }
    this.loudUntil = performance.now() + (count * gap + 0.4) * 1000;
  }

  /** A startled squeak and hiss when touched. */
  squeak(pan: number): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const t = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200, t);
    osc.frequency.exponentialRampToValueAtTime(4600, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(2600, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + 0.25);
    this.burst(dest, t + 0.05, 0.3, 5000, 0.7, 0.25);
    this.loudUntil = performance.now() + 800;
  }

  /** Tiny claw tick for one footfall. */
  step(intensity: number, pan: number): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    this.burst(dest, ctx.currentTime, 0.008 + Math.random() * 0.006, rand(5000, 7000), 1.2, 0.05 + 0.12 * intensity);
  }

  private get audible(): boolean {
    return !!this.ctx && this.enabled && !this.muted && this.ctx.state === 'running';
  }

  private applyGain(): void {
    if (!this.ctx || !this.out) return;
    this.out.gain.setTargetAtTime(this.enabled && !this.muted ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }

  /** A panned input into the output bus, or null when nothing should play. */
  private dest(pan: number): AudioNode | null {
    if (!this.audible || !this.ctx || !this.out) return null;
    if (!this.ctx.createStereoPanner) return this.out;
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.out);
    return p;
  }

  private burst(dest: AudioNode, t: number, dur: number, freq: number, q: number, vol: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rand(0.8, 1.2);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5, dur + 0.02);
  }
}
