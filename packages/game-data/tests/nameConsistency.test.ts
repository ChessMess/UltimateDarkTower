/**
 * Regression test for the v6 name reconciliation. `ultimatedarktower` used to disagree with
 * itself about the same 8 adversaries and 12 foes — e.g. "Isa the Exile" (seed parser, foe
 * roster) vs "Isa The Exile" (game content, box inventory) vs "Isa the Hollow" (audio
 * library), and singular foe names ("Dragon", "Frost Troll") next to plural ones ("Dragons",
 * "Frost Trolls"). `foes.ts`'s `ALL_FOES` is the canonical source — its own doc comment says
 * its names "match the seed-parser union exactly" — so every other roster that names a foe or
 * adversary must use exactly one of those spellings. This is what stops the drift returning.
 */

import { ALL_FOES } from '../src/foes';
import {
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES as SEED_ADVERSARIES,
} from '../src/seed/seedParser';
import { FOES as CONTENT_FOES, ADVERSARIES as CONTENT_ADVERSARIES } from '../src/gameContent';
import { TOWER_AUDIO_LIBRARY } from '../src/constants';
import { expansions } from '../src/boxInventory';

const CANONICAL_NAMES = new Set<string>(ALL_FOES.map((f) => f.name));

describe('foe/adversary name consistency (v6 reconciliation)', () => {
  test('foes.ts has the full canonical roster: 12 foes + 8 adversaries', () => {
    expect(CANONICAL_NAMES.size).toBe(20);
  });

  test('seed-parser tier/adversary enums use canonical spelling', () => {
    for (const name of [...TIER1_FOES, ...TIER2_FOES, ...TIER3_FOES, ...SEED_ADVERSARIES]) {
      expect(CANONICAL_NAMES.has(name)).toBe(true);
    }
  });

  test('gameContent.ts foes/adversaries use canonical spelling', () => {
    for (const name of Object.keys(CONTENT_FOES)) {
      expect(CANONICAL_NAMES.has(name)).toBe(true);
    }
    for (const name of Object.keys(CONTENT_ADVERSARIES)) {
      expect(CANONICAL_NAMES.has(name)).toBe(true);
    }
  });

  test('TOWER_AUDIO_LIBRARY Foe/Adversary labels use canonical spelling', () => {
    // A few keys in the "Foe" category are event-type cues, not foe names — exclude those.
    const NON_NAME_KEYS = new Set(['FoeEvent', 'FoeSpawn', 'LeveledUp']);
    const foeOrAdversaryEntries = Object.entries(TOWER_AUDIO_LIBRARY).filter(
      ([key, entry]) =>
        (entry.category === 'Foe' || entry.category === 'Adversary') && !NON_NAME_KEYS.has(key),
    );
    expect(foeOrAdversaryEntries.length).toBeGreaterThan(0);
    for (const [, entry] of foeOrAdversaryEntries) {
      expect(CANONICAL_NAMES.has(entry.name)).toBe(true);
    }
  });

  test('box inventory foe/adversary components (identified by their identity `level`) use canonical spelling', () => {
    const levelBearingNames: string[] = [];
    for (const expansion of expansions) {
      for (const category of expansion.categories) {
        for (const component of category.components) {
          // Every component in this dataset carrying a numeric `level` is a foe (2-4) or
          // adversary (5) identity level — no other component kind uses this field.
          if (typeof component.level === 'number' && component.name) {
            levelBearingNames.push(component.name);
          }
        }
      }
    }
    expect(levelBearingNames.length).toBeGreaterThan(0);
    for (const name of levelBearingNames) {
      expect(CANONICAL_NAMES.has(name)).toBe(true);
    }
  });
});
