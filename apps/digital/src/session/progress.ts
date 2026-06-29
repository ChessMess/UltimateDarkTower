/**
 * Month/turn cadence + non-enforced loss reminders (PRD-04 FR-04.9).
 *
 * UTDD is not a rules engine — it tracks where you are in the 6-month base game and
 * *reminds* you of the loss conditions, but never enforces them. All functions here are
 * pure transforms over `GameProgress` / `GameSession`.
 */
import { CORRUPTION_LOSS, CORRUPTION_MAX } from './playerBoard';
import type { GameProgress, GameSession } from './types';

/** The base game runs six months. */
export const MONTHS = 6;

/**
 * Turns in a month by player count (verified: rules.md) — 1p→6, 2p→7, 3p→8, 4p→9.
 * (Gritty difficulty shortens this in the real game; MVP uses the standard count and
 * leaves the player free to advance/retreat the turn manually.)
 */
export function turnsInMonth(playerCount: number): number {
  const players = Math.min(4, Math.max(1, playerCount));
  return players + 5;
}

/** True once the timeline is at the very last turn of month 6 (nothing further to advance). */
export function isFinalTurn(progress: GameProgress, playerCount: number): boolean {
  return progress.month >= MONTHS && progress.turn >= turnsInMonth(playerCount);
}

/**
 * Advance one turn, rolling into the next month after the month's last turn. Stops at the
 * final turn of month 6 (returns the same progress) — the game is over there.
 */
export function nextTurn(progress: GameProgress, playerCount: number): GameProgress {
  const last = turnsInMonth(playerCount);
  if (progress.turn < last) return { ...progress, turn: progress.turn + 1 };
  if (progress.month < MONTHS) return { ...progress, month: progress.month + 1, turn: 1 };
  return progress; // already at month 6, last turn
}

/** Step back one turn, rolling into the previous month's last turn. Stops at month 1, turn 1. */
export function previousTurn(progress: GameProgress, playerCount: number): GameProgress {
  if (progress.turn > 1) return { ...progress, turn: progress.turn - 1 };
  if (progress.month > 1) {
    return { ...progress, month: progress.month - 1, turn: turnsInMonth(playerCount) };
  }
  return progress; // already at the very first turn
}

/** Jump to a specific month (1..6), resetting to its first turn. */
export function setMonth(progress: GameProgress, month: number): GameProgress {
  const clamped = Math.min(MONTHS, Math.max(1, Math.round(month)));
  return { ...progress, month: clamped, turn: 1 };
}

/** A non-enforced loss reminder surfaced to the player. */
export interface Reminder {
  id: string;
  text: string;
  /** 'danger' = a loss is imminent/possible now; 'info' = a standing condition to watch. */
  tone: 'danger' | 'info';
}

/**
 * The active loss reminders for a session, minus any the player has dismissed
 * (`progress.dismissedReminders`). Data-driven: corruption per hero and the final month.
 * The skull-supply loss ("must drop a skull with none left") isn't tracked as a number in
 * MVP, so it's shown as a standing note rather than a triggered alert.
 */
export function activeReminders(session: GameSession): Reminder[] {
  const dismissed = new Set(session.progress.dismissedReminders ?? []);
  const reminders: Reminder[] = [];

  for (const pb of session.playerBoards) {
    if (pb.corruption >= CORRUPTION_LOSS) {
      reminders.push({
        id: `corruption-${pb.heroId}`,
        tone: 'danger',
        text: `${pb.heroId} has ${CORRUPTION_LOSS} corruption — that is a loss.`,
      });
    } else if (pb.corruption >= CORRUPTION_MAX) {
      reminders.push({
        id: `corruption-${pb.heroId}`,
        tone: 'danger',
        text: `${pb.heroId} is at ${CORRUPTION_MAX} corruption — a 3rd ends the game.`,
      });
    }
  }

  if (session.progress.month >= MONTHS) {
    reminders.push({
      id: 'final-month',
      tone: 'info',
      text: 'Final month — lose if the main goal and adversary are not done by month-end.',
    });
  }

  return reminders.filter((r) => !dismissed.has(r.id));
}
