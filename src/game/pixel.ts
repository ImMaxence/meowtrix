import * as THREE from 'three';

/** Rows of big pixels along the screen's short side. */
const ROWS = 150;

/**
 * The pixel-art look: the scene is drawn into a small picture, then blown up to the screen with
 * hard edges, tone-mapped there, and reduced to a few levels per colour with ordered dithering.
 */
export class PixelPass {
  private readonly target: THREE.WebGLRenderTarget;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;

  constructor(renderer: THREE.WebGLRenderer) {
    const ext = renderer.extensions;
    // Keep the highlights above 1 until tone mapping, when the device can.
    const float = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: float ? THREE.HalfFloatType : THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.target.texture }, size: { value: new THREE.Vector2(1, 1) } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        uniform vec2 size;
        varying vec2 vUv;
        const float LEVELS = 10.0;
        const float CHROMA_LEVELS = 16.0;
        const vec3 LUMA = vec3(0.299, 0.587, 0.114);
        float bayer2(vec2 a) {
          a = floor(a);
          return fract(a.x / 2.0 + a.y * a.y * 0.75);
        }
        float bayer4(vec2 a) {
          return bayer2(0.5 * a) * 0.25 + bayer2(a);
        }
        void main() {
          gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          // Brightness in a few dithered steps, colour in a few plain ones: rounding each channel
          // on its own would scatter coloured specks over greys.
          vec3 c = gl_FragColor.rgb;
          float y = dot(c, LUMA);
          float d = bayer4(floor(vUv * size)) - 0.5;
          float yq = floor(y * LEVELS + 0.5 + d * 0.6) / LEVELS;
          vec3 chroma = floor((c - y) * CHROMA_LEVELS + 0.5) / CHROMA_LEVELS;
          gl_FragColor.rgb = clamp(yq + chroma, 0.0, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  /** Height of the small picture, in its own pixels. */
  get height(): number {
    return this.target.height;
  }

  /** `w`, `h`: the screen in CSS pixels. */
  setSize(w: number, h: number): void {
    const k = ROWS / Math.max(1, Math.min(w, h));
    const tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k));
    this.target.setSize(tw, th);
    this.material.uniforms.size.value.set(tw, th);
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    renderer.setRenderTarget(this.target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }
}
