import { Vector3 } from 'three';
import type { World } from './world';

interface Sample {
  x: number;
  z: number;
  t: number;
}

export interface InputHandlers {
  /** A tap, paw or click at a ground point. */
  touch(x: number, z: number): void;
  /** A pointer moving over the ground at `speed` lizard lengths per second. */
  pointer(x: number, z: number, speed: number): void;
}

/** Turns taps, paws and mouse movement into ground-space stimuli. */
export class PointerInput {
  enabled = false;
  /** Type of the last pointer that touched the screen ('mouse', 'touch' or 'pen'). */
  lastType = '';

  private readonly last = new Map<number, Sample>();
  private readonly p = new Vector3();

  constructor(el: HTMLElement, private readonly world: World, private readonly handlers: InputHandlers) {
    el.addEventListener('pointerdown', (e) => {
      this.lastType = e.pointerType;
      if (!this.enabled || !this.world.pick(e.clientX, e.clientY, this.p)) return;
      this.handlers.touch(this.p.x, this.p.z);
      this.last.set(e.pointerId, { x: this.p.x, z: this.p.z, t: e.timeStamp });
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.enabled || !this.world.pick(e.clientX, e.clientY, this.p)) return;
      const prev = this.last.get(e.pointerId);
      const dt = prev ? (e.timeStamp - prev.t) / 1000 : 0;
      if (prev && dt < 0.008) return;
      if (prev && dt < 0.25) {
        const speed = Math.hypot(this.p.x - prev.x, this.p.z - prev.z) / dt;
        this.handlers.pointer(this.p.x, this.p.z, speed);
      }
      this.last.set(e.pointerId, { x: this.p.x, z: this.p.z, t: e.timeStamp });
    });
    const forget = (e: PointerEvent) => this.last.delete(e.pointerId);
    el.addEventListener('pointerup', forget);
    el.addEventListener('pointercancel', forget);
    el.addEventListener('pointerleave', forget);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
