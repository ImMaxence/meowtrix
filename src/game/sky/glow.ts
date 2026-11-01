import * as THREE from 'three';

/** A white disc fading out from the middle along `stops` ([radius 0…1, alpha]). */
function radial(stops: readonly (readonly [number, number])[]): THREE.CanvasTexture {
  const N = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  for (const [r, a] of stops) grad.addColorStop(r, `rgba(255,255,255,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, N, N);
  return new THREE.CanvasTexture(canvas);
}

let glow: THREE.CanvasTexture | null = null;
let spot: THREE.CanvasTexture | null = null;

/** A soft white glow fading to transparent, tinted by the material (firefly lanterns, laser dots). */
export const glowTexture = (): THREE.CanvasTexture => (glow ??= radial([[0, 1], [0.18, 0.75], [0.45, 0.22], [1, 0]]));

/** A solid disc with a soft rim. */
export const spotTexture = (): THREE.CanvasTexture => (spot ??= radial([[0, 1], [0.55, 1], [1, 0]]));

/** An additive glow lying flat (on the ground); `toneMapped: false` keeps the colour vivid. */
export const glowMaterial = (color: string, opacity: number): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });

/**
 * The same glow, always facing the camera (in the air). Drawn over everything, like light
 * spilling around: otherwise the ground would cut it in half when the firefly sits on it.
 */
export const glowSprite = (color: string, opacity: number): THREE.Sprite => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  sprite.renderOrder = 1;
  return sprite;
};
