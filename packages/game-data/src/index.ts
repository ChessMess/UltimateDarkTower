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
 *
 * The card datasets below (`FOE_CARDS`, `MONUMENT_CARDS`, `COMPANION_CARDS`, `TREASURES`,
 * ...) are the printed card faces for entities the rosters above identify. They flatten
 * safely because they are named `*_CARDS` precisely to avoid the collision `gameContent`
 * has — `COMPANION_CARDS` is NOT `gameContent.COMPANIONS`. Provenance for all of them is
 * in `docs/spreadsheet-import.md`.
 */
export * from './heroes';
export * from './monuments';
export * from './foes';
export * from './boxInventory';
export * from './board';
export * from './seed';
export * from './constants';
export * as gameContent from './gameContent';

// Card faces and reference data imported from the RtDT research spreadsheets — see
// `docs/spreadsheet-import.md` for provenance and `docs/open-questions.md` for the gaps.
export * from './advantages';
export * from './dungeons';
export * from './caravans';
export * from './foeCards';
export * from './monumentCards';
export * from './companionCards';
export * from './treasures';
export * from './potionsAndGear';
export * from './corruptions';
export * from './questItems';
export * from './quests';
export * from './spells';
export * from './nations';
