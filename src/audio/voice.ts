import { rand } from '../game/math';

type AudioContextCtor = typeof AudioContext;

/**
 * Animal sounds synthesised with the Web Audio API: gecko chirps, mouse squeaks, squirrel chatter,
 * birdsong, croaks, chirring, bubbles, footfalls, and the buzz of flies.
 */
export class Voice {
  ctx: AudioContext | null = null;
  /** performance.now() until which our own sounds may be picked up by the microphone. */
  loudUntil = 0;

  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  /** 0 … 1, as set in the menu. */
  private volume = 0.7;
  private muted = true;
  private previewTimer = 0;

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

  setVolume(volume: number): void {
    this.volume = volume;
    this.applyGain();
  }

  setMuted(muted: boolean): void {
    clearTimeout(this.previewTimer);
    this.muted = muted;
    this.applyGain();
  }

  /** A gecko chirp at the current volume, even from the menu, so the slider can be judged by ear. */
  preview(): void {
    const ctx = this.init();
    if (!ctx || !this.volume) return;
    void ctx.resume().then(() => {
      const wasMuted = this.muted;
      this.muted = false;
      this.applyGain();
      this.chirp(0);
      if (wasMuted) this.previewTimer = window.setTimeout(() => this.setMuted(true), 900);
    });
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  /** Mouse squeaks: a few short high chirps, or one longer squeal when `alarm`. */
  mouseSqueak(pan: number, alarm: boolean): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const count = alarm ? 1 : 1 + Math.floor(Math.random() * 3);
    let t = ctx.currentTime + 0.02;
    for (let i = 0; i < count; i++) {
      const len = alarm ? 0.2 : rand(0.04, 0.07);
      const f0 = alarm ? 5200 : rand(5500, 7000);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0 * 0.85, t);
      osc.frequency.exponentialRampToValueAtTime(f0, t + len * 0.3);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.75, t + len);
      // Fast vibrato gives the squeak its rough edge.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = alarm ? 55 : 80;
      const depth = ctx.createGain();
      depth.gain.value = f0 * 0.04;
      lfo.connect(depth).connect(osc.frequency);
      const g = ctx.createGain();
      const vol = alarm ? 0.3 : 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(g).connect(dest);
      osc.start(t);
      lfo.start(t);
      osc.stop(t + len + 0.02);
      lfo.stop(t + len + 0.02);
      t += len + rand(0.05, 0.12);
    }
    this.loudUntil = performance.now() + ((t - ctx.currentTime) + 0.4) * 1000;
  }

  /** A continuous buzz (fly, ladybird); created lazily once audio is running. */
  createBuzz(base = rand(180, 215), volume = 0.045): Buzz {
    return new Buzz(this, base, volume);
  }

  /** Wingbeats of a bird in flight, plus its song. */
  createFlutter(): Flutter {
    return new Flutter(this);
  }

  /** A few quick whistled notes, or a sharp alarm call. */
  tweet(pan: number, alarm: boolean): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const count = alarm ? 3 : 2 + Math.floor(Math.random() * 5);
    const f0 = rand(3200, 4800);
    let t = ctx.currentTime + 0.02;
    for (let i = 0; i < count; i++) {
      const len = alarm ? 0.05 : rand(0.06, 0.14);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const a = f0 * rand(0.8, 1.25), b = alarm ? a * 0.8 : a * rand(0.7, 1.4);
      osc.frequency.setValueAtTime(a, t);
      osc.frequency.exponentialRampToValueAtTime(b, t + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + len + 0.02);
      t += len + (alarm ? 0.04 : rand(0.03, 0.1));
    }
    this.loudUntil = performance.now() + ((t - ctx.currentTime) + 0.4) * 1000;
  }

  /** A frog's croak: a few low, buzzy pulses. */
  croak(pan: number, alarm: boolean): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const count = alarm ? 1 : 2 + Math.floor(Math.random() * 2);
    let t = ctx.currentTime + 0.02;
    for (let i = 0; i < count; i++) {
      const len = alarm ? 0.12 : rand(0.15, 0.24);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(alarm ? 480 : rand(180, 240), t);
      osc.frequency.linearRampToValueAtTime(alarm ? 380 : rand(150, 200), t + len);
      const pulse = ctx.createGain();
      pulse.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = rand(28, 40);
      const depth = ctx.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth).connect(pulse.gain);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 700;
      filter.Q.value = 1.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(pulse).connect(filter).connect(g).connect(dest);
      osc.start(t);
      lfo.start(t);
      osc.stop(t + len + 0.02);
      lfo.stop(t + len + 0.02);
      t += len + rand(0.08, 0.18);
    }
    this.loudUntil = performance.now() + ((t - ctx.currentTime) + 0.4) * 1000;
  }

  /** Grasshopper chirring: rapid trains of scratchy clicks. */
  chirr(pan: number, alarm: boolean): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const trains = alarm ? 1 : 2 + Math.floor(Math.random() * 3);
    let t = ctx.currentTime + 0.02;
    for (let k = 0; k < trains; k++) {
      const clicks = alarm ? 4 : 8 + Math.floor(Math.random() * 8);
      for (let i = 0; i < clicks; i++) this.burst(dest, t + i * 0.035, 0.02, rand(6500, 8500), 3, 0.18);
      t += clicks * 0.035 + rand(0.15, 0.35);
    }
    this.loudUntil = performance.now() + ((t - ctx.currentTime) + 0.4) * 1000;
  }

  /** A squirrel's chatter: quick "chuk" notes. */
  chatter(pan: number, alarm: boolean): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const count = alarm ? 6 : 3 + Math.floor(Math.random() * 6);
    let t = ctx.currentTime + 0.02;
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      const f0 = rand(1800, 2600);
      osc.frequency.setValueAtTime(f0 * 1.3, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.07);
      this.burst(dest, t, 0.015, 3000, 2, 0.12);
      t += alarm ? 0.07 : rand(0.08, 0.13);
    }
    this.loudUntil = performance.now() + ((t - ctx.currentTime) + 0.4) * 1000;
  }

  /** Bubbles rising from a fish: short "bloop"s sweeping up. */
  bubbles(pan: number): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const count = 2 + Math.floor(Math.random() * 4);
    let t = ctx.currentTime + 0.02;
    for (let i = 0; i < count; i++) {
      const len = rand(0.04, 0.08), f0 = rand(350, 700);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + len + 0.02);
      t += len + rand(0.04, 0.15);
    }
    this.loudUntil = performance.now() + ((t - ctx.currentTime) + 0.4) * 1000;
  }

  /** A splash: a fish darting off, or a paw slapping the water. */
  splash(pan: number, size = 1): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    const t = ctx.currentTime + 0.01;
    this.burst(dest, t, 0.25 * size, 1400, 0.5, 0.3 * size);
    this.burst(dest, t + 0.03, 0.12, 600, 1, 0.2 * size);
    this.loudUntil = performance.now() + 600;
  }

  /** A soft thud: a frog landing. */
  thud(intensity: number, pan: number): void {
    const ctx = this.ctx;
    const dest = this.dest(pan);
    if (!ctx || !dest) return;
    this.burst(dest, ctx.currentTime, 0.06, rand(160, 260), 1, 0.15 + 0.35 * intensity);
  }

  /** The output bus, or null before init(). */
  get bus(): AudioNode | null {
    return this.out;
  }

  /** Two seconds of white noise, shared by every noisy sound. */
  get noiseBuffer(): AudioBuffer | null {
    return this.noise;
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
    return !!this.ctx && this.volume > 0 && !this.muted && this.ctx.state === 'running';
  }

  private applyGain(): void {
    if (!this.ctx || !this.out) return;
    // Squared, so the slider feels even to the ear; 0.7 is the old fixed level, 1 is about twice as loud.
    this.out.gain.setTargetAtTime(this.muted ? 0 : 1.8 * this.volume * this.volume, this.ctx.currentTime, 0.05);
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

/**
 * The buzz of one fly: a soft, low-passed sawtooth at a house fly's wingbeat (~190 Hz),
 * with a slow wobble. Silent until the fly takes off.
 */
export class Buzz {
  private nodes: {
    osc: OscillatorNode;
    lfo: OscillatorNode;
    gain: GainNode;
    pan: StereoPannerNode | null;
  } | null = null;

  constructor(private readonly voice: Voice, private readonly base: number, private readonly volume: number) {}

  /** `level` 0..1 (0 = landed), `pitch` around 1, `pan` -1..1. */
  update(level: number, pitch: number, pan: number): void {
    const ctx = this.voice.ctx;
    const bus = this.voice.bus;
    if (!ctx || !bus) return;
    if (!this.nodes) {
      if (level < 0.01) return;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = this.base;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      // Tremolo before the level stage, so a landed fly is fully silent.
      const trem = ctx.createGain();
      trem.gain.value = 0.75;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rand(6, 10);
      const depth = ctx.createGain();
      depth.gain.value = 0.25;
      lfo.connect(depth).connect(trem.gain);
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      osc.connect(filter).connect(trem).connect(gain);
      if (panner) gain.connect(panner).connect(bus);
      else gain.connect(bus);
      osc.start();
      lfo.start();
      this.nodes = { osc, lfo, gain, pan: panner };
    }
    const now = ctx.currentTime;
    this.nodes.gain.gain.setTargetAtTime(level * this.volume, now, 0.05);
    this.nodes.osc.frequency.setTargetAtTime(this.base * pitch, now, 0.08);
    this.nodes.pan?.pan.setTargetAtTime(pan, now, 0.05);
  }

  dispose(): void {
    if (!this.nodes) return;
    this.nodes.osc.stop();
    this.nodes.lfo.stop();
    this.nodes.gain.disconnect();
    this.nodes = null;
  }
}

/**
 * A bird in flight: soft noise pulses at its wingbeat. Silent on the ground, where it sings
 * now and then instead (see call).
 */
export class Flutter {
  private nodes: { src: AudioBufferSourceNode; lfo: OscillatorNode; gain: GainNode; pan: StereoPannerNode | null } | null = null;

  constructor(private readonly voice: Voice) {}

  update(level: number, pitch: number, pan: number): void {
    const ctx = this.voice.ctx;
    const bus = this.voice.bus;
    const noise = this.voice.noiseBuffer;
    if (!ctx || !bus || !noise) return;
    if (!this.nodes) {
      if (level < 0.01) return;
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.8;
      const beat = ctx.createGain();
      beat.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 11;
      const depth = ctx.createGain();
      depth.gain.value = 0.5;
      lfo.connect(depth).connect(beat.gain);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      src.connect(filter).connect(beat).connect(gain);
      if (panner) gain.connect(panner).connect(bus);
      else gain.connect(bus);
      src.start();
      lfo.start();
      this.nodes = { src, lfo, gain, pan: panner };
    }
    const now = ctx.currentTime;
    this.nodes.gain.gain.setTargetAtTime(level * 0.12, now, 0.08);
    this.nodes.lfo.frequency.setTargetAtTime(10 * pitch, now, 0.1);
    this.nodes.pan?.pan.setTargetAtTime(pan, now, 0.05);
  }

  call(pan: number, alarm: boolean): void {
    this.voice.tweet(pan, alarm);
  }

  dispose(): void {
    if (!this.nodes) return;
    this.nodes.src.stop();
    this.nodes.lfo.stop();
    this.nodes.gain.disconnect();
    this.nodes = null;
  }
}
