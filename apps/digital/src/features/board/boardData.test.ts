import { describe, it, expect } from 'vitest';
import type { BoardState } from 'ultimatedarktowerboard';
import { foeLevelOf, statusForLevel } from './boardData';

describe('statusForLevel', () => {
  it('defaults to ready when nothing has been set for that level', () => {
    const state: BoardState = { tokens: {} };
    expect(statusForLevel(state, 2)).toBe('ready');
  });

  it('reads a stored level status regardless of what is placed', () => {
    const state: BoardState = { tokens: {}, meta: { levelStatus: { 2: 'savage' } } };
    expect(statusForLevel(state, 2)).toBe('savage');
  });

  it('ignores other levels stored in meta', () => {
    const state: BoardState = { tokens: {}, meta: { levelStatus: { 3: 'lethal' } } };
    expect(statusForLevel(state, 2)).toBe('ready');
  });
});

describe('foeLevelOf', () => {
  it('resolves a known foe id to its level', () => {
    expect(foeLevelOf('brigands')).toBe(2);
    expect(foeLevelOf('frost-trolls')).toBe(3);
  });

  it('returns undefined for an unknown id', () => {
    expect(foeLevelOf('not-a-real-foe')).toBeUndefined();
  });
});
