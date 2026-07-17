/**
 * lights.test.ts — the two light-sequence tools must agree on what exists.
 *
 * LightSequenceSchema hardcoded a 0x13 ceiling. Core later added wholeTowerBreathing
 * (0x14) and slowFlareThenFade (0x15), so tower_light_sequence rejected two sequences
 * the library supports — while tower_light_sequence_by_name looked its value up and
 * passed it straight through with no range check at all. Same underlying
 * lightOverrides call, two different contracts, depending on which tool the model
 * happened to pick.
 *
 * The load-bearing test is the parity one: it derives from TOWER_LIGHT_SEQUENCES, so
 * it keeps holding when core adds the next sequence.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TOWER_LIGHT_SEQUENCES } from 'ultimatedarktower';

import { registerLightTools } from './lights.js';
import { createHarness, type Harness } from '../test-support/mcpHarness.js';

const sequenceEntries = Object.entries(TOWER_LIGHT_SEQUENCES) as Array<[string, number]>;

describe('light sequence bounds', () => {
  let h: Harness;

  beforeEach(async () => {
    h = await createHarness(registerLightTools);
  });

  afterEach(async () => {
    await h.close();
  });

  it.each(sequenceEntries)('accepts %s by ID', async (_name, value) => {
    const result = await h.callTool('tower_light_sequence', { sequence: value });

    expect(result.isError).toBe(false);
    expect(h.tower.lightOverrides).toHaveBeenCalledWith(value, undefined);
  });

  it('rejects an ID above the defined sequences', async () => {
    const max = Math.max(...sequenceEntries.map(([, v]) => v));
    const result = await h.callTool('tower_light_sequence', { sequence: max + 1 });

    expect(result.isError).toBe(true);
    expect(h.tower.lightOverrides).not.toHaveBeenCalled();
  });

  it('rejects an ID below the defined sequences', async () => {
    const result = await h.callTool('tower_light_sequence', { sequence: 0 });

    expect(result.isError).toBe(true);
    expect(h.tower.lightOverrides).not.toHaveBeenCalled();
  });

  it('rejects a non-integer ID', async () => {
    const result = await h.callTool('tower_light_sequence', { sequence: 1.5 });

    expect(result.isError).toBe(true);
    expect(h.tower.lightOverrides).not.toHaveBeenCalled();
  });
});

describe('by-ID and by-name paths agree', () => {
  let h: Harness;

  beforeEach(async () => {
    h = await createHarness(registerLightTools);
  });

  afterEach(async () => {
    await h.close();
  });

  // Every sequence reachable by name must be reachable by ID, and vice versa.
  it.each(sequenceEntries)('reaches %s the same way by name and by ID', async (name, value) => {
    const byName = await h.callTool('tower_light_sequence_by_name', { name });
    expect(byName.isError).toBe(false);
    const nameCallArgs = h.tower.lightOverrides.mock.calls.at(-1);

    const byId = await h.callTool('tower_light_sequence', { sequence: value });
    expect(byId.isError).toBe(false);
    const idCallArgs = h.tower.lightOverrides.mock.calls.at(-1);

    expect(nameCallArgs).toEqual(idCallArgs);
  });

  it('rejects an unknown sequence name', async () => {
    const result = await h.callTool('tower_light_sequence_by_name', { name: 'notASequence' });

    expect(result.isError).toBe(true);
    expect(h.tower.lightOverrides).not.toHaveBeenCalled();
  });
});
