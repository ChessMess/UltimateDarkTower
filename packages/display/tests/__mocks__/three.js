// Minimal mock of `three` and related modules to keep the Jest suite (which
// runs on Node + jsdom) free of WebGL + ESM-only imports. Tower3DView is not
// unit-tested directly; this mock simply prevents accidental imports from
// crashing the suite.

let _uuidSeq = 0;

class Layers {
  constructor() {
    this.mask = 1; // default: layer 0
  }
  set(channel) {
    this.mask = 1 << channel;
  }
  enable(channel) {
    this.mask |= 1 << channel;
  }
  test(layers) {
    return (this.mask & layers.mask) !== 0;
  }
}

class Scene {
  constructor() {
    this.children = [];
  }
  add(obj) {
    this.children.push(obj);
  }
  traverse(cb) {
    cb(this);
    for (const c of this.children) {
      if (c && typeof c.traverse === 'function') c.traverse(cb);
    }
  }
}
class Group {
  constructor() {
    this.children = [];
    this.position = new Vector3();
  }
  add(obj) {
    this.children.push(obj);
    if (obj) obj.parent = this;
  }
  traverse(cb) {
    cb(this);
    for (const c of this.children) {
      if (c && typeof c.traverse === 'function') c.traverse(cb);
    }
  }
}
class Object3D {
  constructor() {
    this.children = [];
    this.position = new Vector3();
    this.parent = null;
  }
  add(obj) {
    this.children.push(obj);
    if (obj) obj.parent = this;
  }
  getWorldPosition(v) {
    v.x = this.position.x;
    v.y = this.position.y;
    v.z = this.position.z;
    return v;
  }
  removeFromParent() {
    if (this.parent && this.parent.children) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = null;
  }
}
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
}
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  sub() {
    return this;
  }
  length() {
    return 0;
  }
  lengthSq() {
    return 0;
  }
  setScalar(s) {
    this.x = s;
    this.y = s;
    this.z = s;
    return this;
  }
  toArray() {
    return [this.x, this.y, this.z];
  }
}
class Color {
  constructor(c) {
    this.value = 0;
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this._absorb(c);
  }
  _absorb(c) {
    if (typeof c === 'number') {
      this.value = c;
      this.r = ((c >> 16) & 0xff) / 255;
      this.g = ((c >> 8) & 0xff) / 255;
      this.b = (c & 0xff) / 255;
    } else if (c && typeof c === 'object') {
      this.value = c.value ?? 0;
      this.r = c.r ?? 0;
      this.g = c.g ?? 0;
      this.b = c.b ?? 0;
    }
  }
  setHex(c) {
    this._absorb(c);
    return this;
  }
  getHex() {
    return this.value;
  }
  set(c) {
    this._absorb(c);
    return this;
  }
  setRGB(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
    return this;
  }
  setScalar(s) {
    this.r = s;
    this.g = s;
    this.b = s;
    return this;
  }
  copy(other) {
    this._absorb(other);
    return this;
  }
}
class PerspectiveCamera {
  constructor() {
    this.position = new Vector3();
    this.fov = 45;
    this.children = [];
    this.parent = null;
    this.near = 0.1;
    this.far = 1000;
    this.aspect = 1;
  }
  add(obj) {
    this.children.push(obj);
    if (obj) obj.parent = this;
  }
  lookAt() {}
  updateProjectionMatrix() {}
}
class WebGLRenderer {
  constructor() {
    this.domElement = document.createElement('canvas');
    this.info = {
      memory: { geometries: 0, textures: 0 },
      render: { calls: 0, triangles: 0, points: 0, lines: 0, frame: 0 },
      programs: [],
      autoReset: true,
      reset() {
        this.render.calls = 0;
        this.render.triangles = 0;
        this.render.points = 0;
        this.render.lines = 0;
      },
    };
    this.shadowMap = { enabled: false, type: 0 };
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
    this.outputColorSpace = '';
    this.capabilities = { getMaxAnisotropy: () => 1 };
  }
  setPixelRatio() {}
  setSize() {}
  getPixelRatio() {
    return 1;
  }
  render() {}
  compile() {
    return new Set();
  }
  compileAsync() {
    return Promise.resolve(new Set());
  }
  dispose() {}
  forceContextLoss() {}
}
class HemisphereLight {
  constructor(sky = 0xffffff, ground = 0x000000, intensity = 1) {
    this.color = new Color(sky);
    this.groundColor = new Color(ground);
    this.intensity = intensity;
  }
}
class DirectionalLight {
  constructor(color = 0xffffff, intensity = 1) {
    this.color = new Color(color);
    this.intensity = intensity;
    this.position = new Vector3();
    this.castShadow = false;
    this.shadow = {
      mapSize: { set() {}, x: 0, y: 0 },
      bias: 0,
      normalBias: 0,
      camera: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        near: 0.1,
        far: 1000,
        updateProjectionMatrix() {},
      },
    };
    this.target = null;
  }
}
class RectAreaLight {
  constructor(color, intensity = 1, width = 1, height = 1) {
    this.color = new Color(color);
    this.intensity = intensity;
    this.width = width;
    this.height = height;
    this.position = new Vector3();
    this.parent = null;
  }
  lookAt() {}
}
class Box3 {
  setFromObject() {
    return this;
  }
  getCenter(v) {
    return v;
  }
  getSize(v) {
    return v;
  }
  getBoundingSphere(s) {
    s.radius = 1;
    return s;
  }
}
class Sphere {
  constructor() {
    this.radius = 0;
  }
}

