/** Current UltimateDarkTowerRelay protocol version. Bump alongside package version on breaking changes. */
// 0.2.0: renamed the `host:status` field `fakeTowerState` → `towerEmulatorState`
// (FakeTower → TowerEmulator rename). Breaking wire change.
export const PROTOCOL_VERSION = '0.2.0';
