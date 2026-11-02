import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Fete } from '../catalog';
import { FeteFx, MOODS } from './fete';
import { GROUND_LIGHT, groundRoughness, makeGroundTexture, WATER_TINT, type GroundTheme, type WaterGround } from './ground';
import { PixelPass } from './pixel';
import { SURFACE, Water } from './water';

export type ViewSize = 'small' | 'medium' | 'large';
/** 0 low, 1 medium, 2 high (see setQuality). */
export type Quality = 0 | 1 | 2;
export type RenderStyle = 'classic' | 'pixel';

/** Visible ground along the screen's short side, in lizard lengths. */
const VIEW_SHORT: Record<ViewSize, number> = { small: 3.6, medium: 2.6, large: 1.9 };

/** Camera tilt from vertical, for a bit of depth. */
const TILT = THREE.MathUtils.degToRad(20);
const GROUND_SIZE = 80;
const TILE = 2.5;

const LIGHT_TINT = new THREE.Color();

/** The visible ground rectangle (x, z). */
export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  readonly bounds: Bounds = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };

  private readonly sun: THREE.DirectionalLight;
  private readonly sky: THREE.HemisphereLight;
  /** Created the first time a fête is chosen. */
  private fx: FeteFx | null = null;
  private fete: Fete = 'none';
  private readonly groundMat: THREE.MeshStandardMaterial;
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly ndc = new THREE.Vector2();
  private viewShort = VIEW_SHORT.medium;
  private maxPixelRatio = 2;
  quality: Quality = 2;
  /** Created the first time the water theme is shown. */
  private water: Water | null = null;
  private ground: GroundTheme = 'stone';
  /** Created the first time the pixel style is chosen. */
  private pixel: PixelPass | null = null;
  private style: RenderStyle = 'classic';

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    pmrem.dispose();

    this.sky = new THREE.HemisphereLight('#e8f0ff', '#3b3028', 0.7);
    this.scene.add(this.sky);
    this.sun = new THREE.DirectionalLight('#fff1dc', 2.4);
    // Not straight overhead, so the lizard and its legs cast a visible shadow.
    this.sun.position.set(2.4, 5, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.01;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);

    this.groundMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.resize();
  }

  get maxAnisotropy(): number {
    return this.renderer.capabilities.getMaxAnisotropy();
  }

  setGround(theme: GroundTheme): void {
    const tex = makeGroundTexture(theme);
    tex.anisotropy = this.maxAnisotropy;
    tex.repeat.setScalar(GROUND_SIZE / TILE);
    this.groundMat.map = tex;
    this.groundMat.roughness = groundRoughness(theme);
    this.groundMat.needsUpdate = true;
    this.ground = theme;
    this.tintWater();
    this.applyLight();
  }

  /** Smooth 3D, or big pixels with fewer colours. */
  setStyle(style: RenderStyle): void {
    this.style = style;
    if (style === 'pixel' && !this.pixel) this.pixel = new PixelPass(this.renderer);
    this.resize();
  }

  /** Shows or hides the water (surface, caustics, ripples) of the water theme. */
  setWater(on: boolean): void {
    if (on && !this.water) {
      this.water = new Water();
      this.scene.add(this.water.group);
      this.tintWater();
    }
    if (this.water) this.water.group.visible = on;
    this.fx?.set(this.fete, !on);
  }

  /** Light, weather and snow of a fête ('none' for the everyday look). */
  setFete(fete: Fete): void {
    this.fete = fete;
    this.applyLight();
    if (fete !== 'none' && !this.fx) {
      this.fx = new FeteFx(GROUND_SIZE, TILE);
      this.scene.add(this.fx.group);
      this.scalePoints();
    }
    this.fx?.set(fete, !this.underwater);
  }

  /** The fête's mood, dimmed and tinted at dusk or by moonlight. */
  private applyLight(): void {
    const m = MOODS[this.fete], g = GROUND_LIGHT[this.ground];
    const power = g?.power ?? 1;
    this.sky.color.set(m.sky);
    this.sky.groundColor.set(m.ground);
    this.sun.color.set(m.sun);
    if (g) {
      LIGHT_TINT.set(g.tint);
      this.sky.color.multiply(LIGHT_TINT);
      this.sun.color.multiply(LIGHT_TINT);
    }
    this.sky.intensity = m.hemi * (0.3 + 0.7 * power);
    this.sun.intensity = m.sunPower * power;
    this.scene.environmentIntensity = 0.35 * (0.25 + 0.75 * power);
    this.renderer.toneMappingExposure = m.exposure;
  }

  /** Snow and petals are sized in screen pixels: make them as big in the small pixel-art picture. */
  private scalePoints(): void {
    const pixel = this.style === 'pixel' && this.pixel;
    this.fx?.setPointScale(pixel ? pixel.height / (window.innerHeight * this.renderer.getPixelRatio()) : 1);
  }

  private tintWater(): void {
    if (this.ground in WATER_TINT) this.water?.setTint(WATER_TINT[this.ground as WaterGround]);
  }

  get underwater(): boolean {
    return !!this.water?.group.visible;
  }

  /** A few bubbles rising from (x, y, z) to the surface. */
  bubbles(x: number, y: number, z: number): void {
    if (this.underwater) this.water!.bubbles(x, y, z);
  }

  /** Rings on the water surface at (x, z). */
  ripple(x: number, z: number, size = 1): void {
    if (this.underwater) this.water!.ripple(x, z, size);
  }

  update(dt: number): void {
    this.water?.update(dt);
    this.fx?.update(dt, this.bounds, this.underwater ? SURFACE : 0);
  }

  setViewSize(size: ViewSize): void {
    this.viewShort = VIEW_SHORT[size];
    this.updateCamera();
  }

  /** Resolution and shadow sharpness: 0 for slow devices (TVs, old phones), 2 for the full picture. */
  setQuality(level: Quality): void {
    this.quality = level;
    this.maxPixelRatio = [1, 1.5, 2][level];
    const shadow = [1024, 1536, 2048][level];
    this.sun.shadow.mapSize.set(shadow, shadow);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.updateCamera();
    if (this.style === 'pixel') this.pixel?.setSize(w, h);
    this.scalePoints();
  }

  /** Projects a screen point onto the ground, or onto a horizontal plane at `height`. */
  pick(clientX: number, clientY: number, out: THREE.Vector3, height = 0): boolean {
    this.ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    this.plane.constant = -height;
    const hit = this.raycaster.ray.intersectPlane(this.plane, out) !== null;
    this.plane.constant = 0;
    return hit;
  }

  /** Stereo position (-1 left … 1 right) of a ground x coordinate. */
  panOf(x: number): number {
    const b = this.bounds;
    const half = (b.maxX - b.minX) / 2 || 1;
    return Math.max(-1, Math.min(1, (x - (b.minX + b.maxX) / 2) / half)) * 0.85;
  }

  render(): void {
    if (this.style === 'pixel' && this.pixel) this.pixel.render(this.renderer, this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(): void {
    const cam = this.camera;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = cam.aspect >= 1
      ? (this.viewShort * Math.cos(TILT)) / (2 * tanHalf)
      : this.viewShort / (2 * tanHalf * cam.aspect);
    cam.position.set(0, dist * Math.cos(TILT), dist * Math.sin(TILT));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    // The view is a trapezoid on the ground; keep the rectangle inside it.
    const p = new THREE.Vector3();
    const corner = (x: number, y: number) => {
      this.ndc.set(x, y);
      this.raycaster.setFromCamera(this.ndc, cam);
      this.raycaster.ray.intersectPlane(this.plane, p);
      return p.clone();
    };
    const bl = corner(-1, -1), br = corner(1, -1), tr = corner(1, 1), tl = corner(-1, 1);
    const b = this.bounds;
    b.minX = Math.max(bl.x, tl.x);
    b.maxX = Math.min(br.x, tr.x);
    b.minZ = Math.max(tl.z, tr.z);
    b.maxZ = Math.min(bl.z, br.z);

    const half = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2 + 1.5;
    const shadow = this.sun.shadow.camera;
    shadow.left = shadow.bottom = -half;
    shadow.right = shadow.top = half;
    shadow.near = 0.5;
    shadow.far = 20;
    shadow.updateProjectionMatrix();
  }
}
