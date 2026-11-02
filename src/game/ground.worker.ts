import { paint, type GroundTheme } from './ground-paint';

// Paints a full-size ground tile off the main thread and sends it back as an ImageBitmap.

interface Job {
  id: number;
  theme: GroundTheme;
  size: number;
}

interface WorkerScope {
  addEventListener(type: 'message', fn: (e: MessageEvent<Job>) => void): void;
  postMessage(message: unknown, transfer: Transferable[]): void;
}

const scope = globalThis as unknown as WorkerScope;

scope.addEventListener('message', (e) => {
  const { id, theme, size } = e.data;
  const canvas = new OffscreenCanvas(size, size);
  paint(theme, size, canvas);
  const bitmap = canvas.transferToImageBitmap();
  scope.postMessage({ id, bitmap }, [bitmap]);
});
