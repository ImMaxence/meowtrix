type FullscreenDoc = Document & { webkitFullscreenElement?: Element | null };
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => void };

export const isFullscreen = (): boolean => {
  const doc = document as FullscreenDoc;
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
};

/** Must be called synchronously from a user gesture. */
export function enterFullscreen(): void {
  if (isFullscreen()) return;
  const el = document.documentElement as FullscreenEl;
  try {
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else el.webkitRequestFullscreen?.();
  } catch {
    // Not allowed here (e.g. iPhone Safari): the PWA install covers that case.
  }
}

export function exitFullscreen(): void {
  if (!isFullscreen()) return;
  const doc = document as FullscreenDoc & { webkitExitFullscreen?: () => void };
  if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
  else doc.webkitExitFullscreen?.();
}

/** Running as an installed app (home screen icon). */
export const isStandalone = (): boolean =>
  matchMedia('(display-mode: fullscreen)').matches ||
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Keeps the screen awake while the cat plays. */
export class ScreenWakeLock {
  private lock: WakeLockSentinel | null = null;
  private wanted = false;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') void this.acquire();
    });
  }

  request(): void {
    this.wanted = true;
    void this.acquire();
  }

  private async acquire(): Promise<void> {
    if (!('wakeLock' in navigator) || (this.lock && !this.lock.released)) return;
    try {
      this.lock = await navigator.wakeLock.request('screen');
    } catch {
      // Denied or unsupported: the screen may dim, nothing else to do.
    }
  }
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
