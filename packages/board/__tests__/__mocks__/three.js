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
    this.mask |= (1 << channel);
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
    // Board extension: the 3D plugin owns a token Group it adds to / removes from
    // the scene and tags with userData.
    this.parent = null;
    this.userData = {};
  }
  add(obj) {
    this.children.push(obj);
    if (obj) obj.parent = this;
  }
  remove(obj) {
    const i = this.children.indexOf(obj);
    if (i >= 0) this.children.splice(i, 1);
    if (obj) obj.parent = null;
  }
  removeFromParent() {
    if (this.parent && this.parent.children) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = null;
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
  // Board extension (ultimatedarktowerboard): the 3D plugin fans tokens via
  // `anchorWorld.clone().add(offset)`, so the mock Vector3 needs real arithmetic.
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
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
  getPixelRatio() { return 1; }
  render() {}
  compile() { return new Set(); }
  compileAsync() { return Promise.resolve(new Set()); }
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
    this.uuid = 'mock-mesh-' + (++_uuidSeq);
    // Board extension: the 3D plugin stashes space-target location data here.
    this.userData = {};
  }
  add(obj) {
    this.children.push(obj);
    if (obj) obj.parent = this;
  }
  traverse(cb) {
    cb(this);
    for (const c of this.children) if (c.traverse) c.traverse(cb);
  }
  // Board extension: the plugin builds detached raycast discs and updates them once.
  updateMatrixWorld() {}
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
    // Board extension: the 3D plugin stashes the TokenSelection + base scale here.
    this.userData = {};
  }
  add(obj) { this.children.push(obj); if (obj) obj.parent = this; }
  removeFromParent() {
    if (this.parent && this.parent.children) {
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
    }
    this.parent = null;
  }
  // Board extension: the 3D plugin disposes tokens via Object3D.traverse.
  traverse(cb) {
    cb(this);
    for (const c of this.children) if (typeof c.traverse === 'function') c.traverse(cb);
  }
}

class CanvasTexture {
  constructor() { this.needsUpdate = false; }
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

class TextureLoader {
  constructor() {}
  load(_url, onLoad, _onProgress, _onError) {
    // Minimal stub: deliberately NO `center` etc. so Display's board-texture path
    // throws early (caught → procedural fallback) instead of running its material
    // swap, which needs canvas/Color surface the mock doesn't cover. The board
    // plugin only sets colorSpace/flipY on this, which is fine.
    const tex = { isTexture: true, dispose() {}, image: null };
    if (typeof onLoad === 'function') setTimeout(() => onLoad(tex), 0);
    return tex;
  }
  loadAsync(_url) {
    return Promise.resolve({ isTexture: true, dispose() {}, image: null });
  }
}

class Clock {
  constructor(autoStart = true) {
    this.autoStart = autoStart;
    this.running = false;
  }
  start() { this.running = true; }
  stop() { this.running = false; }
  getDelta() { return 0; }
  getElapsedTime() { return 0; }
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
    this.ray = { intersectPlane() { return null; } };
  }
  setFromCamera() { return this; }
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

// Board extension: minimal BufferGeometry/BufferAttribute for the plugin's board
// quad (4 corners through anchorToWorld + 2 triangles).
class BufferAttribute {
  constructor(array, itemSize) {
    this.array = array;
    this.itemSize = itemSize;
  }
}
class BufferGeometry {
  constructor() {
    this.attributes = {};
    this.index = null;
  }
  setAttribute(name, attr) {
    this.attributes[name] = attr;
    return this;
  }
  setIndex(index) {
    this.index = index;
    return this;
  }
  computeVertexNormals() {
    return this;
  }
  dispose() {}
}

module.exports = {
  Layers,
  Scene,
  Group,
  BufferGeometry,
  BufferAttribute,
  DoubleSide: 2,
  FrontSide: 0,
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
