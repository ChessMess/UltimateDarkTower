import { describe, it, expect } from 'vitest';
import { BoardStateController } from 'ultimatedarktowerboard';
import { ManualTowerSource } from '@/sources/ManualTowerSource';
import { ManualBoardSource } from '@/sources/ManualBoardSource';
import {
  GAME_SESSION_SCHEMA_VERSION,
  GameSessionLoadError,
  STARTING_SPIRIT,
  STARTING_WARRIORS,
  applyGameSession,
  captureSession,
  createDefaultConfig,
  createNewGameSession,
  deserializeSession,
  serializeSession,
  type GameConfig,
} from '@/session';

function sampleConfig(): GameConfig {
  return {
    ...createDefaultConfig(),
    playerCount: 2,
    heroes: [
      { heroId: 'brutal-warlord', homeKingdom: 'north' },
      { heroId: 'spymaster', homeKingdom: 'east' },
    ],
    adversary: 'ashstrider',
    foes: { level2: 'shadow-wolves', level3: 'lemures', level4: 'dragons' },
    mainGoal: "Recover Azkol's Treasures",
  };
}

describe('createNewGameSession', () => {
  it('builds a player board per configured hero with base-game starting resources', () => {
    const session = createNewGameSession(sampleConfig(), 'My Game');
    expect(session.schemaVersion).toBe(GAME_SESSION_SCHEMA_VERSION);
    expect(session.playerBoards).toHaveLength(2);
    expect(session.playerBoards[0]).toMatchObject({
      heroId: 'brutal-warlord',
      homeKingdom: 'north',
      warriors: STARTING_WARRIORS,
      spirit: STARTING_SPIRIT,
      corruption: 0,
    });
    expect(session.tower.state.drum.every((d) => d.calibrated)).toBe(true);
  });
});

describe('serialize / deserialize', () => {
  it('round-trips a session losslessly', () => {
    const session = createNewGameSession(sampleConfig(), 'My Game');
    const restored = deserializeSession(serializeSession(session));
    expect(restored).toEqual(session);
  });

  it('rejects non-JSON', () => {
    expect(() => deserializeSession('{not json')).toThrow(GameSessionLoadError);
  });

  it('rejects an incompatible schema version', () => {
    const session = createNewGameSession(sampleConfig());
    const bumped = JSON.parse(serializeSession(session));
    bumped.schemaVersion = 999;
    expect(() => deserializeSession(JSON.stringify(bumped))).toThrow(/Incompatible save version/);
  });

  it('rejects a session missing a required section', () => {
    const session = createNewGameSession(sampleConfig());
    const broken = JSON.parse(serializeSession(session));
    delete broken.tower;
    expect(() => deserializeSession(JSON.stringify(broken))).toThrow(GameSessionLoadError);
  });
});

describe('capture / apply round-trip through live sources', () => {
  it('reproduces the exact tower + board on a fresh set of sources', () => {
    // 1. Live sources + a base session.
    const tower = new ManualTowerSource();
    const board = new ManualBoardSource(new BoardStateController());
    const base = createNewGameSession(sampleConfig(), 'My Game');

    // 2. Play some moves through the sources.
    tower.dropSkull();
    tower.dropSkull();
    tower.breakSeal({ level: 'top', side: 'north' });
    tower.rotateDrum(1, 2);
    board.placeFoe('sw-1', 'shadow-wolves', 'Broken Lands', 'ready');
    board.addSkull('Dayside', 2);

    // 3. Capture → serialize → deserialize (the save/share path).
    const captured = captureSession(base, tower, board);
    const restored = deserializeSession(serializeSession(captured));

    // 4. Hydrate a fresh set of sources (as if loaded on another machine).
    const tower2 = new ManualTowerSource();
    const board2 = new ManualBoardSource(new BoardStateController());
    applyGameSession(restored, tower2, board2);

    // 5. The fresh sources match what we captured.
    expect(tower2.getSkullDropCount()).toBe(2);
    expect(tower2.getBrokenSeals()).toEqual([{ level: 'top', side: 'north' }]);
    expect(tower2.getState().drum[1].position).toBe(2);
    expect(board2.getState().foes['sw-1']).toMatchObject({
      foe: 'shadow-wolves',
      location: 'Broken Lands',
      status: 'ready',
    });
    expect(board2.getState().buildings['Dayside']?.skulls).toBe(2);

    // 6. Re-capturing from the hydrated sources yields identical tower + board slices.
    const recaptured = captureSession(restored, tower2, board2);
    expect(recaptured.tower).toEqual(captured.tower);
    expect(recaptured.board).toEqual(captured.board);
  });
});
