// Test hook: when auto-load is on, `load` invokes onLoad synchronously with a
// mock GLTF. Tests that want to exercise the pre-load branch can flip this off.
let autoLoad = true;
// Test hook: which seal nodes to include in the mock scene. null → full 12.
let sealNamesOverride = null;
const instances = [];

const DEFAULT_SEAL_NAMES = [
  'seal_north_top', 'seal_north_middle', 'seal_north_bottom',
  'seal_south_top', 'seal_south_middle', 'seal_south_bottom',
  'seal_east_top',  'seal_east_middle',  'seal_east_bottom',
  'seal_west_top',  'seal_west_middle',  'seal_west_bottom',
];

const DEFAULT_DRUM_NAMES = ['drum_top', 'drum_middle', 'drum_bottom'];

function sealWorldPos(name) {
  const parts = name.split('_'); // seal_<side>_<level>
  const side = parts[1];
  const level = parts[2];
  const y = { top: 0.83, middle: 0.53, bottom: 0.23 }[level] ?? 0;
  return {
    north: { x: 0, y, z: 1.0 },
    east:  { x: 1.0, y, z: 0 },
    south: { x: 0, y, z: -1.0 },
    west:  { x: -1.0, y, z: 0 },
  }[side] ?? { x: 0, y: 0, z: 1.0 };
}

function makeNode(name) {
  const pos = name.startsWith('seal_') ? sealWorldPos(name) : { x: 0, y: 0, z: 0 };
  const node = {
    name,
    visible: true,
    children: [],
    parent: null,
    position: { x: pos.x, y: pos.y, z: pos.z },
  };
  node.getWorldPosition = function (v) {
    v.x = this.position.x;
    v.y = this.position.y;
    v.z = this.position.z;
    return v;
  };
  node.traverse = function (cb) {
    cb(this);
    for (const c of this.children) {
      if (typeof c.traverse === 'function') c.traverse(cb);
    }
  };
  return node;
}

function makeMockScene() {
  const scene = {
    name: 'Scene',
    children: [],
    parent: null,
    position: {
      x: 0, y: 0, z: 0,
      sub() { return this; },
      toArray() { return [0, 0, 0]; },
    },
    add(child) {
      this.children.push(child);
      if (child) child.parent = this;
    },
    traverse(cb) {
      cb(this);
      for (const c of this.children) {
        if (typeof c.traverse === 'function') c.traverse(cb);
      }
    },
    removeFromParent() { this.parent = null; },
  };

  const sealNames = sealNamesOverride ?? DEFAULT_SEAL_NAMES;
  for (const name of sealNames) {
    scene.add(makeNode(name));
  }

  for (const name of DEFAULT_DRUM_NAMES) {
    const node = makeNode(name);
    node.rotation = { x: 0, y: 0, z: 0 };
    scene.add(node);
  }
  return scene;
}

class GLTFLoader {
  constructor() {
    instances.push(this);
  }

  setDRACOLoader(_loader) {
    return this;
  }

  load(_url, onLoad, _onProgress, _onError) {
    this._onLoad = onLoad;
    if (autoLoad && onLoad) {
      onLoad({ scene: makeMockScene() });
    }
  }

  // Test helper: fire onLoad deferred (for tests that want to observe pre-load state).
  fireLoad() {
    if (this._onLoad) this._onLoad({ scene: makeMockScene() });
  }
}

module.exports = {
  GLTFLoader,
  __setAutoLoad(v) { autoLoad = v; },
  __setSealNames(names) { sealNamesOverride = names; },
  __getLastInstance() { return instances[instances.length - 1]; },
  __reset() {
    autoLoad = true;
    sealNamesOverride = null;
    instances.length = 0;
  },
};