class Mesh {
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    this.position = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    this.rotation = { x: 0, y: 0, z: 0 };
    this.children = [];
    this.parent = null;
    this.isMesh = true;
    this.visible = true;
    this.castShadow = false;
    this.receiveShadow = false;
    this.layers = new Layers();
    this.uuid = 'mock-mesh-' + ++_uuidSeq;
  }
  add(obj) {
    this.children.push(obj);
    if (obj) obj.parent = this;
  }
  traverse(cb) {
    cb(this);
    for (const c of this.children) if (c.traverse) c.traverse(cb);
  }
  removeFromParent() {
    if (this.parent && this.parent.children) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = null;
  }
}

class ShaderMaterial {
  constructor(params = {}) {
    this.uniforms = params.uniforms ?? {};
    this.vertexShader = params.vertexShader ?? '';
    this.fragmentShader = params.fragmentShader ?? '';
  }
  dispose() {}
}

class MeshBasicMaterial {
  constructor(opts = {}) {
    this.color = new Color(opts.color);
    this.transparent = opts.transparent ?? false;
    this.opacity = opts.opacity ?? 1;
    this.depthWrite = opts.depthWrite ?? true;
    this.toneMapped = opts.toneMapped ?? true;
  }
  dispose() {}
}

class SpriteMaterial {
  constructor(opts = {}) {
    this.color = new Color(opts.color);
    this.map = opts.map ?? null;
    this.transparent = opts.transparent ?? false;
    this.opacity = opts.opacity ?? 1;
    this.blending = opts.blending ?? 0;
    this.depthWrite = opts.depthWrite ?? true;
    this.toneMapped = opts.toneMapped ?? true;
  }
  dispose() {}
}

class Sprite {
  constructor(material) {
    this.material = material;
    this.position = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.renderOrder = 0;
    this.layers = new Layers();
  }
  add(obj) {
    this.children.push(obj);
    if (obj) obj.parent = this;
  }
  removeFromParent() {
    if (this.parent && this.parent.children) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = null;
  }
}

class CanvasTexture {
  constructor() {
    this.needsUpdate = false;
  }
  dispose() {}
}

class MeshStandardMaterial {
  constructor(opts = {}) {
    this.color = new Color(opts.color);
    this.emissive = new Color(opts.emissive);
    this.emissiveIntensity = opts.emissiveIntensity ?? 0;
    this.toneMapped = opts.toneMapped ?? true;
    this._opts = opts;
  }
  clone() {
    return new MeshStandardMaterial(this._opts);
  }
  dispose() {}
}

class PointLight {
  constructor(color, intensity = 1, distance = 0, decay = 2) {
    this.color = new Color(color);
    this.intensity = intensity;
    this.distance = distance;
    this.decay = decay;
    this.visible = true;
    this.position = new Vector3();
    this.parent = null;
  }
  removeFromParent() {
    if (this.parent && this.parent.children) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = null;
  }
}

