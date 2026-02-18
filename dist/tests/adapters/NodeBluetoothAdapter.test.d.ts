/**
 * Tests for NodeBluetoothAdapter
 *
 * Mocks @stoprocent/noble at the module level. Noble is a singleton EventEmitter
 * loaded via require() at the top of NodeBluetoothAdapter.ts. The jest.mock()
 * intercepts that require so the adapter gets our mock instead of the real package.
 */
export {};
