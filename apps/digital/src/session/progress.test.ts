import { describe, it, expect } from 'vitest';
import {
  MONTHS,
  activeReminders,
  isFinalTurn,
  nextTurn,
  previousTurn,
  setMonth,
  turnsInMonth,
} from './progress';
import { createNewGameSession, createDefaultConfig } from './factory';
import type { GameProgress } from './types';

const at = (month: number, turn: number): GameProgress => ({ month, turn, dismissedReminders: [] });

describe('turnsInMonth', () => {
  it('is player count + 5, clamped to 1–4 players', () => {
    expect(turnsInMonth(1)).toBe(6);
    expect(turnsInMonth(2)).toBe(7);
    expect(turnsInMonth(3)).toBe(8);
    expect(turnsInMonth(4)).toBe(9);
    expect(turnsInMonth(0)).toBe(6); // clamps up to 1 player
    expect(turnsInMonth(9)).toBe(9); // clamps down to 4 players
  });
});

describe('nextTurn / previousTurn', () => {
  it('advances within a month', () => {
    expect(nextTurn(at(1, 1), 1)).toEqual(at(1, 2));
  });
  it('rolls into the next month after the last turn', () => {
    expect(nextTurn(at(1, 6), 1)).toEqual(at(2, 1));
  });
  it('stops at the final turn of month 6', () => {
    const final = at(MONTHS, turnsInMonth(1));
    expect(nextTurn(final, 1)).toEqual(final);
    expect(isFinalTurn(final, 1)).toBe(true);
  });
  it('steps back across a month boundary to the previous month last turn', () => {
    expect(previousTurn(at(2, 1), 1)).toEqual(at(1, 6));
  });
  it('stops at month 1 turn 1', () => {
    expect(previousTurn(at(1, 1), 1)).toEqual(at(1, 1));
  });
});

describe('setMonth', () => {
  it('jumps to a clamped month and resets the turn', () => {
    expect(setMonth(at(3, 4), 5)).toEqual(at(5, 1));
    expect(setMonth(at(3, 4), 99)).toEqual(at(MONTHS, 1));
    expect(setMonth(at(3, 4), 0)).toEqual(at(1, 1));
  });
});

describe('activeReminders', () => {
  it('warns at 2 corruption and flags a loss at 3, plus the final month', () => {
    const session = createNewGameSession({
      ...createDefaultConfig(),
      playerCount: 1,
      heroes: [{ heroId: 'relic-hunter', homeKingdom: 'east' }],
    });
    session.progress.month = MONTHS;
    session.playerBoards[0].corruption = 2;

    const ids = activeReminders(session).map((r) => r.id);
    expect(ids).toContain('corruption-relic-hunter');
    expect(ids).toContain('final-month');

    session.playerBoards[0].corruption = 3;
    const danger = activeReminders(session).find((r) => r.id === 'corruption-relic-hunter');
    expect(danger?.text).toMatch(/loss/);
  });

  it('omits reminders the player has dismissed', () => {
    const session = createNewGameSession(createDefaultConfig());
    session.progress.month = MONTHS;
    session.progress.dismissedReminders = ['final-month'];
    expect(activeReminders(session).map((r) => r.id)).not.toContain('final-month');
  });
});