class SpotLight {
  constructor(color, intensity = 1, distance = 0, angle = Math.PI / 3, penumbra = 0, decay = 2) {
    this.color = new Color(color);
    this.intensity = intensity;
    this.distance = distance;
    this.angle = angle;
    this.penumbra = penumbra;
    this.decay = decay;
    this.visible = true;
    this.castShadow = false;
    this.position = new Vector3();
    this.target = null;
    this.parent = null;
  }
  removeFromParent() {
    if (this.parent && this.parent.children) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = null;
  }
}

class SphereGeometry {
  constructor(radius, widthSegments, heightSegments) {
    this.parameters = { radius, widthSegments, heightSegments };
  }
  dispose() {}
}

class CircleGeometry {
  constructor(radius, segments) {
    this.radius = radius;
    this.segments = segments;
  }
  dispose() {}
}

class CylinderGeometry {
  constructor(radiusTop, radiusBottom, height, radialSegments) {
    this.parameters = { radiusTop, radiusBottom, height, radialSegments };
  }
  dispose() {}
}

// Real THREE.TextureLoader resolves a Texture with a `center` Vector2 (used
// by callers like GameBoardImageTexture.ts for `texture.center.set(...)`
// before setting `rotation`), so the stub mirrors that shape.
const makeStubTexture = () => ({
  isTexture: true,
  dispose() {},
  image: null,
  center: new Vector2(0.5, 0.5),
});

class TextureLoader {
  constructor() {}
  load(_url, onLoad, _onProgress, _onError) {
    // Tests don't need a real texture — return a stub and never fire callbacks.
    const tex = makeStubTexture();
    if (typeof onLoad === 'function') setTimeout(() => onLoad(tex), 0);
    return tex;
  }
  loadAsync(_url) {
    return Promise.resolve(makeStubTexture());
  }
}

class Clock {
  constructor(autoStart = true) {
    this.autoStart = autoStart;
    this.running = false;
  }
  start() {
    this.running = true;
  }
  stop() {
    this.running = false;
  }
  getDelta() {
    return 0;
  }
  getElapsedTime() {
    return 0;
  }
}

// Mirrors the core THREE.Timer API surface used by Tower3DView (update/getDelta/reset).
class Timer {
  update() {
    return this;
  }
  getDelta() {
    return 0;
  }
  getElapsed() {
    return 0;
  }
  reset() {
    return this;
  }
  setTimescale() {
    return this;
  }
  connect() {}
  disconnect() {}
  dispose() {}
}

class AxesHelper {
  constructor(size) {
    this.size = size;
    this.visible = true;
    this.scale = { setScalar() {} };
    this.position = new Vector3();
    this.parent = null;
  }
  removeFromParent() {
    if (this.parent && this.parent.children) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = null;
  }
}

// Controllable raycaster: returns an intersection for any object flagged with
// `__hit = true`; `__hitDistance` controls ordering. Lets pointer-contract tests
// drive hit results deterministically without real WebGL/geometry.
class Raycaster {
  constructor() {
    this.ray = {
      intersectPlane() {
        return null;
      },
    };
  }
  setFromCamera() {
    return this;
  }
  intersectObjects(objects /* , recursive */) {
    const hits = [];
    for (const o of objects || []) {
      if (o && o.__hit) {
        hits.push({ object: o, distance: o.__hitDistance ?? 1, point: new Vector3(), face: null });
      }
    }
    hits.sort((a, b) => a.distance - b.distance);
    return hits;
  }
}

class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  copy(q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }
}

