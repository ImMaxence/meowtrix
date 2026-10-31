import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeGroundTexture, type GroundTheme } from './ground';

export type ViewSize = 'small' | 'medium' | 'large';

/** Visible ground along the screen's short side, in lizard lengths. */
const VIEW_SHORT: Record<ViewSize, number> = { small: 3.6, medium: 2.6, large: 1.9 };

/** Camera tilt from vertical, for a bit of depth. */
const TILT = THREE.MathUtils.degToRad(20);
const GROUND_SIZE = 80;
const TILE = 2.5;

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
  private readonly groundMat: THREE.MeshStandardMaterial;
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly ndc = new THREE.Vector2();
  private viewShort = VIEW_SHORT.medium;
  private maxPixelRatio = 2;

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

    this.scene.add(new THREE.HemisphereLight('#e8f0ff', '#3b3028', 0.7));
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
    this.groundMat.map?.dispose();
    this.groundMat.map = tex;
    this.groundMat.needsUpdate = true;
  }

  setViewSize(size: ViewSize): void {
    this.viewShort = VIEW_SHORT[size];
    this.updateCamera();
  }

  /** Drops resolution and shadow quality for slow devices (TVs, old phones). */
  setLowQuality(): void {
    this.maxPixelRatio = 1;
    this.sun.shadow.mapSize.set(1024, 1024);
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
    this.renderer.render(this.scene, this.camera);
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
