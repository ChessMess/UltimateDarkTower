/**
 * Tests for the glyph/light-sequence/audio-library game vocabulary — split out of
 * ultimatedarktower's udtConstants.test.ts in v6 when this data moved packages.
 */

import { GLYPHS, TOWER_LIGHT_SEQUENCES, TOWER_AUDIO_LIBRARY } from '../src/constants';

describe('Constants', () => {
  describe('Glyphs', () => {
    test('should have GLYPHS object defined', () => {
      expect(GLYPHS).toBeDefined();
      expect(typeof GLYPHS).toBe('object');
    });
  });

  describe('Tower Light Sequences', () => {
    test('should have TOWER_LIGHT_SEQUENCES object defined', () => {
      expect(TOWER_LIGHT_SEQUENCES).toBeDefined();
      expect(typeof TOWER_LIGHT_SEQUENCES).toBe('object');
    });
  });

  describe('Tower Audio Library', () => {
    test('should have TOWER_AUDIO_LIBRARY object defined', () => {
      expect(TOWER_AUDIO_LIBRARY).toBeDefined();
      expect(typeof TOWER_AUDIO_LIBRARY).toBe('object');
    });
  });
});
