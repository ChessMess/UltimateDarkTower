/**
 * state.test.ts — tower_send_state input validation.
 *
 * tower_send_state declared `state: z.any()`, the only unvalidated input in the
 * server, on the one tool that writes raw state to the physical device. The guard in
 * TowerController.sendTowerState checks that required keys are *present* (it was
 * added after rtdt_pack_state crashed on a missing `drum`) but never checks their
 * shape, so a malformed drum reached the packer.
 *
 * These go through the real MCP client/server pair rather than poking the schema
 * object: the schema is inline in registerTool, and it is the SDK that enforces it.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createDefaultTowerState } from 'ultimatedarktower';

import { registerStateTools } from './state.js';
import { createHarness, type Harness } from '../test-support/mcpHarness.js';

describe('tower_send_state input validation', () => {
  let h: Harness;

  beforeEach(async () => {
    h = await createHarness(registerStateTools);
  });

  afterEach(async () => {
    await h.close();
  });

  it('accepts a well-formed tower state', async () => {
    const result = await h.callTool('tower_send_state', { state: createDefaultTowerState() });

    expect(result.isError).toBe(false);
    expect(h.tower.sendTowerState).toHaveBeenCalledTimes(1);
  });

  // Each of these reached rtdt_pack_state under z.any().
  it.each([
    ['a non-object state', 'banana'],
    ['a null state', null],
    ['a drum that is a string', { drum: 'banana' }],
    ['a drum that is not an array', { drum: { position: 0 } }],
    ['a drum entry missing its fields', { drum: [{}, {}, {}] }],
    ['an out-of-range drum position', { drum: [{ position: 999, calibrated: true }] }],
    ['a wrong-length drum array', { drum: [{ position: 0, calibrated: true }] }],
  ])('rejects %s without touching the tower', async (_label, state) => {
    const result = await h.callTool('tower_send_state', { state });

    expect(result.isError).toBe(true);
    expect(h.tower.sendTowerState).not.toHaveBeenCalled();
  });

  it('rejects a missing state argument', async () => {
    const result = await h.callTool('tower_send_state', {});

    expect(result.isError).toBe(true);
    expect(h.tower.sendTowerState).not.toHaveBeenCalled();
  });
});
