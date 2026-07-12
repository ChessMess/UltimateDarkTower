class OrbitControls {
  constructor() {
    this.target = {
      x: 0,
      y: 0,
      z: 0,
      set() {},
      clone() {
        return {
          x: 0,
          y: 0,
          z: 0,
          set() {},
          clone() {
            return {
              x: 0,
              y: 0,
              z: 0,
              set() {},
              clone() {
                return this;
              },
              sub() {
                return this;
              },
              normalize() {
                return this;
              },
              toArray() {
                return [0, 0, 0];
              },
            };
          },
          sub() {
            return this;
          },
          normalize() {
            return this;
          },
          toArray() {
            return [0, 0, 0];
          },
        };
      },
      toArray() {
        return [0, 0, 0];
      },
    };
    this.enableDamping = false;
    this.dampingFactor = 0;
    this.mouseButtons = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
  }
  update() {}
  dispose() {}
}
module.exports = { OrbitControls };