const __mock = {
  Layers,
  Scene,
  Group,
  Object3D,
  Vector2,
  Vector3,
  Quaternion,
  Raycaster,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  HemisphereLight,
  DirectionalLight,
  RectAreaLight,
  Box3,
  Sphere,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  SpotLight,
  SphereGeometry,
  CircleGeometry,
  CylinderGeometry,
  AxesHelper,
  Clock,
  Timer,
  TextureLoader,
  MOUSE: {
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
  },
  ShaderMaterial,
  MeshBasicMaterial,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  SRGBColorSpace: 'srgb',
  LinearSRGBColorSpace: 'srgb-linear',
  ACESFilmicToneMapping: 1,
  NoToneMapping: 0,
  PCFShadowMap: 1,
  PCFSoftShadowMap: 2,
  AdditiveBlending: 2,
};

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock;
const {
  Layers: __e_Layers,
  Scene: __e_Scene,
  Group: __e_Group,
  Object3D: __e_Object3D,
  Vector2: __e_Vector2,
  Vector3: __e_Vector3,
  Quaternion: __e_Quaternion,
  Raycaster: __e_Raycaster,
  Color: __e_Color,
  PerspectiveCamera: __e_PerspectiveCamera,
  WebGLRenderer: __e_WebGLRenderer,
  HemisphereLight: __e_HemisphereLight,
  DirectionalLight: __e_DirectionalLight,
  RectAreaLight: __e_RectAreaLight,
  Box3: __e_Box3,
  Sphere: __e_Sphere,
  Mesh: __e_Mesh,
  MeshStandardMaterial: __e_MeshStandardMaterial,
  PointLight: __e_PointLight,
  SpotLight: __e_SpotLight,
  SphereGeometry: __e_SphereGeometry,
  CircleGeometry: __e_CircleGeometry,
  CylinderGeometry: __e_CylinderGeometry,
  AxesHelper: __e_AxesHelper,
  Clock: __e_Clock,
  Timer: __e_Timer,
  TextureLoader: __e_TextureLoader,
  MOUSE: __e_MOUSE,
  ShaderMaterial: __e_ShaderMaterial,
  MeshBasicMaterial: __e_MeshBasicMaterial,
  SpriteMaterial: __e_SpriteMaterial,
  Sprite: __e_Sprite,
  CanvasTexture: __e_CanvasTexture,
  SRGBColorSpace: __e_SRGBColorSpace,
  LinearSRGBColorSpace: __e_LinearSRGBColorSpace,
  ACESFilmicToneMapping: __e_ACESFilmicToneMapping,
  NoToneMapping: __e_NoToneMapping,
  PCFShadowMap: __e_PCFShadowMap,
  PCFSoftShadowMap: __e_PCFSoftShadowMap,
  AdditiveBlending: __e_AdditiveBlending,
} = __mock;
export {
  __e_Layers as Layers,
  __e_Scene as Scene,
  __e_Group as Group,
  __e_Object3D as Object3D,
  __e_Vector2 as Vector2,
  __e_Vector3 as Vector3,
  __e_Quaternion as Quaternion,
  __e_Raycaster as Raycaster,
  __e_Color as Color,
  __e_PerspectiveCamera as PerspectiveCamera,
  __e_WebGLRenderer as WebGLRenderer,
  __e_HemisphereLight as HemisphereLight,
  __e_DirectionalLight as DirectionalLight,
  __e_RectAreaLight as RectAreaLight,
  __e_Box3 as Box3,
  __e_Sphere as Sphere,
  __e_Mesh as Mesh,
  __e_MeshStandardMaterial as MeshStandardMaterial,
  __e_PointLight as PointLight,
  __e_SpotLight as SpotLight,
  __e_SphereGeometry as SphereGeometry,
  __e_CircleGeometry as CircleGeometry,
  __e_CylinderGeometry as CylinderGeometry,
  __e_AxesHelper as AxesHelper,
  __e_Clock as Clock,
  __e_Timer as Timer,
  __e_TextureLoader as TextureLoader,
  __e_MOUSE as MOUSE,
  __e_ShaderMaterial as ShaderMaterial,
  __e_MeshBasicMaterial as MeshBasicMaterial,
  __e_SpriteMaterial as SpriteMaterial,
  __e_Sprite as Sprite,
  __e_CanvasTexture as CanvasTexture,
  __e_SRGBColorSpace as SRGBColorSpace,
  __e_LinearSRGBColorSpace as LinearSRGBColorSpace,
  __e_ACESFilmicToneMapping as ACESFilmicToneMapping,
  __e_NoToneMapping as NoToneMapping,
  __e_PCFShadowMap as PCFShadowMap,
  __e_PCFSoftShadowMap as PCFSoftShadowMap,
  __e_AdditiveBlending as AdditiveBlending,
};
