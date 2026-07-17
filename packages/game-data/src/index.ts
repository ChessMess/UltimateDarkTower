/**
 * ultimatedarktowerdata — Return to Dark Tower reference data. Zero runtime dependencies,
 * no Bluetooth. Split out of `ultimatedarktower` in v6 (see CHANGELOG): the driver never
 * read this data, but every consumer of it had to load a Node-only BLE stack to get it.
 *
 * Exported flat — every known consumer destructures straight back to flat names anyway.
 *
 * `gameContent` stays a sub-namespace (`gameContent.HEROES`, `gameContent.FOES`, ...): it
 * models the SAME domains as `heroes`/`foes` above (gameplay virtues/banner-actions vs.
 * board identity/status) but with genuinely different shapes and a real name collision
 * (`Hero`, `HEROES`, `Foe`, `FOES`, `Adversary`) — flattening it would silently shadow the
 * board data. See `./gameContent` for the gameplay-content dataset.
 */
export * from './heroes';
export * from './monuments';
export * from './foes';
export * from './boxInventory';
export * from './board';
export * from './seed';
export * from './constants';
export * as gameContent from './gameContent';
