// Browser shim for Node's "module" builtin. UDT's ESM build calls createRequire
// only to lazily load the Node BLE adapter — a path never taken in the browser
// (the Web Bluetooth adapter is auto-selected), so the stub require never runs.
export function createRequire() {
  return () => {
    throw new Error('node require is unavailable in the browser bundle');
  };
}
export default { createRequire };
